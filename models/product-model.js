const mongoose=require("mongoose");

const productSchema=mongoose.Schema({
    image:Buffer,
    name:String,
    price:Number,
    discount:{
        type:Number,
        default:0
    },
    bgcolor:String,
    panelcolor:String,
    textcolor:String,
    description:{
        type:String,
        default:"Premium quality design curated by Scatch artisans."
    },
    category:{
        type:String,
        default:"General"
    },
    sizes:{
        type:Array,
        default:["S", "M", "L", "XL"]
    },
    reviews:[{
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"user"
        },
        username:String,
        rating:Number,
        comment:String,
        date:{
            type:Date,
            default:Date.now
        }
    }],
    rating:{
        type:Number,
        default:0
    }
});

module.exports=mongoose.model("product",productSchema);