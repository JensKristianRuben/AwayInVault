import { Router } from "express";
import supabase from "../util/supabaseClient.js";
import { requireAuth } from "../util/authUtil.js";

const router = Router();

router.get("/api/passwords", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from("passwords")
      .select("*")
      .eq("user_id", userId);


    if (error) {
      console.error("Couldnt read passwords", error.message);
      return res.status(500).send({ error: "Database error" });
    }

    return res.status(200).send(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

router.get("/api/passwords/count", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const { count, error } = await supabase
      .from("passwords")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Couldnt read passwords:", error.message);
      return res.status(500).send({ error: "Database error" });
    }

    return res.status(200).send({ count });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

router.get("/api/passwords/expired", requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);

    const { data, error } = await supabase
      .from("passwords")
      .select("*")
      .eq("user_id", userId)
      .lt("updated_at", cutoff.toISOString());

    if (error) {
      console.error("Couldnt read passwords:", error.message);
      return res.status(500).send({ error: "Database error" });
    }
    
    return res.status(200).send(data);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

router.post("/api/passwords", requireAuth, async (req, res) => {
  const { website, username, encryptedPassword } = req.body;
  const userId = req.user.id;

  if (!website || !username || !encryptedPassword) {
    return res.status(400).send({ error: "Missing required attributes" });
  }

  try {
    const { data, error } = await supabase
      .from("passwords")
      .insert([
        {
          user_id: userId,
          website: website,
          username: username,
          encrypted_password: encryptedPassword,
        },
      ])
      .select("*")
      .single();

    if (error) {
      console.error("Supabase insert error:", error.message);
      return res.status(500).send({ error: "Database error" });
    }

    res.status(201).send(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

router.put("/api/passwords/:id", requireAuth, async (req, res) => {
  const passwordId = req.params.id;
  const { website, username, encrypted_password } = req.body;
  const userId = req.user.id;

  if (!website || !username || !encrypted_password) {
    return res.status(400).send({ error: "Missing required attributes" });
  }
  try {
    const { data, error } = await supabase
      .from("passwords")
      .update({
        website: website,
        username: username,
        encrypted_password: encrypted_password,
        updated_at: new Date()
      })
      .eq("id", passwordId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error.message);
      return res.status(500).send({ error: "Database error" });
    }

    if (!data) {
      return res
        .status(404)
        .send({ error: "Password not found or unauthorized" });
    }

    res.status(200).send(data);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

router.delete("/api/passwords/:id", requireAuth, async (req, res) => {
  const passwordId = req.params.id;

  try {
    const { data, error } = await supabase
      .from("passwords")
      .delete()
      .eq("id", passwordId)
      .select();

    if (error) {
      console.error("Supabase elete error:", error.message);
      return res.status(500).send({ error: "Database error" });
    }

    res.status(204).send({ data });
  } catch (error) {
    console.error("Server error:", err);
    res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
