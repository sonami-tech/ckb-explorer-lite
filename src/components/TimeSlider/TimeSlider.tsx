import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNetwork, useRpc } from '../../contexts/NetworkContext';
import { useArchive } from '../../contexts/ArchiveContext';
import { getNetworkEvents, type NetworkEvent } from '../../config';
import { formatNumber } from '../../lib/format';
import { EventMarker } from './EventMarker';
import { EventInfoCard } from './EventInfoCard';
import { Tooltip } from '../Tooltip';

interface TimeSliderProps {
	/** Optional CSS class name for container. */
	className?: string;
}

/**
 * Convert block number to slider position (0-100).
 */
function blockToPosition(blockNumber: number, tipBlock: number): number {
	if (tipBlock === 0) return 0;
	return (blockNumber / tipBlock) * 100;
}

/**
 * Convert slider position (0-100) to block number.
 */
function positionToBlock(position: number, tipBlock: number): number {
	return Math.round((position / 100) * tipBlock);
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}


/**
 * Time slider component for scrubbing through blockchain history.
 * Displays network events as markers and allows selecting any block height.
 */
export function TimeSlider({ className = '' }: TimeSliderProps) {
	const rpc = useRpc();
	const { currentNetwork, isArchiveSupported } = useNetwork();
	const { archiveHeight, setArchiveHeight, tipBlockNumber, tipBlockTimestamp } = useArchive();

	const trackRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const [isDragging, setIsDragging] = useState(false);
	const [localPosition, setLocalPosition] = useState<number | null>(null);
	const [isEditingBlock, setIsEditingBlock] = useState(false);
	const [blockInputValue, setBlockInputValue] = useState('');
	const [selectedEvent, setSelectedEvent] = useState<NetworkEvent | null>(null);
	const [selectedBlockTimestamp, setSelectedBlockTimestamp] = useState<number | null>(null);
	const [isLoadingTimestamp, setIsLoadingTimestamp] = useState(false);

	// Get events for current network type.
	const events = useMemo(() => {
		if (!currentNetwork) return [];
		return getNetworkEvents(currentNetwork.type);
	}, [currentNetwork]);

	// Compute derived values (safe even if tipBlockNumber is null).
	const tipNumber = tipBlockNumber !== null ? Number(tipBlockNumber) : 0;
	const tipTimestamp = tipBlockTimestamp !== null ? Number(tipBlockTimestamp) : Date.now();
	const currentHeight = archiveHeight ?? tipNumber;
	const isLive = archiveHeight === undefined;

	// Calculate display position.
	const displayPosition =
		isDragging && localPosition !== null
			? localPosition
			: blockToPosition(currentHeight, tipNumber);

	// Displayed block number (based on position during drag).
	const displayBlock =
		isDragging && localPosition !== null
			? positionToBlock(localPosition, tipNumber)
			: currentHeight;

	// Fetch actual block timestamp when archiveHeight changes.
	useEffect(() => {
		if (archiveHeight === undefined) {
			// Live mode - use tip timestamp.
			setSelectedBlockTimestamp(tipTimestamp);
			setIsLoadingTimestamp(false);
			return;
		}

		// Fetch the header for the selected block to get its actual timestamp.
		setIsLoadingTimestamp(true);
		rpc.getBlockByNumber(archiveHeight)
			.then((block) => {
				if (block) {
					setSelectedBlockTimestamp(Number(BigInt(block.header.timestamp)));
				}
			})
			.catch(() => {
				// Silently fail - timestamp is optional UI element.
			})
			.finally(() => {
				setIsLoadingTimestamp(false);
			});
	}, [rpc, archiveHeight, tipTimestamp]);

	// Format the selected block's actual date for display.
	const formattedDate = useMemo(() => {
		if (selectedBlockTimestamp === null) return null;
		return formatDate(new Date(selectedBlockTimestamp));
	}, [selectedBlockTimestamp]);

	/**
	 * Calculate position from mouse/touch event.
	 */
	const calculatePosition = useCallback((clientX: number): number | null => {
		const rect = trackRef.current?.getBoundingClientRect();
		if (!rect) return null;

		const x = clientX - rect.left;
		return Math.max(0, Math.min(100, (x / rect.width) * 100));
	}, []);

	/**
	 * Handle drag start.
	 */
	const handleDragStart = useCallback(
		(clientX: number) => {
			const pos = calculatePosition(clientX);
			if (pos !== null) {
				setIsDragging(true);
				setLocalPosition(pos);
				// Clear any displayed event info when interacting.
				setSelectedEvent(null);
			}
		},
		[calculatePosition],
	);

	/**
	 * Handle drag move.
	 */
	const handleDragMove = useCallback(
		(clientX: number) => {
			if (!isDragging) return;
			const pos = calculatePosition(clientX);
			if (pos !== null) {
				setLocalPosition(pos);
			}
		},
		[isDragging, calculatePosition],
	);

	/**
	 * Handle drag end - commit position to context.
	 */
	const handleDragEnd = useCallback(() => {
		if (isDragging && localPosition !== null) {
			const newBlock = positionToBlock(localPosition, tipNumber);
			// If at or very close to tip, go live.
			if (newBlock >= tipNumber) {
				setArchiveHeight(undefined);
			} else {
				setArchiveHeight(newBlock);
			}
		}
		setIsDragging(false);
		setLocalPosition(null);
	}, [isDragging, localPosition, tipNumber, setArchiveHeight]);

	/**
	 * Handle click on track (jump to position).
	 */
	const handleTrackClick = useCallback(
		(e: React.MouseEvent) => {
			const pos = calculatePosition(e.clientX);
			if (pos !== null) {
				const newBlock = positionToBlock(pos, tipNumber);
				if (newBlock >= tipNumber) {
					setArchiveHeight(undefined);
				} else {
					setArchiveHeight(newBlock);
				}
			}
		},
		[calculatePosition, tipNumber, setArchiveHeight],
	);

	/**
	 * Handle going live.
	 */
	const handleGoLive = useCallback(() => {
		setArchiveHeight(undefined);
		setLocalPosition(null);
		setSelectedEvent(null);
	}, [setArchiveHeight]);

	/**
	 * Handle keyboard navigation.
	 * Left/Right: Fine-grained navigation by 1 block (or 10 with Shift).
	 * Up/Down: Coarse navigation by ~1% of timeline (or 10% with Shift).
	 */
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			let newBlock = displayBlock;

			// Fine step: 1 block (or 10 with Shift).
			const fineStep = e.shiftKey ? 10 : 1;
			// Coarse step: ~1% of tip (or 10% with Shift), minimum 100 blocks.
			const coarseStep = Math.max(100, Math.floor(tipNumber * (e.shiftKey ? 0.1 : 0.01)));

			switch (e.key) {
				case 'ArrowLeft':
					newBlock = Math.max(0, displayBlock - fineStep);
					break;
				case 'ArrowRight':
					newBlock = Math.min(tipNumber, displayBlock + fineStep);
					break;
				case 'ArrowDown':
					newBlock = Math.max(0, displayBlock - coarseStep);
					break;
				case 'ArrowUp':
					newBlock = Math.min(tipNumber, displayBlock + coarseStep);
					break;
				case 'Home':
					newBlock = 0;
					break;
				case 'End':
					handleGoLive();
					return;
				default:
					return;
			}

			e.preventDefault();
			if (newBlock >= tipNumber) {
				setArchiveHeight(undefined);
			} else {
				setArchiveHeight(newBlock);
			}
		},
		[displayBlock, tipNumber, setArchiveHeight, handleGoLive],
	);

	/**
	 * Handle event marker selection (click/tap).
	 * Navigates to the event's block and shows the info card.
	 */
	const handleEventSelect = useCallback((event: NetworkEvent) => {
		setSelectedEvent(event);
		setArchiveHeight(event.block);
	}, [setArchiveHeight]);

	/**
	 * Dismiss the event info card.
	 */
	const handleDismissEvent = useCallback(() => {
		setSelectedEvent(null);
	}, []);

	/**
	 * Handle clicking on block number to edit.
	 */
	const handleBlockClick = useCallback(() => {
		setBlockInputValue(displayBlock.toString());
		setIsEditingBlock(true);
		setSelectedEvent(null);
	}, [displayBlock]);

	/**
	 * Handle block input change.
	 */
	const handleBlockInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		// Only allow digits.
		const value = e.target.value.replace(/\D/g, '');
		setBlockInputValue(value);
	}, []);

	/**
	 * Confirm block input and navigate.
	 */
	const confirmBlockInput = useCallback(() => {
		const parsed = parseInt(blockInputValue, 10);
		if (!isNaN(parsed) && parsed >= 0) {
			// Clamp to tip if beyond.
			const clampedBlock = Math.min(parsed, tipNumber);
			if (clampedBlock >= tipNumber) {
				setArchiveHeight(undefined);
			} else {
				setArchiveHeight(clampedBlock);
			}
		}
		setIsEditingBlock(false);
	}, [blockInputValue, tipNumber, setArchiveHeight]);

	/**
	 * Cancel block input editing.
	 */
	const cancelBlockInput = useCallback(() => {
		setIsEditingBlock(false);
	}, []);

	/**
	 * Handle block input key events.
	 */
	const handleBlockInputKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				confirmBlockInput();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				cancelBlockInput();
			}
		},
		[confirmBlockInput, cancelBlockInput],
	);

	// Focus input when editing starts.
	useEffect(() => {
		if (isEditingBlock && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditingBlock]);

	// Add global mouse/touch listeners for drag.
	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
		const handleTouchMove = (e: TouchEvent) => {
			if (e.touches[0]) handleDragMove(e.touches[0].clientX);
		};
		const handleEnd = () => handleDragEnd();

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleEnd);
		window.addEventListener('touchmove', handleTouchMove);
		window.addEventListener('touchend', handleEnd);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleEnd);
			window.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('touchend', handleEnd);
		};
	}, [isDragging, handleDragMove, handleDragEnd]);


	// Don't render if archive not supported or no tip yet.
	if (!isArchiveSupported || tipBlockNumber === null) {
		return null;
	}

	return (
		<div className={`p-4 ${className}`}>
			{/* Header row: Block number, date, and Live button. */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2 min-w-0">
					{isEditingBlock ? (
						// Show block input field with submit button.
						<>
							<span className="text-sm text-gray-500 dark:text-gray-400">Block</span>
							<input
								ref={inputRef}
								type="text"
								inputMode="numeric"
								value={blockInputValue}
								onChange={handleBlockInputChange}
								onKeyDown={handleBlockInputKeyDown}
								className="
									w-28 px-1.5 py-0.5 text-sm font-mono
									bg-gray-100 dark:bg-gray-700
									border border-gray-300 dark:border-gray-600
									rounded focus:outline-none focus:ring-1 focus:ring-nervos
									text-gray-900 dark:text-white
								"
							/>
							{/* Submit button. */}
							<Tooltip content="Go to block" interactive>
								<button
									type="button"
									onClick={confirmBlockInput}
									disabled={blockInputValue.trim() === ''}
									className={`
										p-1 rounded transition-colors
										${blockInputValue.trim()
											? 'text-nervos hover:bg-nervos/10'
											: 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
										}
									`}
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
									</svg>
								</button>
							</Tooltip>
						</>
					) : (
						// Show block number (clickable to edit).
						<>
							<button
								type="button"
								onClick={handleBlockClick}
								className="
									font-mono text-sm font-medium
									text-gray-900 dark:text-white
									hover:text-nervos dark:hover:text-nervos
									border-b border-dashed border-transparent
									hover:border-gray-400 dark:hover:border-gray-500
									cursor-text transition-colors
								"
							>
								Block {formatNumber(BigInt(displayBlock))}
							</button>
							{/* Show date only when not dragging. */}
							{!isDragging && (
								<>
									<span className="text-gray-300 dark:text-gray-600">&bull;</span>
									<span className="text-sm text-gray-500 dark:text-gray-400">
										{isLive ? 'Now' : isLoadingTimestamp ? '...' : formattedDate}
									</span>
								</>
							)}
						</>
					)}
				</div>

				{/* Latest button. */}
				<button
					type="button"
					onClick={handleGoLive}
					className={`
						flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
						transition-all duration-200 flex-shrink-0
						${
							isLive && !isDragging
								? 'bg-green-500/10 text-green-600 dark:text-green-400'
								: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-nervos/10 hover:text-nervos'
						}
					`}
				>
					{/* Latest indicator dot. */}
					{isLive && !isDragging && (
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
						</span>
					)}
					Latest
				</button>
			</div>

			{/* Slider track. */}
			<div
				ref={trackRef}
				role="slider"
				aria-label="Blockchain time slider"
				aria-valuemin={0}
				aria-valuemax={tipNumber}
				aria-valuenow={displayBlock}
				aria-valuetext={`Block ${formatNumber(BigInt(displayBlock))}${formattedDate ? `, ${formattedDate}` : ''}`}
				tabIndex={0}
				onKeyDown={handleKeyDown}
				onMouseDown={(e) => handleDragStart(e.clientX)}
				onTouchStart={(e) => e.touches[0] && handleDragStart(e.touches[0].clientX)}
				onClick={handleTrackClick}
				className={`
					relative h-6 cursor-pointer select-none
					focus:outline-none focus-visible:ring-2 focus-visible:ring-nervos focus-visible:ring-offset-2
					dark:focus-visible:ring-offset-gray-900
				`}
			>
				{/* Track background. */}
				<div
					className="
						absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1
						bg-gray-200 dark:bg-gray-700 rounded-full
						overflow-hidden
					"
				>
					{/* Animated pulse - nervos green glow moving left to right. */}
					<div
						className="
							timeline-pulse absolute inset-y-0 w-[10%]
							bg-gradient-to-r from-transparent via-nervos/60 to-transparent
						"
					/>
				</div>

				{/* Filled portion (subtle). */}
				<div
					className="
						absolute top-1/2 -translate-y-1/2 left-0 h-1
						bg-nervos/15 rounded-full
					"
					style={{ width: `${displayPosition}%` }}
				/>

				{/* Event markers. */}
				{events.map((event) => (
					<EventMarker
						key={event.id}
						event={event}
						position={blockToPosition(event.block, tipNumber)}
						onSelect={handleEventSelect}
					/>
				))}

				{/* Thumb. */}
				<div
					className={`
						absolute top-1/2 -translate-y-1/2 -translate-x-1/2
						w-3 h-3 rounded-full
						bg-nervos border border-white dark:border-gray-900
						shadow-sm z-20
						transition-transform duration-75
						${isDragging ? 'scale-125' : 'hover:scale-110'}
					`}
					style={{ left: `${displayPosition}%` }}
				/>
			</div>

			{/* Event info card - shown when an event marker is selected. */}
			{selectedEvent && (
				<EventInfoCard event={selectedEvent} onDismiss={handleDismissEvent} />
			)}
		</div>
	);
}
