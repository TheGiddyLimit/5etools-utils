import fs from "node:fs";
import {lsRecursiveSync} from "../UtilFs.js";
import Um from "../UtilMisc.js";
import {BrewTesterBase} from "../BrewTester/BrewTesterBase.js";
import {IMG_SOURCE_DIRS, MAX_IMG_FILE_SIZE_BYTES} from "./BrewTesterImgConsts.js";

export class BrewTesterImgFileSizes extends BrewTesterBase {
	_LOG_TAG = "FILE_SIZE";

	constructor ({dirsSource = null, maxSizeBytes = null} = {}) {
		super();
		this._dirsSource = dirsSource || IMG_SOURCE_DIRS;
		this._maxSizeBytes = maxSizeBytes || MAX_IMG_FILE_SIZE_BYTES;
	}

	async _pRun () {
		const maxSizeMb = this._maxSizeBytes / (1024 * 1024);
		Um.info(this._LOG_TAG, `Testing for file sizes <= ${maxSizeMb} MiB...`);

		const badPaths = this._dirsSource
			.flatMap(dirName => {
				if (!fs.existsSync(dirName) || !fs.statSync(dirName).isDirectory()) return [];

				return lsRecursiveSync(dirName)
					.filter(filePath => fs.statSync(filePath).size > this._maxSizeBytes);
			});

		if (!badPaths.length) return Um.info(this._LOG_TAG, `Files had expected sizes.`);

		badPaths.forEach(filePath => Um.error(this._LOG_TAG, `File larger than ${maxSizeMb} MiB: ${filePath}`));
		throw new Error(`Test failed! See above for more info`);
	}
}
