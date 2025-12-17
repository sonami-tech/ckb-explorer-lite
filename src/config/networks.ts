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
		url: 'http://192.168.0.74:8114',
	},
	{
		name: 'Mainnet',
		type: 'mainnet',
		isArchive: false,
		url: 'http://192.168.0.73:8114',
	},
	{
		name: 'Testnet',
		type: 'testnet',
		isArchive: false,
		url: 'http://192.168.0.73:18114',
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
