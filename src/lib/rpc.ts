import type {
	Hex,
	RpcBlock,
	RpcBlockHeader,
	RpcBlockchainInfo,
	RpcGetCellsResponse,
	RpcGetTransactionsResponse,
	RpcLiveCell,
	RpcTransactionWithStatus,
	IndexerSearchKey,
	JsonRpcRequest,
	JsonRpcResponse,
} from '../types/rpc';

/**
 * RPC error class with additional context.
 */
export class RpcError extends Error {
	code: number;
	data?: string;

	constructor(code: number, message: string, data?: string) {
		super(message);
		this.name = 'RpcError';
		this.code = code;
		this.data = data;
	}
}

/**
 * Convert a number to hex string format for RPC.
 */
export function toHex(num: number | bigint): Hex {
	return '0x' + num.toString(16);
}

/**
 * Parse a hex string to bigint.
 */
export function fromHex(hex: Hex): bigint {
	return BigInt(hex);
}

/**
 * Create an RPC client bound to a specific URL.
 */
export function createRpcClient(rpcUrl: string) {
	let requestId = 0;

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
	async function sendRequest<T>(method: string, params: unknown[]): Promise<T> {
		const request = buildRequest(method, params);

		const response = await fetch(rpcUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
		}

		const json = (await response.json()) as JsonRpcResponse<T>;

		if (json.error) {
			throw new RpcError(json.error.code, json.error.message, json.error.data);
		}

		return json.result as T;
	}

	/**
	 * Send a batch JSON-RPC request for archive mode.
	 * The set_block_height call must be the first in the batch.
	 */
	async function sendArchiveRequest<T>(
		height: number,
		method: string,
		params: unknown[],
	): Promise<T> {
		const requests = [
			buildRequest('set_block_height', [toHex(height)]),
			buildRequest(method, params),
		];

		const response = await fetch(rpcUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requests),
		});

		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
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

	return {
		/**
		 * Get the RPC URL this client is bound to.
		 */
		getUrl(): string {
			return rpcUrl;
		},

		/**
		 * Get blockchain info including chain name.
		 */
		async getBlockchainInfo(): Promise<RpcBlockchainInfo> {
			return sendRequest<RpcBlockchainInfo>('get_blockchain_info', []);
		},

		/**
		 * Get the current tip block number.
		 */
		async getTipBlockNumber(): Promise<bigint> {
			const result = await sendRequest<Hex>('get_tip_block_number', []);
			return fromHex(result);
		},

		/**
		 * Get the tip header.
		 */
		async getTipHeader(): Promise<RpcBlockHeader> {
			return sendRequest<RpcBlockHeader>('get_tip_header', []);
		},

		/**
		 * Get a block by number.
		 * @param blockNumber - Block number.
		 * @param height - Optional archive height for historical query.
		 * @param withTxHashes - If true, includes transaction hashes in response (verbosity 0x2).
		 */
		async getBlockByNumber(
			blockNumber: number | bigint,
			height?: number,
			withTxHashes: boolean = false,
		): Promise<RpcBlock | null> {
			const verbosity = withTxHashes ? '0x2' : null;
			if (height !== undefined) {
				return sendArchiveRequest<RpcBlock | null>(height, 'get_block_by_number', [toHex(blockNumber), verbosity]);
			}
			return sendRequest<RpcBlock | null>('get_block_by_number', [toHex(blockNumber), verbosity]);
		},

		/**
		 * Get a block by hash.
		 * @param blockHash - Block hash.
		 * @param height - Optional archive height for historical query.
		 */
		async getBlockByHash(blockHash: Hex, height?: number): Promise<RpcBlock | null> {
			if (height !== undefined) {
				return sendArchiveRequest<RpcBlock | null>(height, 'get_block', [blockHash]);
			}
			return sendRequest<RpcBlock | null>('get_block', [blockHash]);
		},

		/**
		 * Get a transaction by hash.
		 * @param txHash - Transaction hash.
		 * @param height - Optional archive height for historical query.
		 */
		async getTransaction(
			txHash: Hex,
			height?: number,
		): Promise<RpcTransactionWithStatus | null> {
			if (height !== undefined) {
				return sendArchiveRequest<RpcTransactionWithStatus | null>(
					height,
					'get_transaction',
					[txHash],
				);
			}
			return sendRequest<RpcTransactionWithStatus | null>('get_transaction', [txHash]);
		},

		/**
		 * Get a live cell by out point.
		 * @param txHash - Transaction hash of the cell.
		 * @param index - Output index of the cell.
		 * @param height - Optional archive height for historical query.
		 */
		async getLiveCell(
			txHash: Hex,
			index: number,
			height?: number,
		): Promise<RpcLiveCell> {
			const outPoint = { tx_hash: txHash, index: toHex(index) };
			if (height !== undefined) {
				return sendArchiveRequest<RpcLiveCell>(height, 'get_live_cell', [outPoint, true]);
			}
			return sendRequest<RpcLiveCell>('get_live_cell', [outPoint, true]);
		},

		/**
		 * Get cells by search key (indexer).
		 * @param searchKey - Indexer search key.
		 * @param order - Sort order ('asc' or 'desc').
		 * @param limit - Maximum number of results.
		 * @param cursor - Pagination cursor.
		 * @param height - Optional archive height for historical query.
		 */
		async getCells(
			searchKey: IndexerSearchKey,
			order: 'asc' | 'desc' = 'asc',
			limit: number = 20,
			cursor?: string,
			height?: number,
		): Promise<RpcGetCellsResponse> {
			const params = [searchKey, order, toHex(limit), cursor ?? null];
			if (height !== undefined) {
				return sendArchiveRequest<RpcGetCellsResponse>(height, 'get_cells', params);
			}
			return sendRequest<RpcGetCellsResponse>('get_cells', params);
		},

		/**
		 * Get transactions by search key (indexer).
		 * @param searchKey - Indexer search key.
		 * @param order - Sort order ('asc' or 'desc').
		 * @param limit - Maximum number of results.
		 * @param cursor - Pagination cursor.
		 * @param height - Optional archive height for historical query.
		 */
		async getTransactions(
			searchKey: IndexerSearchKey,
			order: 'asc' | 'desc' = 'asc',
			limit: number = 20,
			cursor?: string,
			height?: number,
		): Promise<RpcGetTransactionsResponse> {
			const params = [searchKey, order, toHex(limit), cursor ?? null];
			if (height !== undefined) {
				return sendArchiveRequest<RpcGetTransactionsResponse>(height, 'get_transactions', params);
			}
			return sendRequest<RpcGetTransactionsResponse>('get_transactions', params);
		},

		/**
		 * Get total capacity of cells matching search key.
		 * @param searchKey - Indexer search key.
		 * @param height - Optional archive height for historical query.
		 */
		async getCellsCapacity(
			searchKey: IndexerSearchKey,
			height?: number,
		): Promise<bigint> {
			if (height !== undefined) {
				const result = await sendArchiveRequest<{ capacity: Hex } | null>(
					height,
					'get_cells_capacity',
					[searchKey],
				);
				// Returns null when no cells match the search key.
				return result ? fromHex(result.capacity) : 0n;
			}
			const result = await sendRequest<{ capacity: Hex } | null>('get_cells_capacity', [searchKey]);
			// Returns null when no cells match the search key.
			return result ? fromHex(result.capacity) : 0n;
		},
	};
}

/** Type for the RPC client returned by createRpcClient. */
export type RpcClient = ReturnType<typeof createRpcClient>;
