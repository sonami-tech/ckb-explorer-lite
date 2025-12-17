import { useState, useEffect, useCallback } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { formatNumber, truncateHex } from '../lib/format';
import { TimeSlider } from '../components/TimeSlider';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonBlockItem, SkeletonTransactionItem } from '../components/Skeleton';
import { ErrorDisplay, ConnectionError } from '../components/ErrorDisplay';
import { RelativeTime } from '../components/RelativeTime';
import type { RpcBlock } from '../types/rpc';
import { POLL_INTERVAL_MS, HOME_ITEMS_TO_SHOW } from '../config';

interface BlockInfo {
	number: bigint;
	hash: string;
	timestamp: bigint;
	transactionCount: number;
}

interface TransactionInfo {
	hash: string;
	blockNumber: bigint;
	blockTimestamp: bigint;
	inputCount: number;
	outputCount: number;
	isCellbase: boolean;
}

export function HomePage() {
	const rpc = useRpc();
	const { isArchiveSupported } = useNetwork();
	const { archiveHeight, tipBlockNumber, isLoading: archiveLoading, error: archiveError, refreshTip } = useArchive();
	const [blocks, setBlocks] = useState<BlockInfo[]>([]);
	const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
	const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
	const [blocksError, setBlocksError] = useState<Error | null>(null);

	// Determine which block to use as the starting point for display.
	// In archive mode, show blocks up to the archive height; otherwise show latest.
	const displayTip = archiveHeight !== undefined
		? BigInt(archiveHeight)
		: tipBlockNumber;

	// Fetch latest blocks with transaction hashes.
	const fetchBlocks = useCallback(async () => {
		if (displayTip === null) return;

		try {
			setBlocksError(null);
			const blockPromises: Promise<RpcBlock | null>[] = [];

			// Fetch blocks starting from displayTip with transaction hashes.
			for (let i = 0; i < HOME_ITEMS_TO_SHOW; i++) {
				const blockNum = displayTip - BigInt(i);
				if (blockNum >= 0n) {
					blockPromises.push(rpc.getBlockByNumber(blockNum, archiveHeight, true));
				}
			}

			const results = await Promise.all(blockPromises);
			const validBlocks = results.filter((block): block is RpcBlock => block !== null);

			// Extract block info.
			const blockInfos: BlockInfo[] = validBlocks.map((block) => ({
				number: BigInt(block.header.number),
				hash: block.header.hash,
				timestamp: BigInt(block.header.timestamp),
				transactionCount: block.transactions.length,
			}));

			// Extract transactions from all blocks.
			const txInfos: TransactionInfo[] = [];
			for (const block of validBlocks) {
				const blockNum = BigInt(block.header.number);
				const blockTime = BigInt(block.header.timestamp);
				for (let i = 0; i < block.transactions.length; i++) {
					const tx = block.transactions[i];
					if (tx.hash) {
						txInfos.push({
							hash: tx.hash,
							blockNumber: blockNum,
							blockTimestamp: blockTime,
							inputCount: tx.inputs.length,
							outputCount: tx.outputs.length,
							isCellbase: i === 0,
						});
					}
				}
			}

			setBlocks(blockInfos);
			setTransactions(txInfos.slice(0, HOME_ITEMS_TO_SHOW));
		} catch (err) {
			setBlocksError(err instanceof Error ? err : new Error('Failed to fetch blocks.'));
		} finally {
			setIsLoadingBlocks(false);
		}
	}, [rpc, displayTip, archiveHeight]);

	// Initial fetch and polling (skip polling in archive mode since historical data doesn't change).
	useEffect(() => {
		fetchBlocks();

		// Only poll for updates when viewing latest blocks.
		if (archiveHeight === undefined) {
			const interval = setInterval(() => {
				refreshTip();
				fetchBlocks();
			}, POLL_INTERVAL_MS);
			return () => clearInterval(interval);
		}
	}, [fetchBlocks, refreshTip, archiveHeight]);

	// Show connection error if initial load fails.
	if (archiveError && !archiveLoading) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-8">
				<ConnectionError onRetry={() => window.location.reload()} />
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Time slider for archive networks - positioned above stats. */}
			{isArchiveSupported && <TimeSlider className="mb-4" />}

			{/* Stats section. */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<StatCard title={archiveHeight !== undefined ? 'Archive Height' : 'Tip Block'}>
					{displayTip !== null ? formatNumber(displayTip) : '...'}
				</StatCard>
				<StatCard title={archiveHeight !== undefined ? 'Block Time' : 'Latest Block Time'}>
					{blocks[0] ? <RelativeTime timestamp={blocks[0].timestamp} /> : '...'}
				</StatCard>
				<StatCard title={archiveHeight !== undefined ? 'Transactions in Block' : 'Transactions in Latest'}>
					{blocks[0] ? blocks[0].transactionCount.toString() : '...'}
				</StatCard>
			</div>

			{/* Blocks list. */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<section>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						{archiveHeight !== undefined ? 'Blocks at Archive Height' : 'Latest Blocks'}
					</h2>
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						{isLoadingBlocks ? (
							<>
								{[...Array(HOME_ITEMS_TO_SHOW)].map((_, i) => (
									<SkeletonBlockItem key={i} />
								))}
							</>
						) : blocksError ? (
							<div className="p-4">
								<ErrorDisplay error={blocksError} onRetry={fetchBlocks} />
							</div>
						) : (
							blocks.map((block) => (
								<BlockListItem key={block.hash} block={block} />
							))
						)}
					</div>
				</section>

				{/* Transactions list. */}
				<section>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						{archiveHeight !== undefined ? 'Transactions at Archive Height' : 'Latest Transactions'}
					</h2>
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						{isLoadingBlocks ? (
							<>
								{[...Array(HOME_ITEMS_TO_SHOW)].map((_, i) => (
									<SkeletonTransactionItem key={i} />
								))}
							</>
						) : blocksError ? (
							<div className="p-4">
								<ErrorDisplay error={blocksError} />
							</div>
						) : (
							transactions.map((tx) => (
								<TransactionListItem key={tx.hash} tx={tx} />
							))
						)}
					</div>
				</section>
			</div>
		</div>
	);
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
			<p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
			<p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{children}</p>
		</div>
	);
}

function BlockListItem({ block }: { block: BlockInfo }) {
	const { archiveHeight } = useArchive();

	return (
		<button
			onClick={() => navigate(generateLink(`/block/${block.number}`, archiveHeight))}
			className="w-full h-[72px] p-4 text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
		>
			<div className="flex items-center justify-between mb-1">
				<span className="font-medium text-nervos">
					#{formatNumber(block.number)}
				</span>
				<span className="text-sm text-gray-500 dark:text-gray-400">
					<RelativeTime timestamp={block.timestamp} />
				</span>
			</div>
			<div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
				<span className="font-mono">{truncateHex(block.hash, 8, 8)}</span>
				<span>{block.transactionCount} txns</span>
			</div>
		</button>
	);
}

function TransactionListItem({ tx }: { tx: TransactionInfo }) {
	const { archiveHeight } = useArchive();

	return (
		<button
			onClick={() => navigate(generateLink(`/tx/${tx.hash}`, archiveHeight))}
			className="w-full h-[72px] p-4 text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
		>
			<div className="flex items-center justify-between mb-1">
				<div className="flex items-center gap-2">
					<span className="font-mono text-sm text-nervos">
						{truncateHex(tx.hash, 8, 8)}
					</span>
					{tx.isCellbase && (
						<span className="px-1.5 py-0.5 text-xs font-medium bg-nervos/10 text-nervos rounded">
							Cellbase
						</span>
					)}
				</div>
				<span className="text-sm text-gray-500 dark:text-gray-400">
					<RelativeTime timestamp={tx.blockTimestamp} />
				</span>
			</div>
			<div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
				<span>Block #{formatNumber(tx.blockNumber)}</span>
				<span>{tx.inputCount} inputs</span>
				<span>{tx.outputCount} outputs</span>
			</div>
		</button>
	);
}
