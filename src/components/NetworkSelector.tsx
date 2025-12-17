import { useNetwork } from '../contexts/NetworkContext';
import { getNetworkTypeLabel } from '../lib/networks';

/**
 * Network selector component.
 * Shows a dropdown if multiple networks are configured, otherwise static text.
 */
export function NetworkSelector() {
	const { networks, selectedIndex, currentNetwork, selectNetwork } = useNetwork();

	if (!currentNetwork) {
		return null;
	}

	const typeLabel = getNetworkTypeLabel(currentNetwork.type);
	const displayText = `${currentNetwork.name} (${typeLabel})`;

	// Single network - show as static text.
	if (networks.length <= 1) {
		return (
			<span className="text-xs text-gray-500 dark:text-gray-400">
				{displayText}
			</span>
		);
	}

	// Multiple networks - show dropdown.
	return (
		<select
			value={selectedIndex}
			onChange={(e) => selectNetwork(parseInt(e.target.value, 10))}
			className="text-xs bg-transparent text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-1 focus:ring-nervos"
			aria-label="Select network"
		>
			{networks.map((network, index) => (
				<option key={index} value={index}>
					{network.name} ({getNetworkTypeLabel(network.type)})
				</option>
			))}
		</select>
	);
}
