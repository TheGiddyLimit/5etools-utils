import {JsonTester } from "../lib/TestJson.js";

test(
	"Test JSON schema tester",
	() => {
		const {errors} = new JsonTester({
			dirSchema: "test/data/test-test-json/schema",
			fnGetSchemaId: () => "schema.json",
		}).getErrors("test/data/test-test-json/data");

		expect(errors.length).toBe(3);
	},
);
