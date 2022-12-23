import * as fs from "fs";
import * as Uf from "./UtilFs.js";
import Um from "./UtilMisc.js";

class _BrewIndex {
	static _FILE_PATH;
	static _DISPLAY_NAME;

	_index = {};

	doWrite () {
		Um.info(`INDEX`, `Saving ${this.constructor._DISPLAY_NAME} index to ${this.constructor._FILE_PATH}`);
		fs.writeFileSync(`./${this.constructor._FILE_PATH}`, JSON.stringify(this._index), "utf-8");
	}

	/** @abstract */
	addToIndex (fileInfo) { throw new Error("Unimplemented!"); }
}

class _BrewIndexTimestamps extends _BrewIndex {
	static _FILE_PATH = "_generated/index-timestamps.json";
	static _DISPLAY_NAME = "timestamp";

	addToIndex (fileInfo) {
		this._index[fileInfo.cleanName] = {
			a: fileInfo.contents._meta.dateAdded,
			m: fileInfo.contents._meta.dateLastModified,
		};
	}
}

class _BrewIndexProps extends _BrewIndex {
	static _FILE_PATH = "_generated/index-props.json";
	static _DISPLAY_NAME = "prop";

	addToIndex (fileInfo) {
		Object.keys(fileInfo.contents)
			.filter(it => !it.startsWith("_") && it !== "$schema")
			.forEach(k => {
				(this._index[k] = this._index[k] || {})[fileInfo.cleanName] = fileInfo.folder;
			});

		Object.keys(fileInfo.contents._meta.includes || {})
			.forEach(k => {
				(this._index[k] = this._index[k] || {})[fileInfo.cleanName] = fileInfo.folder;
			});
	}
}

class _BrewIndexSources extends _BrewIndex {
	static _FILE_PATH = "_generated/index-sources.json";
	static _DISPLAY_NAME = "source";

	addToIndex (fileInfo) {
		(fileInfo.contents._meta.sources || [])
			.forEach(src => {
				if (this._index[src.json]) throw new Error(`${fileInfo.name} source "${src.json}" was already in ${this._index[src.json]}`);
				this._index[src.json] = fileInfo.cleanName;
			});
	}
}

class _BrewIndexMeta extends _BrewIndex {
	static _FILE_PATH = "_generated/index-meta.json";
	static _DISPLAY_NAME = "meta";

	addToIndex (fileInfo) {
		if (!fileInfo.contents._meta.sources?.length) return;

		const fileName = fileInfo.name.split("/").slice(1).join("/");

		if (this._index[fileName]) throw new Error(`Filename "${fileName}" was already in the index!`);
		this._index[fileName] = {
			// name
			n: fileInfo.contents._meta.sources.map(it => it.full).filter(Boolean),
			// abbreviation
			a: fileInfo.contents._meta.sources.map(it => it.abbreviation).filter(Boolean),
			// status
			s: fileInfo.contents._meta.status,
		};
	}
}

class BrewIndexGenerator {
	static _DIR_TO_PRIMARY_PROP = {
		"creature": [
			"monster",
		],
		"book": [
			"book",
			"bookData",
		],
		"adventure": [
			"adventure",
			"adventureData",
		],
		"makebrew": [
			"makebrewCreatureTrait",
		],
	};

	static _checkFileContents () {
		Um.info(`PROP_CHECK`, `Checking file contents...`);
		const results = [];
		Uf.runOnDirs((dir) => {
			if (dir === "collection") return;

			Um.info(`PROP_CHECK`, `Checking dir "${dir}"...`);
			const dirFiles = fs.readdirSync(dir, "utf8")
				.filter(file => file.endsWith(".json"));

			dirFiles.forEach(file => {
				const json = JSON.parse(fs.readFileSync(`${dir}/${file}`, "utf-8"));
				const props = this._DIR_TO_PRIMARY_PROP[dir] || [dir];
				props.forEach(prop => {
					if (!json[prop]) results.push(`${dir}/${file} was missing a "${prop}" property!`);
				});
			});
		});

		if (results.length) {
			results.forEach(r => Um.error(`PROP_CHECK`, r));
			throw new Error(`${results.length} file${results.length === 1 ? " was missing a primary prop!" : "s were missing primary props!"} See above for more info.`);
		}

		Um.info(`PROP_CHECK`, `Complete.`);
	}

	static _buildDeepIndex () {
		const indexes = [
			new _BrewIndexTimestamps(),
			new _BrewIndexProps(),
			new _BrewIndexSources(),
			new _BrewIndexMeta(),
		];

		Um.info(`INDEX`, `Indexing...`);

		Uf.runOnDirs((folder) => {
			Um.info(`INDEX`, `Indexing dir "${folder}"...`);

			Uf.listJsonFiles(folder)
				.map(file => ({
					folder,
					name: file,
					cleanName: file.replace(/#/g, "%23"),
					contents: Uf.readJSON(file),
				}))
				.forEach(fileInfo => {
					if (!fileInfo.contents._meta) {
						throw new Error(`File "${fileInfo.name}" did not have metadata!`);
					}

					if (fileInfo.contents._meta.unlisted) return;

					indexes.forEach(index => index.addToIndex(fileInfo));
				});
		});

		fs.mkdirSync("_generated", {recursive: true});

		indexes.forEach(index => index.doWrite());
	}

	static run () {
		this._checkFileContents();
		this._buildDeepIndex();
		Um.info(`INDEX`, `Complete.`);
		return null;
	}
}

export {BrewIndexGenerator};
