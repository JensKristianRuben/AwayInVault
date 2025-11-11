import { Router } from 'express';
import { comparePasswords } from '../util/passwordUtil.js';

const router = Router();


export const users = [
    { id: 1, email: "alice@example.com", password: "$2b$10$u1u1QQZUHddPxR8skh7RtuaTAmkl5dcNQBb4I5eOkN.g8yfYjICGe" },
    { id: 2, email: "bob@example.com", password: "$2b$10$Ks4p6.W8xq1Wyai6rSh2DOLBcA/M2jgHDk4I4epVYG2sZ4UCfpZkK" }
];

//TODO: Tilføj cookies/sessioner

router.post("/api/login", async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    const user = users.find(user => user.email === email)

    if (!user) {
        return res.status(401).send({ data: "User not found" });
    }

    const matchingHashedPasswords = await comparePasswords(password, user.password);

    if (!matchingHashedPasswords) {
        return res.status(401).send({ data: "Invalid password" })
    }

    res.status(200).send({ data: "Welcome sir!" })
});


export default router;