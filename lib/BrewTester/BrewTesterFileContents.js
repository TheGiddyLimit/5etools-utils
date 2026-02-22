import fs from "node:fs";
import {BrewTesterBase} from "./BrewTesterBase.js";
import {DataTester, DataTesterBase, BraceCheck, EscapeCharacterCheck} from "../TestData.js";
import * as Uf from "../UtilFs.js";
import {ObjectWalker} from "../ObjectWalker.js";
import {UtilSource} from "../UtilSource.js";
import Um from "../UtilMisc.js";

class _CopySourceCheck extends DataTesterBase {
	static _FileState = class {
		sources;
		dependencies;
		internalCopies;

		constructor ({contents}) {
			this.sources = new Set(
				(contents._meta?.sources?.map(src => src?.json) || [])
					.filter(Boolean),
			);
			this.dependencies = Object.fromEntries(
				Object.entries(contents._meta?.dependencies || {})
					.map(([prop, arr]) => [prop, new Set(arr)]),
			);
			this.internalCopies = new Set(contents._meta?.internalCopies || []);
		}
	};

	registerParsedFileCheckers (parsedJsonChecker) {
		parsedJsonChecker.registerFileHandler(this);
	}

	handleFile (file, contents) {
		if (!file.includes("Kobold Press; Scarlet Citadel.json")) return;

		const fileState = new this.constructor._FileState({contents});

		Object.entries(contents)
			.forEach(([prop, arr]) => {
				if (prop.startsWith("_")) return;
				if (!(arr instanceof Array)) return;

				arr.forEach(ent => {
					const propStack = [prop];
					const inlineDependencies = new Set();

					ObjectWalker.walk({
						obj: ent,
						filePath: file,
						primitiveHandlers: {
							preObject: this._onPreObject.bind(this, {propStack, inlineDependencies}),
							object: this._checkObject.bind(this, {fileState, propStack, inlineDependencies}),
							postObject: this._onPostObject.bind(this, {propStack, inlineDependencies}),
						},
					});
				});
			});
	}

	_onPreObject ({propStack, inlineDependencies}, obj) {
		if (obj.type !== "statblockInline") return;

		propStack.push(obj.dataType);
		(obj.dependencies || []).forEach(dep => inlineDependencies.add(dep));
	}

	_onPostObject ({propStack, inlineDependencies}, obj) {
		if (obj.type !== "statblockInline") return;

		propStack.pop();
		inlineDependencies.clear();
	}

	_checkObject ({fileState, propStack, inlineDependencies}, obj, {filePath}) {
		if (!obj._copy?.source) return;

		const prop = propStack.at(-1);
		const sourceCopy = obj._copy.source;

		// Classes/subclasses have an alternate structure.
		if (["class", "subclass"].includes(prop) && UtilSource.isSiteSource(sourceCopy)) {
			const classNameLower = obj._copy.className?.toLowerCase();
			if (
				fileState.dependencies[prop]?.has(classNameLower)
				|| inlineDependencies.has(classNameLower)
			) return;
		}

		// If a root entity, i.e. not in a `statblockInline`, allow internal copies.
		if (
			propStack.length === 1
			&& fileState.internalCopies.has(prop)
			&& fileState.sources.has(sourceCopy)
		) return;

		if (
			fileState.dependencies[prop]?.has(sourceCopy)
			|| inlineDependencies.has(sourceCopy)
		) return;

		this._addMessage(`Entity "${propStack.join(" -> ")}" "${obj.name}" "_copy" source "${sourceCopy}" did not match sources found in dependencies in file "${filePath}"\n`);
	}
}

class _ImageUrlCheck extends DataTesterBase {
	static _RE_IMG_PATH = /^(?<type>img|pdf)\/(?<source>[^/]+)\//;

	static _FileState = class {
		sources;

		constructor ({contents}) {
			this.sources = new Set(
				[
					...(contents._meta?.sources?.map(src => src?.json) || [])
						.filter(Boolean)
						.map(srcJson => srcJson.replace(/:/g, "")),
					...(contents._test?.additionalImageSources || [])
						.map(srcJson => srcJson.replace(/:/g, "")),
				],
			);
		}
	};

	constructor ({imgRepoName, urlPrefixExpected}) {
		super();
		this._imgRepoName = imgRepoName;
		this._urlPrefixExpected = urlPrefixExpected;
	}

	registerParsedFileCheckers (parsedJsonChecker) {
		parsedJsonChecker.registerFileHandler(this);
	}

	handleFile (file, contents) {
		const fileState = new this.constructor._FileState({contents});

		ObjectWalker.walk({
			obj: contents,
			filePath: file,
			primitiveHandlers: {
				object: this._checkObject.bind(this, {fileState}),
			},
		});
	}

	_checkObject ({fileState}, obj, {filePath}) {
		if (obj.type !== "image" || obj.href?.type !== "external" || !obj.href?.url) return;

		const {url} = obj.href;
		if (!url.toLowerCase().startsWith(this._urlPrefixExpected.toLowerCase())) return;

		const mPath = this.constructor._RE_IMG_PATH.exec(url.slice(this._urlPrefixExpected.length));
		if (!mPath) {
			this._addMessage(`Unknown "${this._imgRepoName}" URL pattern in file "${filePath}": "${url}"\n`);
			return;
		}

		const {source, type} = mPath.groups;
		if (fileState.sources.has(source)) return;

		this._addMessage(`Image source part "${source}" in "${this._imgRepoName}" ${type} URL did not match sources found in file "_meta" or "_test" in file "${filePath}": "${url}"\n`);
	}
}

export class BrewTesterFileContents extends BrewTesterBase {
	_LOG_TAG = "FILE_CONTENTS";

	constructor ({imgRepoName, urlPrefixExpected, pathErrorLog} = {}) {
		super();
		this._imgRepoName = imgRepoName;
		this._urlPrefixExpected = urlPrefixExpected;
		this._pathErrorLog = pathErrorLog || "test-data.error.log";
	}

	async _pRun () {
		if (!this._imgRepoName) throw new Error(`Image repo name was required!`);
		if (!this._urlPrefixExpected) throw new Error(`Expected URL prefix was required!`);

		Um.info(this._LOG_TAG, `Running checks for image repo "${this._imgRepoName}" with URL prefix "${this._urlPrefixExpected}"...`);

		const dataTesters = [
			new BraceCheck(),
			new EscapeCharacterCheck(),
			new _ImageUrlCheck({imgRepoName: this._imgRepoName, urlPrefixExpected: this._urlPrefixExpected}),
			new _CopySourceCheck(),
		];
		DataTester.register({dataTesters});

		await Uf.pRunOnDirs(
			async (dir) => {
				Um.info(this._LOG_TAG, `Checking dir "${dir}"...`);
				await DataTester.pRun(dir, dataTesters);
			},
			{
				isSerial: true,
			},
		);

		const outMessage = DataTester.getLogReport(dataTesters);
		if (!outMessage) {
			Um.info(this._LOG_TAG, `Complete.`);
			return;
		}

		fs.writeFileSync(this._pathErrorLog, outMessage, "utf-8");
		throw new Error(`Checks failed! See "${this._pathErrorLog}" and logs above.`);
	}
}
