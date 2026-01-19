/**
 * Byte conversion utilities.
 */

/**
 * Convert a hex string to a Uint8Array.
 * Handles optional "0x" prefix.
 * @param hex - The hex string to convert.
 * @returns The byte array.
 */
export function hexToBytes(hex: string): Uint8Array {
	const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
	const bytes = new Uint8Array(cleanHex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

/**
 * Convert a Uint8Array to a hex string.
 * @param bytes - The byte array to convert.
 * @param prefix - Whether to include "0x" prefix. Default true.
 * @returns The hex string.
 */
export function bytesToHex(bytes: Uint8Array, prefix = true): string {
	const hex = Array.from(bytes)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
	return prefix ? `0x${hex}` : hex;
}
