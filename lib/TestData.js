import fs from "fs";
import {readJsonSync} from "./UtilFs.js";
import {ObjectWalker} from "./ObjectWalker.js";
import {UtilSource} from "./UtilSource.js";

/** Runs multiple handlers on each file, to avoid re-reading each file for each handler */
class _ParsedJsonChecker {
	static _FILE_HANDLERS = [];

	static _PRIMITIVE_HANDLERS = {};

	static registerFileHandler (fileHandler) {
		this._FILE_HANDLERS.push(fileHandler);
	}

	static addPrimitiveHandler (primitiveType, handler) {
		(this._PRIMITIVE_HANDLERS[primitiveType] = this._PRIMITIVE_HANDLERS[primitiveType] || [])
			.push(handler);
	}

	/* -------------------------------------------- */

	static async pRun (filePath, {fnIsIgnoredFile, fnIsIgnoredDirectory} = {}) {
		await this._pFileRecurse({
			filePath,
			fnIsIgnoredFile,
			fnIsIgnoredDirectory,
		});
	}

	static async _pFileRecurse ({filePath, fnIsIgnoredFile, fnIsIgnoredDirectory}) {
		if (fs.lstatSync(filePath).isDirectory()) {
			if (fnIsIgnoredDirectory && fnIsIgnoredDirectory(filePath)) return;

			for (const nxt of fs.readdirSync(filePath)) {
				await this._pFileRecurse({filePath: `${filePath}/${nxt}`, fnIsIgnoredFile, fnIsIgnoredDirectory});
			}
			return;
		}

		if (!filePath.endsWith(".json") || (fnIsIgnoredFile && fnIsIgnoredFile(filePath))) return;

		const contents = readJsonSync(filePath);

		ObjectWalker.walk({
			obj: contents,
			filePath,
			primitiveHandlers: this._PRIMITIVE_HANDLERS,
		});

		for (const dataTester of this._FILE_HANDLERS) {
			dataTester.handleFile(filePath, contents);
			await dataTester.pHandleFile(filePath, contents);
			dataTester.addMessageBoundary();
		}
	}
}

class DataTesterBase {
	_message = "";

	_addMessage (str) {
		this._message += str;
	}

	addMessageBoundary () {
		if (!this._message.trim()) return;
		if (this._message.slice(-5) === "\n---\n") return;
		this._message = this._message.trimEnd();
		this._message += `\n---\n`;
	}

	getMessage () { return this._message; }

	/* -------------------------------------------- */

	async pRun () { /* Implement as required */ }

	async pPostRun () { /* Implement as required */ }

	/* -------------------------------------------- */

	registerParsedFileCheckers (parsedJsonChecker) { /* Implement as required */ }

	registerParsedPrimitiveHandlers (parsedJsonChecker) { /* Implement as required */ }

	/* -------------------------------------------- */

	handleFile (filePath, contents) { /* Implement as required */ }

	async pHandleFile (filePath, contents) { /* Implement as required */ }
}

class BraceCheck extends DataTesterBase {
	registerParsedPrimitiveHandlers (parsedJsonChecker) {
		parsedJsonChecker.addPrimitiveHandler("string", this._checkString.bind(this));
	}

	_checkString (str, {filePath}) {
		let total = 0;
		for (let i = 0; i < str.length; ++i) {
			const c = str[i];
			switch (c) {
				case "{":
					++total;
					break;
				case "}":
					--total;
					break;
			}
		}
		if (total !== 0) {
			this._addMessage(`Mismatched braces in ${filePath}: "${str}"\n`);
		}
	}
}

class EscapeCharacterCheck extends DataTesterBase {
	static _CHARS = 16;

	_errors = [];

	registerParsedFileCheckers (parsedJsonChecker) {
		parsedJsonChecker.registerFileHandler(this);
	}

	_checkString (str) {
		let re = /([\n\t\r])/g;
		let m;
		while ((m = re.exec(str))) {
			const startIx = Math.max(m.index - this.constructor._CHARS, 0);
			const endIx = Math.min(m.index + this.constructor._CHARS, str.length);
			this._errors.push(`...${str.substring(startIx, endIx)}...`.replace(/[\n\t\r]/g, (...m) => m[0] === "\n" ? "***\\n***" : m[0] === "\t" ? "***\\t***" : "***\\r***"));
		}
	}

	handleFile (file, contents) {
		this._errors = [];
		ObjectWalker.walk({
			obj: contents,
			filePath: file,
			primitiveHandlers: {
				string: this._checkString.bind(this),
			},
		});
		if (this._errors.length) {
			this._addMessage(`Unwanted escape characters in ${file}! See below:\n`);
			this._addMessage(`\t${this._errors.join("\n\t")}\n`);
		}
	}
}

class DataTester {
	static register (
		{
			dataTesters,
		},
	) {
		dataTesters.forEach(dataTester => {
			dataTester.registerParsedPrimitiveHandlers(_ParsedJsonChecker);
			dataTester.registerParsedFileCheckers(_ParsedJsonChecker);
		});
	}

	static async pRun (
		filePath,
		dataTesters,
		{
			fnIsIgnoredFile,
			fnIsIgnoredDirectory,
		} = {},
	) {
		await _ParsedJsonChecker.pRun(filePath, {fnIsIgnoredFile, fnIsIgnoredDirectory});

		for (const dataTester of dataTesters) {
			await dataTester.pRun();
		}

		for (const dataTester of dataTesters) {
			await dataTester.pPostRun();
		}
	}

	static getLogReport (dataTesters) {
		let outMessage = "";
		for (const dataTester of dataTesters) {
			const pt = dataTester.getMessage();
			if (pt) outMessage += `Error messages for ${dataTester.constructor.name}:\n\n${pt}\n`;
			else console.log(`##### ${dataTester.constructor.name} passed! #####`);
		}

		if (outMessage) console.error(outMessage);

		return outMessage;
	}
}

class CopySourceCheck extends DataTesterBase {
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

class ImageUrlCheck extends DataTesterBase {
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

export {
	DataTester,
	DataTesterBase,
	BraceCheck,
	EscapeCharacterCheck,
	CopySourceCheck,
	ImageUrlCheck,
};
