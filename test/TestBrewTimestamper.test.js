import {BrewTimestamper} from "../lib/BrewTimestamper.js";

test(
	"Test hash calculation",
	async () => {
		const hash = await BrewTimestamper._pGetHash({
			a: 1,
			b: "2",
			c: [],
			d: {},
		});
		expect(hash).toBe("743c345609");
	},
);
