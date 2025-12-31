/**
 * Page displaying all well-known resources in the CKB ecosystem.
 * Organized by resource (script/protocol) with related cells grouped together.
 */

import { useMemo } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { navigate, generateLink } from '../lib/router';
import { HashDisplay } from '../components/CopyButton';
import { OutPoint } from '../components/OutPoint';
import {
	KNOWN_LOCK_SCRIPTS,
	KNOWN_TYPE_SCRIPTS,
	WELL_KNOWN_CELLS,
	type WellKnownCellCategory,
} from '../lib/wellKnown';

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

const RESOURCES: ResourceDefinition[] = [
	{
		id: 'secp256k1',
		name: 'SECP256K1/blake160',
		description: 'Default lock script using secp256k1 signature verification with blake160 hash.',
		rfc: '0024',
		sourceUrl: RFC_0024,
		cellPatterns: ['secp256k1', 'secp256k1_data'],
		lockScriptNames: ['SECP256K1/blake160'],
		typeScriptNames: [],
	},
	{
		id: 'multisig',
		name: 'Multisig',
		description: 'Multi-signature lock requiring M-of-N signatures to unlock, with optional time-lock.',
		rfc: '0024',
		sourceUrl: RFC_0024,
		cellPatterns: ['multisig'],
		lockScriptNames: ['Multisig'],
		typeScriptNames: [],
	},
	{
		id: 'dao',
		name: 'NervosDAO',
		description: 'Native staking mechanism for CKB holders to earn secondary issuance rewards.',
		rfc: '0023',
		sourceUrl: RFC_0023,
		cellPatterns: ['nervosdao', 'dao'],
		lockScriptNames: [],
		typeScriptNames: ['NervosDAO'],
	},
	{
		id: 'omnilock',
		name: 'Omnilock',
		description: 'Universal lock supporting multiple authentication methods including Ethereum, Bitcoin, and more.',
		rfc: '0042',
		sourceUrl: RFC_0042,
		cellPatterns: ['omnilock'],
		lockScriptNames: ['Omnilock'],
		typeScriptNames: [],
	},
	{
		id: 'acp',
		name: 'Anyone-Can-Pay',
		description: 'Lock allowing anyone to add capacity or tokens to a cell without owner signature.',
		rfc: '0026',
		sourceUrl: RFC_0026,
		cellPatterns: ['anyone-can-pay'],
		lockScriptNames: ['Anyone-Can-Pay'],
		typeScriptNames: [],
	},
	{
		id: 'sudt',
		name: 'SUDT',
		description: 'Simple UDT token standard for fungible tokens on CKB.',
		rfc: '0025',
		sourceUrl: RFC_0025,
		cellPatterns: ['sudt'],
		lockScriptNames: [],
		typeScriptNames: ['SUDT'],
	},
	{
		id: 'xudt',
		name: 'xUDT',
		description: 'Extensible UDT with optional extension data for advanced token features.',
		rfc: '0052',
		sourceUrl: RFC_0052,
		cellPatterns: ['xudt'],
		lockScriptNames: [],
		typeScriptNames: ['xUDT'],
	},
	{
		id: 'cluster',
		name: 'Cluster',
		description: 'Spore collection protocol for grouping NFTs with shared metadata and permissions.',
		sourceUrl: SPORE_DOCS,
		cellPatterns: ['cluster'],
		lockScriptNames: [],
		typeScriptNames: [],
	},
	{
		id: 'spore',
		name: 'Spore',
		description: 'On-chain digital object protocol for NFTs, content, and composable assets.',
		sourceUrl: SPORE_DOCS,
		cellPatterns: ['spore'],
		lockScriptNames: [],
		typeScriptNames: ['Spore'],
	},
	{
		id: 'joyid',
		name: 'JoyID',
		description: 'Passwordless wallet using WebAuthn for secure and convenient authentication.',
		sourceUrl: JOYID_DOCS,
		cellPatterns: ['joyid'],
		lockScriptNames: [],
		typeScriptNames: [],
	},
	{
		id: 'cota',
		name: 'CoTA',
		description: 'Compact Token Aggregator for efficient NFT management with minimal on-chain footprint.',
		sourceUrl: COTA_DOCS,
		cellPatterns: ['cota'],
		lockScriptNames: [],
		typeScriptNames: [],
	},
	{
		id: 'nostr',
		name: 'Nostr',
		description: 'Lock script using Nostr protocol keys for authentication.',
		sourceUrl: NOSTR_DOCS,
		cellPatterns: ['nostr'],
		lockScriptNames: [],
		typeScriptNames: [],
	},
	{
		id: 'rgbpp',
		name: 'RGB++',
		description: 'Protocol bridging Bitcoin assets to CKB using isomorphic binding.',
		sourceUrl: RGBPP_DOCS,
		cellPatterns: ['rgb++', 'btc time lock'],
		lockScriptNames: [],
		typeScriptNames: [],
	},
	{
		id: 'ckbfs',
		name: 'CKBFS',
		description: 'On-chain file system for storing and accessing data on CKB.',
		sourceUrl: CKBFS_DOCS,
		cellPatterns: ['ckbfs'],
		lockScriptNames: [],
		typeScriptNames: [],
	},
	{
		id: 'ickb',
		name: 'iCKB',
		description: 'NervosDAO liquidity protocol that tokenizes DAO deposits into transferable tokens.',
		sourceUrl: ICKB_DOCS,
		cellPatterns: ['ickb'],
		lockScriptNames: [],
		typeScriptNames: ['iCKB'],
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

export function WellKnownScriptsPage() {
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
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
			{/* Resource header. */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
							{definition.name}
						</h2>
						{definition.rfc && (
							<span className="px-1.5 py-0.5 text-xs font-medium bg-nervos/10 text-nervos rounded">
								RFC {definition.rfc}
							</span>
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
 * Row for a script item (lock or type).
 */
function ScriptItemRow({ item }: { item: ResourceItem }) {
	const typeLabel = item.type === 'lock_script' ? 'Lock Script' : 'Type Script';
	const typeBgColor = item.type === 'lock_script'
		? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
		: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400';

	return (
		<div className="p-4">
			<div className="flex items-center gap-2 mb-1 flex-wrap">
				<h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
				<span className={`px-1.5 py-0.5 text-xs font-medium rounded ${typeBgColor}`}>
					{typeLabel}
				</span>
				<span className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
					{item.hashType}
				</span>
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
	const categoryStyles = getCategoryStyles(item.category!);

	return (
		<div className="p-4">
			<div className="flex items-center gap-2 mb-1 flex-wrap">
				<h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
				<span className={`px-1.5 py-0.5 text-xs font-medium rounded ${categoryStyles.className}`}>
					{categoryStyles.label}
				</span>
			</div>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
				{item.description}
			</p>
			<OutPoint txHash={item.txHash!} index={item.index!} />
		</div>
	);
}

/**
 * Get category styles for badges.
 */
function getCategoryStyles(category: WellKnownCellCategory): { label: string; className: string } {
	switch (category) {
		case 'system':
			return {
				label: 'Binary',
				className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
			};
		case 'dep_group':
			return {
				label: 'Dep Group',
				className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
			};
		case 'protocol':
			return {
				label: 'Protocol',
				className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
			};
		default:
			return {
				label: 'Unknown',
				className: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
			};
	}
}
