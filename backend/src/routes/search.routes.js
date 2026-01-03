import express from "express";
import {
  searchFlights,
  searchHotels,
  searchCars,
  searchAllMode
} from "../controllers/search.controller.js";

const router = express.Router();

router.get("/flights", searchFlights);
router.get("/hotels", searchHotels);
router.get("/cars", searchCars);
router.get("/all", searchAllMode);

export default router;