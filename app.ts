import bcrypt from "bcrypt";
import express, {Express} from 'express';
import { connectDB, getMoviesCollection, getDirectorsCollection, client, createUsers } from './database';
import { sessionMiddleware } from "./session";
import { requireLogin, requireAdmin, isNotLoggedIn } from "./middleware";

const app: Express = express();
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

connectDB();
createUsers();

app.set("view engine", "ejs"); 
app.set("port", 3000);
app.use(express.static("public"));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.get("/login", isNotLoggedIn, async (req, res) => {
    res.render("login");
})

app.post("/login", isNotLoggedIn, async (req, res) => {
    try {
        const { username, password } = req.body;
        const db = client.db("movies_db");
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({ username: username });
        if (!user) {
            return res.render("login", { error: "Invalid username." });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordCorrect) {
            return res.render("login", { error: "Invalid password." });
        }

        req.session.user = {
            username: user.username,
            role: user.role
        };

        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.render("login", { error: "Something went wrong. "});
    }
});

app.get("/register", isNotLoggedIn, async (req, res) => {
    res.render("register");
})

app.post("/register", isNotLoggedIn, async (req, res) => {
    try {
        const { username, password } = req.body;
        const db = client.db("movies_db");
        const usersCollection = db.collection("users");

        const userExists = await usersCollection.findOne({ username: username });
        if (userExists) {
            return res.render("register", { error: "Username already exists." });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await usersCollection.insertOne({
            username: username,
            passwordHash: passwordHash,
            role: "USER"
        });

        res.redirect("/login");

    } catch (error) {
        console.error(error);
        res.render("register", { error: "Something went wrong. "});
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error(err);
        res.redirect("/login");
    });
});

app.get("/", requireLogin, async (req, res) => {
    const moviesCollection = getMoviesCollection();
    const moviesData = await moviesCollection.find({}).toArray();

    const sortField = (req.query.sort as string) || "title";
    const sortDirection = (req.query.direction as string) || "asc";
    const searchQuery = (req.query.search as string) || "";
    
    let filteredMovies = [...moviesData];

    if (searchQuery) {
        filteredMovies = filteredMovies.filter(movie => 
            movie.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    filteredMovies.sort((a : any, b : any) => {
        let valueA = (a as any)[sortField];
        let valueB = (b as any)[sortField];

        if (typeof valueA === "string") valueA = valueA.toLowerCase();
        if (typeof valueB === "string") valueB = valueB.toLowerCase();

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    res.render("index", { 
        movies: filteredMovies,
        page: "movies",
        currentSort: sortField,
        currentDirection: sortDirection,
        searchInput: searchQuery
    });
})

app.get("/movie/:id", requireLogin, async (req, res) => {
    const moviesCollection = getMoviesCollection();
    const moviesData = await moviesCollection.find({}).toArray();
    const movieId = req.params.id;

    const foundMovie = moviesData.find((movie : any) => movie.id === movieId);

    if (foundMovie) {
        res.render("movie-detail", { movie: foundMovie });
    } else {
        res.status(404).send("Page not found");
    }
});

app.get("/movie/:id/edit", requireLogin, requireAdmin, async (req : any, res : any) => {
    const moviesCollection = getMoviesCollection();
    const movie = await moviesCollection.findOne({ id: req.params.id }) as any;

    if (movie) {
        res.render("movie-edit", { movie });
    } else {
        res.status(404).send("Page not found");
    }
});

app.post("/movie/:id/edit", requireLogin, requireAdmin, async (req : any, res : any) => {
    const moviesCollection = getMoviesCollection();
    const { title, genre, duration, released } = req.body;

    await moviesCollection.updateOne(
        { id: req.params.id },
        {
            $set: {
                title: title,
                genre: genre,
                duration: duration,
                isReleased: released === "true"
            }
        }
    );

    res.redirect(`/movie/${req.params.id}`);
});

app.get("/directors", requireLogin, async (req, res) => {
    const directorsCollection = getDirectorsCollection();
    const directorsData = await directorsCollection.find({}).toArray();

    const sortField = (req.query.sort as string) || "name";
    const sortDirection = (req.query.direction as string) || "asc";
    const searchQuery = (req.query.search as string) || "";

    let filteredDirectors = [...directorsData];

    if (searchQuery) {
        filteredDirectors = filteredDirectors.filter(director => 
            director.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    filteredDirectors.sort((a, b) => {
        let valueA = (a as any)[sortField];
        let valueB = (b as any)[sortField];

        if (typeof valueA === "string") valueA = valueA.toLowerCase();
        if (typeof valueB === "string") valueB = valueB.toLowerCase();

        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    res.render("directors", { 
        directors: filteredDirectors,
        page: "directors",
        currentSort: sortField,
        currentDirection: sortDirection,
        searchInput: searchQuery
    })
});

app.get("/director/:id", requireLogin, async (req, res) => {
    const directorsCollection = getDirectorsCollection();
    const directorsData = await directorsCollection.find({}).toArray();
    const directorId = req.params.id;

    const foundDirector = directorsData.find((director : any) => director.id === directorId) as any;

    if (foundDirector) {
        const moviesCollection = getMoviesCollection();
        const moviesData = await moviesCollection.find({}).toArray();

        const mappedMovies = foundDirector.knownFor.map((title: string) => {
            const movieObject = moviesData.find((movie : any) => movie.title.toLowerCase() === title.toLowerCase());
            return {
                title: title,
                id: movieObject ? movieObject.id : null
            };
        });

        res.render("director-detail", { 
            director: foundDirector,
            knownMovies: mappedMovies 
        });
    } else {
        res.status(404).send("Page not found");
    }
});

app.listen(app.get("port"), () => console.log( "http://localhost:" + app.get("port")));

