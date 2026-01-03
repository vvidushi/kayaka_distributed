import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    listingId: { type: String, required: true },
    providerId: { type: String, required: true },
    userId: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: { type: String, default: "" }
  },
  { timestamps: true }
);

reviewSchema.index({ providerId: 1 });
reviewSchema.index({ listingId: 1 });

export default mongoose.model("Review", reviewSchema);