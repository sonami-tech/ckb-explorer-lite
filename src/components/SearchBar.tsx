import { useState, useCallback } from 'react';
import { navigate, generateLink } from '../lib/router';
import { detectSearchType } from '../lib/format';

export function SearchBar() {
	const [query, setQuery] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = useCallback((e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const trimmed = query.trim();
		if (!trimmed) return;

		const searchType = detectSearchType(trimmed);

		switch (searchType) {
			case 'block-number':
				navigate(generateLink(`/block/${trimmed}`));
				setQuery('');
				break;
			case 'hash':
				// Could be block hash or tx hash - we'll try both in the page.
				// For now, navigate to tx page and let it handle redirects.
				navigate(generateLink(`/tx/${trimmed}`));
				setQuery('');
				break;
			case 'address':
				navigate(generateLink(`/address/${trimmed}`));
				setQuery('');
				break;
			case 'outpoint': {
				const [txHash, index] = trimmed.split(':');
				navigate(generateLink(`/cell/${txHash}/${index}`));
				setQuery('');
				break;
			}
			default:
				setError('Invalid input. Enter a block number, tx hash, address, or cell outpoint.');
		}
	}, [query]);

	return (
		<form onSubmit={handleSubmit} className="w-full">
			<div className="relative">
				<input
					type="text"
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setError(null);
					}}
					placeholder="Search by block, tx hash, address, or cell outpoint..."
					className={`
						w-full px-4 py-2.5 pr-12 text-sm rounded-lg
						bg-white dark:bg-gray-900
						border ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}
						placeholder:text-gray-400 dark:placeholder:text-gray-500
						focus:outline-none focus:ring-2 focus:ring-nervos/50 focus:border-nervos
					`}
				/>
				<button
					type="submit"
					className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-nervos hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</button>
			</div>
			{error && (
				<p className="mt-1 text-xs text-red-500">{error}</p>
			)}
		</form>
	);
}
