class Deferred {
	constructor () {
		this._resolve = null;
		this._reject = null;
		this._promise = new Promise((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}

	get resolve () { return this._resolve; }
	get reject () { return this._reject; }
	get promise () { return this._promise; }
}

class WorkerList {
	/**
	 * @param {Array} workers
	 */
	constructor ({workers = null} = {}) {
		this._workers = workers || [];
		this._deferredQueue = [];
	}

	add (worker) {
		this._workers.push(worker);

		while (this._deferredQueue.length && this._workers.length) {
			const d = this._deferredQueue.shift();
			d.resolve(this._workers.shift());
		}
	}

	get () {
		if (this._workers.length) {
			return Promise.resolve(this._workers.shift());
		}

		const d = new Deferred();
		this._deferredQueue.push(d);
		return d.promise;
	}

	get cntAvailableWorkers () { return this._workers.length; }
}

export {Deferred, WorkerList};
