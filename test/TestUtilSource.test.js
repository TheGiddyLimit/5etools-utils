import {UtilSource} from "../lib/UtilSource.js";

test(
	"Test valid site source",
	() => {
		expect(UtilSource.isSiteSource("PHB")).toBe(true);
		expect(UtilSource.isSiteSource("NotARealSource")).toBe(false);
	},
);

test(
	"Test valid homebrew source",
	() => {
		expect(UtilSource.isValidHomebrewSource("AAAAAA")).toBe(true);
		expect(UtilSource.isValidHomebrewSource("AAAAA")).toBe(false);
		expect(UtilSource.isValidHomebrewSource("AAA:AA")).toBe(false);
		expect(UtilSource.isValidHomebrewSource("AAAAA ")).toBe(false);
		expect(UtilSource.isValidHomebrewSource(" AAAAA")).toBe(false);
		expect(UtilSource.isValidHomebrewSource("A    A")).toBe(true);

		// Legacy sources
		expect(UtilSource.isValidHomebrewSource("KG")).toBe(true);
		expect(UtilSource.isValidHomebrewSource("AS:C")).toBe(true);
	},
);

test(
	"Test valid prerelease source",
	() => {
		expect(UtilSource.isValidPrereleaseSource("UA2020Feats")).toBe(true);
		expect(UtilSource.isValidPrereleaseSource("XUA2025Psion")).toBe(true);

		expect(UtilSource.isValidPrereleaseSource("AAAAAA")).toBe(false);
		expect(UtilSource.isValidPrereleaseSource("KG")).toBe(false);
		expect(UtilSource.isValidPrereleaseSource("PHB")).toBe(false);
		expect(UtilSource.isValidPrereleaseSource("UA 2025 Psion")).toBe(false);
	},
);
