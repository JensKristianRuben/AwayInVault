// Minimal hand-rolled RFC4180-ish CSV parser/writer. No external dependency: this
// project keeps a zero-dependency stance for data-handling code the way it already
// does for crypto (see crypto.ts), but the parsing side carries real correctness risk
// (a mis-parsed quoted field silently corrupts an imported password/note), so every
// branch below is covered by adversarial fixtures in csv.test.ts before being trusted
// by the import flow.

// Parses raw CSV text into rows of fields. Handles quoted fields, "" escaped quotes,
// commas/newlines embedded inside quoted fields, CRLF/LF/lone-CR line endings, and a
// leading UTF-8 BOM. A trailing newline at end-of-file does not produce an extra empty
// row; a genuinely blank line in the middle of the file produces a row with one empty
// field (callers that map rows to records should skip fully-empty rows).
export function parseCsv(text: string): string[][] {
	if (text.charCodeAt(0) === 0xfeff) {
		text = text.slice(1);
	}

	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuotes = false;
	let i = 0;

	const pushField = () => {
		row.push(field);
		field = "";
	};
	const pushRow = () => {
		pushField();
		rows.push(row);
		row = [];
	};

	while (i < text.length) {
		const char = text[i];

		if (inQuotes) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			field += char;
			i++;
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (char === ",") {
			pushField();
			i++;
			continue;
		}
		if (char === "\r") {
			if (text[i + 1] === "\n") i++;
			pushRow();
			i++;
			continue;
		}
		if (char === "\n") {
			pushRow();
			i++;
			continue;
		}

		field += char;
		i++;
	}

	if (field.length > 0 || row.length > 0) {
		pushRow();
	}

	return rows;
}

function fieldNeedsQuoting(field: string): boolean {
	return /[",\r\n]/.test(field);
}

function quoteField(field: string): string {
	if (!fieldNeedsQuoting(field)) return field;
	return `"${field.replace(/"/g, '""')}"`;
}

// Serializes rows of fields back into RFC4180 CSV text (CRLF line endings, fields
// containing a comma/quote/newline are quoted and internal quotes doubled).
export function writeCsv(rows: string[][]): string {
	return rows.map((row) => row.map(quoteField).join(",")).join("\r\n");
}
