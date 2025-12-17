import type { NetworkEvent } from '../../config';

interface EventMarkerProps {
	/** The network event to display. */
	event: NetworkEvent;
	/** Position as percentage (0-100). */
	position: number;
	/** Callback when marker is clicked/tapped. */
	onSelect: (event: NetworkEvent) => void;
}

/**
 * Get color class based on event type.
 */
function getEventColor(type: NetworkEvent['type']): string {
	switch (type) {
		case 'genesis':
			return 'bg-blue-500';
		case 'hardfork':
			return 'bg-purple-500';
		case 'halving':
			return 'bg-amber-500';
		default:
			return 'bg-gray-500';
	}
}

/**
 * Event marker for timeline events.
 *
 * Uses a transparent hit area (12px) for easier clicking/tapping,
 * with a thin visible line (4px) inside for the visual indicator.
 */
export function EventMarker({ event, position, onSelect }: EventMarkerProps) {
	// Stop propagation on all pointer events to prevent track drag handlers from firing.
	const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
		e.stopPropagation();
	};

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onSelect(event);
	};

	return (
		<button
			type="button"
			onMouseDown={handleInteraction}
			onTouchStart={handleInteraction}
			onClick={handleClick}
			className="
				absolute top-1/2 -translate-y-1/2 -translate-x-1/2
				w-3 h-6 flex items-center justify-center
				cursor-pointer z-10
				focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
				focus-visible:ring-nervos
				group
			"
			style={{ left: `${position}%` }}
			aria-label={`${event.name}: ${event.description}`}
			title={event.name}
		>
			{/* Visible thin line marker. */}
			<div
				className={`
					w-1 h-5 rounded-full
					${getEventColor(event.type)}
					opacity-70 group-hover:opacity-100
					transition-opacity duration-150
				`}
			/>
		</button>
	);
}
