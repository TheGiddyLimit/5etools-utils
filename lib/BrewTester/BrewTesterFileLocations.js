import Um from "../UtilMisc.js";
import fs from "fs";
import {BrewTesterBase} from "./BrewTesterBase.js";

export class BrewTesterFileLocations extends BrewTesterBase {
	static _ROOT_JSON_FILES = new Set([
		"package.json",
		"package-lock.json",
	]);

	_LOG_TAG = `FILES_ROOT`;

	async _pRun () {
		Um.info(this._LOG_TAG, `Testing for unwanted JSON files in root dir...`);

		const errors = fs.readdirSync(".", "utf8")
			.filter(it => it.toLowerCase().endsWith(".json") && !this.constructor._ROOT_JSON_FILES.has(it))
			.map(it => `Unwanted JSON file in root directory: ${it}`);

		if (!errors.length) return Um.info(this._LOG_TAG, `No unwanted JSON files found.`);

		errors.forEach(it => console.error(it));
		throw new Error(`Test failed! See above for more info`);
	}
}
