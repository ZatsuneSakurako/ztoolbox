/**
 * @see https://stackoverflow.com/questions/27078285/simple-throttle-in-js/27078401#27078401
 * @param {function} callback
 * @param {number} limit
 * @return {(function(): void)|*}
 */
export function throttle(callback, limit) {
	let waiting = false;							// Initially, we're not waiting
	let reRequested = false;						// In case re-called during wait time
	return function () {							// We return a throttled function
		if (!waiting) {								// If we're not waiting
			callback.apply(this, arguments);		// Execute users function
			waiting = true;							// Prevent future invocations
			reRequested = false;					// Make sure to clear the boolean
			setTimeout(() => {				// After a period of time
				waiting = false;					// And allow future invocations
				if (reRequested) {					// Execute if re-called during wait time
					callback.apply(this, arguments);
				}
				reRequested = false;				// Clear the boolean
			}, limit);
		} else {
			reRequested = true;                     // Re-called during wait time
		}
	}
}