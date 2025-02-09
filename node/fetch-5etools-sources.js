/*

===============
!!! WARNING !!!
===============

`fetch`-into-`eval` ahead!
Use with caution.

*/

import fs from "fs";
import path from "path";

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
	// eslint-disable-next-line no-eval
	eval(await (await fetch(`https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/refs/heads/main/js/parser.js`)).text());
	_TEMPLATE.$defs.sources = {
		"type": "string",
		"enum": Object.keys(Parser.SOURCE_JSON_TO_FULL),
	};
	fs.writeFileSync(
		path.join("schema-template", "sources-5etools.json"),
		JSON.stringify(_TEMPLATE, null, "\t"),
		"utf-8",
	);
}

main();
