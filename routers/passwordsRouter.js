import { Router } from 'express';
import { requireAuth } from '../util/authUtil.js'

const router = Router();

router.get("/passwords", requireAuth, (req, res) => {

    res.send({data: "passwords"})
});

export default router;