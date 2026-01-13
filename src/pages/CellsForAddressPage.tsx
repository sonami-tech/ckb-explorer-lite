import { useState, useEffect, useCallback, useRef } from 'react';
import { useRpc } from '../contexts/NetworkContext';
import { parseAddress } from '../lib/address';
import { formatNumber, formatCkb, truncateHex } from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { useArchive } from '../contexts/ArchiveContext';
import { SkeletonDetail } from '../components/Skeleton';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { PAGE_SIZE_CONFIG } from '../config/defaults';
import type { RpcCell, RpcScript, IndexerSearchKey } from '../types/rpc';
import { HAS_TYPE, HASH_DATA } from '../lib/badgeStyles';

interface CellsForAddressPageProps {
	address: string;
}

const STORAGE_KEY = 'ckb-explorer-cells-page-size';

function getStoredPageSize(): number {
	const stored = localStorage.getItem(STORAGE_KEY);
	const parsed = parseInt(stored ?? '', 10);
	if (PAGE_SIZE_CONFIG.options.includes(parsed as 10 | 20 | 50 | 100)) {
		return parsed;
	}
	return PAGE_SIZE_CONFIG.default;
}

export function CellsForAddressPage({ address }: CellsForAddressPageProps) {
	const rpc = useRpc();
	const { archiveHeight } = useArchive();
	const [script, setScript] = useState<RpcScript | null>(null);
	const [cells, setCells] = useState<RpcCell[]>([]);
	const [cellCount, setCellCount] = useState<bigint | null>(null);
	const [cursor, setCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [pageSize, setPageSize] = useState(getStoredPageSize);

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

	// Fetch cell count and initial cells.
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

			const [cellsCountResult, cellsResult] = await Promise.all([
				rpc.getCellsCount(searchKey, archiveHeight),
				rpc.getCells(searchKey, 'desc', pageSize, undefined, archiveHeight),
			]);

			if (fetchId !== fetchIdRef.current) return;

			setCellCount(BigInt(cellsCountResult.count));
			setCells(cellsResult.objects);
			setCursor(cellsResult.last_cursor);
			setHasMore(cellsResult.objects.length >= pageSize);
		} catch (err) {
			if (fetchId !== fetchIdRef.current) return;
			setError(err instanceof Error ? err : new Error('Failed to fetch cells.'));
		} finally {
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
			console.error('Failed to load more cells:', err);
		} finally {
			setIsLoadingMore(false);
		}
	};

	// Handle page size change.
	const handlePageSizeChange = (newSize: number) => {
		setPageSize(newSize);
		localStorage.setItem(STORAGE_KEY, newSize.toString());
		setCells([]);
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
				<ErrorDisplay error={error} title="Cells Error" onRetry={script ? fetchData : undefined} />
			</div>
		);
	}

	return (
		<div className="max-w-7xl mx-auto px-4 py-6">
			{/* Header with breadcrumb. */}
			<div className="mb-6">
				<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
					<button onClick={() => navigate(generateLink('/'))} className="hover:text-nervos">
						Home
					</button>
					<span>/</span>
					<button onClick={() => navigate(generateLink(`/address/${address}`))} className="hover:text-nervos">
						Address
					</button>
					<span>/</span>
					<span>Live Cells</span>
				</div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					Live Cells for {truncatedAddress}
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

			{/* Cells list. */}
			<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
					<h2 className="font-semibold text-gray-900 dark:text-white">
						Live Cells ({cellCount !== null ? formatNumber(cellCount) : '...'})
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

function CellListItem({ cell }: { cell: RpcCell }) {
	return (
		<button
			onClick={() => navigate(generateLink(
				`/cell/${cell.out_point.tx_hash}/${parseInt(cell.out_point.index, 16)}`
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
				<span>Block {formatNumber(BigInt(cell.block_number))}</span>
				{cell.output.type && (
					<span className={`px-1.5 py-0.5 ${HAS_TYPE} rounded`}>
						Has Type
					</span>
				)}
				{cell.output_data && cell.output_data !== '0x' && (
					<span className={`px-1.5 py-0.5 ${HASH_DATA} rounded`}>
						Has Data
					</span>
				)}
			</div>
		</button>
	);
}
