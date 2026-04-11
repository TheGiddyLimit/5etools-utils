export default {
	meta: {
		name: "vet-jquery",
		version: "1.0.0",
	},

	rules: {
		"jquery": {
			meta: {
				type: "problem",
				docs: {
					description: "likely jQuery usage",
				},
				schema: [
					{
						type: "object",
						properties: {
							isFlagOnly: {
								type: "boolean",
							},
						},
						additionalProperties: false,
					},
				],
			},
			create (context) {
				const [{isFlagOnly = false} = {}] = context.options;

				let isAnyFound = false;
				return {
					"Identifier": node => {
						if (
							node.name === "jQuery"
							|| node.name.includes("$")
						) {
							if (isAnyFound && isFlagOnly) return;
							isAnyFound = true;

							context.report({
								node: node,
								message: `likely jQuery usage (${node.name})`,
							});
						}
					},
				};
			},
		},
	},
};
