import { Request, Response, NextFunction } from "express";

export function requireLogin(req: Request, res: Response, next: NextFunction) {
    if (!req.session || !req.session.user) {
        return res.redirect("/login");
    }
    next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.session || !req.session.user || req.session.user.role !== "ADMIN") {
        return res.status(403).send("You are not an admin");
    }
    next();
}

export function isNotLoggedIn(req: Request, res: Response, next: NextFunction) {
    if (req.session && req.session.user) {
        return res.redirect("/");
    }
    next();
}