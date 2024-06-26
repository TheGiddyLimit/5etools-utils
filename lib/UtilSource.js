import url from "url";
import path from "path";
import {readJsonSync} from "./UtilFs.js";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export class UtilSource {
	static _SOURCES = null;

	static isSiteSource (source) {
		this._SOURCES ||= new Set(
			readJsonSync(
				path.join(__dirname, "..", "schema", "site", "sources-5etools.json"),
			).$defs.sources.enum.map(it => it.toLowerCase()),
		);

		return this._SOURCES.has(source?.toLowerCase());
	}
}
