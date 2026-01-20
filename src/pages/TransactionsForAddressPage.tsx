import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { formatNumber, formatActivitySpan, formatCkb } from '../lib/format';
import { DetailRow } from '../components/DetailRow';
import { AddressDisplay } from '../components/AddressDisplay';
import { getDaoTypeScript } from '../lib/wellKnown';
import { generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail, SkeletonTransactionItem } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { InternalLink } from '../components/InternalLink';
import { Pagination } from '../components/Pagination';
import { PAGE_SIZE_CONFIG } from '../config/defaults';
import { TransactionRow, type EnrichedTransaction } from '../components/TransactionRow';
import { useAddressScript } from '../hooks/useAddressScript';
import { useEnrichTransactions } from '../hooks/useEnrichTransactions';
import { getStoredPageSize, setStoredPageSize } from '../lib/localStorage';
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
import type { IndexerSearchKey } from '../types/rpc';

// Threshold for using large-limit skipping during cursor building.
const SKIP_THRESHOLD_PAGES = 10;

interface TransactionsForAddressPageProps {
	address: string;
}

const STORAGE_KEY = 'ckb-explorer-txs-page-size';

export function TransactionsForAddressPage({ address }: TransactionsForAddressPageProps) {
	const rpc = useRpc();
	const { currentNetwork } = useNetwork();
	const { archiveHeight } = useArchive();
	const networkType = currentNetwork?.type ?? 'mainnet';
	const { script, error: parseError, isReady } = useAddressScript(address);
	const enrichTransactions = useEnrichTransactions(networkType);
	const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
	const [totalTransactionCount, setTotalTransactionCount] = useState<bigint | null>(null);
	const [filteredTransactionCount, setFilteredTransactionCount] = useState<bigint | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [isLoadingOverview, setIsLoadingOverview] = useState(true);
	const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
	const [fetchError, setFetchError] = useState<Error | null>(null);
	const [pageSize, setPageSize] = useState(() => getStoredPageSize(STORAGE_KEY));
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

	const overviewFetchIdRef = useRef(0);
	const txFetchIdRef = useRef(0);
	const prevFiltersRef = useRef<string>(JSON.stringify(DEFAULT_ADDRESS_FILTERS));
	const prevSortRef = useRef<string>(JSON.stringify(DEFAULT_ADDRESS_SORT));

	// Cursor cache: maps item index (0, 100, 200...) to cursor string.
	// Key 0 = null cursor (start of results).
	const cursorCacheRef = useRef<Map<number, string | null>>(new Map([[0, null]]));

	// Combine parseError and fetchError for display.
	const error = parseError ?? fetchError;

	// Fetch overview data (balance, first/last activity, DAO info).
	// This data is address-level and does not depend on transaction filters.
	const fetchOverviewData = useCallback(async () => {
		if (!script) return;

		const fetchId = ++overviewFetchIdRef.current;

		setIsLoadingOverview(true);
		setFetchError(null);

		try {
			// Unfiltered search key for address-level stats.
			const baseSearchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
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
			const daoScript = getDaoTypeScript();
			const daoSearchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
				filter: {
					script: daoScript,
				},
			};

			// Fetch overview stats in parallel.
			const [
				balanceResult,
				txCountResult,
				firstTxResult,
				lastTxResult,
				daoCapacityResult,
				daoCellCountResult,
			] = await Promise.all([
				rpc.getCellsCapacity(baseSearchKey, archiveHeight),
				rpc.getTransactionsCount(baseSearchKey, archiveHeight),
				rpc.getGroupedTransactions(baseSearchKey, 'asc', 1, undefined, archiveHeight),
				rpc.getGroupedTransactions(baseSearchKey, 'desc', 1, undefined, archiveHeight),
				rpc.getCellsCapacity(daoSearchKey, archiveHeight),
				rpc.getCellsCount(daoSearchKey, archiveHeight),
			]);

			if (fetchId !== overviewFetchIdRef.current) return;

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

			// Process last activity.
			let lastActivityData: typeof lastActivity = null;
			if (lastTxResult.objects.length > 0) {
				const lastTx = lastTxResult.objects[0];
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

			if (fetchId !== overviewFetchIdRef.current) return;

			setReferenceTimestamp(archiveTimestamp);
			setBalance(balanceResult);
			setTotalTransactionCount(BigInt(txCountResult.count));
			setFirstActivity(firstActivityData);
			setLastActivity(lastActivityData);
			setDaoLockedCapacity(daoCapacityResult);
			setDaoCellCount(BigInt(daoCellCountResult.count));
		} catch (err) {
			if (fetchId !== overviewFetchIdRef.current) return;
			setFetchError(err instanceof Error ? err : new Error('Failed to fetch address overview.'));
		} finally {
			if (fetchId === overviewFetchIdRef.current) {
				setIsLoadingOverview(false);
			}
		}
	}, [rpc, script, archiveHeight]);

	// Fetch filtered transaction count and first page of transactions.
	const fetchTransactionData = useCallback(async () => {
		if (!script) return;

		const fetchId = ++txFetchIdRef.current;

		setIsLoadingTransactions(true);
		setCurrentPage(1);

		// Reset cursor cache when fetching fresh data.
		cursorCacheRef.current = new Map([[0, null]]);

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

			// Fetch transaction count and first page in parallel.
			const [txCountResult, groupedTxsResult] = await Promise.all([
				rpc.getTransactionsCount(searchKey, archiveHeight),
				rpc.getGroupedTransactions(searchKey, sort.direction, pageSize, undefined, archiveHeight),
			]);

			if (fetchId !== txFetchIdRef.current) return;

			setFilteredTransactionCount(BigInt(txCountResult.count));

			// Cache the cursor for the next page.
			if (groupedTxsResult.last_cursor) {
				cursorCacheRef.current.set(pageSize, groupedTxsResult.last_cursor);
			}

			// Enrich transactions with full details.
			const enriched = await enrichTransactions(groupedTxsResult.objects);

			if (fetchId !== txFetchIdRef.current) return;

			setTransactions(enriched);
		} catch (err) {
			if (fetchId !== txFetchIdRef.current) return;
			// Don't overwrite overview errors with transaction errors.
			if (!fetchError) {
				setFetchError(err instanceof Error ? err : new Error('Failed to fetch transactions.'));
			}
		} finally {
			if (fetchId === txFetchIdRef.current) {
				setIsLoadingTransactions(false);
			}
		}
	}, [rpc, script, archiveHeight, pageSize, enrichTransactions, filters, sort.direction, networkType, fetchError]);

	// Fetch overview data when script changes.
	useEffect(() => {
		if (script) {
			fetchOverviewData();
		}
	}, [fetchOverviewData, script]);

	// Fetch transaction data when script or filters change.
	useEffect(() => {
		if (script) {
			fetchTransactionData();
		}
	}, [fetchTransactionData, script]);

	// Fetch a specific page of transactions with hybrid cursor caching.
	const fetchPage = useCallback(async (targetPage: number) => {
		if (!script || isLoadingTransactions) return;

		const fetchId = ++txFetchIdRef.current;

		setIsLoadingTransactions(true);

		try {
			// Build search key with filters.
			const indexerFilter = buildIndexerFilter(filters, tipBlockNumber, networkType);
			const searchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
				filter: indexerFilter,
			};

			// Calculate target start item index (0-indexed).
			const targetStartIndex = (targetPage - 1) * pageSize;

			// Find the nearest cached cursor position at or before target.
			const cache = cursorCacheRef.current;
			let nearestCachedIndex = 0;
			for (const cachedIndex of cache.keys()) {
				if (cachedIndex <= targetStartIndex && cachedIndex > nearestCachedIndex) {
					nearestCachedIndex = cachedIndex;
				}
			}

			let currentCursor = cache.get(nearestCachedIndex) ?? null;
			let currentIndex = nearestCachedIndex;

			// Calculate how many pages we need to skip.
			const itemsToSkip = targetStartIndex - currentIndex;
			const pagesToSkip = Math.ceil(itemsToSkip / pageSize);

			// Use large limit for skipping if jump is large (> SKIP_THRESHOLD_PAGES).
			const skipLimit = pagesToSkip > SKIP_THRESHOLD_PAGES ? PAGE_SIZE_CONFIG.max : pageSize;

			// Skip to target position by fetching with appropriate limit.
			while (currentIndex < targetStartIndex) {
				if (fetchId !== txFetchIdRef.current) return;

				const remainingToSkip = targetStartIndex - currentIndex;
				const fetchLimit = Math.min(skipLimit, remainingToSkip);

				const skipResult = await rpc.getGroupedTransactions(
					searchKey,
					sort.direction,
					fetchLimit,
					currentCursor ?? undefined,
					archiveHeight
				);

				// Cache the cursor at the new position.
				currentIndex += skipResult.objects.length;
				if (skipResult.last_cursor) {
					cache.set(currentIndex, skipResult.last_cursor);
					currentCursor = skipResult.last_cursor;
				}

				// If we didn't get enough items, we've reached the end.
				if (skipResult.objects.length < fetchLimit) {
					break;
				}
			}

			if (fetchId !== txFetchIdRef.current) return;

			// Fetch the actual page data.
			const pageResult = await rpc.getGroupedTransactions(
				searchKey,
				sort.direction,
				pageSize,
				currentCursor ?? undefined,
				archiveHeight
			);

			if (fetchId !== txFetchIdRef.current) return;

			// Cache the cursor for the next page.
			if (pageResult.last_cursor) {
				cache.set(targetStartIndex + pageResult.objects.length, pageResult.last_cursor);
			}

			// Enrich transactions with full details.
			const enriched = await enrichTransactions(pageResult.objects);

			if (fetchId !== txFetchIdRef.current) return;

			setTransactions(enriched);
			setCurrentPage(targetPage);
		} catch (err) {
			if (fetchId !== txFetchIdRef.current) return;
			console.error('Failed to fetch page:', err);
		} finally {
			if (fetchId === txFetchIdRef.current) {
				setIsLoadingTransactions(false);
			}
		}
	}, [script, isLoadingTransactions, filters, tipBlockNumber, networkType, pageSize, sort.direction, rpc, archiveHeight, enrichTransactions]);

	// Handle page size change.
	const handlePageSizeChange = useCallback((newSize: number) => {
		setPageSize(newSize);
		setStoredPageSize(STORAGE_KEY, newSize);
		setCurrentPage(1);
		setTransactions([]);
		cursorCacheRef.current = new Map([[0, null]]);
	}, []);

	// Handle page change.
	const handlePageChange = useCallback((page: number) => {
		if (page !== currentPage) {
			fetchPage(page);
		}
	}, [currentPage, fetchPage]);

	// Calculate total pages.
	const totalPages = useMemo(() => {
		if (filteredTransactionCount === null) return 1;
		return Math.max(1, Math.ceil(Number(filteredTransactionCount) / pageSize));
	}, [filteredTransactionCount, pageSize]);

	// Reset pagination when filters or sort change.
	useEffect(() => {
		const currentFilters = JSON.stringify(filters);
		const currentSort = JSON.stringify(sort);

		if (currentFilters !== prevFiltersRef.current || currentSort !== prevSortRef.current) {
			prevFiltersRef.current = currentFilters;
			prevSortRef.current = currentSort;

			// Reset pagination state (data will be refetched by fetchTransactionData effect).
			setCurrentPage(1);
			setTransactions([]);
			cursorCacheRef.current = new Map([[0, null]]);
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

	// Show error if address parsing or fetch failed.
	if (error) {
		const handleRetry = script
			? () => {
				fetchOverviewData();
				fetchTransactionData();
			}
			: undefined;
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<ErrorDisplay error={error} title="Transactions Error" onRetry={handleRetry} />
			</div>
		);
	}

	// Show full page skeleton while waiting for address parsing or initial load.
	if (!isReady || (isLoadingOverview && isLoadingTransactions)) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<SkeletonDetail />
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
						<InternalLink
							href={generateLink(`/address/${address}`)}
							className="text-nervos hover:text-nervos-dark"
						>
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
							{totalTransactionCount !== null ? formatNumber(totalTransactionCount) : '...'}
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
										({(Math.floor(Number((daoLockedCapacity * 100000n) / balance)) / 1000).toFixed(2)}% of balance)
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
						Transactions ({filteredTransactionCount !== null ? formatNumber(filteredTransactionCount) : '...'})
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
					{isLoadingTransactions ? (
						// Show skeleton items while transactions are loading.
						<>
							{[...Array(Math.min(pageSize, 5))].map((_, i) => (
								<SkeletonTransactionItem key={i} />
							))}
						</>
					) : transactions.length === 0 ? (
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

				{/* Pagination controls. */}
				{!isLoadingTransactions && filteredTransactionCount !== null && totalPages > 1 && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<Pagination
							currentPage={currentPage}
							totalItems={Number(filteredTransactionCount)}
							pageSize={pageSize}
							pageSizeOptions={PAGE_SIZE_CONFIG.options}
							onPageChange={handlePageChange}
							onPageSizeChange={handlePageSizeChange}
						/>
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
