const express=require("express");
const router = express.Router();
const upload=require("../config/multer-config");
const productModel=require("../models/product-model");
const isOwnerLoggedIn=require("../middlewares/isOwnerLoggedIn");

router.post("/create",isOwnerLoggedIn,upload.single("image"),async function(req,res){
    try{
        if (!req.file) {
            req.flash("error", "Product image is required.");
            return res.redirect("/owners/admin");
        }

        let { name, price, discount, bgcolor, panelcolor, textcolor, description, category, sizes } = req.body;

        if (!name || name.trim() === "") {
            req.flash("error", "Product name is required.");
            return res.redirect("/owners/admin");
        }

        let parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            req.flash("error", "Price must be a positive number.");
            return res.redirect("/owners/admin");
        }

        let parsedDiscount = Number(discount || 0);
        if (isNaN(parsedDiscount) || parsedDiscount < 0) {
            req.flash("error", "Discount must be a non-negative number.");
            return res.redirect("/owners/admin");
        }

        if (parsedDiscount > parsedPrice) {
            req.flash("error", "Discount cannot exceed original price.");
            return res.redirect("/owners/admin");
        }

        let sizeArray = ["S", "M", "L", "XL"];
        if (sizes && sizes.trim() !== "") {
            sizeArray = sizes.split(",").map(s => s.trim()).filter(s => s !== "");
        }

        let product = await productModel.create({
            image: req.file.buffer,
            name,
            price: parsedPrice,
            discount: parsedDiscount,
            bgcolor,
            panelcolor,
            textcolor,
            description: description ? description.trim() : "Premium quality design curated by Scatch artisans.",
            category: category ? category.trim() : "General",
            sizes: sizeArray
        });

        req.flash("success","Product created successfully.");
        res.redirect("/owners/admin");
    }catch(err){
        req.flash("error", err.message);
        res.redirect("/owners/admin");
    }
});

module.exports=router;
