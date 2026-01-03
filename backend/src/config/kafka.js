import { Kafka } from 'kafkajs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let kafkaClient = null;
let kafkaProducer = null;
let kafkaConsumer = null;

const isKafkaEnabled = () => process.env.KAFKA_ENABLED !== 'false';

/**
 * Get Kafka client instance
 * Supports both Aiven Cloud (SSL) and local Kafka
 */
export const getKafkaClient = () => {
  if (!isKafkaEnabled()) {
    logger.warn('Kafka disabled via KAFKA_ENABLED=false');
    return null;
  }
  if (!kafkaClient) {
    const brokers = process.env.KAFKA_BROKERS 
      ? process.env.KAFKA_BROKERS.split(',').map(b => b.trim())
      : process.env.KAFKA_BROKER
        ? [process.env.KAFKA_BROKER]
        : null;

    if (!brokers || brokers.length === 0) {
      logger.warn('Kafka brokers not configured. Kafka features will be disabled.');
      return null;
    }

    const config = {
      clientId: process.env.KAFKA_CLIENT_ID || 'kayak-backend',
      brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    };

    // Aiven Kafka requires SSL certificates
    const sslCaPath = process.env.KAFKA_SSL_CA_PATH;
    const sslCertPath = process.env.KAFKA_SSL_CERT_PATH;
    const sslKeyPath = process.env.KAFKA_SSL_KEY_PATH;

    if (sslCaPath && sslCertPath && sslKeyPath) {
      try {
        // Resolve paths relative to backend root (one level up from src/config)
        const backendRoot = join(__dirname, '../..');
        const caPath = join(backendRoot, sslCaPath);
        const certPath = join(backendRoot, sslCertPath);
        const keyPath = join(backendRoot, sslKeyPath);

        config.ssl = {
          ca: readFileSync(caPath, 'utf-8'),
          cert: readFileSync(certPath, 'utf-8'),
          key: readFileSync(keyPath, 'utf-8'),
        };

        logger.info('Kafka SSL certificates loaded for Aiven Cloud');
      } catch (error) {
        logger.error('Failed to load Kafka SSL certificates:', error);
        throw new Error('Kafka SSL configuration error: ' + error.message);
      }
    } else {
      // Local Kafka (no SSL)
      logger.info('Kafka configured without SSL (local development)');
    }

    kafkaClient = new Kafka(config);
    logger.info(`Kafka client initialized with brokers: ${brokers.join(', ')}`);
  }

  return kafkaClient;
};

/**
 * Get Kafka producer instance
 */
export const getKafkaProducer = async () => {
  if (!kafkaProducer) {
    const client = getKafkaClient();
    if (!client) {
      return null;
    }

    kafkaProducer = client.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    await kafkaProducer.connect();
    logger.info('Kafka producer connected');
  }

  return kafkaProducer;
};

/**
 * Get Kafka consumer instance
 */
export const getKafkaConsumer = async (groupId = 'kayak-backend-group') => {
  if (!kafkaConsumer) {
    const client = getKafkaClient();
    if (!client) {
      return null;
    }

    kafkaConsumer = client.consumer({
      groupId,
      allowAutoTopicCreation: true,
    });

    await kafkaConsumer.connect();
    logger.info(`Kafka consumer connected with group ID: ${groupId}`);
  }

  return kafkaConsumer;
};

/**
 * Send message to Kafka topic
 */
export const sendKafkaMessage = async (topic, messages) => {
  try {
    if (!isKafkaEnabled()) {
      logger.warn(`Kafka disabled; skipping send to topic ${topic}`);
      return;
    }

    const producer = await getKafkaProducer();
    if (!producer) {
      logger.warn('Kafka producer not available. Message not sent.');
      return;
    }

    const payload = (Array.isArray(messages) ? messages : [messages]).map((m) => ({
      value: typeof m === 'string' ? m : JSON.stringify(m),
    }));

    await producer.send({
      topic,
      messages: payload,
    });

    logger.debug(`Message sent to Kafka topic: ${topic}`);
  } catch (error) {
    logger.error(`Failed to send message to Kafka topic ${topic}:`, error);
    // Do not block core flows if Kafka is unavailable
  }
};

/**
 * Close Kafka connections
 */
export const closeKafkaConnections = async () => {
  try {
    if (kafkaProducer) {
      await kafkaProducer.disconnect();
      kafkaProducer = null;
      logger.info('Kafka producer disconnected');
    }

    if (kafkaConsumer) {
      await kafkaConsumer.disconnect();
      kafkaConsumer = null;
      logger.info('Kafka consumer disconnected');
    }

    kafkaClient = null;
  } catch (error) {
    logger.error('Error closing Kafka connections:', error);
  }
};
