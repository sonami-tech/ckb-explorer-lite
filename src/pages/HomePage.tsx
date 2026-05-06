import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { fromHex } from '../lib/rpc';
import { TimeSlider } from '../components/TimeSlider';
import { navigate, generateLink } from '../lib/router';
import { useBreakpoint } from '../hooks/ui';
import { useArchive } from '../contexts/ArchiveContext';
import { useStats } from '../contexts/StatsContext';
import { SkeletonBlockItem, SkeletonTransactionItem } from '../components/Skeleton';
import { ErrorDisplay, ConnectionError } from '../components/ErrorDisplay';
import { FieldValue, loadingOrValue, type FieldState } from '../components/FieldValue';
import { RelativeTime } from '../components/RelativeTime';
import type { RpcBlock } from '../types/rpc';
import type { StatsAllGlobalResponse, StatsSupplyResponse } from '../types/stats';
import { HOME_ITEMS_TO_SHOW } from '../config';
import { useAppConfig } from '../contexts/AppConfigContext';
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
	const { pollIntervalMs } = useAppConfig();
	const { archiveHeight, tipBlockNumber, isLoading: archiveLoading, error: archiveError } = useArchive();
	const [blocks, setBlocks] = useState<BlockInfo[]>([]);
	const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
	const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
	const [blocksError, setBlocksError] = useState<Error | null>(null);
	const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
	const [avgBlockTime, setAvgBlockTime] = useState<number>(0);
	const [globalStats, setGlobalStats] = useState<StatsAllGlobalResponse | null>(null);
	const [supplyStats, setSupplyStats] = useState<StatsSupplyResponse | null>(null);

	const networkType = currentNetwork?.type ?? 'mainnet';
	const networkSlug = currentNetwork?.slug ?? '';
	const { statsClient, isStatsAvailable } = useStats();

	// Clear stale data and invalidate in-flight responses when the network or
	// archive height changes so boxes show loading indicators instead of data
	// from the previous network/height. The version ref lets late responses
	// from a previous fetch detect they are stale and bail out before commit.
	const fetchKey = `${networkSlug}:${archiveHeight ?? 'latest'}`;
	const prevFetchKeyRef = useRef<string>(fetchKey);
	const requestVersionRef = useRef(0);
	useEffect(() => {
		if (prevFetchKeyRef.current !== fetchKey) {
			prevFetchKeyRef.current = fetchKey;
			requestVersionRef.current++;
			setBlocks([]);
			setTransactions([]);
			setIsLoadingBlocks(true);
			setBlocksError(null);
			setNetworkStats(null);
			setAvgBlockTime(0);
			setGlobalStats(null);
			setSupplyStats(null);
		}
	}, [fetchKey]);

	// Determine which block to use as the starting point for display.
	// In archive mode, show blocks up to the archive height; otherwise show latest.
	const displayTip = archiveHeight !== undefined
		? BigInt(archiveHeight)
		: tipBlockNumber;

	// Fetch latest blocks with transaction hashes.
	const fetchBlocks = useCallback(async () => {
		if (displayTip === null) return;

		// Capture version at start; if a network/height change bumps it before
		// we resolve, our results belong to a stale network and must be dropped.
		const myVersion = requestVersionRef.current;

		try {
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

			// Compute the next average block time, network stats, blocks, and
			// transactions from the response. We compute everything first, then
			// commit in a single guarded block at the end so a stale response
			// can't partially overwrite fresh state.
			let nextAvgBlockTime = 0;
			if (validBlocks.length >= 2) {
				const firstTimestamp = BigInt(validBlocks[0].header.timestamp);
				const lastTimestamp = BigInt(validBlocks[validBlocks.length - 1].header.timestamp);
				const timeDiff = Number(firstTimestamp - lastTimestamp) / 1000; // Convert ms to seconds.
				const blockCount = validBlocks.length - 1;
				nextAvgBlockTime = blockCount > 0 ? timeDiff / blockCount : 0;
			}

			let nextNetworkStats: NetworkStats | null = null;
			if (validBlocks.length > 0) {
				const epochParsed = parseEpoch(validBlocks[0].header.epoch);
				// Compute difficulty from the block header's compact_target for historical accuracy.
				const historicalDifficulty = compactTargetToDifficulty(validBlocks[0].header.compact_target);
				nextNetworkStats = {
					difficulty: historicalDifficulty,
					epochNumber: epochParsed.number,
					epochIndex: epochParsed.index,
					epochLength: epochParsed.length,
				};
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

			// Single commit gate — bail if a network or height change has occurred.
			if (myVersion !== requestVersionRef.current) return;
			setBlocksError(null);
			setAvgBlockTime(nextAvgBlockTime);
			setNetworkStats(nextNetworkStats);
			setBlocks(blockInfos);
			setTransactions(txInfos.slice(0, HOME_ITEMS_TO_SHOW));
			setIsLoadingBlocks(false);
		} catch (err) {
			if (myVersion !== requestVersionRef.current) return;
			setBlocksError(err instanceof Error ? err : new Error('Failed to fetch blocks.'));
			setIsLoadingBlocks(false);
		}
	}, [rpc, displayTip, archiveHeight, networkType]);

	// Fetch global stats from stats server.
	const fetchStats = useCallback(async () => {
		if (!statsClient) return;

		const myVersion = requestVersionRef.current;

		try {
			const [globalResult, supplyResult] = await Promise.all([
				statsClient.getAllGlobalStats(archiveHeight),
				statsClient.getCirculatingSupply(archiveHeight),
			]);
			// Drop the response if a network or height change happened mid-flight.
			if (myVersion !== requestVersionRef.current) return;
			setGlobalStats(globalResult);
			setSupplyStats(supplyResult);
		} catch (err) {
			// Stats are supplementary - log error but don't block page.
			console.error('Failed to fetch stats:', err);
		}
	}, [statsClient, archiveHeight]);

	// Initial fetch and polling (skip polling in archive mode since historical data doesn't change).
	// Note: Tip polling is handled by ArchiveContext; we only poll for block data here.
	useEffect(() => {
		fetchBlocks();

		// Only poll for updates when viewing latest blocks.
		if (archiveHeight === undefined) {
			const interval = setInterval(fetchBlocks, pollIntervalMs);
			return () => clearInterval(interval);
		}
	}, [fetchBlocks, archiveHeight, pollIntervalMs]);

	// Fetch and poll stats (when stats server available).
	useEffect(() => {
		if (!isStatsAvailable) return;

		fetchStats();

		// Only poll for updates when viewing latest blocks.
		if (archiveHeight === undefined) {
			const interval = setInterval(fetchStats, pollIntervalMs);
			return () => clearInterval(interval);
		}
	}, [fetchStats, isStatsAvailable, archiveHeight, pollIntervalMs]);

	// Memoize hex→bigint conversions across polls — avoid re-parsing the same
	// hex strings on every interval tick or unrelated re-render.
	const parsedGlobalStats = useMemo(() => globalStats === null ? null : {
		totalAddresses: fromHex(globalStats.core.total_addresses),
		activeAddresses: fromHex(globalStats.core.active_addresses),
		totalLiveCells: fromHex(globalStats.core.total_live_cells),
		daoCells: fromHex(globalStats.core.dao_cells),
	}, [globalStats]);
	const parsedSupplyStats = useMemo(() => supplyStats === null ? null : {
		circulating: fromHex(supplyStats.circulating),
		daoLocked: fromHex(supplyStats.dao_locked),
	}, [supplyStats]);

	// Show connection error if initial load fails.
	if (archiveError && !archiveLoading) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-8">
				<ConnectionError onRetry={() => window.location.reload()} />
			</div>
		);
	}

	const tipBlockState = loadingOrValue(displayTip);
	const avgBlockTimeState = loadingOrValue(avgBlockTime > 0 ? avgBlockTime : null);
	const epochProgressState = loadingOrValue(networkStats);
	const difficultyState = loadingOrValue(networkStats?.difficulty);

	const estTimeLeftState: FieldState<number> = !networkStats
		? { kind: 'loading' }
		: avgBlockTime <= 0 || networkStats.epochLength <= 0n
			? { kind: 'uncomputable', reason: 'Time estimate requires block time and epoch length data.' }
			: { kind: 'value', value: Number(networkStats.epochLength - networkStats.epochIndex) * avgBlockTime };

	const hashRateState: FieldState<{ difficulty: string; avgBlockTime: number }> = !networkStats
		? { kind: 'loading' }
		: avgBlockTime <= 0
			? { kind: 'uncomputable', reason: 'Hash rate requires average block time.' }
			: { kind: 'value', value: { difficulty: networkStats.difficulty, avgBlockTime } };

	const totalAddressesState = loadingOrValue(parsedGlobalStats?.totalAddresses);
	const activeAddressesState = loadingOrValue(parsedGlobalStats?.activeAddresses);
	const totalLiveCellsState = loadingOrValue(parsedGlobalStats?.totalLiveCells);
	const daoCellsState = loadingOrValue(parsedGlobalStats?.daoCells);
	const circulatingState = loadingOrValue(parsedSupplyStats?.circulating);
	const daoLockedState = loadingOrValue(parsedSupplyStats?.daoLocked);

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Time slider for archive networks - positioned above stats. */}
			{isArchiveSupported && <TimeSlider className="mb-4" />}

			{/* Stats section - 3 grouped cards. */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{/* Block stats. */}
				<StatGroup title={`Blocks${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
					<StatItem label={archiveHeight !== undefined ? 'Archive Height' : 'Tip Block'}>
						<FieldValue
							state={tipBlockState}
							format={(v) => formatNumber(v)}
							width="medium"
							label={archiveHeight !== undefined ? 'archive height' : 'tip block'}
						/>
					</StatItem>
					<StatItem label="Avg Block Time">
						<FieldValue
							state={avgBlockTimeState}
							format={(v) => `${v.toFixed(2)}s`}
							width="narrow"
							label="average block time"
						/>
					</StatItem>
				</StatGroup>

				{/* Epoch stats. */}
				<StatGroup title={`Epoch${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
					<StatItem label="Progress">
						<FieldValue
							state={epochProgressState}
							format={(stats) => stats !== null ? (
								<>
									{formatNumber(stats.epochNumber)}
									{stats.epochLength > 0n && (
										<span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
											{stats.epochIndex.toString()}/{stats.epochLength.toString()}
										</span>
									)}
								</>
							) : null}
							width="medium"
							label="epoch progress"
						/>
					</StatItem>
					<StatItem label="Est. Time Left">
						<FieldValue
							state={estTimeLeftState}
							format={(seconds) => formatDuration(seconds)}
							width="medium"
							label="estimated time left"
						/>
					</StatItem>
				</StatGroup>

				{/* Mining stats. */}
				<StatGroup title={`Mining${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
					<StatItem label="Hash Rate">
						<FieldValue
							state={hashRateState}
							format={({ difficulty, avgBlockTime }) => formatHashRate(difficulty, avgBlockTime)}
							width="medium"
							label="hash rate"
						/>
					</StatItem>
					<StatItem label="Difficulty">
						<FieldValue
							state={difficultyState}
							format={(v) => formatDifficulty(v)}
							width="medium"
							label="difficulty"
						/>
					</StatItem>
				</StatGroup>

				{isStatsAvailable && (
					<>
						{/* Network stats from stats server. */}
						<StatGroup title={`Network${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
							<StatItem label="Total Addresses">
								<FieldValue
									state={totalAddressesState}
									format={(v) => formatNumber(v)}
									width="medium"
									label="total addresses"
								/>
							</StatItem>
							<StatItem label="Active Addresses">
								<FieldValue
									state={activeAddressesState}
									format={(v) => formatNumber(v)}
									width="medium"
									label="active addresses"
								/>
							</StatItem>
						</StatGroup>

						{/* Cell stats from stats server. */}
						<StatGroup title={`Cells${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
							<StatItem label="Total Live Cells">
								<FieldValue
									state={totalLiveCellsState}
									format={(v) => formatNumber(v)}
									width="medium"
									label="total live cells"
								/>
							</StatItem>
							<StatItem label="DAO Cells">
								<FieldValue
									state={daoCellsState}
									format={(v) => formatNumber(v)}
									width="medium"
									label="DAO cells"
								/>
							</StatItem>
						</StatGroup>

						{/* Supply stats from stats server. */}
						<StatGroup title={`Supply${archiveHeight !== undefined ? ` @ Block ${formatNumber(archiveHeight)}` : ''}`}>
							<StatItem label="Circulating">
								<FieldValue
									state={circulatingState}
									format={(v) => formatCkb(v, 0)}
									width="medium"
									label="circulating supply"
								/>
							</StatItem>
							<StatItem label="DAO Locked">
								<FieldValue
									state={daoLockedState}
									format={(v) => formatCkb(v, 0)}
									width="medium"
									label="DAO locked supply"
								/>
							</StatItem>
						</StatGroup>
					</>
				)}
			</div>

			{/* Blocks list. */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

// Pickaxe emoji for cellbase (mining reward) on mobile.
function CellbaseIcon() {
	return <span>⛏️</span>;
}

function TransactionListItem({ tx }: { tx: TransactionInfo }) {
	const breakpoint = useBreakpoint();
	const isCompact = breakpoint !== 'desktop';
	const inputLabel = isCompact ? `${tx.inputCount} in` : tx.inputCount === 1 ? '1 input' : `${tx.inputCount} inputs`;
	const outputLabel = isCompact ? `${tx.outputCount} out` : tx.outputCount === 1 ? '1 output' : `${tx.outputCount} outputs`;
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
						isCompact ? (
							<CellbaseIcon />
						) : (
							<span className={`px-1.5 py-0.5 text-[10px] font-semibold ${BRAND} rounded`}>
								Cellbase
							</span>
						)
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
