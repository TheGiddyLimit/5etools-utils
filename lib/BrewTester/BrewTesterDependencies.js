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

class _BrewTesterDependencyAccuracy {
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

	static _getDependenciesMissing_getDependenciesImplicit ({json}) {
		const out = [
			...(json.subclass || []).map(ent => ({prop: "class", source: ent.classSource})),
			...(json.subrace || []).map(ent => ({prop: "race", source: ent.raceSource})),
			...(json.monster || []).map(ent => ({prop: "legendaryGroup", source: ent.legendaryGroup?.source})),
		];

		["item", "baseitem", "itemGroup", "magicvariant"]
			.forEach(prop => {
				const ents = prop === "magicvariant"
					? (json[prop] || []).flatMap(ent => [ent, ent.inherits].filter(Boolean))
					: (json[prop] || []);

				ents.forEach(ent => {
					[
						// TODO(Future) requires site fix
						// {prop: "itemType", uids: [ent.type, ent.typeAlt]},
						// {prop: "itemProperty", uids: [...(ent.property || []), ...(ent.propertyAdd || [])]},
						// {prop: "itemMastery", uids: ent.mastery || []},
					]
						.forEach(({prop, uids}) => {
							uids.filter(Boolean)
								.forEach(uid => {
									const [, source] = (uid.uid || uid).split("|").map(it => it.trim());
									out.push({prop, source});
								});
						});
				});
			});

		return out;
	}

	static _getDependenciesMissing ({json}) {
		const jsonDeps = json._meta?.dependencies || {};
		const srcsFile = (json._meta?.sources || [])
			.map(source => source.json)
			.filter(Boolean)
			.reduce(
				(accum, src) => {
					accum[src] = src;
					accum[src.toLowerCase()] = src;
					return accum;
				},
				{},
			);

		const depsMissing = {};

		// Check implicit dependencies
		this._getDependenciesMissing_getDependenciesImplicit({json})
			.forEach(({prop, source}) => {
				if (!source || UtilSource.isSiteSource(source)) return;

				const sourceUid = source.toLowerCase();
				if (srcsFile[sourceUid]) return;
				if ((jsonDeps[prop] || []).some(sourceDependencies => sourceDependencies.toLowerCase() === sourceUid)) return;
				if ((json._meta?.includes?.[prop] || []).some(sourceIncludes => sourceIncludes.toLowerCase() === sourceUid)) return;

				(depsMissing[prop] ||= new Set()).add(source);
			});

		// Check explicit dependencies
		Object.entries(json)
			.forEach(([prop, arr]) => {
				if (!(arr instanceof Array)) return;

				arr.forEach(ent => {
					if (!ent._copy) return;
					if (srcsFile[ent._copy.source]) return;

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

	/* -------------------------------------------- */

	_errors = [];

	addFile ({filePath, json}) {
		const error = this.constructor._getFileError({filePath, json});
		if (error) this._errors.push(error);
	}

	getErrors () { return this._errors; }
}

export class BrewTesterDependencies extends BrewTesterBase {
	_LOG_TAG = "DEPENDENCY";

	async _pRun () {
		Um.info(this._LOG_TAG, "Checking dependencies...");

		const testerDependencyAccuracy = new _BrewTesterDependencyAccuracy();
		const testerDependencyCycles = new _BrewTesterDependencyCycles();
		Uf.runOnDirs(dir => {
			Um.info(this._LOG_TAG, `Checking dir "${dir}"...`);

			Uf.listJsonFiles(dir)
				.forEach(filePath => {
					const json = Uf.readJsonSync(filePath);
					testerDependencyAccuracy.addFile({filePath, json});
					testerDependencyCycles.addFile({filePath, json});
				});
		});

		const resultsAccuracy = testerDependencyAccuracy.getErrors();
		const resultsCycles = testerDependencyCycles.getErrors();
		[...resultsAccuracy, ...resultsCycles].forEach(result => Um.error(this._LOG_TAG, result));
		if (resultsAccuracy.length || resultsCycles.length) {
			const ptsResult = [
				resultsAccuracy.length ? `${resultsAccuracy.length} file${resultsAccuracy.length === 1 ? "" : "s"} with missing dependencies` : null,
				resultsCycles.length ? `${resultsCycles.length} dependency cycle${resultsCycles.length === 1 ? "" : "s"}` : null,
			]
				.filter(Boolean)
				.join("; ");
			throw new Error(`Dependency checks failed! ${ptsResult}. See above for more info.`);
		}

		Um.info(this._LOG_TAG, "Complete.");
	}
}
