import * as fs from "fs";
import * as Uf from "./UtilFs.js";
import Um from "./UtilMisc.js";
import {getCleanJson} from "./UtilClean.js";
import MiscUtil from "./UtilMisc.js";

class _BrewFileCleaner {
	static _RUN_TIMESTAMP = Math.floor(Date.now() / 1000);
	static _MAX_TIMESTAMP = 9999999999;

	static cleanFile ({file, contents}) {
		// Ensure _meta is at the top of the file
		const tmp = {$schema: contents.$schema, _meta: contents._meta};
		delete contents.$schema;
		delete contents._meta;
		Object.assign(tmp, contents);
		contents = tmp;

		if (contents._meta.dateAdded == null) {
			Um.warn(`TIMESTAMPS`, `\tFile "${file}" did not have "dateAdded"! Adding one...`);
			contents._meta.dateAdded = this._RUN_TIMESTAMP;
		} else if (contents._meta.dateAdded > this._MAX_TIMESTAMP) {
			Um.warn(`TIMESTAMPS`, `\tFile "${file}" had a "dateAdded" in milliseconds! Converting to seconds...`);
			contents._meta.dateAdded = Math.round(contents._meta.dateAdded / 1000);
		}

		if (contents._meta.dateLastModified == null) {
			Um.warn(`TIMESTAMPS`, `\tFile "${file}" did not have "dateLastModified"! Adding one...`);
			contents._meta.dateLastModified = this._RUN_TIMESTAMP;
		} else if (contents._meta.dateLastModified > this._MAX_TIMESTAMP) {
			Um.warn(`TIMESTAMPS`, `\tFile "${file}" had a "dateLastModified" in milliseconds! Converting to seconds...`);
			contents._meta.dateLastModified = Math.round(contents._meta.dateLastModified / 1000);
		}

		(contents._meta.sources || []).forEach(source => {
			if (source.version != null) return;
			Um.warn(`VERSION`, `\tFile "${file}" source "${source.json}" did not have "version"! Adding one...`);
			source.version = "unknown";
		});

		return contents;
	}
}

class _BrewFileTester {
	static _RE_VALID_SOURCE_CHARS = /^[-a-zA-Z0-9 :&+!]+$/;

	static _ALL_SOURCES_JSON_LOWER = new Set();

	static _CONTENT_KEY_BLOCKLIST = new Set(["$schema", "_meta", "siteVersion"]);

	static _testFile_sources ({ALL_ERRORS, file, contents}) {
		const docSourcesJson = contents._meta.sources.map(src => src.json);
		const duplicateSourcesJson = docSourcesJson.filter(src => this._ALL_SOURCES_JSON_LOWER.has(src.toLowerCase()));
		if (duplicateSourcesJson.length) {
			ALL_ERRORS.push(`${file} :: "json" source${duplicateSourcesJson.length === 1 ? "" : "s"} exist in other documents; sources were: ${duplicateSourcesJson.map(src => `"${src}"`).join(", ")}`);
		}
		docSourcesJson.forEach(src => this._ALL_SOURCES_JSON_LOWER.add(src.toLowerCase()));

		const invalidSourceChars = docSourcesJson.filter(src => !this._RE_VALID_SOURCE_CHARS.test(src));
		if (invalidSourceChars.length) {
			ALL_ERRORS.push(`${file} :: "json" source${invalidSourceChars.length === 1 ? "" : "s"} contained invalid characters (must match ${this._RE_VALID_SOURCE_CHARS.toString()}): ${invalidSourceChars.map(src => `"${src}"`).join(", ")}`);
		}

		const docSourcesJsonSet = new Set(docSourcesJson);

		Object.keys(contents)
			.filter(k => !this._CONTENT_KEY_BLOCKLIST.has(k))
			.forEach(k => {
				const data = contents[k];

				if (!(data instanceof Array) || !data.forEach) throw new Error(`File "${k}" data was not an array!`);

				if (!data.length) throw new Error(`File "${k}" array is empty!`);

				data.forEach(it => {
					const source = it.source || (it.inherits ? it.inherits.source : null);
					if (!source) return ALL_ERRORS.push(`${file} :: ${k} :: "${it.name || it.id}" had no source!`);
					if (!docSourcesJsonSet.has(source)) return ALL_ERRORS.push(`${file} :: ${k} :: "${it.name || it.id}" source "${source}" was not in _meta`);
				});
			});
	}

	static _PROP_PUBLICATION_PAIRS = [
		{
			propContents: "adventure",
			propData: "adventureData",
		},
		{
			propContents: "book",
			propData: "bookData",
		},
	];

	static _testFile_publicationTuples ({ALL_ERRORS, file, contents}) {
		this._PROP_PUBLICATION_PAIRS
			.forEach(({propContents, propData}) => {
				const idsContents = new Set((contents[propContents] || []).map(it => it.id));
				const idsData = new Set((contents[propData] || []).map(it => it.id));

				if (MiscUtil.setEq(idsContents, idsData)) return;

				const lstContents = [...idsContents].sort((a, b) => a.localeCompare(b, {sensitivity: "base"}));
				const lstData = [...idsData].sort((a, b) => a.localeCompare(b, {sensitivity: "base"}));

				ALL_ERRORS.push(`${file} :: "${propContents}"/"${propData}" :: contents ID list "${lstContents.join(", ")}" did not equal data ID list "${lstData.join(", ")}"`);
			});
	}

	static testFile ({ALL_ERRORS, file, contents}) {
		this._testFile_sources({ALL_ERRORS, file, contents});
		this._testFile_publicationTuples({ALL_ERRORS, file, contents});
	}
}

export class BrewCleaner {
	static _IS_FAIL_SLOW = !!process.env.FAIL_SLOW;

	static _RE_INVALID_WINDOWS_CHARS = /[<>:"/\\|?*]/;

	static _cleanFolder (folder) {
		const ALL_ERRORS = [];

		const files = Uf.listJsonFiles(folder);
		for (const file of files) {
			let contents = Uf.readJsonSync(file);

			if (this._RE_INVALID_WINDOWS_CHARS.test(file.split("/").slice(1).join("/"))) {
				ALL_ERRORS.push(`${file} contained invalid characters!`);
				if (!this._IS_FAIL_SLOW) break;
			}

			if (!file.endsWith(".json")) {
				ALL_ERRORS.push(`${file} had invalid extension! Should be ".json" (case-sensitive).`);
				if (!this._IS_FAIL_SLOW) break;
			}

			contents = _BrewFileCleaner.cleanFile({file, contents});
			_BrewFileTester.testFile({ALL_ERRORS, file, contents});

			if (!this._IS_FAIL_SLOW && ALL_ERRORS.length) break;

			Um.info(`CLEANER`, `\t- "${file}"...`);
			contents = getCleanJson(contents);

			fs.writeFileSync(file, contents);
		}

		if (ALL_ERRORS.length) {
			ALL_ERRORS.forEach(e => console.error(e));
			throw new Error(`Errors were found. See above.`);
		}

		return files.length;
	}

	static run () {
		let totalFiles = 0;
		Uf.runOnDirs((dir) => {
			Um.info(`CLEANER`, `Cleaning dir "${dir}"...`);
			totalFiles += this._cleanFolder(dir);
		});

		Um.info(`CLEANER`, `Cleaning complete. Cleaned ${totalFiles} file${totalFiles === 1 ? "" : "s"}.`);
	}
}
