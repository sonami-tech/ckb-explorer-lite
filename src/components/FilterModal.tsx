import { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '../hooks/ui';
import { ChevronDownIcon } from './CopyButton';
import { TYPE_SCRIPT_GROUPS, LOCK_SCRIPT_GROUPS } from '../lib/scriptGroups';
import type { BlockPageFilters, PresentScripts } from './TransactionFilters';
import type { SortOption, SortValue } from './SortDropdown';

export interface FilterModalProps {
	isOpen: boolean;
	onClose: () => void;

	// Sort props.
	sortOptions: SortOption[];
	sortValue: SortValue;
	onSortChange: (value: SortValue) => void;

	// Filter props (BlockPage).
	filters: BlockPageFilters;
	onFiltersChange: (filters: BlockPageFilters) => void;
	presentScripts: PresentScripts;

	// Clear action.
	onClearAll: () => void;
}

/**
 * Cellbase filter options.
 */
const CELLBASE_OPTIONS: { value: BlockPageFilters['cellbase']; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'only', label: 'Cellbase Only' },
	{ value: 'exclude', label: 'Exclude Cellbase' },
];

/**
 * Full-screen modal for mobile filter/sort UI.
 * Renders at document root using a portal to ensure proper stacking context.
 * Features:
 * - Fixed header with back and done buttons
 * - Scrollable content area
 * - Sort options as radio buttons
 * - Filter sections for cellbase, minimum values, and scripts
 * - Clear all button at the bottom
 * - Prevents body scroll when open
 * - CSS transitions for open/close animation
 */
export function FilterModal({
	isOpen,
	onClose,
	sortOptions,
	sortValue,
	onSortChange,
	filters,
	onFiltersChange,
	presentScripts,
	onClearAll,
}: FilterModalProps) {
	const [cellbaseDropdownOpen, setCellbaseDropdownOpen] = useState(false);
	const cellbaseDropdownRef = useRef<HTMLDivElement>(null);

	useClickOutside(cellbaseDropdownRef, () => setCellbaseDropdownOpen(false));

	// Handle escape key to close.
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	}, [onClose]);

	// Prevent body scroll when modal is open.
	useEffect(() => {
		if (!isOpen) return;

		document.addEventListener('keydown', handleKeyDown);
		document.body.style.overflow = 'hidden';

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = '';
		};
	}, [isOpen, handleKeyDown]);

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

	// Handle sort option selection.
	const handleSortSelect = useCallback((field: string, direction: 'asc' | 'desc') => {
		onSortChange({ field, direction });
	}, [onSortChange]);

	// Check if a sort option is selected.
	const isSortSelected = useCallback((field: string, direction: 'asc' | 'desc') => {
		return sortValue.field === field && sortValue.direction === direction;
	}, [sortValue]);

	// Get current cellbase label.
	const cellbaseLabel = CELLBASE_OPTIONS.find(opt => opt.value === filters.cellbase)?.label ?? 'All';

	// Get type script groups that are present in the block.
	const presentTypeGroups = Array.from(presentScripts.typeGroups.entries())
		.filter(([groupName]) => Object.keys(TYPE_SCRIPT_GROUPS).includes(groupName))
		.sort((a, b) => a[0].localeCompare(b[0]));

	// Get lock script groups that are present in the block.
	const presentLockGroups = Array.from(presentScripts.lockGroups.entries())
		.filter(([groupName]) => Object.keys(LOCK_SCRIPT_GROUPS).includes(groupName))
		.sort((a, b) => a[0].localeCompare(b[0]));

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900"
			role="dialog"
			aria-modal="true"
			aria-labelledby="filter-modal-title"
		>
			{/* Fixed header. */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
				<button
					type="button"
					onClick={onClose}
					className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
					aria-label="Close filters"
				>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<h2 id="filter-modal-title" className="text-base font-semibold text-gray-900 dark:text-white">
					Filters
				</h2>
				<button
					type="button"
					onClick={onClose}
					className="text-sm font-medium text-nervos hover:text-nervos-dark transition-colors"
				>
					Done
				</button>
			</div>

			{/* Scrollable content area. */}
			<div className="flex-1 overflow-y-auto px-4 py-4">
				{/* Sort by section. */}
				<section className="mb-6">
					<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
						Sort By
					</h3>
					<div className="space-y-2">
						{sortOptions.map((option) => (
							<div key={option.field}>
								{/* Descending option. */}
								<label className="flex items-center gap-3 py-2 cursor-pointer">
									<input
										type="radio"
										name="sort"
										checked={isSortSelected(option.field, 'desc')}
										onChange={() => handleSortSelect(option.field, 'desc')}
										className="w-4 h-4 text-nervos focus:ring-nervos focus:ring-2 border-gray-300 dark:border-gray-600"
									/>
									<span className="text-sm text-gray-700 dark:text-gray-300">
										{option.label} ({option.descLabel ?? 'Descending'})
									</span>
								</label>
								{/* Ascending option. */}
								<label className="flex items-center gap-3 py-2 cursor-pointer">
									<input
										type="radio"
										name="sort"
										checked={isSortSelected(option.field, 'asc')}
										onChange={() => handleSortSelect(option.field, 'asc')}
										className="w-4 h-4 text-nervos focus:ring-nervos focus:ring-2 border-gray-300 dark:border-gray-600"
									/>
									<span className="text-sm text-gray-700 dark:text-gray-300">
										{option.label} ({option.ascLabel ?? 'Ascending'})
									</span>
								</label>
							</div>
						))}
					</div>
				</section>

				{/* Cellbase section. */}
				<section className="mb-6">
					<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
						Cellbase
					</h3>
					<div ref={cellbaseDropdownRef} className="relative">
						<button
							type="button"
							onClick={() => setCellbaseDropdownOpen(prev => !prev)}
							className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 pr-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
							aria-haspopup="listbox"
							aria-expanded={cellbaseDropdownOpen}
						>
							{cellbaseLabel}
						</button>
						<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />

						{cellbaseDropdownOpen && (
							<div
								className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 w-full"
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
										className={`px-3 py-2 text-sm cursor-pointer ${
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
				</section>

				{/* Minimum values section. */}
				<section className="mb-6">
					<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
						Minimum Values
					</h3>
					<div className="space-y-4">
						{/* Min Total CKB. */}
						<div>
							<label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
								Min Total CKB
							</label>
							<div className="relative">
								<input
									type="number"
									inputMode="decimal"
									min="0"
									step="any"
									value={filters.minTotalCkb ?? ''}
									onChange={(e) => handleNumberInput('minTotalCkb', e.target.value)}
									placeholder="0"
									className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 pr-12 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
								/>
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
									CKB
								</span>
							</div>
						</div>

						{/* Min Inputs. */}
						<div>
							<label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
								Min Inputs
							</label>
							<input
								type="number"
								inputMode="numeric"
								min="0"
								step="1"
								value={filters.minInputs ?? ''}
								onChange={(e) => handleNumberInput('minInputs', e.target.value)}
								placeholder="0"
								className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
							/>
						</div>

						{/* Min Outputs. */}
						<div>
							<label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
								Min Outputs
							</label>
							<input
								type="number"
								inputMode="numeric"
								min="0"
								step="1"
								value={filters.minOutputs ?? ''}
								onChange={(e) => handleNumberInput('minOutputs', e.target.value)}
								placeholder="0"
								className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nervos focus:border-transparent"
							/>
						</div>
					</div>
				</section>

				{/* Type scripts section. */}
				{presentTypeGroups.length > 0 && (
					<section className="mb-6">
						<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
							Type Scripts
						</h3>
						<div className="space-y-2">
							{presentTypeGroups.map(([groupName, count]) => (
								<label
									key={groupName}
									className="flex items-center gap-3 py-2 cursor-pointer"
								>
									<input
										type="checkbox"
										checked={filters.typeScriptGroups.includes(groupName)}
										onChange={() => toggleTypeScriptGroup(groupName)}
										className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
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
					</section>
				)}

				{/* Lock scripts section. */}
				{presentLockGroups.length > 0 && (
					<section className="mb-6">
						<h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
							Lock Scripts
						</h3>
						<div className="space-y-2">
							{presentLockGroups.map(([groupName, count]) => (
								<label
									key={groupName}
									className="flex items-center gap-3 py-2 cursor-pointer"
								>
									<input
										type="checkbox"
										checked={filters.lockScriptGroups.includes(groupName)}
										onChange={() => toggleLockScriptGroup(groupName)}
										className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-nervos focus:ring-nervos focus:ring-2 bg-white dark:bg-gray-800"
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
					</section>
				)}

				{/* Divider before clear button. */}
				<div className="border-t border-gray-200 dark:border-gray-700 pt-6">
					{/* Clear all button. */}
					<button
						type="button"
						onClick={onClearAll}
						className="w-full py-3 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
					>
						Clear All Filters
					</button>
				</div>
			</div>
		</div>
	);

	// Render via portal to document root.
	return createPortal(modalContent, document.body);
}
