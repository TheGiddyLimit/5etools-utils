#!/usr/bin/env node

import {Command} from "commander";
import {pDoLintJsChanged} from "../lib/Lint/LintJsChanged.js";

const program = new Command()
	.option("--additional-root <path...>", "Additional git root to scan for changed files")
;

program.parse(process.argv);
const opts = program.opts();

const isSuccess = await pDoLintJsChanged({
	additionalRoots: opts.additionalRoot?.length ? opts.additionalRoot : null,
});

if (!isSuccess) process.exit(1);
