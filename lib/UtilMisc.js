class MiscUtil {
	/* -------------------------------------------- */

	// region Logging
	static _taggedConsole (fn, tag, ...args) {
		const expandedTag = tag.padStart(12, " ");
		fn(`[${expandedTag}]`, ...args);
	}

	static warn (tag, ...args) { this._taggedConsole(console.warn, tag, ...args); }
	static info (tag, ...args) { this._taggedConsole(console.info, tag, ...args); }
	static error (tag, ...args) { this._taggedConsole(console.error, tag, ...args); }
	// endregion

	/* -------------------------------------------- */

	static get (object, ...path) {
		if (object == null) return null;
		for (let i = 0; i < path.length; ++i) {
			object = object[path[i]];
			if (object == null) return object;
		}
		return object;
	}

	/* -------------------------------------------- */

	static copyFast (obj) {
		if ((typeof obj !== "object") || obj == null) return obj;

		if (obj instanceof Array) return obj.map(MiscUtil.copyFast);

		const cpy = {};
		for (const k of Object.keys(obj)) cpy[k] = MiscUtil.copyFast(obj[k]);
		return cpy;
	}

	/* -------------------------------------------- */
}

export default MiscUtil;
