/**
 * Network configuration types and parsing utilities.
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

const VALID_TYPES: NetworkType[] = ['mainnet', 'testnet', 'devnet'];

/**
 * Parse a single network configuration string.
 * Format: Name|Type|IsArchive|URL
 */
function parseNetworkConfig(value: string, index: number): NetworkConfig | null {
	const parts = value.split('|');

	if (parts.length !== 4) {
		console.warn(
			`Invalid network config at index ${index}: expected 4 fields (Name|Type|IsArchive|URL), got ${parts.length}.`,
		);
		return null;
	}

	const [name, typeStr, isArchiveStr, url] = parts;

	// Validate name.
	if (!name.trim()) {
		console.warn(`Invalid network config at index ${index}: name cannot be empty.`);
		return null;
	}

	// Validate and parse type.
	const type = typeStr.toLowerCase() as NetworkType;
	if (!VALID_TYPES.includes(type)) {
		console.warn(
			`Invalid network type "${typeStr}" at index ${index}, defaulting to "devnet".`,
		);
	}
	const validType = VALID_TYPES.includes(type) ? type : 'devnet';

	// Parse isArchive.
	const isArchive = isArchiveStr.toLowerCase() === 'true';

	// Validate URL.
	if (!url.trim()) {
		console.warn(`Invalid network config at index ${index}: URL cannot be empty.`);
		return null;
	}

	return {
		name: name.trim(),
		type: validType,
		isArchive,
		url: url.trim(),
	};
}

/**
 * Parse all network configurations from environment variables.
 * Iterates VITE_CKB_NETWORK_0, _1, _2, etc. until not found.
 */
export function parseNetworks(): NetworkConfig[] {
	const networks: NetworkConfig[] = [];
	let index = 0;

	while (true) {
		const key = `VITE_CKB_NETWORK_${index}` as const;
		const value = import.meta.env[key];

		if (!value) {
			break;
		}

		const config = parseNetworkConfig(value, index);
		if (config) {
			networks.push(config);
		}

		index++;
	}

	return networks;
}

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
