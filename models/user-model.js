const mongoose=require('mongoose');

const userSchema=mongoose.Schema({
    fullname:String,
    email:String,
    password:String,
    cart:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"product",
        // item
    }],
    order:{
        type:Array,
        default:[]
    },
    wishlist:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"product"
    }],
    defaultAddress:{
        fullname:String,
        address:String,
        city:String,
        zip:String,
        country:String
    },
    contact:Number,
    picture:Buffer,
    isAdmin:{
        type:Boolean,
        default:false
    }
}); 

module.exports=mongoose.model("user",userSchema);      