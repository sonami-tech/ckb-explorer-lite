/**
 * ScriptSection component for displaying Lock Script and Type Script details.
 * Includes known script detection with badge, tooltip, and documentation link.
 */

import { useNetwork } from '../contexts/NetworkContext';
import { lookupLockScript, lookupTypeScript, type ScriptInfo } from '../lib/knownScripts';
import { HashDisplay } from './CopyButton';
import { HashTypeIndicator } from './OptionIndicator';
import { TruncatedData } from './TruncatedData';
import { DetailRow } from './DetailRow';
import { Tooltip } from './Tooltip';

interface Script {
	code_hash: string;
	hash_type: string;
	args: string;
}

interface ScriptSectionProps {
	/** Section title. */
	title: 'Lock Script' | 'Type Script';
	/** The script to display. */
	script: Script;
}

/**
 * Display a script section with known script detection.
 */
export function ScriptSection({ title, script }: ScriptSectionProps) {
	const { currentNetwork } = useNetwork();
	const networkType = currentNetwork?.type ?? 'mainnet';

	// Look up script info based on type.
	const scriptInfo = title === 'Lock Script'
		? lookupLockScript(script.code_hash, script.hash_type, networkType, script.args)
		: lookupTypeScript(script.code_hash, script.hash_type, networkType, script.args);

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
			{/* Header with optional known script badge. */}
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
				{scriptInfo && <ScriptBadge info={scriptInfo} />}
			</div>

			{/* Script details. */}
			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				<DetailRow label="Code Hash">
					<HashDisplay hash={script.code_hash} responsive />
				</DetailRow>
				<DetailRow label="Hash Type">
					<HashTypeIndicator hashType={script.hash_type} />
				</DetailRow>
				<DetailRow label="Args">
					{script.args === '0x' ? (
						<span className="text-gray-500 dark:text-gray-400 italic">Empty</span>
					) : (
						<TruncatedData data={script.args} />
					)}
				</DetailRow>
			</div>
		</div>
	);
}

/**
 * Badge showing known script name with tooltip and optional documentation link.
 */
function ScriptBadge({ info }: { info: ScriptInfo }) {
	const hasLink = !!info.sourceUrl;

	const badge = (
		<span
			className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium bg-nervos/10 text-nervos ${hasLink ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
		>
			{info.name}
			{hasLink && (
				<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
				</svg>
			)}
		</span>
	);

	const content = (
		<Tooltip content={info.description} placement="bottom" interactive={hasLink}>
			{hasLink ? (
				<a
					href={info.sourceUrl}
					target="_blank"
					rel="noopener noreferrer"
				>
					{badge}
				</a>
			) : (
				badge
			)}
		</Tooltip>
	);

	return content;
}
