import { useEffect, useCallback, type ReactNode } from 'react';
import { CopyButton, DownloadButton } from './CopyButton';

interface DataModalProps {
	/** Whether the modal is open. */
	isOpen: boolean;
	/** Handler to close the modal. */
	onClose: () => void;
	/** Title to display in modal header. */
	title: string;
	/** Size in bytes to display. */
	byteCount: number;
	/** Raw hex data for copy/download. */
	data: string;
	/** Content to render in the modal body. */
	children: ReactNode;
}

/**
 * Full-screen modal for viewing large data.
 * Features:
 * - Escape key to close
 * - Click outside to close
 * - Copy and download buttons in header
 * - Scrollable content area
 */
export function DataModal({
	isOpen,
	onClose,
	title,
	byteCount,
	data,
	children,
}: DataModalProps) {
	// Handle escape key to close.
	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			onClose();
		}
	}, [onClose]);

	useEffect(() => {
		if (!isOpen) return;

		document.addEventListener('keydown', handleKeyDown);
		// Prevent body scroll when modal is open.
		document.body.style.overflow = 'hidden';

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = '';
		};
	}, [isOpen, handleKeyDown]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			{/* Backdrop. */}
			<div
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal container. */}
			<div className="relative w-[95vw] h-[90vh] max-w-6xl bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col">
				{/* Header. */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
					<div className="flex items-center gap-3">
						<h2 id="modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
							{title}
						</h2>
						<span className="text-sm text-gray-500 dark:text-gray-400">
							({formatBytesCompact(byteCount)})
						</span>
					</div>

					<div className="flex items-center gap-2">
						<CopyButton text={data} />
						<DownloadButton data={data} filename={title.toLowerCase().replace(/\s+/g, '-')} />
						<button
							onClick={onClose}
							className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
							aria-label="Close modal"
						>
							<svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>

				{/* Content area - scrollable. */}
				<div className="flex-1 overflow-auto p-4">
					<div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Compact byte formatting for modal header.
 */
function formatBytesCompact(bytes: number): string {
	if (bytes === 0) return '0 B';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
