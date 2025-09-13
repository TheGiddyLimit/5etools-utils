import fs from "fs";
import {readJsonSync} from "./UtilFs.js";
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

	static run (filePath, {fnIsIgnoredFile, fnIsIgnoredDirectory} = {}) {
		this._fileRecurse({
			filePath,
			fnIsIgnoredFile,
			fnIsIgnoredDirectory,
		});
	}

	static _fileRecurse ({filePath, fnIsIgnoredFile, fnIsIgnoredDirectory}) {
		if (fs.lstatSync(filePath).isDirectory()) {
			if (fnIsIgnoredDirectory && fnIsIgnoredDirectory(filePath)) return;

			return fs.readdirSync(filePath)
				.forEach(nxt => this._fileRecurse({filePath: `${filePath}/${nxt}`, fnIsIgnoredFile, fnIsIgnoredDirectory}));
		}

		if (!filePath.endsWith(".json") || (fnIsIgnoredFile && fnIsIgnoredFile(filePath))) return;

		const contents = readJsonSync(filePath);

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
		_ParsedJsonChecker.run(filePath, {fnIsIgnoredFile, fnIsIgnoredDirectory});

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

export {
	DataTester,
	DataTesterBase,
	BraceCheck,
	EscapeCharacterCheck,
};
