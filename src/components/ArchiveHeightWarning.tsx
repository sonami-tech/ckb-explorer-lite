import { useState } from 'react';
import { useArchive } from '../contexts/ArchiveContext';

/**
 * Warning banner displayed when an archive height is selected but the current
 * page shows immutable blockchain data that doesn't change based on height.
 */
export function ArchiveHeightWarning() {
	const { archiveHeight } = useArchive();
	const [dismissed, setDismissed] = useState(false);

	// Only render when archive height is set and not dismissed.
	if (archiveHeight === undefined || dismissed) {
		return null;
	}

	return (
		<div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
			<div className="flex items-start gap-3">
				{/* Warning icon. */}
				<div className="flex-shrink-0">
					<svg
						className="w-5 h-5 text-amber-500 dark:text-amber-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>

				{/* Warning text. */}
				<p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
					A historical block height is selected, but this page shows immutable blockchain data that doesn't change based on the selected height.
				</p>

				{/* Dismiss button. */}
				<button
					onClick={() => setDismissed(true)}
					className="flex-shrink-0 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
					aria-label="Dismiss warning"
				>
					<svg
						className="w-4 h-4 text-amber-600 dark:text-amber-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
}
