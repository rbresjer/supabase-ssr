"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const utils_1 = require("./utils");
const cookies_1 = require("./cookies");
(0, vitest_1.describe)("createStorageFromOptions in browser without cookie methods", () => {
    (0, vitest_1.beforeEach)(() => {
        const cookies = {};
        const doc = new Proxy({}, {
            get: (target, prop) => {
                if (prop === "cookie") {
                    return Object.keys(cookies)
                        .map((key) => `${key}=${cookies[key].value}`)
                        .join(";");
                }
                return target[prop];
            },
            set: (target, prop, setValue) => {
                if (prop === "cookie") {
                    const [cookie, ...options] = setValue.split(/\s*;\s*/);
                    const [name, value] = cookie.split("=");
                    if (options.indexOf("Max-Age=0") > -1) {
                        delete cookies[name];
                    }
                    else {
                        cookies[name] = { value, options };
                    }
                    return true;
                }
                target[prop] = setValue;
                return true;
            },
        });
        globalThis.window = {
            document: doc,
        };
        globalThis.document = doc;
    });
    (0, vitest_1.afterEach)(() => {
        delete globalThis.window;
        delete globalThis.document;
    });
    (0, vitest_1.it)("should setup mocks correctly", () => {
        (0, vitest_1.expect)((0, utils_1.isBrowser)()).toEqual(true);
        (0, vitest_1.expect)(document.cookie).toEqual("");
        document.cookie = "name-a=value-a; max-age=123";
        document.cookie = "name-b=value-b; max-age=123";
        (0, vitest_1.expect)(document.cookie).toEqual("name-a=value-a;name-b=value-b");
        document.cookie = "name-a=delete; Max-Age=0";
        (0, vitest_1.expect)(document.cookie).toEqual("name-b=value-b");
    });
    (0, vitest_1.it)("should access cookies with various uses of getItem, setItem and removeItem", async () => {
        const { storage } = (0, cookies_1.createStorageFromOptions)({
            cookieEncoding: "raw", // to help test readability
        }, false);
        [
            { name: "storage-key.0", value: "val" },
            { name: "storage-key.1", value: "ue" },
            { name: "storage-key.4", value: "leftover" },
            { name: "random-cookie", value: "random" },
        ].forEach(({ name, value }) => {
            document.cookie = `${name}=${value}; Max-Age=123`;
        });
        const value = await storage.getItem("storage-key");
        (0, vitest_1.expect)(value).toEqual("value");
        await storage.setItem("storage-key", "value");
        (0, vitest_1.expect)(document.cookie).toEqual("random-cookie=random;storage-key=value");
        let newChunkedValue = Array.from({ length: utils_1.MAX_CHUNK_SIZE + 1 }, () => "x").join("");
        await storage.setItem("storage-key", newChunkedValue);
        await storage.removeItem("non-existent-item");
        (0, vitest_1.expect)(document.cookie).toEqual(`random-cookie=random;storage-key.0=${newChunkedValue.substring(0, utils_1.MAX_CHUNK_SIZE)};storage-key.1=${newChunkedValue.substring(utils_1.MAX_CHUNK_SIZE)}`);
        document.cookie = "storage-key=value; Max-Age=123";
        await storage.removeItem("storage-key");
        (0, vitest_1.expect)(document.cookie).toEqual("random-cookie=random");
        newChunkedValue = Array.from({ length: 2 * utils_1.MAX_CHUNK_SIZE + 1 }, () => "x").join("");
        await storage.setItem("storage-key", newChunkedValue);
        (0, vitest_1.expect)(document.cookie).toEqual(`random-cookie=random;storage-key.0=${newChunkedValue.substring(0, utils_1.MAX_CHUNK_SIZE)};storage-key.1=${newChunkedValue.substring(utils_1.MAX_CHUNK_SIZE, 2 * utils_1.MAX_CHUNK_SIZE)};storage-key.2=${newChunkedValue.substring(2 * utils_1.MAX_CHUNK_SIZE)}`);
        newChunkedValue = Array.from({ length: utils_1.MAX_CHUNK_SIZE + 1 }, () => "x").join("");
        await storage.setItem("storage-key", newChunkedValue);
        (0, vitest_1.expect)(document.cookie).toEqual(`random-cookie=random;storage-key.0=${newChunkedValue.substring(0, utils_1.MAX_CHUNK_SIZE)};storage-key.1=${newChunkedValue.substring(utils_1.MAX_CHUNK_SIZE)}`);
    });
});
(0, vitest_1.describe)("createStorageFromOptions for createServerClient", () => {
    (0, vitest_1.describe)("storage without setAll or without set / remove cookie methods", () => {
        let warnings = [];
        (0, vitest_1.beforeEach)(() => {
            console.originalWarn = console.warn;
            console.warn = (...args) => {
                warnings.push(args);
            };
        });
        (0, vitest_1.afterEach)(() => {
            warnings = [];
            console.warn = console.originalWarn;
            delete console.originalWarn;
        });
        (0, vitest_1.it)("should log a warning when only getAll is configured", async () => {
            const { setAll } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [];
                    },
                },
            }, true);
            await setAll([
                {
                    name: "cookie",
                    value: "value",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                },
            ]);
            (0, vitest_1.expect)(warnings).toEqual([
                [
                    "@supabase/ssr: createServerClient was configured without the setAll cookie method, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness.",
                ],
            ]);
        });
        (0, vitest_1.it)("should log a warning when only get is configured", async () => {
            const { setAll } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    get: async () => {
                        return null;
                    },
                },
            }, true);
            await setAll([
                {
                    name: "cookie",
                    value: "value",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                },
            ]);
            (0, vitest_1.expect)(warnings).toEqual([
                [
                    "@supabase/ssr: createServerClient was configured without set and remove cookie methods, but the client needs to set cookies. This can lead to issues such as random logouts, early session termination or increased token refresh requests. If in NextJS, check your middleware.ts file, route handlers and server actions for correctness. Consider switching to the getAll and setAll cookie methods instead of get, set and remove which are deprecated and can be difficult to use correctly.",
                ],
            ]);
        });
    });
    (0, vitest_1.describe)("storage with getAll, setAll", () => {
        (0, vitest_1.it)("should not call setAll on setItem", async () => {
            let setAllCalled = false;
            const { storage, setItems, removedItems } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [];
                    },
                    setAll: async () => {
                        setAllCalled = true;
                    },
                },
            }, true);
            await storage.setItem("storage-key", "value");
            (0, vitest_1.expect)(setAllCalled).toBeFalsy();
            (0, vitest_1.expect)(setItems).toEqual({ "storage-key": "value" });
            (0, vitest_1.expect)(removedItems).toEqual({});
        });
        (0, vitest_1.it)("should not call setAll on removeItem", async () => {
            let setAllCalled = false;
            const { storage, setItems, removedItems } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [];
                    },
                    setAll: async () => {
                        setAllCalled = true;
                    },
                },
            }, true);
            await storage.removeItem("storage-key");
            (0, vitest_1.expect)(setAllCalled).toBeFalsy();
            (0, vitest_1.expect)(setItems).toEqual({});
            (0, vitest_1.expect)(removedItems).toEqual({ "storage-key": true });
        });
        (0, vitest_1.it)("should not call getAll if item has already been set", async () => {
            let getAllCalled = false;
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        getAllCalled = true;
                        return [];
                    },
                    setAll: async () => { },
                },
            }, true);
            await storage.setItem("storage-key", "value");
            const value = await storage.getItem("storage-key");
            (0, vitest_1.expect)(value).toEqual("value");
            (0, vitest_1.expect)(getAllCalled).toBeFalsy();
        });
        (0, vitest_1.it)("should not call getAll if item has already been removed", async () => {
            let getAllCalled = false;
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        getAllCalled = true;
                        return [];
                    },
                    setAll: async () => { },
                },
            }, true);
            await storage.removeItem("storage-key");
            const value = await storage.getItem("storage-key");
            (0, vitest_1.expect)(value).toBeNull();
            (0, vitest_1.expect)(getAllCalled).toBeFalsy();
        });
        (0, vitest_1.it)("should call getAll each time getItem is called until setItem or removeItem", async () => {
            let getAllCalled = 0;
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        getAllCalled += 1;
                        return [];
                    },
                    setAll: async () => { },
                },
            }, true);
            await storage.getItem("storage-key");
            (0, vitest_1.expect)(getAllCalled).toEqual(1);
            await storage.getItem("storage-key");
            (0, vitest_1.expect)(getAllCalled).toEqual(2);
            await storage.setItem("storage-key", "value");
            await storage.getItem("storage-key");
            (0, vitest_1.expect)(getAllCalled).toEqual(2);
        });
        (0, vitest_1.it)("should return item value from getAll without chunks", async () => {
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [
                            {
                                name: "storage-key",
                                value: "value",
                            },
                            {
                                name: "other-cookie",
                                value: "other-value",
                            },
                            {
                                name: "storage-key.0",
                                value: "leftover-chunk-value",
                            },
                        ];
                    },
                    setAll: async () => { },
                },
            }, true);
            const value = await storage.getItem("storage-key");
            (0, vitest_1.expect)(value).toEqual("value");
        });
        (0, vitest_1.it)("should return item value from getAll with chunks", async () => {
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [
                            {
                                name: "other-cookie",
                                value: "other-value",
                            },
                            {
                                name: "storage-key.0",
                                value: "val",
                            },
                            {
                                name: "storage-key.1",
                                value: "ue",
                            },
                            {
                                name: "storage-key.2",
                                value: "",
                            },
                            {
                                name: "storage-key.3",
                                value: "leftover-chunk-value",
                            },
                        ];
                    },
                    setAll: async () => { },
                },
            }, true);
            const value = await storage.getItem("storage-key");
            (0, vitest_1.expect)(value).toEqual("value");
        });
    });
    (0, vitest_1.describe)("storage with get, set, remove", () => {
        (0, vitest_1.it)("should call get multiple times for the storage key and its chunks", async () => {
            const getNames = [];
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    get: async (name) => {
                        getNames.push(name);
                        if (name === "storage-key") {
                            return "value";
                        }
                        return null;
                    },
                    set: async () => { },
                    remove: async () => { },
                },
            }, true);
            const value = await storage.getItem("storage-key");
            (0, vitest_1.expect)(value).toEqual("value");
            (0, vitest_1.expect)(getNames).toEqual([
                "storage-key",
                "storage-key.0",
                "storage-key.1",
                "storage-key.2",
                "storage-key.3",
                "storage-key.4",
            ]);
        });
        (0, vitest_1.it)("should reconstruct storage value from chunks", async () => {
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    get: async (name) => {
                        if (name === "storage-key.0") {
                            return "val";
                        }
                        if (name === "storage-key.1") {
                            return "ue";
                        }
                        if (name === "storage-key.3") {
                            return "leftover-chunk-value";
                        }
                        return null;
                    },
                    set: async () => { },
                    remove: async () => { },
                },
            }, true);
            const value = await storage.getItem("storage-key");
            (0, vitest_1.expect)(value).toEqual("value");
        });
    });
    (0, vitest_1.describe)("setAll when using set, remove", () => {
        (0, vitest_1.it)("should call set and remove depending on the values sent to setAll", async () => {
            const setCalls = [];
            const removeCalls = [];
            const { setAll } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    get: async (name) => {
                        return null;
                    },
                    set: async (name, value) => {
                        setCalls.push({ name, value });
                    },
                    remove: async (name) => {
                        removeCalls.push(name);
                    },
                },
            }, true);
            await setAll([
                {
                    name: "a",
                    value: "b",
                    options: { maxAge: 10 },
                },
                {
                    name: "b",
                    value: "c",
                    options: { maxAge: 10 },
                },
                {
                    name: "c",
                    value: "",
                    options: { maxAge: 0 },
                },
            ]);
            (0, vitest_1.expect)(setCalls).toEqual([
                { name: "a", value: "b" },
                { name: "b", value: "c" },
            ]);
            (0, vitest_1.expect)(removeCalls).toEqual(["c"]);
        });
    });
});
(0, vitest_1.describe)("createStorageFromOptions for createBrowserClient", () => {
    (0, vitest_1.describe)("storage with getAll, setAll", () => {
        (0, vitest_1.it)("should call getAll on each getItem", async () => {
            let getAllCalls = 0;
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        getAllCalls += 1;
                        return [
                            {
                                name: "random-cookie",
                                value: "random-value",
                            },
                            { name: "storage-key", value: "value" },
                            { name: "storage-key.4", value: "leftover-chunk-value" },
                        ];
                    },
                    setAll: async () => { },
                },
            }, false);
            const value = await storage.getItem("storage-key");
            (0, vitest_1.expect)(value).toEqual("value");
            (0, vitest_1.expect)(getAllCalls).toEqual(1);
            const nonExistingValue = await storage.getItem("whatever");
            (0, vitest_1.expect)(nonExistingValue).toBeNull();
            (0, vitest_1.expect)(getAllCalls).toEqual(2);
        });
        (0, vitest_1.it)("should call getAll, setAll on each setItem", async () => {
            let getAllCalls = 0;
            let setAllCalls = 0;
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        getAllCalls += 1;
                        return [];
                    },
                    setAll: async () => {
                        setAllCalls += 1;
                    },
                },
            }, false);
            await storage.setItem("storage-key", "value");
            (0, vitest_1.expect)(getAllCalls).toEqual(1);
            (0, vitest_1.expect)(setAllCalls).toEqual(1);
        });
        (0, vitest_1.it)("should call getAll, setAll on each removeItem", async () => {
            let getAllCalls = 0;
            let setAllCalls = 0;
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        getAllCalls += 1;
                        return [
                            {
                                name: "storage-key",
                                value: "value",
                            },
                        ];
                    },
                    setAll: async () => {
                        setAllCalls += 1;
                    },
                },
            }, false);
            await storage.removeItem("storage-key");
            (0, vitest_1.expect)(getAllCalls).toEqual(1);
            (0, vitest_1.expect)(setAllCalls).toEqual(1);
        });
        (0, vitest_1.it)("should do chunk management with setAll (non-chunked => chunked case)", async () => {
            const setAllCalls = [];
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [
                            {
                                name: "random-cookie",
                                value: "random-value",
                            },
                            {
                                name: "storage-key",
                                value: "value",
                            },
                            {
                                name: "storage-key.4",
                                value: "leftover-chunk-value",
                            },
                        ];
                    },
                    setAll: async (setCookies) => {
                        setAllCalls.push(...setCookies);
                    },
                },
            }, false);
            const chunkedValue = Array.from({ length: utils_1.MAX_CHUNK_SIZE + 1 }, () => "x").join("");
            await storage.setItem("storage-key", chunkedValue);
            (0, vitest_1.expect)(setAllCalls).toEqual([
                {
                    name: "storage-key",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key.4",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key.0",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                    value: chunkedValue.substring(0, utils_1.MAX_CHUNK_SIZE),
                },
                {
                    name: "storage-key.1",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                    value: chunkedValue.substring(utils_1.MAX_CHUNK_SIZE),
                },
            ]);
        });
        (0, vitest_1.it)("should do chunk management with setAll (less chunks => more chunks case)", async () => {
            const setAllCalls = [];
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [
                            {
                                name: "random-cookie",
                                value: "random-value",
                            },
                            {
                                name: "storage-key.0",
                                value: "val",
                            },
                            {
                                name: "storage-key.1",
                                value: "ue",
                            },
                            {
                                name: "storage-key.4",
                                value: "leftover-chunk-value",
                            },
                        ];
                    },
                    setAll: async (setCookies) => {
                        setAllCalls.push(...setCookies);
                    },
                },
            }, false);
            const chunkedValue = Array.from({ length: 2 * utils_1.MAX_CHUNK_SIZE + 1 }, () => "x").join("");
            await storage.setItem("storage-key", chunkedValue);
            (0, vitest_1.expect)(setAllCalls).toEqual([
                {
                    name: "storage-key.4",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key.0",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                    value: chunkedValue.substring(0, utils_1.MAX_CHUNK_SIZE),
                },
                {
                    name: "storage-key.1",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                    value: chunkedValue.substring(utils_1.MAX_CHUNK_SIZE, 2 * utils_1.MAX_CHUNK_SIZE),
                },
                {
                    name: "storage-key.2",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                    value: chunkedValue.substring(2 * utils_1.MAX_CHUNK_SIZE),
                },
            ]);
        });
        (0, vitest_1.it)("should do chunk management with setAll (more chunks => less chunks case)", async () => {
            const setAllCalls = [];
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [
                            {
                                name: "random-cookie",
                                value: "random-value",
                            },
                            {
                                name: "storage-key.0",
                                value: "va",
                            },
                            {
                                name: "storage-key.1",
                                value: "lu",
                            },
                            {
                                name: "storage-key.2",
                                value: "e",
                            },
                            {
                                name: "storage-key.4",
                                value: "leftover-chunk-value",
                            },
                        ];
                    },
                    setAll: async (setCookies) => {
                        setAllCalls.push(...setCookies);
                    },
                },
            }, false);
            const chunkedValue = Array.from({ length: utils_1.MAX_CHUNK_SIZE + 1 }, () => "x").join("");
            await storage.setItem("storage-key", chunkedValue);
            (0, vitest_1.expect)(setAllCalls).toEqual([
                {
                    name: "storage-key.2",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key.4",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key.0",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                    value: chunkedValue.substring(0, utils_1.MAX_CHUNK_SIZE),
                },
                {
                    name: "storage-key.1",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                    value: chunkedValue.substring(utils_1.MAX_CHUNK_SIZE),
                },
            ]);
        });
        (0, vitest_1.it)("should do chunk management with setAll (chunked => non-chunked case)", async () => {
            const setAllCalls = [];
            const { storage } = (0, cookies_1.createStorageFromOptions)({
                cookieEncoding: "raw", // to help test readability
                cookies: {
                    getAll: async () => {
                        return [
                            {
                                name: "random-cookie",
                                value: "random-value",
                            },
                            {
                                name: "storage-key.0",
                                value: "va",
                            },
                            {
                                name: "storage-key.1",
                                value: "lu",
                            },
                            {
                                name: "storage-key.2",
                                value: "e",
                            },
                            {
                                name: "storage-key.4",
                                value: "leftover-chunk-value",
                            },
                        ];
                    },
                    setAll: async (setCookies) => {
                        setAllCalls.push(...setCookies);
                    },
                },
            }, false);
            await storage.setItem("storage-key", "value");
            (0, vitest_1.expect)(setAllCalls).toEqual([
                {
                    name: "storage-key.0",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key.1",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key.2",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key.4",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
                    value: "",
                },
                {
                    name: "storage-key",
                    options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
                    value: "value",
                },
            ]);
        });
    });
});
(0, vitest_1.describe)("applyServerStorage", () => {
    (0, vitest_1.it)("should call setAll with the correct cookies for a variety of changes to the storage state", async () => {
        const setAllCalls = [];
        const { storage, getAll, setAll, setItems, removedItems } = (0, cookies_1.createStorageFromOptions)({
            cookieEncoding: "raw", // to help test readability
            cookies: {
                getAll: async () => {
                    return [
                        {
                            name: "random-cookie",
                            value: "random-value",
                        },
                        {
                            name: "storage-key.0",
                            value: "va",
                        },
                        {
                            name: "storage-key.1",
                            value: "lu",
                        },
                        {
                            name: "storage-key.2",
                            value: "e",
                        },
                        {
                            name: "storage-key.4",
                            value: "leftover-chunk-value",
                        },
                        {
                            name: "non-chunked",
                            value: "non-chunked-value",
                        },
                        {
                            name: "remove-value",
                            value: "remove",
                        },
                        {
                            name: "remove-value.0",
                            value: "remove",
                        },
                        {
                            name: "remove-value.2",
                            value: "remove",
                        },
                    ];
                },
                setAll: async (setCookies) => {
                    setAllCalls.push(...setCookies);
                },
            },
        }, true);
        const newChunkedValue = Array.from({ length: utils_1.MAX_CHUNK_SIZE + 1 }, () => "x").join("");
        await storage.setItem("storage-key", newChunkedValue);
        await storage.setItem("new-chunked-value", newChunkedValue);
        await storage.setItem("new-value", "value");
        await storage.removeItem("remove-value");
        await storage.removeItem("non-existent-value");
        await (0, cookies_1.applyServerStorage)({ getAll, setAll, setItems, removedItems }, {
            cookieEncoding: "raw", // to help test readability
        });
        (0, vitest_1.expect)(setAllCalls).toEqual([
            {
                name: "remove-value",
                value: "",
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
            },
            {
                name: "remove-value.0",
                value: "",
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
            },
            {
                name: "remove-value.2",
                value: "",
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
            },
            {
                name: "storage-key.2",
                value: "",
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
            },
            {
                name: "storage-key.4",
                value: "",
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS, maxAge: 0 },
            },
            {
                name: "storage-key.0",
                value: newChunkedValue.substring(0, utils_1.MAX_CHUNK_SIZE),
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
            },
            {
                name: "storage-key.1",
                value: newChunkedValue.substring(utils_1.MAX_CHUNK_SIZE),
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
            },
            {
                name: "new-chunked-value.0",
                value: newChunkedValue.substring(0, utils_1.MAX_CHUNK_SIZE),
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
            },
            {
                name: "new-chunked-value.1",
                value: newChunkedValue.substring(utils_1.MAX_CHUNK_SIZE),
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
            },
            {
                name: "new-value",
                value: "value",
                options: { ...utils_1.DEFAULT_COOKIE_OPTIONS },
            },
        ]);
    });
});
//# sourceMappingURL=cookies.spec.js.map