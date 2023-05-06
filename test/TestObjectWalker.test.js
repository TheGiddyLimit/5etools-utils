import {ObjectWalker} from "../lib/ObjectWalker.js";

test(
	"Test object walker",
	() => {
		const obj = {
			a: 1,
			b: [2, 3],
			c: {
				d: 4,
			},
			e: [
				[null, undefined, 5, 6],
				{
					f: 7,
					g: 8,
				},
			],
		};

		const handlers = {
			[null]: () => undefined,
			[undefined]: () => null,
			boolean: bool => !bool,
			number: num => num + num,
			string: str => str + str,
			array: arr => [...arr, -1],
			object: obj => ({...obj, h: -2}),
		};

		const walked1 = ObjectWalker.walk({obj, primitiveHandlers: {}});
		expect(walked1).toBe(obj);

		const walked2 = ObjectWalker.walk({obj, primitiveHandlers: handlers});
		expect(walked2).toBe(obj);

		const walked3 = ObjectWalker.walk({obj, primitiveHandlers: {}, isModify: true});
		expect(walked3).toBe(obj);

		const walked4 = ObjectWalker.walk({obj, primitiveHandlers: handlers, isModify: true});
		expect(walked4).not.toBe(obj);
		expect(walked4).toEqual({
			a: 2,
			b: [4, 6, -2],
			c: {
				d: 8,
				h: -4,
			},
			e: [
				[undefined, null, 10, 12, -2],
				{
					f: 14,
					g: 16,
					h: -4,
				},
				-2,
			],
			h: -4,
		});
	},
);
