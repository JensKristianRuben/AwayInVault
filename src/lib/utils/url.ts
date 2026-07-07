/**
 * Extracts the hostname (domain) from a given URL string.
 * Returns null if the URL is invalid or empty.
 */
export function getDomain(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		let cleanUrl = url.trim();
		// If it doesn't start with a protocol, prepend https:// to allow URL parser to work
		if (!/^https?:\/\//i.test(cleanUrl)) {
			cleanUrl = "https://" + cleanUrl;
		}
		const parsed = new URL(cleanUrl);
		// Remove 'www.' if present to get a cleaner domain
		return parsed.hostname.replace(/^www\./i, "");
	} catch {
		return null;
	}
}
