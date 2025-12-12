import mongoose, { Schema, Document } from "mongoose";

export interface IService extends Document {
  iconName: string;
  category: "CERTIFICATE" | "ASSISTANCE" | "OTHER" | "ONLINE";
  title: {
    EN: string;
    GU: string;
  };
  description: {
    EN: string;
    GU: string;
  };
  documents: {
    EN: string[];
  };
}

const ServiceSchema: Schema = new Schema(
  {
    iconName: { type: String, required: true },
    category: {
      type: String,
      enum: ["CERTIFICATE", "ASSISTANCE", "OTHER", "ONLINE"],
      required: true,
    },
    title: {
      EN: { type: String, required: true },
      GU: { type: String, required: false },
      HI: { type: String, required: false },
    },
    description: {
      EN: { type: String, required: true },
      GU: { type: String, required: false },
      HI: { type: String, required: false },
    },
    documents: {
      EN: [{ type: String }],
      GU: [{ type: String }],
      HI: [{ type: String }],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IService>("Service", ServiceSchema);
