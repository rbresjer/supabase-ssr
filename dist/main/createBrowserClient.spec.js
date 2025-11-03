"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const createBrowserClient_1 = require("./createBrowserClient");
(0, vitest_1.describe)("createServerClient", () => {
    (0, vitest_1.describe)("validation", () => {
        (0, vitest_1.it)("should throw an error on empty URL and anon key", async () => {
            (0, vitest_1.expect)(() => {
                (0, createBrowserClient_1.createBrowserClient)("URL", "");
            }).toThrow();
            (0, vitest_1.expect)(() => {
                (0, createBrowserClient_1.createBrowserClient)("", "anon key");
            }).toThrow();
        });
    });
});
//# sourceMappingURL=createBrowserClient.spec.js.map