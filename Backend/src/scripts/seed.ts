import mongoose from "mongoose";
import dotenv from "dotenv";
import Service from "../models/Service";
import Admin from "../models/Admin";
import Testimonial from "../models/Testimonial";
import connectDB from "../config/database";
import { SERVICES_DATA, TESTIMONIALS_DATA } from "./temp_constants";

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Service.deleteMany({});
    await Admin.deleteMany({});
    await Testimonial.deleteMany({});

    // Create Default Admin
    const admin = new Admin({
      name: "Admin User",
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD, // Will be hashed by pre-save hook
      phone: "+91 98983 29056",
      profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
      role: "admin",
    });
    await admin.save();
    console.log("Admin user created");

    // Create Services
    if (SERVICES_DATA && SERVICES_DATA.length > 0) {
      await Service.insertMany(SERVICES_DATA);
      console.log(`Imported ${SERVICES_DATA.length} services`);
    } else {
      console.log("No services found to import");
    }

    // Create Testimonials
    if (TESTIMONIALS_DATA && TESTIMONIALS_DATA.length > 0) {
      await Testimonial.insertMany(TESTIMONIALS_DATA);
      console.log(`Imported ${TESTIMONIALS_DATA.length} testimonials`);
    } else {
      console.log("No testimonials found to import");
    }

    process.exit();
  } catch (error) {
    console.error("Error with seeding:", error);
    process.exit(1);
  }
};

seedData();
