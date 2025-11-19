import "dotenv/config";
import express from "express";
import session from "express-session";
import generalLimiter from "./util/generalLimiter.js";
import loginRouter from "./routers/loginRouter.js";
import registerRouter from "./routers/registerRouter.js";
import logoutRouter from "./routers/logoutRouter.js";
import passwordsRouter from "./routers/passwordsRouter.js"
import sessionRouter from './routers/sessionRouter.js'
import helmet from "helmet";
import cors from 'cors'

const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

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
app.use(passwordsRouter);
app.use(sessionRouter);

const PORT = Number(process.env.PORT);

app.listen(PORT, () => {
  console.log("Server is running on port: ", PORT);
});
