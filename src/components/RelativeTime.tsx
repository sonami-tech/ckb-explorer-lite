import { useTick } from '../contexts/TickContext';
import { formatRelativeTime } from '../lib/format';

interface RelativeTimeProps {
	timestamp: bigint | number;
}

/**
 * Displays a relative time string that updates every second.
 * Uses a shared timer context to synchronize all instances.
 */
export function RelativeTime({ timestamp }: RelativeTimeProps) {
	// Subscribe to the global tick to trigger re-renders.
	useTick();

	return <>{formatRelativeTime(timestamp)}</>;
}
