import fs from "fs";
import {ESLint} from "eslint";
import {pGetModifiedFiles} from "../UtilGit.js";

/**
 * @see https://eslint.org/docs/latest/integrate/nodejs-api
 */
export const pDoLintJsChanged = async ({additionalRoots = null} = {}) => {
	const fileList = (await pGetModifiedFiles({additionalRoots}))
		.filter(file => /\.(js|cjs|mjs)$/.test(file) && fs.existsSync(file));

	if (!fileList.length) {
		console.warn(`Nothing to lint!`);
		return true;
	}

	console.log(`Linting:\n${fileList.map(it => `\t${it}`).join("\n")}`);

	const eslint = new ESLint({
		fix: true,
	});

	const results = await eslint.lintFiles(fileList);

	await ESLint.outputFixes(results);

	const formatter = await eslint.loadFormatter("stylish");
	const resultText = formatter.format(results);

	if (resultText) console.log(resultText);

	return !results.some(res => res.errorCount);
};
