import {BrewTesterImgFileExtensions} from "./BrewTesterImg/BrewTesterImgFileExtensions.js";
import {BrewTesterImgFileSizes} from "./BrewTesterImg/BrewTesterImgFileSizes.js";
import {BrewTesterImgSourceNames} from "./BrewTesterImg/BrewTesterImgSourceNames.js";

export class BrewTesterImg {
	static pTestFileExtensions ({allowedExtensions} = {}) { return (new BrewTesterImgFileExtensions({allowedExtensions})).pRun(); }
	static pTestFileSizes ({dirsSource, maxSizeBytes} = {}) { return (new BrewTesterImgFileSizes({dirsSource, maxSizeBytes})).pRun(); }
	static pTestSourceNames ({dirsSource, isPrerelease} = {}) { return (new BrewTesterImgSourceNames({dirsSource, isPrerelease})).pRun(); }
}
