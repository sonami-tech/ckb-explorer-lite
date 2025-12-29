import { ThemeProvider } from './contexts/ThemeContext';
import { AnimationProvider } from './contexts/AnimationContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ArchiveProvider } from './contexts/ArchiveContext';
import { TickProvider } from './contexts/TickContext';
import { Layout } from './components/Layout';
import { useRouter } from './hooks/useRouter';
import { HomePage } from './pages/HomePage';
import { BlockPage } from './pages/BlockPage';
import { TransactionPage } from './pages/TransactionPage';
import { AddressPage } from './pages/AddressPage';
import { CellPage } from './pages/CellPage';
import { WellKnownScriptsPage } from './pages/WellKnownScriptsPage';
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
		case 'cell':
			return <CellPage txHash={route.txHash} index={route.index} />;
		case 'scripts':
			return <WellKnownScriptsPage />;
		case 'not-found':
		default:
			return <NotFoundPage />;
	}
}

function App() {
	return (
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
	);
}

export default App;
