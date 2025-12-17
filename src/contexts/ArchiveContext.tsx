/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useState,
	useEffect,
	useCallback,
	useRef,
	type ReactNode,
} from 'react';
import { useNetwork } from './NetworkContext';

interface ArchiveContextValue {
	/**
	 * Current archive height for queries.
	 * undefined means query current state (no archive mode).
	 */
	archiveHeight: number | undefined;

	/**
	 * Set the archive height for queries.
	 * Pass undefined to disable archive mode.
	 */
	setArchiveHeight: (height: number | undefined) => void;

	/**
	 * Current tip block number (latest synced block).
	 */
	tipBlockNumber: bigint | null;

	/**
	 * Whether the archive height exceeds the current tip.
	 */
	isHeightBeyondTip: boolean;

	/**
	 * Loading state for initial data fetch.
	 */
	isLoading: boolean;

	/**
	 * Error state if fetch fails.
	 */
	error: string | null;

	/**
	 * Refresh the tip block number.
	 */
	refreshTip: () => Promise<void>;
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || '8000', 10);

export function ArchiveProvider({ children }: { children: ReactNode }) {
	const { rpc, currentNetwork, isArchiveSupported } = useNetwork();

	const [archiveHeight, setArchiveHeightState] = useState<number | undefined>(undefined);
	const [tipBlockNumber, setTipBlockNumber] = useState<bigint | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Track previous network URL to detect network changes.
	const prevNetworkUrlRef = useRef<string | null>(null);

	// Parse height from URL on initial load.
	useEffect(() => {
		if (!isArchiveSupported) return;

		const params = new URLSearchParams(window.location.search);
		const heightParam = params.get('height');
		if (heightParam && /^\d+$/.test(heightParam)) {
			setArchiveHeightState(parseInt(heightParam, 10));
		}
	}, [isArchiveSupported]);

	// Clear archive height when network changes or when archive not supported.
	useEffect(() => {
		const currentUrl = currentNetwork?.url ?? null;

		if (prevNetworkUrlRef.current !== null && prevNetworkUrlRef.current !== currentUrl) {
			// Network changed - clear archive height.
			setArchiveHeightState(undefined);
			setTipBlockNumber(null);
			setError(null);
		}

		if (!isArchiveSupported && archiveHeight !== undefined) {
			// Archive not supported on this network - clear height.
			setArchiveHeightState(undefined);
		}

		prevNetworkUrlRef.current = currentUrl;
	}, [currentNetwork?.url, isArchiveSupported, archiveHeight]);

	// Update URL when archive height changes.
	const setArchiveHeight = useCallback((height: number | undefined) => {
		if (!isArchiveSupported && height !== undefined) {
			console.warn('Archive mode not supported on this network.');
			return;
		}

		setArchiveHeightState(height);

		const url = new URL(window.location.href);
		if (height !== undefined) {
			url.searchParams.set('height', height.toString());
		} else {
			url.searchParams.delete('height');
		}
		window.history.replaceState({}, '', url.toString());
	}, [isArchiveSupported]);

	// Fetch tip block number.
	const fetchTip = useCallback(async () => {
		if (!rpc) return;

		try {
			const tip = await rpc.getTipBlockNumber();
			setTipBlockNumber(tip);
			setError(null);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to connect to CKB node.';
			setError(message);
		}
	}, [rpc]);

	// Initial fetch when RPC client changes.
	useEffect(() => {
		if (!rpc) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		fetchTip().finally(() => setIsLoading(false));
	}, [rpc, fetchTip]);

	// Refresh just the tip block number (for external callers).
	const refreshTip = useCallback(async () => {
		if (!rpc) return;

		try {
			const tip = await rpc.getTipBlockNumber();
			setTipBlockNumber(tip);
		} catch {
			// Silently fail on refresh - don't update error state.
		}
	}, [rpc]);

	// Poll for tip updates.
	useEffect(() => {
		const interval = setInterval(refreshTip, POLL_INTERVAL);
		return () => clearInterval(interval);
	}, [refreshTip]);

	// Check if height exceeds tip.
	const isHeightBeyondTip = archiveHeight !== undefined &&
		tipBlockNumber !== null &&
		BigInt(archiveHeight) > tipBlockNumber;

	return (
		<ArchiveContext.Provider
			value={{
				archiveHeight,
				setArchiveHeight,
				tipBlockNumber,
				isHeightBeyondTip,
				isLoading,
				error,
				refreshTip,
			}}
		>
			{children}
		</ArchiveContext.Provider>
	);
}

export function useArchive(): ArchiveContextValue {
	const context = useContext(ArchiveContext);
	if (!context) {
		throw new Error('useArchive must be used within an ArchiveProvider.');
	}
	return context;
}
