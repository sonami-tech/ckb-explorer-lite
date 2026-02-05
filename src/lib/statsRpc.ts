/**
 * CKB Stats Server JSON-RPC client.
 *
 * Design:
 * - No caching (stats queries are fast, pre-computed).
 * - In-flight deduplication only (prevent duplicate concurrent requests).
 * - Fail fast on errors (no silent fallbacks).
 * - Batch requests with set_block_height for archive queries.
 */

import type {
	StatsAddressResponse,
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
	 * Send a batch JSON-RPC request with set_block_height for archive queries.
	 */
	async function sendArchiveRequestRaw<T>(
		blockNumber: number,
		method: string,
		params: unknown[],
	): Promise<T> {
		const requests = [
			buildRequest('set_block_height', [toHex(blockNumber)]),
			buildRequest(method, params),
		];

		const response = await fetch(statsUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requests),
		});

		if (!response.ok) {
			throw new Error(`Stats server HTTP error: ${response.status} ${response.statusText}`);
		}

		const json = (await response.json()) as JsonRpcResponse<T>[];

		// Check for error in set_block_height response.
		if (json[0]?.error) {
			throw new RpcError(json[0].error.code, json[0].error.message, json[0].error.data);
		}

		// Check for error in the actual method response.
		if (json[1]?.error) {
			throw new RpcError(json[1].error.code, json[1].error.message, json[1].error.data);
		}

		return json[1].result as T;
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
	 * Send a request, using archive batch if blockNumber provided.
	 */
	function sendRequest<T>(method: string, params: unknown[], blockNumber?: number): Promise<T> {
		if (blockNumber !== undefined) {
			return deduplicatedRequest(method, params, blockNumber, () =>
				sendArchiveRequestRaw<T>(blockNumber, method, params),
			);
		}
		return deduplicatedRequest(method, params, undefined, () =>
			sendRequestRaw<T>(method, params),
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
