"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)("helpers", () => {
    (0, vitest_1.describe)("parseCookieHeader", () => {
        (0, vitest_1.it)("should parse a Cookie header", () => {
            (0, vitest_1.expect)((0, helpers_1.parseCookieHeader)("")).toMatchSnapshot();
            (0, vitest_1.expect)((0, helpers_1.parseCookieHeader)(`a=b;c=${encodeURIComponent(" hello ")};e=f`)).toMatchSnapshot();
        });
    });
    (0, vitest_1.describe)("serializeCookieHeader", () => {
        (0, vitest_1.it)("should serialize a cookie to a Set-Cookie header", () => {
            (0, vitest_1.expect)((0, helpers_1.serializeCookieHeader)("a", "", {
                path: "/",
                maxAge: 123,
                httpOnly: true,
                secure: true,
            })).toMatchSnapshot();
            (0, vitest_1.expect)((0, helpers_1.serializeCookieHeader)("b", " weird value", { maxAge: 345 })).toMatchSnapshot();
        });
    });
});
//# sourceMappingURL=helpers.spec.js.map