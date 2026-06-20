const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const { generatetoken } = require("../utils/generatetoken");

module.exports.registeredUser = async function(req, res) {
    try {
        let { email, password, fullname } = req.body;

        // Backend validations
        if (!fullname || fullname.trim().length < 3) {
            req.flash("error", "Full name must be at least 3 characters long.");
            return res.redirect("/");
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            req.flash("error", "Please provide a valid email address.");
            return res.redirect("/");
        }
        if (!password || password.length < 6) {
            req.flash("error", "Password must be at least 6 characters long.");
            return res.redirect("/");
        }

        let user = await userModel.findOne({ email: email });
        if (user) {
            req.flash("error", "You already have an account, please login");
            return res.redirect("/");
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        let createdUser = await userModel.create({
            email,
            password: hash,
            fullname,
        });

        let token = generatetoken(createdUser);
        res.cookie("token", token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax" 
        });
        res.redirect("/shop");
    } catch (err) {
        console.error("Registration error:", err.message);
        req.flash("error", err.message || "An error occurred during registration");
        res.redirect("/");
    }
};

module.exports.loginUser = async function(req, res) {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            req.flash("error", "Please enter both email and password.");
            return res.redirect("/");
        }

        let user = await userModel.findOne({ email: email });
        if (!user) {
            req.flash("error", "Email or password incorrect");
            return res.redirect("/");
        }

        let isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            let token = generatetoken(user);
            res.cookie("token", token, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === "production", 
                sameSite: "lax" 
            });
            res.redirect("/shop");
        } else {
            req.flash("error", "Email or password incorrect");
            res.redirect("/");
        }
    } catch (err) {
        console.error("Login error:", err.message);
        req.flash("error", "An error occurred during login");
        res.redirect("/");
    }
};

module.exports.logout = function(req, res) {
    res.cookie("token", "", { 
        expires: new Date(0), 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "lax" 
    });
    res.redirect("/");
};
