import { navigate, generateLink } from '../lib/router';
import { AnimatedBackground } from './AnimatedBackground';
import { ThemeToggle } from './ThemeToggle';
import { SearchBar } from './SearchBar';
import { NetworkBlockSelector } from './NetworkBlockSelector';

export function Header() {
	return (
		<header className="relative bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
			{/* Wrapper for animated background to contain overflow without affecting dropdown. */}
			<div className="absolute inset-0 overflow-hidden">
				<AnimatedBackground />
			</div>

			<div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
				{/* Top row: Logo, Network/Block selector, Controls. */}
				<div className="flex items-center justify-between gap-4 mb-4">
					{/* Logo. */}
					<button
						onClick={() => navigate(generateLink('/'))}
						className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
					>
						<div className="w-8 h-8 rounded-lg bg-nervos flex items-center justify-center">
							<span className="text-white font-bold text-sm">CKB</span>
						</div>
						<span className="text-lg font-bold text-gray-900 dark:text-white">
							Explorer
						</span>
					</button>

					{/* Spacer. */}
					<div className="flex-1" />

					{/* Network and Block selector. */}
					<NetworkBlockSelector />

					{/* Theme and Animation toggles. */}
					<ThemeToggle />
				</div>

				{/* Search bar. */}
				<SearchBar />
			</div>
		</header>
	);
}
