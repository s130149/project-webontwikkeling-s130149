import session from "express-session";

import dotenv from "dotenv";
dotenv.config();

declare module "express-session" {
    interface SessionData {
        user?: {
            username: string;
            role: "ADMIN" | "USER";
        };
    }
}

export const sessionMiddleware = session({
    secret: "123",
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
});