/**
 * ScriptLink component for displaying script names with optional internal links.
 * Links to Well-Known Resources page when the script has a resourceId.
 */

import { lookupLockScript, lookupTypeScript } from '../lib/wellKnown';
import { navigate, generateLink } from '../lib/router';
import type { NetworkType } from '../config/networks';

interface ScriptLinkProps {
	/** The script to look up. */
	script: {
		code_hash: string;
		hash_type: string;
		args: string;
	};
	/** Type of script for lookup. */
	scriptType: 'lock' | 'type';
	/** Network type for lookup. */
	networkType: NetworkType;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * Display a script name with optional link to resources page.
 */
export function ScriptLink({ script, scriptType, networkType, className = '' }: ScriptLinkProps) {
	// Look up script info.
	const scriptInfo = scriptType === 'lock'
		? lookupLockScript(script.code_hash, script.hash_type, networkType, script.args)
		: lookupTypeScript(script.code_hash, script.hash_type, networkType, script.args);

	// Unknown script - render plain text.
	if (!scriptInfo) {
		return <span className={`text-gray-500 dark:text-gray-400 ${className}`}>Unknown</span>;
	}

	// Known script without resourceId - render plain text with name.
	if (!scriptInfo.resourceId) {
		return <span className={`text-gray-900 dark:text-white ${className}`}>{scriptInfo.name}</span>;
	}

	// Known script with resourceId - render as internal link.
	const resourceUrl = generateLink(`/resources#${scriptInfo.resourceId}`);

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		// Allow modifier keys to open in new tab.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(resourceUrl);
	};

	return (
		<a
			href={resourceUrl}
			onClick={handleClick}
			className={`text-nervos hover:text-nervos-dark transition-colors ${className}`}
		>
			{scriptInfo.name}
		</a>
	);
}
