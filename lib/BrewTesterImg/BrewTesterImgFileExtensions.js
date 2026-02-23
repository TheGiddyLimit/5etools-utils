import fs from "node:fs";
import {lsRecursiveSync} from "../UtilFs.js";
import Um from "../UtilMisc.js";
import {BrewTesterBase} from "../BrewTester/BrewTesterBase.js";
import {IMG_ALLOWED_EXTENSIONS} from "./BrewTesterImgConsts.js";

export class BrewTesterImgFileExtensions extends BrewTesterBase {
	_LOG_TAG = "FILE_EXT";

	constructor ({allowedExtensions = null} = {}) {
		super();
		this._allowedExtensions = allowedExtensions || IMG_ALLOWED_EXTENSIONS;
	}

	async _pRun () {
		Um.info(this._LOG_TAG, `Testing for incorrect file extensions...`);

		const badPaths = Object.entries(this._allowedExtensions)
			.flatMap(([dirName, allowedExts]) => {
				if (!fs.existsSync(dirName) || !fs.statSync(dirName).isDirectory()) return [];

				return lsRecursiveSync(dirName)
					.filter(filePath => {
						const ext = filePath.split(".").at(-1).toLowerCase();
						return !allowedExts.has(ext);
					});
			});

		if (!badPaths.length) return Um.info(this._LOG_TAG, `Files had expected extensions.`);

		badPaths.forEach(filePath => Um.error(this._LOG_TAG, `File extension not in allowlist: ${filePath}`));
		throw new Error(`Test failed! See above for more info`);
	}
}
