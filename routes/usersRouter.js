const express=require("express");
const router = express.Router();
const {registeredUser, loginUser, logout}=require("../controllers/authController");

router.get("/",function(req,res){
    res.send("hey");
});

router.post("/register",registeredUser);

router.post("/login",loginUser);

router.get("/logout",logout);

const isLoggedIn = require("../middlewares/isLoggedIn");
router.get("/cart", isLoggedIn, function(req, res) {
    res.redirect("/cart");
});

module.exports=router;
