import * as os from "os";
import * as path from "path";
import * as url from "url";
import {Worker} from "worker_threads";

import * as jsonSourceMap from "json-source-map";

import * as Uf from "./UtilFs.js";
import Um from "./UtilMisc.js";
import {WorkerList, Deferred} from "./WorkerList.js";
import {ObjectWalker} from "./ObjectWalker.js";
import {UrlUtil} from "./UrlUtil.js";
import {UtilAjv} from "./UtilAjv.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const _IS_SORT_RESULTS = !process.env.VET_TEST_JSON_RESULTS_UNSORTED;
const _IS_TRIM_RESULTS = !process.env.VET_TEST_JSON_RESULTS_UNTRIMMED;
const _IS_VERBOSE = !process.env.VET_TEST_JSON_QUIET;

const LOG_TAG = "JSON";

const MODES = {
	SITE: "site",
	BREW: "brew",
	UA: "ua",
};

class JsonTester {
	constructor (
		{
			fnGetSchemaId,

			mode = null,
			dirSchema = null,
			tagLog = LOG_TAG,
		},
	) {
		this._tagLog = tagLog;

		if (mode && dirSchema) throw new Error(`"mode" and "dirSchema" are mutually exclusive!`);
		if (mode != null && !Object.values(MODES).includes(mode)) throw new Error(`"mode" must be one of ${Object.values(MODES).join("/")}!`);
		if (!fnGetSchemaId) throw new Error(`"fnGetSchemaId" is required!`);

		this._dirSchemaSite = path.join(__dirname, "..", "schema", "site");
		this._dirSchemaBrew = path.join(__dirname, "..", "schema", "brew");
		this._dirSchemaUa = path.join(__dirname, "..", "schema", "ua");

		this._dirSchema = dirSchema ?? (mode === "ua" ? this._dirSchemaUa : mode === "brew" ? this._dirSchemaBrew : this._dirSchemaSite);

		this._fnGetSchemaId = fnGetSchemaId;

		this._ajv = UtilAjv.getValidator();

		this._pLoadSchema = null;
	}

	async pInit () {
		await this._pDoLoadSchemas();
	}

	_getFileErrors ({filePath}) { return `${filePath}\n${JSON.stringify(this._ajv.errors, null, 2)}`; }

	_getErrors ({filePath, data}) {
		const out = {errors: [], errorsFull: []};

		if (!process.env.CI) out.errorsFull.push(this._getFileErrors({filePath}));

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
		Um.error(this._tagLog, error);
		out.errors.push(error);

		return out;
	}

	doLoadSchema (type, relativeFilePath) {
		if (!Object.values(MODES).includes(type)) throw new Error(`Unknown schema type "${type}"`);

		const dir = {
			[MODES.SITE]: this._dirSchemaSite,
			[MODES.BREW]: this._dirSchemaBrew,
			[MODES.UA]: this._dirSchemaUa,
		}[type];
		if (!dir) throw new Error(`Unhandled type "${type}"!`);

		this._ajv.addSchema(
			Uf.readJsonSync(path.join(dir, relativeFilePath)),
			relativeFilePath,
		);
	}

	async _pDoLoadSchemas () {
		await (this._pLoadSchema ||= (async () => {
			const remoteUrls = new Set();

			Uf.listJsonFiles(this._dirSchema)
				.forEach(filePath => {
					filePath = path.normalize(filePath);

					const relativeFilePath = path.relative(this._dirSchema, filePath)
						.replace(/\\/g, "/");

					const json = Uf.readJsonSync(filePath);
					this._ajv.addSchema(json, relativeFilePath);

					ObjectWalker.walk({
						obj: json,
						filePath,
						primitiveHandlers: {
							object: obj => {
								if (!obj.$ref) return;

								if (!UrlUtil.isUrl(obj.$ref, {protocols: ["http:", "https:"]})) return;

								const url = new URL(obj.$ref);
								url.hash = "";
								remoteUrls.add(String(url));
							},
						},
					});
				});

			if (!remoteUrls.size) return;

			await Promise.all(
				Array.from(remoteUrls).map(async remoteUrl => {
					this._ajv.addSchema(await (await fetch(remoteUrl)).json(), remoteUrl);
				}),
			);

			return true;
		})());
	}

	async _pHasSchema (schemaId) {
		await this._pDoLoadSchemas();
		return !!this._ajv.schemas[schemaId];
	}

	getFileErrors ({filePath} = {}) {
		if (_IS_VERBOSE) Um.info(this._tagLog, `\tValidating "${filePath}"...`);

		const data = Uf.readJsonSync(filePath);

		const isValid = this._ajv.validate(this._fnGetSchemaId(filePath), data);
		if (isValid) return {errors: [], errorsFull: []};

		return this._getErrors({filePath, data});
	}

	_doRunOnDir ({isFailFast, dir, errors, errorsFull, ...opts} = {}) {
		for (const filePath of Uf.listJsonFiles(dir, opts)) {
			const {errors: errorsFile, errorsFull: errorsFullFile} = this.getFileErrors({filePath});
			errors.push(...errorsFile);
			errorsFull.push(...errorsFullFile);
			if (isFailFast && (errorsFile.length || errorsFullFile.length)) break;
		}
	}

	/**
	 * @param dir
	 * @param [opts]
	 * @param [opts.dirBlocklist]
	 */
	getErrors (dir, opts = {}) {
		Um.info(this._tagLog, `Validating JSON against schema`);

		const errors = [];
		const errorsFull = [];

		this._doRunOnDir({...opts, errors, errorsFull, dir});

		return {errors, errorsFull};
	}

	getErrorsOnDirs ({isFailFast = false} = {}) {
		Um.info(this._tagLog, `Validating JSON against schema`);

		const errors = [];
		const errorsFull = [];

		Uf.runOnDirs((dir) => {
			if (isFailFast && errors.length) return;
			return this._doRunOnDir({isFailFast, errors, errorsFull, dir});
		});

		return {errors, errorsFull};
	}

	async pGetErrorsOnDirsWorkers ({isFailFast = false, fileList = null} = {}) {
		Um.info(this._tagLog, `Validating JSON against schemas in dir: ${this._dirSchema}`);

		const cntWorkers = Math.max(1, os.cpus().length - 1);

		const errors = [];
		const errorsFull = [];

		const fileQueue = [...(fileList || [])];

		if (!fileList) {
			Uf.runOnDirs((dir) => {
				fileQueue.push(...Uf.listJsonFiles(dir));
			});
		}

		// region Verify that every file path maps to a valid schema
		await Promise.all(
			fileQueue.map(async filePath => {
				const schemaId = this._fnGetSchemaId(filePath);
				if (!schemaId) throw new Error(`Failed to get schema ID for file path "${filePath}"`);
				if (!(await this._pHasSchema(schemaId))) throw new Error(`No schema loaded with schema ID "${schemaId}"`);
				return schemaId;
			}),
		);
		// endregion

		const workerList = new WorkerList();

		let cntFailures = 0;
		const workers = [...new Array(cntWorkers)]
			.map(() => {
				// Relative `Worker` paths do not function in packages, so give an exact path
				const worker = new Worker(path.join(__dirname, "TestJsonWorker.js"));

				worker.on("message", (msg) => {
					switch (msg.type) {
						case "ready":
						case "done": {
							if (msg.payload.isError) {
								errors.push(...msg.payload.errors);
								errorsFull.push(...msg.payload.errorsFull);

								if (isFailFast) workers.forEach(worker => worker.postMessage({type: "cancel"}));
							}

							if (worker.dIsActive) worker.dIsActive.resolve();
							workerList.add(worker);

							break;
						}
					}
				});

				worker.on("error", e => {
					console.error(e);
					cntFailures++;
				});

				worker.postMessage({
					type: "init",
					payload: {
						dirSchema: this._dirSchema,
						tagLog: this._tagLog,
						strFnGetSchemaId: this._fnGetSchemaId.toString(),
					},
				});

				return worker;
			});

		while (fileQueue.length) {
			if (isFailFast && errors.length) break;

			const file = fileQueue.shift();
			const worker = await workerList.get();

			worker.dIsActive = new Deferred();
			worker.postMessage({
				type: "work",
				payload: {
					file,
				},
			});
		}

		await Promise.all(workers.map(it => it.dIsActive?.promise));
		await Promise.all(workers.map(it => it.terminate()));

		return {errors, errorsFull, isUnknownError: !!cntFailures};
	}
}

export {JsonTester, LOG_TAG};
