/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react';
import type { AppConfig } from '../config/loadConfig';

const AppConfigContext = createContext<AppConfig | null>(null);

interface AppConfigProviderProps {
	value: AppConfig;
	children: ReactNode;
}

export function AppConfigProvider({ value, children }: AppConfigProviderProps) {
	return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig(): AppConfig {
	const ctx = useContext(AppConfigContext);
	if (!ctx) {
		throw new Error('useAppConfig must be used within an AppConfigProvider.');
	}
	return ctx;
}
