import { useState, useEffect, useCallback } from 'react';
import { useRpc } from '../contexts/NetworkContext';
import { formatNumber, truncateHex } from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonBlockItem, SkeletonTransactionItem } from '../components/Skeleton';
import { ErrorDisplay, ConnectionError } from '../components/ErrorDisplay';
import { RelativeTime } from '../components/RelativeTime';
import type { RpcBlock } from '../types/rpc';

const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL_MS || '8000', 10);
const ITEMS_TO_SHOW = 10;

interface BlockInfo {
	number: bigint;
	hash: string;
	timestamp: bigint;
	transactionCount: number;
}

export function HomePage() {
	const rpc = useRpc();
	const { tipBlockNumber, isLoading: archiveLoading, error: archiveError, refreshTip } = useArchive();
	const [blocks, setBlocks] = useState<BlockInfo[]>([]);
	const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
	const [blocksError, setBlocksError] = useState<Error | null>(null);

	// Fetch latest blocks.
	const fetchBlocks = useCallback(async () => {
		if (tipBlockNumber === null) return;

		try {
			setBlocksError(null);
			const blockPromises: Promise<RpcBlock | null>[] = [];

			// Fetch the latest N blocks.
			for (let i = 0; i < ITEMS_TO_SHOW; i++) {
				const blockNum = tipBlockNumber - BigInt(i);
				if (blockNum >= 0n) {
					blockPromises.push(rpc.getBlockByNumber(blockNum));
				}
			}

			const results = await Promise.all(blockPromises);
			const blockInfos: BlockInfo[] = results
				.filter((block): block is RpcBlock => block !== null)
				.map((block) => ({
					number: BigInt(block.header.number),
					hash: block.header.hash,
					timestamp: BigInt(block.header.timestamp),
					transactionCount: block.transactions.length,
				}));

			setBlocks(blockInfos);
		} catch (err) {
			setBlocksError(err instanceof Error ? err : new Error('Failed to fetch blocks.'));
		} finally {
			setIsLoadingBlocks(false);
		}
	}, [rpc, tipBlockNumber]);

	// Initial fetch and polling.
	useEffect(() => {
		fetchBlocks();
		const interval = setInterval(() => {
			refreshTip();
			fetchBlocks();
		}, POLL_INTERVAL);
		return () => clearInterval(interval);
	}, [fetchBlocks, refreshTip]);

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
			{/* Stats section. */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<StatCard title="Tip Block">
					{tipBlockNumber !== null ? formatNumber(tipBlockNumber) : '...'}
				</StatCard>
				<StatCard title="Latest Block Time">
					{blocks[0] ? <RelativeTime timestamp={blocks[0].timestamp} /> : '...'}
				</StatCard>
				<StatCard title="Transactions in Latest">
					{blocks[0] ? blocks[0].transactionCount.toString() : '...'}
				</StatCard>
			</div>

			{/* Latest blocks. */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<section>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Latest Blocks
					</h2>
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						{isLoadingBlocks ? (
							<>
								{[...Array(ITEMS_TO_SHOW)].map((_, i) => (
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

				{/* Latest transactions - simplified for now. */}
				<section>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Latest Transactions
					</h2>
					<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
						{isLoadingBlocks ? (
							<>
								{[...Array(ITEMS_TO_SHOW)].map((_, i) => (
									<SkeletonTransactionItem key={i} />
								))}
							</>
						) : blocksError ? (
							<div className="p-4">
								<ErrorDisplay error={blocksError} />
							</div>
						) : (
							blocks.slice(0, ITEMS_TO_SHOW).flatMap((block) =>
								block.transactionCount > 0 ? (
									<TransactionPlaceholder
										key={block.hash}
										blockNumber={block.number}
										blockHash={block.hash}
										transactionCount={block.transactionCount}
									/>
								) : []
							).slice(0, ITEMS_TO_SHOW)
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

function TransactionPlaceholder({
	blockNumber,
	blockHash,
	transactionCount,
}: {
	blockNumber: bigint;
	blockHash: string;
	transactionCount: number;
}) {
	const { archiveHeight } = useArchive();

	return (
		<button
			onClick={() => navigate(generateLink(`/block/${blockNumber}`, archiveHeight))}
			className="w-full h-[72px] p-4 text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
		>
			<div className="flex items-center justify-between mb-1">
				<span className="font-mono text-sm text-gray-600 dark:text-gray-300">
					{truncateHex(blockHash, 8, 8)}
				</span>
				<span className="text-xs text-gray-500 dark:text-gray-400">
					Block #{formatNumber(blockNumber)}
				</span>
			</div>
			<div className="text-sm text-gray-500 dark:text-gray-400">
				{transactionCount} transaction{transactionCount !== 1 ? 's' : ''} in this block
			</div>
		</button>
	);
}
