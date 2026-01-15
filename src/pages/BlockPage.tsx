import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import {
	formatNumber,
	formatRelativeTime,
	formatAbsoluteTime,
	formatEpoch,
	isValidHex,
} from '../lib/format';
import { generateLink } from '../lib/router';
import { InternalLink } from '../components/InternalLink';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay, CopyButton } from '../components/CopyButton';
import { DetailRow } from '../components/DetailRow';
import { Pagination } from '../components/Pagination';
import {
	TransactionRow,
	calculateTotalOutputCapacity,
	extractLockScripts,
	extractTypeScripts,
	isCellbaseTransaction,
	type EnrichedTransaction,
} from '../components/TransactionRow';
import { PAGE_SIZE_CONFIG } from '../config/defaults';
import type { RpcBlock, RpcTransaction } from '../types/rpc';
import type { NetworkType } from '../config/networks';

interface BlockPageProps {
	id: string;
}

const STORAGE_KEY = 'ckb-explorer-txs-page-size';

function getStoredPageSize(): number {
	const stored = localStorage.getItem(STORAGE_KEY);
	const parsed = parseInt(stored ?? '', 10);
	if (PAGE_SIZE_CONFIG.options.includes(parsed as 10 | 20 | 50 | 100)) {
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

	// Cache for enriched transactions (indexed by original position).
	const enrichedCacheRef = useRef<Map<number, EnrichedTransaction>>(new Map());

	// Track fetch ID to ignore stale responses when archiveHeight changes during navigation.
	const fetchIdRef = useRef(0);

	const fetchBlock = useCallback(async () => {
		const fetchId = ++fetchIdRef.current;

		setIsLoading(true);
		setError(null);
		// Reset pagination and cache on new block fetch.
		setCurrentPage(1);
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
	const transactions = block?.transactions ?? [];
	const totalTransactions = transactions.length;
	const startIndex = (currentPage - 1) * pageSize;
	const endIndex = Math.min(startIndex + pageSize, totalTransactions);
	const currentPageTransactions = transactions.slice(startIndex, endIndex);
	const blockNumber = block ? BigInt(block.header.number) : 0n;
	const blockTimestamp = block ? Number(BigInt(block.header.timestamp)) : 0;

	// Lazily enrich transactions for the current page with caching.
	// Must be called unconditionally (React hooks rule).
	const enrichedTransactions = useMemo(() => {
		if (!block) return [];
		return currentPageTransactions.map((tx, localIndex) => {
			const globalIndex = startIndex + localIndex;
			const cached = enrichedCacheRef.current.get(globalIndex);
			if (cached) {
				return cached;
			}
			const enriched = enrichTransaction(tx, globalIndex, blockNumber, blockTimestamp, networkType);
			enrichedCacheRef.current.set(globalIndex, enriched);
			return enriched;
		});
	}, [block, currentPageTransactions, startIndex, blockNumber, blockTimestamp, networkType]);

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
	const totalPages = Math.max(1, Math.ceil(totalTransactions / pageSize));

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
					<DetailRow label="Parent Hash">
						<HashDisplay hash={header.parent_hash} linkTo={generateLink(`/block/${header.parent_hash}`)} responsive />
					</DetailRow>
					<DetailRow label="Transactions Root">
						<HashDisplay hash={header.transactions_root} responsive />
					</DetailRow>
					<DetailRow label="Compact Target">
						<div className="flex items-center gap-2">
							<span className="font-mono">{header.compact_target}</span>
							<CopyButton text={header.compact_target} />
						</div>
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
							Transactions ({formatNumber(totalTransactions)})
						</h2>
						{totalPages > 1 && (
							<span className="text-sm text-gray-500 dark:text-gray-400">
								Showing {startIndex + 1}-{endIndex} of {formatNumber(totalTransactions)}
							</span>
						)}
					</div>
				</div>
				<div>
					{enrichedTransactions.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							No transactions in this block.
						</div>
					) : (
						enrichedTransactions.map((tx) => (
							<TransactionRow
								key={tx.txHash}
								transaction={tx}
								referenceTime={blockTimestamp}
							/>
						))
					)}
				</div>
				{totalTransactions > 0 && (
					<div className="p-4 border-t border-gray-200 dark:border-gray-700">
						<Pagination
							currentPage={currentPage}
							totalItems={totalTransactions}
							pageSize={pageSize}
							pageSizeOptions={PAGE_SIZE_CONFIG.options}
							onPageChange={setCurrentPage}
							onPageSizeChange={handlePageSizeChange}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
