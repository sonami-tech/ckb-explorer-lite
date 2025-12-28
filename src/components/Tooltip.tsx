/**
 * Accessible tooltip with smart positioning using Floating UI.
 * Features:
 * - Flips to opposite side when near viewport edge
 * - Shifts horizontally to stay in view
 * - Arrow points to trigger element
 * - Portal rendering to avoid z-index issues
 */

import { useState, useRef, cloneElement, ReactNode, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import {
	useFloating,
	autoUpdate,
	offset,
	flip,
	shift,
	arrow,
	size,
} from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/react-dom';

interface TooltipProps {
	/** Content to display in the tooltip. */
	content: ReactNode;
	/** Trigger element (must accept ref and mouse/focus events). */
	children: ReactElement;
	/** Preferred placement. Will flip if not enough space. Default: 'top'. */
	placement?: Placement;
	/** Whether the tooltip is disabled. */
	disabled?: boolean;
}

/**
 * Wrap any element to show a tooltip on hover/focus.
 *
 * @example
 * <Tooltip content="Click to copy">
 *   <button>Copy</button>
 * </Tooltip>
 */
export function Tooltip({
	content,
	children,
	placement = 'top',
	disabled = false,
}: TooltipProps) {
	const [isOpen, setIsOpen] = useState(false);
	const arrowRef = useRef<HTMLSpanElement>(null);

	const { refs, floatingStyles, middlewareData, placement: actualPlacement } = useFloating({
		open: isOpen,
		placement,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(8),
			flip({ fallbackAxisSideDirection: 'start' }),
			shift({ padding: 8 }),
			size({
				apply({ availableWidth, elements }) {
					// Constrain tooltip width to available space minus padding.
					Object.assign(elements.floating.style, {
						maxWidth: `${Math.max(200, availableWidth - 16)}px`,
					});
				},
				padding: 8,
			}),
			arrow({ element: arrowRef }),
		],
	});

	// Don't render tooltip if disabled or no content.
	if (disabled || !content) {
		return children;
	}

	// Calculate arrow position based on actual placement after flip/shift.
	const arrowX = middlewareData.arrow?.x;
	const arrowY = middlewareData.arrow?.y;
	const side = actualPlacement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right';

	// Arrow points toward trigger, so position it on opposite side of tooltip.
	const arrowSide = {
		top: 'bottom',
		right: 'left',
		bottom: 'top',
		left: 'right',
	}[side] as string;

	// Arrow offset from edge (half of arrow size).
	const arrowOffset = '-4px';

	return (
		<>
			{cloneElement(children, {
				ref: refs.setReference,
				onMouseEnter: (e: React.MouseEvent) => {
					setIsOpen(true);
					children.props.onMouseEnter?.(e);
				},
				onMouseLeave: (e: React.MouseEvent) => {
					setIsOpen(false);
					children.props.onMouseLeave?.(e);
				},
				onFocus: (e: React.FocusEvent) => {
					setIsOpen(true);
					children.props.onFocus?.(e);
				},
				onBlur: (e: React.FocusEvent) => {
					setIsOpen(false);
					children.props.onBlur?.(e);
				},
			})}
			{isOpen && createPortal(
				<div
					ref={refs.setFloating}
					style={floatingStyles}
					role="tooltip"
					className="z-50 px-3 py-2 text-xs bg-gray-900 dark:bg-gray-700 text-white rounded shadow-lg pointer-events-none break-all"
				>
					{content}
					{/* Arrow element. */}
					<span
						ref={arrowRef}
						style={{
							position: 'absolute',
							left: arrowX != null ? `${arrowX}px` : '',
							top: arrowY != null ? `${arrowY}px` : '',
							[arrowSide]: arrowOffset,
						}}
						className="w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"
					/>
				</div>,
				document.body
			)}
		</>
	);
}
