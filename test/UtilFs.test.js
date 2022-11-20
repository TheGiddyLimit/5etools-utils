import {listJsonFiles} from "../lib/UtilFs.js";

test(
	"List JSON files blocklist",
	() => {
		expect(
			listJsonFiles("./test/data/test-util-fs/json", {dirBlocklist: new Set(["./test/data/test-util-fs/json/block"])}),
		)
			.toStrictEqual([
				"./test/data/test-util-fs/json/allow/a.json",
				"./test/data/test-util-fs/json/allow/b.json",
			]);
	},
);
