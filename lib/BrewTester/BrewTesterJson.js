import {JsonTester} from "../TestJson.js";
import {listJsonFiles} from "../UtilFs.js";
import pathlib from "path";
import fs from "fs";
import Um from "../UtilMisc.js";
import {BrewTesterBase} from "./BrewTesterBase.js";

export class BrewTesterJson extends BrewTesterBase {
	_LOG_TAG = "JSON";
	_IS_FAIL_SLOW = !!process.env.FAIL_SLOW;

	constructor ({mode, filepath, dir, ...rest}) {
		super({...rest});
		this._mode = mode;
		this._filepath = filepath;
		this._dir = dir;
	}

	async _pRun () {
		const jsonTester = new JsonTester({mode: this._mode, tagLog: this._LOG_TAG, fnGetSchemaId: () => "homebrew.json"});
		await jsonTester.pInit();

		let results;
		if (this._filepath) {
			results = jsonTester.getFileErrors({filePath: this._filepath});
		} else if (this._dir) {
			const fileList = listJsonFiles(this._dir)
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
			throw new Error(`Test failed! See above for more info`);
		}

		if (isUnknownError) {
			console.error(`Unknown error when testing! (See above logs)`);
			throw new Error(`Test failed! See above for more info`);
		}

		if (!errors.length) Um.info(this._LOG_TAG, `Schema test passed.`);
	}
}
