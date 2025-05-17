import {
    _userScriptsStateStoreKey,
    _userScriptsStoreKey
} from "../constants.js";
import {contentStyles} from "./contentStyles.js";
import {sendNotification} from "../classes/chrome-notification.js";

/**
 *
 * @param {any} message
 * @param {chrome.runtime.MessageSender} sender
 * @param {(response?: any) => void} sendResponse
 */
function onUserScriptMessage(message, sender, sendResponse) {
    if (sender.id !== chrome.runtime.id) {
        sendResponse(null);
        return;
    }
    if (typeof message !== 'object' || !message) {
        sendResponse({
            error: true,
            data: 'DATA_SHOULD_BE_AN_OBJECT',
        });
        return;
    }

    const success = (data) => {
        sendResponse({error: false, data});
    };
    const error = (error) => {
        sendResponse({error: true, data: error});
    };
    try {
        switch (message.type) {
            case 'download':
                const [url, filename, saveAs] = message.data;
                if (!url) {
                    error('MISSING URL');
                    return;
                }
                chrome.downloads.download({
                    url,
                    filename,
                    saveAs: saveAs !== undefined ? !!saveAs : true,
                })
                    .then(function (downloadId) {
                        console.log('Download started. ID: ' + downloadId);
                    })
                    .catch((err) => {
                        console.error(err);
                        error(err);
                    });
                break;
            case 'notification':
                const [text, title, image] = message.data;
                sendNotification({
                    'id': 'updateNotification',
                    "title": title ?? message.context.fileName,
                    "message": text ?? 'Aucun texte',
                    "iconUrl": image,
                }, {
                    onClickAutoClose: false,
                    onButtonClickAutoClose: false
                })
                    .then(id => success(id))
                    .catch((err) => {
                        console.error(err);
                        error(err);
                    });
                break;
            case 'log':
            case 'debug':
            case 'dir':
            case 'info':
            case 'warn':
            case 'error':
                console[message.type](`[UserScript] ${message.type} from ${message.context.fileName} :`, ...message.data);
                success(true);
                break;
            default:
                sendResponse({
                    error: true,
                    data: 'NOT_FOUND',
                });
        }
    } catch (e) {
        console.error(e);
        error((e ?? new Error('UNKNOWN_ERROR')).toString());
    }
}

function userScriptApiLoader(context) {
    chrome.runtime.sendMessage({ type: 'user_script_executed', userScriptsId: context.fileName }).catch(console.error);
    const call = async function userScriptApiCall() {
        const [callName, ...args] = arguments;
        const result = await chrome.runtime.sendMessage({
            type: callName,
            context: context,
            data: args,
        });
        if (!result) return result;
        if (typeof result !== 'object') {
            console.error(result);
            throw new Error('RESULT_SHOULD_BE_AN_OBJECT');
        }
        if (result.error) throw new Error(result.error);
        return result.data;
    }

    /**
     *
     * @type {Dict<((eventName: string) => void)[]>}
     */
    const listeners = {};
    chrome.runtime.onMessage.addListener((request, sender) => {
        if (sender.id !== chrome.runtime.id || request.type !== 'userScriptEvent') return;
        if (!(request.eventName in listeners) || request.target !== context.fileName) return;

        for (const listener of listeners[request.eventName]) {
            if (typeof listener !== 'function') continue;
            if (listener.data === undefined) {
                listener();
                continue;
            }
            const arrData = Array.isArray(listener.data) ? listener.data : [listener.data];
            listener(...(arrData ?? []));
        }
    });

    /**
     *
     * @type {ProxyHandler}
     */
    const readOnlyProxy = {
        set(target, property) {
            throw new Error(`Cannot modify property ${property} of the target object (READ_ONLY)`);
        },
        defineProperty(target, property) {
            throw new Error(`Cannot define property ${property} of the target object (READ_ONLY)`);
        },
        deleteProperty: (target, property) => {
            throw new Error(`Cannot delete property ${property} of the target object (READ_ONLY)`);
        },
        preventExtensions: ()=> true,
    }

    return new Proxy({
        ...context,
        on(eventName, listener) {
            if (!(eventName in listeners)) {
                listeners[eventName] = [];
            }
            listeners[eventName].push(listener);
        },
        /**
         *
         * @param {string} css
         */
        addStyle(css) {
            try {
                const styleSheet = new CSSStyleSheet();
                styleSheet.replaceSync(css);
                document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet];
            } catch (e) {
                call('error', `Error adding style ${e}`);
            }
        }
    }, {
        get(target, key) {
            if (key in target) return target[key];
            return function () {
                return call.call(this, key, ...arguments);
            }
        },
        ...readOnlyProxy,
    });
}



/**
 *
 * @typedef {object} UserScript
 * @property {string} name
 * @property {string} fileName
 * @property {boolean} enabled
 * @property {string[]} tags
 * @property {string} script
 * @property {string[]} [matches]
 * @property {string[]} [excludeMatches]
 * @property {string} [allFrames]
 * @property {string} [asMainWorld]
 * @property {Dict<{ id: string, label?: string }>} [menuCommands]
 */
class ContentScripts {
    /**
     * @type {UserScript[] | null}
     */
    #userScripts= null;
    /**
     * @type {Dict<boolean> | null}
     */
    #userScriptsStates= null;

    /**
     * @private
     */
    constructor() {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            this.#onStorageChange(changes, areaName);
        });
        chrome.runtime.onUserScriptMessage.addListener((message, sender, sendResponse) => {
            if (sender.id !== chrome.runtime.id || !message.userScriptsId) {
                onUserScriptMessage(message, sender, sendResponse);
                return;
            }
            try {
                const tabData = this.#contentStyle.tabData,
                    currentTabData = tabData[sender.tab.id];

                // console.debug("[UserScript] Event from", sender.tab, message);
                (currentTabData.executedScripts ?? []).push(message.userScriptsId);
                this.#contentStyle.tabData = tabData;

                sendResponse(true);
            } catch (e) {
                console.error(e);
                sendResponse(null);
            }
        });
        chrome.webNavigation.onBeforeNavigate.addListener(async function (details) {
            try {
                // console.info('[UserScripts] Tab navigation, resetting', details);
                const _contentStyles = await contentStyles,
                    tabId = details.tabId,
                    tabData = _contentStyles.tabData ?? _contentStyles.tabNewData;

                tabData[`${tabId}`].executedScripts = [];
                _contentStyles.tabData = tabData;
            } catch (e) {
                console.error(e);
            }
        });
    }

    // noinspection SpellCheckingInspection
    /**
     * @type {ContentScripts}
     */
    static #instance;
    /**
     @type {ContentStyles}
     */
    #contentStyle;
    /**
     * @return {ContentScripts}
     */
    static get instance() {
        return this.#instance;
    }
    /**
     *
     * @returns {Promise<ContentScripts>}
     */
    static async load() {
        this.#instance = new ContentScripts();
        await this.#instance.load();
        this.#instance.#contentStyle = await contentStyles;
        return this.#instance;
    }
    async load() {
        if (!this.#userScriptsStates) {
            const result = await chrome.storage.session.get(_userScriptsStateStoreKey)
                .catch(console.error);
            if (!(_userScriptsStateStoreKey in result)) {
                this.#userScriptsStates = {};
            } else {
                if (!result || typeof result !== 'object') throw new Error('userScripts must be an object');
                this.#userScriptsStates = result[_userScriptsStateStoreKey];
            }

        }
    }



    /**
     *
     * @param {UserScript[]} newValue
     */
    set userScripts(newValue)  {
        if (!Array.isArray(newValue)) throw new Error('ARRAY_VALUE_EXPECTED');
        this.#userScripts = newValue;
        chrome.storage.session.set({
            [_userScriptsStoreKey]: newValue
        })
            .catch(console.error);
    }
    /**
     *
     * @returns {UserScript[]}
     */
    get userScripts()  {
        if (!this.#userScripts) {
            throw new Error('USER_SCRIPT_NOT_LOADED');
        }
        return this.#userScripts;
    }

    /**
     *
     * @param {Dict<boolean>} newValue
     */
    set userScriptStates(newValue)  {
        this.#userScriptsStates = newValue;
        chrome.storage.session.set({
            [_userScriptsStateStoreKey]: newValue,
        })
            .catch(console.error);
    }
    /**
     *
     * @return {Dict<boolean>}
     */
    get userScriptStates()  {
        if (!this.#userScriptsStates) {
            throw new Error('USER_SCRIPTS_STATES_NOT_LOADED');
        }
        return this.#userScriptsStates;
    }



    /**
     *
     * @param {Dict<chrome.storage.StorageChange>} changes
     * @param {chrome.storage.AreaName} areaName
     */
    #onStorageChange(changes, areaName) {
        if (areaName !== 'session') return;

        if (_userScriptsStoreKey in changes) {
            /**
             * @type {UserScript[]}
             */
            this.#userScripts = changes[_userScriptsStoreKey].newValue;
            this.#updateUserScripts()
                .catch(console.error);
        } else if (_userScriptsStateStoreKey in changes) {
            this.#userScriptsStates = changes[_userScriptsStateStoreKey].newValue;
            this.#updateUserScripts()
                .catch(console.error);
        }
    }

    async #updateUserScripts() {
        const userScripts = this.userScripts;

        const currentUserScripts = new Set(
            (await chrome.userScripts.getScripts())
                .map(userScript => userScript.id)
        );

        /**
         *
         * @type {Set<string>}
         */
        const userScriptIds = new Set();

        /**
         *
         * @type {chrome.userScripts.RegisteredUserScript[]}
         */
        const userScriptRegistration = [];
        /**
         *
         * @type {chrome.userScripts.RegisteredUserScript[]}
         */
        const newUserScriptRegistration = [];

        const cb = (userScriptsId) => {
            chrome.runtime.sendMessage({
                type: 'user_script_executed',
                userScriptsId,
            }).catch(console.error);
        };

        for (let userScript of userScripts) {
            const enabled = this.userScriptStates[userScript.fileName] ?? userScript.enabled;
            if (!enabled) continue;
            userScriptIds.add(userScript.fileName);

            const context = {
                fileName: userScript.fileName,
                tags: userScript.tags,
            };

            /**
             *
             * @type {chrome.userScripts.RegisteredUserScript}
             */
            const registrationUserScript = {
                id: userScript.fileName,
                runAt: userScript.runAt,
                js: [
                    { code: `const znmApi = ${userScriptApiLoader.toString()}(${JSON.stringify(context)});\n(function(unsafeWindow, window){ ${userScript.script} }).call(znmApi, window, undefined);` },
                ],
                matches: userScript.matches ?? [],
                excludeMatches: userScript.excludeMatches ?? [],
                world: userScript.asMainWorld === true ? 'MAIN' : 'USER_SCRIPT',
                allFrames: !!userScript.allFrames,
            };

            if (currentUserScripts.has(userScript.fileName)) {
                userScriptRegistration.push(registrationUserScript);
            } else {
                newUserScriptRegistration.push(registrationUserScript);
            }
        }


        if (newUserScriptRegistration.length > 0) {
            await chrome.userScripts.register(newUserScriptRegistration)
                .catch(console.error);
        }
        await chrome.userScripts.update(userScriptRegistration)
            .catch(console.error);


        /**
         *
         * @type {Set<string>}
         */
        const removedUserScriptIds = new Set();
        for (let userScriptId of currentUserScripts) {
            if (!userScriptIds.has(userScriptId)) {
                removedUserScriptIds.add(userScriptId);
            }
        }
        if (removedUserScriptIds.size > 0) {
            await chrome.userScripts.unregister({
                ids: Array.from(removedUserScriptIds),
            }).catch(console.error);
        }


        console.log('[UserScript] Now registered UserScripts', await chrome.userScripts.getScripts());
    }
}

/**
 *
 * @type {ContentScripts|Promise<ContentScripts>}
 */
export let contentScripts = ContentScripts.load();


async function onStart() {
    await chrome.userScripts.configureWorld({
        messaging: true,
    })
        .catch(console.error);
}
chrome.runtime.onStartup.addListener(function () {
    onStart().catch(console.error);
});
chrome.runtime.onInstalled.addListener(function () {
    onStart().catch(console.error);
});
