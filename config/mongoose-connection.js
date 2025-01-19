const mongoose=require('mongoose');
const dbgr=require("debug")("development:mongoose");
const config=require("config");

mongoose
.connect(`${config.get("MONGODB_URI")}/scatch`)
.then(function(){
    dbgr(connected);
})
.catch(function(err){
    dbgr(err);
})

module.exports=mongoose.connection;

// for console.log on other machines you need to set up an environment variable,set DEBUG=development:*