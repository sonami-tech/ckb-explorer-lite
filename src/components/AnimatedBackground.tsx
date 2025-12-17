import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAnimation } from '../contexts/AnimationContext';

const CELL_SIZE = 8;
const UPDATE_INTERVAL = 150;

export function AnimatedBackground() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationRef = useRef<number>(0);
	const gridRef = useRef<boolean[][]>([]);
	const lastUpdateRef = useRef<number>(0);
	const { effectiveTheme } = useTheme();
	const { isPlaying } = useAnimation();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !isPlaying) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let cols = 0;
		let rows = 0;

		// Set canvas size and initialize grid.
		const resizeCanvas = () => {
			const rect = canvas.parentElement?.getBoundingClientRect();
			if (rect) {
				canvas.width = rect.width;
				canvas.height = rect.height;
				cols = Math.ceil(canvas.width / CELL_SIZE);
				rows = Math.ceil(canvas.height / CELL_SIZE);
				initGrid();
			}
		};

		// Initialize grid with random cells.
		const initGrid = () => {
			gridRef.current = [];
			for (let y = 0; y < rows; y++) {
				gridRef.current[y] = [];
				for (let x = 0; x < cols; x++) {
					// ~15% chance of being alive initially.
					gridRef.current[y][x] = Math.random() < 0.15;
				}
			}
		};

		// Count live neighbors for a cell.
		const countNeighbors = (x: number, y: number): number => {
			let count = 0;
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0) continue;
					// Wrap around edges (toroidal array).
					const nx = (x + dx + cols) % cols;
					const ny = (y + dy + rows) % rows;
					if (gridRef.current[ny]?.[nx]) count++;
				}
			}
			return count;
		};

		// Compute next generation.
		const nextGeneration = () => {
			const newGrid: boolean[][] = [];
			for (let y = 0; y < rows; y++) {
				newGrid[y] = [];
				for (let x = 0; x < cols; x++) {
					const neighbors = countNeighbors(x, y);
					const alive = gridRef.current[y]?.[x] ?? false;
					// Conway's Game of Life rules.
					if (alive) {
						// Live cell survives with 2 or 3 neighbors.
						newGrid[y][x] = neighbors === 2 || neighbors === 3;
					} else {
						// Dead cell becomes alive with exactly 3 neighbors.
						newGrid[y][x] = neighbors === 3;
					}
				}
			}
			gridRef.current = newGrid;
		};

		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		// Animation loop.
		const animate = (timestamp: number) => {
			// Update grid at fixed interval.
			if (timestamp - lastUpdateRef.current >= UPDATE_INTERVAL) {
				nextGeneration();
				lastUpdateRef.current = timestamp;
			}

			// Clear and redraw.
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Green in dark mode, black in light mode.
			ctx.fillStyle = effectiveTheme === 'dark'
				? 'rgba(0, 204, 155, 0.4)'
				: 'rgba(0, 0, 0, 0.15)';

			// Draw live cells.
			for (let y = 0; y < rows; y++) {
				for (let x = 0; x < cols; x++) {
					if (gridRef.current[y]?.[x]) {
						ctx.fillRect(
							x * CELL_SIZE + 1,
							y * CELL_SIZE + 1,
							CELL_SIZE - 2,
							CELL_SIZE - 2
						);
					}
				}
			}

			animationRef.current = requestAnimationFrame(animate);
		};

		animationRef.current = requestAnimationFrame(animate);

		return () => {
			window.removeEventListener('resize', resizeCanvas);
			cancelAnimationFrame(animationRef.current);
		};
	}, [effectiveTheme, isPlaying]);

	if (!isPlaying) {
		return null;
	}

	return (
		<canvas
			ref={canvasRef}
			className="absolute inset-0 pointer-events-none"
		/>
	);
}
