import { useState, useCallback } from 'react';
import { useArchive } from '../contexts/ArchiveContext';
import { formatNumber } from '../lib/format';

export function ArchiveHeightSelector() {
	const { archiveHeight, setArchiveHeight, tipBlockNumber, isHeightBeyondTip } = useArchive();
	const [inputValue, setInputValue] = useState(archiveHeight?.toString() ?? '');
	const [isFocused, setIsFocused] = useState(false);

	const handleSubmit = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = inputValue.trim();

		if (trimmed === '') {
			setArchiveHeight(undefined);
			return;
		}

		const parsed = parseInt(trimmed, 10);
		if (!isNaN(parsed) && parsed >= 0) {
			setArchiveHeight(parsed);
		}
	}, [inputValue, setArchiveHeight]);

	const handleClear = useCallback(() => {
		setInputValue('');
		setArchiveHeight(undefined);
	}, [setArchiveHeight]);

	const isArchiveMode = archiveHeight !== undefined;

	return (
		<div className="flex flex-col gap-1">
			<form onSubmit={handleSubmit} className="flex items-center gap-2">
				<div className="relative">
					<input
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						placeholder="Block height"
						className={`
							w-36 px-3 py-1.5 text-sm rounded-lg border
							bg-white dark:bg-gray-800
							placeholder:text-gray-400 dark:placeholder:text-gray-500
							focus:outline-none focus:ring-2 focus:ring-nervos/50
							${isHeightBeyondTip
								? 'border-amber-400 dark:border-amber-500'
								: isArchiveMode
									? 'border-nervos'
									: 'border-gray-300 dark:border-gray-600'
							}
						`}
					/>
					{isArchiveMode && (
						<button
							type="button"
							onClick={handleClear}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							title="Clear archive height"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					)}
				</div>
				<button
					type="submit"
					className={`
						px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
						${isArchiveMode
							? 'bg-nervos text-white hover:bg-nervos-dark'
							: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
						}
					`}
				>
					{isArchiveMode ? 'Update' : 'Set'}
				</button>
			</form>

			{/* Current tip indicator. */}
			<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
				<span>Current tip:</span>
				<span className="font-mono">
					{tipBlockNumber !== null ? formatNumber(tipBlockNumber) : '...'}
				</span>
				{isArchiveMode && (
					<span className={`
						px-1.5 py-0.5 rounded text-xs font-medium
						${isHeightBeyondTip
							? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
							: 'bg-nervos/10 text-nervos'
						}
					`}>
						{isHeightBeyondTip ? 'Beyond tip' : 'Archive mode'}
					</span>
				)}
			</div>

			{/* Warning for beyond tip. */}
			{isHeightBeyondTip && isFocused && (
				<p className="text-xs text-amber-600 dark:text-amber-400">
					Height {formatNumber(archiveHeight!)} exceeds current tip. Queries will fail.
				</p>
			)}
		</div>
	);
}
