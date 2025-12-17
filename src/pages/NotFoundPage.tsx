import { navigate, generateLink } from '../lib/router';

export function NotFoundPage() {
	return (
		<div className="max-w-7xl mx-auto px-4 py-16">
			<div className="flex flex-col items-center justify-center text-center">
				<div className="text-6xl font-bold text-gray-200 dark:text-gray-700 mb-4">
					404
				</div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
					Page Not Found
				</h1>
				<p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
					The page you are looking for does not exist or has been moved.
				</p>
				<button
					onClick={() => navigate(generateLink('/'))}
					className="px-6 py-2 text-sm font-medium text-white bg-nervos rounded-lg hover:bg-nervos-dark transition-colors"
				>
					Go Home
				</button>
			</div>
		</div>
	);
}
