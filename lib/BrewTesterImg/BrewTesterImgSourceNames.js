import fs from "node:fs";
import Um from "../UtilMisc.js";
import {BrewTesterBase} from "../BrewTester/BrewTesterBase.js";
import {IMG_SOURCE_DIRS} from "./BrewTesterImgConsts.js";
import {UtilSource} from "../UtilSource.js";

export class BrewTesterImgSourceNames extends BrewTesterBase {
	_LOG_TAG = "SRC_NAME";

	constructor ({dirsSource = null, isPrerelease = false} = {}) {
		super();
		this._dirsSource = dirsSource || IMG_SOURCE_DIRS;
		this._isPrerelease = isPrerelease;
	}

	async _pRun () {
		const sourceType = this._isPrerelease ? "prerelease" : "homebrew";
		Um.info(this._LOG_TAG, `Testing for valid ${sourceType} source names...`);

		const fnIsValidSource = this._isPrerelease
			? UtilSource.isValidPrereleaseSource.bind(UtilSource)
			: UtilSource.isValidHomebrewSource.bind(UtilSource);

		const badNames = this._dirsSource
			.flatMap(dirName => {
				if (!fs.existsSync(dirName) || !fs.statSync(dirName).isDirectory()) return [];

				return fs.readdirSync(dirName)
					.filter(name => fs.statSync(`${dirName}/${name}`).isDirectory())
					.filter(name => !fnIsValidSource(name));
			});

		if (!badNames.length) return Um.info(this._LOG_TAG, `Directory names had expected sources.`);

		badNames.forEach(name => Um.error(this._LOG_TAG, `Invalid ${sourceType} source directory name: ${name}`));
		throw new Error(`Test failed! See above for more info`);
	}
}
