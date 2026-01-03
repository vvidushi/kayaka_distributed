import Flight from "../models/Flight.js";
import Hotel from "../models/Hotel.js";
import Car from "../models/Car.js";

/**
 * ------------------------------------------------------------
 * SEARCH FLIGHTS
 * ------------------------------------------------------------
 */
export const searchFlights = async (req, res, next) => {
  try {
    const {
      from,
      to,
      departureDate,
      returnDate,
      classType,
      minPrice,
      maxPrice,
      sort = "price",
      order = "asc"
    } = req.query;

    const query = {};

    if (from) query.departureAirport = { $regex: from, $options: "i" };
    if (to) query.arrivalAirport = { $regex: to, $options: "i" };
    if (departureDate) query.departureDate = departureDate;
    if (classType) query.flightClass = classType;

    if (minPrice || maxPrice) {
      query.ticketPrice = {};
      if (minPrice) query.ticketPrice.$gte = Number(minPrice);
      if (maxPrice) query.ticketPrice.$lte = Number(maxPrice);
    }

    const flights = await Flight.find(query).sort({ [sort]: order === "asc" ? 1 : -1 });

    res.json({
      type: "flights",
      results: flights.length,
      items: flights
    });

  } catch (error) {
    next(error);
  }
};


/**
 * ------------------------------------------------------------
 * SEARCH HOTELS
 * ------------------------------------------------------------
 */
export const searchHotels = async (req, res, next) => {
  try {
    const {
      city,
      checkIn,
      checkOut,
      roomType,
      stars,
      minPrice,
      maxPrice,
      sort = "pricePerNight",
      order = "asc"
    } = req.query;

    const query = {};

    if (city) query.city = { $regex: city, $options: "i" };
    if (roomType) query.roomType = { $regex: roomType, $options: "i" };
    if (stars) query.starRating = Number(stars);

    if (minPrice || maxPrice) {
      query.pricePerNight = {};
      if (minPrice) query.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) query.pricePerNight.$lte = Number(maxPrice);
    }

    const hotels = await Hotel.find(query).sort({ [sort]: order === "asc" ? 1 : -1 });

    res.json({
      type: "hotels",
      results: hotels.length,
      items: hotels
    });

  } catch (error) {
    next(error);
  }
};


/**
 * ------------------------------------------------------------
 * SEARCH CARS
 * ------------------------------------------------------------
 */
export const searchCars = async (req, res, next) => {
  try {
    const {
      city,
      fromDate,
      toDate,
      carType,
      seats,
      minPrice,
      maxPrice,
      sort = "dailyRentalPrice",
      order = "asc"
    } = req.query;

    const query = {};

    if (city) query.city = { $regex: city, $options: "i" };
    if (carType) query.carType = { $regex: carType, $options: "i" };
    if (seats) query.seats = Number(seats);

    if (minPrice || maxPrice) {
      query.dailyRentalPrice = {};
      if (minPrice) query.dailyRentalPrice.$gte = Number(minPrice);
      if (maxPrice) query.dailyRentalPrice.$lte = Number(maxPrice);
    }

    const cars = await Car.find(query).sort({ [sort]: order === "asc" ? 1 : -1 });

    res.json({
      type: "cars",
      results: cars.length,
      items: cars
    });

  } catch (error) {
    next(error);
  }
};

/**
 * ------------------------------------------------------------
 * ALL-MODE SEARCH (Flights + Hotels + Cars)
 * ------------------------------------------------------------
 */
export const searchAllMode = async (req, res, next) => {
  try {
    const q = req.query.q || "";

    const regex = new RegExp(q, "i");

    const [flights, hotels, cars] = await Promise.all([
      Flight.find({ $or: [{ departureAirport: regex }, { arrivalAirport: regex }] }),
      Hotel.find({ $or: [{ city: regex }, { hotelName: regex }] }),
      Car.find({ $or: [{ city: regex }, { companyName: regex }, { carType: regex }] })
    ]);

    res.json({
      query: q,
      flights,
      hotels,
      cars
    });

  } catch (error) {
    next(error);
  }
};