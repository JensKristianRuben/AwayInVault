import { Router } from "express";
import supabase from "../util/supabaseClient.js";
import { hashPassword } from "../util/passwordUtil.js";

const router = Router();

router.post("/api/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).send({ error: "Token and new password are required" });
  }

  try {

    const { data: user, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("reset_token", token)
      .gt("reset_token_expires", new Date().toISOString()) 
      .single();

    if (findError || !user) {
      return res.status(400).send({ error: "Invalid or expired token" });
    }

    const hashedPassword = await hashPassword(newPassword);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires: null
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    res.status(200).send({ message: "Password successfully updated" });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

export default router;