interface FilterSortButtonProps {
	onClick: () => void;
	activeFilterCount?: number;
}

/**
 * Button to open filter/sort modal.
 * Shows a sliders icon with optional badge for active filter count.
 */
export function FilterSortButton({ onClick, activeFilterCount = 0 }: FilterSortButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="relative flex items-center justify-center text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
			aria-label="Sort and filter"
		>
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
			</svg>
			{activeFilterCount > 0 && (
				<span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold text-white bg-nervos rounded-full">
					{activeFilterCount}
				</span>
			)}
		</button>
	);
}
