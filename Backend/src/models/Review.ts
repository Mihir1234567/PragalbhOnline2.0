import mongoose, { Document, Schema } from "mongoose";

export interface IReview extends Document {
  name: string;
  rating: number;
  content: string;
  language: "EN" | "GU";
  approved: boolean;
  createdAt: Date;
}

const reviewSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  language: {
    type: String,
    enum: ["EN", "GU", "HI"],
    default: "EN",
  },
  approved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IReview>("Review", reviewSchema);
