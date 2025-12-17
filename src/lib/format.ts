import type { Hex } from '../types/rpc';

/**
 * 1 CKB = 100,000,000 Shannons.
 */
const SHANNONS_PER_CKB = 100_000_000n;

/**
 * Format Shannon amount to CKB string with up to 8 decimal places.
 * Trims trailing zeros for cleaner display.
 */
export function formatCkb(shannons: bigint | string): string {
	const value = typeof shannons === 'string' ? BigInt(shannons) : shannons;
	const whole = value / SHANNONS_PER_CKB;
	const fraction = value % SHANNONS_PER_CKB;

	if (fraction === 0n) {
		return formatNumber(whole) + ' CKB';
	}

	// Pad fraction to 8 digits and trim trailing zeros.
	const fractionStr = fraction.toString().padStart(8, '0').replace(/0+$/, '');
	return formatNumber(whole) + '.' + fractionStr + ' CKB';
}

/**
 * Format a number with thousand separators.
 */
export function formatNumber(num: bigint | number): string {
	return num.toLocaleString('en-US');
}

/**
 * Truncate a hex string for display (e.g., "0x1234...abcd").
 * @param hex - The hex string to truncate.
 * @param prefixLen - Number of characters to show at start (after 0x).
 * @param suffixLen - Number of characters to show at end.
 */
export function truncateHex(hex: Hex, prefixLen = 10, suffixLen = 10): string {
	if (hex.length <= prefixLen + suffixLen + 4) {
		return hex;
	}
	const prefix = hex.slice(0, 2 + prefixLen);
	const suffix = hex.slice(-suffixLen);
	return `${prefix}...${suffix}`;
}

/**
 * Format a Unix timestamp (in milliseconds) to a relative time string.
 */
export function formatRelativeTime(timestamp: bigint | number): string {
	const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
	const now = Date.now();
	const diff = now - ts;

	if (diff < 0) {
		return 'just now';
	}

	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) {
		return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
	}

	const days = Math.floor(hours / 24);
	if (days < 30) {
		return days === 1 ? '1 day ago' : `${days} days ago`;
	}

	const months = Math.floor(days / 30);
	if (months < 12) {
		return months === 1 ? '1 month ago' : `${months} months ago`;
	}

	const years = Math.floor(months / 12);
	return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Format a Unix timestamp to an absolute date string (UTC).
 */
export function formatAbsoluteTime(timestamp: bigint | number): string {
	const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
	const date = new Date(ts);
	return date.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

/**
 * Format epoch number to human readable format.
 * CKB epoch format: lower 24 bits = block index, next 16 bits = epoch length, upper 24 bits = epoch number.
 */
export function formatEpoch(epoch: bigint | string): string {
	const value = typeof epoch === 'string' ? BigInt(epoch) : epoch;
	const epochNumber = value >> 40n;
	const epochLength = (value >> 24n) & 0xFFFFn;
	const epochIndex = value & 0xFFFFFFn;
	return `${epochNumber} (${epochIndex}/${epochLength})`;
}

/**
 * Parse an epoch value to its components.
 */
export function parseEpoch(epoch: bigint | string): {
	number: bigint;
	length: bigint;
	index: bigint;
} {
	const value = typeof epoch === 'string' ? BigInt(epoch) : epoch;
	return {
		number: value >> 40n,
		length: (value >> 24n) & 0xFFFFn,
		index: value & 0xFFFFFFn,
	};
}

/**
 * Check if a string is a valid hex format.
 */
export function isValidHex(str: string): boolean {
	return /^0x[0-9a-fA-F]+$/.test(str);
}

/**
 * Check if a string is a valid block number (numeric).
 */
export function isBlockNumber(str: string): boolean {
	return /^\d+$/.test(str);
}

/**
 * Check if a string is a valid CKB address.
 */
export function isAddress(str: string): boolean {
	return /^(ckb|ckt)1[a-z0-9]+$/.test(str);
}

/**
 * Detect the type of search input.
 */
export function detectSearchType(input: string): 'block-number' | 'hash' | 'address' | 'unknown' {
	const trimmed = input.trim();

	if (isBlockNumber(trimmed)) {
		return 'block-number';
	}

	if (isValidHex(trimmed) && trimmed.length === 66) {
		// 0x + 64 hex characters = block hash or tx hash.
		return 'hash';
	}

	if (isAddress(trimmed)) {
		return 'address';
	}

	return 'unknown';
}
