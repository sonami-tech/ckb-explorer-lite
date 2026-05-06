import { ThemeProvider } from './contexts/ThemeContext';
import { AnimationProvider } from './contexts/AnimationContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ArchiveProvider } from './contexts/ArchiveContext';
import { StatsProvider } from './contexts/StatsContext';
import { TickProvider } from './contexts/TickContext';
import { ResponsiveProvider } from './contexts/ResponsiveContext';
import { Layout } from './components/Layout';
import { useRouter } from './hooks/useRouter';
import { HomePage } from './pages/HomePage';
import { BlockPage } from './pages/BlockPage';
import { TransactionPage } from './pages/TransactionPage';
import { AddressPage } from './pages/AddressPage';
import { TransactionsForAddressPage } from './pages/TransactionsForAddressPage';
import { CellsForAddressPage } from './pages/CellsForAddressPage';
import { CellPage } from './pages/CellPage';
import { WellKnownResourcesPage } from './pages/WellKnownResourcesPage';
import { TestLinksPage } from './pages/TestLinksPage';
import { NotFoundPage } from './pages/NotFoundPage';

function Router() {
	const route = useRouter();

	switch (route.view) {
		case 'home':
			return <HomePage />;
		case 'block':
			return <BlockPage key={route.id} id={route.id} />;
		case 'transaction':
			return <TransactionPage key={route.hash} hash={route.hash} />;
		case 'address':
			return <AddressPage key={route.address} address={route.address} />;
		case 'address-transactions':
			return <TransactionsForAddressPage key={route.address} address={route.address} />;
		case 'address-cells':
			return <CellsForAddressPage key={route.address} address={route.address} />;
		case 'cell':
			return <CellPage key={`${route.txHash}-${route.index}`} txHash={route.txHash} index={route.index} />;
		case 'resources':
			return <WellKnownResourcesPage />;
		case 'test-links':
			return <TestLinksPage />;
		case 'not-found':
		default:
			return <NotFoundPage />;
	}
}

function App() {
	return (
		<ResponsiveProvider>
			<ThemeProvider>
				<AnimationProvider>
					<NetworkProvider>
						<ArchiveProvider>
							<StatsProvider>
								<TickProvider>
									<Layout>
										<Router />
									</Layout>
								</TickProvider>
							</StatsProvider>
						</ArchiveProvider>
					</NetworkProvider>
				</AnimationProvider>
			</ThemeProvider>
		</ResponsiveProvider>
	);
}

export default App;
