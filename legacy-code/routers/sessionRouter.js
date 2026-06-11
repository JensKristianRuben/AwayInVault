import { Router } from "express";

const router = Router();

router.get("/api/session", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ user: null });
  }

  res.status(200).json({
    user: {
      id: req.session.userId,
      twoFactorEnabled: req.session.twoFactorEnabled,
    }
  });
});

export default router;
