import {JsonTester} from "../lib/TestJson.js";

test(
	"Test JSON schema tester",
	async () => {
		const jsonTester = new JsonTester({
			dirSchema: "test/data/test-test-json/schema",
			fnGetSchemaId: () => "schema.json",
		});
		await jsonTester.pInit();

		const {errors, errorsFull} = jsonTester.getErrors("test/data/test-test-json/data");

		expect(errors.length).toBe(3);
		expect(errorsFull.length).toBe(3);
	},
);

test(
	"Test JSON schema tester (brew)",
	async () => {
		const jsonTester = new JsonTester({
			mode: "brew",
			fnGetSchemaId: () => "homebrew.json",
		});
		await jsonTester.pInit();

		const {errors, errorsFull} = jsonTester.getErrors("test/data/test-test-json/data-brew");

		expect(errors.length).toBe(0);
		expect(errorsFull.length).toBe(0);
	},
);
