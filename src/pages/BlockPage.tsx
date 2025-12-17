import { useState, useEffect, useCallback } from 'react';
import { useRpc } from '../contexts/NetworkContext';
import {
	formatNumber,
	formatRelativeTime,
	formatAbsoluteTime,
	formatEpoch,
	truncateHex,
	isValidHex,
} from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay } from '../components/CopyButton';
import type { RpcBlock, RpcTransaction } from '../types/rpc';

interface BlockPageProps {
	id: string;
}

export function BlockPage({ id }: BlockPageProps) {
	const rpc = useRpc();
	const { archiveHeight } = useArchive();
	const [block, setBlock] = useState<RpcBlock | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [expandedTx, setExpandedTx] = useState<Set<number>>(new Set());

	const fetchBlock = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			let result: RpcBlock | null = null;

			// Check if id is a number or hash.
			if (/^\d+$/.test(id)) {
				result = await rpc.getBlockByNumber(BigInt(id), archiveHeight);
			} else if (isValidHex(id)) {
				result = await rpc.getBlockByHash(id, archiveHeight);
			} else {
				throw new Error('Invalid block identifier. Please provide a block number or hash.');
			}

			if (!result) {
				throw new Error(`Block not found: ${id}`);
			}

			setBlock(result);
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Failed to fetch block.'));
		} finally {
			setIsLoading(false);
		}
	}, [rpc, id, archiveHeight]);

	useEffect(() => {
		fetchBlock();
	}, [fetchBlock]);

	const toggleTx = (index: number) => {
		setExpandedTx((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	};

	if (isLoading) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<SkeletonDetail />
			</div>
		);
	}

	if (error) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<ErrorDisplay error={error} title="Block not found" onRetry={fetchBlock} />
			</div>
		);
	}

	if (!block) {
		return null;
	}

	const { header, transactions, proposals } = block;
	const blockNumber = BigInt(header.number);
	const timestamp = BigInt(header.timestamp);

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header. */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<button onClick={() => navigate(generateLink('/'))} className="hover:text-nervos">
						Home
					</button>
					<span>/</span>
					<span>Block</span>
				</div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Block #{formatNumber(blockNumber)}
				</h1>
			</div>

			{/* Block details. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Block Details</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="Block Hash">
						<HashDisplay hash={header.hash} truncate={false} />
					</DetailRow>
					<DetailRow label="Block Number">
						{formatNumber(blockNumber)}
					</DetailRow>
					<DetailRow label="Timestamp">
						<span>{formatAbsoluteTime(timestamp)}</span>
						<span className="text-gray-500 dark:text-gray-400 ml-2">
							({formatRelativeTime(timestamp)})
						</span>
					</DetailRow>
					<DetailRow label="Epoch">
						{formatEpoch(header.epoch)}
					</DetailRow>
					<DetailRow label="Transactions">
						{transactions.length}
					</DetailRow>
					<DetailRow label="Proposals">
						{proposals.length}
					</DetailRow>
					<DetailRow label="Parent Hash">
						<button
							onClick={() => navigate(generateLink(`/block/${header.parent_hash}`, archiveHeight))}
							className="text-nervos hover:underline"
						>
							<HashDisplay hash={header.parent_hash} />
						</button>
					</DetailRow>
					<DetailRow label="Transactions Root">
						<HashDisplay hash={header.transactions_root} />
					</DetailRow>
					<DetailRow label="Compact Target">
						{header.compact_target}
					</DetailRow>
					<DetailRow label="Nonce">
						{header.nonce}
					</DetailRow>
				</div>
			</div>

			{/* Transactions. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Transactions ({transactions.length})
					</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{transactions.map((tx, index) => (
						<TransactionRow
							key={index}
							tx={tx}
							index={index}
							isExpanded={expandedTx.has(index)}
							onToggle={() => toggleTx(index)}
							archiveHeight={archiveHeight}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col md:flex-row md:items-center p-4 gap-2">
			<span className="w-40 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
				{label}
			</span>
			<div className="flex-1 text-sm text-gray-900 dark:text-white break-all">
				{children}
			</div>
		</div>
	);
}

function TransactionRow({
	tx,
	index,
	isExpanded,
	onToggle,
	archiveHeight,
}: {
	tx: RpcTransaction;
	index: number;
	isExpanded: boolean;
	onToggle: () => void;
	archiveHeight: number | undefined;
}) {
	return (
		<div className="p-4">
			<div
				className="flex items-center justify-between cursor-pointer"
				onClick={onToggle}
			>
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
						#{index}
					</span>
					{index === 0 && (
						<span className="px-2 py-0.5 text-xs font-medium bg-nervos/10 text-nervos rounded">
							Cellbase
						</span>
					)}
				</div>
				<div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
					<span>{tx.inputs.length} inputs</span>
					<span>{tx.outputs.length} outputs</span>
					<svg
						className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</div>
			</div>

			{isExpanded && (
				<div className="mt-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-4">
					{/* Inputs. */}
					<div>
						<h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
							Inputs ({tx.inputs.length})
						</h4>
						{tx.inputs.map((input, i) => (
							<div key={i} className="text-xs text-gray-600 dark:text-gray-300 mb-1">
								{index === 0 ? (
									<span className="italic">Cellbase (no input)</span>
								) : (
									<button
										onClick={(e) => {
											e.stopPropagation();
											navigate(generateLink(
												`/cell/${input.previous_output.tx_hash}/${parseInt(input.previous_output.index, 16)}`,
												archiveHeight
											));
										}}
										className="text-nervos hover:underline font-mono"
									>
										{truncateHex(input.previous_output.tx_hash, 8, 8)}:{parseInt(input.previous_output.index, 16)}
									</button>
								)}
							</div>
						))}
					</div>

					{/* Outputs. */}
					<div>
						<h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
							Outputs ({tx.outputs.length})
						</h4>
						{tx.outputs.map((output, i) => (
							<div key={i} className="text-xs text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-2">
								<span className="text-gray-400">#{i}</span>
								<span className="font-mono">
									{(BigInt(output.capacity) / 100_000_000n).toString()} CKB
								</span>
								<span className="text-gray-400 font-mono text-xs">
									Lock: {truncateHex(output.lock.code_hash, 4, 4)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
