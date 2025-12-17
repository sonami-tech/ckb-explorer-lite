/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useState,
	useEffect,
	useMemo,
	useCallback,
	type ReactNode,
} from 'react';
import { networks as configuredNetworks, type NetworkConfig } from '../config';
import { createRpcClient, type RpcClient } from '../lib/rpc';

const STORAGE_KEY = 'ckb-explorer-selected-network';
const URL_PARAM_KEY = 'network';

interface NetworkContextValue {
	/** List of configured networks. */
	networks: NetworkConfig[];

	/** Index of the currently selected network. */
	selectedIndex: number;

	/** The currently selected network configuration. */
	currentNetwork: NetworkConfig | null;

	/** RPC client for the current network. */
	rpc: RpcClient | null;

	/** Whether archive mode is supported on the current network. */
	isArchiveSupported: boolean;

	/** Select a network by index. */
	selectNetwork: (index: number) => void;

	/** Error message if no networks are configured. */
	configError: string | null;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

/**
 * Get initial network index from URL param or localStorage.
 */
function getInitialNetworkIndex(networks: NetworkConfig[]): number {
	if (networks.length === 0) return 0;

	// First check URL parameter.
	const params = new URLSearchParams(window.location.search);
	const networkName = params.get(URL_PARAM_KEY);
	if (networkName) {
		const index = networks.findIndex((n) => n.name === networkName);
		if (index !== -1) return index;
	}

	// Then check localStorage.
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) {
		const index = parseInt(stored, 10);
		if (!isNaN(index) && index >= 0 && index < networks.length) {
			return index;
		}
	}

	return 0;
}

/**
 * Update URL with network name.
 */
function updateUrlWithNetwork(networkName: string): void {
	const url = new URL(window.location.href);
	url.searchParams.set(URL_PARAM_KEY, networkName);
	window.history.replaceState({}, '', url.toString());
}

export function NetworkProvider({ children }: { children: ReactNode }) {
	const networks = configuredNetworks;
	const [selectedIndex, setSelectedIndex] = useState(() => getInitialNetworkIndex(networks));

	const configError = networks.length === 0
		? 'No networks configured. Add networks to src/config/networks.ts.'
		: null;

	const currentNetwork = networks[selectedIndex] ?? null;

	// Create RPC client when network changes.
	const rpc = useMemo(() => {
		if (!currentNetwork) return null;
		return createRpcClient(currentNetwork.url);
	}, [currentNetwork]);

	const isArchiveSupported = currentNetwork?.isArchive ?? false;

	// Persist selection and update URL when network changes.
	useEffect(() => {
		if (currentNetwork) {
			localStorage.setItem(STORAGE_KEY, selectedIndex.toString());
			updateUrlWithNetwork(currentNetwork.name);
		}
	}, [selectedIndex, currentNetwork]);

	const selectNetwork = useCallback((index: number) => {
		if (index >= 0 && index < networks.length) {
			setSelectedIndex(index);
		}
	}, [networks.length]);

	return (
		<NetworkContext.Provider
			value={{
				networks,
				selectedIndex,
				currentNetwork,
				rpc,
				isArchiveSupported,
				selectNetwork,
				configError,
			}}
		>
			{children}
		</NetworkContext.Provider>
	);
}

export function useNetwork(): NetworkContextValue {
	const context = useContext(NetworkContext);
	if (!context) {
		throw new Error('useNetwork must be used within a NetworkProvider.');
	}
	return context;
}

/**
 * Hook to get just the RPC client.
 * Throws if no network is configured.
 */
export function useRpc(): RpcClient {
	const { rpc } = useNetwork();
	if (!rpc) {
		throw new Error('No RPC client available. Check network configuration.');
	}
	return rpc;
}
