import {Worker} from "node:worker_threads";
import fs from "node:fs";
import os from "node:os";
import he from "he";
import sanitizeHtml from "sanitize-html";
import {getCleanJson} from "./UtilClean.js";
import {ObjectWalker} from "./ObjectWalker.js";
import * as Uf from "./UtilFs.js";
import Um from "./UtilMisc.js";
import {Deferred, WorkerList} from "./WorkerList.js";

export class BrewCleanerHtml {
	static _LOG_TAG = `HTML`;

	static _OPTS_SANITIZE = {
		allowedTags: [
			// region Custom things which look like tags
			"<$name$>",
			// endregion
		],
		allowedAttributes: {},
	};

	static _getCleanFileMeta ({file}) {
		const fileData = Uf.readJsonSync(file);

		const messages = [];

		const {_meta, _test} = fileData;
		delete fileData._meta;
		delete fileData._test;

		const keyStack = [];
		const objectStack = [];

		const isInFoundryDescriptionEffect = () => {
			if (objectStack.at(-1)?.key !== "system.description.value") return false;
			return keyStack.at(-1) === "changes" && ["effects", "foundryEffects"].includes(keyStack.at(-2));
		};

		const fileOut = ObjectWalker.walk({
			obj: fileData,
			filePath: file,
			primitiveHandlers: {
				string: (str, {lastKey}) => {
					if (lastKey === "value" && isInFoundryDescriptionEffect()) return str;

					const clean = he.unescape(
						sanitizeHtml(
							str,
							this._OPTS_SANITIZE,
						),
					);

					if (clean !== str) {
						const msg = `Sanitized ${keyStack.map(k => `"${k}"`).join(" -> ")}:\n${str}\n${clean}`;
						messages.push(msg);
						Um.info(this._LOG_TAG, msg);
					}

					return clean;
				},
				preObject: (obj) => objectStack.push(obj),
				postObject: () => objectStack.pop(),
				preArray: (_, {lastKey}) => keyStack.push(lastKey),
				postArray: () => keyStack.pop(),
			},
			isModify: true,
		});

		const out = {$schema: fileOut.$schema, _meta, _test};
		Object.assign(out, fileOut);

		return {
			messages,
			out,
		};
	}

	static async _pUpdateDir (dir) {
		Uf.listJsonFiles(dir)
			.forEach(file => {
				const {messages, out} = this._getCleanFileMeta({file});
				if (!messages?.length) return;

				fs.writeFileSync(file, getCleanJson(out));
			});
	}

	static async pRun () {
		await Uf.pRunOnDirs(
			async (dir) => {
				Um.info(this._LOG_TAG, `Sanitizing HTML in dir "${dir}"...`);
				await this._pUpdateDir(dir);
			},
			{
				isSerial: true,
			},
		);
		Um.info(this._LOG_TAG, "Done!");
	}

	static getFileMessages ({file}) {
		return this._getCleanFileMeta({file});
	}

	static async pGetErrorsOnDirsWorkers ({isFailFast = false} = {}) {
		Um.info(this._LOG_TAG, `Testing for HTML...`);

		const cntWorkers = Math.max(1, os.cpus().length - 1);

		const messages = [];

		const fileQueue = [];
		Uf.runOnDirs((dir) => fileQueue.push(...Uf.listJsonFiles(dir)));

		const workerList = new WorkerList();

		let cntFailures = 0;
		const workers = [...new Array(cntWorkers)]
			.map(() => {
				const worker = new Worker(new URL("./BrewCleanerHtmlWorker.js", import.meta.url));

				worker.on("message", (msg) => {
					switch (msg.type) {
						case "ready":
						case "done": {
							if (msg.payload.isError) {
								messages.push(...msg.payload.messages);

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
					payload: {},
				});

				return worker;
			});

		while (fileQueue.length) {
			if (isFailFast && messages.length) break;

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

		return {messages, isUnknownError: !!cntFailures};
	}
}
