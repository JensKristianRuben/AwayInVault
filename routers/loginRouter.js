import { Router } from "express";
import { comparePasswords } from "../util/passwordUtil.js";
import supabase from "../util/supabaseClient.js";

const router = Router();

router.post("/api/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
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

    if (error || !user) {
      return res.status(401).send({ error: "User not found" });
    }

    if (!user.is_active) {
      return res.status(403).send({ error: "Account not activated" });
    }

    const isValid = await comparePasswords(password, user.password_hash);
    if (!isValid) {
      return res.status(401).send({ error: "Invalid password" });
    }

    req.session.userId = user.id;

    res.status(200).send({
      data: {
        id: user.id,
        email: user.email,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
