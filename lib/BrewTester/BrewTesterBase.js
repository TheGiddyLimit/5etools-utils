import Um from "../UtilMisc.js";

/**
 * @abstract
 */
export class BrewTesterBase {
	_LOG_TAG;

	async pRun () {
		const tStart = Date.now();
		try {
			await this._pRun();
		} finally {
			const duration = Date.now() - tStart;
			Um.info(this._LOG_TAG, `Ran in ${(duration / 1000).toFixed(2)}s`);
		}
	}

	/**
	 * @abstract
	 */
	async _pRun () {
		throw new Error("Unimplemented!");
	}
}
