import { useNetwork } from '../contexts/NetworkContext';
import { navigate, generateLink } from '../lib/router';
import { AnimatedBackground } from './AnimatedBackground';
import { ThemeToggle } from './ThemeToggle';
import { ArchiveHeightSelector } from './ArchiveHeightSelector';
import { SearchBar } from './SearchBar';
import { NetworkSelector } from './NetworkSelector';

export function Header() {
	const { isArchiveSupported } = useNetwork();

	return (
		<header className="relative bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-hidden">
			<AnimatedBackground />

			<div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
				{/* Top row: Logo, Network, Theme toggle. */}
				<div className="flex items-center justify-between mb-4">
					<button
						onClick={() => navigate(generateLink('/'))}
						className="flex items-center gap-2 hover:opacity-80 transition-opacity"
					>
						<div className="w-8 h-8 rounded-lg bg-nervos flex items-center justify-center">
							<span className="text-white font-bold text-sm">CKB</span>
						</div>
						<div>
							<h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
								Explorer Lite
							</h1>
							<NetworkSelector />
						</div>
					</button>

					<ThemeToggle />
				</div>

				{/* Bottom row: Search and Archive selector. */}
				<div className="flex flex-col md:flex-row md:items-end gap-4">
					<div className="flex-1">
						<SearchBar />
					</div>
					{isArchiveSupported && <ArchiveHeightSelector />}
				</div>
			</div>
		</header>
	);
}
