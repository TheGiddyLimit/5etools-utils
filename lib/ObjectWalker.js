import MiscUtil from "./UtilMisc.js";

export const SymObjectWalkerBreak = Symbol("walkerBreak");

export class ObjectWalker {
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
				if (accumMod === SymObjectWalkerBreak) return SymObjectWalkerBreak;
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

			if (objMod === SymObjectWalkerBreak) return SymObjectWalkerBreak;

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

				if (objMod === SymObjectWalkerBreak) return SymObjectWalkerBreak;

				return isModify ? objMod : obj;
			}

			case "object": {
				if (obj instanceof Array) {
					this._runHandlers({...nxtOpts, to: "preArray"});
					const objMod = this._runHandlers({...nxtOpts, to: "array"});

					if (objMod === SymObjectWalkerBreak) {
						this._runHandlers({...nxtOpts, to: "postArray"});
						return SymObjectWalkerBreak;
					}

					const out = [];
					for (const it of isModify ? objMod : obj) {
						const outSub = this.walk({obj: it, filePath, primitiveHandlers, lastType, lastKey, isModify});

						if (outSub === SymObjectWalkerBreak) {
							this._runHandlers({...nxtOpts, to: "postArray"});
							return SymObjectWalkerBreak;
						}

						out.push(outSub);
					}

					this._runHandlers({...nxtOpts, to: "postArray"});

					return out;
				}

				this._runHandlers({...nxtOpts, to: "preObject"});
				const objMod = this._runHandlers({...nxtOpts, to: "object"});

				if (objMod === SymObjectWalkerBreak) {
					this._runHandlers({...nxtOpts, to: "postObject"});
					return SymObjectWalkerBreak;
				}

				for (const [k, v] of Object.entries(isModify ? objMod : obj)) {
					const outSub = this.walk({obj: v, filePath, primitiveHandlers, lastType, lastKey: k, isModify});

					if (outSub === SymObjectWalkerBreak) {
						this._runHandlers({...nxtOpts, to: "postObject"});
						return SymObjectWalkerBreak;
					}

					(isModify ? objMod : obj)[k] = outSub;
				}

				const out = isModify ? objMod : obj;
				this._runHandlers({...nxtOpts, to: "postObject"});
				return out;
			}

			default: throw new Error(`Unhandled type "${to}"`);
		}
	}
}
