import { useState, useEffect, useCallback, useRef } from 'react';
import { useRpc } from '../contexts/NetworkContext';
import { parseAddress, getNetworkFromPrefix } from '../lib/address';
import {
	formatNumber,
	formatCkb,
	truncateHex,
} from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { HashDisplay, CopyButton } from '../components/CopyButton';
import type { RpcCell, RpcScript, IndexerSearchKey } from '../types/rpc';

interface AddressPageProps {
	address: string;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const STORAGE_KEY = 'ckb-explorer-page-size';

function getStoredPageSize(): number {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored && PAGE_SIZE_OPTIONS.includes(parseInt(stored, 10))) {
		return parseInt(stored, 10);
	}
	return 20;
}

export function AddressPage({ address }: AddressPageProps) {
	const rpc = useRpc();
	const { archiveHeight } = useArchive();
	const [script, setScript] = useState<RpcScript | null>(null);
	const [isDeprecated, setIsDeprecated] = useState(false);
	const [networkPrefix, setNetworkPrefix] = useState<string>('');
	const [balance, setBalance] = useState<bigint | null>(null);
	const [cells, setCells] = useState<RpcCell[]>([]);
	const [cursor, setCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [pageSize, setPageSize] = useState(getStoredPageSize);

	// Track fetch ID to ignore stale responses when archiveHeight changes during navigation.
	const fetchIdRef = useRef(0);

	// Parse address on mount.
	useEffect(() => {
		try {
			const parsed = parseAddress(address);
			if (!parsed.script) {
				throw new Error('Short format addresses are not supported. Please use the full format address.');
			}
			setScript(parsed.script);
			setIsDeprecated(parsed.isDeprecated);
			setNetworkPrefix(parsed.prefix);
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Invalid address format.'));
			setIsLoading(false);
		}
	}, [address]);

	// Fetch balance and initial cells.
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
				with_data: true,
			};

			// Fetch balance and cells in parallel.
			const [balanceResult, cellsResult] = await Promise.all([
				rpc.getCellsCapacity(searchKey, archiveHeight),
				rpc.getCells(searchKey, 'desc', pageSize, undefined, archiveHeight),
			]);

			// Ignore stale response if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;

			setBalance(balanceResult);
			setCells(cellsResult.objects);
			setCursor(cellsResult.last_cursor);
			setHasMore(cellsResult.objects.length >= pageSize);
		} catch (err) {
			// Ignore stale errors if a newer fetch has started.
			if (fetchId !== fetchIdRef.current) return;
			setError(err instanceof Error ? err : new Error('Failed to fetch address data.'));
		} finally {
			// Only update loading state if this is still the current fetch.
			if (fetchId === fetchIdRef.current) {
				setIsLoading(false);
			}
		}
	}, [rpc, script, archiveHeight, pageSize]);

	useEffect(() => {
		if (script) {
			fetchData();
		}
	}, [fetchData, script]);

	// Load more cells.
	const loadMore = async () => {
		if (!script || !cursor || isLoadingMore) return;

		setIsLoadingMore(true);

		try {
			const searchKey: IndexerSearchKey = {
				script,
				script_type: 'lock',
				script_search_mode: 'exact',
				with_data: true,
			};

			const result = await rpc.getCells(searchKey, 'desc', pageSize, cursor, archiveHeight);
			setCells((prev) => [...prev, ...result.objects]);
			setCursor(result.last_cursor);
			setHasMore(result.objects.length >= pageSize);
		} catch (err) {
			// Show error but don't clear existing data.
			console.error('Failed to load more cells:', err);
		} finally {
			setIsLoadingMore(false);
		}
	};

	// Handle page size change.
	const handlePageSizeChange = (newSize: number) => {
		setPageSize(newSize);
		localStorage.setItem(STORAGE_KEY, newSize.toString());
		// Reset and refetch.
		setCells([]);
		setCursor(null);
	};

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
				<ErrorDisplay error={error} title="Address Error" onRetry={script ? fetchData : undefined} />
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header. */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<button onClick={() => navigate(generateLink('/'))} className="hover:text-nervos">
						Home
					</button>
					<span>/</span>
					<span>Address</span>
				</div>
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
						Address
					</h1>
					{isDeprecated && (
						<span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
							Legacy Format
						</span>
					)}
					<span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
						{getNetworkFromPrefix(networkPrefix)}
					</span>
				</div>
			</div>

			{/* Address details. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="font-semibold text-gray-900 dark:text-white">Overview</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					<DetailRow label="Address">
						<span className="font-mono text-sm break-all">{address}</span>
						<CopyButton text={address} />
					</DetailRow>
					<DetailRow label="Balance">
						<span className="text-lg font-semibold text-nervos">
							{balance !== null ? formatCkb(balance) : '...'}
						</span>
					</DetailRow>
					{script && (
						<>
							<DetailRow label="Lock Code Hash">
								<HashDisplay hash={script.code_hash} />
							</DetailRow>
							<DetailRow label="Lock Hash Type">
								{script.hash_type}
							</DetailRow>
							<DetailRow label="Lock Args">
								<HashDisplay hash={script.args} truncate={script.args.length > 44} />
							</DetailRow>
						</>
					)}
				</div>
			</div>

			{/* Live Cells. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Live Cells ({cells.length}{hasMore ? '+' : ''})
					</h2>
				</div>
				<div className="divide-y divide-gray-200 dark:divide-gray-700">
					{cells.length === 0 ? (
						<div className="p-4 text-sm text-gray-500 dark:text-gray-400 italic">
							No live cells found for this address.
						</div>
					) : (
						cells.map((cell) => (
							<CellListItem
								key={`${cell.out_point.tx_hash}-${cell.out_point.index}`}
								cell={cell}
								archiveHeight={archiveHeight}
							/>
						))
					)}
				</div>

				{/* Load more controls. */}
				{(hasMore || cells.length > 0) && (
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
								{PAGE_SIZE_OPTIONS.map((size) => (
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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col md:flex-row md:items-center p-4 gap-2">
			<span className="w-40 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
				{label}
			</span>
			<div className="flex-1 flex items-center gap-2 text-sm text-gray-900 dark:text-white break-all">
				{children}
			</div>
		</div>
	);
}

function CellListItem({
	cell,
	archiveHeight,
}: {
	cell: RpcCell;
	archiveHeight: number | undefined;
}) {
	return (
		<button
			onClick={() => navigate(generateLink(
				`/cell/${cell.out_point.tx_hash}/${parseInt(cell.out_point.index, 16)}`,
				archiveHeight
			))}
			className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
		>
			<div className="flex items-center justify-between mb-2">
				<span className="font-mono text-sm text-nervos">
					{truncateHex(cell.out_point.tx_hash, 8, 8)}:{parseInt(cell.out_point.index, 16)}
				</span>
				<span className="font-mono text-sm">
					{formatCkb(cell.output.capacity)}
				</span>
			</div>
			<div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
				<span>Block #{formatNumber(BigInt(cell.block_number))}</span>
				{cell.output.type && (
					<span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
						Has Type
					</span>
				)}
				{cell.output_data && cell.output_data !== '0x' && (
					<span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
						Has Data
					</span>
				)}
			</div>
		</button>
	);
}
