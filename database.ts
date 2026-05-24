import { MongoClient, Collection } from "mongodb";
import { Movie, Director } from "./types";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error("MongoDB url not found.");
}

export const client = new MongoClient(uri);

const db = client.db("movies_db");

export const connectDB = async () => {
    try {
        await client.connect();
    } catch (error) {
        console.error(error);
    }
};

export const getMoviesCollection = (): Collection<Movie> => db.collection<Movie>("movies");
export const getDirectorsCollection = (): Collection<Director> => db.collection<Director>("directors");

export async function createUsers() {
    try {
        const db = client.db("movies_db");
        const usersCollection = db.collection("users");

        const userCount = await usersCollection.countDocuments();
        
        if (userCount === 0) {
            const adminHash = await bcrypt.hash("admin123", 10);
            const userHash = await bcrypt.hash("user123", 10);

            await usersCollection.insertMany([
                {
                    username: "admin",
                    passwordHash: adminHash,
                    role: "ADMIN"
                },
                {
                    username: "user",
                    passwordHash: userHash,
                    role: "USER"
                }
            ]);
        }
    } catch (error) {
        console.error(error);
    }
}