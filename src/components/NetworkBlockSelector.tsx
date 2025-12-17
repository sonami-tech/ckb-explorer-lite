import { useState, useRef, useEffect, useCallback } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { useArchive } from '../contexts/ArchiveContext';
import { getNetworkTypeLabel } from '../lib/networks';
import { formatNumber } from '../lib/format';

/**
 * Combined network and block height selector.
 * Shows current network and block status in a compact button,
 * with a dropdown for changing network and block height mode.
 */
export function NetworkBlockSelector() {
	const { networks, selectedIndex, currentNetwork, selectNetwork, isArchiveSupported } = useNetwork();
	const { archiveHeight, setArchiveHeight, tipBlockNumber } = useArchive();
	const [isOpen, setIsOpen] = useState(false);
	const [heightInput, setHeightInput] = useState('');
	const dropdownRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const isTrackingLatest = archiveHeight === undefined;

	// Close dropdown when clicking outside.
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Focus input when switching to specific mode.
	useEffect(() => {
		if (isOpen && !isTrackingLatest && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen, isTrackingLatest]);

	const handleNetworkChange = useCallback((index: number) => {
		selectNetwork(index);
		// Don't close - let user also set block height if needed.
	}, [selectNetwork]);

	const handleSetLatest = useCallback(() => {
		setArchiveHeight(undefined);
		setHeightInput('');
		setIsOpen(false);
	}, [setArchiveHeight]);

	const handleSetSpecific = useCallback(() => {
		const trimmed = heightInput.trim();
		if (trimmed === '') return;

		const parsed = parseInt(trimmed, 10);
		if (!isNaN(parsed) && parsed >= 0) {
			setArchiveHeight(parsed);
			setIsOpen(false);
		}
	}, [heightInput, setArchiveHeight]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSetSpecific();
		} else if (e.key === 'Escape') {
			setIsOpen(false);
		}
	}, [handleSetSpecific]);

	if (!currentNetwork) {
		return null;
	}

	const networkLabel = currentNetwork.name;
	const typeLabel = getNetworkTypeLabel(currentNetwork.type);
	const blockLabel = isTrackingLatest
		? 'Latest'
		: `#${formatNumber(BigInt(archiveHeight!))}`;

	return (
		<div className="relative" ref={dropdownRef}>
			{/* Trigger button. */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`
					flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
					bg-white dark:bg-gray-800
					border border-gray-300 dark:border-gray-600
					hover:border-gray-400 dark:hover:border-gray-500
					transition-all duration-200
					${isOpen ? 'ring-2 ring-nervos/50 border-nervos' : ''}
				`}
			>
				{/* Network name. */}
				<span className="font-medium text-gray-900 dark:text-white">
					{networkLabel}
				</span>

				{/* Separator. */}
				<span className="text-gray-300 dark:text-gray-600">•</span>

				{/* Block status. */}
				<span className="text-gray-600 dark:text-gray-400">
					{blockLabel}
				</span>

				{/* Live indicator - pulsing dot when tracking latest. */}
				{isTrackingLatest && isArchiveSupported && (
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
					</span>
				)}

				{/* Archive mode indicator. */}
				{!isTrackingLatest && (
					<span className="px-1.5 py-0.5 text-xs font-medium bg-nervos/10 text-nervos rounded">
						Archive
					</span>
				)}

				{/* Chevron. */}
				<svg
					className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{/* Dropdown. */}
			{isOpen && (
				<div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50">
					{/* Network section. */}
					{networks.length > 1 && (
						<>
							<div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
								<span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Network
								</span>
							</div>
							<div className="p-2">
								{networks.map((network, index) => (
									<button
										key={index}
										onClick={() => handleNetworkChange(index)}
										className={`
											w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left
											transition-colors
											${index === selectedIndex
												? 'bg-nervos/10 text-nervos'
												: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
											}
										`}
									>
										{/* Radio indicator. */}
										<span className={`
											w-4 h-4 rounded-full border-2 flex items-center justify-center
											${index === selectedIndex
												? 'border-nervos'
												: 'border-gray-300 dark:border-gray-600'
											}
										`}>
											{index === selectedIndex && (
												<span className="w-2 h-2 rounded-full bg-nervos" />
											)}
										</span>
										<span className="flex-1">{network.name}</span>
										<span className="text-xs text-gray-500 dark:text-gray-400">
											{getNetworkTypeLabel(network.type)}
										</span>
									</button>
								))}
							</div>
						</>
					)}

					{/* Block height section - only for archive networks. */}
					{isArchiveSupported && (
						<>
							{networks.length > 1 && (
								<div className="border-t border-gray-200 dark:border-gray-700" />
							)}
							<div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
								<span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									Block Height
								</span>
							</div>
							<div className="p-2 space-y-1">
								{/* Latest block option. */}
								<button
									onClick={handleSetLatest}
									className={`
										w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left
										transition-colors
										${isTrackingLatest
											? 'bg-nervos/10 text-nervos'
											: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
										}
									`}
								>
									{/* Radio indicator. */}
									<span className={`
										w-4 h-4 rounded-full border-2 flex items-center justify-center
										${isTrackingLatest
											? 'border-nervos'
											: 'border-gray-300 dark:border-gray-600'
										}
									`}>
										{isTrackingLatest && (
											<span className="w-2 h-2 rounded-full bg-nervos" />
										)}
									</span>
									<span className="flex-1">Latest block</span>
									{/* Live indicator. */}
									<span className="relative flex h-2 w-2">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
										<span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
									</span>
									{tipBlockNumber !== null && (
										<span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
											#{formatNumber(tipBlockNumber)}
										</span>
									)}
								</button>

								{/* Specific block option. */}
								<div className={`
									flex items-center gap-2 px-3 py-2 rounded-md
									${!isTrackingLatest
										? 'bg-nervos/10'
										: 'hover:bg-gray-100 dark:hover:bg-gray-700'
									}
								`}>
									{/* Radio indicator - clickable to switch mode. */}
									<button
										onClick={() => {
											if (isTrackingLatest) {
												// Switch to specific mode with current tip.
												if (tipBlockNumber !== null) {
													setHeightInput(tipBlockNumber.toString());
												}
											}
										}}
										className={`
											w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
											${!isTrackingLatest
												? 'border-nervos'
												: 'border-gray-300 dark:border-gray-600'
											}
										`}
									>
										{!isTrackingLatest && (
											<span className="w-2 h-2 rounded-full bg-nervos" />
										)}
									</button>

									{/* Input field. */}
									<input
										ref={inputRef}
										type="text"
										value={heightInput}
										onChange={(e) => setHeightInput(e.target.value)}
										onKeyDown={handleKeyDown}
										onFocus={() => {
											if (isTrackingLatest && tipBlockNumber !== null) {
												setHeightInput(tipBlockNumber.toString());
											}
										}}
										placeholder="Block height"
										className={`
											flex-1 px-2 py-1 text-sm rounded border
											bg-white dark:bg-gray-900
											placeholder:text-gray-400 dark:placeholder:text-gray-500
											focus:outline-none focus:ring-1 focus:ring-nervos
											${!isTrackingLatest
												? 'border-nervos text-nervos'
												: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
											}
										`}
									/>

									{/* Go button. */}
									<button
										onClick={handleSetSpecific}
										disabled={heightInput.trim() === ''}
										className={`
											p-1.5 rounded transition-colors
											${heightInput.trim()
												? 'text-nervos hover:bg-nervos/10'
												: 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
											}
										`}
										title="Go to block"
									>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
										</svg>
									</button>
								</div>
							</div>
						</>
					)}

					{/* Non-archive network message. */}
					{!isArchiveSupported && networks.length <= 1 && (
						<div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
							Archive mode not available on this network.
						</div>
					)}
				</div>
			)}
		</div>
	);
}
