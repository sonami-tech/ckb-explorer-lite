export function Footer() {
	return (
		<footer className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
			<div className="max-w-7xl mx-auto px-4 py-4">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
					<p>
						CKB Explorer Lite
					</p>
					<p>
						Powered by{' '}
						<a
							href="https://nervos.org"
							target="_blank"
							rel="noopener noreferrer"
							className="text-nervos hover:underline"
						>
							Nervos CKB
						</a>
					</p>
				</div>
			</div>
		</footer>
	);
}
