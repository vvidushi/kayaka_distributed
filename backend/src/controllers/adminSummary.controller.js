import User from "../models/User.js";
import Flight from "../models/Flight.js";
import Hotel from "../models/Hotel.js";
import Car from "../models/Car.js";
import Booking from "../models/Booking.js";
import db from "../config/mysql.js"; // MySQL for billing

export const getAdminSummary = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProviders = await User.countDocuments({ role: "provider" });

    const totalListings =
      (await Flight.countDocuments()) +
      (await Hotel.countDocuments()) +
      (await Car.countDocuments());

    const totalBookings = await Booking.countDocuments({ status: "confirmed" });

    const [[revenueRow]] = await db.query(
      `SELECT SUM(total_amount) AS revenue FROM billing`
    );

    res.json({
      totalUsers,
      totalProviders,
      totalListings,
      totalBookings,
      totalRevenue: revenueRow.revenue || 0
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load summary" });
  }
};