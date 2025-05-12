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
		// Use the most recent source in the `_meta`, as we assume this is the most relevant/interesting
		const datePublished = (fileInfo.contents._meta.sources || [])
			.map(src => src.dateReleased)
			.filter(Boolean)
			.map(str => new Date(str))
			.sort((a, b) => b.getTime() - a.getTime())
			.find(Boolean);

		this._index[fileInfo.cleanName] = {
			a: fileInfo.contents._meta.dateAdded,
			m: fileInfo.contents._meta.dateLastModified,
			p: datePublished ? (datePublished.getTime() / 1000) : undefined,
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

	static _EDITION_ORDER = ["classic", "one"];

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
			s: fileInfo.contents._meta.status
				// Skip adding "ready", as this is the implicit value
				? fileInfo.contents._meta.status === "ready" ? undefined : fileInfo.contents._meta.status
				: undefined,
			// partnered
			// TODO(Future) index at a per-source level? Make e.g. `index-sources-2.json` with `json` -> { object }` and migrate
			p: fileInfo.contents._meta.sources.some(it => it.partnered) ? 1 : undefined,
			// edition
			e: this.constructor._EDITION_ORDER.indexOf(fileInfo.contents._meta.edition),
		};
	}
}

class _BrewIndexAdventureBookIds extends _BrewIndex {
	static _FILE_PATH = "_generated/index-adventure-book-ids.json";
	static _DISPLAY_NAME = "ids";

	addToIndex (fileInfo) {
		["adventure", "book"]
			.forEach(prop => {
				(fileInfo.contents[prop] || [])
					.forEach(({name, source, id}) => {
						if (!name || !source || !id) return;
						// Lowercase the key, as we expect this to come from a hash
						this._index[id.toLowerCase()] = {name, source, id};
					});
			});
	}
}

class BrewIndexGenerator {
	static _buildDeepIndex () {
		const indexes = [
			new _BrewIndexTimestamps(),
			new _BrewIndexProps(),
			new _BrewIndexSources(),
			new _BrewIndexMeta(),
			new _BrewIndexAdventureBookIds(),
		];

		Um.info(`INDEX`, `Indexing...`);

		Uf.runOnDirs((folder) => {
			Um.info(`INDEX`, `Indexing dir "${folder}"...`);

			Uf.listJsonFiles(folder)
				.map(file => ({
					folder,
					name: file,
					cleanName: file.replace(/#/g, "%23"),
					contents: Uf.readJsonSync(file),
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
		this._buildDeepIndex();
		Um.info(`INDEX`, `Complete.`);
		return null;
	}
}

export {BrewIndexGenerator};
