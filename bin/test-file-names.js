#!/usr/bin/env node

import {BrewTester} from "../lib/BrewTester.js";
import {Command} from "commander";

const program = new Command()
	.option("--name-regex <regex>", "Regex pattern used to validate file names")
;

program.parse(process.argv);
const opts = program.opts();

await BrewTester.pTestFileNames({
	reNameFormat: opts.nameRegex ? new RegExp(opts.nameRegex) : null,
});
