import { Router } from "express";
import fs from 'fs';

const router = Router();

const loginPage = fs.readFileSync("./public/login/login.html").toString();

router.get("/", (req, res) => {
    res.send(loginPage);
})

const signInPage = fs.readFileSync("./public/sign-in/signIn.html").toString();
router.get("/signin", (req, res) => {
    res.send(signInPage)
})


 
 

 

export default router;