// Best-effort detection of which password manager a CSV export came from, based on
// its header row, plus a canonical field mapping the import UI pre-fills into an
// editable column-mapping step. Detection is never trusted blindly - the UI always
// lets the user confirm/correct the mapping, since real-world exports vary across
// app versions and locales and a silent misdetection is worse than one extra click.

export type CanonicalField = "title" | "website" | "username" | "password" | "notes";

export interface FieldMapping {
	title: string | null;
	website: string | null;
	username: string | null;
	password: string | null;
	notes: string | null;
}

export interface FormatDetectionResult {
	source: string;
	mapping: FieldMapping;
	confidence: number;
}

const CANONICAL_FIELDS: CanonicalField[] = ["title", "website", "username", "password", "notes"];

interface FormatSignature {
	source: string;
	// Canonical field -> candidate header names for this source, in priority order.
	// An empty array means this source's export never has that field (e.g. Chrome has
	// no notes column) - such fields are excluded from the match-ratio denominator
	// rather than counted as a miss.
	headerCandidates: Record<CanonicalField, string[]>;
	// Headers whose presence is a strong signal for this specific source, used to
	// separate sources that otherwise share several generic column names.
	distinguishingHeaders: string[];
}

const FORMAT_SIGNATURES: FormatSignature[] = [
	{
		source: "bitwarden",
		headerCandidates: {
			title: ["name"],
			website: ["login_uri"],
			username: ["login_username"],
			password: ["login_password"],
			notes: ["notes"],
		},
		distinguishingHeaders: ["login_uri", "login_username", "login_password"],
	},
	{
		source: "1password",
		headerCandidates: {
			title: ["title"],
			website: ["url", "website"],
			username: ["username"],
			password: ["password"],
			notes: ["notes"],
		},
		distinguishingHeaders: ["type", "title"],
	},
	{
		source: "chrome",
		headerCandidates: {
			title: ["name"],
			website: ["url"],
			username: ["username"],
			password: ["password"],
			notes: [],
		},
		distinguishingHeaders: ["name", "url", "username", "password"],
	},
];

// A source scoring below this is treated as unrecognized: the import UI shows an
// empty/best-effort mapping and requires the user to map columns manually.
const UNKNOWN_CONFIDENCE_THRESHOLD = 0.5;

// Generic fallback candidates used only when no known source scores high enough -
// gives the manual-mapping step a best-effort starting point instead of a blank form.
const GENERIC_SIGNATURE: FormatSignature = {
	source: "unknown",
	headerCandidates: {
		title: ["title", "name"],
		website: ["website", "url", "login_uri", "site"],
		username: ["username", "login_username", "user", "email"],
		password: ["password", "login_password", "pass"],
		notes: ["notes", "note", "memo"],
	},
	distinguishingHeaders: [],
};

function findHeader(headers: string[], candidates: string[]): string | null {
	const lowered = headers.map((h) => h.trim().toLowerCase());
	for (const candidate of candidates) {
		const idx = lowered.indexOf(candidate.toLowerCase());
		if (idx !== -1) return headers[idx];
	}
	return null;
}

function scoreSignature(
	headers: string[],
	signature: FormatSignature,
): { mapping: FieldMapping; score: number } {
	const mapping: FieldMapping = {
		title: null,
		website: null,
		username: null,
		password: null,
		notes: null,
	};

	let definableFields = 0;
	let matchedFields = 0;
	for (const field of CANONICAL_FIELDS) {
		const candidates = signature.headerCandidates[field];
		if (candidates.length === 0) continue;
		definableFields++;
		const found = findHeader(headers, candidates);
		if (found) {
			mapping[field] = found;
			matchedFields++;
		}
	}
	const fieldMatchRatio = definableFields === 0 ? 0 : matchedFields / definableFields;

	const loweredHeaders = new Set(headers.map((h) => h.trim().toLowerCase()));
	const matchedDistinguishing = signature.distinguishingHeaders.filter((h) =>
		loweredHeaders.has(h.toLowerCase()),
	).length;
	const distinguishingRatio =
		signature.distinguishingHeaders.length === 0
			? 0
			: matchedDistinguishing / signature.distinguishingHeaders.length;

	const score = 0.7 * fieldMatchRatio + 0.3 * distinguishingRatio;
	return { mapping, score };
}

export function detectFormat(headers: string[]): FormatDetectionResult {
	let best: { source: string; mapping: FieldMapping; score: number } | null = null;

	for (const signature of FORMAT_SIGNATURES) {
		const { mapping, score } = scoreSignature(headers, signature);
		if (!best || score > best.score) {
			best = { source: signature.source, mapping, score };
		}
	}

	if (!best || best.score < UNKNOWN_CONFIDENCE_THRESHOLD) {
		const generic = scoreSignature(headers, GENERIC_SIGNATURE);
		return { source: "unknown", mapping: generic.mapping, confidence: best?.score ?? 0 };
	}

	return { source: best.source, mapping: best.mapping, confidence: best.score };
}
