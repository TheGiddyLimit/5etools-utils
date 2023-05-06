class ObjectWalker {
	static _runHandlers (
		{
			primitiveHandlers,
			to,
			obj,
			filePath,
			lastType,
			lastKey,
		},
	) {
		if (!primitiveHandlers[to]) return obj;

		if (!(primitiveHandlers[to] instanceof Array)) return primitiveHandlers[to](obj, {filePath, lastType, lastKey});

		return primitiveHandlers[to]
			.reduce((accum, ph) => ph(accum, {filePath, lastType, lastKey}), obj);
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

			if (isModify) return objMod;
			return obj;
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
