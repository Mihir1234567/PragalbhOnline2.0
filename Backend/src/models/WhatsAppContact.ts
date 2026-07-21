import mongoose, { Schema, Document } from "mongoose";

export interface IWhatsAppContact extends Document {
  phoneNumber: string;
  name?: string;
  lastServiceViewedAt?: Date;
  dailyServiceLimit: number;
  servicesRequestedToday: number;
  currentPage: number;
  status: "open" | "pending" | "resolved";
  unreadCount: number;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppContactSchema: Schema = new Schema(
  {
    phoneNumber: { type: String, required: true, unique: true },
    name: { type: String },
    lastServiceViewedAt: { type: Date },
    dailyServiceLimit: { type: Number, default: 2 },
    servicesRequestedToday: { type: Number, default: 0 },
    currentPage: { type: Number, default: 1 },
    status: { type: String, enum: ["open", "pending", "resolved"], default: "open" },
    unreadCount: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model<IWhatsAppContact>("WhatsAppContact", WhatsAppContactSchema);
