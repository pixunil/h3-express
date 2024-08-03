import { type Request, type Response, type RequestHandler } from "express";
import { type H3Event } from "h3";
export declare function getH3Event(target: Request | Response): H3Event;
export declare function defineExpressHandler(handler: RequestHandler): import("h3").EventHandler<import("h3").EventHandlerRequest, Promise<unknown>>;
//# sourceMappingURL=index.d.ts.map