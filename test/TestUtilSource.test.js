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
		expect(UtilSource.isValidHomebrewSorce("AAAAAA")).toBe(true);
		expect(UtilSource.isValidHomebrewSorce("AAAAA")).toBe(false);
		expect(UtilSource.isValidHomebrewSorce("AAA:AA")).toBe(false);
		expect(UtilSource.isValidHomebrewSorce("AAAAA ")).toBe(false);
		expect(UtilSource.isValidHomebrewSorce(" AAAAA")).toBe(false);
		expect(UtilSource.isValidHomebrewSorce("A    A")).toBe(true);

		// Legacy sources
		expect(UtilSource.isValidHomebrewSorce("KG")).toBe(true);
		expect(UtilSource.isValidHomebrewSorce("AS:C")).toBe(true);
	},
);
