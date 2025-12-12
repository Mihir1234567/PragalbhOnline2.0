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
    },
    description: {
      EN: { type: String, required: true },
    },
    documents: {
      EN: [{ type: String }],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IService>("Service", ServiceSchema);
