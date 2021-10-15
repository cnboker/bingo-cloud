export default class EventDispatcher {
	constructor() {
		this.listeners = {};
	}

	subscribe(eventType, callback) {
		if (this.listeners[eventType] === undefined) {
			this.listeners[eventType] = [];
		}

		const obj = { callback };
		this.listeners[eventType].push(obj);
		return obj;
	}

	disSubscribe(eventType, listener) {
		if (this.listeners[eventType] === undefined) {
			return;
		}

		const index = this.listeners[eventType].indexOf(listener);
		if (index > -1) {
			this.listeners[eventType].splice(index, 1);
		}
	}

	dispatch(eventType, data) {
		if (this.listeners[eventType] === undefined) {
			return;
		}

		this.listeners[eventType].forEach(x => x.callback(data));
	}
}