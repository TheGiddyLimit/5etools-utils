import url from "url";
import path from "path";

import {readJsonSync} from "./UtilFs.js";
import {UtilAjv} from "./UtilAjv.js";
import * as Uf from "./UtilFs.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export class UtilSource {
	static _SOURCES = null;

	static isSiteSource (source) {
		this._SOURCES ||= new Set(
			readJsonSync(
				path.join(__dirname, "..", "schema", "site", "sources-5etools.json"),
			).$defs.sources.enum.map(it => it.toLowerCase()),
		);

		return this._SOURCES.has(source?.toLowerCase());
	}

	/* -------------------------------------------- */

	static _HOMEBREW_SOURCE_VALIDATOR = null;

	static isValidHomebrewSorce (source) {
		if (!this._HOMEBREW_SOURCE_VALIDATOR) {
			this._HOMEBREW_SOURCE_VALIDATOR = UtilAjv.getValidator();

			[
				"util.json",
				"sources-homebrew-legacy.json",
				"sources-5etools.json",
			]
				.forEach(fname => {
					this._HOMEBREW_SOURCE_VALIDATOR.addSchema(
						Uf.readJsonSync(path.join(path.join(__dirname, "..", "schema", "brew", fname))),
						fname,
					);
				});

			this._HOMEBREW_SOURCE_VALIDATOR.addSchema(
				{
					"$ref": "util.json#/$defs/sourceJson",
				},
				"homebrewSource",
			);
		}

		return this._HOMEBREW_SOURCE_VALIDATOR.validate("homebrewSource", source);
	}
}
