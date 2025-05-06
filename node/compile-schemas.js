import * as fs from "fs";
import * as path from "path";
import {listJsonFiles, readJsonSync} from "../lib/UtilFs.js";
import MiscUtil from "../lib/UtilMisc.js";
import {escapeQuotes} from "../lib/UtilString.js";

const DIR_IN = "./schema-template/";
const COMPILE_MODE = {
	SITE: "site",
	BREW: "brew",
	UA: "ua",
};

class SchemaPreprocessor {
	static preprocess ({schema, compileMode = null, isFast = false, dirSource}) {
		this._recurse({root: schema, obj: schema, compileMode, isFast, dirSource});
		return schema;
	}

	static _mutMergeObjects (a, b) {
		if (typeof a !== "object" || typeof b !== "object") return;
		if ((a instanceof Array && !(b instanceof Array)) || (!(a instanceof Array) && b instanceof Array)) return console.warn(`Could not merge:\n${JSON.stringify(a)}\n${JSON.stringify(b)}`);

		const bKeys = new Set(Object.keys(b));
		Object.keys(a).forEach(ak => {
			if (bKeys.has(ak)) {
				const av = a[ak];
				const bv = b[ak];

				const bType = typeof bv;

				switch (bType) {
					case "boolean":
					case "number":
					case "string": a[ak] = bv; break; // if we have a primitive, overwrite
					case "object": {
						if (bv instanceof Array) a[ak] = [...a[ak], ...bv]; // if we have an array, combine
						else this._mutMergeObjects(av, bv); // otherwise, go deeper
						break;
					}
					default: throw new Error(`Impossible!`);
				}

				bKeys.delete(ak); // mark key as merged
			}
		});
		// any properties in B that aren't in A simply get added to A
		bKeys.forEach(bk => a[bk] = b[bk]);
	}

	static _recurse ({root, obj, compileMode, isFast, dirSource}) {
		if (typeof obj !== "object" || obj == null) return obj;

		if (obj instanceof Array) {
			return obj
				.filter(d => {
					if (d?.$$if_item) return d.$$if_item.modes.includes(compileMode);

					return d?.$$ifBrew_item
						? compileMode === COMPILE_MODE.BREW
						: d?.$$ifSite_item
							? compileMode === COMPILE_MODE.SITE
							: d?.$$ifUa_item
								? compileMode === COMPILE_MODE.UA
								: true;
				})
				.map(d => {
					if (d?.$$if_item) return this._recurse({root, obj: d.$$if_item.value, compileMode, isFast, dirSource});
					if (d?.$$ifBrew_item) return this._recurse({root, obj: d.$$ifBrew_item, compileMode, isFast, dirSource});
					if (d?.$$ifSite_item) return this._recurse({root, obj: d.$$ifSite_item, compileMode, isFast, dirSource});
					if (d?.$$ifUa_item) return this._recurse({root, obj: d.$$ifUa_item, compileMode, isFast, dirSource});
					return this._recurse({root, obj: d, compileMode, isFast, dirSource});
				});
		}

		Object.entries(obj)
			.forEach(([k, v]) => {
				switch (k) {
					case "$$dbgger": {
						delete obj[k];
						// eslint-disable-next-line no-debugger
						debugger;
						return;
					}
					case "$$merge": return this._recurse_$$merge({root, obj, k, v, compileMode, isFast, dirSource});
					case "$$ifBrew": return this._recurse_$$ifBrew({root, obj, k, v, compileMode, isFast, dirSource});
					case "$$ifSite": return this._recurse_$$ifSite({root, obj, k, v, compileMode, isFast, dirSource});
					case "$$ifUa": return this._recurse_$$ifUa({root, obj, k, v, compileMode, isFast, dirSource});
					case "$$if": return this._recurse_$$if({root, obj, k, v, compileMode, isFast, dirSource});
					case "$$ifNotFast": return this._recurse_$$ifNotFast({root, obj, k, v, compileMode, isFast, dirSource});
					case "$$switch_key": return this._recurse_$$switch_key({root, obj, k, v, compileMode, isFast, dirSource});

					// Attempt to support VSCode's dubious "description as HTML" interpretation
					// See also:
					//   - the spec; https://json-schema.org/draft/2020-12/meta/meta-data
					//   - the docs; https://json-schema.org/understanding-json-schema/reference/annotations
					//   - Idea's version; https://www.jetbrains.com/help/idea/json.html#ws_json_show_doc_in_html
					//   - VSCode's docs; https://code.visualstudio.com/docs/languages/json#_use-rich-formatting-in-hovers
					case "description": {
						if (typeof v !== "string") return obj[k] = this._recurse({root, obj: v, compileMode, isFast, dirSource});

						obj[k] = v;
						obj["markdownDescription"] = escapeQuotes(
							// Strip code blocks, to avoid escaped HTML failing to render
							v.replace(/`/g, ""),
						);
						return;
					}

					default: return obj[k] = this._recurse({root, obj: v, compileMode, isFast, dirSource});
				}
			});

		return obj;
	}

	static _recurse_$$merge ({root, obj, k, v, compileMode, isFast, dirSource}) {
		const merged = {};
		v.forEach(toMerge => {
			// resolve references
			toMerge = this._getResolvedRefJson({root, toMerge, dirSource});
			// handle any mergeable children
			toMerge = this._recurse({root, obj: toMerge, compileMode, isFast, dirSource});
			// merge
			this._mutMergeObjects(merged, toMerge);
		});

		if (merged.type && ["anyOf", "allOf", "oneOf"].some(prop => merged[prop])) {
			throw new Error(`Merged schema had both "type" and a combining/compositing property!`);
		}

		delete obj[k];
		this._mutMergeObjects(obj, merged);
	}

	static _recurse_$$ifBrew ({root, obj, k, v, compileMode, isFast, dirSource}) {
		if (compileMode !== COMPILE_MODE.BREW) return void delete obj[k];
		this._recurse_$$ifBase({root, obj, k, v, compileMode, isFast, dirSource});
	}

	static _recurse_$$ifSite ({root, obj, k, v, compileMode, isFast, dirSource}) {
		if (compileMode !== COMPILE_MODE.SITE) return void delete obj[k];
		this._recurse_$$ifBase({root, obj, k, v, compileMode, isFast, dirSource});
	}

	static _recurse_$$ifUa ({root, obj, k, v, compileMode, isFast, dirSource}) {
		if (compileMode !== COMPILE_MODE.UA) return void delete obj[k];
		this._recurse_$$ifBase({root, obj, k, v, compileMode, isFast, dirSource});
	}

	static _recurse_$$if ({root, obj, k, v, compileMode, isFast, dirSource}) {
		if (!v.modes.includes(compileMode)) return void delete obj[k];
		this._recurse_$$ifBase({root, obj, k, v: v.value, compileMode, isFast, dirSource});
	}

	static _recurse_$$ifNotFast ({root, obj, k, v, compileMode, isFast, dirSource}) {
		if (isFast) return void delete obj[k];
		this._recurse_$$ifBase({root, obj, k, v, compileMode, isFast, dirSource});
	}

	static _recurse_$$ifBase ({root, obj, k, v, compileMode, isFast, dirSource}) {
		const keysCond = Object.keys(v);

		keysCond
			.forEach(kCond => {
				if (obj[kCond] === undefined) {
					obj[kCond] = v[kCond];
					return;
				}

				// TODO(Future) this could be made to merge objects together; implement as required
				// this._mutMergeObjects(obj[kCond], vCond);
				throw new Error(`Not supported!`);
			});

		delete obj[k];

		keysCond
			.forEach(kCond => {
				this._recurse({root, obj: obj[kCond], compileMode, isFast, dirSource});
			});
	}

	static _recurse_$$switch_key ({root, obj, k, v, compileMode, isFast, dirSource}) {
		const key = v[`key_${compileMode}`];
		obj[k] = {[key]: v.value};
		return this._recurse_$$ifBase({root, obj, k, v: obj[k], compileMode, isFast, dirSource});
	}

	static _getDirectoryTranslation ({file}) {
		return file.startsWith("../") ? "../" : null;
	}

	static _getResolvedRefJson ({root, toMerge, dirSource}) {
		if (!toMerge.$ref) return toMerge;

		const [file, defPath] = toMerge.$ref.split("#");
		const pathParts = defPath.split("/").filter(Boolean);

		if (!file) {
			const refData = MiscUtil.get(root, ...pathParts);
			if (!refData) throw new Error(`Could not find referenced data for "${defPath}" in local file!`);
			return this._getResolvedRefJson({root, toMerge: MiscUtil.copyFast(refData), dirSource});
		}

		const externalSchema = readJsonSync(path.join(dirSource, file));
		const refData = MiscUtil.copyFast(MiscUtil.get(externalSchema, ...pathParts), {safe: true});

		const directoryTranslation = this._getDirectoryTranslation({file});

		// Convert any `#/ ...` definitions to refer to the original file, as the schema will be copied into our file
		// Similarly, add any path changes (`../`), as the schema will be copied into our file
		const refDataWalked = this._walkRefs(
			refData,
			{
				file,
				directoryTranslation,
			},
		);

		if (!refDataWalked) throw new Error(`Could not find referenced data for path "${defPath}" in file "${file}"!`);
		return this._getResolvedRefJson({root, toMerge: refDataWalked, dirSource});
	}

	static _walkRefs (obj, state, meta) {
		meta = meta || {};

		if (obj == null) return obj;

		const to = typeof obj;
		if (to === "string") {
			if (meta.lastKey !== "$ref") return obj;

			const [otherFile, otherPath] = obj.split("#");
			if (otherFile) {
				if (state.directoryTranslation && state.directoryTranslation !== this._getDirectoryTranslation({file: otherFile})) {
					return [`${state.directoryTranslation}${otherFile}`, otherPath].filter(Boolean).join("#");
				}
				return obj;
			}
			// `file` already includes our directory translations, so we do not need to add it
			return [state.file, otherPath].filter(Boolean).join("#");
		}

		if (to !== "object") return obj;

		if (obj instanceof Array) return obj.map(it => this._walkRefs(it, state, meta));

		const out = {};
		for (const k of Object.keys(obj)) {
			meta.lastKey = k;
			out[k] = this._walkRefs(obj[k], state, meta);
		}
		return out;
	}
}

class SchemaCompiler {
	static run () {
		console.log("Compiling schema...");

		const filesTemplate = listJsonFiles("./schema-template");

		filesTemplate
			.forEach(filePath => {
				filePath = path.normalize(filePath);
				const filePathPartRelative = path.relative(DIR_IN, filePath);

				for (const compileMode of Object.values(COMPILE_MODE)) {
					for (const isFast of [false, true]) {
						const dirOut = path.normalize(path.join("schema", `${compileMode}${isFast ? "-fast" : ""}`));

						const filePathOut = path.join(dirOut, filePathPartRelative);
						const dirPathOut = path.dirname(filePathOut);
						fs.mkdirSync(dirPathOut, {recursive: true});

						const compiled = SchemaPreprocessor.preprocess({
							schema: readJsonSync(filePath),
							compileMode,
							isFast,
							dirSource: path.dirname(filePath),
						});
						fs.writeFileSync(filePathOut, JSON.stringify(compiled, null, "\t"), "utf-8");
					}
				}
			});

		console.log(`Schema compiled and output to "schema/"`);
	}
}

SchemaCompiler.run();
