import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppMessage extends Document {
  contactId: mongoose.Types.ObjectId;
  direction: "inbound" | "outbound";
  content: string; // JSON string or text
  messageType: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppMessageSchema: Schema = new Schema(
  {
    contactId: { type: Schema.Types.ObjectId, ref: "WhatsAppContact", required: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    content: { type: String, required: true },
    messageType: { type: String, default: "text" },
  },
  { timestamps: true }
);

export default mongoose.model<IWhatsAppMessage>("WhatsAppMessage", WhatsAppMessageSchema);
