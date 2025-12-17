import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../lib/format';

interface RelativeTimeProps {
	timestamp: bigint | number;
}

/**
 * Displays a relative time string that updates every second.
 */
export function RelativeTime({ timestamp }: RelativeTimeProps) {
	const [, setTick] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setTick((t) => t + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	return <>{formatRelativeTime(timestamp)}</>;
}
