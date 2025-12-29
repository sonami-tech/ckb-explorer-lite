/**
 * Component to display comprehensive information about well-known CKB cells.
 * Shows name, description, importance, category, and external resources.
 */

import type { WellKnownCellInfo as WellKnownCellInfoType, WellKnownCellCategory } from '../lib/wellKnown';

interface WellKnownCellInfoProps {
	/** The well-known cell information to display. */
	info: WellKnownCellInfoType;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Get the display label and styles for a category.
 */
function getCategoryStyles(category: WellKnownCellCategory): { label: string; className: string } {
	switch (category) {
		case 'system':
			return {
				label: 'System',
				className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
			};
		case 'dep_group':
			return {
				label: 'Dep Group',
				className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
			};
		case 'protocol':
			return {
				label: 'Protocol',
				className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
			};
		default:
			return {
				label: 'Unknown',
				className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
			};
	}
}

/**
 * Display comprehensive well-known cell information.
 */
export function WellKnownCellInfo({ info, className = '' }: WellKnownCellInfoProps) {
	const categoryStyles = getCategoryStyles(info.category);

	return (
		<div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 ${className}`}>
			{/* Header with name, category badge, and RFC. */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-3">
						<h2 className="font-semibold text-gray-900 dark:text-white">
							Well-Known Cell
						</h2>
						<span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryStyles.className}`}>
							{categoryStyles.label}
						</span>
						{info.rfc && (
							<span className="px-2 py-0.5 rounded text-xs font-medium bg-nervos/10 text-nervos">
								RFC {info.rfc}
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Content. */}
			<div className="p-4 space-y-4">
				{/* Name. */}
				<div>
					<h3 className="text-lg font-bold text-nervos">
						{info.name}
					</h3>
				</div>

				{/* Description. */}
				<div>
					<h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
						Description
					</h4>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						{info.description}
					</p>
				</div>

				{/* Importance. */}
				<div>
					<h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
						Importance
					</h4>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						{info.importance}
					</p>
				</div>

				{/* Resources. */}
				{info.resources.length > 0 && (
					<div>
						<h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
							Resources
						</h4>
						<div className="flex flex-wrap gap-2">
							{info.resources.map((resource, i) => (
								<a
									key={i}
									href={resource.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 px-2.5 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
								>
									{resource.title}
									<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
									</svg>
								</a>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
