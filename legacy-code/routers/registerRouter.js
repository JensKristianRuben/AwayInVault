import { Router } from "express";
import { hashPassword } from "../util/passwordUtil.js";
import supabase from "../util/supabaseClient.js";
import crypto from "crypto";
import { Resend } from "resend";

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/api/register", async (req, res) => {
  const email = req.body.registerEmail;
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
      return res.status(500).send({ error: "Could not create user" });
    }

    const activationLink = `http://localhost:5173/activation?token=${activationToken}`;

    const logoUrl =
      "https://hekbxulfxbznntuahtqx.supabase.co/storage/v1/object/public/images/a-way-in.png";

    const { error: mailError } = await resend.emails.send({
      from: "noreply@arbezzebra.dk",
      to: email,
      subject: "Activate your account",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* Vi importerer Montserrat for at matche din side */
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');
          </style>
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
                      <h1 style="color: #6fbd96; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">Welcome, Chief</h1>
                      <p style="color: #cccccc; font-size: 16px; line-height: 1.5; margin-top: 10px;">
                        You are one step away from securing your data. Activate your account to enter the vault.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding: 30px 0 40px 0;">
                      <a href="${activationLink}" style="background-color: #6fbd96; color: #001a0d; padding: 14px 30px; text-decoration: none; font-weight: 300; border-radius: 8px; display: inline-block; font-size: 16px;">
                        Activate Account
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding: 0 40px 40px 40px;">
                      <p style="color: #555555; font-size: 12px; margin: 0;">
                        Or copy this link to your browser:<br>
                        <a href="${activationLink}" style="color: #6fbd96; text-decoration: none;">${activationLink}</a>
                      </p>
                    </td>
                  </tr>

                </table>

                <p style="color: #444444; font-size: 12px; margin-top: 20px;">
                  &copy; ${new Date().getFullYear()} AwayInVault. Stay Secure.
                </p>

              </td>
            </tr>
          </table>

        </body>
        </html>
      `,
    });

    if (mailError) {
      return res
        .status(500)
        .send({ error: "User created but email failed to send" });
    }

    res.status(201).send({ data: "User created. Activation email sent." });
  } catch (error) {
    return res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
