import { Router } from 'express';
import { users } from './loginRouter.js'
import { hashPassword } from '../util/passwordUtil.js';

const router = Router();

router.post("/api/register", async (req, res) => {

    const email = req.body.email;
    const password = req.body.password;

    const existingUser = users.find(user => user.email === email);

    if (existingUser) {
        return res.status(400).send({ error: "Bad request" });
    }
        const hashedPassword = await hashPassword(password);
        const newUser = { email, hashedPassword };
        users.push(newUser);
        
        return res.status(201).send({ data: "User created" });

})



export default router;