import { addressPayloadFromString } from '@ckb-ccc/core/advanced';
import { bech32, bech32m } from 'bech32';
import type { RpcScript } from '../types/rpc';
import type { NetworkType } from '../config/networks';
import { hexToBytes } from './bytes';

/**
 * Short format code_hash_index to code_hash mapping per RFC 0021.
 * Only these three lock scripts support the deprecated short address format.
 */
const SHORT_FORMAT_SCRIPTS = {
	/** SECP256K1/blake160 - same for mainnet and testnet. */
	secp256k1: {
		index: 0x00,
		codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
		hashType: 'type' as const,
	},
	/** Multisig - same for mainnet and testnet. */
	multisig: {
		index: 0x01,
		codeHash: '0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8',
		hashType: 'type' as const,
	},
	/** Anyone-Can-Pay - differs between mainnet and testnet. */
	acp: {
		index: 0x02,
		mainnet: '0xd369597ff47f29fbc0d47d2e3775370d1250b85140c670e4718af712983a2354',
		testnet: '0x3419a1c09eb2567f6552ee7a8ecffd64155cffe0f1796e6e61ec088d740c1356',
		hashType: 'type' as const,
	},
} as const;

/**
 * Address format types.
 */
export const AddressFormat = {
	Full: 0x00,
	Short: 0x01,
	FullData: 0x02,
	FullType: 0x04,
} as const;

export type AddressFormat = (typeof AddressFormat)[keyof typeof AddressFormat];

/**
 * Hash type mapping from bytes.
 */
const HASH_TYPE_MAP: Record<number, RpcScript['hash_type']> = {
	0x00: 'data',
	0x01: 'type',
	0x02: 'data1',
	0x04: 'data2',
};

/**
 * Parse a CKB address and extract the lock script.
 * Supports full format addresses. Short format addresses require known script lookup.
 */
export function parseAddress(address: string): {
	prefix: string;
	format: AddressFormat;
	script?: RpcScript;
	isDeprecated: boolean;
} {
	let prefix: string;
	let format: number;
	let payload: number[];

	try {
		const result = addressPayloadFromString(address);
		prefix = result.prefix;
		format = result.format;
		payload = result.payload;
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Invalid encoding';
		throw new Error(`Invalid address: ${message}`);
	}

	const isDeprecated = format !== AddressFormat.Full;

	if (format === AddressFormat.Full) {
		// Full format: payload = codeHash (32 bytes) + hashType (1 byte) + args.
		if (payload.length < 33) {
			throw new Error('Invalid full address payload length.');
		}

		const codeHash = '0x' + payload.slice(0, 32).map((b: number) => b.toString(16).padStart(2, '0')).join('');
		const hashTypeByte = payload[32];
		const hashType = HASH_TYPE_MAP[hashTypeByte];
		if (!hashType) {
			throw new Error(`Unknown hash type: ${hashTypeByte}`);
		}
		const args = '0x' + payload.slice(33).map((b: number) => b.toString(16).padStart(2, '0')).join('');

		return {
			prefix,
			format: format as AddressFormat,
			script: {
				code_hash: codeHash,
				hash_type: hashType,
				args,
			},
			isDeprecated,
		};
	}

	if (format === AddressFormat.FullData || format === AddressFormat.FullType) {
		// Deprecated full data/type format.
		if (payload.length < 32) {
			throw new Error('Invalid full data/type address payload length.');
		}

		const codeHash = '0x' + payload.slice(0, 32).map((b: number) => b.toString(16).padStart(2, '0')).join('');
		const hashType: RpcScript['hash_type'] = format === AddressFormat.FullData ? 'data' : 'type';
		const args = '0x' + payload.slice(32).map((b: number) => b.toString(16).padStart(2, '0')).join('');

		return {
			prefix,
			format: format as AddressFormat,
			script: {
				code_hash: codeHash,
				hash_type: hashType,
				args,
			},
			isDeprecated,
		};
	}

	// Short format: payload = [code_hash_index (1 byte), ...args (20 bytes)]
	// Per RFC 0021, args is always 20 bytes in short format.
	// Standard short format: 21 bytes (1 byte index + 20 bytes args)
	// Legacy short format: 20 bytes (assumes SECP256K1, args only)
	if (format === AddressFormat.Short) {
		if (payload.length < 20) {
			throw new Error('Invalid short address payload length.');
		}

		const networkType = prefix === 'ckb' ? 'mainnet' : 'testnet';
		let codeHash: string;
		let hashType: RpcScript['hash_type'] = 'type';
		let args: string;

		if (payload.length === 20) {
			// Legacy format: 20 bytes args only, assumes SECP256K1.
			codeHash = SHORT_FORMAT_SCRIPTS.secp256k1.codeHash;
			args = '0x' + payload.map((b: number) => b.toString(16).padStart(2, '0')).join('');
		} else {
			// Standard format: code_hash_index + 20 bytes args.
			const codeHashIndex = payload[0];
			args = '0x' + payload.slice(1).map((b: number) => b.toString(16).padStart(2, '0')).join('');

			if (codeHashIndex === SHORT_FORMAT_SCRIPTS.secp256k1.index) {
				codeHash = SHORT_FORMAT_SCRIPTS.secp256k1.codeHash;
			} else if (codeHashIndex === SHORT_FORMAT_SCRIPTS.multisig.index) {
				codeHash = SHORT_FORMAT_SCRIPTS.multisig.codeHash;
			} else if (codeHashIndex === SHORT_FORMAT_SCRIPTS.acp.index) {
				codeHash = networkType === 'mainnet'
					? SHORT_FORMAT_SCRIPTS.acp.mainnet
					: SHORT_FORMAT_SCRIPTS.acp.testnet;
			} else {
				throw new Error(`Unknown short format code_hash_index: 0x${codeHashIndex.toString(16)}`);
			}
		}

		return {
			prefix,
			format: format as AddressFormat,
			script: {
				code_hash: codeHash,
				hash_type: hashType,
				args,
			},
			isDeprecated: true,
		};
	}

	// Unknown format.
	throw new Error(`Unknown address format: 0x${format.toString(16)}`);
}

/**
 * Get network name from address prefix.
 */
export function getNetworkFromPrefix(prefix: string): 'Mainnet' | 'Testnet' {
	return prefix === 'ckb' ? 'Mainnet' : 'Testnet';
}

/**
 * Get address prefix from network type.
 */
export function getAddressPrefix(networkType: NetworkType): string {
	return networkType === 'mainnet' ? 'ckb' : 'ckt';
}

/**
 * Encode a lock script to a CKB address.
 * Uses the full address format (bech32m encoding).
 */
export function encodeAddress(script: RpcScript, networkType: NetworkType): string {
	const prefix = getAddressPrefix(networkType);

	// Build payload: format byte + code_hash + hash_type byte + args.
	const codeHashBytes = hexToBytes(script.code_hash);
	const hashTypeByte = hashTypeToByte(script.hash_type);
	const argsBytes = hexToBytes(script.args);

	// Full format: 0x00 prefix.
	const payload = new Uint8Array(1 + 32 + 1 + argsBytes.length);
	payload[0] = AddressFormat.Full;
	payload.set(codeHashBytes, 1);
	payload[33] = hashTypeByte;
	payload.set(argsBytes, 34);

	return bech32m.encode(prefix, bech32m.toWords(payload), 1023);
}

/**
 * Convert a hash_type string to its byte value.
 */
function hashTypeToByte(hashType: RpcScript['hash_type']): number {
	switch (hashType) {
		case 'data': return 0x00;
		case 'type': return 0x01;
		case 'data1': return 0x02;
		case 'data2': return 0x04;
		default: return 0x00;
	}
}

/**
 * Get the short format code_hash_index for a script, if it supports short format.
 * Returns null if the script doesn't support short format.
 */
function getShortFormatIndex(script: RpcScript, networkType: NetworkType): number | null {
	const codeHash = script.code_hash.toLowerCase();
	const hashType = script.hash_type;

	// All short format scripts use hash_type: type
	if (hashType !== 'type') {
		return null;
	}

	// Check SECP256K1/blake160
	if (codeHash === SHORT_FORMAT_SCRIPTS.secp256k1.codeHash) {
		return SHORT_FORMAT_SCRIPTS.secp256k1.index;
	}

	// Check Multisig
	if (codeHash === SHORT_FORMAT_SCRIPTS.multisig.codeHash) {
		return SHORT_FORMAT_SCRIPTS.multisig.index;
	}

	// Check ACP (network-specific)
	const acpCodeHash = networkType === 'mainnet'
		? SHORT_FORMAT_SCRIPTS.acp.mainnet
		: SHORT_FORMAT_SCRIPTS.acp.testnet;
	if (codeHash === acpCodeHash) {
		return SHORT_FORMAT_SCRIPTS.acp.index;
	}

	return null;
}

/**
 * Encode a lock script to a CKB2019 short format address.
 * Returns null if the script doesn't support short format.
 *
 * Short format: bech32 encoding with payload = [0x01, code_hash_index, ...args]
 * Only supported for SECP256K1/blake160, Multisig, and ACP locks.
 */
export function encodeShortAddress(script: RpcScript, networkType: NetworkType): string | null {
	const index = getShortFormatIndex(script, networkType);
	if (index === null) {
		return null;
	}

	const prefix = getAddressPrefix(networkType);
	const argsBytes = hexToBytes(script.args);

	// Short format payload: format byte (0x01) + code_hash_index + args
	const payload = new Uint8Array(2 + argsBytes.length);
	payload[0] = AddressFormat.Short;
	payload[1] = index;
	payload.set(argsBytes, 2);

	// Use bech32 (not bech32m) for CKB2019 format
	return bech32.encode(prefix, bech32.toWords(payload), 1023);
}

/**
 * Get the alternate format address for a given address.
 *
 * - If viewing a CKB2019 address: returns the CKB2021 (full format) equivalent
 * - If viewing a CKB2021 address with a standard lock: returns the CKB2019 (short format) equivalent
 * - If viewing a CKB2021 address with non-standard lock: returns null (no short format exists)
 *
 * @param address - The original address string
 * @param script - The parsed lock script (required for encoding)
 * @param networkType - The network type for encoding
 * @returns Object with alternateAddress and format label, or null if no alternate exists
 */
export function getAlternateAddress(
	address: string,
	script: RpcScript,
	networkType: NetworkType,
): { address: string; formatLabel: string } | null {
	const parsed = parseAddress(address);

	if (parsed.isDeprecated) {
		// Viewing CKB2019 address - return CKB2021 equivalent
		return {
			address: encodeAddress(script, networkType),
			formatLabel: 'CKB2021',
		};
	} else {
		// Viewing CKB2021 address - try to return CKB2019 short format
		const shortAddress = encodeShortAddress(script, networkType);
		if (shortAddress) {
			return {
				address: shortAddress,
				formatLabel: 'CKB2019',
			};
		}
		return null;
	}
}

/**
 * Get a human-readable format description for an address format.
 */
export function getFormatDescription(format: AddressFormat): string {
	switch (format) {
		case AddressFormat.Full:
			return 'CKB2021 (Full)';
		case AddressFormat.Short:
			return 'CKB2019 (Short)';
		case AddressFormat.FullData:
			return 'CKB2019 (Full Data)';
		case AddressFormat.FullType:
			return 'CKB2019 (Full Type)';
		default:
			return 'Unknown';
	}
}
