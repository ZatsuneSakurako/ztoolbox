/**
 * @see https://stackoverflow.com/questions/27078285/simple-throttle-in-js/27078401#27078401
 * @param {function} callback
 * @param {number} limit
 * @return {(function(): void)|*}
 */
export function throttle(callback, limit) {
	var waiting = false;                      // Initially, we're not waiting
	return function () {                      // We return a throttled function
		if (!waiting) {                       // If we're not waiting
			callback.apply(this, arguments);  // Execute users function
			waiting = true;                   // Prevent future invocations
			setTimeout(function () {   // After a period of time
				waiting = false;              // And allow future invocations
			}, limit);
		}
	}
}