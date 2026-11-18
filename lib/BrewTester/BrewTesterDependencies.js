import Um from "../UtilMisc.js";
import * as Uf from "../UtilFs.js";
import {UtilSource} from "../UtilSource.js";
import {BrewTesterBase} from "./BrewTesterBase.js";

class _BrewTesterDependencyCycles {
	_fileMetas = [];

	addFile ({filePath, json}) {
		const referenceMetas = [];

		["dependencies", "includes"]
			.forEach(metaProp => {
				Object.entries(json._meta?.[metaProp] || {})
					.forEach(([prop, sources]) => {
						sources
							.forEach(source => {
								referenceMetas.push({metaProp, prop, source});
							});
					});
			});

		Object.entries(json._meta?.otherSources || {})
			.forEach(([prop, sources]) => {
				Object.keys(sources)
					.forEach(source => referenceMetas.push({metaProp: "otherSources", prop, source}));
			});

		this._fileMetas.push({
			filePath,
			referenceMetas,
			sources: (json._meta?.sources || [])
				.map(source => source.json),
		});
	}

	/* -------------------------------------------- */

	_getDependencyCycles () {
		const sourceToFile = Object.fromEntries(
			this._fileMetas
				.flatMap(({filePath, sources}) => sources.map(source => [source, filePath])),
		);

		// Loading any property waits for the entire target file to finish merging
		const filePathToReferenceInfos = Object.fromEntries(
			this._fileMetas.map(({filePath, referenceMetas}) => [
				filePath,
				referenceMetas
					.filter(({source}) => !UtilSource.isSiteSource(source) && !!sourceToFile[source])
					.map(reference => ({
						filePath,
						reference,
						filePathToReference: sourceToFile[reference.source],
					})),
			]),
		);

		const cycles = [];
		const filePathsVisited = new Set();

		const doRecurse = ({filePath, ixsPath = {}, path = []}) => {
			ixsPath[filePath] = path.length;

			filePathToReferenceInfos[filePath]
				.forEach(linkedReferenceInfo => {
					if (ixsPath[linkedReferenceInfo.filePathToReference] != null) {
						cycles.push([...path.slice(ixsPath[linkedReferenceInfo.filePathToReference]), linkedReferenceInfo]);
						return;
					}

					if (filePathsVisited.has(linkedReferenceInfo.filePathToReference)) return;

					path.push(linkedReferenceInfo);
					doRecurse({filePath: linkedReferenceInfo.filePathToReference, ixsPath, path});
					path.pop();
				});

			delete ixsPath[filePath];
			filePathsVisited.add(filePath);
		};

		Object.keys(filePathToReferenceInfos)
			.forEach(filePath => {
				if (filePathsVisited.has(filePath)) return;

				doRecurse({filePath});
			});

		return cycles;
	}

	getErrors () {
		return this._getDependencyCycles()
			.map(cycle => {
				const ptCycle = cycle
					.map(({filePath, reference: {metaProp, prop, source}, filePathToReference}) => `\t\t"${filePath}" -- _meta.${metaProp}.${prop} ("${source}") --> "${filePathToReference}"`)
					.join("\n");
				return `\tCircular dependency!\n${ptCycle}`;
			});
	}
}

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

		// `"subclass"` -> `"class"` is an implicit dependency
		(json.subclass || [])
			.forEach(ent => {
				if (!ent.classSource || UtilSource.isSiteSource(ent.classSource)) return;
				if (srcsFile.has(ent.classSource)) return;
				if ((jsonDeps.class || []).includes(ent.classSource)) return;

				(depsMissing.class ||= new Set()).add(ent.classSource);
			});

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

		const resultsBase = [];
		const testerDependencyCycles = new _BrewTesterDependencyCycles();
		Uf.runOnDirs(dir => {
			Um.info(this._LOG_TAG, `Checking dir "${dir}"...`);

			Uf.listJsonFiles(dir)
				.forEach(filePath => {
					const json = Uf.readJsonSync(filePath);
					const resultBase = this.constructor._getFileError({filePath, json});
					if (resultBase) resultsBase.push(resultBase);
					testerDependencyCycles.addFile({filePath, json});
				});
		});

		const resultsCycles = testerDependencyCycles.getErrors();
		[...resultsBase, ...resultsCycles].forEach(result => Um.error(this._LOG_TAG, result));
		if (resultsBase.length || resultsCycles.length) {
			const ptsResult = [
				resultsBase.length ? `${resultsBase.length} file${resultsBase.length === 1 ? "" : "s"} with missing dependencies` : null,
				resultsCycles.length ? `${resultsCycles.length} dependency cycle${resultsCycles.length === 1 ? "" : "s"}` : null,
			]
				.filter(Boolean)
				.join("; ");
			throw new Error(`Dependency checks failed! ${ptsResult}. See above for more info.`);
		}

		Um.info(this._LOG_TAG, "Complete.");
	}
}
