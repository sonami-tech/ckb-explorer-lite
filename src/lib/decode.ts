/**
 * Cell data and args decoding utilities.
 * Provides parsing for common CKB data formats.
 */

import type { NetworkType } from '../config/networks';
import type { ScriptInfo } from './wellKnown';
import { lookupTypeScript } from './wellKnown';

/**
 * Decoded UDT data (covers both SUDT and xUDT formats).
 * Both formats use identical binary structure: 16-byte uint128 LE amount + optional extra data.
 */
export interface UdtData {
	type: 'udt';
	/** Token amount as bigint. */
	amount: bigint;
	/** Extra data beyond the 16-byte amount (hex string). */
	extraData: string;
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
 * Decode error (data doesn't match expected format).
 */
export interface ErrorData {
	type: 'error';
	/** Error message explaining the problem. */
	message: string;
	/** Original hex string for reference. */
	hex: string;
}

/**
 * Decoded integer data.
 */
export interface IntegerData {
	type: 'integer';
	/** Integer format used. */
	format: 'uint32' | 'uint64' | 'int64' | 'uint128';
	/** Decoded value. */
	value: bigint;
	/** Extra data beyond the integer (hex string). */
	extraData: string;
}

/**
 * Decoded text data (ASCII or UTF-8).
 */
export interface TextData {
	type: 'text';
	/** Text encoding used. */
	encoding: 'ascii' | 'utf8';
	/** Decoded and sanitized text (safe for display). */
	text: string;
	/** Whether the data contained non-displayable characters. */
	hasBinaryChars: boolean;
}

/**
 * Union of all decoded data types.
 */
export type DecodedData = UdtData | DaoData | DepGroupData | IntegerData | TextData | ErrorData | RawData;

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
 * Decode UDT cell data (covers both SUDT and xUDT).
 * Format: 16 bytes uint128 LE = token amount, optional extra data.
 */
export function decodeUdt(data: string): UdtData | null {
	const bytes = hexToBytes(data);
	if (bytes.length < 16) return null;

	const amount = readUint128LE(bytes);
	const extraData = bytes.length > 16
		? '0x' + Array.from(bytes.slice(16)).map(b => b.toString(16).padStart(2, '0')).join('')
		: '0x';

	return {
		type: 'udt',
		amount,
		extraData,
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
 * Format: Molecule FixVec of OutPoints.
 * - First 4 bytes: item count (uint32 LE).
 * - Followed by OutPoint items (36 bytes each: 32-byte tx_hash + 4-byte index).
 *
 * Note: Molecule FixVec has item count header, not byte length.
 * OutPointVec contains fixed-size OutPoint structs (36 bytes each).
 */
export function decodeDepGroup(data: string): DepGroupData | null {
	const bytes = hexToBytes(data);

	// Minimum: 4 bytes header.
	if (bytes.length < 4) return null;

	// Read item count.
	const count = readUint32LE(bytes, 0);

	// Validate data length matches expected size.
	// Each OutPoint is 36 bytes (32 tx_hash + 4 index).
	const expectedLength = 4 + count * 36;
	if (bytes.length !== expectedLength) return null;

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
 * Convert bytes to hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
	if (bytes.length === 0) return '0x';
	return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Read int64 little-endian from bytes (signed).
 */
function readInt64LE(bytes: Uint8Array, offset: number = 0): bigint {
	const unsigned = readUint64LE(bytes, offset);
	// Check sign bit (bit 63).
	const signBit = 1n << 63n;
	if (unsigned >= signBit) {
		// Negative: convert from two's complement.
		return unsigned - (1n << 64n);
	}
	return unsigned;
}

// ============================================
// Integer Decoders
// ============================================

/**
 * Decode data as uint32 (4 bytes, little-endian, unsigned).
 */
export function decodeUint32(data: string): IntegerData | null {
	const bytes = hexToBytes(data);
	if (bytes.length < 4) return null;

	const value = BigInt(readUint32LE(bytes, 0));
	const extraData = bytesToHex(bytes.slice(4));

	return {
		type: 'integer',
		format: 'uint32',
		value,
		extraData,
	};
}

/**
 * Decode data as uint64 (8 bytes, little-endian, unsigned).
 */
export function decodeUint64(data: string): IntegerData | null {
	const bytes = hexToBytes(data);
	if (bytes.length < 8) return null;

	const value = readUint64LE(bytes, 0);
	const extraData = bytesToHex(bytes.slice(8));

	return {
		type: 'integer',
		format: 'uint64',
		value,
		extraData,
	};
}

/**
 * Decode data as int64 (8 bytes, little-endian, signed).
 */
export function decodeInt64(data: string): IntegerData | null {
	const bytes = hexToBytes(data);
	if (bytes.length < 8) return null;

	const value = readInt64LE(bytes, 0);
	const extraData = bytesToHex(bytes.slice(8));

	return {
		type: 'integer',
		format: 'int64',
		value,
		extraData,
	};
}

/**
 * Decode data as uint128 (16 bytes, little-endian, unsigned).
 */
export function decodeUint128(data: string): IntegerData | null {
	const bytes = hexToBytes(data);
	if (bytes.length < 16) return null;

	const value = readUint128LE(bytes, 0);
	const extraData = bytesToHex(bytes.slice(16));

	return {
		type: 'integer',
		format: 'uint128',
		value,
		extraData,
	};
}

// ============================================
// Text Decoders
// ============================================

/**
 * Escape HTML special characters for safe display.
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Check if byte is a printable ASCII character (0x20-0x7E) or safe whitespace.
 * Safe whitespace: tab (0x09), newline (0x0A), carriage return (0x0D).
 */
function isPrintableAscii(byte: number): boolean {
	return (byte >= 0x20 && byte <= 0x7E) || byte === 0x09 || byte === 0x0A || byte === 0x0D;
}

/**
 * Decode data as ASCII text.
 * Non-printable characters are replaced with placeholder [XX].
 */
export function decodeAscii(data: string): TextData {
	const bytes = hexToBytes(data);
	let result = '';
	let hasBinaryChars = false;

	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i];
		if (isPrintableAscii(byte)) {
			result += String.fromCharCode(byte);
		} else {
			result += `[${byte.toString(16).padStart(2, '0').toUpperCase()}]`;
			hasBinaryChars = true;
		}
	}

	return {
		type: 'text',
		encoding: 'ascii',
		text: escapeHtml(result),
		hasBinaryChars,
	};
}

/**
 * Decode data as UTF-8 text.
 * Invalid sequences are replaced with placeholder [XX].
 */
export function decodeUtf8(data: string): TextData {
	const bytes = hexToBytes(data);
	let hasBinaryChars = false;

	// Use TextDecoder for proper UTF-8 handling.
	const decoder = new TextDecoder('utf-8', { fatal: false });
	const text = decoder.decode(bytes);

	// Replace control characters (except safe whitespace) with placeholders.
	// Control chars: 0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F.
	let result = '';
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		// Check for replacement character (indicates decode error).
		if (code === 0xFFFD) {
			result += '[??]';
			hasBinaryChars = true;
		} else if (
			(code >= 0x00 && code <= 0x08) ||
			code === 0x0B ||
			code === 0x0C ||
			(code >= 0x0E && code <= 0x1F) ||
			code === 0x7F
		) {
			result += `[${code.toString(16).padStart(2, '0').toUpperCase()}]`;
			hasBinaryChars = true;
		} else {
			result += text[i];
		}
	}

	return {
		type: 'text',
		encoding: 'utf8',
		text: escapeHtml(result),
		hasBinaryChars,
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

/** Integer format type for decodeByFormat. */
export type IntegerFormat = 'uint32' | 'uint64' | 'int64' | 'uint128';

/** Text format type for decodeByFormat. */
export type TextFormat = 'ascii' | 'utf8';

/** All supported decode formats. */
export type DecodeFormat = ScriptInfo['dataFormat'] | 'dep_group' | IntegerFormat | TextFormat;

/**
 * Get byte count from hex string.
 */
function getByteCount(data: string): number {
	return (data.length - 2) / 2;
}

/**
 * Decode data by explicit format.
 * Returns ErrorData with message if data is too short for the format.
 */
export function decodeByFormat(
	data: string,
	format: DecodeFormat | undefined,
): DecodedData {
	if (!format) {
		return { type: 'raw', hex: data };
	}

	const byteCount = getByteCount(data);

	switch (format) {
		case 'udt':
		case 'sudt':
		case 'xudt': {
			// All UDT formats (sudt, xudt) use the same decoder.
			const decoded = decodeUdt(data);
			if (!decoded) {
				return {
					type: 'error',
					message: `UDT requires at least 16 bytes (${byteCount} provided)`,
					hex: data,
				};
			}
			return decoded;
		}
		case 'dao': {
			const decoded = decodeDao(data);
			if (!decoded) {
				return {
					type: 'error',
					message: `DAO requires exactly 8 bytes (${byteCount} provided)`,
					hex: data,
				};
			}
			return decoded;
		}
		case 'dep_group': {
			const decoded = decodeDepGroup(data);
			if (!decoded) {
				return {
					type: 'error',
					message: `Invalid Dep Group format (${byteCount} bytes)`,
					hex: data,
				};
			}
			return decoded;
		}
		case 'uint32': {
			const decoded = decodeUint32(data);
			if (!decoded) {
				return {
					type: 'error',
					message: `uint32 requires at least 4 bytes (${byteCount} provided)`,
					hex: data,
				};
			}
			return decoded;
		}
		case 'uint64': {
			const decoded = decodeUint64(data);
			if (!decoded) {
				return {
					type: 'error',
					message: `uint64 requires at least 8 bytes (${byteCount} provided)`,
					hex: data,
				};
			}
			return decoded;
		}
		case 'int64': {
			const decoded = decodeInt64(data);
			if (!decoded) {
				return {
					type: 'error',
					message: `int64 requires at least 8 bytes (${byteCount} provided)`,
					hex: data,
				};
			}
			return decoded;
		}
		case 'uint128': {
			const decoded = decodeUint128(data);
			if (!decoded) {
				return {
					type: 'error',
					message: `uint128 requires at least 16 bytes (${byteCount} provided)`,
					hex: data,
				};
			}
			return decoded;
		}
		case 'ascii':
			return decodeAscii(data);
		case 'utf8':
			return decodeUtf8(data);
		case 'spore':
			// Spore decoding is complex (Molecule structure).
			// For now, return raw.
			return { type: 'raw', hex: data };
		default:
			return { type: 'raw', hex: data };
	}
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

// ============================================
// Witness Decoding
// ============================================

/**
 * Parsed WitnessArgs structure.
 * All fields are optional (BytesOpt in Molecule).
 */
export interface WitnessArgsData {
	type: 'witnessArgs';
	/** Lock field (usually signature). */
	lock: string | null;
	/** Input type field. */
	inputType: string | null;
	/** Output type field. */
	outputType: string | null;
}

/**
 * Parsed SECP256K1 signature.
 */
export interface SignatureData {
	type: 'signature';
	/** R value (32 bytes). */
	r: string;
	/** S value (32 bytes). */
	s: string;
	/** Recovery ID (1 byte). */
	v: number;
}

/**
 * Decode WitnessArgs from Molecule-serialized bytes.
 *
 * WitnessArgs is a Molecule table with 3 optional fields:
 * - lock: BytesOpt
 * - input_type: BytesOpt
 * - output_type: BytesOpt
 *
 * Molecule table layout:
 * - 4 bytes: total size
 * - 4 bytes per field: offset to field data
 * - Field data: 4 bytes size + content (for Bytes), or empty (for None)
 */
export function decodeWitnessArgs(data: string): WitnessArgsData | null {
	const bytes = hexToBytes(data);

	// Minimum size: 4 (total) + 4*3 (offsets) = 16 bytes.
	if (bytes.length < 16) return null;

	// Read total size.
	const totalSize = readUint32LE(bytes, 0);
	if (totalSize !== bytes.length) return null;

	// Read field offsets.
	const lockOffset = readUint32LE(bytes, 4);
	const inputTypeOffset = readUint32LE(bytes, 8);
	const outputTypeOffset = readUint32LE(bytes, 12);

	// Validate offsets are in order and within bounds.
	if (lockOffset > inputTypeOffset || inputTypeOffset > outputTypeOffset) return null;
	if (outputTypeOffset > totalSize) return null;

	// Parse each field.
	const lock = parseOptionalBytes(bytes, lockOffset, inputTypeOffset);
	const inputType = parseOptionalBytes(bytes, inputTypeOffset, outputTypeOffset);
	const outputType = parseOptionalBytes(bytes, outputTypeOffset, totalSize);

	return {
		type: 'witnessArgs',
		lock,
		inputType,
		outputType,
	};
}

/**
 * Parse an optional Bytes field from Molecule data.
 * Returns null if the field is empty (None), otherwise returns hex string.
 */
function parseOptionalBytes(
	bytes: Uint8Array,
	startOffset: number,
	endOffset: number,
): string | null {
	const fieldSize = endOffset - startOffset;

	// Empty field (None).
	if (fieldSize === 0) return null;

	// Field must have at least 4 bytes for size prefix.
	if (fieldSize < 4) return null;

	// Read content size.
	const contentSize = readUint32LE(bytes, startOffset);

	// Validate content size matches field size.
	if (contentSize + 4 !== fieldSize) return null;

	// Empty content.
	if (contentSize === 0) return '0x';

	// Extract content bytes.
	const content = bytes.slice(startOffset + 4, startOffset + 4 + contentSize);
	return '0x' + Array.from(content).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Decode a SECP256K1 recoverable signature (65 bytes).
 * Format: r (32 bytes) + s (32 bytes) + v (1 byte recovery ID).
 */
export function decodeSignature(data: string): SignatureData | null {
	const bytes = hexToBytes(data);

	// Must be exactly 65 bytes.
	if (bytes.length !== 65) return null;

	const r = '0x' + Array.from(bytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('');
	const s = '0x' + Array.from(bytes.slice(32, 64)).map(b => b.toString(16).padStart(2, '0')).join('');
	const v = bytes[64];

	return {
		type: 'signature',
		r,
		s,
		v,
	};
}

/**
 * Check if data looks like a valid WitnessArgs structure.
 */
export function isWitnessArgs(data: string): boolean {
	const bytes = hexToBytes(data);
	if (bytes.length < 16) return false;

	const totalSize = readUint32LE(bytes, 0);
	if (totalSize !== bytes.length) return false;

	const lockOffset = readUint32LE(bytes, 4);
	const inputTypeOffset = readUint32LE(bytes, 8);
	const outputTypeOffset = readUint32LE(bytes, 12);

	// Offsets must be in order and start at 16 (after header).
	if (lockOffset !== 16) return false;
	if (lockOffset > inputTypeOffset) return false;
	if (inputTypeOffset > outputTypeOffset) return false;
	if (outputTypeOffset > totalSize) return false;

	return true;
}

/**
 * Check if data is a 65-byte signature.
 */
export function isSignature(data: string): boolean {
	return (data.length - 2) / 2 === 65;
}
