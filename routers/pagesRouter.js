import { Router } from "express";
import fs from 'fs';

const router = Router();

const loginPage = fs.readFileSync("./login/login.html").toString();

router.get("/", (req, res) => {
    res.send(loginPage);
})



export default router;