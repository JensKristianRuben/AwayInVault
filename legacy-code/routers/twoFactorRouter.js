import { Router } from "express";
import supabase from "../util/supabaseClient.js";
import { authenticator } from "otplib";
import qrcode from "qrcode";


const router = Router();

router.post("/api/setup-2fa", async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send({ error: "Unauthorized" });
    }

    const { data: user, error } = await supabase 
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

    const secret = authenticator.generateSecret();

    const otpauth = authenticator.keyuri(user.email, "AwayInVault", secret);

    const imageUrl = await qrcode.toDataURL(otpauth);

    res.status(200).send({ secret: secret, qrcode: imageUrl })
})

router.post("/api/verify", async (req, res) => {
    const userId = req.session.userId;
    const { token, secret } = req.body;

    if (!userId) return res.status(401).send({ error: "Unauthorized" });


    const isValid = authenticator.verify({ token, secret });

    if (!isValid) {
        return res.status(400).send({ error: "Invalid code. Try again." });
    };

    const { error } = await supabase
        .from("users")
        .update({
            two_factor_secret: secret,
            two_factor_enabled: true
        })
        .eq("id", userId);

    if (error) return res.status(500).send({ error: "Database error" });

    res.send({ message: "Two factor auth is now enabled!" });

})


export default router;