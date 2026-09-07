import {
	ESLINT_CONFIG_BASE,
	ESLINT_CONFIG_JEST,
	ESLINT_CONFIG_NODE,
	ESLINT_CONFIG_VETOOLS,
} from "./lib/eslint/eslint-config.js";

export default [
	...ESLINT_CONFIG_BASE,
	ESLINT_CONFIG_NODE,

	// TODO(Future) remove if/when `fetch-5etools-sources.js` is removed
	ESLINT_CONFIG_VETOOLS,

	{
		...ESLINT_CONFIG_JEST,
		files: ["test/**/*.js"],
	},
];
