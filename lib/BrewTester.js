import {BrewTesterJson} from "./BrewTester/BrewTesterJson.js";
import {BrewTesterFileLocations} from "./BrewTester/BrewTesterFileLocations.js";
import {BrewTesterFileNames} from "./BrewTester/BrewTesterFileNames.js";
import {BrewTesterFileProps} from "./BrewTester/BrewTesterFileProps.js";

export class BrewTester {
	static async pTestJson ({mode, filepath, dir}) { return (new BrewTesterJson({mode, filepath, dir})).pRun(); }
	static pTestFileLocations () { return (new BrewTesterFileLocations()).pRun(); }
	static pTestFileNames () { return (new BrewTesterFileNames()).pRun(); }
	static pTestFileProps () { return (new BrewTesterFileProps()).pRun(); }
}
