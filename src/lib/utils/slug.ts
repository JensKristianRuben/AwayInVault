/**
 * URL-friendly slug helpers for vault items.
 *
 * The route segment is `<slugified-title>--<full-id>`. The id suffix (after the
 * last "--") is what's actually used to look the item up, so collisions between
 * items that share a title are impossible even though the URL still reads as
 * the item's name.
 */

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function makeItemSlug(item: { id: string; title: string }): string {
	const base = slugify(item.title) || "password";
	return `${base}--${item.id}`;
}

export function extractIdFromSlug(slugParam: string): string {
	const separatorIndex = slugParam.lastIndexOf("--");
	return separatorIndex === -1 ? slugParam : slugParam.slice(separatorIndex + 2);
}
