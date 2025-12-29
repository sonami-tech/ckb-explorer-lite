/**
 * Registry of known CKB scripts for auto-detection.
 * Code hashes and hash types are used to identify scripts.
 *
 * Source: ~/ckb-mcp/docs/api-reference/well-known-hashes.md
 */

import type { NetworkType } from '../config/networks';

/** Hash type values used in CKB scripts. */
export type HashType = 'type' | 'data' | 'data1' | 'data2';

export interface ScriptInfo {
	/** Human-readable name. */
	name: string;
	/** Short description of what this script does. */
	description: string;
	/** Expected hash type for this script. */
	hashType: HashType;
	/** URL to documentation (RFC or official docs). */
	sourceUrl?: string;
	/** Data format in cell data (for type scripts). */
	dataFormat?: 'sudt' | 'xudt' | 'dao' | 'spore' | 'dep_group';
	/** Args format (for lock scripts). */
	argsFormat?: 'pubkey_hash' | 'omnilock' | 'acp' | 'multisig';
	/** Base type name for args-specific scripts (e.g., "xUDT" for iCKB). */
	baseTypeName?: string;
}

// RFC URLs for documentation links.
const RFC_0024 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0024-ckb-genesis-script-list/0024-ckb-genesis-script-list.md';
const RFC_0025 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0025-simple-udt/0025-simple-udt.md';
const RFC_0026 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0026-anyone-can-pay/0026-anyone-can-pay.md';
const RFC_0042 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0042-omnilock/0042-omnilock.md';
const RFC_0052 = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0052-extensible-udt/0052-extensible-udt.md';
const SPORE_DOCS = 'https://docs.spore.pro/resources/contracts';
const ICKB_DOCS = 'https://github.com/ickb/v1-core';

// Internal type for the registry (mainnet and testnet only).
type RegistryNetwork = 'mainnet' | 'testnet';

/**
 * Known cell data formats by outpoint.
 * Used for cells without type scripts (e.g., genesis dep_group cells).
 * Key format: `${txHash}:${index}`
 */
export const KNOWN_CELL_FORMATS: Record<RegistryNetwork, Record<string, ScriptInfo['dataFormat']>> = {
	mainnet: {
		// Genesis dep_group cells (RFC 0024).
		'0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:0': 'dep_group',
		'0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c:1': 'dep_group',
		// Anyone-Can-Pay dep_group (RFC 0026).
		'0x4153a2014952d7cac45f285ce9a7c5c0c0e1b21f2d378b82ac1433cb11c25c4d:0': 'dep_group',
	},
	testnet: {
		// Testnet genesis dep_group cells.
		'0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37:0': 'dep_group',
		'0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37:1': 'dep_group',
		// Anyone-Can-Pay dep_group (RFC 0026).
		'0xec26b0f85ed839ece5f11c4c4e837ec359f5adc4420410f6453b1f6b60fb96a6:0': 'dep_group',
	},
};

/**
 * Known type script code hashes.
 * Maps code_hash -> ScriptInfo for mainnet and testnet.
 * Devnet uses testnet scripts.
 */
export const KNOWN_TYPE_SCRIPTS: Record<RegistryNetwork, Record<string, ScriptInfo>> = {
	mainnet: {
		// SUDT (Simple UDT) - RFC 0025.
		'0x5e7a36a77e68eecc013dfa2fe6a23f3b6c344b04005808694ae6dd45eea4cfd5': {
			name: 'SUDT',
			description: 'Simple UDT token standard for fungible tokens on CKB.',
			hashType: 'type',
			sourceUrl: RFC_0025,
			dataFormat: 'sudt',
		},
		// xUDT (Extensible UDT) - RFC 0052.
		'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'data1',
			sourceUrl: RFC_0052,
			dataFormat: 'xudt',
		},
		// NervosDAO - RFC 0024.
		'0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e': {
			name: 'NervosDAO',
			description: 'Native staking mechanism for CKB holders to earn rewards.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			dataFormat: 'dao',
		},
		// Spore - mainnet.
		'0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5': {
			name: 'Spore',
			description: 'On-chain digital object protocol for NFTs and content.',
			hashType: 'data1',
			sourceUrl: SPORE_DOCS,
			dataFormat: 'spore',
		},
	},
	testnet: {
		// SUDT (Simple UDT) - RFC 0025.
		'0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4': {
			name: 'SUDT',
			description: 'Simple UDT token standard for fungible tokens on CKB.',
			hashType: 'type',
			sourceUrl: RFC_0025,
			dataFormat: 'sudt',
		},
		// xUDT V1 (data1 hash type) - RFC 0052.
		'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'data1',
			sourceUrl: RFC_0052,
			dataFormat: 'xudt',
		},
		// xUDT V2 (type hash type, used by CCC SDK) - RFC 0052.
		'0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb': {
			name: 'xUDT',
			description: 'Extensible UDT with optional extension data for advanced token features.',
			hashType: 'type',
			sourceUrl: RFC_0052,
			dataFormat: 'xudt',
		},
		// NervosDAO - RFC 0024 (same as mainnet).
		'0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e': {
			name: 'NervosDAO',
			description: 'Native staking mechanism for CKB holders to earn rewards.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			dataFormat: 'dao',
		},
		// Spore - testnet.
		'0xbbad126377d45f90a8ee120da988a2d7332c78ba8fd679aab478a19d6c133494': {
			name: 'Spore',
			description: 'On-chain digital object protocol for NFTs and content.',
			hashType: 'data1',
			sourceUrl: SPORE_DOCS,
			dataFormat: 'spore',
		},
	},
};

/**
 * Known lock script code hashes.
 * Maps code_hash -> ScriptInfo for mainnet and testnet.
 * Devnet uses testnet scripts.
 */
export const KNOWN_LOCK_SCRIPTS: Record<RegistryNetwork, Record<string, ScriptInfo>> = {
	mainnet: {
		// SECP256K1/blake160 - RFC 0024.
		'0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8': {
			name: 'SECP256K1/blake160',
			description: 'Default lock script using secp256k1 signature verification.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			argsFormat: 'pubkey_hash',
		},
		// SECP256K1/blake160 Multisig - RFC 0024.
		'0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8': {
			name: 'Multisig',
			description: 'Multi-signature lock requiring M-of-N signatures to unlock.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			argsFormat: 'multisig',
		},
		// Omnilock (Mirana) - RFC 0042.
		'0x9b819793a64463aed77c615d6cb226eea5487ccfc0783043a587254cda2b6f26': {
			name: 'Omnilock',
			description: 'Universal lock supporting multiple authentication methods.',
			hashType: 'type',
			sourceUrl: RFC_0042,
			argsFormat: 'omnilock',
		},
		// Anyone-Can-Pay (Lina) - RFC 0026.
		'0xd369597ff47f29fbc0d47d2e3775370d1250b85140c670e4718af712983a2354': {
			name: 'Anyone-Can-Pay',
			description: 'Lock allowing anyone to add capacity or tokens to a cell.',
			hashType: 'type',
			sourceUrl: RFC_0026,
			argsFormat: 'acp',
		},
	},
	testnet: {
		// SECP256K1/blake160 - RFC 0024 (same as mainnet).
		'0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8': {
			name: 'SECP256K1/blake160',
			description: 'Default lock script using secp256k1 signature verification.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			argsFormat: 'pubkey_hash',
		},
		// SECP256K1/blake160 Multisig - RFC 0024 (same as mainnet).
		'0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8': {
			name: 'Multisig',
			description: 'Multi-signature lock requiring M-of-N signatures to unlock.',
			hashType: 'type',
			sourceUrl: RFC_0024,
			argsFormat: 'multisig',
		},
		// Omnilock (Pudge) - RFC 0042.
		'0xf329effd1c475a2978453c8600e1eaf0bc2087ee093c3ee64cc96ec6847752cb': {
			name: 'Omnilock',
			description: 'Universal lock supporting multiple authentication methods.',
			hashType: 'type',
			sourceUrl: RFC_0042,
			argsFormat: 'omnilock',
		},
		// Anyone-Can-Pay (Aggron) - RFC 0026.
		'0x3419a1c09eb2567f6552ee7a8ecffd64155cffe0f1796e6e61ec088d740c1356': {
			name: 'Anyone-Can-Pay',
			description: 'Lock allowing anyone to add capacity or tokens to a cell.',
			hashType: 'type',
			sourceUrl: RFC_0026,
			argsFormat: 'acp',
		},
	},
};

/**
 * Build a key for args-specific script lookup.
 */
function buildArgsKey(codeHash: string, hashType: string, args: string): string {
	return `${codeHash}:${hashType}:${args}`;
}

/**
 * Known type scripts that require args matching (specific tokens).
 * Keyed by `${codeHash}:${hashType}:${args}`.
 */
export const KNOWN_TYPE_SCRIPTS_BY_ARGS: Record<RegistryNetwork, Record<string, ScriptInfo>> = {
	mainnet: {
		// iCKB - liquid staking token wrapping NervosDAO deposits.
		// Args: iCKB Logic Script Hash + owner mode flag (0x80000000 LE).
		[buildArgsKey(
			'0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
			'data1',
			'0xb73b6ab39d79390c6de90a09c96b290c331baf1798ed6f97aed02590929734e800000080',
		)]: {
			name: 'iCKB',
			description: 'iCKB liquid staking token (xUDT).',
			hashType: 'data1',
			sourceUrl: ICKB_DOCS,
			dataFormat: 'xudt',
			baseTypeName: 'xUDT',
		},
	},
	testnet: {
		// Add testnet-specific tokens here.
	},
};

/**
 * Known lock scripts that require args matching.
 * Keyed by `${codeHash}:${hashType}:${args}`.
 */
export const KNOWN_LOCK_SCRIPTS_BY_ARGS: Record<RegistryNetwork, Record<string, ScriptInfo>> = {
	mainnet: {
		// Add mainnet-specific locks here.
	},
	testnet: {
		// Add testnet-specific locks here.
	},
};

/**
 * Map network type to registry network.
 * Devnet uses testnet scripts.
 */
function toRegistryNetwork(network: NetworkType): RegistryNetwork {
	return network === 'mainnet' ? 'mainnet' : 'testnet';
}

/**
 * Look up a type script by its code hash, hash type, and optionally args.
 * Checks args-specific scripts first, then falls back to generic.
 */
export function lookupTypeScript(
	codeHash: string,
	hashType: string,
	network: NetworkType,
	args?: string,
): ScriptInfo | null {
	const registryNetwork = toRegistryNetwork(network);

	// Check args-specific registry first.
	if (args) {
		const argsKey = buildArgsKey(codeHash, hashType, args);
		const argsInfo = KNOWN_TYPE_SCRIPTS_BY_ARGS[registryNetwork][argsKey];
		if (argsInfo) {
			return argsInfo;
		}
	}

	// Fall back to generic registry.
	const info = KNOWN_TYPE_SCRIPTS[registryNetwork][codeHash];
	if (info && info.hashType === hashType) {
		return info;
	}
	return null;
}

/**
 * Look up a lock script by its code hash, hash type, and optionally args.
 * Checks args-specific scripts first, then falls back to generic.
 */
export function lookupLockScript(
	codeHash: string,
	hashType: string,
	network: NetworkType,
	args?: string,
): ScriptInfo | null {
	const registryNetwork = toRegistryNetwork(network);

	// Check args-specific registry first.
	if (args) {
		const argsKey = buildArgsKey(codeHash, hashType, args);
		const argsInfo = KNOWN_LOCK_SCRIPTS_BY_ARGS[registryNetwork][argsKey];
		if (argsInfo) {
			return argsInfo;
		}
	}

	// Fall back to generic registry.
	const info = KNOWN_LOCK_SCRIPTS[registryNetwork][codeHash];
	if (info && info.hashType === hashType) {
		return info;
	}
	return null;
}

/**
 * Look up cell data format by outpoint.
 * Used for cells without type scripts (e.g., genesis dep_group cells).
 */
export function lookupCellFormat(
	txHash: string,
	index: number,
	network: NetworkType,
): ScriptInfo['dataFormat'] | null {
	const registryNetwork = toRegistryNetwork(network);
	const key = `${txHash}:${index}`;
	return KNOWN_CELL_FORMATS[registryNetwork][key] ?? null;
}
