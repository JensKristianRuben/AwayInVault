import "dotenv/config";
import express from "express";
import session from "express-session";
import generalLimiter from "./util/generalLimiter.js";
import loginRouter from "./routers/loginRouter.js";
import registerRouter from "./routers/registerRouter.js";
import logoutRouter from "./routers/logoutRouter.js";
import sessionRouter from "./routers/sessionRouter.js";
import helmet from "helmet";
import cors from "cors";
import connectPgSimple from "connect-pg-simple";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const app = express();
const PgStore = connectPgSimple(session);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(helmet());

app.use(
  cors({
    origin: ["https://arbezzebra.dk", "https://www.arbezzebra.dk"],
    credentials: true,
  })
);

// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//       secure: true,
//       sameSite: "none",
//     },
//   })
// );
app.use(
  session({
    store: new PgStore({
      conString: process.env.SUPABASE_DB_URL,
      tableName: "sessions",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(generalLimiter);
app.use(loginRouter);
app.use(registerRouter);
app.use(logoutRouter);
app.use(sessionRouter);

app.get("/api/something", (req, res) => {
  res.send({ data: "something" });
});

app.get("/passwords", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// app.get("/{*splat}", (req, res) => {
//   res.sendFile(path.join(__dirname, "public/index.html"));
// });

const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log("Server is running on port: ", PORT);
});
