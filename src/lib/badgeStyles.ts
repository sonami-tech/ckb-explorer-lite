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
// SCRIPT CATEGORY BADGES - Color by script family/function
// =============================================================================

/** Standard authentication: SECP256K1/blake160, Multisig. */
export const SCRIPT_CAT_STANDARD = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';

/** Advanced authentication: Omnilock, JoyID, Nostr Lock, PW Lock. */
export const SCRIPT_CAT_ADVANCED = 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';

/** Tokens: SUDT, xUDT. */
export const SCRIPT_CAT_TOKEN = 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';

/** Liquidity: iCKB variants. */
export const SCRIPT_CAT_LIQUIDITY = 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300';

/** DAO: NervosDAO. */
export const SCRIPT_CAT_DAO = 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';

/** NFTs: Spore, Spore Cluster, CoTA. */
export const SCRIPT_CAT_NFT = 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';

/** Storage: CKBFS. */
export const SCRIPT_CAT_STORAGE = 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300';

/** Bitcoin bridge: RGB++ Lock, BTC Time Lock. */
export const SCRIPT_CAT_BITCOIN = 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300';

/** Special access: Anyone-Can-Pay. */
export const SCRIPT_CAT_SPECIAL = 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300';

/** Other/Unknown: scripts not in the well-known registry. */
export const SCRIPT_CAT_OTHER = 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';

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
export const INACTIVE = 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 opacity-50';

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
 * Get the appropriate category style for a well-known script by name.
 */
export function getScriptCategoryStyle(scriptName: string): string {
	// Standard authentication.
	if (['SECP256K1/blake160', 'Multisig'].includes(scriptName)) {
		return SCRIPT_CAT_STANDARD;
	}
	// Advanced authentication.
	if (['Omnilock', 'JoyID', 'Nostr Lock', 'PW Lock'].includes(scriptName)) {
		return SCRIPT_CAT_ADVANCED;
	}
	// Tokens.
	if (['SUDT', 'xUDT'].includes(scriptName)) {
		return SCRIPT_CAT_TOKEN;
	}
	// Liquidity (iCKB variants).
	if (scriptName.startsWith('iCKB')) {
		return SCRIPT_CAT_LIQUIDITY;
	}
	// DAO.
	if (scriptName === 'NervosDAO') {
		return SCRIPT_CAT_DAO;
	}
	// NFTs.
	if (['Spore', 'Spore Cluster', 'CoTA'].includes(scriptName)) {
		return SCRIPT_CAT_NFT;
	}
	// Storage.
	if (scriptName === 'CKBFS') {
		return SCRIPT_CAT_STORAGE;
	}
	// Bitcoin bridge.
	if (['RGB++ Lock', 'BTC Time Lock'].includes(scriptName)) {
		return SCRIPT_CAT_BITCOIN;
	}
	// Special access.
	if (scriptName === 'Anyone-Can-Pay') {
		return SCRIPT_CAT_SPECIAL;
	}
	// Default fallback.
	return SCRIPT_CAT_STANDARD;
}
