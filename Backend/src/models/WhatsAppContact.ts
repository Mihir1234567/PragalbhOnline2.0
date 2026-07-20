import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppContact extends Document {
  phoneNumber: string;
  name?: string;
  lastServiceViewedAt?: Date;
  currentPage: number;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppContactSchema: Schema = new Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    name: { type: String },
    lastServiceViewedAt: { type: Date },
    currentPage: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export default mongoose.model<IWhatsAppContact>("WhatsAppContact", WhatsAppContactSchema);
