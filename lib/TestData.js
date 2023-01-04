import fs from "fs";
import {readJSON} from "./UtilFs.js";
import {ObjectWalker} from "./ObjectWalker.js";

/** Runs multiple handlers on each file, to avoid re-reading each file for each handler */
class _ParsedJsonChecker {
	static _CLAZZES_FILE_HANDLER = [];

	static _PRIMITIVE_HANDLERS = {};

	static registerFileHandler (Clazz) {
		_ParsedJsonChecker._CLAZZES_FILE_HANDLER.push(Clazz);
	}

	static addPrimitiveHandler (primitiveType, handler) {
		(this._PRIMITIVE_HANDLERS[primitiveType] = this._PRIMITIVE_HANDLERS[primitiveType] || [])
			.push(handler);
	}

	/* -------------------------------------------- */

	static run (filePath, {fnIsIgnoredFile, fnIsIgnoredDirector} = {}) {
		this._fileRecurse({
			filePath,
			fnIsIgnoredFile,
			fnIsIgnoredDirector,
		});
	}

	static _fileRecurse ({filePath, fnIsIgnoredFile, fnIsIgnoredDirector}) {
		if (fs.lstatSync(filePath).isDirectory()) {
			if (fnIsIgnoredDirector && fnIsIgnoredDirector(filePath)) return;

			return fs.readdirSync(filePath)
				.forEach(nxt => this._fileRecurse({filePath: `${filePath}/${nxt}`, fnIsIgnoredFile, fnIsIgnoredDirector}));
		}

		if (!filePath.endsWith(".json") || (fnIsIgnoredFile && fnIsIgnoredFile(filePath))) return;

		const contents = readJSON(filePath);

		ObjectWalker.walk({
			obj: contents,
			filePath,
			primitiveHandlers: this._PRIMITIVE_HANDLERS,
		});

		this._CLAZZES_FILE_HANDLER.forEach(dataTester => dataTester.handleFile(filePath, contents));
		this._CLAZZES_FILE_HANDLER.forEach(dataTester => dataTester.addMessageBoundary());
	}
}

class DataTesterBase {
	static _MESSAGE = "";

	static _addMessage (str) {
		this._MESSAGE += str;
	}

	static addMessageBoundary () {
		if (!this._MESSAGE.trim()) return;
		if (this._MESSAGE.slice(-5) === "\n---\n") return;
		this._MESSAGE = this._MESSAGE.trimEnd();
		this._MESSAGE += `\n---\n`;
	}

	static getMessage () { return this._MESSAGE; }

	/* -------------------------------------------- */

	static async pRun () { /* Implement as required */ }

	static async pPostRun () { /* Implement as required */ }

	/* -------------------------------------------- */

	static registerParsedFileCheckers (parsedJsonChecker) { /* Implement as required */ }

	static registerParsedPrimitiveHandlers (parsedJsonChecker) { /* Implement as required */ }

	/* -------------------------------------------- */

	static handleFile (filePath, contents) { /* Implement as required */ }
}

class BraceCheck extends DataTesterBase {
	static registerParsedPrimitiveHandlers (parsedJsonChecker) {
		parsedJsonChecker.addPrimitiveHandler("string", this._checkString.bind(this));
	}

	static _checkString (str, {filePath}) {
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

	static _errors = [];

	static registerParsedFileCheckers (parsedJsonChecker) {
		parsedJsonChecker.registerFileHandler(this);
	}

	static _checkString (str) {
		let re = /([\n\t\r])/g;
		let m;
		while ((m = re.exec(str))) {
			const startIx = Math.max(m.index - this._CHARS, 0);
			const endIx = Math.min(m.index + this._CHARS, str.length);
			this._errors.push(`...${str.substring(startIx, endIx)}...`.replace(/[\n\t\r]/g, (...m) => m[0] === "\n" ? "***\\n***" : m[0] === "\t" ? "***\\t***" : "***\\r***"));
		}
	}

	static handleFile (file, contents) {
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
			ClazzDataTesters,
		},
	) {
		ClazzDataTesters.forEach(ClazzDataTester => {
			ClazzDataTester.registerParsedPrimitiveHandlers(_ParsedJsonChecker);
			ClazzDataTester.registerParsedFileCheckers(_ParsedJsonChecker);
		});
	}

	static async pRun (
		filePath,
		ClazzDataTesters,
		{
			fnIsIgnoredFile,
			fnIsIgnoredDirector,
		} = {},
	) {
		_ParsedJsonChecker.run(filePath, {fnIsIgnoredFile, fnIsIgnoredDirector});

		for (const ClazzDataTester of ClazzDataTesters) {
			await ClazzDataTester.pRun();
		}

		for (const ClazzDataTester of ClazzDataTesters) {
			await ClazzDataTester.pPostRun();
		}
	}

	static getLogReport (ClazzDataTesters) {
		let outMessage = "";
		for (const ClazzDataTester of ClazzDataTesters) {
			const pt = ClazzDataTester.getMessage();
			if (pt) outMessage += `Error messages for ${ClazzDataTester.name}:\n\n${pt}\n`;
			else console.log(`##### ${ClazzDataTester.name} passed! #####`);
		}

		if (outMessage) console.error(outMessage);

		return outMessage;
	}
}

export {
	DataTester,
	DataTesterBase,
	BraceCheck,
	EscapeCharacterCheck,
};
