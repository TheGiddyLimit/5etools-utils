import MiscUtil from "../lib/UtilMisc.js";

describe("Delete object path", () => {
	test("Basic delete", () => {
		const obj = {a: 1, b: {}};
		MiscUtil.deleteObjectPath(obj, "b");
		expect(obj).toStrictEqual({a: 1});
	});

	test("Nested delete", () => {
		const obj = {a: 1, b: {b2: 2}};
		MiscUtil.deleteObjectPath(obj, "b", "b2");
		expect(obj).toStrictEqual({a: 1});
	});

	test("Nested delete with sibling", () => {
		const obj = {a: 1, b: {b2: 2, b3: 3}};
		MiscUtil.deleteObjectPath(obj, "b", "b2");
		expect(obj).toStrictEqual({a: 1, b: {b3: 3}});
	});

	test("Root delete", () => {
		const obj = {a: 1};
		MiscUtil.deleteObjectPath(obj, "a");
		expect(obj).toStrictEqual({});
	});

	test("No path delete", () => {
		const obj = {a: 1};
		MiscUtil.deleteObjectPath(obj);
		expect(obj).toStrictEqual({a: 1});
	});
});
