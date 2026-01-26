/**
 * Copy text to clipboard.
 * Falls back to execCommand for non-secure contexts (HTTP) where the
 * Clipboard API is unavailable.
 */
export async function copyToClipboard(text: string): Promise<void> {
	if (navigator.clipboard) {
		await navigator.clipboard.writeText(text);
		return;
	}
	const textarea = document.createElement('textarea');
	textarea.value = text;
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand('copy');
	document.body.removeChild(textarea);
}
