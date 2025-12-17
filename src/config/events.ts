/**
 * Network timeline events for the time slider and historical markers.
 *
 * Events are organized by network type. Only mainnet is populated;
 * testnet and devnet have different activation epochs and are left empty.
 */

import type { NetworkType } from './networks';

export type NetworkEventType = 'genesis' | 'hardfork' | 'halving';

export interface NetworkEvent {
	/** Unique identifier for the event. */
	id: string;
	/** Display name for the event. */
	name: string;
	/** Type of event (genesis, hardfork, or halving). */
	type: NetworkEventType;
	/** Epoch number when the event activated. */
	epoch: number;
	/** Block number when the event activated. */
	block: number;
	/** ISO 8601 date string (UTC) when the event occurred. */
	date: string;
	/** Brief description of the event for tooltips. */
	description: string;
	/** Optional URL to documentation or RFC. */
	url?: string;
}

/**
 * Mainnet timeline events.
 *
 * Data sourced directly from the archive node via RPC queries.
 */
const mainnetEvents: NetworkEvent[] = [
	{
		id: 'genesis',
		name: 'Genesis "Lina"',
		type: 'genesis',
		epoch: 0,
		block: 0,
		date: '2019-11-15T21:09:50.812Z',
		description: '🎉 At 9:11 PM UTC, the Nervos CKB mainnet launched after two years of research and development. The launch was preceded by over 200 days of testnet operation, two independent security audits, and five mining competitions.',
		url: 'https://medium.com/nervosnetwork/ckb-mainnet-lina-q-a-b3b10f7e04e',
	},
	{
		id: 'mirana',
		name: 'Mirana Hardfork',
		type: 'hardfork',
		epoch: 5414,
		block: 7087867,
		date: '2022-05-10T02:59:39.182Z',
		description: 'The first major protocol upgrade after nearly three years of stable mainnet operation. Introduced CKB-VM v1 with RISC-V B extension and macro-op fusion for dramatically improved cryptographic performance, VM versioning for backward compatibility, extensible block headers, and a new future-proof address format.',
		url: 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0037-ckb2021/0037-ckb2021.md',
	},
	{
		id: 'halving-1',
		name: 'First Halving',
		type: 'halving',
		epoch: 8760,
		block: 11487788,
		date: '2023-11-19T17:23:47.038Z',
		description: 'A halving cuts mining block rewards in half, slowing new supply to increase scarcity over time. This milestone reduced CKB inflation from 7.92% to 3.77% by halving base issuance. Combined with 100% predictable supply and a four-year halving schedule, CKB delivers some of the most investor-favorable tokenomics in the industry.',
		url: 'https://nervoshalving.com/',
	},
	{
		id: 'meepo',
		name: 'Meepo Hardfork',
		type: 'hardfork',
		epoch: 12293,
		block: 16595590,
		date: '2025-07-01T08:59:02.467Z',
		description: 'The second major protocol upgrade brought CKB-VM v2 with new syscalls for improved cross-script communication, spawn capabilities for parallel execution, and enhanced support for building complex Layer 2 solutions on Nervos.',
		url: 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs/0051-ckb2023/0051-ckb2023.md',
	},
	// TODO: Second Halving - uncomment when block number is known.
	// {
	// 	id: 'halving-2',
	// 	name: 'Second Halving',
	// 	type: 'halving',
	// 	epoch: 17520,
	// 	block: 0, // Unknown until closer to epoch.
	// 	date: '', // Estimated November 2027.
	// 	description: 'Block reward reduced from 958,904 to 479,452 CKB per epoch.',
	// 	url: 'https://docs.nervos.org/docs/mining/halving',
	// },
];

/**
 * Testnet timeline events.
 *
 * Testnet has different activation epochs for hardforks. Left empty for now.
 */
const testnetEvents: NetworkEvent[] = [];

/**
 * Devnet timeline events.
 *
 * Devnets typically don't track historical events. Left empty.
 */
const devnetEvents: NetworkEvent[] = [];

/**
 * Network events indexed by network type.
 */
export const networkEvents: Record<NetworkType, NetworkEvent[]> = {
	mainnet: mainnetEvents,
	testnet: testnetEvents,
	devnet: devnetEvents,
};

/**
 * Get events for a specific network type.
 */
export function getNetworkEvents(networkType: NetworkType): NetworkEvent[] {
	return networkEvents[networkType] ?? [];
}
