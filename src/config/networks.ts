/**
 * Network configuration definitions.
 *
 * This replaces environment variable configuration with typed, static config.
 * To change network URLs, edit this file and rebuild.
 */

export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export interface NetworkConfig {
	/** Display name for the network. */
	name: string;
	/** Network type (mainnet, testnet, or devnet). */
	type: NetworkType;
	/** Whether archive mode (set_block_height) is supported. */
	isArchive: boolean;
	/** RPC endpoint URL. */
	url: string;
	/** Optional stats server URL (port 8116 by default). */
	statsUrl?: string;
}

/**
 * Configured networks.
 *
 * Add, remove, or modify networks here. The first network in the array
 * will be selected by default.
 */
export const networks: NetworkConfig[] = [
	{
		name: 'Mainnet Archive',
		type: 'mainnet',
		isArchive: true,
		url: '/rpc/archive',
		statsUrl: '/rpc/stats',
	},
	{
		name: 'Mainnet',
		type: 'mainnet',
		isArchive: false,
		url: '/rpc/mainnet',
	},
	{
		name: 'Testnet',
		type: 'testnet',
		isArchive: false,
		url: '/rpc/testnet',
	},
];

/**
 * Get the display label for a network type.
 */
export function getNetworkTypeLabel(type: NetworkType): string {
	switch (type) {
		case 'mainnet':
			return 'Mainnet';
		case 'testnet':
			return 'Testnet';
		case 'devnet':
			return 'Devnet';
	}
}
