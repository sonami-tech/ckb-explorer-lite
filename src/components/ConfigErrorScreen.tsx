interface ConfigErrorScreenProps {
	error: Error;
}

export function ConfigErrorScreen({ error }: ConfigErrorScreenProps) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
			<div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-red-200 dark:border-red-800">
				<h1 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
					Configuration error
				</h1>
				<p className="text-gray-700 dark:text-gray-300 mb-4">
					Failed to load runtime configuration. The application cannot start.
				</p>
				<pre className="bg-gray-100 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 p-3 rounded overflow-auto whitespace-pre-wrap break-words">
					{error.message}
				</pre>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
				>
					Reload
				</button>
			</div>
		</div>
	);
}
