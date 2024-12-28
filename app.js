const express=require("express");
const app=express();
const cookieParser=require("cookie-parser");
const path=require("path");
const ownersRouter=require("./routes/ownersRouter");
const productsRouter=require("./routes/productsRourer");
const usersRouter=require("./routes/usersRouter");

const db=require("./config/mongoose-connection");

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));
app.set("view engine","ejs");

app.use("/owners",ownerRouter);
app.use("/users",usersRouter);
app.use("products",productRouter);

app.get("/",function(req,res){
    res.send("hey");
});

app.listen(3000); 