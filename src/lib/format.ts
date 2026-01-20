import type { Hex, RpcCellWithLifecycle, RpcScript } from '../types/rpc';

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
 * Calculate the size of a script in bytes.
 * Script size = 32 (code_hash) + 1 (hash_type) + args.length
 */
function calculateScriptSize(script: RpcScript): number {
	// code_hash is 32 bytes (0x + 64 hex chars).
	const codeHashSize = 32;
	// hash_type is 1 byte.
	const hashTypeSize = 1;
	// args is a hex string, divide by 2 to get byte length (subtract 2 for '0x' prefix).
	const argsSize = script.args.length > 2 ? (script.args.length - 2) / 2 : 0;
	return codeHashSize + hashTypeSize + argsSize;
}

/**
 * Calculate the total size of a cell in bytes.
 * Cell size = 8 (capacity) + lock_script_size + type_script_size + output_data_size
 *
 * @param cellData - The cell data from get_cell_lifecycle.
 * @returns The total cell size in bytes.
 */
export function calculateCellSize(cellData: RpcCellWithLifecycle): number {
	// Capacity field is 8 bytes.
	const capacitySize = 8;

	// Lock script size.
	const lockSize = calculateScriptSize(cellData.output.lock);

	// Type script size (if present).
	const typeSize = cellData.output.type ? calculateScriptSize(cellData.output.type) : 0;

	// Output data size (hex string, divide by 2 for byte length, subtract 2 for '0x' prefix).
	const dataSize = cellData.output_data && cellData.output_data.length > 2
		? (cellData.output_data.length - 2) / 2
		: 0;

	return capacitySize + lockSize + typeSize + dataSize;
}

/**
 * Format Shannon amount to a short CKB string (~5 characters).
 * Uses SI prefixes (K, M, B, T) for large values.
 * @param shannons - Amount in shannons.
 * @returns Short formatted string like "1.5K", "234M", "1.2B".
 */
export function formatCkbShort(shannons: bigint | string): string {
	const value = typeof shannons === 'string' ? BigInt(shannons) : shannons;
	const ckb = Number(value) / Number(SHANNONS_PER_CKB);

	if (ckb < 1000) {
		// Under 1K: show as integer or 1 decimal.
		if (ckb < 10) {
			return ckb.toFixed(1).replace(/\.0$/, '');
		}
		return Math.round(ckb).toString();
	}

	const units = ['', 'K', 'M', 'B', 'T'];
	let unitIndex = 0;
	let scaled = ckb;

	while (scaled >= 1000 && unitIndex < units.length - 1) {
		scaled /= 1000;
		unitIndex++;
	}

	// Format to keep total ~5 chars: "1.23K", "12.3M", "123B".
	if (scaled >= 100) {
		return Math.round(scaled) + units[unitIndex];
	}
	if (scaled >= 10) {
		return scaled.toFixed(1).replace(/\.0$/, '') + units[unitIndex];
	}
	return scaled.toFixed(2).replace(/\.?0+$/, '') + units[unitIndex];
}

/**
 * Format byte size to human-readable string (B, KB, MB, GB).
 * @param bytes - Number of bytes.
 * @param decimals - Number of decimal places. Default 1.
 */
export function formatBytes(bytes: number, decimals = 1): string {
	if (bytes === 0) return '0 B';
	if (bytes < 0) return '0 B';

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const k = 1024;
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const unitIndex = Math.min(i, units.length - 1);

	const value = bytes / Math.pow(k, unitIndex);

	// Show integer for small values, decimals for larger.
	if (unitIndex === 0) {
		return `${Math.round(value)} ${units[unitIndex]}`;
	}

	return `${value.toFixed(decimals)} ${units[unitIndex]}`;
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
 * Decode compact target to the full target value.
 * CKB uses a compact target format similar to Bitcoin's "nBits".
 * - Exponent: bits 24-31 (1 byte)
 * - Mantissa: bits 0-23 (3 bytes)
 * - Target = mantissa * 2^(8 * (exponent - 3))
 *
 * @param compactTarget - The compact_target hex string from block header.
 * @returns Full target as hex string (64 hex chars, 256 bits).
 */
export function compactTargetToTarget(compactTarget: string): string {
	const compact = BigInt(compactTarget);

	// Extract exponent (high byte) and mantissa (low 3 bytes).
	const exponent = Number((compact >> 24n) & 0xFFn);
	const mantissa = compact & 0xFFFFFFn;

	// Handle edge case: zero mantissa means zero target.
	if (mantissa === 0n) {
		return '0x' + '0'.repeat(64);
	}

	// Calculate target = mantissa * 2^(8 * (exponent - 3)).
	let target: bigint;
	if (exponent <= 3) {
		target = mantissa >> BigInt(8 * (3 - exponent));
	} else {
		target = mantissa << BigInt(8 * (exponent - 3));
	}

	// Return as 64-char hex string (256 bits).
	return '0x' + target.toString(16).padStart(64, '0');
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
 * Format an activity span between two blocks as a human-readable duration with block count.
 * @param firstBlock - The first block number.
 * @param lastBlock - The last block number.
 * @param firstTimestamp - Unix timestamp (milliseconds) of the first block.
 * @param lastTimestamp - Unix timestamp (milliseconds) of the last block.
 * @returns Formatted string like "2 years, 14 days (400,000 blocks)" or "Single transaction".
 */
export function formatActivitySpan(
	firstBlock: bigint,
	lastBlock: bigint,
	firstTimestamp: number,
	lastTimestamp: number
): string {
	// Single transaction case.
	if (firstBlock === lastBlock) {
		return 'Single transaction';
	}

	const blockSpan = lastBlock - firstBlock;
	const timeSpanMs = lastTimestamp - firstTimestamp;

	// Calculate duration components.
	const totalDays = Math.floor(timeSpanMs / (1000 * 60 * 60 * 24));
	const years = Math.floor(totalDays / 365);
	const remainingDaysAfterYears = totalDays % 365;
	const months = Math.floor(remainingDaysAfterYears / 30);
	const days = remainingDaysAfterYears % 30;

	// Build duration string.
	const parts: string[] = [];

	if (years > 0) {
		parts.push(years === 1 ? '1 year' : `${years} years`);
	}

	if (months > 0) {
		parts.push(months === 1 ? '1 month' : `${months} months`);
	}

	// Only show days if years === 0 and days > 0.
	if (years === 0 && days > 0) {
		parts.push(days === 1 ? '1 day' : `${days} days`);
	}

	// Handle very short durations.
	const durationStr = parts.length > 0 ? parts.join(', ') : 'Less than a day';

	return `${durationStr} (${formatNumber(blockSpan)} blocks)`;
}

/**
 * Format a "since" field value from a transaction input.
 * The since field is a 64-bit value that can represent lock-time constraints.
 *
 * RFC-0017 specification:
 * - 0x0: No lock constraint
 * - Bit 63: 0 = Absolute, 1 = Relative
 * - Bits 62-61: Metric type (00 = block number, 01 = epoch, 10 = timestamp)
 * - Bits 60-56: Reserved (must be zero)
 * - Bits 55-0: Value (56 bits)
 *
 * Returns null if there's no lock constraint.
 * Returns a human-readable string describing the lock constraint.
 */
export function formatSince(since: string): string | null {
	const value = BigInt(since);

	// No lock constraint.
	if (value === 0n) {
		return null;
	}

	// Extract flag bits (highest 8 bits).
	const flags = (value >> 56n) & 0xFFn;

	// Bit 63: Relative flag.
	const isRelative = (flags & 0x80n) !== 0n;

	// Bits 62-61: Metric type.
	const metricType = (flags >> 5n) & 0x3n;

	// Bits 60-56: Reserved (should be zero).
	const reserved = flags & 0x1Fn;
	if (reserved !== 0n) {
		// Invalid encoding - show raw hex.
		return `0x${value.toString(16)}`;
	}

	// Extract the actual value (lower 56 bits).
	const actualValue = value & ((1n << 56n) - 1n);

	// Format based on metric type.
	let metricName: string;
	let formattedValue: string;

	switch (Number(metricType)) {
		case 0: // Block number.
			metricName = isRelative ? 'blocks' : 'block';
			formattedValue = formatNumber(actualValue);
			break;

		case 1: // Epoch number with fraction.
			metricName = isRelative ? 'epochs' : 'epoch';
			formattedValue = formatEpoch(actualValue);
			break;

		case 2: // Timestamp (median of previous 37 blocks).
			metricName = isRelative ? 'seconds' : 'timestamp';
			if (isRelative) {
				formattedValue = formatNumber(actualValue);
			} else {
				// Absolute timestamp - format as date.
				formattedValue = formatAbsoluteTime(Number(actualValue));
			}
			break;

		case 3: // Invalid metric type.
		default:
			return `0x${value.toString(16)}`;
	}

	// Build the human-readable string.
	if (isRelative) {
		return `+${formattedValue} ${metricName}`;
	}
	return `${formattedValue} ${metricName}`;
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
 * Check if a string is a valid cell OutPoint (txHash:index).
 */
export function isOutPoint(str: string): boolean {
	return /^0x[0-9a-fA-F]{64}:\d+$/.test(str);
}

/**
 * Detect the type of search input.
 */
export function detectSearchType(input: string): 'block-number' | 'hash' | 'address' | 'outpoint' | 'unknown' {
	const trimmed = input.trim();

	if (isBlockNumber(trimmed)) {
		return 'block-number';
	}

	// Check outpoint before hash since outpoint contains a valid hash prefix.
	if (isOutPoint(trimmed)) {
		return 'outpoint';
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
