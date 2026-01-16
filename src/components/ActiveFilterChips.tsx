export interface FilterChip {
	type: string;        // Filter type identifier (e.g., 'cellbase', 'minCkb', 'typeScript')
	label: string;       // Display label (e.g., 'Exclude Cellbase', '≥1,000 CKB', 'NervosDAO')
	value: string;       // The actual filter value for removal
}

interface ActiveFilterChipsProps {
	chips: FilterChip[];
	onRemove: (chip: FilterChip) => void;
	onClearAll: () => void;
}

/**
 * Displays active filters as removable chips/tags.
 * Shows which filters are currently active and allows users to remove them individually or clear all.
 */
export function ActiveFilterChips({ chips, onRemove, onClearAll }: ActiveFilterChipsProps) {
	// Return nothing when no chips are active.
	if (chips.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="text-sm text-gray-500 dark:text-gray-400">
				Active Filters:
			</span>

			{chips.map((chip) => (
				<span
					key={`${chip.type}-${chip.value}`}
					className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
				>
					<span>{chip.label}</span>
					<button
						type="button"
						onClick={() => onRemove(chip)}
						className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
						aria-label={`Remove ${chip.label} filter`}
					>
						<svg
							className="w-3 h-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</span>
			))}

			{chips.length >= 2 && (
				<button
					type="button"
					onClick={onClearAll}
					className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
				>
					Clear All
				</button>
			)}
		</div>
	);
}
