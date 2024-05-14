export class UrlUtil {
	/**
	 * @param str
	 * @param {?Array<string>} protocols
	 * @return {*|boolean}
	 */
	static isUrl (str, {protocols = null} = {}) {
		let url;

		try {
			url = new URL(str);
		} catch (e) {
			return false;
		}

		if (protocols == null) return true;
		return protocols.includes(url.protocol);
	}
}
