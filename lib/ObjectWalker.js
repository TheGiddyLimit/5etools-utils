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
		if (!primitiveHandlers[to]) return;

		primitiveHandlers[to] instanceof Array
			? primitiveHandlers[to].forEach(ph => ph(obj, {filePath, lastType, lastKey}))
			: primitiveHandlers[to](obj, {filePath, lastType, lastKey});
	}

	static walk (
		{
			obj,
			filePath,
			primitiveHandlers,
			lastType,
			lastKey,
		},
	) {
		const to = typeof obj;

		const [opts] = arguments;
		const nxtOpts = {...opts};

		if (obj === null) {
			this._runHandlers({
				...nxtOpts,
				to: "null",
			});

			return obj;
		}

		switch (to) {
			case undefined:
			case "boolean":
			case "number":
			case "string": {
				this._runHandlers({
					...nxtOpts,
					to,
				});

				return obj;
			}

			case "object": {
				if (obj instanceof Array) {
					this._runHandlers({
						...nxtOpts,
						to: "array",
					});

					return obj.map(it => this.walk({obj: it, filePath, primitiveHandlers, lastType, lastKey}));
				}

				this._runHandlers({
					...nxtOpts,
					to: "object",
				});

				Object.keys(obj)
					.forEach(k => {
						obj[k] = this.walk({obj: obj[k], filePath, primitiveHandlers, lastType, lastKey: k});
					});

				return obj;
			}

			default: throw new Error(`Unhandled type "${to}"`);
		}
	}
}

export {ObjectWalker};
