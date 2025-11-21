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
import path from 'path';
import { fileURLToPath } from "url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "client", "dist")));

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use(generalLimiter);
app.use(helmet());
app.use(loginRouter);
app.use(registerRouter);
app.use(logoutRouter);
app.use(sessionRouter);


app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});


const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log("Server is running on port: ", PORT);
});
