import {isMainThread, parentPort} from "worker_threads";
import {JsonTester} from "./TestJson.js";

if (isMainThread) throw new Error(`Worker must not be started in main thread!`);

let jsonTester;
let isCancelled = false;

parentPort
	.on("message", msg => {
		switch (msg.type) {
			case "init": {
				const {dirSchema, tagLog, strFnGetSchemaId} = msg.payload;

				jsonTester = new JsonTester({
					dirSchema,
					tagLog,
					fnGetSchemaId: eval(strFnGetSchemaId), // eslint-disable-line no-eval
				});

				parentPort.postMessage({
					type: "ready",
					payload: {},
				});

				break;
			}

			case "cancel": {
				isCancelled = true;
				break;
			}

			case "work": {
				if (isCancelled) {
					parentPort.postMessage({
						type: "done",
						payload: {},
					});
					return;
				}

				const {errors = [], errorsFull = []} = jsonTester.getFileErrors({filePath: msg.payload.file});

				parentPort.postMessage({
					type: "done",
					payload: {
						isError: !!(errors.length || errorsFull.length),
						errors,
						errorsFull,
					},
				});

				break;
			}
		}
	});
