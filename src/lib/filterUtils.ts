/**
 * Shared filter utilities for address transactions and live cells pages.
 */

import { KNOWN_TYPE_SCRIPTS } from './wellKnown';
import type { NetworkType } from '../config/networks';
import type { BlockRangeFilter } from '../components/AddressTransactionFilters';

/**
 * Threshold for using large-limit skipping during cursor building.
 * Used by paginated list pages to optimize cursor navigation.
 */
export const SKIP_THRESHOLD_PAGES = 10;

/**
 * Resolve block range filter to indexer format [start, end).
 * @param range - The block range filter.
 * @param tipBlockNumber - Current chain tip block number.
 * @returns Hex range tuple or null if no range filter.
 */
export function resolveBlockRange(
	range: BlockRangeFilter,
	tipBlockNumber: bigint
): [string, string] | null {
	const toHex = (n: bigint) => '0x' + n.toString(16);

	switch (range.preset) {
		case 'all':
			return null;
		case 'last_1k': {
			const start = tipBlockNumber > 1000n ? tipBlockNumber - 1000n : 0n;
			return [toHex(start), toHex(tipBlockNumber + 1n)];
		}
		case 'last_10k': {
			const start = tipBlockNumber > 10000n ? tipBlockNumber - 10000n : 0n;
			return [toHex(start), toHex(tipBlockNumber + 1n)];
		}
		case 'last_100k': {
			const start = tipBlockNumber > 100000n ? tipBlockNumber - 100000n : 0n;
			return [toHex(start), toHex(tipBlockNumber + 1n)];
		}
		case 'custom': {
			const start = range.customStart !== null ? BigInt(range.customStart) : 0n;
			const end = range.customEnd !== null ? BigInt(range.customEnd) + 1n : tipBlockNumber + 1n;
			return [toHex(start), toHex(end)];
		}
	}
}

/**
 * Get script info (including hash type) for a code hash.
 * Looks up the code hash in the known type scripts registry.
 */
export function getScriptInfo(
	codeHash: string,
	network: NetworkType
): { codeHash: string; hashType: 'type' | 'data' | 'data1' | 'data2' } | null {
	const registryNetwork = network === 'mainnet' ? 'mainnet' : 'testnet';
	const info = KNOWN_TYPE_SCRIPTS[registryNetwork][codeHash];
	if (!info) return null;

	return { codeHash, hashType: info.hashType };
}
