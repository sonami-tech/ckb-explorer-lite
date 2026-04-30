import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { loadConfig } from './config/loadConfig';
import { AppConfigProvider } from './contexts/AppConfigContext';
import { ConfigErrorScreen } from './components/ConfigErrorScreen';

const root = createRoot(document.getElementById('root')!);

(async () => {
	try {
		const config = await loadConfig();
		root.render(
			<StrictMode>
				<AppConfigProvider value={config}>
					<App />
				</AppConfigProvider>
			</StrictMode>,
		);
	} catch (err) {
		root.render(<ConfigErrorScreen error={err as Error} />);
	}
})();
