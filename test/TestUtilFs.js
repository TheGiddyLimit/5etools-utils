import {listJsonFiles} from "../lib/UtilFs.js";

// TODO an actual test framework

const results = listJsonFiles("./test/data/json", {dirBlacklist: new Set(["./test/data/json/block"])})
if (results.length !== 2) throw new Error();
