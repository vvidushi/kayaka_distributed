import mongoose from "mongoose";

const clickLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: false
    },
    listingId: {
      type: String,
      required: false
    },
    page: {
      type: String,
      required: true,  // ex: "flights", "hotel-detail", "search", "checkout"
    },
    section: {
      type: String,
      required: false, // ex: "filters-panel", "reviews", "map"
    },
    action: {
      type: String,
      enum: ["click", "view", "hover"],
      default: "click"
    },
    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

// Index for faster analytics
clickLogSchema.index({ page: 1 });
clickLogSchema.index({ listingId: 1 });
clickLogSchema.index({ createdAt: 1 });

export default mongoose.model("ClickLog", clickLogSchema);