/**
 * Kafka Event Schemas
 * 
 * This file defines the structure of all Kafka events published and consumed
 * by the Kayak platform.
 */

/**
 * Base event structure
 */
export const BaseEvent = {
  eventId: 'string (UUID)',
  occurredAt: 'string (ISO 8601)',
  topic: 'string',
};

/**
 * Booking Events
 */
export const BookingCreatedEvent = {
  ...BaseEvent,
  topic: 'bookings.created',
  payload: {
    bookingId: 'string (UUID)',
    userId: 'string (UUID)',
    bookingType: 'flight | hotel | car',
    status: 'PENDING',
    priceAmount: 'number',
    priceCurrency: 'string (ISO 4217)',
  },
};

export const BookingUpdatedEvent = {
  ...BaseEvent,
  topic: 'bookings.updated',
  payload: {
    bookingId: 'string (UUID)',
    userId: 'string (UUID)',
    oldStatus: 'string',
    newStatus: 'string',
    metadata: 'object',
  },
};

export const BookingConfirmedEvent = {
  ...BaseEvent,
  topic: 'bookings.confirmed',
  payload: {
    bookingId: 'string (UUID)',
    userId: 'string (UUID)',
    bookingType: 'flight | hotel | car',
    price: {
      amount: 'number',
      currency: 'string',
    },
  },
};

/**
 * Payment Events
 */
export const PaymentCreatedEvent = {
  ...BaseEvent,
  topic: 'payments.created',
  payload: {
    paymentId: 'string (UUID)',
    bookingId: 'string (UUID)',
    userId: 'string (UUID)',
    amount: 'number',
    currency: 'string (ISO 4217)',
    status: 'PENDING',
  },
};

export const PaymentSucceededEvent = {
  ...BaseEvent,
  topic: 'payments.succeeded',
  payload: {
    paymentId: 'string (UUID)',
    bookingId: 'string (UUID)',
    userId: 'string (UUID)',
    amount: 'number',
    currency: 'string (ISO 4217)',
  },
};

export const PaymentRefundedEvent = {
  ...BaseEvent,
  topic: 'payments.refunded',
  payload: {
    paymentId: 'string (UUID)',
    bookingId: 'string (UUID)',
    userId: 'string (UUID)',
    refundAmount: 'number',
    originalAmount: 'number',
    currency: 'string (ISO 4217)',
  },
};

/**
 * Inventory Events
 */
export const InventoryUpdatedEvent = {
  ...BaseEvent,
  topic: 'inventory.updated',
  payload: {
    listingType: 'flight | hotel | car',
    listingId: 'string',
    action: 'created | updated | deleted',
    data: 'object (listing data)',
  },
};

/**
 * Deal Events
 */
export const DealTaggedEvent = {
  ...BaseEvent,
  topic: 'deals.tagged',
  payload: {
    dealId: 'string (UUID)',
    listingType: 'flight | hotel',
    listingId: 'string',
    score: 'number (0-100)',
    tags: 'array<string>',
    price: {
      amount: 'number',
      currency: 'string',
    },
    availability: 'number',
    promotionEndsAt: 'string (ISO 8601) | null',
    summary: 'string (max 160 chars)',
  },
};

/**
 * Watch Events
 */
export const WatchTriggeredEvent = {
  ...BaseEvent,
  topic: 'watches.triggered',
  payload: {
    watchId: 'string (UUID)',
    userId: 'string (UUID)',
    listingType: 'flight | hotel | car',
    listingId: 'string',
    criteria: {
      priceThreshold: 'number | null',
      availabilityThreshold: 'number | null',
    },
    triggeredAt: 'string (ISO 8601)',
  },
};

/**
 * Event validation helpers
 */
export const validateEvent = (event, expectedTopic) => {
  if (!event.eventId || !event.occurredAt || !event.topic) {
    throw new Error('Invalid event: missing required fields');
  }

  if (event.topic !== expectedTopic) {
    throw new Error(`Event topic mismatch: expected ${expectedTopic}, got ${event.topic}`);
  }

  return true;
};

export const createEvent = async (topic, payload) => {
  const { v4: uuidv4 } = await import('uuid');
  
  return {
    eventId: uuidv4(),
    occurredAt: new Date().toISOString(),
    topic,
    payload,
  };
};

