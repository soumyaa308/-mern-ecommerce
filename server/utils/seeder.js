import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Product from "../models/Product.js";
import User from "../models/User.js";

const sampleProducts = [
  {
    name: "Classic Cotton T-Shirt",
    description: "A soft, breathable 100% cotton t-shirt, perfect for everyday wear. Pre-shrunk fabric holds its shape wash after wash.",
    price: 999,
    discountPrice: 799,
    category: "clothing",
    brand: "Everwear",
    sku: "TSHIRT-001",
    stock: 150,
    images: [{ url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600" }],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White", "Navy"],
    rating: 4.5,
    numReviews: 128,
    isFeatured: true,
  },
  {
    name: "Running Sneakers Pro",
    description: "Lightweight running shoes with responsive cushioning and breathable mesh upper for all-day comfort on any run.",
    price: 3499,
    category: "footwear",
    brand: "Stride",
    sku: "SHOE-002",
    stock: 80,
    images: [{ url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600" }],
    sizes: ["7", "8", "9", "10", "11"],
    colors: ["Black", "Red"],
    rating: 4.7,
    numReviews: 342,
    isFeatured: true,
  },
  {
    name: "Wireless Noise-Cancelling Headphones",
    description: "Over-ear Bluetooth headphones with active noise cancellation, 30-hour battery life, and premium sound quality.",
    price: 6999,
    discountPrice: 5999,
    category: "electronics",
    brand: "SoundCore",
    sku: "AUDIO-003",
    stock: 45,
    images: [{ url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600" }],
    colors: ["Black", "Silver"],
    rating: 4.6,
    numReviews: 210,
    isFeatured: true,
  },
  {
    name: "Minimalist Leather Backpack",
    description: "Durable full-grain leather backpack with padded laptop compartment, ideal for work or travel.",
    price: 4499,
    category: "accessories",
    brand: "Urbancraft",
    sku: "BAG-004",
    stock: 60,
    images: [{ url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600" }],
    colors: ["Brown", "Black"],
    rating: 4.3,
    numReviews: 76,
    isFeatured: false,
  },
  {
    name: "Stainless Steel Water Bottle",
    description: "Double-wall vacuum insulated bottle keeps drinks cold for 24 hours or hot for 12. Leak-proof lid included.",
    price: 799,
    category: "accessories",
    brand: "HydroLife",
    sku: "BOTTLE-005",
    stock: 200,
    images: [{ url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600" }],
    colors: ["Blue", "Black", "Pink"],
    rating: 4.8,
    numReviews: 450,
    isFeatured: true,
  },
  {
    name: "Smart Fitness Watch",
    description: "Track heart rate, sleep, and workouts with this waterproof smartwatch featuring a 7-day battery life.",
    price: 7999,
    discountPrice: 6499,
    category: "electronics",
    brand: "PulseTech",
    sku: "WATCH-006",
    stock: 35,
    images: [{ url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600" }],
    colors: ["Black", "Rose Gold"],
    rating: 4.4,
    numReviews: 189,
    isFeatured: false,
  },
  {
    name: "Denim Slim Fit Jeans",
    description: "Classic five-pocket slim fit jeans made from stretch denim for a comfortable, tailored look.",
    price: 2199,
    category: "clothing",
    brand: "Everwear",
    sku: "JEANS-007",
    stock: 100,
    images: [{ url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600" }],
    sizes: ["30", "32", "34", "36"],
    colors: ["Blue", "Black"],
    rating: 4.2,
    numReviews: 95,
    isFeatured: false,
  },
  {
    name: "Ceramic Pour-Over Coffee Set",
    description: "Hand-glazed ceramic pour-over coffee dripper with matching mug ??? brew caf??-quality coffee at home.",
    price: 1799,
    category: "home",
    brand: "Brewly",
    sku: "COFFEE-008",
    stock: 70,
    images: [{ url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600" }],
    colors: ["White", "Terracotta"],
    rating: 4.9,
    numReviews: 62,
    isFeatured: true,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[SEED] Connected to MongoDB");

    await Product.deleteMany({});
    console.log("[SEED] Cleared existing products");

    await Product.create(sampleProducts);
    console.log(`[SEED] Inserted ${sampleProducts.length} products`);

    const adminExists = await User.findOne({ email: "admin@mernshop.com" });
    if (!adminExists) {
      await User.create({
        name: "Admin User",
        email: "admin@mernshop.com",
        password: "admin123",
        role: "admin",
      });
      console.log("[SEED] Created admin user (admin@mernshop.com / admin123)");
    } else {
      console.log("[SEED] Admin user already exists, skipped");
    }

    console.log("[SEED] Done.");
    process.exit(0);
  } catch (error) {
    console.error("[SEED] Failed:", error.message);
    process.exit(1);
  }
};

seed();