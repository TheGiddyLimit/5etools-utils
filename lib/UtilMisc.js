export default class MiscUtil {
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

	/** Delete a prop from a nested object, then all now-empty objects backwards from that point. */
	static deleteObjectPath (object, ...path) {
		const stack = [object];

		if (object == null) return object;
		for (let i = 0; i < path.length - 1; ++i) {
			object = object[path[i]];
			stack.push(object);
			if (object === undefined) return object;
		}
		const out = delete object[path.at(-1)];

		for (let i = path.length - 1; i > 0; --i) {
			if (!Object.keys(stack[i]).length) delete stack[i - 1][path[i - 1]];
		}

		return out;
	}

	/* -------------------------------------------- */

	static setEq (a, b) {
		if (a.size !== b.size) return false;
		for (const it of a) if (!b.has(it)) return false;
		return true;
	}
}
