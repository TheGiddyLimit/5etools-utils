#!/usr/bin/env node

import {Command} from "commander";
import {ESLint} from "eslint";

const program = new Command()
	.name("vet-eslint")
	.argument("[files...]", "Files or directories to lint")
	.option("--fix", "Automatically fix problems")
;

program.parse(process.argv);

const opts = program.opts();
const eslint = new ESLint({fix: opts.fix});
const results = await eslint.lintFiles(program.args.length ? program.args : ["."]);

if (opts.fix) await ESLint.outputFixes(results);

const formatter = await eslint.loadFormatter("stylish");
const resultText = formatter.format(results);
if (resultText) console.log(resultText);

const cntErrors = results.reduce((cnt, result) => cnt + result.errorCount, 0);

if (cntErrors) process.exitCode = 1;
