const _CLEAN_JSON_REPLACEMENTS = {
	"—": "\\u2014",
	"–": "\\u2013",
	"‑": "\\u2011",
	"−": "\\u2212",
	" ": "\\u00A0",

	"’": "'",
	"‘": "'",
	"": "'",
	"…": "...",
	"\u200B": "", // zero-width space
	"\u2002": " ", // em space
	"ﬀ": "ff",
	"ﬃ": "ffi",
	"ﬄ": "ffl",
	"ﬁ": "fi",
	"ﬂ": "fl",
	"Ĳ": "IJ",
	"ĳ": "ij",
	"Ǉ": "LJ",
	"ǈ": "Lj",
	"ǉ": "lj",
	"Ǌ": "NJ",
	"ǋ": "Nj",
	"ǌ": "nj",
	"ﬅ": "ft",
	"“": `\\"`,
	"”": `\\"`,
	"\u201a": ",",
};
const _CLEAN_JSON_REPLACEMENT_REGEX = new RegExp(Object.keys(_CLEAN_JSON_REPLACEMENTS).join("|"), "g");

const getCleanJson = obj => {
	return getCleanString(`${JSON.stringify(obj, null, "\t")}\n`);
};

const getCleanString = str => {
	return str.replace(_CLEAN_JSON_REPLACEMENT_REGEX, (match) => _CLEAN_JSON_REPLACEMENTS[match]);
};

export {
	getCleanJson,
	getCleanString,
};
