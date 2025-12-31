import type { NetworkEvent } from '../../config';
import { formatNumber } from '../../lib/format';

interface EventInfoCardProps {
	/** The event to display. */
	event: NetworkEvent;
	/** Callback to dismiss the card. */
	onDismiss: () => void;
}

/**
 * Get border accent color based on event type.
 */
function getEventBorderColor(type: NetworkEvent['type']): string {
	switch (type) {
		case 'genesis':
			return 'border-l-blue-500';
		case 'hardfork':
			return 'border-l-purple-500';
		case 'halving':
			return 'border-l-amber-500';
		default:
			return 'border-l-gray-500';
	}
}

/**
 * Format event date for display.
 */
function formatEventDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

/**
 * Card displaying full event information.
 *
 * Shows event name, date, block number, description,
 * and optional "Learn more" link.
 */
export function EventInfoCard({ event, onDismiss }: EventInfoCardProps) {
	return (
		<div
			className={`
				mt-3 rounded-lg border-l-4 ${getEventBorderColor(event.type)}
				bg-gray-50 dark:bg-gray-800/50
				border border-gray-200 dark:border-gray-700
			`}
		>
			<div className="p-3">
				{/* Header row: Name and dismiss button. */}
				<div className="flex items-start justify-between gap-2 mb-2">
					<span className="font-semibold text-gray-900 dark:text-white">
						{event.name}
					</span>

					{/* Dismiss button. */}
					<button
						type="button"
						onClick={onDismiss}
						className="
							p-1 rounded-md text-gray-400 hover:text-gray-600
							dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700
							transition-colors flex-shrink-0
						"
						aria-label="Dismiss event info"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Block and date info. */}
				<div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
					Block {formatNumber(BigInt(event.block))} &bull; {formatEventDate(event.date)}
				</div>

				{/* Description. */}
				<p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
					{event.description}
				</p>

				{/* Learn more link. */}
				{event.url && (
					<a
						href={event.url}
						target="_blank"
						rel="noopener noreferrer"
						className="
							inline-flex items-center gap-1 mt-2 text-sm font-medium
							text-nervos hover:text-nervos/80 transition-colors
						"
					>
						Learn more
						<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>
				)}
			</div>
		</div>
	);
}
