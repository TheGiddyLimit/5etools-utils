const _CLEAN_JSON_REPLACEMENTS = {
	"—": "\\u2014",
	"–": "\\u2013",
	"−": "\\u2212",
	"“": `\\"`,
	"”": `\\"`,
	"’": "'",
	"…": "...",
	" ": "\\u00A0",
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
};
const _CLEAN_JSON_REPLACEMENT_REGEX = new RegExp(Object.keys(_CLEAN_JSON_REPLACEMENTS).join("|"), "g");

const getCleanJson = (obj) => {
	obj = `${JSON.stringify(obj, null, "\t")}\n`;
	obj = obj.replace(_CLEAN_JSON_REPLACEMENT_REGEX, (match) => _CLEAN_JSON_REPLACEMENTS[match]);
	return obj;
};

export {
	getCleanJson,
};
