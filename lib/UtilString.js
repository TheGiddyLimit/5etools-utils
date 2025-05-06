export const escapeQuotes = str => {
	return str.replace(/&/g, `&amp;`).replace(/'/g, `&apos;`).replace(/"/g, `&quot;`).replace(/</g, `&lt;`).replace(/>/g, `&gt;`);
};
