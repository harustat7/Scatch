const express=require("express");
const app=express();
const cookieParser=require("cookie-parser");
const path=require("path");
const ownersRouter=require("./routes/ownersRouter");
const productsRouter=require("./routes/productsRouter");
const usersRouter=require("./routes/usersRouter");
const indexRouter=require("./routes/index");
const expressSession=require("express-session");
const flash=require("connect-flash");

require("dotenv").config();

const db=require("./config/mongoose-connection");

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,"public")));
app.use(
    expressSession({
        resave:false,
        saveUninitialized:false,
        secret:process.env.EXPRESS_SESSION_SECRET,
    })
);
app.use(flash());
app.set("view engine","ejs");

app.use("/",indexRouter); 
app.use("/owners",ownersRouter);
app.use("/users",usersRouter);
app.use("/products",productsRouter);

app.get("/",function(req,res){
    res.send("hey");
});

app.listen(5000); 