import * as fs from "fs";
import * as path from "path";

function isDirectory (path) {
	return fs.lstatSync(path).isDirectory();
}

function readJSON (path, {isIncludeRaw = false} = {}) {
	try {
		if (fs.existsSync(path)) {
			let str = fs.readFileSync(path, "utf8");
			// Strip BOM(s)
			while (str.charCodeAt(0) === 0xFEFF) str = str.slice(1);
			const out = JSON.parse(str);
			if (isIncludeRaw) return {raw: str, json: out};
			return out;
		} else {
			const parts = path.split(/[\\/]+/g);
			const dir = parts.slice(0, -1).join("/");
			const originalName = parts[parts.length - 1];
			const filenames = fs.readdirSync(dir, "utf8");
			const filename = filenames.find(it => it.toLowerCase() === originalName.toLowerCase());
			if (!filename) throw new Error(`Could not find file "${path}"`);
			return readJSON(`${dir}/${filename}`, {isIncludeRaw});
		}
	} catch (e) {
		e.message += ` (Path: ${path})`;
		throw e;
	}
}

/**
 * @param dir
 * @param [opts]
 * @param [opts.dirBlocklist]
 * @param [state]
 */
function listJsonFiles (dir, opts, state) {
	const {dirBlocklist = null} = opts || {};
	state = state || {};
	state.dirBlocklist = state.dirBlocklist
		|| (dirBlocklist ? new Set([...dirBlocklist].map(it => path.normalize(it))) : new Set());

	const dirContent = fs.readdirSync(dir, "utf8")
		.map(file => dir === "." ? file : `${dir}/${file}`);
	return dirContent.reduce((acc, file) => {
		if (isDirectory(file)) {
			if (!state.dirBlocklist.has(path.normalize(file))) acc.push(...listJsonFiles(file, opts, state));
		} else {
			if (file.toLowerCase().endsWith(".json")) acc.push(file);
		}
		return acc;
	}, []);
}

function _runOnDirs_getDirs () {
	return fs.readdirSync(".", "utf8")
		.filter(dir => isDirectory(dir) && !dir.startsWith(".") && !dir.startsWith("_") && dir !== "node_modules");
}

function runOnDirs (fn) {
	_runOnDirs_getDirs()
		.forEach(dir => fn(dir));
}

async function pRunOnDirs (pFn, {isSerial = false} = {}) {
	const dirs = _runOnDirs_getDirs();

	if (isSerial) {
		for (const dir of dirs) await pFn(dir);
		return;
	}

	await Promise.allSettled(dirs.map(dir => pFn(dir)));
}

function mkDirs (pathToCreate) {
	pathToCreate
		.split(/[\\/]/g)
		.reduce((currentPath, folder) => {
			currentPath += `${folder}/`;
			if (!fs.existsSync(currentPath)) {
				fs.mkdirSync(currentPath);
			}
			return currentPath;
		}, "");
}

export {
	readJSON,
	listJsonFiles,
	runOnDirs,
	pRunOnDirs,
	mkDirs,
};
