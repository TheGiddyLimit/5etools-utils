import js from "@eslint/js";
import globals from "globals";
import pluginVetJquery from "./eslint-plugin-jquery.js";
import {ESLINT_RULES_BASE} from "./eslint-config-rules.js";
import {ESLINT_GLOBALS_FOUNDRY, ESLINT_GLOBALS_VETOOLS} from "./eslint-globals.js";

const _FILES_JS = ["**/*.js", "**/*.cjs", "**/*.mjs"];

export const ESLINT_CONFIG_BASE = [
	js.configs.recommended,
	{
		files: _FILES_JS,
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
		},
		rules: ESLINT_RULES_BASE,
	},
];

export const ESLINT_CONFIG_BROWSER = {
	files: _FILES_JS,
	plugins: {
		"vet-jquery": pluginVetJquery,
	},
	languageOptions: {
		globals: globals.browser,
	},
	rules: {
		"vet-jquery/jquery": "error",
	},
};

export const ESLINT_CONFIG_NODE = {
	files: _FILES_JS,
	languageOptions: {
		globals: globals.node,
	},
};

export const ESLINT_CONFIG_JEST = {
	files: _FILES_JS,
	languageOptions: {
		globals: globals.jest,
	},
};

export const ESLINT_CONFIG_VETOOLS = {
	files: _FILES_JS,
	languageOptions: {
		globals: ESLINT_GLOBALS_VETOOLS,
	},
};

export const ESLINT_CONFIG_FOUNDRY = {
	files: _FILES_JS,
	languageOptions: {
		globals: ESLINT_GLOBALS_FOUNDRY,
	},
};

export const ESLINT_CONFIG_NO_CONSOLE = {
	files: _FILES_JS,
	rules: {
		"no-console": "error",
	},
};
