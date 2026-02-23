import fs from "node:fs";
import {BrewTesterBase} from "./BrewTesterBase.js";
import {DataTester, BraceCheck, EscapeCharacterCheck, ImageUrlCheck, CopySourceCheck} from "../TestData.js";
import * as Uf from "../UtilFs.js";
import Um from "../UtilMisc.js";

export class BrewTesterFileContents extends BrewTesterBase {
	_LOG_TAG = "FILE_CONTENTS";

	constructor ({imgRepoName, urlPrefixExpected, pathErrorLog} = {}) {
		super();
		this._imgRepoName = imgRepoName;
		this._urlPrefixExpected = urlPrefixExpected;
		this._pathErrorLog = pathErrorLog || "test-data.error.log";
	}

	async _pRun () {
		if (!this._imgRepoName) throw new Error(`Image repo name was required!`);
		if (!this._urlPrefixExpected) throw new Error(`Expected URL prefix was required!`);

		Um.info(this._LOG_TAG, `Running checks for image repo "${this._imgRepoName}" with URL prefix "${this._urlPrefixExpected}"...`);

		const dataTesters = [
			new BraceCheck(),
			new EscapeCharacterCheck(),
			new ImageUrlCheck({imgRepoName: this._imgRepoName, urlPrefixExpected: this._urlPrefixExpected}),
			new CopySourceCheck(),
		];
		DataTester.register({dataTesters});

		await Uf.pRunOnDirs(
			async (dir) => {
				Um.info(this._LOG_TAG, `Checking dir "${dir}"...`);
				await DataTester.pRun(dir, dataTesters);
			},
			{
				isSerial: true,
			},
		);

		const outMessage = DataTester.getLogReport(dataTesters);
		if (!outMessage) {
			Um.info(this._LOG_TAG, `Complete.`);
			return;
		}

		fs.writeFileSync(this._pathErrorLog, outMessage, "utf-8");
		throw new Error(`Checks failed! See "${this._pathErrorLog}" and logs above.`);
	}
}
