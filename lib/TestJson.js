import * as path from "path";

import Ajv from "ajv";
import * as jsonSourceMap from "json-source-map";

import * as uf from "./UtilFs.js";
import * as um from "./UtilMisc.js";

const _IS_SORT_RESULTS = !process.env.VET_TEST_JSON_RESULTS_UNSORTED;
const _IS_TRIM_RESULTS = !process.env.VET_TEST_JSON_RESULTS_UNTRIMMED;

const LOG_TAG = "JSON";

class JsonTester {
	static _RE_DATE = /^\d\d\d\d-\d\d-\d\d$/;

	constructor (
		{
			dirSchema,
			tagLog = LOG_TAG,
			fnGetSchemaId = () => "homebrew.json",
		},
	) {
		this._dirSchema = dirSchema;
		this._tagLog = tagLog;
		this._fnGetSchemaId = fnGetSchemaId;

		// region Set up validator
		this._ajv = new Ajv({
			allowUnionTypes: true,
		});

		this._ajv.addKeyword({
			keyword: "version",
			validate: false,
		});

		this._ajv.addFormat(
			"date",
			{
				validate: str => JsonTester._RE_DATE.test(str),
			},
		);
		// endregion

		this._isSchemaLoaded = false;
	}

	/**
	 * Add any implicit data to the JSON
	 */
	_addImplicits (obj, lastKey) {
		if (typeof obj !== "object") return;
		if (obj == null) return;
		if (obj instanceof Array) obj.forEach(it => this._addImplicits(it, lastKey));
		else {
			// "obj.mode" will be set if this is in a "_copy" etc. block
			if (lastKey === "spellcasting" && !obj.mode) obj.type = obj.type || "spellcasting";

			Object.entries(obj).forEach(([k, v]) => this._addImplicits(v, k));
		}
	}

	_getFileErrors ({filePath}) { return `${filePath}\n${JSON.stringify(this._ajv.errors, null, 2)}`; }

	_handleError ({filePath, errors, errorsFull, data}) {
		if (!process.env.CI) errorsFull.push(this._getFileErrors({filePath}));

		// Sort the deepest errors to the bottom, as these are the ones we're most likely to be the ones we care about
		//   manually checking.
		if (_IS_SORT_RESULTS) {
			this._ajv.errors.sort((a, b) => (a.instancePath.length ?? -1) - (b.instancePath.length ?? -1));
		}

		// If there are an excessive number of errors, it's probably a junk entry; show only the first error and let the
		//   user figure it out.
		if (_IS_TRIM_RESULTS && this._ajv.errors.length > 5) {
			console.error(`(${this._ajv.errors.length} errors found, showing (hopefully) most-relevant one)`);
			this._ajv.errors = this._ajv.errors.slice(-1);
		}

		// Add line numbers
		const sourceMap = jsonSourceMap.stringify(data, null, "\t");
		this._ajv.errors.forEach(it => {
			const errorPointer = sourceMap.pointers[it.instancePath];
			it.lineNumberStart = errorPointer.value.line;
			it.lineNumberEnd = errorPointer.valueEnd.line;
		});

		const error = this._getFileErrors({filePath});
		um.error(this._tagLog, error);
		errors.push(error);
	}

	_doLoadSchema () {
		if (this._isSchemaLoaded) return;

		uf.listJsonFiles(this._dirSchema)
			.forEach(filePath => {
				filePath = path.normalize(filePath);
				const contents = uf.readJSON(filePath);

				const relativeFilePath = path.relative(this._dirSchema, filePath)
					.replace(/\\/g, "/");

				this._ajv.addSchema(contents, relativeFilePath);
			});

		this._isSchemaLoaded = true;
	}

	_doRunOnDir ({isFailFast, dir, errors, errorsFull, ...opts} = {}) {
		for (const filePath of uf.listJsonFiles(dir, opts)) {
			um.info(this._tagLog, `\tValidating "${filePath}"...`);

			const data = uf.readJSON(filePath);
			this._addImplicits(data);
			const valid = this._ajv.validate(this._fnGetSchemaId(filePath), data);

			if (!valid) {
				this._handleError({filePath, errors, errorsFull, data});
				if (isFailFast) break;
			}
		}
	}

	/**
	 * @param dir
	 * @param [opts]
	 * @param [opts.dirBlacklist]
	 */
	getErrors (dir, opts = {}) {
		um.info(this._tagLog, `Validating JSON against schema`);

		this._doLoadSchema();

		const errors = [];
		const errorsFull = [];

		this._doRunOnDir({...opts, errors, errorsFull, dir});

		return {errors, errorsFull};
	}

	getErrorsOnDirs ({isFailFast = false} = {}) {
		um.info(this._tagLog, `Validating JSON against schema`);

		this._doLoadSchema();

		const errors = [];
		const errorsFull = [];

		uf.runOnDirs((dir) => {
			if (isFailFast && errors.length) return;
			return this._doRunOnDir({isFailFast, errors, errorsFull, dir});
		});

		return {errors, errorsFull};
	}
}

export {JsonTester, LOG_TAG};
