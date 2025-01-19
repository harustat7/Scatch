const express=require("express");
const router = express.Router();
const userModel=require("../models/user-model");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const { generatetoken } = require("../utlis/generatetoken");
const {registeredUser, loginUser, logout}=require("../controllers/authContoller");

router.get("/",function(req,res){
    res.send("hey");
});

router.post("/register",registeredUser);

router.post("/login",loginUser);

router.get("/logout",logout);

module.exports=router;
