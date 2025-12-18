/**
 * Default configuration values for the application.
 *
 * These are UI constants and timing values that were previously
 * scattered throughout the codebase or defined in environment variables.
 */

/**
 * Polling interval for refreshing blockchain data (milliseconds).
 * Used for tip block updates and home page refresh.
 */
export const POLL_INTERVAL_MS = 8000;

/**
 * Number of items to display in home page lists.
 */
export const HOME_ITEMS_TO_SHOW = 10;

/**
 * Hash truncation settings for display.
 * Format: "0x{prefix}...{suffix}"
 */
export const HASH_TRUNCATE = {
	/** Standard truncation for transaction and block hashes. */
	standard: { prefix: 8, suffix: 8 },
	/** Shorter truncation for code hashes in type/lock scripts. */
	short: { prefix: 6, suffix: 6 },
	/** Minimal truncation for inline display. */
	minimal: { prefix: 4, suffix: 4 },
} as const;

/**
 * RPC request cache configuration.
 * See src/CACHE_POLICY.md for detailed cache policy documentation.
 */
export const CACHE_CONFIG = {
	/** Enable or disable the RPC cache. */
	enabled: true,
	/** Maximum number of entries in the LRU cache. */
	maxEntries: 1000,
	/** Blocks within this distance from tip are considered shallow and may reorg. */
	depthThreshold: 12,
	/** Time-to-live for short-lived cache entries (milliseconds). */
	shortTtlMs: 2000,
} as const;
