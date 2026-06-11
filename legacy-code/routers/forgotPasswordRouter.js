import { Router } from "express";
import crypto from "crypto";
import { Resend } from "resend";
import supabase from "../util/supabaseClient.js";
import { log } from "console";

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  console.log("Hallo");
  

  if (!email) {
    return res.status(400).send({ error: "Email is required" });
  }

  try {
    const { data: user, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (findError) {
      return res.status(200).send({ message: "If user exists, email sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        reset_token: resetToken,
        reset_token_expires: tokenExpires,
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    const logoUrl =
      "https://hekbxulfxbznntuahtqx.supabase.co/storage/v1/object/public/images/a-way-in.png";

    await resend.emails.send({
      from: "noreply@arbezzebra.dk",
      to: email,
      subject: "Reset your password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');</style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #001a0d; font-family: 'Montserrat', Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #001a0d;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1f16; border-radius: 12px; border: 1px solid #173626; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
                  <tr>
                    <td align="center" style="padding: 40px 0 20px 0;">
                      <img src="${logoUrl}" alt="AwayInVault Logo" width="100" style="display: block; border-radius: 8px;" />
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 40px;">
                      <h1 style="color: #6fbd96; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Lost your key?</h1>
                      <p style="color: #cccccc; font-size: 16px; line-height: 1.5; margin-top: 10px;">
                        It happens to the best of us. Click below to create a new password and regain access to the vault.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 30px 0 40px 0;">
                      <a href="${resetLink}" style="background-color: #6fbd96; color: #001a0d; padding: 14px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 16px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 40px 40px 40px;">
                      <p style="color: #555555; font-size: 12px; margin: 0;">
                        Or copy this link:<br>
                        <a href="${resetLink}" style="color: #6fbd96; text-decoration: none;">${resetLink}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    res.status(200).send({ message: "If user exists, email sent." });
  } catch (err) {
    console.error("Internal Error in forgot-password:", err);
    res.status(500).send({ error: "Internal error" });
  }
});

export default router;
