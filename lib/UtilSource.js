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
	static _PRERELEASE_SOURCE_VALIDATOR = null;

	static _getHomebrewSourceValidator () {
		if (this._HOMEBREW_SOURCE_VALIDATOR) return this._HOMEBREW_SOURCE_VALIDATOR;

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

		return this._HOMEBREW_SOURCE_VALIDATOR;
	}

	static _getPrereleaseSourceValidator () {
		if (this._PRERELEASE_SOURCE_VALIDATOR) return this._PRERELEASE_SOURCE_VALIDATOR;

		this._PRERELEASE_SOURCE_VALIDATOR = UtilAjv.getValidator();

		[
			"util.json",
		]
			.forEach(fname => {
				this._PRERELEASE_SOURCE_VALIDATOR.addSchema(
					Uf.readJsonSync(path.join(path.join(__dirname, "..", "schema", "brew", fname))),
					fname,
				);
			});

		this._PRERELEASE_SOURCE_VALIDATOR.addSchema(
			{
				"type": "string",
				"allOf": [
					{
						"$ref": "util.json#/$defs/_sourceString",
					},
					{
						"minLength": 6,
					},
					{
						"pattern": "^(?:UA|XUA)[-a-zA-Z0-9&+!]+$",
					},
				],
			},
			"prereleaseSource",
		);

		return this._PRERELEASE_SOURCE_VALIDATOR;
	}

	static isValidHomebrewSource (source) {
		return this._getHomebrewSourceValidator().validate("homebrewSource", source);
	}

	static isValidPrereleaseSource (source) {
		return this._getPrereleaseSourceValidator().validate("prereleaseSource", source);
	}
}
