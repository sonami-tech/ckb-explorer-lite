import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import {
	formatNumber,
	formatRelativeTime,
	formatAbsoluteTime,
	formatEpoch,
	isValidHex,
	compactTargetToTarget,
	compactTargetToDifficulty,
	formatDifficulty,
	formatEquivalentK7Miners,
} from '../lib/format';
import { generateLink } from '../lib/router';
import { InternalLink } from '../components/InternalLink';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay, CopyButton } from '../components/CopyButton';
import { Tooltip } from '../components/Tooltip';
import { InfoIcon } from '../components/InfoIcon';
import { DetailRow } from '../components/DetailRow';
import { Pagination } from '../components/Pagination';
import { ArchiveHeightWarning } from '../components/ArchiveHeightWarning';
import { type SortOption } from '../components/SortDropdown';
import {
	TransactionRow,
	calculateTotalOutputCapacity,
	extractLockScripts,
	extractTypeScripts,
	isCellbaseTransaction,
	type EnrichedTransaction,
} from '../components/TransactionRow';
import {
	type BlockPageFilters,
	type PresentScripts,
	DEFAULT_BLOCK_FILTERS,
} from '../components/TransactionFilters';
import { FilterSortButton } from '../components/FilterSortButton';
import { ActiveFilterChips, type FilterChip } from '../components/ActiveFilterChips';
import { BlockFilterModal } from '../components/BlockFilterModal';
import { getTypeScriptGroup, getLockScriptGroups, isOtherTypeScript, isOtherLockScript, OTHER_SCRIPTS_GROUP, NO_TYPE_SCRIPT_GROUP } from '../lib/scriptGroups';
import { PAGE_SIZE_CONFIG } from '../config/defaults';
import type { RpcBlock, RpcCellOutput, RpcTransaction } from '../types/rpc';
import type { NetworkType } from '../config/networks';

interface BlockPageProps {
	id: string;
}

const STORAGE_KEY = 'ckb-explorer-txs-page-size';

const SORT_OPTIONS: SortOption[] = [
	{ field: 'block_order', label: 'Block Order', ascLabel: 'First to Last', descLabel: 'Last to First' },
	{ field: 'ckb_amount', label: 'CKB Amount', ascLabel: 'Lowest First', descLabel: 'Highest First' },
	{ field: 'input_count', label: 'Input Count', ascLabel: 'Fewest First', descLabel: 'Most First' },
	{ field: 'output_count', label: 'Output Count', ascLabel: 'Fewest First', descLabel: 'Most First' },
];

const DEFAULT_SORT = { field: 'block_order', direction: 'asc' as const };

/**
 * Sort enriched transactions by the specified field and direction.
 */
function sortTransactions(
	transactions: EnrichedTransaction[],
	sort: { field: string; direction: 'asc' | 'desc' }
): EnrichedTransaction[] {
	return [...transactions].sort((a, b) => {
		let comparison = 0;
		switch (sort.field) {
			case 'block_order':
				comparison = (a.originalIndex ?? 0) - (b.originalIndex ?? 0);
				break;
			case 'ckb_amount':
				comparison = Number(a.totalCapacity - b.totalCapacity);
				break;
			case 'input_count':
				comparison = a.inputCount - b.inputCount;
				break;
			case 'output_count':
				comparison = a.outputCount - b.outputCount;
				break;
		}
		if (sort.direction === 'desc') comparison = -comparison;
		// Tiebreaker: original block order.
		if (comparison === 0 && sort.field !== 'block_order') {
			comparison = (a.originalIndex ?? 0) - (b.originalIndex ?? 0);
		}
		return comparison;
	});
}

/**
 * Filter enriched transactions based on the given filter criteria.
 */
function filterTransactions(
	transactions: EnrichedTransaction[],
	rawTransactions: RpcTransaction[],
	filters: BlockPageFilters,
	network: NetworkType
): EnrichedTransaction[] {
	return transactions.filter((tx) => {
		const rawTx = rawTransactions[tx.originalIndex ?? 0];

		// Cellbase filter.
		if (filters.cellbase === 'only' && !tx.isCellbase) return false;
		if (filters.cellbase === 'exclude' && tx.isCellbase) return false;

		// Min total CKB filter.
		if (filters.minTotalCkb !== null) {
			const totalCkb = Number(tx.totalCapacity) / 100_000_000;
			if (totalCkb < filters.minTotalCkb) return false;
		}

		// Min inputs filter.
		if (filters.minInputs !== null && tx.inputCount < filters.minInputs) return false;

		// Min outputs filter.
		if (filters.minOutputs !== null && tx.outputCount < filters.minOutputs) return false;

		// Type script groups filter (OR logic within groups).
		if (filters.typeScriptGroups.length > 0) {
			const includeNone = filters.typeScriptGroups.includes(NO_TYPE_SCRIPT_GROUP);
			const includeOther = filters.typeScriptGroups.includes(OTHER_SCRIPTS_GROUP);
			const knownGroups = filters.typeScriptGroups.filter(g => g !== OTHER_SCRIPTS_GROUP && g !== NO_TYPE_SCRIPT_GROUP);

			const hasMatchingType = rawTx.outputs.some((output: RpcCellOutput) => {
				// Check if this output has no type script.
				if (!output.type) {
					return includeNone;
				}

				const codeHash = output.type.code_hash;

				// Check if this is an "Other" (non-well-known) script.
				if (includeOther && isOtherTypeScript(codeHash, network)) {
					return true;
				}

				// Check if it matches any of the selected known groups.
				if (knownGroups.length > 0) {
					const groups = getTypeScriptGroup(codeHash, network);
					if (groups?.some(g => knownGroups.includes(g))) {
						return true;
					}
				}

				return false;
			});
			if (!hasMatchingType) return false;
		}

		// Lock script groups filter (OR logic within groups).
		if (filters.lockScriptGroups.length > 0) {
			const includeOther = filters.lockScriptGroups.includes(OTHER_SCRIPTS_GROUP);
			const knownGroups = filters.lockScriptGroups.filter(g => g !== OTHER_SCRIPTS_GROUP);

			const hasMatchingLock = rawTx.outputs.some((output: RpcCellOutput) => {
				const codeHash = output.lock.code_hash;

				// Check if this is an "Other" (non-well-known) script.
				if (includeOther && isOtherLockScript(codeHash, network)) {
					return true;
				}

				// Check if it matches any of the selected known groups.
				if (knownGroups.length > 0) {
					const groups = getLockScriptGroups(codeHash, network);
					if (groups?.some(g => knownGroups.includes(g))) {
						return true;
					}
				}

				return false;
			});
			if (!hasMatchingLock) return false;
		}

		return true;
	});
}

function getStoredPageSize(): number {
	const stored = localStorage.getItem(STORAGE_KEY);
	const parsed = parseInt(stored ?? '', 10);
	if (PAGE_SIZE_CONFIG.options.includes(parsed as 5 | 10 | 20 | 50 | 100)) {
		return parsed;
	}
	return PAGE_SIZE_CONFIG.default;
}

/**
 * Enrich a single raw RPC transaction for display.
 */
function enrichTransaction(
	tx: RpcTransaction,
	index: number,
	blockNumber: bigint,
	blockTimestamp: number,
	networkType: NetworkType,
): EnrichedTransaction {
	const txHash = tx.hash ?? `pending-${index}`;

	return {
		txHash,
		blockNumber,
		timestamp: blockTimestamp,
		totalCapacity: calculateTotalOutputCapacity(tx),
		lockScripts: extractLockScripts(tx, networkType),
		typeScripts: extractTypeScripts(tx, networkType),
		inputCount: tx.inputs.length,
		outputCount: tx.outputs.length,
		isCellbase: isCellbaseTransaction(tx),
		originalIndex: index,
	};
}

export function BlockPage({ id }: BlockPageProps) {
	const rpc = useRpc();
	const { currentNetwork } = useNetwork();
	const networkType = currentNetwork?.type ?? 'mainnet';

	const [block, setBlock] = useState<RpcBlock | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Pagination state.
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(getStoredPageSize);

	// Sort state.
	const [sort, setSort] = useState<{ field: string; direction: 'asc' | 'desc' }>(DEFAULT_SORT);

	// Filter state.
	const [filters, setFilters] = useState<BlockPageFilters>(DEFAULT_BLOCK_FILTERS);
	const [filterModalOpen, setFilterModalOpen] = useState(false);

	// Cache for enriched transactions (indexed by original position).
	const enrichedCacheRef = useRef<Map<number, EnrichedTransaction>>(new Map());

	// Track fetch ID to ignore stale responses when archiveHeight changes during navigation.
	const fetchIdRef = useRef(0);

	const fetchBlock = useCallback(async () => {
		const fetchId = ++fetchIdRef.current;

		setIsLoading(true);
		setError(null);
		// Reset pagination, sort, filters, and cache on new block fetch.
		setCurrentPage(1);
		setSort(DEFAULT_SORT);
		setFilters(DEFAULT_BLOCK_FILTERS);
		enrichedCacheRef.current = new Map();

		try {
			let result: RpcBlock | null = null;

			// Check if id is a number or hash.
			if (/^\d+$/.test(id)) {
				result = await rpc.getBlockByNumber(BigInt(id));
			} else if (isValidHex(id)) {
				result = await rpc.getBlockByHash(id);
			} else {
				throw new Error('Invalid block identifier. Please provide a block number or hash.');
			}

			// Ignore stale response if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;

			if (!result) {
				throw new Error(`Block not found: ${id}`);
			}

			setBlock(result);
		} catch (err) {
			// Ignore stale errors if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;
			setError(err instanceof Error ? err : new Error('Failed to fetch block.'));
		} finally {
			// Only update loading state if this is still the current fetch.
			if (fetchId === fetchIdRef.current) {
				setIsLoading(false);
			}
		}
	}, [rpc, id]);

	useEffect(() => {
		fetchBlock();
	}, [fetchBlock]);

	// Handle page size change.
	const handlePageSizeChange = useCallback((newSize: number) => {
		setPageSize(newSize);
		localStorage.setItem(STORAGE_KEY, newSize.toString());
		setCurrentPage(1); // Reset to first page.
	}, []);

	// Derive values from block (may be null during loading).
	const transactions = useMemo(() => block?.transactions ?? [], [block]);
	const totalTransactions = transactions.length;
	const blockNumber = block ? BigInt(block.header.number) : 0n;
	const blockTimestamp = block ? Number(BigInt(block.header.timestamp)) : 0;

	// Enrich all transactions with caching (needed for sorting).
	// Must be called unconditionally (React hooks rule).
	const allEnrichedTransactions = useMemo(() => {
		if (!block) return [];
		return transactions.map((tx, index) => {
			const cached = enrichedCacheRef.current.get(index);
			if (cached) {
				return cached;
			}
			const enriched = enrichTransaction(tx, index, blockNumber, blockTimestamp, networkType);
			enrichedCacheRef.current.set(index, enriched);
			return enriched;
		});
	}, [block, transactions, blockNumber, blockTimestamp, networkType]);

	// Sort transactions.
	const sortedTransactions = useMemo(
		() => sortTransactions(allEnrichedTransactions, sort),
		[allEnrichedTransactions, sort]
	);

	// Scan transactions for present scripts to show only relevant filter options.
	const presentScripts = useMemo<PresentScripts>(() => {
		const typeGroups = new Map<string, number>();
		const lockGroups = new Map<string, number>();

		for (const tx of transactions) {
			const seenTypeGroups = new Set<string>();
			const seenLockGroups = new Set<string>();

			for (const output of tx.outputs) {
				// Check type script groups.
				if (output.type) {
					const codeHash = output.type.code_hash;
					const groups = getTypeScriptGroup(codeHash, networkType);
					if (groups) {
						for (const group of groups) {
							seenTypeGroups.add(group);
						}
					} else if (isOtherTypeScript(codeHash, networkType)) {
						seenTypeGroups.add(OTHER_SCRIPTS_GROUP);
					}
				} else {
					// Output has no type script.
					seenTypeGroups.add(NO_TYPE_SCRIPT_GROUP);
				}

				// Check lock script groups.
				const lockCodeHash = output.lock.code_hash;
				const lockGroupsList = getLockScriptGroups(lockCodeHash, networkType);
				if (lockGroupsList) {
					for (const group of lockGroupsList) {
						seenLockGroups.add(group);
					}
				} else if (isOtherLockScript(lockCodeHash, networkType)) {
					seenLockGroups.add(OTHER_SCRIPTS_GROUP);
				}
			}

			// Increment counts for scripts seen in this transaction.
			for (const group of seenTypeGroups) {
				typeGroups.set(group, (typeGroups.get(group) || 0) + 1);
			}
			for (const group of seenLockGroups) {
				lockGroups.set(group, (lockGroups.get(group) || 0) + 1);
			}
		}

		return { typeGroups, lockGroups };
	}, [transactions, networkType]);

	// Filter transactions.
	const filteredTransactions = useMemo(
		() => filterTransactions(sortedTransactions, transactions, filters, networkType),
		[sortedTransactions, transactions, filters, networkType]
	);

	const filteredCount = filteredTransactions.length;
	const isFiltered = filteredCount !== totalTransactions;

	// Build filter chips for display.
	const filterChips = useMemo<FilterChip[]>(() => {
		const chips: FilterChip[] = [];

		if (filters.cellbase === 'only') {
			chips.push({ type: 'cellbase', label: 'Cellbase Only', value: 'only' });
		} else if (filters.cellbase === 'exclude') {
			chips.push({ type: 'cellbase', label: 'Exclude Cellbase', value: 'exclude' });
		}

		if (filters.minTotalCkb !== null) {
			chips.push({ type: 'minCkb', label: `>=${filters.minTotalCkb.toLocaleString()} CKB`, value: String(filters.minTotalCkb) });
		}

		if (filters.minInputs !== null) {
			chips.push({ type: 'minInputs', label: `>=${filters.minInputs} inputs`, value: String(filters.minInputs) });
		}

		if (filters.minOutputs !== null) {
			chips.push({ type: 'minOutputs', label: `>=${filters.minOutputs} outputs`, value: String(filters.minOutputs) });
		}

		for (const group of filters.typeScriptGroups) {
			chips.push({ type: 'typeScript', label: group, value: group });
		}

		for (const group of filters.lockScriptGroups) {
			chips.push({ type: 'lockScript', label: group, value: group });
		}

		return chips;
	}, [filters]);

	// Handle chip removal.
	const handleRemoveChip = useCallback((chip: FilterChip) => {
		setFilters(prev => {
			switch (chip.type) {
				case 'cellbase':
					return { ...prev, cellbase: 'all' };
				case 'minCkb':
					return { ...prev, minTotalCkb: null };
				case 'minInputs':
					return { ...prev, minInputs: null };
				case 'minOutputs':
					return { ...prev, minOutputs: null };
				case 'typeScript':
					return { ...prev, typeScriptGroups: prev.typeScriptGroups.filter(g => g !== chip.value) };
				case 'lockScript':
					return { ...prev, lockScriptGroups: prev.lockScriptGroups.filter(g => g !== chip.value) };
				default:
					return prev;
			}
		});
	}, []);

	const handleClearFilters = useCallback(() => {
		setFilters(DEFAULT_BLOCK_FILTERS);
	}, []);

	// Handle filter modal apply: update both filters and sort at once.
	const handleFilterModalApply = useCallback((newFilters: BlockPageFilters, newSort: { field: string; direction: 'asc' | 'desc' }) => {
		setFilters(newFilters);
		setSort(newSort);
	}, []);

	// Reset to first page when filters change.
	useEffect(() => {
		setCurrentPage(1);
	}, [filters]);

	// Paginate filtered transactions.
	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = Math.min(startIndex + pageSize, filteredCount);
	const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

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

	const { header, proposals } = block;
	const timestamp = BigInt(header.timestamp);
	const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header. */}
			<div className="mb-6">
				<nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<InternalLink href={generateLink('/')} className="hover:text-nervos">
						Home
					</InternalLink>
					<span aria-hidden="true">/</span>
					<span aria-current="page">Block</span>
				</nav>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Block {formatNumber(blockNumber)}
				</h1>
			</div>

			<ArchiveHeightWarning />

			{/* Block details. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Block Details</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="Block Hash">
						<HashDisplay hash={header.hash} responsive />
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
						{formatNumber(totalTransactions)}
					</DetailRow>
					<DetailRow label="Proposals">
						{proposals.length}
					</DetailRow>
					<DetailRow label="Uncle Blocks">
						{block.uncles.length}
					</DetailRow>
					<DetailRow label="Parent Hash">
						<HashDisplay hash={header.parent_hash} linkTo={generateLink(`/block/${header.parent_hash}`)} responsive />
					</DetailRow>
					<DetailRow label="Transactions Root">
						<HashDisplay hash={header.transactions_root} responsive />
					</DetailRow>
					<DetailRow label="Compact Target">
						<div className="flex items-center gap-2">
							<Tooltip content={compactTargetToTarget(header.compact_target)}>
								<span className="font-mono">{header.compact_target}</span>
							</Tooltip>
							<CopyButton text={header.compact_target} />
						</div>
					</DetailRow>
					<DetailRow label="Difficulty">
						{(() => {
							const difficultyHex = compactTargetToDifficulty(header.compact_target);
							const fullValue = formatNumber(BigInt(difficultyHex));
							const equivalentMiners = formatEquivalentK7Miners(difficultyHex);
							return (
								<div className="flex items-center gap-2">
									<Tooltip content={fullValue}>
										<span>{formatDifficulty(difficultyHex)}</span>
									</Tooltip>
									<InfoIcon tooltip={`This difficulty is equivalent to ${equivalentMiners} (the most powerful CKB miner at 63.5 TH/s each).`} />
								</div>
							);
						})()}
					</DetailRow>
					<DetailRow label="Nonce">
						<div className="flex items-center gap-2">
							<span className="font-mono">{header.nonce}</span>
							<CopyButton text={header.nonce} />
						</div>
					</DetailRow>
				</div>
			</div>

			{/* Transactions. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-gray-900 dark:text-white">
							Transactions {(totalPages > 1 || isFiltered) ? (
								isFiltered
									? `(${filteredCount === 0 ? 0 : startIndex + 1}-${endIndex} of ${formatNumber(filteredCount)}, ${formatNumber(totalTransactions)} total)`
									: `(${startIndex + 1}-${endIndex} of ${formatNumber(totalTransactions)})`
							) : (
								`(${formatNumber(totalTransactions)})`
							)}
						</h2>
						{totalTransactions > 1 && (
							<FilterSortButton
								onClick={() => setFilterModalOpen(true)}
								activeFilterCount={filterChips.length}
							/>
						)}
					</div>
				</div>

				{/* Active filter chips. */}
				{totalTransactions > 1 && filterChips.length > 0 && (
					<div className="p-4 border-b border-gray-200 dark:border-gray-700">
						<ActiveFilterChips
							chips={filterChips}
							onRemove={handleRemoveChip}
							onClearAll={handleClearFilters}
						/>
					</div>
				)}

				<div>
					{paginatedTransactions.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							{isFiltered
								? 'No transactions match the current filters.'
								: 'No transactions in this block.'
							}
						</div>
					) : (
						paginatedTransactions.map((tx) => (
							<TransactionRow
								key={tx.txHash}
								transaction={tx}
							/>
						))
					)}
				</div>
				{filteredCount > 0 && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<Pagination
							currentPage={currentPage}
							totalItems={filteredCount}
							pageSize={pageSize}
							pageSizeOptions={PAGE_SIZE_CONFIG.options}
							onPageChange={setCurrentPage}
							onPageSizeChange={handlePageSizeChange}
						/>
					</div>
				)}
			</div>

			{/* Mobile filter modal. */}
			<BlockFilterModal
				isOpen={filterModalOpen}
				onClose={() => setFilterModalOpen(false)}
				sortOptions={SORT_OPTIONS}
				sortValue={sort}
				filters={filters}
				presentScripts={presentScripts}
				defaultSort={DEFAULT_SORT}
				onApply={handleFilterModalApply}
			/>
		</div>
	);
}
