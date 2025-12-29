/**
 * Page displaying all well-known scripts and cells in the CKB ecosystem.
 * Provides a reference for developers and users to understand system scripts.
 */

import { useMemo } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { navigate, generateLink } from '../lib/router';
import { truncateHex } from '../lib/format';
import { HashDisplay } from '../components/CopyButton';
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
 * Get category styles for badges.
 */
function getCategoryStyles(category: WellKnownCellCategory): { label: string; className: string } {
	switch (category) {
		case 'system':
			return {
				label: 'System',
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

export function WellKnownScriptsPage() {
	const { currentNetwork } = useNetwork();
	const networkType = currentNetwork?.type ?? 'mainnet';
	const registryNetwork = toRegistryNetwork(networkType);

	// Get scripts and cells for current network.
	const lockScripts = useMemo(() => {
		const scripts = KNOWN_LOCK_SCRIPTS[registryNetwork];
		return Object.entries(scripts).map(([codeHash, info]) => ({
			codeHash,
			...info,
		}));
	}, [registryNetwork]);

	const typeScripts = useMemo(() => {
		const scripts = KNOWN_TYPE_SCRIPTS[registryNetwork];
		return Object.entries(scripts).map(([codeHash, info]) => ({
			codeHash,
			...info,
		}));
	}, [registryNetwork]);

	const wellKnownCells = useMemo(() => {
		const cells = WELL_KNOWN_CELLS[registryNetwork];
		return Object.entries(cells).map(([key, info]) => {
			const [txHash, indexStr] = key.split(':');
			return {
				txHash,
				index: parseInt(indexStr, 10),
				...info,
			};
		});
	}, [registryNetwork]);

	// Group cells by category.
	const systemCells = wellKnownCells.filter((c) => c.category === 'system');
	const depGroupCells = wellKnownCells.filter((c) => c.category === 'dep_group');
	const protocolCells = wellKnownCells.filter((c) => c.category === 'protocol');

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header. */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<button onClick={() => navigate(generateLink('/'))} className="hover:text-nervos">
						Home
					</button>
					<span>/</span>
					<span>Well-Known Scripts</span>
				</div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Well-Known Scripts and Cells
				</h1>
				<p className="text-gray-600 dark:text-gray-400">
					Reference for system scripts, protocol implementations, and important cells on {networkType === 'mainnet' ? 'Mainnet' : 'Testnet'}.
				</p>
			</div>

			{/* Lock Scripts Section. */}
			<section className="mb-8">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					Lock Scripts
				</h2>
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{lockScripts.map((script) => (
							<ScriptRow
								key={script.codeHash}
								codeHash={script.codeHash}
								name={script.name}
								description={script.description}
								hashType={script.hashType}
								sourceUrl={script.sourceUrl}
							/>
						))}
					</div>
				</div>
			</section>

			{/* Type Scripts Section. */}
			<section className="mb-8">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					Type Scripts
				</h2>
				<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
					<div className="divide-y divide-gray-200 dark:divide-gray-700">
						{typeScripts.map((script) => (
							<ScriptRow
								key={script.codeHash}
								codeHash={script.codeHash}
								name={script.name}
								description={script.description}
								hashType={script.hashType}
								sourceUrl={script.sourceUrl}
							/>
						))}
					</div>
				</div>
			</section>

			{/* Well-Known Cells Section. */}
			<section className="mb-8">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
					Well-Known Cells
				</h2>

				{/* System Cells. */}
				<div className="mb-6">
					<h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
						System Cells
					</h3>
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{systemCells.map((cell) => (
								<CellRow
									key={`${cell.txHash}:${cell.index}`}
									txHash={cell.txHash}
									index={cell.index}
									name={cell.name}
									description={cell.description}
									category={cell.category}
									rfc={cell.rfc}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Dep Group Cells. */}
				<div className="mb-6">
					<h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
						Dependency Groups
					</h3>
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{depGroupCells.map((cell) => (
								<CellRow
									key={`${cell.txHash}:${cell.index}`}
									txHash={cell.txHash}
									index={cell.index}
									name={cell.name}
									description={cell.description}
									category={cell.category}
									rfc={cell.rfc}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Protocol Cells. */}
				<div className="mb-6">
					<h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
						Protocol Cells
					</h3>
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						<div className="divide-y divide-gray-200 dark:divide-gray-700">
							{protocolCells.map((cell) => (
								<CellRow
									key={`${cell.txHash}:${cell.index}`}
									txHash={cell.txHash}
									index={cell.index}
									name={cell.name}
									description={cell.description}
									category={cell.category}
									rfc={cell.rfc}
								/>
							))}
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

/**
 * Row component for displaying a script.
 */
function ScriptRow({
	codeHash,
	name,
	description,
	hashType,
	sourceUrl,
}: {
	codeHash: string;
	name: string;
	description: string;
	hashType: string;
	sourceUrl?: string;
}) {
	return (
		<div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<h4 className="font-semibold text-nervos">{name}</h4>
						<span className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
							{hashType}
						</span>
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
						{description}
					</p>
					<div className="font-mono text-xs text-gray-500 dark:text-gray-500">
						<HashDisplay hash={codeHash} responsive />
					</div>
				</div>
				{sourceUrl && (
					<a
						href={sourceUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="flex-shrink-0 p-2 text-gray-400 hover:text-nervos transition-colors"
						title="View documentation"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>
				)}
			</div>
		</div>
	);
}

/**
 * Row component for displaying a well-known cell.
 */
function CellRow({
	txHash,
	index,
	name,
	description,
	category,
	rfc,
}: {
	txHash: string;
	index: number;
	name: string;
	description: string;
	category: WellKnownCellCategory;
	rfc?: string;
}) {
	const categoryStyles = getCategoryStyles(category);
	const cellUrl = generateLink(`/cell/${txHash}/${index}`);

	const handleClick = (e: React.MouseEvent) => {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(cellUrl);
	};

	return (
		<a
			href={cellUrl}
			onClick={handleClick}
			className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1 flex-wrap">
						<h4 className="font-semibold text-nervos">{name}</h4>
						<span className={`px-1.5 py-0.5 text-xs font-medium rounded ${categoryStyles.className}`}>
							{categoryStyles.label}
						</span>
						{rfc && (
							<span className="px-1.5 py-0.5 text-xs font-medium bg-nervos/10 text-nervos rounded">
								RFC {rfc}
							</span>
						)}
					</div>
					<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
						{description}
					</p>
					<div className="font-mono text-xs text-gray-500 dark:text-gray-500">
						{truncateHex(txHash, 8, 8)}:{index}
					</div>
				</div>
				<div className="flex-shrink-0 p-2 text-gray-400">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</div>
		</a>
	);
}
