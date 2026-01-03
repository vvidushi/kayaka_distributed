import express from 'express';
import * as listingsController from '../controllers/listings.controller.js';

const router = express.Router();

// Flights
router.get('/flights/search', listingsController.searchFlights);
router.get('/flights/airlines', listingsController.getAvailableAirlines);
router.get('/flights/locations', listingsController.searchFlightLocations);
router.get('/flights/prices-by-date', listingsController.getFlightPricesByDate);
router.get('/flights/:flightId', listingsController.getFlight);

// Hotels - IMPORTANT: specific routes before parameterized routes
router.get('/hotels/search', listingsController.searchHotels);
router.get('/hotels/locations', listingsController.searchHotelLocations);
router.get('/hotels/:hotelId', listingsController.getHotel);

// Cars
router.get('/cars/search', listingsController.searchCars);
router.get('/cars/locations', listingsController.searchCarLocations);
router.get('/cars/:carId', listingsController.getCar);

export default router;

