/**
 *
 * @param {any | Error | string} error
 * @returns {string}
 */
export function errorToString(error) {
    if (error && typeof error === 'object' && error.stack !== undefined) {
        return error.stack;
    } else {
        if (error && typeof error === 'object') {
            try {
                error = JSON.stringify(error);
            } catch (e) {}
        }
        return ((new Error(error)).stack ?? '');
    }
}
