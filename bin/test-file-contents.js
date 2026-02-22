#!/usr/bin/env node

import {Command} from "commander";
import {BrewTester} from "../lib/BrewTester.js";

const program = new Command()
	.requiredOption("--img-repo-name <repo>", "Image repo short name for logs, e.g. \"homebrew-img\"")
	.requiredOption("--url-prefix-expected <prefix>", "Expected URL prefix to match against image URLs")
	.option("--path-error-log <path>", "Path to write full check output", "./_test/test-data.error.log")
;

program.parse(process.argv);
const opts = program.opts();

await BrewTester.pTestFileContents({
	imgRepoName: opts.imgRepoName,
	urlPrefixExpected: opts.urlPrefixExpected,
	pathErrorLog: opts.pathErrorLog,
});
