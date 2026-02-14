/*

===============
!!! WARNING !!!
===============

`fetch`-into-`eval` ahead!
Use with caution.

*/

import path from "path";
import {writeJsonSync} from "../lib/UtilFs.js";

const _TEMPLATE = {
	"$schema": "https://json-schema.org/draft/2020-12/schema",
	"$id": "sources-5etools.json",
	"title": "5etools Sources",
	"description": "A dump of 5etools sources. See `node/fetch-5etools-sources.js`.",
	"version": "0.0.0", // Explicitly "not a meaningful version number," as we do not intend to track this properly
	"$defs": {
		"sources": {},
	},
};

async function main () {
	// :^)
	/* eslint-disable no-eval */
	eval(await (await fetch(`https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/refs/heads/main/js/parser.js`)).text());
	eval(await (await fetch(`https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/refs/heads/main/js/utils.js`)).text());
	/* eslint-enable no-eval */

	const sources = Object.keys(Parser.SOURCE_JSON_TO_FULL);
	_TEMPLATE.$defs.sources = {
		"type": "string",
		"enum": sources,
	};
	_TEMPLATE.$defs.sourcesLegacy = {
		"type": "string",
		"enum": sources.filter(src => SourceUtil.isLegacySourceWotc(src)),
	};
	_TEMPLATE.$defs.sourcesClassic = {
		"type": "string",
		"enum": sources.filter(src => SourceUtil.isClassicSource(src)),
	};
	_TEMPLATE.$defs.sourcesModern = {
		"type": "string",
		"enum": sources.filter(src => !SourceUtil.isClassicSource(src)),
	};

	writeJsonSync(path.join("schema-template", "sources-5etools.json"), _TEMPLATE, {isClean: true});
}

main();
