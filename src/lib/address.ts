import { addressPayloadFromString } from '@ckb-ccc/core/advanced';
import { bech32m } from 'bech32';
import type { RpcScript } from '../types/rpc';
import type { NetworkType } from '../config/networks';

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
		throw new Error(`Unknown address format ${address.length > 20 ? address.substring(0, 20) + '...' : address}: ${message}`);
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

	// Short format - requires known script lookup.
	// For now, we'll return without a script and let the caller handle it.
	return {
		prefix,
		format: format as AddressFormat,
		isDeprecated: true,
	};
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
 * Convert a hex string to Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
	const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
	}
	return bytes;
}
