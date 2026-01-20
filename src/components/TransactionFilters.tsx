import { useState, useRef, useCallback } from 'react';
import { useClickOutside } from '../hooks/ui';
import { ChevronDownIcon, ChevronButton } from './CopyButton';
import { TYPE_SCRIPT_GROUPS, LOCK_SCRIPT_GROUPS, OTHER_SCRIPTS_GROUP, NO_TYPE_SCRIPT_GROUP } from '../lib/scriptGroups';
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

interface TransactionFiltersProps {
	filters: BlockPageFilters;
	onFiltersChange: (filters: BlockPageFilters) => void;
	presentScripts: PresentScripts;
	isExpanded: boolean;
	onExpandedChange: (expanded: boolean) => void;
}

/**
 * Default filter values. Re-exported from config/defaults.ts for convenience.
 */
export const DEFAULT_BLOCK_FILTERS: BlockPageFilters = _DEFAULT_BLOCK_FILTERS;

/**
 * Cellbase filter options.
 */
const CELLBASE_OPTIONS: { value: BlockPageFilters['cellbase']; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'only', label: 'Cellbase Only' },
	{ value: 'exclude', label: 'Exclude Cellbase' },
];

/**
 * Desktop filter panel component for transaction filtering on BlockPage.
 * Provides controls for filtering by cellbase, min CKB, min inputs/outputs,
 * and type/lock scripts present in the block.
 */
export function TransactionFilters({
	filters,
	onFiltersChange,
	presentScripts,
	isExpanded,
	onExpandedChange,
}: TransactionFiltersProps) {
	const [cellbaseDropdownOpen, setCellbaseDropdownOpen] = useState(false);
	const cellbaseDropdownRef = useRef<HTMLDivElement>(null);

	useClickOutside(cellbaseDropdownRef, () => setCellbaseDropdownOpen(false));

	// Update a single filter field.
	const updateFilter = useCallback(<K extends keyof BlockPageFilters>(
		key: K,
		value: BlockPageFilters[K]
	) => {
		onFiltersChange({ ...filters, [key]: value });
	}, [filters, onFiltersChange]);

	// Handle number input changes.
	const handleNumberInput = useCallback((
		key: 'minTotalCkb' | 'minInputs' | 'minOutputs',
		value: string
	) => {
		if (value === '') {
			updateFilter(key, null);
		} else {
			const parsed = parseFloat(value);
			if (!isNaN(parsed) && parsed >= 0) {
				updateFilter(key, parsed);
			}
		}
	}, [updateFilter]);

	// Toggle type script group selection.
	const toggleTypeScriptGroup = useCallback((groupName: string) => {
		const current = filters.typeScriptGroups;
		const newSelection = current.includes(groupName)
			? current.filter(g => g !== groupName)
			: [...current, groupName];
		updateFilter('typeScriptGroups', newSelection);
	}, [filters.typeScriptGroups, updateFilter]);

	// Toggle lock script group selection.
	const toggleLockScriptGroup = useCallback((groupName: string) => {
		const current = filters.lockScriptGroups;
		const newSelection = current.includes(groupName)
			? current.filter(g => g !== groupName)
			: [...current, groupName];
		updateFilter('lockScriptGroups', newSelection);
	}, [filters.lockScriptGroups, updateFilter]);

	// Get current cellbase label.
	const cellbaseLabel = CELLBASE_OPTIONS.find(opt => opt.value === filters.cellbase)?.label ?? 'All';

	// Get type script groups that are present in the block (including "Other" and "None").
	const presentTypeGroups = Array.from(presentScripts.typeGroups.entries())
		.filter(([groupName]) => Object.keys(TYPE_SCRIPT_GROUPS).includes(groupName) || groupName === OTHER_SCRIPTS_GROUP || groupName === NO_TYPE_SCRIPT_GROUP)
		.sort((a, b) => {
			// Sort "None" to the very end, "Other" before it.
			if (a[0] === NO_TYPE_SCRIPT_GROUP) return 1;
			if (b[0] === NO_TYPE_SCRIPT_GROUP) return -1;
			if (a[0] === OTHER_SCRIPTS_GROUP) return 1;
			if (b[0] === OTHER_SCRIPTS_GROUP) return -1;
			return a[0].localeCompare(b[0]);
		});

	// Get lock script groups that are present in the block (including "Other").
	const presentLockGroups = Array.from(presentScripts.lockGroups.entries())
		.filter(([groupName]) => Object.keys(LOCK_SCRIPT_GROUPS).includes(groupName) || groupName === OTHER_SCRIPTS_GROUP)
		.sort((a, b) => {
			// Sort "Other" to the end.
			if (a[0] === OTHER_SCRIPTS_GROUP) return 1;
			if (b[0] === OTHER_SCRIPTS_GROUP) return -1;
			return a[0].localeCompare(b[0]);
		});

	const hasScriptFilters = presentTypeGroups.length > 0 || presentLockGroups.length > 0;

	return (
		<div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
			{/* Header with expand/collapse toggle. */}
			<button
				onClick={() => onExpandedChange(!isExpanded)}
				className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
			>
				<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Filters
				</span>
				<ChevronButton
					isExpanded={isExpanded}
					onClick={(e) => {
						e?.stopPropagation();
						onExpandedChange(!isExpanded);
					}}
				/>
			</button>

			{/* Expanded content. */}
			{isExpanded && (
				<div className="px-4 pb-4 space-y-4">
					{/* Row 1: Cellbase and Min Total CKB. */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Cellbase dropdown. */}
						<div>
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
								Cellbase
							</label>
							<div ref={cellbaseDropdownRef} className="relative">
								<button
									type="button"
									onClick={() => setCellbaseDropdownOpen(prev => !prev)}
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 pr-9 bg-white dark:bg-gray-900 text-gray-900 dark:text-white cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
									aria-haspopup="listbox"
									aria-expanded={cellbaseDropdownOpen}
								>
									{cellbaseLabel}
								</button>
								<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />

								{cellbaseDropdownOpen && (
									<div
										className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 min-w-full"
										role="listbox"
									>
										{CELLBASE_OPTIONS.map((option) => (
											<div
												key={option.value}
												role="option"
												tabIndex={0}
												aria-selected={filters.cellbase === option.value}
												onClick={() => {
													updateFilter('cellbase', option.value);
													setCellbaseDropdownOpen(false);
												}}
												onKeyDown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														updateFilter('cellbase', option.value);
														setCellbaseDropdownOpen(false);
													}
												}}
												className={`px-3 py-1.5 text-sm cursor-pointer ${
													filters.cellbase === option.value
														? 'bg-nervos/10 text-nervos dark:text-nervos'
														: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
												}`}
											>
												{option.label}
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Min Total CKB input. */}
						<div>
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
								Min Total CKB
							</label>
							<div className="relative">
								<input
									type="number"
									min="0"
									step="any"
									value={filters.minTotalCkb ?? ''}
									onChange={(e) => handleNumberInput('minTotalCkb', e.target.value)}
									placeholder="0"
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 pr-12 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
									CKB
								</span>
							</div>
						</div>
					</div>

					{/* Row 2: Min Inputs and Min Outputs. */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Min Inputs input. */}
						<div>
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
								Min Inputs
							</label>
							<input
								type="number"
								min="0"
								step="1"
								value={filters.minInputs ?? ''}
								onChange={(e) => handleNumberInput('minInputs', e.target.value)}
								placeholder="0"
								className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
							/>
						</div>

						{/* Min Outputs input. */}
						<div>
							<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
								Min Outputs
							</label>
							<input
								type="number"
								min="0"
								step="1"
								value={filters.minOutputs ?? ''}
								onChange={(e) => handleNumberInput('minOutputs', e.target.value)}
								placeholder="0"
								className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
							/>
						</div>
					</div>

					{/* Divider before script filters. */}
					{hasScriptFilters && (
						<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
							{/* Type Scripts section. */}
							{presentTypeGroups.length > 0 && (
								<div className="mb-4">
									<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
										Type Scripts (present in this block)
									</label>
									<div className="flex flex-wrap gap-x-4 gap-y-2">
										{presentTypeGroups.map(([groupName, count]) => (
											<label
												key={groupName}
												className="inline-flex items-center gap-2 cursor-pointer"
											>
												<input
													type="checkbox"
													checked={filters.typeScriptGroups.includes(groupName)}
													onChange={() => toggleTypeScriptGroup(groupName)}
													className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-900"
												/>
												<span className="text-sm text-gray-700 dark:text-gray-300">
													{groupName}
												</span>
												<span className="text-xs text-gray-400 dark:text-gray-500">
													({count})
												</span>
											</label>
										))}
									</div>
								</div>
							)}

							{/* Lock Scripts section. */}
							{presentLockGroups.length > 0 && (
								<div>
									<label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
										Lock Scripts (present in this block)
									</label>
									<div className="flex flex-wrap gap-x-4 gap-y-2">
										{presentLockGroups.map(([groupName, count]) => (
											<label
												key={groupName}
												className="inline-flex items-center gap-2 cursor-pointer"
											>
												<input
													type="checkbox"
													checked={filters.lockScriptGroups.includes(groupName)}
													onChange={() => toggleLockScriptGroup(groupName)}
													className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-900"
												/>
												<span className="text-sm text-gray-700 dark:text-gray-300">
													{groupName}
												</span>
												<span className="text-xs text-gray-400 dark:text-gray-500">
													({count})
												</span>
											</label>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
