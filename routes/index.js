const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const upload = require("../config/multer-config");

router.get("/", function(req, res) {
    let error = req.flash("error");
    res.render("index", { error, loggedin: false });
});

router.get("/shop", isLoggedIn, async function(req, res) {
    try {
        let filterQuery = {};
        
        if (req.query.search && req.query.search.trim() !== "") {
            filterQuery.name = { $regex: req.query.search.trim(), $options: "i" };
        }

        if (req.query.filter === "discount") {
            filterQuery.discount = { $gt: 0 };
        }

        if (req.query.category && req.query.category.trim() !== "") {
            filterQuery.category = req.query.category.trim();
        }

        let minPrice = req.query.minPrice && req.query.minPrice.trim() !== "" ? Number(req.query.minPrice) : NaN;
        let maxPrice = req.query.maxPrice && req.query.maxPrice.trim() !== "" ? Number(req.query.maxPrice) : NaN;
        if (!isNaN(minPrice) || !isNaN(maxPrice)) {
            filterQuery.price = {};
            if (!isNaN(minPrice)) {
                filterQuery.price.$gte = minPrice;
            }
            if (!isNaN(maxPrice)) {
                filterQuery.price.$lte = maxPrice;
            }
        }

        let products = await productModel.find(filterQuery);

        if (req.query.sortby === "newest") {
            products.sort((a, b) => b._id.getTimestamp() - a._id.getTimestamp());
        } else if (req.query.sortby === "price_lh") {
            products.sort((a, b) => Number(a.price - a.discount) - Number(b.price - b.discount));
        } else if (req.query.sortby === "price_hl") {
            products.sort((a, b) => Number(b.price - b.discount) - Number(a.price - a.discount));
        } else if (req.query.sortby === "rating") {
            products.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        }

        let categories = await productModel.distinct("category");
        let user = await userModel.findOne({ email: req.user.email });
        let wishlistIds = (user.wishlist || []).map(id => id.toString());

        let success = req.flash("success");
        let error = req.flash("error");
        
        res.render("shop", { 
            products, 
            categories,
            wishlistIds,
            success, 
            error, 
            loggedin: true, 
            cartCount: user.cart.length,
            query: req.query 
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get("/wishlist/toggle/:productid", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        let index = user.wishlist.indexOf(req.params.productid);
        if (index > -1) {
            user.wishlist.splice(index, 1);
            await user.save();
            req.flash("success", "Removed from wishlist");
        } else {
            user.wishlist.push(req.params.productid);
            await user.save();
            req.flash("success", "Added to wishlist");
        }
        res.redirect(req.headers.referer || "/shop");
    } catch (err) {
        req.flash("error", "Failed to update wishlist");
        res.redirect("/shop");
    }
});

router.get("/wishlist", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email }).populate("wishlist");
        let success = req.flash("success");
        let error = req.flash("error");
        res.render("wishlist", {
            user,
            success,
            error,
            loggedin: true,
            cartCount: user.cart.length
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get("/cart", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel
            .findOne({ email: req.user.email })
            .populate("cart");

        // Filter out null items in case products were deleted by an admin
        user.cart = user.cart.filter(item => item !== null);

        let totalMRP = 0;
        let totalDiscount = 0;
        user.cart.forEach(item => {
            totalMRP += Number(item.price || 0);
            totalDiscount += Number(item.discount || 0);
        });
        
        let platformFee = user.cart.length > 0 ? 20 : 0;
        let bill = totalMRP - totalDiscount + platformFee;

        // Group cart items for proper quantity display in the cart view
        let cartItems = [];
        let itemMap = {};
        user.cart.forEach(item => {
            let id = item._id.toString();
            if (itemMap[id]) {
                itemMap[id].quantity += 1;
            } else {
                itemMap[id] = { product: item, quantity: 1 };
                cartItems.push(itemMap[id]);
            }
        });

        let success = req.flash("success");
        let error = req.flash("error");

        res.render("cart", { 
            user, 
            cartItems,
            bill, 
            totalMRP, 
            totalDiscount, 
            platformFee, 
            success, 
            error, 
            loggedin: true,
            cartCount: user.cart.length
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get("/addtocart/:productid", isLoggedIn, async function(req, res) {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.productid)) {
            req.flash("error", "Invalid product ID.");
            return res.redirect(req.headers.referer || "/shop");
        }

        let product = await productModel.findById(req.params.productid);
        if (!product) {
            req.flash("error", "Product not found.");
            return res.redirect(req.headers.referer || "/shop");
        }

        let user = await userModel.findOne({ email: req.user.email });
        user.cart.push(req.params.productid);
        await user.save();
        req.flash("success", "Added to cart");
        res.redirect(req.headers.referer || "/shop");
    } catch (err) {
        req.flash("error", "Failed to add to cart");
        res.redirect(req.headers.referer || "/shop");
    }
});

router.get("/cart/remove/:productid", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        // Remove all instances of this product from cart
        user.cart = user.cart.filter(id => id.toString() !== req.params.productid);
        await user.save();
        req.flash("success", "Product removed from cart");
        res.redirect("/cart");
    } catch (err) {
        req.flash("error", "Failed to remove product");
        res.redirect("/cart");
    }
});

router.get("/cart/increment/:productid", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        user.cart.push(req.params.productid);
        await user.save();
        res.redirect("/cart");
    } catch (err) {
        req.flash("error", "Failed to update quantity");
        res.redirect("/cart");
    }
});

router.get("/cart/decrement/:productid", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        let index = user.cart.indexOf(req.params.productid);
        if (index > -1) {
            user.cart.splice(index, 1);
            await user.save();
        }
        res.redirect("/cart");
    } catch (err) {
        req.flash("error", "Failed to update quantity");
        res.redirect("/cart");
    }
});

const COUPONS = {
    SAVE10: { code: "SAVE10", type: "percent", value: 10, minCart: 0, description: "10% off on all products" },
    WELCOME20: { code: "WELCOME20", type: "percent", value: 20, minCart: 0, description: "20% off on all products" }
};


function calculateCartBill(cart, appliedCouponCode = null, paymentMethod = null) {
    let totalMRP = 0;
    let totalDiscount = 0;
    cart.forEach(item => {
        if (item) {
            totalMRP += Number(item.price || 0);
            totalDiscount += Number(item.discount || 0);
        }
    });

    let subtotal = totalMRP - totalDiscount;
    let platformFee = cart.length > 0 ? 20 : 0;
    
    let couponDiscount = 0;
    let couponApplied = null;
    if (appliedCouponCode && COUPONS[appliedCouponCode.toUpperCase()]) {
        let coupon = COUPONS[appliedCouponCode.toUpperCase()];
        if (subtotal >= coupon.minCart) {
            couponApplied = coupon;
            if (coupon.type === "percent") {
                couponDiscount = Math.round(subtotal * (coupon.value / 100));
            } else if (coupon.type === "flat") {
                couponDiscount = coupon.value;
            }
        }
    }

    let cashCharge = (paymentMethod === "Cash" && cart.length > 0) ? 50 : 0;
    let bill = Math.max(0, subtotal - couponDiscount + platformFee + cashCharge);

    return {
        totalMRP,
        totalDiscount,
        platformFee,
        couponCode: couponApplied ? couponApplied.code : null,
        couponDiscount,
        cashCharge,
        bill
    };
}

router.get("/checkout", isLoggedIn, function(req, res) {
    res.redirect("/checkout/address");
});

router.get("/checkout/address", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel
            .findOne({ email: req.user.email })
            .populate("cart");

        user.cart = user.cart.filter(item => item !== null);

        if (user.cart.length === 0) {
            req.flash("error", "Your cart is empty.");
            return res.redirect("/cart");
        }

        let totals = calculateCartBill(user.cart);

        let success = req.flash("success");
        let error = req.flash("error");

        res.render("checkout-address", { 
            user, 
            bill: totals.bill, 
            totalMRP: totals.totalMRP, 
            totalDiscount: totals.totalDiscount, 
            platformFee: totals.platformFee, 
            success, 
            error, 
            loggedin: true,
            cartCount: user.cart.length,
            shippingAddress: req.session.shippingAddress || {
                fullname: (user.defaultAddress && user.defaultAddress.fullname) || user.fullname || "",
                address: (user.defaultAddress && user.defaultAddress.address) || "",
                city: (user.defaultAddress && user.defaultAddress.city) || "",
                zip: (user.defaultAddress && user.defaultAddress.zip) || "",
                country: (user.defaultAddress && user.defaultAddress.country) || ""
            }
        });
    } catch (err) {
        req.flash("error", "Failed to load address page.");
        res.redirect("/cart");
    }
});

router.post("/checkout/address", isLoggedIn, async function(req, res) {
    try {
        let { fullname, address, city, zip, country } = req.body;

        if (!fullname || fullname.trim().length < 3) {
            req.flash("error", "Recipient name must be at least 3 characters long.");
            return res.redirect("/checkout/address");
        }
        if (!address || address.trim().length < 5) {
            req.flash("error", "Street address must be at least 5 characters long.");
            return res.redirect("/checkout/address");
        }
        if (!city || city.trim().length < 2) {
            req.flash("error", "City must be at least 2 characters long.");
            return res.redirect("/checkout/address");
        }
        if (!zip || !/^[0-9]{6}$/.test(zip)) {
            req.flash("error", "ZIP code must be a valid 6-digit number.");
            return res.redirect("/checkout/address");
        }
        if (!country || country.trim().length < 2) {
            req.flash("error", "Country must be at least 2 characters long.");
            return res.redirect("/checkout/address");
        }

        req.session.shippingAddress = { fullname, address, city, zip, country };
        res.redirect("/checkout/payment");
    } catch (err) {
        req.flash("error", "An error occurred while saving the address.");
        res.redirect("/checkout/address");
    }
});

router.get("/checkout/payment", isLoggedIn, async function(req, res) {
    try {
        if (!req.session.shippingAddress) {
            req.flash("error", "Please enter your shipping address first.");
            return res.redirect("/checkout/address");
        }

        let user = await userModel
            .findOne({ email: req.user.email })
            .populate("cart");

        user.cart = user.cart.filter(item => item !== null);

        if (user.cart.length === 0) {
            req.flash("error", "Your cart is empty.");
            return res.redirect("/cart");
        }

        let appliedCouponCode = req.session.couponCode || null;
        let totals = calculateCartBill(user.cart, appliedCouponCode);

        let success = req.flash("success");
        let error = req.flash("error");

        res.render("checkout-payment", {
            user,
            shippingAddress: req.session.shippingAddress,
            couponCode: appliedCouponCode,
            totals,
            success,
            error,
            loggedin: true,
            cartCount: user.cart.length
        });
    } catch (err) {
        req.flash("error", "Failed to load payment page.");
        res.redirect("/checkout/address");
    }
});

router.post("/checkout/apply-coupon", isLoggedIn, async function(req, res) {
    try {
        let { couponCode } = req.body;
        if (!couponCode || couponCode.trim() === "") {
            req.flash("error", "Please enter a coupon code.");
            return res.redirect("/checkout/payment");
        }

        let code = couponCode.trim().toUpperCase();
        let coupon = COUPONS[code];
        if (!coupon) {
            req.flash("error", "Invalid coupon code.");
            return res.redirect("/checkout/payment");
        }

        let user = await userModel
            .findOne({ email: req.user.email })
            .populate("cart");
        user.cart = user.cart.filter(item => item !== null);

        let totalMRP = 0;
        let totalDiscount = 0;
        user.cart.forEach(item => {
            if (item) {
                totalMRP += Number(item.price || 0);
                totalDiscount += Number(item.discount || 0);
            }
        });
        let subtotal = totalMRP - totalDiscount;

        if (subtotal < coupon.minCart) {
            req.flash("error", `Coupon ${code} requires a minimum purchase of ₹${coupon.minCart}.`);
            return res.redirect("/checkout/payment");
        }

        req.session.couponCode = code;
        req.flash("success", `Coupon "${code}" applied successfully!`);
        res.redirect("/checkout/payment");
    } catch (err) {
        req.flash("error", "Failed to apply coupon.");
        res.redirect("/checkout/payment");
    }
});

router.post("/checkout/remove-coupon", isLoggedIn, function(req, res) {
    req.session.couponCode = null;
    req.flash("success", "Coupon removed successfully.");
    res.redirect("/checkout/payment");
});

router.post("/checkout/place-order", isLoggedIn, async function(req, res) {
    try {
        if (!req.session.shippingAddress) {
            req.flash("error", "Shipping address is missing. Please enter address details.");
            return res.redirect("/checkout/address");
        }

        let { paymentMethod, cardholder, cardnumber, expiry, cvv, upiId } = req.body;

        if (!["Cash", "Card", "UPI"].includes(paymentMethod)) {
            req.flash("error", "Please select a valid payment method.");
            return res.redirect("/checkout/payment");
        }

        let paymentInfo = { paymentMethod };

        if (paymentMethod === "Card") {
            if (!cardholder || cardholder.trim().length < 3) {
                req.flash("error", "Please enter a valid cardholder name.");
                return res.redirect("/checkout/payment");
            }
            if (!cardnumber || !/^[0-9]{16}$/.test(cardnumber)) {
                req.flash("error", "Please enter a valid 16-digit card number.");
                return res.redirect("/checkout/payment");
            }
            if (!expiry || !/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(expiry)) {
                req.flash("error", "Please enter a valid expiry date (MM/YY).");
                return res.redirect("/checkout/payment");
            }
            if (!cvv || !/^[0-9]{3}$/.test(cvv)) {
                req.flash("error", "Please enter a valid 3-digit CVV.");
                return res.redirect("/checkout/payment");
            }
            paymentInfo.cardholder = cardholder;
            paymentInfo.lastFourDigits = cardnumber.slice(-4);
        } else if (paymentMethod === "UPI") {
            if (!upiId || !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId)) {
                req.flash("error", "Please enter a valid UPI ID (e.g., name@okaxis).");
                return res.redirect("/checkout/payment");
            }
            paymentInfo.upiId = upiId;
        }

        let user = await userModel.findOne({ email: req.user.email }).populate("cart");
        user.cart = user.cart.filter(item => item !== null);

        if (user.cart.length === 0) {
            req.flash("error", "Your cart is empty.");
            return res.redirect("/cart");
        }

        let appliedCouponCode = req.session.couponCode || null;
        let totals = calculateCartBill(user.cart, appliedCouponCode, paymentMethod);

        let orderDetails = {
            products: [...user.cart.map(item => item._id)],
            shippingAddress: req.session.shippingAddress,
            paymentMethod: paymentMethod,
            paymentInfo: paymentInfo,
            couponCode: totals.couponCode,
            couponDiscount: totals.couponDiscount,
            cashCharge: totals.cashCharge,
            platformFee: totals.platformFee,
            bill: totals.bill,
            date: new Date(),
            status: "Processing"
        };

        user.order.push(orderDetails);
        user.cart = []; // Empty cart
        await user.save();

        req.session.shippingAddress = null;
        req.session.couponCode = null;

        req.flash("success", "Order placed successfully! Thank you for shopping with us.");
        res.redirect("/orders");
    } catch (err) {
        req.flash("error", "Failed to place order. Please try again.");
        res.redirect("/checkout/payment");
    }
});

router.get("/orders", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        
        let ordersList = [];
        for (let ord of (user.order || [])) {
            let resolvedProducts = [];
            for (let prodId of (ord.products || [])) {
                let prod = await productModel.findById(prodId);
                if (prod) {
                    resolvedProducts.push(prod);
                }
            }
            ordersList.push({
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
                products: resolvedProducts
            });
        }

        let success = req.flash("success");
        let error = req.flash("error");

        res.render("orders", {
            user,
            orders: ordersList.reverse(), 
            success,
            error,
            loggedin: true,
            cartCount: user.cart.length
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.get("/products/details/:productid", isLoggedIn, async function(req, res) {
    try {
        let product = await productModel.findById(req.params.productid);
        if (!product) {
            req.flash("error", "Product not found.");
            return res.redirect("/shop");
        }

        let user = await userModel.findOne({ email: req.user.email });
        let wishlistIds = (user.wishlist || []).map(id => id.toString());

        let success = req.flash("success");
        let error = req.flash("error");

        res.render("product-details", {
            product,
            wishlistIds,
            success,
            error,
            loggedin: true,
            cartCount: user.cart.length
        });
    } catch (err) {
        req.flash("error", "Failed to load product details.");
        res.redirect("/shop");
    }
});

router.post("/products/review/:productid", isLoggedIn, async function(req, res) {
    try {
        let { rating, comment } = req.body;
        let parsedRating = Number(rating);

        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            req.flash("error", "Please provide a rating between 1 and 5 stars.");
            return res.redirect(`/products/details/${req.params.productid}`);
        }

        let product = await productModel.findById(req.params.productid);
        if (!product) {
            req.flash("error", "Product not found.");
            return res.redirect("/shop");
        }

        product.reviews.push({
            user: req.user._id,
            username: req.user.fullname,
            rating: parsedRating,
            comment: comment || "",
            date: new Date()
        });

        // Recalculate average rating
        let totalRating = 0;
        product.reviews.forEach(rev => {
            totalRating += rev.rating;
        });
        product.rating = totalRating / product.reviews.length;

        await product.save();
        req.flash("success", "Review submitted successfully!");
        res.redirect(`/products/details/${req.params.productid}`);
    } catch (err) {
        req.flash("error", "Failed to submit review.");
        res.redirect(`/products/details/${req.params.productid}`);
    }
});

router.get("/profile", isLoggedIn, async function(req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        let success = req.flash("success");
        let error = req.flash("error");
        res.render("profile", {
            user,
            success,
            error,
            loggedin: true,
            cartCount: user.cart.length
        });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

router.post("/profile/update", isLoggedIn, upload.single("picture"), async function(req, res) {
    try {
        let { fullname, contact, address_fullname, address, city, zip, country } = req.body;
        
        if (!fullname || fullname.trim().length < 3) {
            req.flash("error", "Full name must be at least 3 characters long.");
            return res.redirect("/profile");
        }

        let user = await userModel.findOne({ email: req.user.email });
        user.fullname = fullname.trim();
        
        if (contact) {
            user.contact = Number(contact);
        }

        if (req.file) {
            user.picture = req.file.buffer;
        }

        // Set default shipping address if fields are present
        user.defaultAddress = {
            fullname: address_fullname ? address_fullname.trim() : "",
            address: address ? address.trim() : "",
            city: city ? city.trim() : "",
            zip: zip ? zip.trim() : "",
            country: country ? country.trim() : ""
        };

        await user.save();
        req.flash("success", "Profile updated successfully!");
        res.redirect("/profile");
    } catch (err) {
        req.flash("error", "Failed to update profile details.");
        res.redirect("/profile");
    }
});

router.get("/logout", isLoggedIn, function(req, res) {
    res.redirect("/users/logout");
});

// Alias redirects to fulfill scratchpad specs
router.get("/admin", function(req, res) {
    if (req.cookies && req.cookies.ownerToken) {
        res.redirect("/owners/admin");
    } else {
        res.redirect("/owners/login");
    }
});

router.get("/owner/products", function(req, res) {
    res.redirect("/owners/products");
});

router.get("/owner/admin", function(req, res) {
    res.redirect("/owners/admin");
});

module.exports = router;