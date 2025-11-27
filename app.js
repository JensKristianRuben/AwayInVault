import "dotenv/config";
import express from "express";
import session from "express-session";
import generalLimiter from "./util/generalLimiter.js";
import loginRouter from "./routers/loginRouter.js";
import registerRouter from "./routers/registerRouter.js";
import logoutRouter from "./routers/logoutRouter.js";
import sessionRouter from "./routers/sessionRouter.js";
import activationPage from './routers/activationRouter.js'
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import SupabaseStore from "./stores/supabaseStore.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

// todo: lav side session guards
// todo: forgot password


const app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

app.use(helmet());

app.use(
  cors({
    origin: ["https://arbezzebra.dk", "https://www.arbezzebra.dk"],
    credentials: true,
  })
);

app.use(
  session({
    store: new SupabaseStore(),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
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
app.use(activationPage);

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log("Server is running on port: ", PORT);
});
