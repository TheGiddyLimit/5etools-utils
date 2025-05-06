import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import NP from "number-precision";

export class UtilAjv {
	static _RE_DATE = /^\d\d\d\d-\d\d-\d\d$/;

	static getValidator () {
		// region Set up validator
		const ajv = new Ajv2020({
			allowUnionTypes: true,
		});
		addFormats(ajv);

		ajv.addKeyword({
			keyword: "version",
			validate: false,
		});

		ajv.addKeyword({
			keyword: "markdownDescription",
			validate: false,
		});

		ajv.addFormat(
			"date",
			{
				validate: str => this._RE_DATE.test(str),
			},
		);
		// endregion

		// region Patch AJV `"multipleOf"`
		// See: https://github.com/ajv-validator/ajv/issues/652#issuecomment-944202626
		ajv.removeKeyword("multipleOf");

		ajv.addKeyword({
			keyword: "multipleOf",
			type: "number",
			compile (schema) {
				return (data) => Number.isInteger(NP.divide(data, schema));
			},
			errors: false,
			metaSchema: {
				type: "number",
			},
		});
		// endregion

		return ajv;
	}
}
