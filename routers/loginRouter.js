import { Router } from "express";
import { comparePasswords } from "../util/passwordUtil.js";
import supabase from '../util/supabaseClient.js'

const router = Router();

//TODO: Tilføj cookies/sessioner

router.post("/api/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const { data: users, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .limit(1);

  if (error) {
    console.error(error);
    return res.status(500).send({ error: "Database error" });
  }

  const user = users[0];

  if (!user) {
    return res.status(401).send({ data: "User not found" });
  }

  const matchingHashedPasswords = await comparePasswords(
    password,
    user.password_hash
  );

  if (!matchingHashedPasswords) {
    return res.status(401).send({ data: "Invalid password" });
  }

  req.session.userId = user.id;
  res.status(200).send({ data: "Welcome sir!" });
});

export default router;
