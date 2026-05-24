import "express-session";

export interface User {
    username: string;
    passwordHash: string;
    role: "ADMIN" | "USER";
}

export interface Movie {
    id: string;
    title: string;
    description: string;
    duration: number;
    isReleased: boolean;
    releaseDate: string;
    imageUrl: string;
    genre: string;
    actors: string[];
}

export interface Director {
    id: string;
    name: string;
    imageUrl: string;
    isActive: boolean;
}