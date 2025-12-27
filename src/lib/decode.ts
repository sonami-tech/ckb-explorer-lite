/**
 * Cell data and args decoding utilities.
 * Provides parsing for common CKB data formats.
 */

import type { NetworkType } from '../config/networks';
import type { ScriptInfo } from './knownScripts';
import { lookupTypeScript } from './knownScripts';

/**
 * Decoded SUDT data.
 */
export interface SudtData {
	type: 'sudt';
	/** Token amount as bigint. */
	amount: bigint;
}

/**
 * Decoded xUDT data.
 */
export interface XudtData {
	type: 'xudt';
	/** Token amount as bigint. */
	amount: bigint;
	/** Extension data (hex string). */
	extensionData: string;
}

/**
 * Decoded NervosDAO data.
 */
export interface DaoData {
	type: 'dao';
	/** Phase of the DAO operation. */
	phase: 'deposit' | 'withdraw';
	/** Block number when withdraw was initiated (only for withdraw phase). */
	withdrawBlockNumber?: bigint;
}

/**
 * Decoded DEP_GROUP data - a list of OutPoints.
 */
export interface DepGroupData {
	type: 'dep_group';
	/** List of outpoints in the dependency group. */
	outpoints: Array<{
		txHash: string;
		index: number;
	}>;
}

/**
 * Raw hex data (no decoding applied).
 */
export interface RawData {
	type: 'raw';
	/** Original hex string. */
	hex: string;
}

/**
 * Union of all decoded data types.
 */
export type DecodedData = SudtData | XudtData | DaoData | DepGroupData | RawData;

/**
 * Convert hex string to byte array.
 */
function hexToBytes(hex: string): Uint8Array {
	const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

/**
 * Read uint128 little-endian from bytes.
 */
function readUint128LE(bytes: Uint8Array, offset: number = 0): bigint {
	let result = 0n;
	for (let i = 0; i < 16; i++) {
		result |= BigInt(bytes[offset + i]) << BigInt(i * 8);
	}
	return result;
}

/**
 * Read uint64 little-endian from bytes.
 */
function readUint64LE(bytes: Uint8Array, offset: number = 0): bigint {
	let result = 0n;
	for (let i = 0; i < 8; i++) {
		result |= BigInt(bytes[offset + i]) << BigInt(i * 8);
	}
	return result;
}

/**
 * Read uint32 little-endian from bytes.
 */
function readUint32LE(bytes: Uint8Array, offset: number = 0): number {
	return (
		bytes[offset] |
		(bytes[offset + 1] << 8) |
		(bytes[offset + 2] << 16) |
		(bytes[offset + 3] << 24)
	) >>> 0;
}

/**
 * Decode SUDT cell data.
 * Format: 16 bytes uint128 LE = token amount.
 */
export function decodeSudt(data: string): SudtData | null {
	const bytes = hexToBytes(data);
	if (bytes.length < 16) return null;

	return {
		type: 'sudt',
		amount: readUint128LE(bytes),
	};
}

/**
 * Decode xUDT cell data.
 * Format: 16 bytes uint128 LE amount + optional extension data.
 */
export function decodeXudt(data: string): XudtData | null {
	const bytes = hexToBytes(data);
	if (bytes.length < 16) return null;

	const amount = readUint128LE(bytes);
	const extensionData = bytes.length > 16
		? '0x' + Array.from(bytes.slice(16)).map(b => b.toString(16).padStart(2, '0')).join('')
		: '0x';

	return {
		type: 'xudt',
		amount,
		extensionData,
	};
}

/**
 * Decode NervosDAO cell data.
 * Format: 8 bytes.
 * - All zeros = deposit phase.
 * - Non-zero = withdraw phase, value is block number when withdraw initiated.
 */
export function decodeDao(data: string): DaoData | null {
	const bytes = hexToBytes(data);
	if (bytes.length !== 8) return null;

	// Check if all zeros.
	const isAllZeros = bytes.every(b => b === 0);

	if (isAllZeros) {
		return {
			type: 'dao',
			phase: 'deposit',
		};
	}

	return {
		type: 'dao',
		phase: 'withdraw',
		withdrawBlockNumber: readUint64LE(bytes),
	};
}

/**
 * Decode DEP_GROUP cell data.
 * Format: Molecule vector of OutPoints.
 * - First 4 bytes: total byte length (uint32 LE).
 * - Followed by OutPoint items (36 bytes each: 32-byte tx_hash + 4-byte index).
 *
 * Note: Molecule vectors have a 4-byte length header, then items directly.
 * OutPointVec is a fixed-size vector, so no offset table.
 */
export function decodeDepGroup(data: string): DepGroupData | null {
	const bytes = hexToBytes(data);

	// Minimum: 4 bytes header.
	if (bytes.length < 4) return null;

	// Read total byte length.
	const totalLength = readUint32LE(bytes, 0);

	// Validate length matches.
	if (totalLength !== bytes.length) return null;

	// Calculate number of OutPoints.
	// Each OutPoint is 36 bytes (32 tx_hash + 4 index).
	const dataLength = bytes.length - 4;
	if (dataLength % 36 !== 0) return null;

	const count = dataLength / 36;
	const outpoints: DepGroupData['outpoints'] = [];

	for (let i = 0; i < count; i++) {
		const offset = 4 + i * 36;

		// Read tx_hash (32 bytes).
		const txHashBytes = bytes.slice(offset, offset + 32);
		const txHash = '0x' + Array.from(txHashBytes).map(b => b.toString(16).padStart(2, '0')).join('');

		// Read index (4 bytes, uint32 LE).
		const index = readUint32LE(bytes, offset + 32);

		outpoints.push({ txHash, index });
	}

	return {
		type: 'dep_group',
		outpoints,
	};
}

/**
 * Auto-detect and decode cell data based on type script.
 */
export function decodeData(
	data: string,
	typeScript: { code_hash: string; hash_type: string; args: string } | null,
	network: NetworkType,
): DecodedData {
	// Empty data.
	if (data === '0x') {
		return { type: 'raw', hex: data };
	}

	// Try auto-detection based on type script.
	if (typeScript) {
		const scriptInfo = lookupTypeScript(typeScript.code_hash, typeScript.hash_type, network, typeScript.args);
		if (scriptInfo) {
			return decodeByFormat(data, scriptInfo.dataFormat);
		}
	}

	// Default to raw.
	return { type: 'raw', hex: data };
}

/**
 * Decode data by explicit format.
 */
export function decodeByFormat(
	data: string,
	format: ScriptInfo['dataFormat'] | 'dep_group' | undefined,
): DecodedData {
	if (!format) {
		return { type: 'raw', hex: data };
	}

	switch (format) {
		case 'sudt': {
			const decoded = decodeSudt(data);
			return decoded ?? { type: 'raw', hex: data };
		}
		case 'xudt': {
			const decoded = decodeXudt(data);
			return decoded ?? { type: 'raw', hex: data };
		}
		case 'dao': {
			const decoded = decodeDao(data);
			return decoded ?? { type: 'raw', hex: data };
		}
		case 'dep_group': {
			const decoded = decodeDepGroup(data);
			return decoded ?? { type: 'raw', hex: data };
		}
		case 'spore':
			// Spore decoding is complex (Molecule structure).
			// For now, return raw.
			return { type: 'raw', hex: data };
		default:
			return { type: 'raw', hex: data };
	}
}

/**
 * Format token amount as raw value with locale formatting.
 * @param amount - Raw token amount.
 */
export function formatRawAmount(amount: bigint): string {
	return amount.toLocaleString();
}

/**
 * Format token amount with decimals.
 * @param amount - Raw token amount.
 * @param decimals - Number of decimal places.
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
	if (decimals === 0) {
		return amount.toLocaleString();
	}

	const divisor = 10n ** BigInt(decimals);
	const integerPart = amount / divisor;
	const fractionalPart = amount % divisor;

	if (fractionalPart === 0n) {
		return integerPart.toLocaleString();
	}

	// Pad fractional part with leading zeros.
	const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
	// Trim trailing zeros.
	const trimmed = fractionalStr.replace(/0+$/, '');

	return `${integerPart.toLocaleString()}.${trimmed}`;
}
