interface DetailRowProps {
	label: React.ReactNode;
	children: React.ReactNode;
}

/**
 * Consistent detail row for displaying label-value pairs.
 * Stacks vertically on mobile, side-by-side on desktop.
 */
export function DetailRow({ label, children }: DetailRowProps) {
	return (
		<div className="flex flex-col lg:flex-row lg:items-center p-4 gap-2">
			<span className="w-40 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
				{label}
			</span>
			<div className="flex-1 text-sm text-gray-900 dark:text-white break-all">
				{children}
			</div>
		</div>
	);
}
