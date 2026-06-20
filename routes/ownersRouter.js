const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const isOwnerLoggedIn = require("../middlewares/isOwnerLoggedIn");
const upload = require("../config/multer-config");

router.get("/", function(req, res) {
    res.redirect("/owners/login");
});

router.get("/login", function(req, res) {
    let error = req.flash("error");
    res.render("owner-login", { error, loggedin: false });
});

router.post("/login", async function(req, res) {
    try {
        let { email, password } = req.body;
        let owner = await ownerModel.findOne({ email });
        if (!owner) {
            req.flash("error", "Invalid admin credentials");
            return res.redirect("/owners/login");
        }

        let isMatch = await bcrypt.compare(password, owner.password);
        if (!isMatch) {
            req.flash("error", "Invalid admin credentials");
            return res.redirect("/owners/login");
        }

        let token = jwt.sign({ email: owner.email, id: owner._id }, process.env.JWT_KEY, { expiresIn: "7d" });
        res.cookie("ownerToken", token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax" 
        });
        res.redirect("/owners/products");
    } catch (err) {
        req.flash("error", "An error occurred during login");
        res.redirect("/owners/login");
    }
});

router.get("/logout", function(req, res) {
    res.cookie("ownerToken", "", { 
        expires: new Date(0), 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production", 
        sameSite: "lax" 
    });
    res.redirect("/");
});

if (process.env.NODE_ENV === "development") {
    router.post("/create", async function(req, res) {
        try {
            let owners = await ownerModel.find();
            if (owners.length > 0) {
                return res
                    .status(503)
                    .send("You don't have permission to create a new owner");
            }

            let { fullname, email, password } = req.body;

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            let createdowner = await ownerModel.create({
                fullname,
                email,
                password: hashedPassword,
            });
            res.status(201).send(createdowner);
        } catch (err) {
            res.status(500).send(err.message);
        }
    });
}

router.get("/admin", isOwnerLoggedIn, function(req, res) {
    let success = req.flash("success");
    let error = req.flash("error");
    res.render("createproducts", { success, error, loggedin: true });
});

router.get("/products", isOwnerLoggedIn, async function(req, res) {
    try {
        let products = await productModel.find();
        let success = req.flash("success");
        let error = req.flash("error");
        res.render("admin", { products, success, error, loggedin: true });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get("/products/delete/:productid", isOwnerLoggedIn, async function(req, res) {
    try {
        await productModel.findByIdAndDelete(req.params.productid);
        await userModel.updateMany({}, { $pull: { cart: req.params.productid } });
        req.flash("success", "Product deleted successfully");
        res.redirect("/owners/products");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get("/orders", isOwnerLoggedIn, async function(req, res) {
    try {
        let users = await userModel.find();
        let allOrders = [];
        
        for (let user of users) {
            if (user.order && user.order.length > 0) {
                user.order.forEach((ord, index) => {
                    allOrders.push({
                        user: { fullname: user.fullname, email: user.email, id: user._id },
                        index: index,
                        shippingAddress: ord.shippingAddress,
                        paymentMethod: ord.paymentMethod,
                        paymentInfo: ord.paymentInfo,
                        couponCode: ord.couponCode,
                        couponDiscount: ord.couponDiscount,
                        cashCharge: ord.cashCharge,
                        platformFee: ord.platformFee,
                        bill: ord.bill,
                        date: ord.date,
                        status: ord.status || "Processing",
                        products: ord.products || []
                    });
                });
            }
        }
        
        allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        for (let ord of allOrders) {
            let resolvedProducts = [];
            for (let prodId of ord.products) {
                let prod = await productModel.findById(prodId);
                if (prod) {
                    resolvedProducts.push(prod);
                }
            }
            ord.resolvedProducts = resolvedProducts;
        }

        let success = req.flash("success");
        let error = req.flash("error");

        res.render("admin-orders", {
            orders: allOrders,
            success,
            error,
            loggedin: true
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post("/orders/update/:userId/:orderIndex", isOwnerLoggedIn, async function(req, res) {
    try {
        let { status } = req.body;
        if (!["Processing", "Shipped", "Delivered"].includes(status)) {
            req.flash("error", "Invalid order status value.");
            return res.redirect("/owners/orders");
        }

        let user = await userModel.findById(req.params.userId);
        if (!user) {
            req.flash("error", "Customer account not found.");
            return res.redirect("/owners/orders");
        }

        let index = Number(req.params.orderIndex);
        if (user.order && user.order[index]) {
            user.order[index].status = status;
            user.markModified("order");
            await user.save();
            req.flash("success", "Order status updated successfully.");
        } else {
            req.flash("error", "Order not found.");
        }
        res.redirect("/owners/orders");
    } catch (err) {
        req.flash("error", "An error occurred while updating order status.");
        res.redirect("/owners/orders");
    }
});

router.get("/products/edit/:productid", isOwnerLoggedIn, async function(req, res) {
    try {
        let product = await productModel.findById(req.params.productid);
        if (!product) {
            req.flash("error", "Product not found.");
            return res.redirect("/owners/products");
        }
        let success = req.flash("success");
        let error = req.flash("error");
        res.render("edit-product", { product, success, error, loggedin: true });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post("/products/edit/:productid", isOwnerLoggedIn, upload.single("image"), async function(req, res) {
    try {
        let { name, price, discount, bgcolor, panelcolor, textcolor, description, category, sizes } = req.body;
        
        let product = await productModel.findById(req.params.productid);
        if (!product) {
            req.flash("error", "Product not found.");
            return res.redirect("/owners/products");
        }

        if (!name || name.trim() === "") {
            req.flash("error", "Product name is required.");
            return res.redirect(`/owners/products/edit/${req.params.productid}`);
        }

        let parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            req.flash("error", "Price must be a positive number.");
            return res.redirect(`/owners/products/edit/${req.params.productid}`);
        }

        let parsedDiscount = Number(discount || 0);
        if (isNaN(parsedDiscount) || parsedDiscount < 0) {
            req.flash("error", "Discount must be a non-negative number.");
            return res.redirect(`/owners/products/edit/${req.params.productid}`);
        }

        if (parsedDiscount > parsedPrice) {
            req.flash("error", "Discount cannot exceed original price.");
            return res.redirect(`/owners/products/edit/${req.params.productid}`);
        }

        let sizeArray = ["S", "M", "L", "XL"];
        if (sizes && sizes.trim() !== "") {
            sizeArray = sizes.split(",").map(s => s.trim()).filter(s => s !== "");
        }

        // Prepare updates
        product.name = name.trim();
        product.price = parsedPrice;
        product.discount = parsedDiscount;
        product.bgcolor = bgcolor;
        product.panelcolor = panelcolor;
        product.textcolor = textcolor;
        product.description = description ? description.trim() : "Premium quality design curated by Scatch artisans.";
        product.category = category ? category.trim() : "General";
        product.sizes = sizeArray;

        // Update image if a new file is uploaded
        if (req.file) {
            product.image = req.file.buffer;
        }

        await product.save();
        req.flash("success", "Product updated successfully!");
        res.redirect("/owners/products");
    } catch (err) {
        req.flash("error", "An error occurred while updating the product.");
        res.redirect(`/owners/products/edit/${req.params.productid}`);
    }
});

module.exports = router;
