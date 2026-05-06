import type {
	Hex,
	RpcBlock,
	RpcBlockHeader,
	RpcBlockchainInfo,
	RpcCellsCount,
	RpcCellWithLifecycle,
	RpcEpoch,
	RpcGetCellsResponse,
	RpcGetGroupedTransactionsResponse,
	RpcLiveCell,
	RpcTransactionsCount,
	RpcTransactionWithStatus,
	IndexerSearchKey,
	JsonRpcRequest,
	JsonRpcResponse,
} from '../types/rpc';
import { CACHE_CONFIG } from '../config';

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
 * Cache policy types.
 * - 'lru': Cached until evicted by LRU (for immutable/deep data).
 * - 'short-ttl': Cached briefly (for shallow/mutable data).
 * - 'no-cache': Not cached (for null results, errors).
 */
type CachePolicy = 'lru' | 'short-ttl' | 'no-cache';

/**
 * A cached RPC response.
 */
interface CacheEntry {
	value: unknown;
	cachedAt: number;
	policy: CachePolicy;
}

/**
 * Cache statistics for monitoring.
 */
export interface RpcCacheStats {
	hits: number;
	misses: number;
	evictions: number;
	size: number;
	inFlight: number;
}

/**
 * Methods that always use short TTL (current state queries).
 */
const SHORT_TTL_METHODS = new Set([
	'get_tip_header',
	'get_current_epoch',
	'get_blockchain_info',
]);

/**
 * Methods that are always immutable (hash-based lookups).
 */
const IMMUTABLE_METHODS = new Set([
	'get_block',           // getBlockByHash
	'get_transaction',
	'get_cell_lifecycle',  // Cell lifecycle never changes after consumption.
]);

/**
 * RPC request cache with in-flight deduplication and LRU eviction.
 * See src/CACHE_POLICY.md for detailed policy documentation.
 */
class RpcCache {
	private cache = new Map<string, CacheEntry>();
	private accessOrder: string[] = [];
	private inFlight = new Map<string, Promise<unknown>>();
	private stats = { hits: 0, misses: 0, evictions: 0 };
	// Per-network tip tracking. Each network has its own height; sharing one
	// field would let policy heuristics flap right after a network switch.
	private lastKnownTipByNetwork = new Map<string, bigint>();

	/**
	 * Build a cache key from network, method, params, and archive height.
	 * The network prefix prevents cache entries from one network being
	 * returned for an identical request on another network.
	 */
	buildKey(networkId: string, method: string, params: unknown[], archiveHeight?: number): string {
		const heightPart = archiveHeight !== undefined ? `:${archiveHeight}` : '';
		return `${networkId}:${method}:${JSON.stringify(params)}${heightPart}`;
	}

	/**
	 * Determine the cache policy for a request. Depth heuristics use the tip
	 * tracked for the requesting network, so a switch between networks at
	 * different heights doesn't temporarily mis-classify policy.
	 */
	getCachePolicy(
		networkId: string,
		method: string,
		params: unknown[],
		archiveHeight?: number,
	): CachePolicy {
		// Always short TTL methods.
		if (SHORT_TTL_METHODS.has(method)) {
			return 'short-ttl';
		}

		// Immutable methods (hash-based lookups).
		if (IMMUTABLE_METHODS.has(method)) {
			return 'lru';
		}

		const tip = this.lastKnownTipByNetwork.get(networkId);

		// For depth-dependent methods, check if we have tip info.
		if (tip === undefined) {
			// Tip unknown, use short TTL to be safe.
			return 'short-ttl';
		}

		const threshold = BigInt(CACHE_CONFIG.depthThreshold);

		// Check archive height depth.
		if (archiveHeight !== undefined) {
			const depth = tip - BigInt(archiveHeight);
			return depth > threshold ? 'lru' : 'short-ttl';
		}

		// For getBlockByNumber without archive, check the block number parameter.
		if (method === 'get_block_by_number' && params[0]) {
			const blockNum = BigInt(params[0] as string);
			const depth = tip - blockNum;
			return depth > threshold ? 'lru' : 'short-ttl';
		}

		// Default to short TTL for other methods without archive height.
		return 'short-ttl';
	}

	/**
	 * Check if a cache entry is expired.
	 */
	private isExpired(entry: CacheEntry): boolean {
		if (entry.policy === 'lru') {
			return false; // LRU entries never expire by time.
		}
		return Date.now() - entry.cachedAt > CACHE_CONFIG.shortTtlMs;
	}

	/**
	 * Update LRU access order for a key.
	 */
	private touchLru(key: string): void {
		const index = this.accessOrder.indexOf(key);
		if (index !== -1) {
			this.accessOrder.splice(index, 1);
		}
		this.accessOrder.push(key);
	}

	/**
	 * Evict least recently used entry.
	 */
	private evictLru(): void {
		if (this.accessOrder.length === 0) return;
		const oldest = this.accessOrder.shift()!;
		this.cache.delete(oldest);
		this.stats.evictions++;
	}

	/**
	 * Get a cached value if valid.
	 */
	get<T>(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) {
			this.stats.misses++;
			return undefined;
		}
		if (this.isExpired(entry)) {
			this.cache.delete(key);
			const index = this.accessOrder.indexOf(key);
			if (index !== -1) this.accessOrder.splice(index, 1);
			this.stats.misses++;
			return undefined;
		}
		this.stats.hits++;
		this.touchLru(key);
		return entry.value as T;
	}

	/**
	 * Store a value in the cache.
	 */
	set(key: string, value: unknown, policy: CachePolicy): void {
		if (policy === 'no-cache') return;

		// Evict if at capacity.
		while (this.cache.size >= CACHE_CONFIG.maxEntries) {
			this.evictLru();
		}

		this.cache.set(key, {
			value,
			cachedAt: Date.now(),
			policy,
		});
		this.touchLru(key);
	}

	/**
	 * Update the last known tip for the given network's depth calculations.
	 */
	updateTip(networkId: string, tip: bigint): void {
		this.lastKnownTipByNetwork.set(networkId, tip);
	}

	/**
	 * Get an in-flight promise if one exists.
	 */
	getInFlight<T>(key: string): Promise<T> | undefined {
		return this.inFlight.get(key) as Promise<T> | undefined;
	}

	/**
	 * Register an in-flight request.
	 */
	setInFlight(key: string, promise: Promise<unknown>): void {
		this.inFlight.set(key, promise);
	}

	/**
	 * Clear an in-flight request.
	 */
	clearInFlight(key: string): void {
		this.inFlight.delete(key);
	}

	/**
	 * Get cache statistics.
	 */
	getStats(): RpcCacheStats {
		return {
			...this.stats,
			size: this.cache.size,
			inFlight: this.inFlight.size,
		};
	}
}

// Global cache instance (shared across RPC clients for same-origin deduplication).
let globalCache: RpcCache | null = null;

/**
 * Get or create the global RPC cache.
 */
function getCache(): RpcCache {
	if (!globalCache) {
		globalCache = new RpcCache();
		// Expose stats to developer console.
		if (typeof window !== 'undefined') {
			(window as unknown as Record<string, unknown>).rpcCacheStats = () => globalCache!.getStats();
		}
	}
	return globalCache;
}

/**
 * Options for createRpcClient. `cacheEnabled` is sourced from runtime config
 * (config.public.json5) per-instance; the other cache parameters live in
 * CACHE_CONFIG since they aren't operator-tunable.
 */
export interface RpcClientOptions {
	cacheEnabled: boolean;
	/**
	 * Stable network identity used to scope cache keys. The shared global
	 * cache prefixes every key with this id so requests for the same
	 * method/params on different networks never collide.
	 */
	networkId: string;
}

/**
 * Create an RPC client bound to a specific same-origin proxy path.
 *
 * `proxyPath` is the browser-visible slug-derived path (e.g. /rpc/mainnet);
 * the upstream URL never reaches the browser. The factory closes over
 * opts.cacheEnabled and opts.networkId, so cache keys are scoped per-network
 * with no module mutable state.
 */
export function createRpcClient(proxyPath: string, opts: RpcClientOptions) {
	const rpcUrl = proxyPath;
	const { cacheEnabled, networkId } = opts;
	let requestId = 0;
	const cache = getCache();

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
	 * Send a single JSON-RPC request (uncached).
	 */
	async function sendRequestRaw<T>(method: string, params: unknown[]): Promise<T> {
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
	 * Send a batch JSON-RPC request for archive mode (uncached).
	 * The set_block_height call must be the first in the batch.
	 */
	async function sendArchiveRequestRaw<T>(
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

	/**
	 * Cached request wrapper with in-flight deduplication.
	 */
	async function cachedRequest<T>(
		method: string,
		params: unknown[],
		archiveHeight: number | undefined,
		fetcher: () => Promise<T>,
	): Promise<T> {
		// Skip cache if disabled (per-client value from runtime config).
		if (!cacheEnabled) {
			return fetcher();
		}

		const key = cache.buildKey(networkId, method, params, archiveHeight);

		// Check result cache first.
		const cached = cache.get<T>(key);
		if (cached !== undefined) {
			return cached;
		}

		// Check in-flight requests.
		const inFlight = cache.getInFlight<T>(key);
		if (inFlight) {
			return inFlight;
		}

		// Make the request.
		const promise = fetcher();
		cache.setInFlight(key, promise);

		try {
			const result = await promise;

			// Don't cache null results.
			if (result !== null) {
				const policy = cache.getCachePolicy(networkId, method, params, archiveHeight);
				cache.set(key, result, policy);
			}

			return result;
		} finally {
			cache.clearInFlight(key);
		}
	}

	/**
	 * Cached single request.
	 */
	function sendRequest<T>(method: string, params: unknown[]): Promise<T> {
		return cachedRequest(method, params, undefined, () => sendRequestRaw<T>(method, params));
	}

	/**
	 * Cached archive request.
	 */
	function sendArchiveRequest<T>(height: number, method: string, params: unknown[]): Promise<T> {
		return cachedRequest(method, params, height, () => sendArchiveRequestRaw<T>(height, method, params));
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
		 * Get the tip header.
		 * Also updates the cache's lastKnownTip for depth calculations.
		 */
		async getTipHeader(): Promise<RpcBlockHeader> {
			const header = await sendRequest<RpcBlockHeader>('get_tip_header', []);
			cache.updateTip(networkId, BigInt(header.number));
			return header;
		},

		/**
		 * Get the current epoch information.
		 */
		async getCurrentEpoch(): Promise<RpcEpoch> {
			return sendRequest<RpcEpoch>('get_current_epoch', []);
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
		 * Get a block header by number.
		 * @param blockNumber - Block number.
		 * @param height - Optional archive height for historical query.
		 */
		async getHeaderByNumber(
			blockNumber: number | bigint,
			height?: number,
		): Promise<RpcBlockHeader | null> {
			// Headers are immutable chain data; do not scope via `set_block_height`.
			// Some nodes reject `get_header_by_number` under `set_block_height`.
			void height;
			return sendRequest<RpcBlockHeader | null>('get_header_by_number', [toHex(blockNumber)]);
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
		 * Get cell lifecycle information (archive module).
		 * Returns when the cell was created and consumed.
		 * @param txHash - Transaction hash of the cell.
		 * @param index - Output index of the cell.
		 * @param withData - Whether to include cell data (default: true).
		 */
		async getCellLifecycle(
			txHash: Hex,
			index: number,
			withData: boolean = true,
		): Promise<RpcCellWithLifecycle | null> {
			const outPoint = { tx_hash: txHash, index: toHex(index) };
			return sendRequest<RpcCellWithLifecycle | null>('get_cell_lifecycle', [outPoint, withData]);
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
		 * Get transactions grouped by tx_hash (indexer).
		 * Each result includes a cells array with [io_type, io_index] tuples
		 * showing which inputs/outputs involve the searched address.
		 * @param searchKey - Indexer search key (group_by_transaction is set automatically).
		 * @param order - Sort order ('asc' or 'desc').
		 * @param limit - Maximum number of results.
		 * @param cursor - Pagination cursor.
		 * @param height - Optional archive height for historical query.
		 */
		async getGroupedTransactions(
			searchKey: Omit<IndexerSearchKey, 'group_by_transaction'>,
			order: 'asc' | 'desc' = 'asc',
			limit: number = 20,
			cursor?: string,
			height?: number,
		): Promise<RpcGetGroupedTransactionsResponse> {
			const groupedSearchKey: IndexerSearchKey = {
				...searchKey,
				group_by_transaction: true,
			};
			const params = [groupedSearchKey, order, toHex(limit), cursor ?? null];
			if (height !== undefined) {
				return sendArchiveRequest<RpcGetGroupedTransactionsResponse>(height, 'get_transactions', params);
			}
			return sendRequest<RpcGetGroupedTransactionsResponse>('get_transactions', params);
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

		/**
		 * Get count of live cells matching search key.
		 * Archive-fork extension — only call on archive-enabled networks.
		 * @param searchKey - Indexer search key.
		 * @param height - Optional archive height for historical query.
		 */
		async getCellsCount(
			searchKey: IndexerSearchKey,
			height?: number,
		): Promise<RpcCellsCount> {
			if (height !== undefined) {
				return sendArchiveRequest<RpcCellsCount>(height, 'get_cells_count', [searchKey]);
			}
			return sendRequest<RpcCellsCount>('get_cells_count', [searchKey]);
		},

		/**
		 * Get count of distinct transactions matching search key.
		 * Archive-fork extension — only call on archive-enabled networks.
		 * @param searchKey - Indexer search key.
		 * @param height - Optional archive height for historical query.
		 */
		async getTransactionsCount(
			searchKey: IndexerSearchKey,
			height?: number,
		): Promise<RpcTransactionsCount> {
			if (height !== undefined) {
				return sendArchiveRequest<RpcTransactionsCount>(height, 'get_transactions_count', [searchKey]);
			}
			return sendRequest<RpcTransactionsCount>('get_transactions_count', [searchKey]);
		},
	};
}

/** Type for the RPC client returned by createRpcClient. */
export type RpcClient = ReturnType<typeof createRpcClient>;
