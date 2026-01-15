import { useCallback } from 'react';
import { navigate } from '../lib/router';

interface InternalLinkProps {
	href: string;
	children: React.ReactNode;
	className?: string;
	onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
	title?: string;
}

/**
 * Internal navigation link that preserves normal link behavior.
 * - Renders a real <a href> so the URL is visible on hover and can be opened in a new tab.
 * - Intercepts plain left-clicks to use SPA navigation via navigate().
 */
export function InternalLink({
	href,
	children,
	className = '',
	onClick,
	title,
}: InternalLinkProps) {
	const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
		onClick?.(e);
		if (e.defaultPrevented) return;

		// Allow modifier keys and non-primary buttons to use default browser behavior.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
			return;
		}

		e.preventDefault();
		navigate(href);
	}, [href, onClick]);

	return (
		<a href={href} onClick={handleClick} className={className} title={title}>
			{children}
		</a>
	);
}
