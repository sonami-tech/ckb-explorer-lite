/**
 * Centralized badge/pill color system for consistent styling across the site.
 *
 * Color Semantics:
 * - Status colors convey state (success, error, warning, info).
 * - Category colors distinguish types without status implications.
 * - Brand color for official/standard items.
 *
 * Each badge style includes light and dark mode variants.
 */

// =============================================================================
// STATUS BADGES - Convey state/outcome
// =============================================================================

/** Success state: live cells, committed transactions, deposits. */
export const STATUS_SUCCESS = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';

/** Error state: dead cells, rejected transactions, failures. */
export const STATUS_ERROR = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';

/** Warning state: unknown status, pending, needs attention. */
export const STATUS_WARNING = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';

/** Info state: proposed transactions, informational. */
export const STATUS_INFO = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';

/** Neutral state: unknown, default, unspecified. */
export const STATUS_NEUTRAL = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400';

// =============================================================================
// HASH TYPE BADGES - Script identification method
// =============================================================================

/** Type hash: script identified by type script hash (upgradeable). */
export const HASH_TYPE = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';

/** Data hash: script identified by code hash (data, data1, data2). */
export const HASH_DATA = 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';

// =============================================================================
// SCRIPT TYPE BADGES - Lock vs Type script distinction
// =============================================================================

/** Lock script: controls cell spending/access. */
export const SCRIPT_LOCK = 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400';

/** Type script: validates cell data and state transitions. */
export const SCRIPT_TYPE = 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400';

// =============================================================================
// CELL CATEGORY BADGES - Well-known cell classification
// =============================================================================

/** Binary/System: contains compiled RISC-V code. */
export const CELL_BINARY = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';

/** Dep Group: references multiple cells for dependencies. */
export const CELL_DEP_GROUP = 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';

/** Protocol: standard protocol implementation. */
export const CELL_PROTOCOL = 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400';

// =============================================================================
// BRAND BADGES - Official/standard items
// =============================================================================

/** Brand/Official: RFC specifications, known scripts, cellbase. */
export const BRAND = 'bg-nervos/10 text-nervos';

// =============================================================================
// TIMELINE EVENT BADGES
// =============================================================================

/** Genesis event marker. */
export const EVENT_GENESIS = 'bg-blue-500';

/** Hardfork event marker. */
export const EVENT_HARDFORK = 'bg-purple-500';

/** Halving event marker. */
export const EVENT_HALVING = 'bg-amber-500';

/** Default event marker. */
export const EVENT_DEFAULT = 'bg-gray-500';

// =============================================================================
// DAO PHASE BADGES
// =============================================================================

/** DAO deposit phase. */
export const DAO_DEPOSIT = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';

/** DAO withdraw phase. */
export const DAO_WITHDRAW = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';

// =============================================================================
// MISCELLANEOUS BADGES
// =============================================================================

/** Has type script indicator. */
export const HAS_TYPE = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';

/** Dep type indicator (code/dep_group). */
export const DEP_TYPE = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';

/** Legacy format indicator. */
export const LEGACY_FORMAT = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';

/** Network indicator. */
export const NETWORK = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';

// =============================================================================
// INACTIVE/DISABLED STATE
// =============================================================================

/** Inactive pill state (dimmed). */
export const INACTIVE = 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the appropriate hash type color based on the hash type value.
 */
export function getHashTypeStyle(hashType: string): string {
	return hashType === 'type' ? HASH_TYPE : HASH_DATA;
}

/**
 * Get the appropriate script type color based on whether it's a lock or type script.
 */
export function getScriptTypeStyle(isLockScript: boolean): string {
	return isLockScript ? SCRIPT_LOCK : SCRIPT_TYPE;
}

/**
 * Get the appropriate cell category style.
 */
export function getCellCategoryStyle(category: string): string {
	switch (category) {
		case 'system':
			return CELL_BINARY;
		case 'dep_group':
			return CELL_DEP_GROUP;
		case 'protocol':
			return CELL_PROTOCOL;
		default:
			return STATUS_NEUTRAL;
	}
}

/**
 * Get the appropriate status style.
 */
export function getStatusStyle(status: string): string {
	switch (status) {
		case 'live':
		case 'committed':
		case 'deposit':
			return STATUS_SUCCESS;
		case 'dead':
		case 'rejected':
			return STATUS_ERROR;
		case 'unknown':
		case 'pending':
			return STATUS_WARNING;
		case 'proposed':
			return STATUS_INFO;
		default:
			return STATUS_NEUTRAL;
	}
}
