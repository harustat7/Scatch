const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Require database connection
const db = require("./config/mongoose-connection");

const userModel = require("./models/user-model");
const ownerModel = require("./models/owner-model");
const productModel = require("./models/product-model");

// Read generated white background images as buffers
const hoodieImage = fs.readFileSync("C:\\Users\\harus\\.gemini\\antigravity-ide\\brain\\5cff1c32-f5fc-424b-b34a-22059feb256d\\black_hoodie_white_bg_1781879497970.png");
const denimJacketImage = fs.readFileSync("C:\\Users\\harus\\.gemini\\antigravity-ide\\brain\\3eec483d-6622-4980-b42d-d5962e4d0216\\denim_jacket_1781952162731.png");
const sneakerImage = fs.readFileSync("C:\\Users\\harus\\.gemini\\antigravity-ide\\brain\\5cff1c32-f5fc-424b-b34a-22059feb256d\\white_sneaker_white_bg_1781879514480.png");
const runningShoesImage = fs.readFileSync("C:\\Users\\harus\\.gemini\\antigravity-ide\\brain\\3eec483d-6622-4980-b42d-d5962e4d0216\\running_shoes_1781952176229.png");
const walletImage = fs.readFileSync("C:\\Users\\harus\\.gemini\\antigravity-ide\\brain\\5cff1c32-f5fc-424b-b34a-22059feb256d\\leather_wallet_white_bg_1781879528355.png");
const leatherBeltImage = fs.readFileSync("C:\\Users\\harus\\.gemini\\antigravity-ide\\brain\\3eec483d-6622-4980-b42d-d5962e4d0216\\leather_belt_1781952188529.png");

async function seed() {
    try {
        console.log("Starting database seed with white background images...");
        
        // 1. Create Default Owner
        let owners = await ownerModel.find();
        if (owners.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("password123", salt);
            
            await ownerModel.create({
                fullname: "Scatch Admin",
                email: "admin@scatch.com",
                password: hashedPassword,
                gstin: "22AAAAA1111A1Z1"
            });
            console.log("✅ Default owner created: admin@scatch.com / password123");
        } else {
            console.log("ℹ️ Owner(s) already exist. Skipping owner creation.");
        }

        // 2. Create Default User
        let user = await userModel.findOne({ email: "user@scatch.com" });
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("password123", salt);
            
            await userModel.create({
                fullname: "Test User",
                email: "user@scatch.com",
                password: hashedPassword,
                contact: 9876543210
            });
            console.log("✅ Default user created: user@scatch.com / password123");
        } else {
            console.log("ℹ️ Default user already exists. Skipping user creation.");
        }

        // 3. Create Sample Products (Clear existing ones first to ensure new images are updated)
        await productModel.deleteMany({});
        const sampleProducts = [
            {
                name: "Premium Black Hoodie",
                price: 1500,
                discount: 300,
                bgcolor: "#f4f4f5", // Light Gray (Zinc 100)
                panelcolor: "#ffffff", // Crisp White
                textcolor: "#18181b", // Dark Zinc
                category: "Clothing",
                image: hoodieImage
            },
            {
                name: "Urban Denim Jacket",
                price: 2499,
                discount: 400,
                bgcolor: "#eff6ff", // Soft Blue (Blue 50)
                panelcolor: "#ffffff",
                textcolor: "#18181b",
                category: "Clothing",
                image: denimJacketImage
            },
            {
                name: "Classic White Sneakers",
                price: 2999,
                discount: 500,
                bgcolor: "#f4f4f5", // Light Gray (Zinc 100)
                panelcolor: "#ffffff",
                textcolor: "#18181b",
                category: "Footwear",
                image: sneakerImage
            },
            {
                name: "Sporty Running Shoes",
                price: 3500,
                discount: 700,
                bgcolor: "#fdf2f8", // Soft Pink (Pink 50)
                panelcolor: "#ffffff",
                textcolor: "#18181b",
                category: "Footwear",
                image: runningShoesImage
            },
            {
                name: "Minimalist Leather Wallet",
                price: 999,
                discount: 150,
                bgcolor: "#fef3c7", // Soft Amber (Amber 100)
                panelcolor: "#ffffff",
                textcolor: "#18181b",
                category: "Accessories",
                image: walletImage
            },
            {
                name: "Classic Leather Belt",
                price: 799,
                discount: 100,
                bgcolor: "#fbf7f5", // Soft Beige/Warm Gray
                panelcolor: "#ffffff",
                textcolor: "#18181b",
                category: "Accessories",
                image: leatherBeltImage
            }
        ];

        await productModel.insertMany(sampleProducts);
        console.log("✅ Sample products seeded with white background images successfully!");
        console.log("Database seeding completed successfully!");
    } catch (error) {
        console.error("Error seeding database:", error);
    }
}

// Wait for database connection to be established before seeding
db.once("open", () => {
    seed();
});
