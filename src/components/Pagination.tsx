import { useState, useCallback, useMemo } from 'react';
import { Tooltip } from './Tooltip';
import { ChevronDownIcon } from './CopyButton';

interface PaginationProps {
	/** Current page number (1-indexed). */
	currentPage: number;
	/** Total number of items. */
	totalItems: number;
	/** Number of items per page. */
	pageSize: number;
	/** Available page size options. */
	pageSizeOptions: readonly number[];
	/** Called when page changes. */
	onPageChange: (page: number) => void;
	/** Called when page size changes. */
	onPageSizeChange: (size: number) => void;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Generate array of page numbers to display with ellipsis.
 * Always shows first, last, current, and neighbors.
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, i) => i + 1);
	}

	const pages: (number | 'ellipsis')[] = [];

	// Always show first page.
	pages.push(1);

	if (currentPage > 3) {
		pages.push('ellipsis');
	}

	// Show pages around current.
	const start = Math.max(2, currentPage - 1);
	const end = Math.min(totalPages - 1, currentPage + 1);

	for (let i = start; i <= end; i++) {
		if (!pages.includes(i)) {
			pages.push(i);
		}
	}

	if (currentPage < totalPages - 2) {
		pages.push('ellipsis');
	}

	// Always show last page.
	if (!pages.includes(totalPages)) {
		pages.push(totalPages);
	}

	return pages;
}

/**
 * Reusable pagination component with page numbers, prev/next buttons,
 * page size selector, and go-to-page input.
 */
export function Pagination({
	currentPage,
	totalItems,
	pageSize,
	pageSizeOptions,
	onPageChange,
	onPageSizeChange,
	className = '',
}: PaginationProps) {
	const [pageInput, setPageInput] = useState('');

	const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
	const pageNumbers = useMemo(
		() => getPageNumbers(currentPage, totalPages),
		[currentPage, totalPages]
	);

	const canGoPrev = currentPage > 1;
	const canGoNext = currentPage < totalPages;

	const handlePrevPage = useCallback(() => {
		if (canGoPrev) {
			onPageChange(currentPage - 1);
		}
	}, [canGoPrev, currentPage, onPageChange]);

	const handleNextPage = useCallback(() => {
		if (canGoNext) {
			onPageChange(currentPage + 1);
		}
	}, [canGoNext, currentPage, onPageChange]);

	const handleGoToPage = useCallback(() => {
		const trimmed = pageInput.trim();
		if (trimmed === '') return;

		const parsed = parseInt(trimmed, 10);
		if (!isNaN(parsed)) {
			// Clamp to valid range.
			const clamped = Math.max(1, Math.min(totalPages, parsed));
			onPageChange(clamped);
			setPageInput('');
		}
	}, [pageInput, totalPages, onPageChange]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleGoToPage();
		}
	}, [handleGoToPage]);

	const handlePageSizeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
		const newSize = parseInt(e.target.value, 10);
		onPageSizeChange(newSize);
	}, [onPageSizeChange]);

	// Handle keyboard navigation on page buttons.
	const handlePageButtonKeyDown = useCallback((e: React.KeyboardEvent, page: number) => {
		if (e.key === 'ArrowLeft' && page > 1) {
			e.preventDefault();
			onPageChange(page - 1);
		} else if (e.key === 'ArrowRight' && page < totalPages) {
			e.preventDefault();
			onPageChange(page + 1);
		}
	}, [totalPages, onPageChange]);

	// Don't render if only one page and few items.
	if (totalItems <= pageSize && totalPages === 1) {
		return null;
	}

	return (
		<div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
			{/* Left: Page size selector. */}
			<div className="flex items-center gap-2">
				<label className="text-sm text-gray-500 dark:text-gray-400">
					Items per page:
				</label>
				<div className="relative">
					<select
						value={pageSize}
						onChange={handlePageSizeChange}
						className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 pr-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-nervos cursor-pointer appearance-none"
					>
						{pageSizeOptions.map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
					<ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2" />
				</div>
			</div>

			{/* Center: Page numbers with prev/next. */}
			<div className="flex items-center gap-1">
				{/* Previous button. */}
				<button
					onClick={handlePrevPage}
					disabled={!canGoPrev}
					className={`
						px-2 py-1.5 text-sm rounded transition-colors
						${canGoPrev
							? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
							: 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
						}
					`}
					aria-label="Previous page"
				>
					← Prev
				</button>

				{/* Page numbers. */}
				{pageNumbers.map((page, index) => (
					page === 'ellipsis' ? (
						<span
							key={`ellipsis-${index}`}
							className="px-2 py-1.5 text-sm text-gray-400 dark:text-gray-500"
						>
							...
						</span>
					) : (
						<button
							key={page}
							onClick={() => onPageChange(page)}
							onKeyDown={(e) => handlePageButtonKeyDown(e, page)}
							className={`
								min-w-[32px] px-2 py-1.5 text-sm rounded transition-colors
								${page === currentPage
									? 'bg-nervos text-white font-medium'
									: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
								}
							`}
							aria-label={`Page ${page}`}
							aria-current={page === currentPage ? 'page' : undefined}
						>
							{page}
						</button>
					)
				))}

				{/* Next button. */}
				<button
					onClick={handleNextPage}
					disabled={!canGoNext}
					className={`
						px-2 py-1.5 text-sm rounded transition-colors
						${canGoNext
							? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
							: 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
						}
					`}
					aria-label="Next page"
				>
					Next →
				</button>
			</div>

			{/* Right: Go to page input. */}
			<div className="flex items-center gap-1">
				<label className="text-sm text-gray-500 dark:text-gray-400">
					Page:
				</label>
				<input
					type="number"
					min="1"
					max={totalPages}
					value={pageInput}
					onChange={(e) => setPageInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={currentPage.toString()}
					className="w-16 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-nervos"
					aria-label="Go to page"
				/>
				<Tooltip content="Go to page">
					<button
						onClick={handleGoToPage}
						disabled={pageInput.trim() === ''}
						className={`
							p-1.5 rounded transition-colors
							${pageInput.trim()
								? 'text-nervos hover:bg-nervos/10'
								: 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
							}
						`}
						aria-label="Go to page"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</button>
				</Tooltip>
			</div>
		</div>
	);
}
