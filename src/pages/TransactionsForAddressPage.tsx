import { useState, useEffect, useCallback, useRef } from 'react';
import { useRpc, useNetwork } from '../contexts/NetworkContext';
import { parseAddress } from '../lib/address';
import { formatNumber } from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { InternalLink } from '../components/InternalLink';
import { PAGE_SIZE_CONFIG } from '../config/defaults';
import {
	TransactionRow,
	calculateTotalOutputCapacity,
	extractLockScripts,
	extractTypeScripts,
	isCellbaseTransaction,
	type EnrichedTransaction,
} from '../components/TransactionRow';
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

	const fetchIdRef = useRef(0);

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
			const searchKey: IndexerSearchKey = {
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

			const [txCountResult, groupedTxsResult] = await Promise.all([
				rpc.getTransactionsCount(searchKey, archiveHeight),
				rpc.getGroupedTransactions(searchKey, 'desc', pageSize, undefined, archiveHeight),
			]);

			if (fetchId !== fetchIdRef.current) return;

			setTransactionCount(BigInt(txCountResult.count));
			setReferenceTimestamp(archiveTimestamp);

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
	}, [rpc, script, archiveHeight, pageSize, enrichTransactions]);

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
			const searchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
			};

			const result = await rpc.getGroupedTransactions(searchKey, 'desc', pageSize, cursor, archiveHeight);

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

	// Truncate address for display in header.
	const truncatedAddress = address.length > 20
		? `${address.slice(0, 12)}...${address.slice(-8)}`
		: address;

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
					Transactions for {truncatedAddress}
					{archiveHeight !== undefined && ` @ Block ${formatNumber(archiveHeight)}`}
				</h1>
			</div>

			{/* Back to address link. */}
			<div className="mb-4">
				<button
					onClick={() => navigate(generateLink(`/address/${address}`))}
					className="text-sm text-nervos hover:text-nervos-dark"
				>
					← Back to Address
				</button>
			</div>

			{/* Transactions list. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Transactions ({transactionCount !== null ? formatNumber(transactionCount) : '...'})
					</h2>
				</div>
				<div>
					{transactions.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							No transactions found for this address.
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
							<select
								value={pageSize}
								onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
								className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
							>
								{PAGE_SIZE_CONFIG.options.map((size) => (
									<option key={size} value={size}>
										{size}
									</option>
								))}
							</select>
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
		</div>
	);
}
