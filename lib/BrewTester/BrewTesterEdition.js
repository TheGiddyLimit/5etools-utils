import fs from "fs";
import Um from "../UtilMisc.js";
import {BrewTesterBase} from "./BrewTesterBase.js";
import * as Uf from "../UtilFs.js";
import {readJsonSync} from "../UtilFs.js";
import url from "url";
import pathlib from "path";
import {ObjectWalker} from "../ObjectWalker.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export class BrewTesterEdition extends BrewTesterBase {
	_LOG_TAG = "EDITION";

	static _EDITION_CLASSIC = "classic";
	static _EDITION_ONE = "one";

	// TODO(Future) this is non-exhaustive; we do not check e.g. `item.attachedSpells`
	//   Generalize an "entity -> used UIDs" system to use both here and in other tests
	static _getSourcesUsed ({filePath, json}) {
		return [
			...new Set([
				...this._getSourcesUsedMeta({json, prop: "dependencies"}),
				...this._getSourcesUsedMeta({json, prop: "includes"}),

				...Object.entries(json)
					.flatMap(([prop, arr]) => {
						if (!(arr instanceof Array)) return [];
						return arr
							.flatMap(ent => [
								...this._getSourcesUsedEntityDirect({ent}),
								...this._getSourcesUsedEntityText({filePath, ent}),
							]);
					}),
			]),
		];
	}

	static _getSourcesUsedMeta ({json, prop}) {
		if (!json._meta[prop]) return [];
		return Object.values(json._meta[prop])
			.flat();
	}

	static _getSourcesUsedEntityDirect ({ent}) {
		return [
			ent.source,
			ent.inherits?.source,
			ent._copy?.source,
			...(ent._copy?._templates?.map(it => it.source) || []),
			...(ent.otherSources?.map(it => it.source) || []),
			...(ent.referenceSources || []),
		]
			.filter(Boolean);
	}

	static _RE_NAIVE_TAG = /{@[^ ]+ [^|]+\|(?<source>[^|}]+)/g;

	static _getSourcesUsedEntityText ({filePath, ent}) {
		const out = [];
		ObjectWalker.walk({
			obj: ent,
			filePath,
			primitiveHandlers: str => {
				// TODO(Future) use more accurate source finding, e.g. that provided by `Renderer.utils.getTagMeta`
				str.replace(this._RE_NAIVE_TAG, (...m) => {
					const {source} = m.at(-1);
					out.push(source);
					return m[0];
				});
			},
		});
		return out;
	}

	/* -------------------------------------------- */

	static _getSpellClassSourceErrors ({filePath, json, sourceToEdition}) {
		const edition = json._meta?.edition || this._EDITION_CLASSIC;

		return (json.spell || [])
			.flatMap(spell => {
				return [
					...(spell.classes?.fromClassList || [])
						.map(classMeta => ({prop: "fromClassList", classMeta})),
					...(spell.classes?.fromClassListVariant || [])
						.map(classMeta => ({prop: "fromClassListVariant", classMeta})),
					...(spell.classes?.fromSubclass || [])
						.map(({class: classMeta}) => ({prop: "fromSubclass", classMeta})),
				]
					.map(({prop, classMeta}) => {
						const editionClass = sourceToEdition[classMeta.source.toLowerCase()];
						if (!editionClass) return null;
						if (editionClass === edition) return null;

						return `${filePath} spell "${spell.name}" (${spell.source}) from edition "${edition}" had ${prop} "${classMeta.name}" (${classMeta.source}) from edition "${editionClass}"!`;
					})
					.filter(Boolean);
			});
	}

	/* -------------------------------------------- */

	async _pRun () {
		Um.info(this._LOG_TAG, `Checking sources used...`);

		const schemaSources = readJsonSync(pathlib.join(__dirname, "..", "..", "schema", "site", "sources-5etools.json"));
		const modernSources = Object.fromEntries(
			schemaSources.$defs.sourcesModern.enum
				.map(src => [src.toLowerCase(), src]),
		);
		const sourceToEdition = Object.fromEntries([
			...schemaSources.$defs.sourcesClassic.enum
				.map(src => [src.toLowerCase(), this.constructor._EDITION_CLASSIC]),
			...schemaSources.$defs.sourcesModern.enum
				.map(src => [src.toLowerCase(), this.constructor._EDITION_ONE]),
		]);

		const results = [];
		Uf.runOnDirs((dir) => {
			Um.info(this._LOG_TAG, `Checking dir "${dir}"...`);
			const dirFiles = fs.readdirSync(dir, "utf8")
				.filter(file => file.endsWith(".json"));

			dirFiles.forEach(file => {
				const filePath = `${dir}/${file}`;

				const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));

				results.push(...this.constructor._getSpellClassSourceErrors({filePath, json, sourceToEdition}));

				if (json._meta?.edition !== this.constructor._EDITION_CLASSIC) return;

				const sourcesUsedModern = this.constructor._getSourcesUsed({filePath, json})
					.map(src => modernSources[src.toLowerCase()])
					.filter(Boolean);
				if (!sourcesUsedModern.length) return;

				results.push(`${dir}/${file} used ${sourcesUsedModern.length === 1 ? "a " : ""}modern source${sourcesUsedModern.length === 1 ? "" : "s"} but was marked as "edition": ${this.constructor._EDITION_CLASSIC}"! Source${sourcesUsedModern.length === 1 ? " was" : "s were"} ${sourcesUsedModern.map(src => `"${src}"`).join(", ")}`);
			});
		});

		if (results.length) {
			results.forEach(r => Um.error(this._LOG_TAG, r));
			throw new Error(`${results.length} source edition error${results.length === 1 ? "" : "s"}! See above for more info.`);
		}

		Um.info(this._LOG_TAG, `Complete.`);
	}
}
