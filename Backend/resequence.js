const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGO_URI || "mongodb+srv://gajjarvinit13_db_user:WMza7iiuKCa8yH75@cluster0.w0m33ai.mongodb.net/?appName=Cluster0";

mongoose.connect(uri)
  .then(async () => {
    console.log("Connected to MongoDB for resequencing");

    const schema = new mongoose.Schema({
      title: { type: String, required: true },
      documents: { type: [String], default: [] },
      order: { type: Number, required: true },
    }, { timestamps: true });

    // In case model is already compiled
    const WhatsAppBotService = mongoose.models.WhatsAppBotService || mongoose.model("WhatsAppBotService", schema);

    const services = await WhatsAppBotService.find().sort({ order: 1, updatedAt: -1 });

    let currentOrder = 1;
    for (const service of services) {
      await WhatsAppBotService.updateOne({ _id: service._id }, { $set: { order: currentOrder } });
      currentOrder++;
    }

    console.log("Resequenced", services.length, "services to unique orders 1 to", currentOrder - 1);
    process.exit(0);
  })
  .catch(console.error);
