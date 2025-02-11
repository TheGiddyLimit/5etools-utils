#!/usr/bin/env node

import {BrewTester} from "../lib/BrewTester.js";
import {Command} from "commander";

const program = new Command()
	.argument("[file]", "File to test")
	.option("--dir <dir>", "Directory to test")
;

program.parse(process.argv);
const opts = program.opts();

await BrewTester.pTestJson({
	mode: "ua",
	filepath: program.args[0],
	dir: opts.dir,
});
