import fs from "node:fs";
import {BrewTesterBase} from "./BrewTesterBase.js";
import Um from "../UtilMisc.js";

export class BrewTesterImgDirectories extends BrewTesterBase {
	_LOG_TAG = "IMG_DIR";

	constructor ({dirAllowlist = null, pathImgDir = "_img"} = {}) {
		super();
		this._dirAllowlist = new Set(dirAllowlist || []);
		this._pathImgDir = pathImgDir;
	}

	async _pRun () {
		if (!this._dirAllowlist.size) throw new Error(`Directory allowlist was required!`);

		if (!fs.existsSync(this._pathImgDir)) {
			Um.info(this._LOG_TAG, `Directory "${this._pathImgDir}" was not found; skipping.`);
			return;
		}

		const extraDirs = fs.readdirSync(this._pathImgDir)
			.filter(dir => !this._dirAllowlist.has(dir));

		if (!extraDirs.length) {
			Um.info(this._LOG_TAG, `No unexpected entries found in "${this._pathImgDir}".`);
			return;
		}

		throw new Error(`Extra directories found in "${this._pathImgDir}":\n${extraDirs.map(d => `\t${d}`).join("\n")}`);
	}
}
