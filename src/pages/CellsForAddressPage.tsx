import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { formatNumber, formatActivitySpan, formatCkb, formatShortDate } from '../lib/format';
import { DetailRow } from '../components/DetailRow';
import { AddressDisplay } from '../components/AddressDisplay';
import { getDaoTypeScript } from '../lib/wellKnown';
import { generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { useStats } from '../contexts/StatsContext';
import { scriptToLockHash } from '../lib/lockHash';
import { fromHex } from '../lib/rpc';
import { SkeletonDetail, SkeletonCellItem } from '../components/Skeleton';
import { FieldValue, buildFieldState, type FieldState } from '../components/FieldValue';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { InternalLink } from '../components/InternalLink';
import { Pagination } from '../components/Pagination';
import { PAGE_SIZE_CONFIG, LIVE_CELLS_SMART_COUNTS_THRESHOLD } from '../config/defaults';
import { useAddressScript } from '../hooks/useAddressScript';
import { getStoredPageSize, setStoredPageSize } from '../lib/localStorage';
import { FilterSortButton } from '../components/FilterSortButton';
import { LiveCellFilterModal } from '../components/LiveCellFilterModal';
import { ActiveFilterChips, type FilterChip } from '../components/ActiveFilterChips';
import { CellRow } from '../components/CellRow';
import { getTypeScriptGroup, getLockScriptGroups, NO_TYPE_SCRIPT_GROUP } from '../lib/scriptGroups';
import {
	DEFAULT_LIVE_CELL_FILTERS,
	DEFAULT_LIVE_CELL_SORT,
	buildCellIndexerFilter,
	filterCellsByLockScript,
	type LiveCellFilters,
	type LiveCellSort,
	type PresentScripts,
} from '../lib/liveCellFilters';
import { SKIP_THRESHOLD_PAGES } from '../lib/filterUtils';
import type { IndexerSearchKey, RpcCell } from '../types/rpc';

interface CellsForAddressPageProps {
	address: string;
}

const STORAGE_KEY = 'ckb-explorer-cells-page-size';

export function CellsForAddressPage({ address }: CellsForAddressPageProps) {
	const rpc = useRpc();
	const { currentNetwork, isArchiveSupported } = useNetwork();
	const { archiveHeight } = useArchive();
	const { statsClient, isStatsAvailable } = useStats();
	const networkType = currentNetwork?.type ?? 'mainnet';
	const { script, error: parseError, isReady } = useAddressScript(address);

	// Cell list state.
	const [cells, setCells] = useState<RpcCell[]>([]);
	const [cellTimestamps, setCellTimestamps] = useState<Map<bigint, number>>(new Map());
	const [currentPage, setCurrentPage] = useState(1);
	const [isLoadingOverview, setIsLoadingOverview] = useState(true);
	const [isLoadingCells, setIsLoadingCells] = useState(true);
	const [fetchError, setFetchError] = useState<Error | null>(null);
	const [pageSize, setPageSize] = useState(() => getStoredPageSize(STORAGE_KEY));

	// Filter and sort state.
	const [filters, setFilters] = useState<LiveCellFilters>(DEFAULT_LIVE_CELL_FILTERS);
	const [sort, setSort] = useState<LiveCellSort>(DEFAULT_LIVE_CELL_SORT);
	const [filterModalOpen, setFilterModalOpen] = useState(false);
	const [tipBlockNumber, setTipBlockNumber] = useState<bigint | null>(null);

	// Overview stats state.
	const [balance, setBalance] = useState<bigint | null>(null);
	const [cellCount, setCellCount] = useState<bigint | null>(null);
	const [filteredCellCount, setFilteredCellCount] = useState<bigint | null>(null);
	const [daoCellCount, setDaoCellCount] = useState<bigint | null>(null);
	const [daoCapacity, setDaoCapacity] = useState<bigint | null>(null);
	const [oldestCell, setOldestCell] = useState<{
		txHash: string;
		index: number;
		blockNumber: bigint;
		timestamp: number;
	} | null>(null);
	const [newestCell, setNewestCell] = useState<{
		txHash: string;
		index: number;
		blockNumber: bigint;
		timestamp: number;
	} | null>(null);

	// Smart counts state (only populated when cellCount <= threshold).
	const [presentScripts, setPresentScripts] = useState<PresentScripts | null>(null);

	const overviewFetchIdRef = useRef(0);
	const cellsFetchIdRef = useRef(0);
	const prevFiltersRef = useRef<string>(JSON.stringify(DEFAULT_LIVE_CELL_FILTERS));
	const prevSortRef = useRef<string>(JSON.stringify(DEFAULT_LIVE_CELL_SORT));

	// Cursor cache: maps item index (0, 100, 200...) to cursor string.
	// Key 0 = null cursor (start of results).
	const cursorCacheRef = useRef<Map<number, string | null>>(new Map([[0, null]]));

	// Combine parseError and fetchError for display.
	const error = parseError ?? fetchError;

	// Check if only one cell exists (oldest === newest).
	const isSingleCell = useMemo(() => {
		if (!oldestCell || !newestCell) return false;
		return oldestCell.txHash === newestCell.txHash && oldestCell.index === newestCell.index;
	}, [oldestCell, newestCell]);

	// Fetch overview data (balance, cell count, DAO stats, oldest/newest cells).
	// This data is address-level and does not depend on filters.
	const fetchOverviewData = useCallback(async () => {
		if (!script) return;

		const fetchId = ++overviewFetchIdRef.current;

		setIsLoadingOverview(true);
		setFetchError(null);
		// Clear overview data at fetch start so a TimeSlider-driven
		// archiveHeight refetch doesn't render stale balance/cell stats
		// against a freshly-loaded cell list while the overview request
		// is still in flight. The "..." placeholders in the JSX render
		// correctly while these are null.
		setBalance(null);
		setCellCount(null);
		setDaoCellCount(null);
		setDaoCapacity(null);
		setOldestCell(null);
		setNewestCell(null);
		setPresentScripts(null);

		try {
			// Unfiltered search key for address-level stats.
			const baseSearchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
			};

			// RPC fallback for counts/balance — used when stats server is unavailable or errors.
			// Count methods are archive-fork extensions; skip them on non-archive networks.
			async function fetchCountsViaRpc(): Promise<bigint> {
				const daoScript = getDaoTypeScript();
				const daoSearchKey: IndexerSearchKey = {
					script: script!,
					script_type: 'lock',
					script_search_mode: 'exact',
					filter: {
						script: daoScript,
					},
				};

				const [
					balanceResult,
					cellCountResult,
					daoCapacityResult,
					daoCellCountResult,
				] = await Promise.all([
					rpc.getCellsCapacity(baseSearchKey, archiveHeight),
					isArchiveSupported ? rpc.getCellsCount(baseSearchKey, archiveHeight) : Promise.resolve(null),
					rpc.getCellsCapacity(daoSearchKey, archiveHeight),
					isArchiveSupported ? rpc.getCellsCount(daoSearchKey, archiveHeight) : Promise.resolve(null),
				]);

				if (fetchId !== overviewFetchIdRef.current) return 0n;

				const count = cellCountResult ? BigInt(cellCountResult.count) : 0n;
				setCellCount(cellCountResult ? count : null);
				setBalance(balanceResult);
				setDaoCapacity(daoCapacityResult);
				setDaoCellCount(daoCellCountResult ? BigInt(daoCellCountResult.count) : null);

				return count;
			}

			// Fetch oldest/newest cells (always via RPC, independent of stats).
			const [oldestCellResult, newestCellResult] = await Promise.all([
				rpc.getCells(baseSearchKey, 'asc', 1, undefined, archiveHeight),
				rpc.getCells(baseSearchKey, 'desc', 1, undefined, archiveHeight),
			]);

			if (fetchId !== overviewFetchIdRef.current) return;

			// Fetch counts — use stats server if available, fall back to RPC on error.
			let totalCellCount: bigint;

			if (isStatsAvailable && statsClient && script) {
				try {
					const lockHash = scriptToLockHash(script);
					const statsResult = await statsClient.getAllAddressStats(lockHash, archiveHeight);

					if (fetchId !== overviewFetchIdRef.current) return;

					if (statsResult) {
						totalCellCount = fromHex(statsResult.core.live_cell_count);
						setCellCount(totalCellCount);
						setBalance(fromHex(statsResult.core.capacity));
						setDaoCapacity(statsResult.dao ? fromHex(statsResult.dao.total_dao_deposit) : 0n);
						setDaoCellCount(statsResult.dao ? fromHex(statsResult.dao.dao_cell_count) : 0n);
					} else {
						totalCellCount = 0n;
						setCellCount(0n);
						setBalance(0n);
						setDaoCapacity(0n);
						setDaoCellCount(0n);
					}
				} catch (statsErr) {
					console.warn('Stats server error, falling back to RPC:', statsErr);
					if (fetchId !== overviewFetchIdRef.current) return;
					totalCellCount = await fetchCountsViaRpc();
				}
			} else {
				totalCellCount = await fetchCountsViaRpc();
			}

			// Process oldest cell.
			let oldestCellData: typeof oldestCell = null;
			if (oldestCellResult.objects.length > 0) {
				const cell = oldestCellResult.objects[0];
				const header = await rpc.getHeaderByNumber(BigInt(cell.block_number), archiveHeight);
				oldestCellData = {
					txHash: cell.out_point.tx_hash,
					index: Number(cell.out_point.index),
					blockNumber: BigInt(cell.block_number),
					timestamp: header ? Number(BigInt(header.timestamp)) : Date.now(),
				};
			}

			// Process newest cell.
			let newestCellData: typeof newestCell = null;
			if (newestCellResult.objects.length > 0) {
				const cell = newestCellResult.objects[0];
				// Only fetch header if different from oldest cell block.
				let timestamp: number;
				if (oldestCellData && oldestCellData.blockNumber === BigInt(cell.block_number)) {
					timestamp = oldestCellData.timestamp;
				} else {
					const header = await rpc.getHeaderByNumber(BigInt(cell.block_number), archiveHeight);
					timestamp = header ? Number(BigInt(header.timestamp)) : Date.now();
				}
				newestCellData = {
					txHash: cell.out_point.tx_hash,
					index: Number(cell.out_point.index),
					blockNumber: BigInt(cell.block_number),
					timestamp,
				};
			}

			if (fetchId !== overviewFetchIdRef.current) return;

			setOldestCell(oldestCellData);
			setNewestCell(newestCellData);

			// Fetch smart counts if cell count is within threshold.
			if (totalCellCount <= LIVE_CELLS_SMART_COUNTS_THRESHOLD) {
				const allCellsResult = await rpc.getCells(
					{ ...baseSearchKey, with_data: true },
					'desc',
					LIVE_CELLS_SMART_COUNTS_THRESHOLD,
					undefined,
					archiveHeight
				);

				if (fetchId !== overviewFetchIdRef.current) return;

				// Scan cells for present scripts.
				const typeGroups = new Map<string, number>();
				const lockGroups = new Map<string, number>();

				for (const cell of allCellsResult.objects) {
					// Count type script groups.
					if (cell.output.type) {
						const groups = getTypeScriptGroup(cell.output.type.code_hash, networkType);
						if (groups) {
							for (const group of groups) {
								typeGroups.set(group, (typeGroups.get(group) ?? 0) + 1);
							}
						}
					} else {
						// Cell has no type script.
						typeGroups.set(NO_TYPE_SCRIPT_GROUP, (typeGroups.get(NO_TYPE_SCRIPT_GROUP) ?? 0) + 1);
					}

					// Count lock script groups.
					const lockGroupNames = getLockScriptGroups(cell.output.lock.code_hash, networkType);
					if (lockGroupNames) {
						for (const group of lockGroupNames) {
							lockGroups.set(group, (lockGroups.get(group) ?? 0) + 1);
						}
					}
				}

				setPresentScripts({ typeGroups, lockGroups });
			} else {
				setPresentScripts(null);
			}
		} catch (err) {
			if (fetchId !== overviewFetchIdRef.current) return;
			setFetchError(err instanceof Error ? err : new Error('Failed to fetch address overview.'));
		} finally {
			if (fetchId === overviewFetchIdRef.current) {
				setIsLoadingOverview(false);
			}
		}
	}, [rpc, script, archiveHeight, networkType, isStatsAvailable, statsClient, isArchiveSupported]);

	// Fetch filtered cell count and first page of cells.
	const fetchCellList = useCallback(async () => {
		if (!script) return;

		const fetchId = ++cellsFetchIdRef.current;

		setIsLoadingCells(true);
		setCurrentPage(1);
		// Clear cell list and derived counts/tip at fetch start so a
		// height-driven refetch doesn't briefly render the previous
		// height's rows. cellTimestamps is content-addressed by block
		// number — same block always has the same timestamp — so it does
		// not need clearing and skipping the reset avoids identity churn.
		// Empty state is gated by !isLoadingCells so clearing cells to []
		// won't flash "no cells".
		setCells([]);
		setFilteredCellCount(null);
		setTipBlockNumber(null);

		// Reset cursor cache when fetching fresh data.
		cursorCacheRef.current = new Map([[0, null]]);

		try {
			// Fetch tip header for block range filter presets.
			const tipHeader = await rpc.getTipHeader();
			const currentTip = BigInt(tipHeader.number);
			setTipBlockNumber(currentTip);

			// Build search key with filters.
			const indexerFilter = buildCellIndexerFilter(filters, currentTip, networkType);
			const searchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
				filter: indexerFilter,
				with_data: true,
			};

			// Fetch cell count and first page in parallel.
			// getCellsCount is an archive-fork extension; skip on non-archive networks.
			const [cellCountResult, cellsResult] = await Promise.all([
				isArchiveSupported ? rpc.getCellsCount(searchKey, archiveHeight) : Promise.resolve(null),
				rpc.getCells(searchKey, sort.direction, pageSize, undefined, archiveHeight),
			]);

			if (fetchId !== cellsFetchIdRef.current) return;

			// Apply client-side lock script filtering if needed.
			let filteredCells = cellsResult.objects;
			if (filters.lockScriptGroups.length > 0) {
				filteredCells = filterCellsByLockScript(filteredCells, filters.lockScriptGroups, networkType);
			}

			// Note: When lock script filter is active, the count from indexer may not match
			// the actual filtered count. We use the indexer count as an approximation.
			setFilteredCellCount(cellCountResult ? BigInt(cellCountResult.count) : null);

			// Cache the cursor for the next page.
			if (cellsResult.last_cursor) {
				cursorCacheRef.current.set(pageSize, cellsResult.last_cursor);
			}

			// Fetch timestamps for unique blocks in this page.
			const uniqueBlocks = [...new Set(filteredCells.map(c => BigInt(c.block_number)))];
			const headers = await Promise.all(uniqueBlocks.map(bn => rpc.getHeaderByNumber(bn, archiveHeight)));

			if (fetchId !== cellsFetchIdRef.current) return;

			const timestampMap = new Map<bigint, number>();
			uniqueBlocks.forEach((bn, i) => {
				if (headers[i]) {
					timestampMap.set(bn, Number(BigInt(headers[i]!.timestamp)));
				}
			});

			setCellTimestamps(timestampMap);
			setCells(filteredCells);
		} catch (err) {
			if (fetchId !== cellsFetchIdRef.current) return;
			// Don't overwrite overview errors with cell errors.
			if (!fetchError) {
				setFetchError(err instanceof Error ? err : new Error('Failed to fetch cells.'));
			}
		} finally {
			if (fetchId === cellsFetchIdRef.current) {
				setIsLoadingCells(false);
			}
		}
	}, [rpc, script, archiveHeight, pageSize, filters, sort.direction, networkType, fetchError, isArchiveSupported]);

	// Fetch overview data when script changes.
	useEffect(() => {
		if (script) {
			fetchOverviewData();
		}
	}, [fetchOverviewData, script]);

	// Fetch cell data when script or filters change.
	useEffect(() => {
		if (script) {
			fetchCellList();
		}
	}, [fetchCellList, script]);

	// Fetch a specific page of cells with hybrid cursor caching.
	const fetchPage = useCallback(async (targetPage: number) => {
		if (!script || isLoadingCells) return;

		const fetchId = ++cellsFetchIdRef.current;

		setIsLoadingCells(true);

		try {
			// Build search key with filters.
			const indexerFilter = buildCellIndexerFilter(filters, tipBlockNumber, networkType);
			const searchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
				filter: indexerFilter,
				with_data: true,
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
				if (fetchId !== cellsFetchIdRef.current) return;

				const remainingToSkip = targetStartIndex - currentIndex;
				const fetchLimit = Math.min(skipLimit, remainingToSkip);

				const skipResult = await rpc.getCells(
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

			if (fetchId !== cellsFetchIdRef.current) return;

			// Fetch the actual page data.
			const pageResult = await rpc.getCells(
				searchKey,
				sort.direction,
				pageSize,
				currentCursor ?? undefined,
				archiveHeight
			);

			if (fetchId !== cellsFetchIdRef.current) return;

			// Cache the cursor for the next page.
			if (pageResult.last_cursor) {
				cache.set(targetStartIndex + pageResult.objects.length, pageResult.last_cursor);
			}

			// Apply client-side lock script filtering if needed.
			let filteredCells = pageResult.objects;
			if (filters.lockScriptGroups.length > 0) {
				filteredCells = filterCellsByLockScript(filteredCells, filters.lockScriptGroups, networkType);
			}

			// Fetch timestamps for unique blocks in this page.
			const uniqueBlocks = [...new Set(filteredCells.map(c => BigInt(c.block_number)))];
			const headers = await Promise.all(uniqueBlocks.map(bn => rpc.getHeaderByNumber(bn, archiveHeight)));

			if (fetchId !== cellsFetchIdRef.current) return;

			const timestampMap = new Map<bigint, number>();
			uniqueBlocks.forEach((bn, i) => {
				if (headers[i]) {
					timestampMap.set(bn, Number(BigInt(headers[i]!.timestamp)));
				}
			});

			setCellTimestamps(timestampMap);
			setCells(filteredCells);
			setCurrentPage(targetPage);
		} catch (err) {
			if (fetchId !== cellsFetchIdRef.current) return;
			console.error('Failed to fetch page:', err);
		} finally {
			if (fetchId === cellsFetchIdRef.current) {
				setIsLoadingCells(false);
			}
		}
	}, [script, isLoadingCells, filters, tipBlockNumber, networkType, pageSize, sort.direction, rpc, archiveHeight]);

	// Handle page size change.
	const handlePageSizeChange = useCallback((newSize: number) => {
		setPageSize(newSize);
		setStoredPageSize(STORAGE_KEY, newSize);
		setCurrentPage(1);
		setCells([]);
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
		if (filteredCellCount === null) return 1;
		return Math.max(1, Math.ceil(Number(filteredCellCount) / pageSize));
	}, [filteredCellCount, pageSize]);

	// Calculate pagination range for display.
	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = filteredCellCount !== null
		? Math.min(startIndex + pageSize, Number(filteredCellCount))
		: startIndex + pageSize;
	const isFiltered = cellCount !== null && filteredCellCount !== null && filteredCellCount !== cellCount;

	// Reset pagination when filters or sort change.
	useEffect(() => {
		const currentFilters = JSON.stringify(filters);
		const currentSort = JSON.stringify(sort);

		if (currentFilters !== prevFiltersRef.current || currentSort !== prevSortRef.current) {
			prevFiltersRef.current = currentFilters;
			prevSortRef.current = currentSort;

			// Reset pagination state (data will be refetched by fetchCellList effect).
			setCurrentPage(1);
			setCells([]);
			cursorCacheRef.current = new Map([[0, null]]);
		}
	}, [filters, sort]);

	// Build filter chips for display.
	const filterChips = useMemo<FilterChip[]>(() => {
		const chips: FilterChip[] = [];

		// Lock script chips.
		for (const group of filters.lockScriptGroups) {
			chips.push({ type: 'lockScript', label: group, value: group });
		}

		// Type script chips.
		for (const group of filters.typeScriptGroups) {
			chips.push({ type: 'typeScript', label: group, value: group });
		}

		// Has Data chip.
		if (filters.hasData === 'with') {
			chips.push({ type: 'hasData', label: 'Has Data', value: 'with' });
		} else if (filters.hasData === 'without') {
			chips.push({ type: 'hasData', label: 'No Data', value: 'without' });
		}

		// Min CKB chip.
		if (filters.minCellCkb !== null) {
			chips.push({
				type: 'minCkb',
				label: `Cell \u2265${filters.minCellCkb.toLocaleString()} CKB`,
				value: String(filters.minCellCkb),
			});
		}

		// Block range chip.
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
				case 'lockScript':
					return { ...prev, lockScriptGroups: prev.lockScriptGroups.filter(g => g !== chip.value) };
				case 'typeScript':
					return { ...prev, typeScriptGroups: prev.typeScriptGroups.filter(g => g !== chip.value) };
				case 'hasData':
					return { ...prev, hasData: 'all' };
				case 'minCkb':
					return { ...prev, minCellCkb: null };
				case 'blockRange':
					return { ...prev, blockRange: { preset: 'all', customStart: null, customEnd: null } };
				default:
					return prev;
			}
		});
	}, []);

	// Handle clear all filters.
	const handleClearFilters = useCallback(() => {
		setFilters(DEFAULT_LIVE_CELL_FILTERS);
	}, []);

	// Show error if address parsing or fetch failed.
	if (error) {
		const handleRetry = script
			? () => {
				fetchOverviewData();
				fetchCellList();
			}
			: undefined;
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<ErrorDisplay
					error={error}
					title="Live Cells Error"
					description="Unable to load cells for this address. Check that the address format is valid and you are connected to the correct network."
					onRetry={handleRetry}
				/>
			</div>
		);
	}

	// Show full page skeleton while waiting for address parsing or initial load.
	if (!isReady || (isLoadingOverview && isLoadingCells)) {
		return (
			<div className="max-w-7xl mx-auto px-4 py-6">
				<SkeletonDetail />
			</div>
		);
	}

	const balanceState = buildFieldState({
		loading: isLoadingOverview,
		value: balance,
		uncomputableReason: 'Balance fetch did not return a value.',
	});
	const cellCountState = buildFieldState({
		supported: isArchiveSupported,
		supportedReason: 'Live cell count requires an archive node.',
		loading: isLoadingOverview,
		value: cellCount,
		uncomputableReason: 'Live cell count fetch did not return a value.',
	});
	const daoCellCountState = buildFieldState({
		supported: isArchiveSupported,
		supportedReason: 'DAO cell count requires an archive node.',
		loading: isLoadingOverview,
		value: daoCellCount,
		uncomputableReason: 'DAO cell count fetch did not return a value.',
	});
	const daoCapacityState = buildFieldState({
		loading: isLoadingOverview,
		value: daoCapacity,
		uncomputableReason: 'DAO locked capacity fetch did not return a value.',
	});

	type CellSummary = NonNullable<typeof oldestCell>;
	type ActivitySpan = { oldest: CellSummary; newest: CellSummary };
	const activitySpanState: FieldState<ActivitySpan> = isLoadingOverview
		? { kind: 'loading' }
		: !oldestCell || !newestCell
			? { kind: 'empty' }
			: isSingleCell
				? { kind: 'uncomputable', reason: 'Activity span requires at least two cells; only one live cell exists.' }
				: { kind: 'value', value: { oldest: oldestCell, newest: newestCell } };

	const oldestCellState: FieldState<CellSummary> = isLoadingOverview
		? { kind: 'loading' }
		: oldestCell === null
			? { kind: 'empty' }
			: { kind: 'value', value: oldestCell };
	const newestCellState: FieldState<CellSummary> = isLoadingOverview
		? { kind: 'loading' }
		: newestCell === null
			? { kind: 'empty' }
			: isSingleCell
				? { kind: 'uncomputable', reason: 'Newest cell same as oldest; only one live cell exists.' }
				: { kind: 'value', value: newestCell };

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
					<span aria-current="page">Live Cells</span>
				</nav>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Live Cells for Address
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

					<DetailRow label="Total Capacity">
						<FieldValue
							state={balanceState}
							format={(v) => formatCkb(v)}
							formatEmpty={() => formatCkb(0n)}
							width="medium"
							className="text-lg font-semibold text-nervos"
						/>
					</DetailRow>

					<DetailRow label="Live Cells">
						<FieldValue
							state={cellCountState}
							format={(v) => formatNumber(v)}
							width="narrow"
							className="font-mono text-gray-900 dark:text-white"
						/>
					</DetailRow>

					<DetailRow label="DAO Cells">
						<FieldValue
							state={daoCellCountState}
							format={(v) => `${formatNumber(v)} cell${v === 1n ? '' : 's'}`}
							formatEmpty={() => '0 cells'}
							width="narrow"
							className="text-gray-900 dark:text-white"
						/>
					</DetailRow>

					<DetailRow label="DAO Locked">
						<FieldValue
							state={daoCapacityState}
							format={(v) => (
								<span className="text-gray-900 dark:text-white">
									{formatCkb(v)}
									{v > 0n && balance !== null && balance > 0n && (
										<span className="text-gray-500 dark:text-gray-400 ml-2">
											({(Math.floor(Number((v * 100000n) / balance)) / 1000).toFixed(2)}% of balance)
										</span>
									)}
								</span>
							)}
							formatEmpty={() => formatCkb(0n)}
							width="medium"
						/>
					</DetailRow>

					<DetailRow label="Activity Span">
						<FieldValue
							state={activitySpanState}
							format={({ oldest, newest }) => formatActivitySpan(
								oldest.blockNumber,
								newest.blockNumber,
								oldest.timestamp,
								newest.timestamp,
							)}
							formatEmpty={() => 'No activity'}
							width="wide"
							className="text-gray-900 dark:text-white"
						/>
					</DetailRow>

					<DetailRow label="Oldest Cell">
						<FieldValue
							state={oldestCellState}
							format={(cell) => (
								<>
									<InternalLink
										href={generateLink(`/cell/${cell.txHash}/${cell.index}`)}
										className="text-nervos hover:text-nervos-dark"
									>
										{formatNumber(cell.blockNumber)}
									</InternalLink>
									<span className="text-gray-500 dark:text-gray-400 ml-2">
										({formatShortDate(cell.timestamp)})
									</span>
								</>
							)}
							formatEmpty={() => 'No cells'}
							width="wide"
							className="text-gray-900 dark:text-white"
						/>
					</DetailRow>

					<DetailRow label="Newest Cell">
						<FieldValue
							state={newestCellState}
							format={(cell) => (
								<>
									<InternalLink
										href={generateLink(`/cell/${cell.txHash}/${cell.index}`)}
										className="text-nervos hover:text-nervos-dark"
									>
										{formatNumber(cell.blockNumber)}
									</InternalLink>
									<span className="text-gray-500 dark:text-gray-400 ml-2">
										({formatShortDate(cell.timestamp)})
									</span>
								</>
							)}
							formatEmpty={() => 'No cells'}
							width="wide"
							className="text-gray-900 dark:text-white"
						/>
					</DetailRow>
				</div>
			</div>

			{/* Cells list. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Live Cells {filteredCellCount !== null && (
							(totalPages > 1 || isFiltered) ? (
								isFiltered
									? `(${Number(filteredCellCount) === 0 ? 0 : startIndex + 1}-${endIndex} of ${formatNumber(filteredCellCount)}${cellCount !== null ? `, ${formatNumber(cellCount)} total` : ''})`
									: `(${startIndex + 1}-${endIndex} of ${formatNumber(filteredCellCount)})`
							) : (
								`(${formatNumber(filteredCellCount)})`
							)
						)}
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
					{isLoadingCells ? (
						// Show skeleton items while cells are loading.
						<>
							{[...Array(Math.min(pageSize, 5))].map((_, i) => (
								<SkeletonCellItem key={i} />
							))}
						</>
					) : cells.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							{filterChips.length > 0
								? 'No cells match the current filters.'
								: 'No live cells found for this address.'}
						</div>
					) : (
						cells.map((cell) => (
							<CellRow
								key={`${cell.out_point.tx_hash}-${cell.out_point.index}`}
								cell={cell}
								networkType={networkType}
								timestamp={cellTimestamps.get(BigInt(cell.block_number))}
							/>
						))
					)}
				</div>

				{/* Pagination controls. */}
				{!isLoadingCells && filteredCellCount !== null && totalPages > 1 && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<Pagination
							currentPage={currentPage}
							totalItems={Number(filteredCellCount)}
							pageSize={pageSize}
							pageSizeOptions={PAGE_SIZE_CONFIG.options}
							onPageChange={handlePageChange}
							onPageSizeChange={handlePageSizeChange}
						/>
					</div>
				)}
			</div>

			{/* Filter modal. */}
			<LiveCellFilterModal
				isOpen={filterModalOpen}
				onClose={() => setFilterModalOpen(false)}
				filters={filters}
				sort={sort}
				presentScripts={presentScripts}
				onApply={(newFilters, newSort) => {
					setFilters(newFilters);
					setSort(newSort);
				}}
			/>
		</div>
	);
}
