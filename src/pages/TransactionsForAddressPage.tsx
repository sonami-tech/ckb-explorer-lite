import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { parseAddress } from '../lib/address';
import { formatNumber, formatActivitySpan, formatCkb } from '../lib/format';
import { DetailRow } from '../components/DetailRow';
import { AddressDisplay } from '../components/AddressDisplay';
import { getDaoTypeScript } from '../lib/wellKnown';
import { generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { InternalLink } from '../components/InternalLink';
import { ChevronDownIcon } from '../components/CopyButton';
import { PAGE_SIZE_CONFIG } from '../config/defaults';
import {
	TransactionRow,
	calculateTotalOutputCapacity,
	extractLockScripts,
	extractTypeScripts,
	isCellbaseTransaction,
	type EnrichedTransaction,
} from '../components/TransactionRow';
import {
	DEFAULT_ADDRESS_FILTERS,
	DEFAULT_ADDRESS_SORT,
	buildIndexerFilter,
	type AddressPageFilters,
	type AddressPageSort,
} from '../components/AddressTransactionFilters';
import { FilterSortButton } from '../components/FilterSortButton';
import { AddressFilterModal } from '../components/AddressFilterModal';
import { ActiveFilterChips, type FilterChip } from '../components/ActiveFilterChips';
import type { RpcScript, RpcGroupedTransactionInfo, IndexerSearchKey } from '../types/rpc';

interface TransactionsForAddressPageProps {
	address: string;
}

const STORAGE_KEY = 'ckb-explorer-txs-page-size';

function getStoredPageSize(): number {
	const stored = localStorage.getItem(STORAGE_KEY);
	const parsed = parseInt(stored ?? '', 10);
	if (PAGE_SIZE_CONFIG.options.includes(parsed as 5 | 10 | 20 | 50 | 100)) {
		return parsed;
	}
	return PAGE_SIZE_CONFIG.default;
}

export function TransactionsForAddressPage({ address }: TransactionsForAddressPageProps) {
	const rpc = useRpc();
	const { currentNetwork } = useNetwork();
	const { archiveHeight } = useArchive();
	const networkType = currentNetwork?.type ?? 'mainnet';
	const [script, setScript] = useState<RpcScript | null>(null);
	const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
	const [transactionCount, setTransactionCount] = useState<bigint | null>(null);
	const [cursor, setCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [pageSize, setPageSize] = useState(getStoredPageSize);
	const [referenceTimestamp, setReferenceTimestamp] = useState<number | undefined>(undefined);
	const [filters, setFilters] = useState<AddressPageFilters>(DEFAULT_ADDRESS_FILTERS);
	const [sort, setSort] = useState<AddressPageSort>(DEFAULT_ADDRESS_SORT);
	const [filterModalOpen, setFilterModalOpen] = useState(false);
	const [tipBlockNumber, setTipBlockNumber] = useState<bigint | null>(null);

	// Overview stats state.
	const [balance, setBalance] = useState<bigint | null>(null);
	const [firstActivity, setFirstActivity] = useState<{
		txHash: string;
		blockNumber: bigint;
		timestamp: number;
	} | null>(null);
	const [lastActivity, setLastActivity] = useState<{
		txHash: string;
		blockNumber: bigint;
		timestamp: number;
	} | null>(null);
	const [daoLockedCapacity, setDaoLockedCapacity] = useState<bigint | null>(null);
	const [daoCellCount, setDaoCellCount] = useState<bigint | null>(null);

	const fetchIdRef = useRef(0);
	const prevFiltersRef = useRef<string>(JSON.stringify(DEFAULT_ADDRESS_FILTERS));
	const prevSortRef = useRef<string>(JSON.stringify(DEFAULT_ADDRESS_SORT));

	// Parse address on mount.
	useEffect(() => {
		try {
			const parsed = parseAddress(address);
			if (!parsed.script) {
				throw new Error('Short format addresses are not supported. Please use the full format address.');
			}
			setScript(parsed.script);
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Invalid address format.'));
			setIsLoading(false);
		}
	}, [address]);

	// Enrich grouped transactions with full details.
	const enrichTransactions = useCallback(async (
		groupedTxs: RpcGroupedTransactionInfo[],
	): Promise<EnrichedTransaction[]> => {
		// Fetch full transactions in parallel.
		const fullTxPromises = groupedTxs.map(async (gtx) => {
			const txWithStatus = await rpc.getTransaction(gtx.tx_hash, archiveHeight);
			return { grouped: gtx, full: txWithStatus };
		});

		const results = await Promise.all(fullTxPromises);

		// Fetch block headers for timestamps.
		const uniqueBlocks = [...new Set(groupedTxs.map(tx => tx.block_number))];
		const headerPromises = uniqueBlocks.map(async (blockNum) => {
			const header = await rpc.getHeaderByNumber(BigInt(blockNum), archiveHeight);
			return { blockNumber: blockNum, timestamp: header ? Number(BigInt(header.timestamp)) : Date.now() };
		});
		const headers = await Promise.all(headerPromises);
		const timestampMap = new Map(headers.map(h => [h.blockNumber, h.timestamp]));

		// Build enriched transactions.
		return results.map(({ grouped, full }) => {
			const timestamp = timestampMap.get(grouped.block_number) ?? Date.now();

			return {
				txHash: grouped.tx_hash,
				blockNumber: BigInt(grouped.block_number),
				timestamp,
				totalCapacity: full?.transaction ? calculateTotalOutputCapacity(full.transaction) : 0n,
				lockScripts: full?.transaction ? extractLockScripts(full.transaction, networkType) : [],
				typeScripts: full?.transaction ? extractTypeScripts(full.transaction, networkType) : [],
				inputCount: full?.transaction?.inputs.length ?? 0,
				outputCount: full?.transaction?.outputs.length ?? 0,
				isCellbase: full?.transaction ? isCellbaseTransaction(full.transaction) : false,
			};
		});
	}, [rpc, archiveHeight, networkType]);

	// Fetch transaction count and initial transactions.
	const fetchData = useCallback(async () => {
		if (!script) return;

		const fetchId = ++fetchIdRef.current;

		setIsLoading(true);
		setError(null);

		try {
			// Fetch tip header for block range filter presets.
			const tipHeader = await rpc.getTipHeader();
			const currentTip = BigInt(tipHeader.number);
			setTipBlockNumber(currentTip);

			// Build search key with filters.
			const indexerFilter = buildIndexerFilter(filters, currentTip, networkType);
			const searchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
				filter: indexerFilter,
			};

			// Fetch archive block timestamp if in archive mode.
			let archiveTimestamp: number | undefined;
			if (archiveHeight !== undefined) {
				const archiveHeader = await rpc.getHeaderByNumber(BigInt(archiveHeight), archiveHeight);
				if (archiveHeader) {
					archiveTimestamp = Number(BigInt(archiveHeader.timestamp));
				}
			}

			// Build DAO filter for DAO-specific queries.
			// Filter by DAO type script (args: '0x' matches all DAO cells).
			const daoScript = getDaoTypeScript();
			const daoSearchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
				filter: {
					script: daoScript,
				},
			};

			// Fetch overview stats in parallel with existing calls.
			const [
				txCountResult,
				groupedTxsResult,
				balanceResult,
				firstTxResult,
				daoCapacityResult,
				daoCellCountResult,
			] = await Promise.all([
				rpc.getTransactionsCount(searchKey, archiveHeight),
				rpc.getGroupedTransactions(searchKey, sort.direction, pageSize, undefined, archiveHeight),
				rpc.getCellsCapacity(searchKey, archiveHeight),
				rpc.getGroupedTransactions(searchKey, 'asc', 1, undefined, archiveHeight),
				rpc.getCellsCapacity(daoSearchKey, archiveHeight),
				rpc.getCellsCount(daoSearchKey, archiveHeight),
			]);

			if (fetchId !== fetchIdRef.current) return;

			// Process first activity.
			let firstActivityData: typeof firstActivity = null;
			if (firstTxResult.objects.length > 0) {
				const firstTx = firstTxResult.objects[0];
				const firstHeader = await rpc.getHeaderByNumber(BigInt(firstTx.block_number), archiveHeight);
				firstActivityData = {
					txHash: firstTx.tx_hash,
					blockNumber: BigInt(firstTx.block_number),
					timestamp: firstHeader ? Number(BigInt(firstHeader.timestamp)) : Date.now(),
				};
			}

			// Process last activity (from the first item of desc-ordered results).
			let lastActivityData: typeof lastActivity = null;
			if (groupedTxsResult.objects.length > 0) {
				const lastTx = groupedTxsResult.objects[0];
				// Only fetch header if different from first activity block.
				let lastTimestamp: number;
				if (firstActivityData && firstActivityData.blockNumber === BigInt(lastTx.block_number)) {
					lastTimestamp = firstActivityData.timestamp;
				} else {
					const lastHeader = await rpc.getHeaderByNumber(BigInt(lastTx.block_number), archiveHeight);
					lastTimestamp = lastHeader ? Number(BigInt(lastHeader.timestamp)) : Date.now();
				}
				lastActivityData = {
					txHash: lastTx.tx_hash,
					blockNumber: BigInt(lastTx.block_number),
					timestamp: lastTimestamp,
				};
			}

			if (fetchId !== fetchIdRef.current) return;

			setTransactionCount(BigInt(txCountResult.count));
			setReferenceTimestamp(archiveTimestamp);
			setBalance(balanceResult);
			setFirstActivity(firstActivityData);
			setLastActivity(lastActivityData);
			setDaoLockedCapacity(daoCapacityResult);
			setDaoCellCount(BigInt(daoCellCountResult.count));

			// Enrich transactions with full details.
			const enriched = await enrichTransactions(groupedTxsResult.objects);

			if (fetchId !== fetchIdRef.current) return;

			setTransactions(enriched);
			setCursor(groupedTxsResult.last_cursor);
			setHasMore(groupedTxsResult.objects.length >= pageSize);
		} catch (err) {
			if (fetchId !== fetchIdRef.current) return;
			setError(err instanceof Error ? err : new Error('Failed to fetch transactions.'));
		} finally {
			if (fetchId === fetchIdRef.current) {
				setIsLoading(false);
			}
		}
	}, [rpc, script, archiveHeight, pageSize, enrichTransactions, filters, sort.direction, networkType]);

	useEffect(() => {
		if (script) {
			fetchData();
		}
	}, [fetchData, script]);

	// Load more transactions.
	const loadMore = async () => {
		if (!script || !cursor || isLoadingMore) return;

		setIsLoadingMore(true);

		try {
			// Build search key with filters.
			const indexerFilter = buildIndexerFilter(filters, tipBlockNumber, networkType);
			const searchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
				filter: indexerFilter,
			};

			const result = await rpc.getGroupedTransactions(searchKey, sort.direction, pageSize, cursor, archiveHeight);

			// Enrich new transactions.
			const enriched = await enrichTransactions(result.objects);

			setTransactions((prev) => [...prev, ...enriched]);
			setCursor(result.last_cursor);
			setHasMore(result.objects.length >= pageSize);
		} catch (err) {
			console.error('Failed to load more transactions:', err);
		} finally {
			setIsLoadingMore(false);
		}
	};

	// Handle page size change.
	const handlePageSizeChange = (newSize: number) => {
		setPageSize(newSize);
		localStorage.setItem(STORAGE_KEY, newSize.toString());
		setTransactions([]);
		setCursor(null);
	};

	// Reset pagination when filters or sort change.
	useEffect(() => {
		const currentFilters = JSON.stringify(filters);
		const currentSort = JSON.stringify(sort);

		if (currentFilters !== prevFiltersRef.current || currentSort !== prevSortRef.current) {
			prevFiltersRef.current = currentFilters;
			prevSortRef.current = currentSort;

			// Reset pagination and reload.
			setTransactions([]);
			setCursor(null);
		}
	}, [filters, sort]);

	// Build filter chips for display.
	const filterChips = useMemo<FilterChip[]>(() => {
		const chips: FilterChip[] = [];

		if (filters.minCellCkb !== null) {
			chips.push({
				type: 'minCkb',
				label: `Cell ≥${filters.minCellCkb.toLocaleString()} CKB`,
				value: String(filters.minCellCkb),
			});
		}

		for (const group of filters.typeScriptGroups) {
			chips.push({ type: 'typeScript', label: group, value: group });
		}

		if (filters.blockRange.preset !== 'all') {
			let label = '';
			switch (filters.blockRange.preset) {
				case 'last_1k':
					label = 'Last 1,000 blocks';
					break;
				case 'last_10k':
					label = 'Last 10,000 blocks';
					break;
				case 'last_100k':
					label = 'Last 100,000 blocks';
					break;
				case 'custom': {
					const start = filters.blockRange.customStart;
					const end = filters.blockRange.customEnd;
					if (start !== null && end !== null) {
						label = `Blocks ${start.toLocaleString()}-${end.toLocaleString()}`;
					} else if (start !== null) {
						label = `From block ${start.toLocaleString()}`;
					} else if (end !== null) {
						label = `To block ${end.toLocaleString()}`;
					}
					break;
				}
			}
			chips.push({
				type: 'blockRange',
				label,
				value: filters.blockRange.preset,
			});
		}

		return chips;
	}, [filters]);

	// Handle filter chip removal.
	const handleRemoveChip = useCallback((chip: FilterChip) => {
		setFilters((prev) => {
			switch (chip.type) {
				case 'minCkb':
					return { ...prev, minCellCkb: null };
				case 'typeScript':
					return { ...prev, typeScriptGroups: prev.typeScriptGroups.filter(g => g !== chip.value) };
				case 'blockRange':
					return { ...prev, blockRange: { preset: 'all', customStart: null, customEnd: null } };
				default:
					return prev;
			}
		});
	}, []);

	// Handle clear all filters.
	const handleClearFilters = useCallback(() => {
		setFilters(DEFAULT_ADDRESS_FILTERS);
	}, []);

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
				<ErrorDisplay error={error} title="Transactions Error" onRetry={script ? fetchData : undefined} />
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header with breadcrumb. */}
			<div className="mb-6">
				<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<InternalLink href={generateLink('/')} className="hover:text-nervos">
						Home
					</InternalLink>
					<span aria-hidden="true">/</span>
					<InternalLink href={generateLink(`/address/${address}`)} className="hover:text-nervos">
						Address
					</InternalLink>
					<span aria-hidden="true">/</span>
					<span aria-current="page">Transactions</span>
				</nav>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Transactions for Address
					{archiveHeight !== undefined && ` @ Block ${formatNumber(archiveHeight)}`}
				</h1>
			</div>

			{/* Overview section. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Overview</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="Address">
						<InternalLink href={generateLink(`/address/${address}`)}>
							<AddressDisplay address={address} truncate={false} />
						</InternalLink>
					</DetailRow>

					<DetailRow label="Total Balance">
						<span className="text-lg font-semibold text-nervos">
							{balance !== null ? formatCkb(balance) : '...'}
						</span>
					</DetailRow>

					<DetailRow label="Transactions">
						<span className="font-mono text-gray-900 dark:text-white">
							{transactionCount !== null ? formatNumber(transactionCount) : '...'}
						</span>
					</DetailRow>

					<DetailRow label="DAO Deposits">
						<span className="text-gray-900 dark:text-white">
							{daoCellCount !== null
								? `${formatNumber(daoCellCount)} cell${daoCellCount === 1n ? '' : 's'}`
								: '...'}
						</span>
					</DetailRow>

					<DetailRow label="DAO Locked">
						{daoLockedCapacity !== null && balance !== null ? (
							<span className="text-gray-900 dark:text-white">
								{formatCkb(daoLockedCapacity)}
								{daoLockedCapacity > 0n && balance > 0n && (
									<span className="text-gray-500 dark:text-gray-400 ml-2">
										({((Number(daoLockedCapacity) / Number(balance)) * 100).toFixed(1)}% of balance)
									</span>
								)}
							</span>
						) : (
							<span className="text-gray-500 dark:text-gray-400">...</span>
						)}
					</DetailRow>

					<DetailRow label="Activity Span">
						{firstActivity && lastActivity ? (
							<span className="text-gray-900 dark:text-white">
								{formatActivitySpan(
									firstActivity.blockNumber,
									lastActivity.blockNumber,
									firstActivity.timestamp,
									lastActivity.timestamp
								)}
							</span>
						) : (
							<span className="text-gray-500 dark:text-gray-400">...</span>
						)}
					</DetailRow>

					<DetailRow label="First Activity">
						{firstActivity ? (
							<span className="text-gray-900 dark:text-white">
								<InternalLink
									href={generateLink(`/tx/${firstActivity.txHash}`)}
									className="text-nervos hover:text-nervos-dark"
								>
									{formatNumber(firstActivity.blockNumber)}
								</InternalLink>
								<span className="text-gray-500 dark:text-gray-400 ml-2">
									({new Date(firstActivity.timestamp).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'short',
										day: 'numeric',
									})})
								</span>
							</span>
						) : (
							<span className="text-gray-500 dark:text-gray-400">...</span>
						)}
					</DetailRow>

					<DetailRow label="Last Activity">
						{lastActivity ? (
							<span className="text-gray-900 dark:text-white">
								<InternalLink
									href={generateLink(`/tx/${lastActivity.txHash}`)}
									className="text-nervos hover:text-nervos-dark"
								>
									{formatNumber(lastActivity.blockNumber)}
								</InternalLink>
								<span className="text-gray-500 dark:text-gray-400 ml-2">
									({new Date(lastActivity.timestamp).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'short',
										day: 'numeric',
									})})
								</span>
							</span>
						) : (
							<span className="text-gray-500 dark:text-gray-400">...</span>
						)}
					</DetailRow>
				</div>
			</div>

			{/* Transactions list. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Transactions ({transactionCount !== null ? formatNumber(transactionCount) : '...'})
					</h2>
					<FilterSortButton
						onClick={() => setFilterModalOpen(true)}
						activeFilterCount={filterChips.length}
					/>
				</div>

				{/* Active filter chips. */}
				{filterChips.length > 0 && (
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<ActiveFilterChips
							chips={filterChips}
							onRemove={handleRemoveChip}
							onClearAll={handleClearFilters}
						/>
					</div>
				)}

				<div>
					{transactions.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							{filterChips.length > 0
								? 'No transactions match the current filters.'
								: 'No transactions found for this address.'}
						</div>
					) : (
						transactions.map((tx) => (
							<TransactionRow
								key={tx.txHash}
								transaction={tx}
								referenceTime={referenceTimestamp}
							/>
						))
					)}
				</div>

				{/* Load more controls. */}
				{(hasMore || transactions.length > 0) && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm text-gray-500 dark:text-gray-400">
								Results per load:
							</span>
							<div className="relative">
								<select
									value={pageSize}
									onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
									className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 pr-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white cursor-pointer appearance-none"
								>
									{PAGE_SIZE_CONFIG.options.map((size) => (
										<option key={size} value={size}>
											{size}
										</option>
									))}
								</select>
								<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />
							</div>
						</div>

						{hasMore && (
							<button
								onClick={loadMore}
								disabled={isLoadingMore}
								className="px-4 py-2 text-sm font-medium text-white bg-nervos rounded-lg hover:bg-nervos-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isLoadingMore ? 'Loading...' : 'Load More'}
							</button>
						)}
					</div>
				)}
			</div>

			{/* Filter modal. */}
			<AddressFilterModal
				isOpen={filterModalOpen}
				onClose={() => setFilterModalOpen(false)}
				filters={filters}
				sort={sort}
				onApply={(newFilters, newSort) => {
					setFilters(newFilters);
					setSort(newSort);
				}}
			/>
		</div>
	);
}
