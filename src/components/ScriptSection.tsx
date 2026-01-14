/**
 * ScriptSection component for displaying Lock Script and Type Script details.
 * Includes known script detection with badge, tooltip, and internal resource linking.
 */

import { useMemo, useState } from 'react';
import { Script as CccScript } from '@ckb-ccc/core';
import { useNetwork } from '../contexts/NetworkContext';
import { useTruncation, useIsMobile } from '../hooks/ui';
import { lookupLockScript, lookupTypeScript } from '../lib/wellKnown';
import { formatBytes } from '../lib/format';
import { HashDisplay, CopyButton, DownloadButton, ModalButton, ChevronButton } from './CopyButton';
import { HashTypeIndicator } from './OptionIndicator';
import { DetailRow } from './DetailRow';
import { DataModal } from './DataModal';
import { ScriptIndicatorPill } from './ScriptIndicatorPill';

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
				{scriptInfo && (
				<ScriptIndicatorPill
					name={scriptInfo.name}
					resourceId={scriptInfo.resourceId}
					description={scriptInfo.description}
					size="sm"
				/>
			)}
			</div>

			{/* Script details. */}
			<div className="divide-y divide-gray-200 dark:divide-gray-700">
				<DetailRow label="Code Hash">
					<HashDisplay hash={script.code_hash} responsive />
				</DetailRow>
				<DetailRow label="Hash Type">
					<HashTypeIndicator hashType={script.hash_type} />
				</DetailRow>
				<ScriptArgsRow args={script.args} />
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
 * Custom Args row with responsive layout matching DetailRow breakpoints.
 * Mobile/Tablet (<1024px): Label + buttons on same row, hex content below.
 * Desktop (>=1024px): Label on left, hex content + inline buttons on right.
 * If truncated, centered chevron below opens modal for full view.
 */
function ScriptArgsRow({ args }: { args: string }) {
	const isMobile = useIsMobile(1024);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const { displayData, isTruncated, byteCount } = useTruncation(args);

	// Empty args case.
	if (args === '0x') {
		return (
			<div className="flex flex-col lg:flex-row lg:items-center p-4 gap-2">
				<span className="w-40 flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
					Args
				</span>
				<span className="text-sm text-gray-500 dark:text-gray-400 italic">Empty</span>
			</div>
		);
	}

	// Action buttons.
	const actionButtons = (
		<div className="flex items-center gap-1 flex-shrink-0">
			<CopyButton text={args} />
			<DownloadButton data={args} />
			<ModalButton onClick={() => setIsModalOpen(true)} />
		</div>
	);

	// Args label with size.
	const argsLabel = (
		<span className="text-sm font-medium text-gray-500 dark:text-gray-400">
			Args{' '}
			<span className="text-size-meta font-normal">
				({formatBytes(byteCount)})
			</span>
		</span>
	);

	return (
		<div className="p-4">
			{/* Mobile: Label and buttons on same row. */}
			{isMobile ? (
				<>
					<div className="flex items-center justify-between mb-2">
						{argsLabel}
						{actionButtons}
					</div>
					<code className="font-mono text-sm break-all block text-gray-900 dark:text-white">
						{displayData}
					</code>
				</>
			) : (
				/* Desktop: Label on left, content + buttons on right. */
				<div className="flex items-center gap-2">
					<span className="w-40 flex-shrink-0">
						{argsLabel}
					</span>
					<div className="flex-1 flex items-center gap-2">
						<code className="font-mono text-sm break-all flex-1 min-w-0 text-gray-900 dark:text-white">
							{displayData}
						</code>
						{actionButtons}
					</div>
				</div>
			)}

			{/* Chevron opens modal for full view. */}
			{isTruncated && (
				<div className="mt-2 flex justify-center">
					<ChevronButton isExpanded={false} onClick={() => setIsModalOpen(true)} />
				</div>
			)}

			{/* Modal for full data view. */}
			<DataModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title="Args"
				byteCount={byteCount}
				data={args}
			>
				<code className="font-mono text-sm break-all block whitespace-pre-wrap">
					{args}
				</code>
			</DataModal>
		</div>
	);
}
