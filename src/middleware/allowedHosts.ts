import type {Request, Response, NextFunction} from "express";


const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PORT_REGEX = /:\d+$/;

export const allowedHostsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const hostHeader = req.headers.host;
    if (!hostHeader) {
        res.status(400).send("Missing Host header");
        return;
    }
    const host = hostHeader.replace(PORT_REGEX, "");
    if (!ALLOWED_HOSTS.has(host)) {
        res.status(403).send("Forbidden");
        return;
    }
    next();
};
