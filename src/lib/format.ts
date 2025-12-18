import type { Hex } from '../types/rpc';

/**
 * 1 CKB = 100,000,000 Shannons.
 */
const SHANNONS_PER_CKB = 100_000_000n;

/**
 * Format Shannon amount to CKB string.
 * @param shannons - Amount in shannons.
 * @param decimals - Number of decimal places to show. If undefined, shows up to 8 with trailing zeros trimmed.
 */
export function formatCkb(shannons: bigint | string, decimals?: number): string {
	const value = typeof shannons === 'string' ? BigInt(shannons) : shannons;
	const whole = value / SHANNONS_PER_CKB;
	const fraction = value % SHANNONS_PER_CKB;

	if (decimals !== undefined) {
		// Round to specified decimal places.
		const divisor = 10n ** BigInt(8 - decimals);
		const roundedFraction = (fraction + divisor / 2n) / divisor;
		// Handle case where rounding causes overflow (e.g., 0.999... → 1.0).
		if (roundedFraction >= 10n ** BigInt(decimals)) {
			return formatNumber(whole + 1n) + '.' + '0'.repeat(decimals) + ' CKB';
		}
		const fractionStr = roundedFraction.toString().padStart(decimals, '0');
		return formatNumber(whole) + '.' + fractionStr + ' CKB';
	}

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
 * Truncate a hex string for display (e.g., "0x12345678...12345678").
 * Standard format for 66-char hashes (tx, block, code): 0x + 8 chars + ... + 8 chars.
 * @param hex - The hex string to truncate.
 * @param prefixLen - Number of characters to show at start (after 0x). Default 8.
 * @param suffixLen - Number of characters to show at end. Default 8.
 */
export function truncateHex(hex: Hex, prefixLen = 8, suffixLen = 8): string {
	if (hex.length <= prefixLen + suffixLen + 4) {
		return hex;
	}
	const prefix = hex.slice(0, 2 + prefixLen);
	const suffix = hex.slice(-suffixLen);
	return `${prefix}...${suffix}`;
}

/**
 * Truncate a CKB address for display.
 * Standard format: 8 chars prefix + ... + 4 chars suffix.
 * @param address - The CKB address to truncate.
 * @param prefixLen - Number of characters to show at start. Default 8.
 * @param suffixLen - Number of characters to show at end. Default 4.
 */
export function truncateAddress(address: string, prefixLen = 8, suffixLen = 4): string {
	if (address.length <= prefixLen + suffixLen + 3) {
		return address;
	}
	return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

/**
 * Truncate variable-length data (args, cell data, witnesses) for display.
 * Shows first N characters + "..." if longer than limit.
 * @param data - The hex data to truncate.
 * @param limit - Maximum characters to show before truncating. Default 128.
 */
export function truncateData(data: string, limit = 128): string {
	if (data.length <= limit) {
		return data;
	}
	return `${data.slice(0, limit)}...`;
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
 * CKB epoch encoding: (length << 40) | (index << 24) | number
 * - Bits 0-23: epoch number (24 bits)
 * - Bits 24-39: block index within epoch (16 bits)
 * - Bits 40-63: epoch length (24 bits)
 */
export function formatEpoch(epoch: bigint | string): string {
	const value = typeof epoch === 'string' ? BigInt(epoch) : epoch;
	const epochNumber = value & 0xFFFFFFn;
	const epochIndex = (value >> 24n) & 0xFFFFn;
	const epochLength = value >> 40n;
	return `${epochNumber} (${epochIndex}/${epochLength})`;
}

/**
 * Parse an epoch value to its components.
 * CKB epoch encoding: (length << 40) | (index << 24) | number
 * - Bits 0-23: epoch number (24 bits)
 * - Bits 24-39: block index within epoch (16 bits)
 * - Bits 40-63: epoch length (24 bits)
 */
export function parseEpoch(epoch: bigint | string): {
	number: bigint;
	length: bigint;
	index: bigint;
} {
	const value = typeof epoch === 'string' ? BigInt(epoch) : epoch;
	return {
		number: value & 0xFFFFFFn,
		index: (value >> 24n) & 0xFFFFn,
		length: value >> 40n,
	};
}

/**
 * Format a large number with SI prefix (K, M, G, T, P, E).
 * Used for hash rates and difficulty values.
 */
export function formatSiNumber(value: bigint | number, decimals = 2): string {
	const num = typeof value === 'bigint' ? Number(value) : value;

	const units = ['', 'K', 'M', 'G', 'T', 'P', 'E'];
	let unitIndex = 0;
	let scaledValue = num;

	while (scaledValue >= 1000 && unitIndex < units.length - 1) {
		scaledValue /= 1000;
		unitIndex++;
	}

	// Format with specified decimal places, trimming trailing zeros.
	const formatted = scaledValue.toFixed(decimals).replace(/\.?0+$/, '');
	return `${formatted} ${units[unitIndex]}`.trim();
}

/**
 * Convert compact target (from block header) to difficulty.
 * CKB uses a compact target format similar to Bitcoin's "nBits".
 * - Exponent: bits 24-31 (1 byte)
 * - Mantissa: bits 0-23 (3 bytes)
 * - Target = mantissa * 2^(8 * (exponent - 3))
 * - Difficulty = HSPACE / target, where HSPACE = 2^256
 *
 * @param compactTarget - The compact_target hex string from block header.
 * @returns Difficulty as hex string (matching get_blockchain_info format).
 */
export function compactTargetToDifficulty(compactTarget: string): string {
	const compact = BigInt(compactTarget);

	// Extract exponent (high byte) and mantissa (low 3 bytes).
	const exponent = Number((compact >> 24n) & 0xFFn);
	const mantissa = compact & 0xFFFFFFn;

	// Handle edge case: zero mantissa means zero target (infinite difficulty).
	if (mantissa === 0n) {
		return '0x0';
	}

	// Calculate target = mantissa * 2^(8 * (exponent - 3)).
	// For exponent < 3, this effectively right-shifts the mantissa.
	let target: bigint;
	if (exponent <= 3) {
		target = mantissa >> BigInt(8 * (3 - exponent));
	} else {
		target = mantissa << BigInt(8 * (exponent - 3));
	}

	// Avoid division by zero.
	if (target === 0n) {
		return '0x0';
	}

	// HSPACE = 2^256 (the total hash space).
	const HSPACE = 1n << 256n;

	// Difficulty = HSPACE / target.
	const difficulty = HSPACE / target;

	return '0x' + difficulty.toString(16);
}

/**
 * Format difficulty value for display.
 * Difficulty is returned as a hex string from get_blockchain_info or computed from compact_target.
 */
export function formatDifficulty(difficultyHex: string): string {
	const difficulty = BigInt(difficultyHex);
	return formatSiNumber(difficulty) + 'H';
}

/**
 * Calculate and format hash rate from difficulty and average block time.
 * Hash rate ≈ difficulty / block_time (in H/s).
 */
export function formatHashRate(difficultyHex: string, avgBlockTimeSeconds: number): string {
	if (avgBlockTimeSeconds <= 0) return '0 H/s';
	const difficulty = BigInt(difficultyHex);
	const hashRate = Number(difficulty) / avgBlockTimeSeconds;
	return formatSiNumber(hashRate) + 'H/s';
}

/**
 * Format duration in seconds to human-readable format.
 */
export function formatDuration(seconds: number): string {
	if (seconds < 0) return '0s';

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	if (minutes > 0) {
		return `${minutes}m ${secs}s`;
	}
	return `${secs}s`;
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
