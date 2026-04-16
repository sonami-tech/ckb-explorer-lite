/**
 * CKB Stats Server JSON-RPC client.
 *
 * Design:
 * - No caching (stats queries are fast, pre-computed).
 * - In-flight deduplication only (prevent duplicate concurrent requests).
 * - Fail fast on errors (no silent fallbacks).
 * - Archive queries pass block_number as the last parameter (stats server does not support batch requests).
 */

import type {
	StatsAddressResponse,
	StatsAddressTxHistoryResponse,
	StatsAllAddressResponse,
	StatsGlobalResponse,
	StatsAllGlobalResponse,
	StatsSupplyResponse,
	StatsSyncStatusResponse,
} from '../types/stats';
import { RpcError, toHex } from './rpc';

interface JsonRpcRequest {
	jsonrpc: '2.0';
	id: number;
	method: string;
	params: unknown[];
}

interface JsonRpcResponse<T> {
	jsonrpc: '2.0';
	id: number;
	result?: T;
	error?: {
		code: number;
		message: string;
		data?: string;
	};
}

/**
 * Create a stats server RPC client bound to a specific URL.
 */
export function createStatsClient(statsUrl: string) {
	let requestId = 0;
	const inFlight = new Map<string, Promise<unknown>>();

	/**
	 * Build a cache key for in-flight deduplication.
	 */
	function buildKey(method: string, params: unknown[], blockNumber?: number): string {
		const heightPart = blockNumber !== undefined ? `:${blockNumber}` : '';
		return `${method}:${JSON.stringify(params)}${heightPart}`;
	}

	/**
	 * Build a JSON-RPC request payload.
	 */
	function buildRequest(method: string, params: unknown[]): JsonRpcRequest {
		return {
			jsonrpc: '2.0',
			id: requestId++,
			method,
			params,
		};
	}

	/**
	 * Send a single JSON-RPC request.
	 */
	async function sendRequestRaw<T>(method: string, params: unknown[]): Promise<T> {
		const request = buildRequest(method, params);

		const response = await fetch(statsUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			throw new Error(`Stats server HTTP error: ${response.status} ${response.statusText}`);
		}

		const json = (await response.json()) as JsonRpcResponse<T>;

		if (json.error) {
			throw new RpcError(json.error.code, json.error.message, json.error.data);
		}

		return json.result as T;
	}

	/**
	 * Request wrapper with in-flight deduplication (no caching).
	 */
	async function deduplicatedRequest<T>(
		method: string,
		params: unknown[],
		blockNumber: number | undefined,
		fetcher: () => Promise<T>,
	): Promise<T> {
		const key = buildKey(method, params, blockNumber);

		// Check in-flight requests.
		const existing = inFlight.get(key);
		if (existing) {
			return existing as Promise<T>;
		}

		// Make the request.
		const promise = fetcher();
		inFlight.set(key, promise);

		try {
			return await promise;
		} finally {
			inFlight.delete(key);
		}
	}

	/**
	 * Send a request, appending blockNumber as the last param for archive queries.
	 * The stats server accepts block_number as a trailing parameter rather than
	 * via set_block_height batching (which it does not support).
	 */
	function sendRequest<T>(method: string, params: unknown[], blockNumber?: number): Promise<T> {
		const archiveParams = blockNumber !== undefined
			? [...params, toHex(blockNumber)]
			: params;
		return deduplicatedRequest(method, archiveParams, blockNumber, () =>
			sendRequestRaw<T>(method, archiveParams),
		);
	}

	return {
		/**
		 * Get the stats server URL this client is bound to.
		 */
		getUrl(): string {
			return statsUrl;
		},

		/**
		 * Get core address statistics.
		 * @param lockHash - The lock script hash (32-byte hex with 0x prefix).
		 * @param blockNumber - Optional block height for archive query.
		 */
		async getAddressStats(
			lockHash: string,
			blockNumber?: number,
		): Promise<StatsAddressResponse | null> {
			return sendRequest<StatsAddressResponse | null>(
				'get_address_stats',
				[lockHash],
				blockNumber,
			);
		},

		/**
		 * Get all address statistics (core + dao + typed).
		 * @param lockHash - The lock script hash (32-byte hex with 0x prefix).
		 * @param blockNumber - Optional block height for archive query.
		 */
		async getAllAddressStats(
			lockHash: string,
			blockNumber?: number,
		): Promise<StatsAllAddressResponse | null> {
			return sendRequest<StatsAllAddressResponse | null>(
				'get_all_address_stats',
				[lockHash],
				blockNumber,
			);
		},

		/**
		 * Get core global statistics.
		 * @param blockNumber - Optional block height for archive query.
		 */
		async getGlobalStats(blockNumber?: number): Promise<StatsGlobalResponse | null> {
			return sendRequest<StatsGlobalResponse | null>(
				'get_global_stats',
				[],
				blockNumber,
			);
		},

		/**
		 * Get all global statistics (core + dao + typed).
		 * @param blockNumber - Optional block height for archive query.
		 */
		async getAllGlobalStats(blockNumber?: number): Promise<StatsAllGlobalResponse> {
			return sendRequest<StatsAllGlobalResponse>(
				'get_all_global_stats',
				[],
				blockNumber,
			);
		},

		/**
		 * Get circulating supply breakdown.
		 * @param blockNumber - Optional block height for archive query.
		 */
		async getCirculatingSupply(blockNumber?: number): Promise<StatsSupplyResponse | null> {
			return sendRequest<StatsSupplyResponse | null>(
				'get_circulating_supply',
				[],
				blockNumber,
			);
		},

		/**
		 * Get paginated transaction history for an address.
		 * @param lockHash - The lock script hash (32-byte hex with 0x prefix).
		 * @param offset - Zero-based offset into the result set.
		 * @param limit - Number of transactions to return.
		 * @param sort - Sort order: 'newest' or 'oldest'.
		 * @param blockNumber - Optional block height for archive query.
		 */
		async getAddressTransactions(
			lockHash: string,
			offset: number,
			limit: number,
			sort: 'newest' | 'oldest',
			blockNumber?: number,
		): Promise<StatsAddressTxHistoryResponse> {
			return sendRequest<StatsAddressTxHistoryResponse>(
				'get_address_transactions',
				[lockHash, null, toHex(offset), toHex(limit), sort],
				blockNumber,
			);
		},

		/**
		 * Get sync status.
		 */
		async syncStatus(): Promise<StatsSyncStatusResponse> {
			return sendRequest<StatsSyncStatusResponse>('sync_status', []);
		},
	};
}

/**
 * Type alias for the stats client.
 */
export type StatsClient = ReturnType<typeof createStatsClient>;
