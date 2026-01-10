import "dotenv/config";
import express from "express";
import session from "express-session";
import generalLimiter from "./util/generalLimiter.js";
import loginRouter from "./routers/loginRouter.js";
import registerRouter from "./routers/registerRouter.js";
import logoutRouter from "./routers/logoutRouter.js";
import sessionRouter from "./routers/sessionRouter.js";
import passwordRouter from './routers/passwordsRouter.js'
import activationPage from './routers/activationRouter.js';
import twoFactorRouter from './routers/twoFactorRouter.js'
import forgotPasswordRouter from './routers/forgotPasswordRouter.js'
import resetPasswordRouter from './routers/resetPasswordRouter.js'
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import SupabaseStore from "./stores/supabaseStore.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import http from "http"; 
import { Server } from "socket.io";
import generatePassword from './sockets/generatePasswordSockets.js'

const app = express();

const server = http.createServer(app);

const allowedOrigins = ["https://arbezzebra.dk", "https://www.arbezzebra.dk", "http://localhost:5173", "http://localhost:5174"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

app.use(helmet());

app.use(
  cors({
    origin: allowedOrigins,
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
app.use(passwordRouter);
app.use(twoFactorRouter);
app.use(activationPage);
app.use(forgotPasswordRouter);
app.use(resetPasswordRouter);
 

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  }
});

io.on("connection", (socket) => {
    generatePassword(io, socket);
});

const PORT = Number(process.env.PORT);

server.listen(PORT, () => {
  console.log("Server is running on port: ", PORT);
});
