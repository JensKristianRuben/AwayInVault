import e, { Router } from "express";
import supabase from "../util/supabaseClient.js";

const router = Router();

router.post("/api/activation", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).send({ error: "No token" });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, activation_token, token_expires")
    .eq("activation_token", token)
    .single();

  if (error || !user) {
    return res.status(400).json({ error: "Invalid token" });
  }

  if (user.token_expires && new Date(user.token_expires) < new Date()) {
    return res.status(400).json({ error: "Token expired" });
  }

  const { error: updateErr } = await supabase
    .from("users")
    .update({ is_active: true, activation_token: null, token_expires: null })
    .eq("id", user.id);

  if (updateErr) {
    return res.status(500).json({ error: "Failed to activate user" });
  }

  res.json({ message: "Account activated" });
});

export default router;
