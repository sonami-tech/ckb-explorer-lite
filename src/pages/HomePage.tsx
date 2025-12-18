import { useState, useEffect, useCallback } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import {
	formatNumber,
	truncateHex,
	formatDifficulty,
	formatHashRate,
	formatDuration,
	formatCkb,
	parseEpoch,
} from '../lib/format';
import { encodeAddress } from '../lib/address';
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
	const { archiveHeight, tipBlockNumber, isLoading: archiveLoading, error: archiveError, refreshTip } = useArchive();
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

	// Fetch network stats (blockchain info only - epoch comes from block header).
	const fetchNetworkStats = useCallback(async () => {
		try {
			const blockchainInfo = await rpc.getBlockchainInfo();
			// Only update difficulty here; epoch is set from block header in fetchBlocks.
			setNetworkStats((prev) => ({
				difficulty: blockchainInfo.difficulty,
				epochNumber: prev?.epochNumber ?? 0n,
				epochIndex: prev?.epochIndex ?? 0n,
				epochLength: prev?.epochLength ?? 0n,
			}));
		} catch {
			// Network stats are optional, don't fail the whole page.
		}
	}, [rpc]);

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
			if (validBlocks.length >= 2) {
				const firstTimestamp = BigInt(validBlocks[0].header.timestamp);
				const lastTimestamp = BigInt(validBlocks[validBlocks.length - 1].header.timestamp);
				const timeDiff = Number(firstTimestamp - lastTimestamp) / 1000; // Convert ms to seconds.
				const blockCount = validBlocks.length - 1;
				setAvgBlockTime(blockCount > 0 ? timeDiff / blockCount : 0);
			}

			// Extract epoch info from the first block's header.
			// This ensures we show correct epoch for historical blocks.
			if (validBlocks.length > 0) {
				const epochParsed = parseEpoch(validBlocks[0].header.epoch);
				setNetworkStats((prev) => ({
					difficulty: prev?.difficulty ?? '0x0',
					epochNumber: epochParsed.number,
					epochIndex: epochParsed.index,
					epochLength: epochParsed.length,
				}));
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
			const txInfos: TransactionInfo[] = [];
			for (const block of validBlocks) {
				const blockNum = BigInt(block.header.number);
				const blockTime = BigInt(block.header.timestamp);
				for (let i = 0; i < block.transactions.length; i++) {
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
	useEffect(() => {
		fetchBlocks();
		fetchNetworkStats();

		// Only poll for updates when viewing latest blocks.
		if (archiveHeight === undefined) {
			const interval = setInterval(() => {
				refreshTip();
				fetchBlocks();
				fetchNetworkStats();
			}, POLL_INTERVAL_MS);
			return () => clearInterval(interval);
		}
	}, [fetchBlocks, fetchNetworkStats, refreshTip, archiveHeight]);

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
				<StatGroup title="Blocks">
					<StatItem label={archiveHeight !== undefined ? 'Archive Height' : 'Tip Block'}>
						{displayTip !== null ? formatNumber(displayTip) : '...'}
					</StatItem>
					<StatItem label="Avg Block Time">
						{avgBlockTime > 0 ? `${avgBlockTime.toFixed(2)}s` : '...'}
					</StatItem>
				</StatGroup>

				{/* Epoch stats. */}
				<StatGroup title="Epoch">
					<StatItem label="Progress">
						{networkStats
							? `${formatNumber(networkStats.epochNumber)} (${networkStats.epochIndex}/${networkStats.epochLength})`
							: '...'}
					</StatItem>
					<StatItem label="Est. Time Left">
						{networkStats && avgBlockTime > 0
							? formatDuration(Number(networkStats.epochLength - networkStats.epochIndex) * avgBlockTime)
							: '...'}
					</StatItem>
				</StatGroup>

				{/* Mining stats. */}
				<StatGroup title="Mining">
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

function StatGroup({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
			<div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
				<h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
					{title}
				</h3>
			</div>
			<div className="p-4 grid grid-cols-2 gap-4">
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
	const { archiveHeight } = useArchive();

	// Truncate miner address for display.
	const truncatedMiner = block.minerAddress
		? block.minerAddress.slice(0, 8) + '...' + block.minerAddress.slice(-6)
		: '';

	const txLabel = block.transactionCount === 1 ? '1 txn' : `${block.transactionCount} txns`;
	const href = generateLink(`/block/${block.number}`, archiveHeight);

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
					#{formatNumber(block.number)}
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

function TransactionListItem({ tx }: { tx: TransactionInfo }) {
	const { archiveHeight } = useArchive();

	const inputLabel = tx.inputCount === 1 ? '1 input' : `${tx.inputCount} inputs`;
	const outputLabel = tx.outputCount === 1 ? '1 output' : `${tx.outputCount} outputs`;
	const href = generateLink(`/tx/${tx.hash}`, archiveHeight);

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
						<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-nervos/10 text-nervos rounded">
							Cellbase
						</span>
					)}
				</div>
				<span className="text-xs text-gray-400 dark:text-gray-500">
					<RelativeTime timestamp={tx.blockTimestamp} />
				</span>
			</div>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<span>Block #{formatNumber(tx.blockNumber)}</span>
					<span className="text-gray-300 dark:text-gray-600">•</span>
					<span>{inputLabel} / {outputLabel}</span>
				</div>
				<span className="text-xs font-medium text-gray-600 dark:text-gray-300">
					{formatCkb(tx.totalAmount, 2)}
				</span>
			</div>
		</a>
	);
}
