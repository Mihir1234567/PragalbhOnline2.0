import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppBotService extends Document {
  title: string;
  documents: string[];
  order: number;
}

const WhatsAppBotServiceSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    documents: [{ type: String }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IWhatsAppBotService>("WhatsAppBotService", WhatsAppBotServiceSchema);
