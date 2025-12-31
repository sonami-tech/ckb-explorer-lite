import fs from 'fs';

const packageJsonPath = new URL('./package.json', import.meta.url).pathname;

function updateVersion()
{
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

	// Increment the patch version.
	const versionParts = packageJson.version.split('.');
	versionParts[2] = (parseInt(versionParts[2], 10) + 1).toString();
	packageJson.version = versionParts.join('.');

	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

export default function updateVersionPlugin()
{
	const plugin =
	{
		name: 'vite-plugin-update-version',
		handleHotUpdate()
		{
			updateVersion();
		},
		buildStart()
		{
			updateVersion();
		}
	};
	return plugin;
}
