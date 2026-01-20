import type { ReactNode } from 'react';
import { RpcError } from '../lib/rpc';
import { useArchive } from '../contexts/ArchiveContext';
import { formatNumber } from '../lib/format';

interface ErrorDisplayProps {
	error: Error | RpcError;
	title?: string;
	description?: string;
	onRetry?: () => void;
}

/** Format error message, inserting a word break opportunity in long hashes. */
function formatErrorMessage(text: string): ReactNode {
	// Check if the message looks like a hex hash (0x followed by hex chars).
	if (/^0x[0-9a-fA-F]{64}$/.test(text)) {
		const mid = Math.floor(text.length / 2);
		return (
			<span className="font-mono">
				{text.slice(0, mid)}
				<wbr />
				{text.slice(mid)}
			</span>
		);
	}
	return text;
}

export function ErrorDisplay({ error, title, description, onRetry }: ErrorDisplayProps) {
	const { archiveHeight, tipBlockNumber, isHeightBeyondTip } = useArchive();

	const isRpcError = error instanceof RpcError;
	const errorMessage = error.message;

	return (
		<div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0">
					<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="text-lg font-medium text-red-800 dark:text-red-200">
						{title || 'Error'}
					</h3>
					{description && (
						<p className="mt-1 text-sm text-red-700 dark:text-red-300">
							{description}
						</p>
					)}
					<p className="mt-3 text-sm text-red-700 dark:text-red-300">
						{formatErrorMessage(errorMessage)}
					</p>

					{/* RPC error details. */}
					{isRpcError && error.data && (
						<details className="mt-2">
							<summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline">
								Technical details
							</summary>
							<pre className="mt-1 p-2 text-xs bg-red-100 dark:bg-red-900/30 rounded overflow-x-auto">
								{error.data}
							</pre>
						</details>
					)}

					{/* Archive height context. */}
					{isHeightBeyondTip && archiveHeight !== undefined && (
						<div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
							<p className="text-sm text-amber-700 dark:text-amber-300">
								The specified archive height ({formatNumber(archiveHeight)}) exceeds the current
								blockchain tip ({tipBlockNumber !== null ? formatNumber(tipBlockNumber) : '...'}).
								Archive queries only work for historical blocks at or below the current tip.
							</p>
						</div>
					)}

					{/* Retry button. */}
					{onRetry && (
						<button
							onClick={onRetry}
							className="mt-4 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
						>
							Try again
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * Simple inline error for forms and small areas.
 */
export function InlineError({ message }: { message: string }) {
	return (
		<p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
			<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			{message}
		</p>
	);
}

/**
 * Connection error display.
 */
export function ConnectionError({ onRetry }: { onRetry?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center p-12 text-center">
			<svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-7.072-7.072m4.243 4.243L4.929 9.172m0 0a9 9 0 0112.728 0" />
			</svg>
			<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
				Unable to connect to CKB node
			</h3>
			<p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
				Make sure the CKB archive node is running and accessible at the configured RPC endpoint.
			</p>
			{onRetry && (
				<button
					onClick={onRetry}
					className="px-4 py-2 text-sm font-medium text-white bg-nervos rounded-lg hover:bg-nervos-dark transition-colors"
				>
					Retry connection
				</button>
			)}
		</div>
	);
}
