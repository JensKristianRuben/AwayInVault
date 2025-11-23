import { Router } from "express";
import { hashPassword } from "../util/passwordUtil.js";
import supabase from "../util/supabaseClient.js";
import crypto from "crypto";
import { Resend } from "resend";

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/api/register", async (req, res) => {
  const email = req.body.email;
  const password = req.body.registerPassword;

  if (!email || !password) {
    return res.status(400).send({ error: "Email and password are required" });
  }

  
  try {
    const hashedPassword = await hashPassword(password);

    const activationToken = crypto.randomBytes(32).toString("hex");
    const tokenExperation = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          password_hash: hashedPassword,
          activation_token: activationToken,
          token_expires: tokenExperation,
        },
      ])
      .select();

    if (error) {
      console.error(error);
      return res.status(500).send({ error: "Could not create user" });
    }

    // const activationLink = `https://arbezzebra.dk/activate?token=${activationToken}`;

    // const { error: mailError } = await resend.emails.send({
    //   from: "noreply@arbezzebra.dk",
    //   to: email,
    //   subject: "Activate your account",
    //   html: `
    //     <p>Click the link to activate your account:</p>
    //     <p><a href="${activationLink}">${activationLink}</a></p>
    //   `,
    // });

    // if (mailError) {
    //   console.error(mailError);
    //   return res.status(500).send({ error: "User created but email failed to send" });
    // };

    res.status(201).send({ data: "User created. Activation email sent." });
  } catch (error) {
    return res.status(500).send({ error: "Internal server error" });
  }

  router.get("/api/active", async (req, res) => {
    const token = req.query.token;

    if (!token) {
      return res.status(400).send({ error: "No such token" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("activation_token", token)
      .single();

    if (error || !user) {
      return res.status(400).send({ error: "No such token" });
    }

    if (new Date(user.token_expires) < new Date()) {
      return res.status(400).send({error: ("Token expired")})
    }

    const { error: updateError } = supabase
    .from(users)
    .update({
      is_active: true,
      activation_token: null,
      token_expires: null,
    })
    .eq("id", user.id)

    if (updateError) {
      res.status(400).send({error: "Activation failed"});
    }

     return res.redirect("https://arbezzebra.dk/login");

  });
});

export default router;
