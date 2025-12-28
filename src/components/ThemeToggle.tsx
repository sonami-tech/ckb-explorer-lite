import { useTheme, type Theme } from '../contexts/ThemeContext';
import { useAnimation } from '../contexts/AnimationContext';
import { Tooltip } from './Tooltip';

// Theme cycles: auto -> light -> dark -> auto.
const THEME_CYCLE: Theme[] = ['auto', 'light', 'dark'];

function getNextTheme(current: Theme): Theme {
	const idx = THEME_CYCLE.indexOf(current);
	return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}

// Simple SVG icons.
function SunIcon() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<circle cx="12" cy="12" r="5" />
			<line x1="12" y1="1" x2="12" y2="3" />
			<line x1="12" y1="21" x2="12" y2="23" />
			<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
			<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
			<line x1="1" y1="12" x2="3" y2="12" />
			<line x1="21" y1="12" x2="23" y2="12" />
			<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
			<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
		</svg>
	);
}

function MoonIcon() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
		</svg>
	);
}

function AutoIcon() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
			<circle cx="12" cy="12" r="10" />
			<path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
		</svg>
	);
}

function PlayIcon() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
			<path d="M8 5v14l11-7z" />
		</svg>
	);
}

function PauseIcon() {
	return (
		<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
			<rect x="6" y="4" width="4" height="16" />
			<rect x="14" y="4" width="4" height="16" />
		</svg>
	);
}

function getThemeIcon(theme: Theme) {
	switch (theme) {
		case 'light': return <SunIcon />;
		case 'dark': return <MoonIcon />;
		case 'auto': return <AutoIcon />;
	}
}

function getThemeLabel(theme: Theme): string {
	switch (theme) {
		case 'light': return 'Light theme';
		case 'dark': return 'Dark theme';
		case 'auto': return 'Auto theme';
	}
}

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const { isPlaying, toggle } = useAnimation();

	const buttonClass = `
		p-2 rounded-lg transition-colors
		text-gray-600 dark:text-gray-400
		hover:bg-gray-200 dark:hover:bg-gray-700
		hover:text-gray-900 dark:hover:text-white
	`;

	return (
		<div className="flex items-center gap-1">
			<Tooltip content={isPlaying ? 'Pause animation' : 'Play animation'}>
				<button
					onClick={toggle}
					className={buttonClass}
					aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
				>
					{isPlaying ? <PauseIcon /> : <PlayIcon />}
				</button>
			</Tooltip>
			<Tooltip content={getThemeLabel(theme)}>
				<button
					onClick={() => setTheme(getNextTheme(theme))}
					className={buttonClass}
					aria-label={getThemeLabel(theme)}
				>
					{getThemeIcon(theme)}
				</button>
			</Tooltip>
		</div>
	);
}
