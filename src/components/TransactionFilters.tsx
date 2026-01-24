/**
 * Type definitions for BlockPage transaction filtering.
 * The actual filter UI is implemented in BlockFilterModal.tsx.
 */

import { DEFAULT_BLOCK_FILTERS as _DEFAULT_BLOCK_FILTERS } from '../config/defaults';

/**
 * Filter state for BlockPage transaction filtering.
 */
export interface BlockPageFilters {
	cellbase: 'all' | 'only' | 'exclude';
	minTotalCkb: number | null;      // In CKB units (not shannons)
	minInputs: number | null;
	minOutputs: number | null;
	typeScriptGroups: string[];      // Group names: ['UDT', 'NervosDAO']
	lockScriptGroups: string[];      // Group names: ['RGB++', 'Multisig', 'ACP']
}

/**
 * Scripts present in the current block, used to show only relevant filter options.
 */
export interface PresentScripts {
	typeGroups: Map<string, number>;   // groupName -> count of transactions
	lockGroups: Map<string, number>;   // groupName -> count of transactions
}

/**
 * Default filter values. Re-exported from config/defaults.ts for convenience.
 */
export const DEFAULT_BLOCK_FILTERS: BlockPageFilters = _DEFAULT_BLOCK_FILTERS;
