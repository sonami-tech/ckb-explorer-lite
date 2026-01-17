import { useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface FilterModalShellProps {
	/** Whether the modal is open. */
	isOpen: boolean;
	/** Handler for cancel behavior (discard changes). Called on X button, Cancel button, backdrop click, or Escape key. */
	onClose: () => void;
	/** Handler for apply behavior (commit changes). Called on Apply button. */
	onApply: () => void;
	/** Handler to clear all filters. Called on Clear All button. */
	onClearAll: () => void;
	/** Title displayed in modal header. */
	title?: string;
	/** Label for the apply button. */
	applyLabel?: string;
	/** Content to render in the scrollable body area. */
	children: ReactNode;
}

/**
 * Shared modal shell for filter modals.
 * Provides consistent layout and behavior:
 * - Header with title and X close button
 * - Scrollable content area for children
 * - Footer with Clear All (left), Cancel, and Apply buttons (right)
 *
 * Responsive behavior:
 * - Mobile (< md): Full viewport
 * - Desktop/Tablet (>= md): Centered modal with backdrop, max-width ~md (28rem), max-height ~80vh
 *
 * Features:
 * - Portal rendering to document.body
 * - Backdrop click calls onClose
 * - Escape key binding calls onClose
 * - Body scroll prevention when open
 */
export function FilterModalShell({
	isOpen,
	onClose,
	onApply,
	onClearAll,
	title = 'Sort & Filters',
	applyLabel = 'Apply',
	children,
}: FilterModalShellProps) {
	// Handle escape key to close.
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	}, [onClose]);

	// Prevent body scroll when modal is open.
	useEffect(() => {
		if (!isOpen) return;

		document.addEventListener('keydown', handleKeyDown);
		document.body.style.overflow = 'hidden';

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = '';
		};
	}, [isOpen, handleKeyDown]);

	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-50 md:flex md:items-start md:justify-center md:pt-[10vh]">
			{/* Backdrop (desktop only). */}
			<div
				className="hidden md:block fixed inset-0 bg-black/50"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal container. */}
			<div
				className="h-full w-full bg-white dark:bg-gray-900 flex flex-col md:relative md:h-auto md:max-h-[80vh] md:max-w-lg md:rounded-lg md:shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="filter-modal-shell-title"
			>
				{/* Header. */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 md:rounded-t-lg">
					<h2
						id="filter-modal-shell-title"
						className="text-base font-semibold text-gray-900 dark:text-white"
					>
						{title}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
						aria-label="Close"
					>
						<svg
							className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* Scrollable content area. */}
				<div className="flex-1 overflow-y-auto px-4 py-4">
					{children}
				</div>

				{/* Footer. */}
				<div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 md:rounded-b-lg">
					{/* Clear All button (left). */}
					<button
						type="button"
						onClick={onClearAll}
						className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
					>
						Clear All
					</button>

					{/* Cancel and Apply buttons (right). */}
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={onApply}
							className="px-4 py-2 text-sm font-medium text-white bg-nervos hover:bg-nervos-dark rounded transition-colors"
						>
							{applyLabel}
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	// Render via portal to document root.
	return createPortal(modalContent, document.body);
}
