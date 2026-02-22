import {BrewTesterJson} from "./BrewTester/BrewTesterJson.js";
import {BrewTesterFileLocations} from "./BrewTester/BrewTesterFileLocations.js";
import {BrewTesterFileNames} from "./BrewTester/BrewTesterFileNames.js";
import {BrewTesterFileProps} from "./BrewTester/BrewTesterFileProps.js";
import {BrewTesterEdition} from "./BrewTester/BrewTesterEdition.js";
import {BrewTesterFileContents} from "./BrewTester/BrewTesterFileContents.js";
import {BrewTesterImgDirectories} from "./BrewTester/BrewTesterImgDirectories.js";

export class BrewTester {
	static async pTestJson ({mode, filepath, dir}) { return (new BrewTesterJson({mode, filepath, dir})).pRun(); }
	static pTestFileLocations () { return (new BrewTesterFileLocations()).pRun(); }
	static pTestFileNames ({reNameFormat} = {}) { return (new BrewTesterFileNames({reNameFormat})).pRun(); }
	static pTestFileProps () { return (new BrewTesterFileProps()).pRun(); }
	static pTestFileContents ({imgRepoName, urlPrefixExpected, pathErrorLog}) { return (new BrewTesterFileContents({imgRepoName, urlPrefixExpected, pathErrorLog})).pRun(); }
	static pTestImgDirectories ({dirAllowlist, pathImgDir} = {}) { return (new BrewTesterImgDirectories({dirAllowlist, pathImgDir})).pRun(); }
	static pTestEditionSources () { return (new BrewTesterEdition()).pRun(); }
}
