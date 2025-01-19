const userModel=require("../models/user-model");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const { generatetoken } = require("../utlis/generatetoken");


module.exports.registeredUser= async function(req,res){
   try{
   let {email,password,fullname}=req.body;

   let user=await userModel.findOne({email:email});
   if(user) return res.status(401).send("You already have an account,please login");

   bcrypt.genSalt(10,function(err,salt){
    if (err) return res.status(500).send(err.message);
    
    bcrypt.hash(password,salt,async function(err,hash){
        if(err) return res.status(500).send(err.message);
        try{
            let user= await userModel.create({
                email,
                password:hash,
                fullname,
            });

            let token=generatetoken(user._id);
        res.cookie("token",token,{httpOnly:true});
        res.redirect("/shop");
        }catch(dbError){
            console.error("Database error:",dbError.message);
            res.status(500).send("Error saving user to database");
        }
    });
})
}catch(err){
        console.error(err.message);
        res.status(500).send("An error occured during registrartion");
    }
};

module.exports.loginUser=async function(req,res){
    let {email,password}=req.body;

    let user=await userModel.findOne({email:email});
    if(!user) return res.send("Email or password incorrect");

    bcrypt.compare(password,user.password,function(err,result){
        if (result) {
            let token=generatetoken(user);
            res
            .cookie("token",token)
            .redirect("/shop");
        }
        else{
            return res.send("Email or password incorrect");
        }
    });
};

module.exports.logout=function(req,res){
    res.cookie("token","");
    res.redirect("/");
};