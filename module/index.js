import express from "express";
import { createError, defineEventHandler, getQuery, isMethod, parseCookies, readBody, readRawBody, } from "h3";
const ExpressSymbol = Symbol.for("ExpressSymbol");
const app = {
    get() {
        // no handle
    },
};
export function getH3Event(target) {
    const extras = target[ExpressSymbol];
    return extras.event;
}
export function defineExpressHandler(handler) {
    return defineEventHandler(async (event) => {
        const ereq = await toExpressRequest(event);
        const eres = await toExpressResponse(event);
        return await new Promise((resolve, reject) => {
            const next = (err) => {
                eres.off("close", next);
                eres.off("error", next);
                if (err) {
                    return reject(createError(err));
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
    const descs = Object.getOwnPropertyDescriptors(express.request);
    for (const key in descs) {
        Object.defineProperty(req, key, descs[key]);
    }
    req.app = app;
    req.query = getQuery(event);
    Object.defineProperty(req, "params", {
        get: () => event.context.params,
        set: (newValue) => {
            event.context.params = newValue;
        },
        enumerable: true,
        configurable: true,
    });
    if (isMethod(event, ["PATCH", "POST", "PUT", "DELETE"])) {
        const contentType = req.headers["content-type"];
        const rawBody = await readRawBody(event, false);
        if (contentType === "application/octed-stream") {
            req.body = rawBody;
        }
        else if ((rawBody && rawBody.length > 0) ||
            contentType === "text/plain") {
            req.body = await readBody(event);
        }
        else {
            req.body = {};
        }
    }
    req.cookies = parseCookies(event);
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
    const descs = Object.getOwnPropertyDescriptors(express.response);
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