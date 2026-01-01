import { useState, useEffect, useCallback } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import {
	formatNumber,
	truncateHex,
	truncateAddress,
	formatDifficulty,
	formatHashRate,
	formatDuration,
	formatCkb,
	parseEpoch,
	compactTargetToDifficulty,
} from '../lib/format';
import { encodeAddress } from '../lib/address';
import { TimeSlider } from '../components/TimeSlider';
import { navigate, generateLink } from '../lib/router';
import { useIsMobile } from '../hooks/ui';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonBlockItem, SkeletonTransactionItem } from '../components/Skeleton';
import { ErrorDisplay, ConnectionError } from '../components/ErrorDisplay';
import { RelativeTime } from '../components/RelativeTime';
import type { RpcBlock } from '../types/rpc';
import { POLL_INTERVAL_MS, HOME_ITEMS_TO_SHOW } from '../config';
import { BRAND } from '../lib/badgeStyles';

interface BlockInfo {
	number: bigint;
	hash: string;
	timestamp: bigint;
	transactionCount: number;
	minerAddress: string;
	reward: bigint;
}

interface TransactionInfo {
	hash: string;
	blockNumber: bigint;
	blockTimestamp: bigint;
	inputCount: number;
	outputCount: number;
	isCellbase: boolean;
	totalAmount: bigint;
}

interface NetworkStats {
	difficulty: string;
	epochNumber: bigint;
	epochIndex: bigint;
	epochLength: bigint;
}

export function HomePage() {
	const rpc = useRpc();
	const { isArchiveSupported, currentNetwork } = useNetwork();
	const { archiveHeight, tipBlockNumber, isLoading: archiveLoading, error: archiveError } = useArchive();
	const [blocks, setBlocks] = useState<BlockInfo[]>([]);
	const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
	const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
	const [blocksError, setBlocksError] = useState<Error | null>(null);
	const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
	const [avgBlockTime, setAvgBlockTime] = useState<number>(0);

	const networkType = currentNetwork?.type ?? 'mainnet';

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

			// Calculate average block time from timestamps.
			// Requires at least 2 blocks to calculate an average.
			if (validBlocks.length >= 2) {
				const firstTimestamp = BigInt(validBlocks[0].header.timestamp);
				const lastTimestamp = BigInt(validBlocks[validBlocks.length - 1].header.timestamp);
				const timeDiff = Number(firstTimestamp - lastTimestamp) / 1000; // Convert ms to seconds.
				const blockCount = validBlocks.length - 1;
				setAvgBlockTime(blockCount > 0 ? timeDiff / blockCount : 0);
			} else {
				// Reset to 0 when viewing single block (e.g., genesis).
				setAvgBlockTime(0);
			}

			// Extract epoch and difficulty info from the first block's header.
			// This ensures we show correct values for historical blocks.
			if (validBlocks.length > 0) {
				const epochParsed = parseEpoch(validBlocks[0].header.epoch);
				// Compute difficulty from the block header's compact_target for historical accuracy.
				const historicalDifficulty = compactTargetToDifficulty(validBlocks[0].header.compact_target);
				setNetworkStats({
					difficulty: historicalDifficulty,
					epochNumber: epochParsed.number,
					epochIndex: epochParsed.index,
					epochLength: epochParsed.length,
				});
			}

			// Extract block info with miner and reward.
			const blockInfos: BlockInfo[] = validBlocks.map((block) => {
				const cellbase = block.transactions[0];
				// Miner address is the lock script of the first cellbase output.
				const minerLock = cellbase?.outputs[0]?.lock;
				const minerAddress = minerLock
					? encodeAddress(minerLock, networkType)
					: '';
				// Block reward is the sum of all cellbase outputs.
				const reward = cellbase?.outputs.reduce(
					(sum, output) => sum + BigInt(output.capacity),
					0n
				) ?? 0n;

				return {
					number: BigInt(block.header.number),
					hash: block.header.hash,
					timestamp: BigInt(block.header.timestamp),
					transactionCount: block.transactions.length,
					minerAddress,
					reward,
				};
			});

			// Extract transactions from all blocks.
			// Per RFC0022: "a transaction is older if its position in a block is before another transaction."
			// So we iterate in reverse order (highest index first) to show newest transactions first.
			const txInfos: TransactionInfo[] = [];
			for (const block of validBlocks) {
				const blockNum = BigInt(block.header.number);
				const blockTime = BigInt(block.header.timestamp);
				for (let i = block.transactions.length - 1; i >= 0; i--) {
					const tx = block.transactions[i];
					if (tx.hash) {
						// Total amount is sum of all output capacities.
						const totalAmount = tx.outputs.reduce(
							(sum, output) => sum + BigInt(output.capacity),
							0n
						);
						txInfos.push({
							hash: tx.hash,
							blockNumber: blockNum,
							blockTimestamp: blockTime,
							inputCount: tx.inputs.length,
							outputCount: tx.outputs.length,
							isCellbase: i === 0,
							totalAmount,
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
	}, [rpc, displayTip, archiveHeight, networkType]);

	// Initial fetch and polling (skip polling in archive mode since historical data doesn't change).
	// Note: Tip polling is handled by ArchiveContext; we only poll for block data here.
	useEffect(() => {
		fetchBlocks();

		// Only poll for updates when viewing latest blocks.
		if (archiveHeight === undefined) {
			const interval = setInterval(fetchBlocks, POLL_INTERVAL_MS);
			return () => clearInterval(interval);
		}
	}, [fetchBlocks, archiveHeight]);

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

			{/* Stats section - 3 grouped cards. */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{/* Block stats. */}
				<StatGroup title={`Blocks${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
					<StatItem label={archiveHeight !== undefined ? 'Archive Height' : 'Tip Block'}>
						{displayTip !== null ? formatNumber(displayTip) : '...'}
					</StatItem>
					<StatItem label="Avg Block Time">
						{avgBlockTime > 0 ? `${avgBlockTime.toFixed(2)}s` : '...'}
					</StatItem>
				</StatGroup>

				{/* Epoch stats. */}
				<StatGroup title={`Epoch${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
					<StatItem label="Progress">
						{networkStats
							? <>
								{formatNumber(networkStats.epochNumber)}
								{networkStats.epochLength > 0n && (
									<span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
										{networkStats.epochIndex.toString()}/{networkStats.epochLength.toString()}
									</span>
								)}
							</>
							: '...'}
					</StatItem>
					<StatItem label="Est. Time Left">
						{networkStats && avgBlockTime > 0 && networkStats.epochLength > 0n
							? formatDuration(Number(networkStats.epochLength - networkStats.epochIndex) * avgBlockTime)
							: '—'}
					</StatItem>
				</StatGroup>

				{/* Mining stats. */}
				<StatGroup title={`Mining${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
					<StatItem label="Hash Rate">
						{networkStats && avgBlockTime > 0
							? formatHashRate(networkStats.difficulty, avgBlockTime)
							: '...'}
					</StatItem>
					<StatItem label="Difficulty">
						{networkStats ? formatDifficulty(networkStats.difficulty) : '...'}
					</StatItem>
				</StatGroup>
			</div>

			{/* Blocks list. */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<section>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						{`Latest Blocks${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}
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
						{`Latest Transactions${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}
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

function StatGroup({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
			<div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
				<h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
					{title}
				</h3>
			</div>
			<div className="p-4 grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-4">
				{children}
			</div>
		</div>
	);
}

function StatItem({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
			<p className="text-lg font-bold text-gray-900 dark:text-white">{children}</p>
		</div>
	);
}

function BlockListItem({ block }: { block: BlockInfo }) {
	// Truncate miner address for display (8...4 format).
	const truncatedMiner = block.minerAddress
		? truncateAddress(block.minerAddress)
		: '';

	const txLabel = block.transactionCount === 1 ? '1 txn' : `${block.transactionCount} txns`;
	const href = generateLink(`/block/${block.number}`);

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		// Allow default behavior for modifier keys (new tab) or middle click.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(href);
	};

	return (
		<a
			href={href}
			onClick={handleClick}
			className="block w-full min-h-[72px] sm:h-[72px] p-4 text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
		>
			<div className="flex items-center justify-between mb-1.5">
				<span className="text-base font-semibold text-nervos">
					{formatNumber(block.number)}
				</span>
				<span className="text-xs text-gray-400 dark:text-gray-500">
					<RelativeTime timestamp={block.timestamp} />
				</span>
			</div>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<span className="font-mono">{truncatedMiner}</span>
					<span className="text-gray-300 dark:text-gray-600">•</span>
					<span>{txLabel}</span>
				</div>
				<span className="text-xs font-medium text-gray-600 dark:text-gray-300">
					Reward {formatCkb(block.reward, 2)}
				</span>
			</div>
		</a>
	);
}

// Diamond emoji for cellbase (mining reward) on mobile.
function CellbaseIcon() {
	return <span>💎</span>;
}

function TransactionListItem({ tx }: { tx: TransactionInfo }) {
	const isMobile = useIsMobile();
	const inputLabel = isMobile ? `${tx.inputCount} in` : tx.inputCount === 1 ? '1 input' : `${tx.inputCount} inputs`;
	const outputLabel = isMobile ? `${tx.outputCount} out` : tx.outputCount === 1 ? '1 output' : `${tx.outputCount} outputs`;
	const href = generateLink(`/tx/${tx.hash}`);

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		// Allow default behavior for modifier keys (new tab) or middle click.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(href);
	};

	return (
		<a
			href={href}
			onClick={handleClick}
			className="block w-full min-h-[72px] sm:h-[72px] p-4 text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
		>
			<div className="flex items-center justify-between mb-1.5">
				<div className="flex items-center gap-2">
					<span className="font-mono text-sm font-medium text-nervos">
						{truncateHex(tx.hash, 8, 8)}
					</span>
					{tx.isCellbase && (
						<span className={`px-1.5 py-0.5 text-[10px] font-semibold ${BRAND} rounded inline-flex items-center`}>
							{isMobile ? <CellbaseIcon /> : 'Cellbase'}
						</span>
					)}
				</div>
				<span className="text-xs text-gray-400 dark:text-gray-500">
					<RelativeTime timestamp={tx.blockTimestamp} />
				</span>
			</div>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<span>Block {formatNumber(tx.blockNumber)}</span>
					{/* Hide input/output count for Cellbase - it's always 1/1 and semantically misleading. */}
					{!tx.isCellbase && (
						<>
							<span className="text-gray-300 dark:text-gray-600">•</span>
							<span>{inputLabel} / {outputLabel}</span>
						</>
					)}
				</div>
				<span className="text-xs font-medium text-gray-600 dark:text-gray-300">
					{formatCkb(tx.totalAmount, 2)}
				</span>
			</div>
		</a>
	);
}
