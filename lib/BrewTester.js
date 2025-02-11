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
		await jsonTester.pInit();

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

		const {errors, errorsFull, isUnknownError = false} = results;

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

		if (isUnknownError) {
			console.error(`Unknown error when testing! (See above logs)`);
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

class _BrewTesterFileNames {
	static _LOG_TAG = `FILE_NAME`;

	static _RE_NAME_FORMAT = /^[^;]+; .+\.json$/;

	static run () {
		Um.info(this._LOG_TAG, `Testing for incorrect file names...`);

		const errors = [];

		Uf.runOnDirs((dir) => {
			const filenames = fs.readdirSync(dir);

			errors.push(
				...filenames
					.filter(it => !it.endsWith(".json"))
					.map(it => `File did not have ".json" extension: ${it}`),
			);

			errors.push(
				...filenames
					.filter(it => !this._RE_NAME_FORMAT.test(it))
					.map(it => `Filename did not match expected pattern "${this._RE_NAME_FORMAT.toString()}" extension: ${it}`),
			);
		});

		if (!errors.length) return Um.info(this._LOG_TAG, `Files had expected names.`);

		errors.forEach(it => console.error(it));
		process.exit(1);
	}
}

class _BrewTesterFileProps {
	static _LOG_TAG = `PROP_CHECK`;

	static _DIR_TO_PRIMARY_PROP = {
		"creature": [
			"monster",
		],
		"book": [
			"book",
			"bookData",
		],
		"adventure": [
			"adventure",
			"adventureData",
		],
		"makebrew": [
			"makebrewCreatureTrait",
		],
	};

	static run () {
		Um.info(this._LOG_TAG, `Checking file contents...`);

		const results = [];
		Uf.runOnDirs((dir) => {
			if (dir === "collection") return;

			Um.info(this._LOG_TAG, `Checking dir "${dir}"...`);
			const dirFiles = fs.readdirSync(dir, "utf8")
				.filter(file => file.endsWith(".json"));

			dirFiles.forEach(file => {
				const json = JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf-8"));
				const props = this._DIR_TO_PRIMARY_PROP[dir] || [dir];
				props.forEach(prop => {
					if (!json[prop]) results.push(`${dir}/${file} was missing a "${prop}" property!`);
				});
			});
		});

		if (results.length) {
			results.forEach(r => Um.error(this._LOG_TAG, r));
			throw new Error(`${results.length} file${results.length === 1 ? " was missing a primary prop!" : "s were missing primary props!"} See above for more info.`);
		}

		Um.info(this._LOG_TAG, `Complete.`);
	}
}

class BrewTester {
	static async pTestJson (args, opts) { return _BrewTesterJson.pRun(args, opts); }
	static testFileLocations () { return _BrewTesterFileLocations.run(); }
	static testFileNames () { return _BrewTesterFileNames.run(); }
	static testFileProps () { return _BrewTesterFileProps.run(); }
}

export {BrewTester};
