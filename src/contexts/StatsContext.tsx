/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useNetwork } from './NetworkContext';
import { createStatsClient, type StatsClient } from '../lib/statsRpc';

interface StatsContextValue {
	/** Stats client instance, or null if no statsUrl configured. */
	statsClient: StatsClient | null;

	/** True when statsUrl is configured for the current network. */
	isStatsAvailable: boolean;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
	const { currentNetwork } = useNetwork();

	// Create stats client when network or statsUrl changes.
	const statsUrl = currentNetwork?.statsUrl;
	const statsClient = useMemo(() => {
		if (!statsUrl) return null;
		return createStatsClient(statsUrl);
	}, [statsUrl]);

	const isStatsAvailable = statsClient !== null;

	return (
		<StatsContext.Provider value={{ statsClient, isStatsAvailable }}>
			{children}
		</StatsContext.Provider>
	);
}

export function useStats(): StatsContextValue {
	const context = useContext(StatsContext);
	if (!context) {
		throw new Error('useStats must be used within a StatsProvider.');
	}
	return context;
}
