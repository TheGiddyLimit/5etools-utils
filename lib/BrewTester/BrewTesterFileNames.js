import Um from "../UtilMisc.js";
import * as Uf from "../UtilFs.js";
import fs from "fs";
import {BrewTesterBase} from "./BrewTesterBase.js";

export class BrewTesterFileNames extends BrewTesterBase {
	_LOG_TAG = `FILE_NAME`;

	static _RE_NAME_FORMAT = /^[^;]+; .+\.json$/;

	async _pRun () {
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
					.filter(it => !this.constructor._RE_NAME_FORMAT.test(it))
					.map(it => `Filename did not match expected pattern "${this.constructor._RE_NAME_FORMAT.toString()}" extension: ${it}`),
			);
		});

		if (!errors.length) return Um.info(this._LOG_TAG, `Files had expected names.`);

		errors.forEach(it => console.error(it));
		throw new Error(`Test failed! See above for more info`);
	}
}
