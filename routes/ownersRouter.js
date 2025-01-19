const express=require("express");
const router = express.Router();
const ownerModel=require("../models/owner-model");

router.get("/",function(req,res){
    res.send("hey");
});

// if(process.env === "development"){
//     console.log("hey");
// }
// console.log(process.env.NODE_ENV);
// IF ITS GIVES UNDEFINED,enc variable is not setup
// to set it up use $env:NODE_ENV='development'
if(process.env.NODE_ENV==="development"){
router.post("/create",async function(req,res){
  let owners= await ownerModel.find();
  if(owners.length>0) {
    return res
    .status(503)
    .send("You don't have permission to create a new owner");
  }

  let {fullname,email,password}=req.body;

  let createdowner=await ownerModel.create({
    fullname,
    email,
    password,
  });
  res.status(201).send(createdowner);
});
}

router.get("/admin",function(req,res){
  let success=req.flash("success");
  res.render("createproducts",{ success});
});

module.exports=router;
