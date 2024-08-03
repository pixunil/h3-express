"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getH3Event = getH3Event;
exports.defineExpressHandler = defineExpressHandler;
const express_1 = __importDefault(require("express"));
const h3_1 = require("h3");
const ExpressSymbol = Symbol.for("ExpressSymbol");
const app = {
    get() {
        // no handle
    },
};
function getH3Event(target) {
    const extras = target[ExpressSymbol];
    return extras.event;
}
function defineExpressHandler(handler) {
    return (0, h3_1.defineEventHandler)(async (event) => {
        const ereq = await toExpressRequest(event);
        const eres = await toExpressResponse(event);
        return await new Promise((resolve, reject) => {
            const next = (err) => {
                eres.off("close", next);
                eres.off("error", next);
                if (err) {
                    return reject((0, h3_1.createError)(err));
                }
                return resolve(err);
            };
            try {
                ereq.res = eres;
                eres.req = ereq;
                ereq.next = next;
                eres.once("close", next);
                eres.once("error", next);
                handler(ereq, eres, next);
            }
            catch (err) {
                next(err);
            }
        });
    });
}
async function toExpressRequest(event) {
    const req = event.node.req;
    if (req[ExpressSymbol]) {
        return req;
    }
    const descs = Object.getOwnPropertyDescriptors(express_1.default.request);
    for (const key in descs) {
        Object.defineProperty(req, key, descs[key]);
    }
    req.app = app;
    req.query = (0, h3_1.getQuery)(event);
    Object.defineProperty(req, "params", {
        get: () => event.context.params,
        set: (newValue) => {
            event.context.params = newValue;
        },
        enumerable: true,
        configurable: true,
    });
    if ((0, h3_1.isMethod)(event, ["PATCH", "POST", "PUT", "DELETE"])) {
        const contentType = req.headers["content-type"];
        const rawBody = await (0, h3_1.readRawBody)(event, false);
        if (contentType === "application/octed-stream") {
            req.body = rawBody;
        }
        else if ((rawBody && rawBody.length > 0) ||
            contentType === "text/plain") {
            req.body = await (0, h3_1.readBody)(event);
        }
        else {
            req.body = {};
        }
    }
    req.cookies = (0, h3_1.parseCookies)(event);
    req[ExpressSymbol] = {
        event,
    };
    return req;
}
async function toExpressResponse(event) {
    const res = event.node.res;
    if (res[ExpressSymbol]) {
        return res;
    }
    const descs = Object.getOwnPropertyDescriptors(express_1.default.response);
    for (const key in descs) {
        Object.defineProperty(res, key, descs[key]);
    }
    // Nuxt 3 bug: https://github.com/nuxt/framework/issues/3623
    const _setHeader = res.setHeader;
    res.setHeader = function setHeader(...args) {
        if (!res.headersSent) {
            _setHeader.apply(res, args);
        }
        return res;
    };
    res._implicitHeader = () => {
        res.writeHead(res.statusCode);
    };
    res.app = app;
    res[ExpressSymbol] = {
        event,
    };
    return res;
}
//# sourceMappingURL=index.js.map