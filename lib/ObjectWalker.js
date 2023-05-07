import MiscUtil from "./UtilMisc.js";

class ObjectWalker {
	static _runHandlers (
		{
			primitiveHandlers,
			to,
			obj,
			filePath,
			lastType,
			lastKey,
			isModify = false,
		},
	) {
		if (!primitiveHandlers[to]) {
			if (!isModify || (to !== "array" && to !== "object")) return obj;
			return MiscUtil.copyFast(obj);
		}

		if (!(primitiveHandlers[to] instanceof Array)) return primitiveHandlers[to](obj, {filePath, lastType, lastKey});

		return primitiveHandlers[to]
			.reduce((accum, ph) => {
				const accumMod = ph(accum, {filePath, lastType, lastKey});
				return isModify ? accumMod : accum;
			}, obj);
	}

	static walk (
		{
			obj,
			filePath,
			primitiveHandlers,
			lastType,
			lastKey,
			isModify = false,
		},
	) {
		const to = typeof obj;

		const [opts] = arguments;
		const nxtOpts = {...opts};

		if (obj === null) {
			const objMod = this._runHandlers({
				...nxtOpts,
				to: "null",
			});

			return isModify ? objMod : obj;
		}

		switch (to) {
			case "undefined":
			case "boolean":
			case "number":
			case "string": {
				const objMod = this._runHandlers({
					...nxtOpts,
					to,
				});

				return isModify ? objMod : obj;
			}

			case "object": {
				if (obj instanceof Array) {
					const objMod = this._runHandlers({
						...nxtOpts,
						to: "array",
					});

					return (isModify ? objMod : obj)
						.map(it => this.walk({obj: it, filePath, primitiveHandlers, lastType, lastKey, isModify}));
				}

				const objMod = this._runHandlers({
					...nxtOpts,
					to: "object",
				});

				Object.entries(isModify ? objMod : obj)
					.forEach(([k, v]) => {
						(isModify ? objMod : obj)[k] = this.walk({obj: v, filePath, primitiveHandlers, lastType, lastKey: k, isModify});
					});

				return isModify ? objMod : obj;
			}

			default: throw new Error(`Unhandled type "${to}"`);
		}
	}
}

export {ObjectWalker};
