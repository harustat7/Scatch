const jwt = require("jsonwebtoken");
const ownerModel = require("../models/owner-model");

module.exports = async function(req, res, next) {
    if (!req.cookies.ownerToken) {
        req.flash("error", "You need to login as an admin first");
        return res.redirect("/");
    }

    try {
        let decoded = jwt.verify(req.cookies.ownerToken, process.env.JWT_KEY);
        let owner = await ownerModel
            .findOne({ email: decoded.email })
            .select("-password");
            
        if (!owner) {
            res.cookie("ownerToken", "", { 
                expires: new Date(0), 
                httpOnly: true, 
                secure: process.env.NODE_ENV === "production", 
                sameSite: "lax" 
            });
            req.flash("error", "Admin account not found.");
            return res.redirect("/");
        }
        
        req.owner = owner;
        next();
    } catch (err) {
        res.cookie("ownerToken", "", { 
            expires: new Date(0), 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax" 
        });
        req.flash("error", "Admin authentication failed.");
        res.redirect("/");
    }
};
