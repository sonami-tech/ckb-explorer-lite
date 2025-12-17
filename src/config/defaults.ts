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
