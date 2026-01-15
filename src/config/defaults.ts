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

/**
 * Cell data display configuration.
 */
export const CELL_DATA_CONFIG = {
	/** Automatically decode cell data for known type scripts (SUDT, xUDT, DAO). */
	autoDecodeKnownTypes: true,
} as const;

/**
 * HexData display configuration for large data handling.
 */
export const HEX_DATA_CONFIG = {
	/** Bytes threshold to show download button. */
	downloadThreshold: 10 * 1024,  // 10 KB
	/** Bytes threshold to show warning before expanding. */
	warnThreshold: 100 * 1024,     // 100 KB
	/** Bytes threshold to suggest modal view. */
	modalThreshold: 50 * 1024,     // 50 KB
	/** Max height in pixels for expanded in-place view. */
	maxExpandedHeight: 384,        // ~24rem
} as const;

/**
 * Pagination configuration for list views.
 */
export const PAGE_SIZE_CONFIG = {
	/** Default number of items per page. */
	default: 5,
	/** Available page size options for user selection. */
	options: [5, 10, 20, 50, 100] as const,
	/** Maximum allowed page size. */
	max: 100,
	/** Number of items to show in preview sections. */
	preview: 10,
} as const;
