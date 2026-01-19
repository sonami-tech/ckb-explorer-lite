import { ThemeProvider } from './contexts/ThemeContext';
import { AnimationProvider } from './contexts/AnimationContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ArchiveProvider } from './contexts/ArchiveContext';
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
			return <BlockPage id={route.id} />;
		case 'transaction':
			return <TransactionPage hash={route.hash} />;
		case 'address':
			return <AddressPage address={route.address} />;
		case 'address-transactions':
			return <TransactionsForAddressPage address={route.address} />;
		case 'address-cells':
			return <CellsForAddressPage address={route.address} />;
		case 'cell':
			return <CellPage txHash={route.txHash} index={route.index} />;
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
							<TickProvider>
								<Layout>
									<Router />
								</Layout>
							</TickProvider>
						</ArchiveProvider>
					</NetworkProvider>
				</AnimationProvider>
			</ThemeProvider>
		</ResponsiveProvider>
	);
}

export default App;
