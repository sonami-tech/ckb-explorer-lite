/**
 * Mega footer component with multiple sections.
 * Provides links to resources, community, and documentation.
 */

import { navigate, generateLink } from '../lib/router';

// External link icon component.
function ExternalLinkIcon() {
	return (
		<svg className="w-3 h-3 ml-1 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
		</svg>
	);
}

// Internal navigation link component.
function InternalLink({ href, children }: { href: string; children: React.ReactNode }) {
	const handleClick = (e: React.MouseEvent) => {
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
			return;
		}
		e.preventDefault();
		navigate(href);
	};

	return (
		<a
			href={href}
			onClick={handleClick}
			className="hover:text-nervos transition-colors"
		>
			{children}
		</a>
	);
}

// External navigation link component.
function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center hover:text-nervos transition-colors"
		>
			{children}
			<ExternalLinkIcon />
		</a>
	);
}

export function Footer() {
	return (
		<footer className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
			<div className="max-w-7xl mx-auto px-4 py-8">
				{/* Footer grid. */}
				<div className="grid grid-cols-[auto_auto] md:flex md:flex-wrap md:justify-between gap-8 mb-8">
					{/* Explorer section. */}
					<div>
						<h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
							Explorer
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
							<li>
								<InternalLink href={generateLink('/')}>
									Home
								</InternalLink>
							</li>
							<li>
								<InternalLink href={generateLink('/resources')}>
									Well-Known Resources
								</InternalLink>
							</li>
							<li>
								<ExternalLink href="https://github.com/sonami-tech/CKB-Explorer-Lite">
									GitHub
								</ExternalLink>
							</li>
						</ul>
					</div>

					{/* Tools section. */}
					<div>
						<h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
							Tools
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
							<li>
								<ExternalLink href="https://nervoshalving.com">
									Nervos Halving
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://ckb.tools">
									CKB.tools
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://github.com/jordanmack/nervos-ckb-node-dashboard">
									Node Dashboard
								</ExternalLink>
							</li>
						</ul>
					</div>

					{/* Community section. */}
					<div>
						<h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
							Community
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
							<li>
								<ExternalLink href="https://nervosnation.com">
									NervosNation.com
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://t.me/NervosNation">
									Nervos Nation Telegram
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://www.youtube.com/@NervosNation">
									Nervos Nation YouTube
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://talk.nervos.org">
									Nervos Talk Forum
								</ExternalLink>
							</li>
						</ul>
					</div>

					{/* Sonami section. */}
					<div>
						<h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
							Sōnami
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
							<li>
								<ExternalLink href="https://sonami.cc">
									Sonami.cc
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://blog.sonami.cc">
									Blog
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://x.com/SonamiTech">
									Twitter
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://github.com/sonami-tech">
									GitHub
								</ExternalLink>
							</li>
						</ul>
					</div>

					{/* Nervos Official section. */}
					<div>
						<h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
							Nervos Official
						</h3>
						<ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
							<li>
								<ExternalLink href="https://docs.nervos.org">
									Developer Docs
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://nervos.org">
									Nervos.org
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://www.youtube.com/nervosnetwork">
									YouTube
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://x.com/NervosNetwork">
									Twitter
								</ExternalLink>
							</li>
							<li>
								<ExternalLink href="https://discord.gg/FKh8Zzvwqa">
									Discord
								</ExternalLink>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom bar. */}
				<div className="pt-6 border-t border-gray-200 dark:border-gray-700">
					<div className="flex flex-col items-center md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
						<p>
							CKB Explorer Lite
						</p>
						<p>
							Built by{' '}
							<a
								href="https://sonami.cc"
								target="_blank"
								rel="noopener noreferrer"
								className="text-nervos hover:underline"
							>
								Sōnami
							</a>
							{' · Powered by '}
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
			</div>
		</footer>
	);
}
