/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface TickContextValue {
	/** Current tick count, increments every second. */
	tick: number;
}

const TickContext = createContext<TickContextValue | null>(null);

/**
 * Provider that broadcasts a synchronized tick every second.
 * All RelativeTime components subscribe to this single timer
 * instead of each creating their own interval.
 */
export function TickProvider({ children }: { children: ReactNode }) {
	const [tick, setTick] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setTick((t) => t + 1);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	return (
		<TickContext.Provider value={{ tick }}>
			{children}
		</TickContext.Provider>
	);
}

/**
 * Hook to subscribe to the global tick.
 * Returns the current tick count which updates every second.
 */
export function useTick(): number {
	const context = useContext(TickContext);
	if (!context) {
		throw new Error('useTick must be used within a TickProvider');
	}
	return context.tick;
}
