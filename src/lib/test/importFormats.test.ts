import { describe, it, expect } from "vitest";
import { detectFormat } from "../utils/importFormats";

describe("importFormats detectFormat", () => {
	it("recognizes a Bitwarden login export", () => {
		const headers = [
			"folder",
			"favorite",
			"type",
			"name",
			"notes",
			"fields",
			"reprompt",
			"login_uri",
			"login_username",
			"login_password",
			"login_totp",
		];
		const result = detectFormat(headers);
		expect(result.source).toBe("bitwarden");
		expect(result.confidence).toBeGreaterThanOrEqual(0.5);
		expect(result.mapping).toEqual({
			title: "name",
			website: "login_uri",
			username: "login_username",
			password: "login_password",
			notes: "notes",
		});
	});

	it("recognizes a 1Password export", () => {
		const headers = ["Title", "Url", "Username", "Password", "Notes", "Type"];
		const result = detectFormat(headers);
		expect(result.source).toBe("1password");
		expect(result.confidence).toBeGreaterThanOrEqual(0.5);
		expect(result.mapping).toEqual({
			title: "Title",
			website: "Url",
			username: "Username",
			password: "Password",
			notes: "Notes",
		});
	});

	it("recognizes a Chrome password export", () => {
		const headers = ["name", "url", "username", "password"];
		const result = detectFormat(headers);
		expect(result.source).toBe("chrome");
		expect(result.confidence).toBeGreaterThanOrEqual(0.5);
		expect(result.mapping).toEqual({
			title: "name",
			website: "url",
			username: "username",
			password: "password",
			notes: null,
		});
	});

	it("falls back to unknown with no mapping for a wholly unfamiliar format", () => {
		const headers = ["Site Name", "Login Email", "Login Password"];
		const result = detectFormat(headers);
		expect(result.source).toBe("unknown");
		expect(result.confidence).toBeLessThan(0.5);
		expect(result.mapping).toEqual({
			title: null,
			website: null,
			username: null,
			password: null,
			notes: null,
		});
	});

	it("falls back to unknown but still pre-fills a best-effort generic mapping", () => {
		const headers = ["Name", "Website", "User", "Pass"];
		const result = detectFormat(headers);
		expect(result.source).toBe("unknown");
		expect(result.confidence).toBeLessThan(0.5);
		expect(result.mapping).toEqual({
			title: "Name",
			website: "Website",
			username: "User",
			password: "Pass",
			notes: null,
		});
	});

	it("is case-insensitive and trims whitespace when matching headers", () => {
		const headers = [" NAME ", " URL ", " USERNAME ", " PASSWORD "];
		const result = detectFormat(headers);
		expect(result.source).toBe("chrome");
	});
});
