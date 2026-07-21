import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppQuickReply extends Document {
  title: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppQuickReplySchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IWhatsAppQuickReply>("WhatsAppQuickReply", WhatsAppQuickReplySchema);
