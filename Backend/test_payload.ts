import mongoose from "mongoose";
import Service from "./src/models/Service"; // Adjust path as needed
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  try {
    // Connect to local DB for testing
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://localhost:27017/pragalbh-services"
    );
    console.log("Connected to DB");

    const payload = {
      title: { EN: "Test En", GU: "Test Gu" },
      description: { EN: "Desc En", GU: "Desc Gu" },
      documents: { EN: ["Doc1"], GU: ["Doc2"] },
      category: "ONLINE",
      iconName: "FileText",
      price: "", // Extra field to check strict mode behavior
    };

    console.log("Attempting to save:", payload);

    const service = new Service(payload);
    const saved = await service.save();

    console.log("Success! Saved:", saved);
    await Service.deleteOne({ _id: saved._id }); // Cleanup
    console.log("Cleaned up.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to save service:", error);
    process.exit(1);
  }
};

run();
