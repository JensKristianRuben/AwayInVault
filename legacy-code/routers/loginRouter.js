import { Router } from "express";
import { comparePasswords } from "../util/passwordUtil.js";
import supabase from "../util/supabaseClient.js";
import { authenticator } from "otplib";

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

    if (user.two_factor_enabled) {
      req.session.partialAuthId = user.id;
      return res.send({
        requires2FA: true,
        message: "Please enter your 2FA code",
      });
    }

    req.session.userId = user.id;

    res.status(200).send({
      data: {
        id: user.id,
        email: user.email,
        isActive: user.is_active,
        requires2FA: false,
        two_factor_enabled: user.two_factor_enabled,
      },
    });
  } catch (error) {
    res.status(500).send({ error: "Internal server error" });
  }
});

router.post("/api/login/verify-2fa", async (req, res) => {
  const { token } = req.body;
  const userId = req.session.partialAuthId;

  if (!userId) return res.status(401).send({ error: "Session expired" });

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  const isValid = authenticator.verify({
    token,
    secret: user.two_factor_secret,
  });

  if (!isValid) return res.status(400).send({ error: "Wrong code" });

  req.session.userId = userId;
  req.session.twoFactorEnabled = user.two_factor_enabled;
  delete req.session.partialAuthId;

  res.status(200).send({
    data: {
      id: user.id,
      email: user.email,
      two_factor_enabled: user.two_factor_enabled,
    },
  });
});

export default router;
