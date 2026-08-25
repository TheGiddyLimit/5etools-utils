import Um from "../UtilMisc.js";
import * as Uf from "../UtilFs.js";
import {UtilSource} from "../UtilSource.js";
import {BrewTesterBase} from "./BrewTesterBase.js";

export class BrewTesterDependencies extends BrewTesterBase {
	_LOG_TAG = "DEPENDENCY";

	static _PROPS_CLASS = new Set([
		"class",
		"classFeature",
		"classFluff",
		"subclass",
		"subclassFeature",
		"subclassFluff",
	]);

	static _PROPS_CLASS__NAME = new Set([
		"class",
		"classFluff",
	]);

	static _CLASS_IDS_OFFICIAL = new Set([
		"artificer",
		"barbarian",
		"bard",
		"cleric",
		"druid",
		"fighter",
		"monk",
		"mystic",
		"paladin",
		"ranger",
		"rogue",
		"sidekick",
		"sorcerer",
		"warlock",
		"wizard",
	]);

	static _getEntityDependency ({prop, ent}) {
		if (!this._PROPS_CLASS.has(prop)) return ent._copy.source;

		if (!UtilSource.isSiteSource(ent._copy.source)) return ent._copy.source;

		const classId = (this._PROPS_CLASS__NAME.has(prop) ? ent._copy.name : ent._copy.className).toLowerCase().trim();
		if (this._CLASS_IDS_OFFICIAL.has(classId)) return classId;

		return ent._copy.source;
	}

	static _getDependenciesMissing ({json}) {
		const jsonDeps = json._meta?.dependencies || {};
		const srcsFile = new Set((json._meta?.sources || []).map(source => source.json));

		const depsMissing = {};

		Object.entries(json)
			.forEach(([prop, arr]) => {
				if (!(arr instanceof Array)) return;

				arr.forEach(ent => {
					if (!ent._copy) return;
					if (srcsFile.has(ent._copy.source)) return;

					const dep = this._getEntityDependency({prop, ent});
					if ((jsonDeps[prop] || []).includes(dep)) return;

					(depsMissing[prop] ||= new Set()).add(dep);
				});
			});

		return depsMissing;
	}

	static _getFileError ({filePath, json}) {
		const errorPt = Object.entries(this._getDependenciesMissing({json}))
			.flatMap(([prop, depsSet]) => [
				`\t\t"${prop}"`,
				...[...depsSet]
					.sort((a, b) => a.localeCompare(b, {sensitivity: "base"}))
					.map(dependency => `\t\t\t"${dependency}"`),
			])
			.join("\n");
		if (!errorPt) return null;

		return `\t"${filePath}" had missing dependencies!\n${errorPt}`;
	}

	async _pRun () {
		Um.info(this._LOG_TAG, "Checking dependencies...");

		const results = [];
		Uf.runOnDirs(dir => {
			Um.info(this._LOG_TAG, `Checking dir "${dir}"...`);

			Uf.listJsonFiles(dir)
				.forEach(filePath => {
					const result = this.constructor._getFileError({filePath, json: Uf.readJsonSync(filePath)});
					if (result) results.push(result);
				});
		});

		if (results.length) {
			results.forEach(result => Um.error(this._LOG_TAG, result));
			throw new Error(`${results.length} file${results.length === 1 ? " had" : "s had"} missing dependencies! See above for more info.`);
		}

		Um.info(this._LOG_TAG, "Complete.");
	}
}
