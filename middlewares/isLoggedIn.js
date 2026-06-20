const jwt=require("jsonwebtoken");
const userModel=require("../models/user-model");

module.exports=async function(req,res,next){
    if(!req.cookies.token){
        req.flash("error","you need to login first");
        return res.redirect("/");
    }

    try{
        let decoded=jwt.verify(req.cookies.token,process.env.JWT_KEY);
        let user=await userModel
        .findOne({email:decoded.email})
        .select("-password");
        
        if(!user){
            res.cookie("token", "", { 
                expires: new Date(0), 
                httpOnly: true, 
                secure: process.env.NODE_ENV === "production", 
                sameSite: "lax" 
            });
            req.flash("error","User not found.");
            return res.redirect("/");
        }
        
        req.user=user;
        next();
    }catch(err){
        res.cookie("token", "", { 
            expires: new Date(0), 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax" 
        });
        req.flash("error","something went wrong.");
        res.redirect("/");
    }
}