import Um from "../UtilMisc.js";
import * as Uf from "../UtilFs.js";
import fs from "fs";
import {BrewTesterBase} from "./BrewTesterBase.js";

export class BrewTesterFileProps extends BrewTesterBase {
	_LOG_TAG = `PROP_CHECK`;

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

	async _pRun () {
		Um.info(this._LOG_TAG, `Checking file contents...`);

		const results = [];
		Uf.runOnDirs((dir) => {
			if (dir === "collection") return;

			Um.info(this._LOG_TAG, `Checking dir "${dir}"...`);
			const dirFiles = fs.readdirSync(dir, "utf8")
				.filter(file => file.endsWith(".json"));

			dirFiles.forEach(file => {
				const json = JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf-8"));
				const props = this.constructor._DIR_TO_PRIMARY_PROP[dir] || [dir];
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
