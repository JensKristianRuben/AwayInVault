import { Router } from 'express';

const router = Router();

const users = [
  { id: 1, email: "alice@example.com", password: "1234" },
  { id: 2, email: "bob@example.com", password: "secret" }
];



router.post("/api/login", (req, res) => {

    const email = req.body.email;
    const password = req.body.password;


    const user = users.find(user =>user.email === email)

    if(!user){
        return res.status(401).send({data: "User not found"});
    }

    if(user.password !== password) {
        return res.status(401).send({data: "Invalid password"})
    }

    res.status(200).send({data: "Welcome sir!"})
});


export default router;