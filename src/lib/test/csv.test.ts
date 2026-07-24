import { describe, it, expect } from "vitest";
import { parseCsv, writeCsv } from "../utils/csv";

describe("csv utils", () => {
	describe("parseCsv", () => {
		it("parses simple unquoted fields", () => {
			const text = "title,username,password\nGitHub,me,secret";
			expect(parseCsv(text)).toEqual([
				["title", "username", "password"],
				["GitHub", "me", "secret"],
			]);
		});

		it("does not emit a trailing empty row for a file ending in a newline", () => {
			const text = "a,b\n1,2\n";
			expect(parseCsv(text)).toEqual([
				["a", "b"],
				["1", "2"],
			]);
		});

		it("emits a single-empty-field row for a genuinely blank line", () => {
			const text = "a,b\n\n1,2";
			expect(parseCsv(text)).toEqual([["a", "b"], [""], ["1", "2"]]);
		});

		it("handles quoted fields containing commas", () => {
			const text = 'title,notes\nGitHub,"comma, inside quotes"';
			expect(parseCsv(text)).toEqual([
				["title", "notes"],
				["GitHub", "comma, inside quotes"],
			]);
		});

		it("handles escaped double quotes inside quoted fields", () => {
			const text = 'title,notes\nGitHub,"she said ""hello"" to me"';
			expect(parseCsv(text)).toEqual([
				["title", "notes"],
				["GitHub", 'she said "hello" to me'],
			]);
		});

		it("handles embedded newlines inside quoted fields", () => {
			const text = 'title,notes\nGitHub,"line one\nline two"';
			expect(parseCsv(text)).toEqual([
				["title", "notes"],
				["GitHub", "line one\nline two"],
			]);
		});

		it("handles CRLF line endings", () => {
			const text = "a,b\r\n1,2\r\n3,4";
			expect(parseCsv(text)).toEqual([
				["a", "b"],
				["1", "2"],
				["3", "4"],
			]);
		});

		it("handles a quoted field containing a CRLF sequence", () => {
			const text = 'title,notes\r\nGitHub,"line one\r\nline two"\r\n';
			expect(parseCsv(text)).toEqual([
				["title", "notes"],
				["GitHub", "line one\r\nline two"],
			]);
		});

		it("strips a leading UTF-8 BOM", () => {
			const text = "﻿title,username\nGitHub,me";
			expect(parseCsv(text)).toEqual([
				["title", "username"],
				["GitHub", "me"],
			]);
		});

		it("handles ragged rows (fewer/more fields than the header)", () => {
			const text = "a,b,c\n1,2\n3,4,5,6";
			expect(parseCsv(text)).toEqual([
				["a", "b", "c"],
				["1", "2"],
				["3", "4", "5", "6"],
			]);
		});

		it("handles a quoted field that is entirely empty", () => {
			const text = 'a,b\n"",value';
			expect(parseCsv(text)).toEqual([
				["a", "b"],
				["", "value"],
			]);
		});

		it("returns an empty array for empty input", () => {
			expect(parseCsv("")).toEqual([]);
		});

		it("handles a single field with no delimiter at all", () => {
			expect(parseCsv("justonefield")).toEqual([["justonefield"]]);
		});
	});

	describe("writeCsv", () => {
		it("writes simple fields joined by commas and CRLF row separators", () => {
			const rows = [
				["a", "b"],
				["1", "2"],
			];
			expect(writeCsv(rows)).toBe("a,b\r\n1,2");
		});

		it("quotes fields containing a comma", () => {
			expect(writeCsv([["hello, world", "b"]])).toBe('"hello, world",b');
		});

		it("quotes and escapes fields containing a double quote", () => {
			expect(writeCsv([['she said "hi"', "b"]])).toBe('"she said ""hi""",b');
		});

		it("quotes fields containing an embedded newline", () => {
			expect(writeCsv([["line one\nline two", "b"]])).toBe('"line one\nline two",b');
		});

		it("does not quote fields that need no quoting", () => {
			expect(writeCsv([["plain", "fields"]])).toBe("plain,fields");
		});
	});

	describe("round-trip", () => {
		it("parseCsv(writeCsv(rows)) reproduces the original rows", () => {
			const rows = [
				["title", "username", "password", "notes"],
				["GitHub", "me@example.com", "p@ss,word", 'line one\nline two with "quotes"'],
				["Chrome, Inc", "user", "pw", ""],
			];
			expect(parseCsv(writeCsv(rows))).toEqual(rows);
		});
	});
});
