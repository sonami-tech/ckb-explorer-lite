/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useNetwork } from './NetworkContext';
import { createStatsClient, type StatsClient } from '../lib/statsRpc';
import { statsPath } from '../config/loadConfig';

interface StatsContextValue {
	/** Stats client instance, or null when the current network has no stats backend. */
	statsClient: StatsClient | null;

	/** True when the current network has a stats backend configured. */
	isStatsAvailable: boolean;
}

const StatsContext = createContext<StatsContextValue | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
	const { currentNetwork } = useNetwork();

	// Build the slug-derived stats proxy path; null when the network has no
	// stats backend (browser never sees an upstream URL).
	const statsClient = useMemo(() => {
		if (!currentNetwork) return null;
		const path = statsPath(currentNetwork.slug, currentNetwork.hasStats);
		if (!path) return null;
		return createStatsClient(path);
	}, [currentNetwork]);

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
