import { addressPayloadFromString } from '@ckb-ccc/core/advanced';
import type { RpcScript } from '../types/rpc';

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
	let payload: Uint8Array;

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
		// Full format: payload = codeHash (32 bytes) + hashType (1 byte) + args
		if (payload.length < 33) {
			throw new Error('Invalid full address payload length.');
		}

		const codeHash = '0x' + payload.slice(0, 32).map(b => b.toString(16).padStart(2, '0')).join('');
		const hashTypeByte = payload[32];
		const hashType = HASH_TYPE_MAP[hashTypeByte];
		if (!hashType) {
			throw new Error(`Unknown hash type: ${hashTypeByte}`);
		}
		const args = '0x' + payload.slice(33).map(b => b.toString(16).padStart(2, '0')).join('');

		return {
			prefix,
			format,
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

		const codeHash = '0x' + payload.slice(0, 32).map(b => b.toString(16).padStart(2, '0')).join('');
		const hashType: RpcScript['hash_type'] = format === AddressFormat.FullData ? 'data' : 'type';
		const args = '0x' + payload.slice(32).map(b => b.toString(16).padStart(2, '0')).join('');

		return {
			prefix,
			format,
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
		format,
		isDeprecated: true,
	};
}

/**
 * Get network name from address prefix.
 */
export function getNetworkFromPrefix(prefix: string): 'Mainnet' | 'Testnet' {
	return prefix === 'ckb' ? 'Mainnet' : 'Testnet';
}
