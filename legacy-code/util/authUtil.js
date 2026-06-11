export function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).send("You must be logged in");
    }
    req.user = { 
        id: req.session.userId 
    };

    next();
};