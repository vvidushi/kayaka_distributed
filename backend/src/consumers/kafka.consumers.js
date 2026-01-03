import { getKafkaConsumer } from '../config/kafka.js';
import { logger } from '../config/logger.js';
import { getMongoDB } from '../config/database.js';

/**
 * Watch trigger consumer
 * Listens for inventory updates and triggers watches
 */
export const startWatchTriggerConsumer = async () => {
  try {
    const consumer = await getKafkaConsumer('watch-trigger-group');
    if (!consumer) {
      logger.warn('Kafka consumer not available. Watch trigger consumer not started.');
      return;
    }

    await consumer.subscribe({ topics: ['inventory.updated'], fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          logger.info(`Watch trigger consumer received event: ${topic}`, { eventId: event.eventId });

          const db = await getMongoDB();
          const watchesCollection = db.collection('watches');

          const { listingType, listingId, action, data } = event.payload || event;

          if (action === 'deleted') {
            await watchesCollection.updateMany(
              {
                listingType,
                listingId,
                status: 'active',
              },
              {
                $set: {
                  status: 'expired',
                  updatedAt: new Date(),
                },
              }
            );
            logger.info(`Expired watches for deleted listing: ${listingType}/${listingId}`);
            return;
          }

          const activeWatches = await watchesCollection.find({
            listingType,
            listingId,
            status: 'active',
          }).toArray();

          for (const watch of activeWatches) {
            const shouldTrigger = await checkWatchCriteria(watch, data);

            if (shouldTrigger) {
              await watchesCollection.updateOne(
                { _id: watch._id },
                {
                  $set: {
                    status: 'triggered',
                    triggeredAt: new Date(),
                    updatedAt: new Date(),
                  },
                }
              );

              await sendWatchNotification(watch, data);
              logger.info(`Watch triggered: ${watch._id} for listing ${listingId}`);
            }
          }
        } catch (error) {
          logger.error('Error processing watch trigger event:', error);
        }
      },
    });

    logger.info('Watch trigger consumer started');
  } catch (error) {
    logger.error('Error starting watch trigger consumer:', error);
  }
};

/**
 * Deal event consumer
 * Processes deal tagging events
 */
export const startDealEventConsumer = async () => {
  try {
    const consumer = await getKafkaConsumer('deal-event-group');
    if (!consumer) {
      logger.warn('Kafka consumer not available. Deal event consumer not started.');
      return;
    }

    await consumer.subscribe({ topics: ['deals.tagged'], fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          logger.info(`Deal event consumer received event: ${topic}`, { eventId: event.eventId });

          const db = await getMongoDB();
          const dealsCollection = db.collection('deals');

          const dealData = {
            dealId: event.payload.dealId,
            listingType: event.payload.listingType,
            listingId: event.payload.listingId,
            score: event.payload.score,
            tags: event.payload.tags,
            price: event.payload.price,
            availability: event.payload.availability,
            promotionEndsAt: event.payload.promotionEndsAt ? new Date(event.payload.promotionEndsAt) : null,
            summary: event.payload.summary,
            createdAt: new Date(event.occurredAt),
            updatedAt: new Date(),
          };

          await dealsCollection.updateOne(
            { dealId: dealData.dealId },
            { $set: dealData },
            { upsert: true }
          );

          logger.info(`Deal processed: ${dealData.dealId}`);
        } catch (error) {
          logger.error('Error processing deal event:', error);
        }
      },
    });

    logger.info('Deal event consumer started');
  } catch (error) {
    logger.error('Error starting deal event consumer:', error);
  }
};

/**
 * Inventory update consumer
 * Handles inventory updates and cache invalidation
 */
export const startInventoryUpdateConsumer = async () => {
  try {
    const consumer = await getKafkaConsumer('inventory-update-group');
    if (!consumer) {
      logger.warn('Kafka consumer not available. Inventory update consumer not started.');
      return;
    }

    await consumer.subscribe({ topics: ['inventory.updated'], fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          logger.info(`Inventory update consumer received event: ${topic}`, { eventId: event.eventId });

          const { invalidateListingCache } = await import('../utils/cache.js');
          const { listingType, listingId } = event.payload || event;

          await invalidateListingCache(listingType, listingId);
          logger.info(`Cache invalidated for ${listingType}/${listingId}`);
        } catch (error) {
          logger.error('Error processing inventory update event:', error);
        }
      },
    });

    logger.info('Inventory update consumer started');
  } catch (error) {
    logger.error('Error starting inventory update consumer:', error);
  }
};

/**
 * Booking status update consumer
 * Handles booking status changes and notifications
 */
export const startBookingStatusConsumer = async () => {
  try {
    const consumer = await getKafkaConsumer('booking-status-group');
    if (!consumer) {
      logger.warn('Kafka consumer not available. Booking status consumer not started.');
      return;
    }

    await consumer.subscribe({
      topics: ['bookings.created', 'bookings.updated', 'bookings.confirmed'],
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          logger.info(`Booking status consumer received event: ${topic}`, { eventId: event.eventId });

          const db = await getMongoDB();
          const notificationsCollection = db.collection('notifications');

          const notification = {
            userId: event.userId || event.payload?.userId,
            type: 'booking',
            topic,
            bookingId: event.bookingId || event.payload?.bookingId,
            status: event.status || event.payload?.status,
            message: getBookingNotificationMessage(topic, event),
            read: false,
            createdAt: new Date(event.occurredAt),
          };

          await notificationsCollection.insertOne(notification);
          
          // Send WebSocket notification
          const { sendToUser } = await import('../config/websocket.js');
          sendToUser(notification.userId, 'notification', notification);
          
          logger.info(`Notification created and sent to user ${notification.userId} for booking: ${notification.bookingId}`);
        } catch (error) {
          logger.error('Error processing booking status event:', error);
        }
      },
    });

    logger.info('Booking status consumer started');
  } catch (error) {
    logger.error('Error starting booking status consumer:', error);
  }
};

/**
 * Payment confirmation consumer
 * Handles payment status changes
 */
export const startPaymentConfirmationConsumer = async () => {
  try {
    const consumer = await getKafkaConsumer('payment-confirmation-group');
    if (!consumer) {
      logger.warn('Kafka consumer not available. Payment confirmation consumer not started.');
      return;
    }

    await consumer.subscribe({
      topics: ['payments.created', 'payments.succeeded', 'payments.refunded'],
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          logger.info(`Payment confirmation consumer received event: ${topic}`, { eventId: event.eventId });

          if (topic === 'payments.succeeded') {
            const { updateBookingStatus } = await import('../services/bookings.service.js');
            const bookingId = event.bookingId || event.payload?.bookingId;

            if (bookingId) {
              try {
                await updateBookingStatus(bookingId, 'CONFIRMED');
                logger.info(`Booking ${bookingId} confirmed after payment success`);
              } catch (error) {
                logger.error(`Error confirming booking ${bookingId}:`, error);
              }
            }
          }
        } catch (error) {
          logger.error('Error processing payment confirmation event:', error);
        }
      },
    });

    logger.info('Payment confirmation consumer started');
  } catch (error) {
    logger.error('Error starting payment confirmation consumer:', error);
  }
};

/**
 * Check if watch criteria matches listing data
 */
const checkWatchCriteria = async (watch, listingData) => {
  if (!watch.criteria) {
    return false;
  }

  const { priceThreshold, availabilityThreshold } = watch.criteria;

  if (priceThreshold && listingData.price) {
    const currentPrice = typeof listingData.price === 'object'
      ? listingData.price.amount
      : listingData.price;

    if (currentPrice <= priceThreshold) {
      return true;
    }
  }

  if (availabilityThreshold && listingData.availableSeats !== undefined) {
    if (listingData.availableSeats >= availabilityThreshold) {
      return true;
    }
  }

  return false;
};

/**
 * Send watch notification
 */
const sendWatchNotification = async (watch, listingData) => {
  const db = await getMongoDB();
  const notificationsCollection = db.collection('notifications');

  const notification = {
    userId: watch.userId,
    type: 'watch',
    watchId: watch._id.toString(),
    listingType: watch.listingType,
    listingId: watch.listingId,
    message: `Your watch for ${watch.listingType} ${watch.listingId} has been triggered!`,
    data: listingData,
    read: false,
    createdAt: new Date(),
  };

  await notificationsCollection.insertOne(notification);
  
  // Send WebSocket notification
  try {
    const { sendToUser } = await import('../config/websocket.js');
    sendToUser(watch.userId, 'notification', notification);
  } catch (error) {
    logger.error('Error sending WebSocket notification for watch:', error);
  }
};

/**
 * Get booking notification message
 */
const getBookingNotificationMessage = (topic, event) => {
  const status = event.status || event.payload?.status;
  const bookingId = event.bookingId || event.payload?.bookingId;

  switch (topic) {
    case 'bookings.created':
      return `Booking ${bookingId} has been created and is pending confirmation.`;
    case 'bookings.confirmed':
      return `Booking ${bookingId} has been confirmed!`;
    case 'bookings.updated':
      return `Booking ${bookingId} status updated to ${status}.`;
    default:
      return `Booking ${bookingId} updated.`;
  }
};

/**
 * Analytics consumer
 * Processes booking and payment events for analytics
 */
export const startAnalyticsConsumer = async () => {
  try {
    const consumer = await getKafkaConsumer('analytics-group');
    if (!consumer) {
      logger.warn('Kafka consumer not available. Analytics consumer not started.');
      return;
    }

    await consumer.subscribe({
      topics: ['bookings.updated', 'payments.created'],
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          logger.info(`Analytics consumer received event: ${topic}`, { eventId: event.eventId });

          const db = await getMongoDB();
          const tracesCollection = db.collection('user_traces');

          const userId = event.userId || event.payload?.userId;
          if (!userId) {
            logger.warn('No userId in analytics event, skipping');
            return;
          }

          // Create analytics event
          const analyticsEvent = {
            userId,
            eventType: topic === 'bookings.updated' ? 'booking_updated' : 'payment_created',
            eventData: {
              bookingId: event.bookingId || event.payload?.bookingId,
              paymentId: event.paymentId || event.payload?.paymentId,
              status: event.status || event.newStatus || event.payload?.status,
              amount: event.amount || event.priceAmount || event.payload?.amount,
            },
            occurredAt: new Date(event.occurredAt),
            createdAt: new Date(),
          };

          // Upsert user trace (create or update)
          await tracesCollection.updateOne(
            { userId },
            {
              $push: {
                steps: {
                  $each: [analyticsEvent],
                  $slice: -1000, // Keep last 1000 events per user
                },
              },
              $setOnInsert: {
                userId,
                cohort: new Date().toISOString().split('T')[0], // Daily cohort
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );

          logger.debug(`Analytics event stored for user ${userId}`);
        } catch (error) {
          logger.error('Error processing analytics event:', error);
        }
      },
    });

    logger.info('Analytics consumer started');
  } catch (error) {
    logger.error('Error starting analytics consumer:', error);
  }
};

/**
 * Notification consumer
 * Sends notifications for payment and inventory events
 */
export const startNotificationConsumer = async () => {
  try {
    const consumer = await getKafkaConsumer('notification-group');
    if (!consumer) {
      logger.warn('Kafka consumer not available. Notification consumer not started.');
      return;
    }

    await consumer.subscribe({
      topics: ['payments.succeeded', 'inventory.updated'],
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          logger.info(`Notification consumer received event: ${topic}`, { eventId: event.eventId });

          const db = await getMongoDB();
          const notificationsCollection = db.collection('notifications');

          let userId = event.userId || event.payload?.userId;
          let notification = null;

          if (topic === 'payments.succeeded') {
            userId = event.userId || event.payload?.userId;
            notification = {
              userId,
              type: 'payment',
              topic: 'payments.succeeded',
              paymentId: event.paymentId || event.payload?.paymentId,
              bookingId: event.bookingId || event.payload?.bookingId,
              amount: event.amount || event.payload?.amount,
              message: `Payment of $${event.amount || event.payload?.amount} succeeded for booking ${event.bookingId || event.payload?.bookingId}`,
              read: false,
              createdAt: new Date(event.occurredAt),
            };
          } else if (topic === 'inventory.updated') {
            // For inventory updates, we need to find users watching this listing
            const { listingType, listingId, action } = event.payload || event;
            
            if (action === 'deleted' || action === 'updated') {
              // Find users with active watches for this listing
              const watchesCollection = db.collection('watches');
              const watches = await watchesCollection.find({
                listingType,
                listingId,
                status: 'active',
              }).toArray();

              // Create notifications for each watch
              for (const watch of watches) {
                notification = {
                  userId: watch.userId,
                  type: 'inventory',
                  topic: 'inventory.updated',
                  listingType,
                  listingId,
                  watchId: watch._id.toString(),
                  message: `Inventory updated for ${listingType} ${listingId}`,
                  read: false,
                  createdAt: new Date(event.occurredAt),
                };

                await notificationsCollection.insertOne(notification);

                // Send WebSocket notification
                const { sendToUser } = await import('../config/websocket.js');
                sendToUser(watch.userId, 'notification', notification);
              }

              logger.info(`Created ${watches.length} notifications for inventory update`);
              return;
            }
          }

          if (notification && userId) {
            await notificationsCollection.insertOne(notification);

            // Send WebSocket notification
            const { sendToUser } = await import('../config/websocket.js');
            sendToUser(userId, 'notification', notification);

            logger.info(`Notification created and sent to user ${userId}`);
          }
        } catch (error) {
          logger.error('Error processing notification event:', error);
        }
      },
    });

    logger.info('Notification consumer started');
  } catch (error) {
    logger.error('Error starting notification consumer:', error);
  }
};

/**
 * Inventory consumer
 * Updates inventory (seats/rooms) based on payment events
 */
export const startInventoryConsumer = async () => {
  try {
    const consumer = await getKafkaConsumer('inventory-payment-group');
    if (!consumer) {
      logger.warn('Kafka consumer not available. Inventory consumer not started.');
      return;
    }

    await consumer.subscribe({
      topics: ['payments.created', 'payments.succeeded'],
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          logger.info(`Inventory consumer received event: ${topic}`, { eventId: event.eventId });

          const db = await getMongoDB();

          // Get booking details to find listing
          const bookingId = event.bookingId || event.payload?.bookingId;
          if (!bookingId) {
            logger.warn('No bookingId in payment event, skipping inventory update');
            return;
          }

          // Fetch booking to get itinerary details
          const { getPostgresPool } = await import('../config/database.js');
          const pool = getPostgresPool();
          const bookingResult = await pool.query(
            'SELECT booking_type, itinerary FROM bookings WHERE id = $1',
            [bookingId]
          );

          if (bookingResult.rows.length === 0) {
            logger.warn(`Booking ${bookingId} not found, skipping inventory update`);
            return;
          }

          const booking = bookingResult.rows[0];
          const itinerary = booking.itinerary || {};

          if (topic === 'payments.created') {
            // Reserve inventory (temporarily hold seats/rooms)
            // This is optional - you might want to reserve on booking creation instead
            logger.debug(`Payment created for booking ${bookingId}, inventory reservation handled at booking time`);
          } else if (topic === 'payments.succeeded') {
            // Decrement inventory when payment succeeds
            if (booking.booking_type === 'flight' && itinerary.flightId) {
              const flightsCollection = db.collection('flights');
              const result = await flightsCollection.updateOne(
                { _id: itinerary.flightId },
                {
                  $inc: { availableSeats: -(itinerary.passengers || 1) },
                }
              );

              if (result.modifiedCount > 0) {
                logger.info(`Decremented ${itinerary.passengers || 1} seats for flight ${itinerary.flightId}`);
              }
            } else if (booking.booking_type === 'hotel' && itinerary.hotelId) {
              const hotelsCollection = db.collection('hotels');
              const result = await hotelsCollection.updateOne(
                { _id: itinerary.hotelId },
                {
                  $inc: { availableRooms: -(itinerary.rooms || 1) },
                }
              );

              if (result.modifiedCount > 0) {
                logger.info(`Decremented ${itinerary.rooms || 1} rooms for hotel ${itinerary.hotelId}`);
              }
            }
          }
        } catch (error) {
          logger.error('Error processing inventory event:', error);
        }
      },
    });

    logger.info('Inventory consumer started');
  } catch (error) {
    logger.error('Error starting inventory consumer:', error);
  }
};

/**
 * Start all Kafka consumers
 */
export const startAllConsumers = async () => {
  try {
    await Promise.all([
      startWatchTriggerConsumer(),
      startDealEventConsumer(),
      startInventoryUpdateConsumer(),
      startBookingStatusConsumer(),
      startPaymentConfirmationConsumer(),
      startAnalyticsConsumer(),
      startNotificationConsumer(),
      startInventoryConsumer(),
    ]);

    logger.info('All Kafka consumers started');
  } catch (error) {
    logger.error('Error starting Kafka consumers:', error);
  }
};

