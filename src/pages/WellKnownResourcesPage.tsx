/**
 * Page displaying all well-known resources in the CKB ecosystem.
 * Organized by resource (script/protocol) with related cells grouped together.
 */

import { useMemo } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { navigate, generateLink } from '../lib/router';
import { HashDisplay } from '../components/CopyButton';
import { OutPoint } from '../components/OutPoint';
import { Tooltip } from '../components/Tooltip';
import {
	KNOWN_LOCK_SCRIPTS,
	KNOWN_TYPE_SCRIPTS,
	WELL_KNOWN_CELLS,
	type WellKnownCellCategory,
} from '../lib/wellKnown';
import {
	BRAND,
	SCRIPT_LOCK,
	SCRIPT_TYPE,
	CELL_BINARY,
	CELL_DEP_GROUP,
	CELL_PROTOCOL,
	STATUS_NEUTRAL,
	getHashTypeStyle,
} from '../lib/badgeStyles';

type RegistryNetwork = 'mainnet' | 'testnet';

/**
 * Convert network type to registry network.
 */
function toRegistryNetwork(network: string): RegistryNetwork {
	return network === 'mainnet' ? 'mainnet' : 'testnet';
}

/**
 * Resource definition for grouping related scripts and cells.
 */
interface ResourceDefinition {
	id: string;
	name: string;
	description: string;
	rfc?: string;
	sourceUrl?: string;
	/** Patterns to match cell names (case-insensitive, partial match). */
	cellPatterns: string[];
	/** Lock script names to include. */
	lockScriptNames: string[];
	/** Type script names to include. */
	typeScriptNames: string[];
}

/**
 * Resource definitions ordered by importance.
 * Each resource groups related lock scripts, type scripts, and cells.
 */
// Documentation URLs.
const RFC_BASE = 'https://github.com/nervosnetwork/rfcs/blob/master/rfcs';
const RFC_0023 = `${RFC_BASE}/0023-dao-deposit-withdraw/0023-dao-deposit-withdraw.md`;
const RFC_0024 = `${RFC_BASE}/0024-ckb-genesis-script-list/0024-ckb-genesis-script-list.md`;
const RFC_0025 = `${RFC_BASE}/0025-simple-udt/0025-simple-udt.md`;
const RFC_0026 = `${RFC_BASE}/0026-anyone-can-pay/0026-anyone-can-pay.md`;
const RFC_0042 = `${RFC_BASE}/0042-omnilock/0042-omnilock.md`;
const RFC_0052 = `${RFC_BASE}/0052-extensible-udt/0052-extensible-udt.md`;
const SPORE_DOCS = 'https://github.com/sporeprotocol/spore-contract/blob/master/docs/VERSIONS.md';
const JOYID_DOCS = 'https://docs.joyid.dev/guide/ckb/smart-contract';
const COTA_DOCS = 'https://github.com/nervina-labs/cota-sdk-js/blob/develop/src/constants/index.ts';
const NOSTR_DOCS = 'https://github.com/cryptape/nostr-binding/blob/main/docs/nostr-lock-script.md';
const RGBPP_DOCS = 'https://github.com/ckb-cell/rgbpp-sdk/blob/main/packages/ckb/src/constants/index.ts';
const CKBFS_DOCS = 'https://github.com/nervape/ckbfs/blob/master/README.md';
const ICKB_DOCS = 'https://github.com/ickb/whitepaper#mainnet-deployment';
const PWLOCK_DOCS = 'https://github.com/lay2dev/pw-core';

const RESOURCES: ResourceDefinition[] = [
	{
		id: 'secp256k1',
		name: 'SECP256K1/blake160',
		description: 'Default lock script for all standard CKB addresses, using secp256k1 signature verification with blake160 hashing.',
		rfc: '0024',
		sourceUrl: RFC_0024,
		cellPatterns: ['secp256k1', 'secp256k1_data'],
		lockScriptNames: ['SECP256K1/blake160'],
		typeScriptNames: [],
	},
	{
		id: 'multisig',
		name: 'Multisig (SECP256K1/blake160)',
		description: 'Multi-signature lock using SECP256K1/blake160 cryptography, requiring M-of-N signatures with optional time-lock support.',
		rfc: '0024',
		sourceUrl: RFC_0024,
		cellPatterns: ['multisig'],
		lockScriptNames: ['Multisig'],
		typeScriptNames: [],
	},
	{
		id: 'dao',
		name: 'NervosDAO',
		description: 'Deposit CKB to earn interest that offsets inflation from secondary issuance, similar to staking. Accessible via Neuron wallet, JoyID, or the NervDAO portal. For liquidity without the 30-day lockup, iCKB tokenizes deposits into transferable tokens (without governance benefits).',
		rfc: '0023',
		sourceUrl: RFC_0023,
		cellPatterns: ['nervosdao', 'dao'],
		lockScriptNames: [],
		typeScriptNames: ['NervosDAO'],
	},
	{
		id: 'omnilock',
		name: 'Omnilock',
		description: 'Universal lock enabling cross-chain interoperability with authentication from Ethereum, Bitcoin, Dogecoin, and Tron wallets. Supports optional modes for Anyone-Can-Pay transfers, time-locks, and regulatory compliance.',
		rfc: '0042',
		sourceUrl: RFC_0042,
		cellPatterns: ['omnilock'],
		lockScriptNames: ['Omnilock'],
		typeScriptNames: [],
	},
	{
		id: 'acp',
		name: 'Anyone-Can-Pay',
		description: 'Receive CKB or UDT deposits into existing cells without signing, bypassing the 61 CKB minimum required to create new cells. Omnilock also supports ACP mode for similar functionality.',
		rfc: '0026',
		sourceUrl: RFC_0026,
		cellPatterns: ['anyone-can-pay'],
		lockScriptNames: ['Anyone-Can-Pay'],
		typeScriptNames: [],
	},
	{
		id: 'sudt',
		name: 'SUDT',
		description: 'Simple UDT, the foundational token standard for fungible assets on CKB with minimal complexity.',
		rfc: '0025',
		sourceUrl: RFC_0025,
		cellPatterns: ['sudt'],
		lockScriptNames: [],
		typeScriptNames: ['SUDT'],
	},
	{
		id: 'xudt',
		name: 'xUDT',
		description: 'Extensible UDT with optional extension scripts for advanced token features like supply limits and pause controls. Used by iCKB and RGB++ protocols.',
		rfc: '0052',
		sourceUrl: RFC_0052,
		cellPatterns: ['xudt'],
		lockScriptNames: [],
		typeScriptNames: ['xUDT'],
	},
	{
		id: 'spore',
		name: 'Spore Protocol',
		description: 'Fully on-chain NFT protocol storing content directly in cells rather than external links. Spores are individual digital objects; Clusters group them into collections with shared metadata.',
		sourceUrl: SPORE_DOCS,
		cellPatterns: ['spore', 'cluster'],
		lockScriptNames: [],
		typeScriptNames: ['Spore', 'Spore Cluster'],
	},
	{
		id: 'joyid',
		name: 'JoyID',
		description: 'Popular passkey-based wallet for desktop and mobile, using WebAuthn biometrics (Face ID, Touch ID) to eliminate seed phrases entirely.',
		sourceUrl: JOYID_DOCS,
		cellPatterns: ['joyid'],
		lockScriptNames: ['JoyID'],
		typeScriptNames: [],
	},
	{
		id: 'cota',
		name: 'CoTA',
		description: 'Compact Token Aggregator enabling near-zero storage cost NFTs by compressing unlimited tokens into 32 bytes per user via Sparse Merkle Trees.',
		sourceUrl: COTA_DOCS,
		cellPatterns: ['cota'],
		lockScriptNames: [],
		typeScriptNames: ['CoTA'],
	},
	{
		id: 'nostr',
		name: 'Nostr Lock',
		description: 'Control CKB assets using Nostr protocol identities via schnorr signatures, bridging the decentralized social network to on-chain assets.',
		sourceUrl: NOSTR_DOCS,
		cellPatterns: ['nostr'],
		lockScriptNames: ['Nostr Lock'],
		typeScriptNames: [],
	},
	{
		id: 'rgbpp',
		name: 'RGB++',
		description: 'Bitcoin-secured CKB assets through isomorphic binding, where Bitcoin UTXOs directly control CKB cells without bridges or wrapping.',
		sourceUrl: RGBPP_DOCS,
		cellPatterns: ['rgb++', 'btc time lock'],
		lockScriptNames: ['RGB++ Lock', 'BTC Time Lock'],
		typeScriptNames: [],
	},
	{
		id: 'ckbfs',
		name: 'CKBFS',
		description: 'On-chain file storage protocol using content-addressable chunks, enabling permanent and verifiable data storage directly on CKB.',
		sourceUrl: CKBFS_DOCS,
		cellPatterns: ['ckbfs'],
		lockScriptNames: [],
		typeScriptNames: ['CKBFS'],
	},
	{
		id: 'ickb',
		name: 'iCKB',
		description: 'NervosDAO liquidity protocol that tokenizes deposits into transferable iCKB tokens, earning DAO interest without the 30-day lockup period.',
		sourceUrl: ICKB_DOCS,
		cellPatterns: ['ickb'],
		lockScriptNames: ['iCKB Logic', 'iCKB Limit Order', 'iCKB Owned-Owner'],
		typeScriptNames: ['iCKB Logic', 'iCKB Limit Order', 'iCKB Owned-Owner', 'iCKB'],
	},
	{
		id: 'pwlock',
		name: 'PW Lock (Deprecated)',
		description: 'Ethereum-style authentication with built-in Anyone-Can-Pay support. Deprecated in favor of Omnilock, which provides broader authentication support.',
		sourceUrl: PWLOCK_DOCS,
		cellPatterns: ['pw-lock', 'pwlock'],
		lockScriptNames: ['PW Lock'],
		typeScriptNames: [],
	},
];

interface ResourceItem {
	type: 'lock_script' | 'type_script' | 'cell';
	name: string;
	description: string;
	// Script-specific fields.
	codeHash?: string;
	hashType?: string;
	// Cell-specific fields.
	txHash?: string;
	index?: number;
	category?: WellKnownCellCategory;
	rfc?: string;
}

interface ResolvedResource {
	definition: ResourceDefinition;
	items: ResourceItem[];
}

export function WellKnownResourcesPage() {
	const { currentNetwork } = useNetwork();
	const networkType = currentNetwork?.type ?? 'mainnet';
	const registryNetwork = toRegistryNetwork(networkType);

	// Resolve resources with their related items.
	const resources = useMemo(() => {
		const lockScripts = KNOWN_LOCK_SCRIPTS[registryNetwork];
		const typeScripts = KNOWN_TYPE_SCRIPTS[registryNetwork];
		const cells = WELL_KNOWN_CELLS[registryNetwork];

		// Track which items have been assigned to avoid duplicates.
		const assignedLockScripts = new Set<string>();
		const assignedTypeScripts = new Set<string>();
		const assignedCells = new Set<string>();

		const resolved: ResolvedResource[] = [];

		for (const def of RESOURCES) {
			const items: ResourceItem[] = [];

			// Find matching lock scripts.
			for (const [codeHash, info] of Object.entries(lockScripts)) {
				if (def.lockScriptNames.includes(info.name) && !assignedLockScripts.has(codeHash)) {
					items.push({
						type: 'lock_script',
						name: info.name,
						description: info.description,
						codeHash,
						hashType: info.hashType,
					});
					assignedLockScripts.add(codeHash);
				}
			}

			// Find matching type scripts.
			for (const [codeHash, info] of Object.entries(typeScripts)) {
				if (def.typeScriptNames.includes(info.name) && !assignedTypeScripts.has(codeHash)) {
					items.push({
						type: 'type_script',
						name: info.name,
						description: info.description,
						codeHash,
						hashType: info.hashType,
					});
					assignedTypeScripts.add(codeHash);
				}
			}

			// Find matching cells by name pattern.
			for (const [key, info] of Object.entries(cells)) {
				const cellNameLower = info.name.toLowerCase();
				const matches = def.cellPatterns.some((pattern) =>
					cellNameLower.includes(pattern.toLowerCase())
				);
				if (matches && !assignedCells.has(key)) {
					const [txHash, indexStr] = key.split(':');
					items.push({
						type: 'cell',
						name: info.name,
						description: info.description,
						txHash,
						index: parseInt(indexStr, 10),
						category: info.category,
						rfc: info.rfc,
					});
					assignedCells.add(key);
				}
			}

			// Only include resources that have at least one item.
			if (items.length > 0) {
				resolved.push({ definition: def, items });
			}
		}

		return resolved;
	}, [registryNetwork]);

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header. */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<button onClick={() => navigate(generateLink('/'))} className="hover:text-nervos">
						Home
					</button>
					<span>/</span>
					<span>Well-Known Resources</span>
				</div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Well-Known Resources
				</h1>
				<p className="text-gray-600 dark:text-gray-400">
					System scripts, protocol implementations, and important cells on {networkType === 'mainnet' ? 'Mainnet' : 'Testnet'}.
				</p>
			</div>

			{/* Resources grid. */}
			<div className="space-y-6">
				{resources.map((resource) => (
					<ResourceCard key={resource.definition.id} resource={resource} />
				))}
			</div>
		</div>
	);
}

/**
 * Card displaying a resource and its related items.
 */
function ResourceCard({ resource }: { resource: ResolvedResource }) {
	const { definition, items } = resource;

	return (
		<div
			id={definition.id}
			className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden scroll-mt-4"
		>
			{/* Resource header. */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700/50">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							{definition.name}
						</h2>
						{definition.rfc && (
							<Tooltip content="Request for Comments — CKB's formal specification process for protocol standards.">
								<span className={`px-1.5 py-0.5 text-xs font-medium ${BRAND} rounded cursor-help`}>
									RFC {definition.rfc}
								</span>
							</Tooltip>
						)}
					</div>
					{definition.sourceUrl && (
						<a
							href={definition.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="flex-shrink-0 p-1 text-gray-400 hover:text-nervos transition-colors"
							title="View documentation"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
							</svg>
						</a>
					)}
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
					{definition.description}
				</p>
			</div>

			{/* Related items. */}
			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				{items.map((item, index) => (
					<ResourceItemRow key={index} item={item} />
				))}
			</div>
		</div>
	);
}

/**
 * Row component for a resource item (script or cell).
 */
function ResourceItemRow({ item }: { item: ResourceItem }) {
	if (item.type === 'cell') {
		return <CellItemRow item={item} />;
	}
	return <ScriptItemRow item={item} />;
}

/**
 * Get tooltip content for script type badges.
 */
function getScriptTypeTooltip(type: 'lock_script' | 'type_script'): string {
	return type === 'lock_script'
		? 'Lock scripts control who can spend a cell by validating signatures or other unlock conditions.'
		: 'Type scripts validate cell data format and enforce state transition rules.';
}

/**
 * Get tooltip content for hash type badges.
 */
function getHashTypeTooltip(hashType: string): string {
	switch (hashType) {
		case 'type':
			return 'Script identified by the type hash of its code cell, allowing upgrades while preserving identity.';
		case 'data':
			return 'Script identified by blake2b hash of the code binary (CKB-VM v0).';
		case 'data1':
			return 'Script identified by blake2b hash of the code binary (CKB-VM v1).';
		case 'data2':
			return 'Script identified by blake2b hash of the code binary (CKB-VM v2).';
		default:
			return `Hash type: ${hashType}`;
	}
}


/**
 * Row for a script item (lock or type).
 */
function ScriptItemRow({ item }: { item: ResourceItem }) {
	const typeLabel = item.type === 'lock_script' ? 'Lock Script' : 'Type Script';
	// Indigo for lock scripts (security/access), teal for type scripts (validation).
	const typeBgColor = item.type === 'lock_script' ? SCRIPT_LOCK : SCRIPT_TYPE;

	return (
		<div className="p-4">
			<div className="flex items-center gap-2 mb-1 flex-wrap">
				<h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
				<Tooltip content={getScriptTypeTooltip(item.type as 'lock_script' | 'type_script')}>
					<span className={`px-1.5 py-0.5 text-xs font-medium rounded cursor-help ${typeBgColor}`}>
						{typeLabel}
					</span>
				</Tooltip>
				<Tooltip content={getHashTypeTooltip(item.hashType!)}>
					<span className={`px-1.5 py-0.5 text-xs font-mono rounded cursor-help ${getHashTypeStyle(item.hashType!)}`}>
						{item.hashType}
					</span>
				</Tooltip>
			</div>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
				{item.description}
			</p>
			<div className="font-mono text-xs text-gray-500 dark:text-gray-500">
				<HashDisplay hash={item.codeHash!} responsive />
			</div>
		</div>
	);
}

/**
 * Row for a cell item.
 */
function CellItemRow({ item }: { item: ResourceItem }) {
	const categoryInfo = getCategoryInfo(item.category!);

	return (
		<div className="p-4">
			<div className="flex items-center gap-2 mb-1 flex-wrap">
				<h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
				<Tooltip content={categoryInfo.tooltip}>
					<span className={`px-1.5 py-0.5 text-xs font-medium rounded cursor-help ${categoryInfo.className}`}>
						{categoryInfo.label}
					</span>
				</Tooltip>
			</div>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
				{item.description}
			</p>
			<OutPoint txHash={item.txHash!} index={item.index!} />
		</div>
	);
}

/**
 * Get category info for badges including tooltip.
 */
function getCategoryInfo(category: WellKnownCellCategory): { label: string; className: string; tooltip: string } {
	switch (category) {
		case 'system':
			return {
				label: 'Binary',
				className: CELL_BINARY,
				tooltip: 'Contains compiled RISC-V binary code that executes on CKB-VM.',
			};
		case 'dep_group':
			return {
				label: 'Dep Group',
				className: CELL_DEP_GROUP,
				tooltip: 'References multiple cells to include as transaction dependencies.',
			};
		case 'protocol':
			return {
				label: 'Protocol',
				className: CELL_PROTOCOL,
				tooltip: 'Standard protocol implementation deployed on-chain.',
			};
		default:
			return {
				label: 'Unknown',
				className: STATUS_NEUTRAL,
				tooltip: 'Unknown cell category.',
			};
	}
}
