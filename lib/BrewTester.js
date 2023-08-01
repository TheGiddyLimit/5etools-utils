import * as fs from "fs";
import {Command} from "commander";
import Um from "./UtilMisc.js";
import {JsonTester} from "./TestJson.js";
import {listJsonFiles} from "./UtilFs.js";
import * as pathlib from "path";
import * as Uf from "./UtilFs.js";

class _BrewTesterJson {
	static _LOG_TAG = "JSON";
	static _IS_FAIL_SLOW = !!process.env.FAIL_SLOW;

	static async pRun (args, {mode = "brew"} = {}) {
		const program = new Command()
			.argument("[file]", "File to test")
			.option("--dir <dir>", "Directory to test")
		;

		program.parse(args);
		const opts = program.opts();

		const jsonTester = new JsonTester({mode, tagLog: this._LOG_TAG, fnGetSchemaId: () => "homebrew.json"});

		let results;
		if (program.args[0]) {
			results = jsonTester.getFileErrors({filePath: program.args[0]});
		} else if (opts.dir) {
			const fileList = listJsonFiles(opts.dir)
				.filter(it => pathlib.basename(it) !== "index.json");
			results = await jsonTester.pGetErrorsOnDirsWorkers({isFailFast: !this._IS_FAIL_SLOW, fileList: fileList});
		} else {
			results = await jsonTester.pGetErrorsOnDirsWorkers({isFailFast: !this._IS_FAIL_SLOW});
		}

		const {errors, errorsFull} = results;

		if (errors.length) {
			if (!process.env.CI) {
				const outDir = fs.existsSync("_test") && fs.lstatSync("_test").isDirectory()
					? "_test"
					: ".";
				fs.writeFileSync(`${outDir}/test-json.error.log`, errorsFull.join("\n\n=====\n\n"));
			}
			console.error(`Schema test failed (${errors.length} failure${errors.length === 1 ? "" : "s"}).`);
			process.exit(1);
		}

		if (!errors.length) Um.info(this._LOG_TAG, `Schema test passed.`);
	}
}

class _BrewTesterFileLocations {
	static _ROOT_JSON_FILES = new Set([
		"package.json",
		"package-lock.json",
	]);

	static _LOG_TAG = `FILES_ROOT`;

	static run () {
		Um.info(this._LOG_TAG, `Testing for unwanted JSON files in root dir...`);

		const errors = fs.readdirSync(".", "utf8")
			.filter(it => it.toLowerCase().endsWith(".json") && !this._ROOT_JSON_FILES.has(it))
			.map(it => `Unwanted JSON file in root directory: ${it}`);

		if (!errors.length) return Um.info(this._LOG_TAG, `No unwanted JSON files found.`);

		errors.forEach(it => console.error(it));
		process.exit(1);
	}
}

class _BrewTesterFileExtensions {
	static _LOG_TAG = `FILE_EXTS`;

	static run () {
		Um.info(this._LOG_TAG, `Testing for incorrect file extensions...`);

		const errors = [];

		Uf.runOnDirs((dir) => {
			errors.push(
				...fs.readdirSync(dir)
					.filter(it => !it.endsWith(".json"))
					.map(it => `File did not have ".json" extension: ${it}`),
			);
		});

		if (!errors.length) return Um.info(this._LOG_TAG, `Files had expected extensions.`);

		errors.forEach(it => console.error(it));
		process.exit(1);
	}
}

class BrewTester {
	static async pTestJson (args, opts) { return _BrewTesterJson.pRun(args, opts); }
	static testFileLocations () { return _BrewTesterFileLocations.run(); }
	static testFileExtensions () { return _BrewTesterFileExtensions.run(); }
}

export {BrewTester};
