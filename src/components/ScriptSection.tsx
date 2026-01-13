/**
 * ScriptSection component for displaying Lock Script and Type Script details.
 * Includes known script detection with badge, tooltip, and internal resource linking.
 */

import { useMemo } from 'react';
import { Script as CccScript } from '@ckb-ccc/core';
import { useNetwork } from '../contexts/NetworkContext';
import { lookupLockScript, lookupTypeScript, type ScriptInfo } from '../lib/wellKnown';
import { formatBytes } from '../lib/format';
import { navigate, generateLink } from '../lib/router';
import { HashDisplay } from './CopyButton';
import { HashTypeIndicator } from './OptionIndicator';
import { HexData } from './HexData';
import { DetailRow } from './DetailRow';
import { Tooltip } from './Tooltip';
import { BRAND } from '../lib/badgeStyles';

interface ScriptData {
	code_hash: string;
	hash_type: string;
	args: string;
}

interface ScriptSectionProps {
	/** Section title. */
	title: 'Lock Script' | 'Type Script';
	/** The script to display. */
	script: ScriptData;
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

	// Compute script ID (hash of serialized script).
	const scriptId = useMemo(() => {
		try {
			const cccScript = CccScript.from({
				codeHash: script.code_hash,
				hashType: script.hash_type,
				args: script.args,
			});
			return cccScript.hash();
		} catch {
			return null;
		}
	}, [script.code_hash, script.hash_type, script.args]);

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
				<DetailRow label={<ArgsLabel args={script.args} />}>
					<HexData data={script.args} context="inline" showSize={false} />
				</DetailRow>
				{scriptId && (
					<DetailRow label="Script ID">
						<HashDisplay hash={scriptId} responsive />
					</DetailRow>
				)}
			</div>
		</div>
	);
}

/**
 * Args label with size indicator in lighter style.
 * Shows "Args" for empty, "Args (20 B)" for non-empty.
 */
function ArgsLabel({ args }: { args: string }) {
	if (args === '0x') {
		return <>Args</>;
	}
	const byteCount = (args.length - 2) / 2;
	return (
		<>
			Args{' '}
			<span className="text-size-meta font-normal">
				({formatBytes(byteCount)})
			</span>
		</>
	);
}

/**
 * Badge showing known script name with tooltip and optional internal resource link.
 * Links to Well-Known Resources page when resourceId is available.
 */
function ScriptBadge({ info }: { info: ScriptInfo }) {
	const hasLink = !!info.resourceId;
	const resourceUrl = hasLink ? generateLink(`/resources#${info.resourceId}`) : undefined;

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if (!resourceUrl) return;
		// Allow modifier keys to open in new tab.
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(resourceUrl);
	};

	const badge = (
		<span
			className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium ${BRAND} ${hasLink ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}`}
		>
			{info.name}
		</span>
	);

	const content = (
		<Tooltip content={info.description} placement="bottom" interactive={hasLink}>
			{hasLink ? (
				<a
					href={resourceUrl}
					onClick={handleClick}
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
