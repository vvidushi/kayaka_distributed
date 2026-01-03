#!/usr/bin/env node

/**
 * Create Kafka topics on Aiven cluster from topics.yml configuration
 * 
 * Usage:
 *   node scripts/create-kafka-topics.js
 *   node scripts/create-kafka-topics.js --dry-run
 *   node scripts/create-kafka-topics.js --delete-all  (DANGEROUS!)
 */

import { Kafka } from 'kafkajs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldDeleteAll = args.includes('--delete-all');
const shouldList = args.includes('--list');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

// Initialize Kafka client
function getKafkaClient() {
  const brokers = process.env.KAFKA_BROKERS 
    ? process.env.KAFKA_BROKERS.split(',').map(b => b.trim())
    : null;

  if (!brokers || brokers.length === 0) {
    log.error('KAFKA_BROKERS environment variable is not set');
    process.exit(1);
  }

  const config = {
    clientId: 'kafka-topic-manager',
    brokers,
    retry: {
      initialRetryTime: 300,
      retries: 5,
    },
  };

  // Check for SSL configuration (Aiven requires SSL)
  const sslCaPath = process.env.KAFKA_SSL_CA_PATH;
  const sslCertPath = process.env.KAFKA_SSL_CERT_PATH;
  const sslKeyPath = process.env.KAFKA_SSL_KEY_PATH;

  if (sslCaPath && sslCertPath && sslKeyPath) {
    try {
      const ca = readFileSync(join(__dirname, '..', sslCaPath), 'utf-8');
      const cert = readFileSync(join(__dirname, '..', sslCertPath), 'utf-8');
      const key = readFileSync(join(__dirname, '..', sslKeyPath), 'utf-8');

      config.ssl = {
        rejectUnauthorized: true,
        ca: [ca],
        cert,
        key,
      };
      log.info('SSL certificates loaded for Aiven Kafka');
    } catch (error) {
      log.error(`Failed to load SSL certificates: ${error.message}`);
      process.exit(1);
    }
  } else {
    log.warning('SSL certificates not configured. This may fail with Aiven Kafka.');
  }

  return new Kafka(config);
}

// Load topics from YAML file
function loadTopicsConfig() {
  const topicsFilePath = join(__dirname, '..', 'kafka', 'topics.yml');
  
  try {
    const fileContents = readFileSync(topicsFilePath, 'utf8');
    const config = yaml.load(fileContents);
    
    if (!config || !config.topics || !Array.isArray(config.topics)) {
      log.error('Invalid topics.yml format. Expected "topics" array.');
      process.exit(1);
    }
    
    return config.topics;
  } catch (error) {
    log.error(`Failed to load topics.yml: ${error.message}`);
    log.info('Make sure kafka/topics.yml exists in the backend directory');
    process.exit(1);
  }
}

// List existing topics
async function listTopics(admin) {
  try {
    log.info('Fetching existing topics from Kafka cluster...');
    const topics = await admin.listTopics();
    
    console.log('\n' + '='.repeat(60));
    console.log('EXISTING TOPICS ON CLUSTER');
    console.log('='.repeat(60));
    
    if (topics.length === 0) {
      log.warning('No topics found on cluster');
    } else {
      topics.forEach((topic, index) => {
        console.log(`${index + 1}. ${topic}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
    return topics;
  } catch (error) {
    log.error(`Failed to list topics: ${error.message}`);
    throw error;
  }
}

// Create topics
async function createTopics(admin, topicsConfig, existingTopics) {
  const topicsToCreate = [];
  
  for (const topic of topicsConfig) {
    if (existingTopics.includes(topic.name)) {
      log.warning(`Topic "${topic.name}" already exists, skipping...`);
      continue;
    }
    
    topicsToCreate.push({
      topic: topic.name,
      numPartitions: topic.partitions || 3,
      replicationFactor: topic.replication || 2,
      configEntries: [
        { name: 'retention.ms', value: String(topic.retention_ms || 604800000) },
        { name: 'compression.type', value: 'snappy' },
      ],
    });
  }
  
  if (topicsToCreate.length === 0) {
    log.info('All topics already exist. Nothing to create.');
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TOPICS TO CREATE');
  console.log('='.repeat(60));
  
  topicsToCreate.forEach((topic, index) => {
    const config = topicsConfig.find(t => t.name === topic.topic);
    console.log(`\n${index + 1}. ${colors.cyan}${topic.topic}${colors.reset}`);
    console.log(`   Partitions: ${topic.numPartitions}`);
    console.log(`   Replication: ${topic.replicationFactor}`);
    console.log(`   Retention: ${topic.configEntries[0].value}ms (${Math.round(topic.configEntries[0].value / 86400000)} days)`);
    if (config?.description) {
      console.log(`   Description: ${config.description}`);
    }
    if (config?.consumers && Array.isArray(config.consumers) && config.consumers.length > 0) {
      console.log(`   Consumers: ${config.consumers.join(', ')}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (isDryRun) {
    log.warning('DRY RUN MODE - No topics will be created');
    return;
  }
  
  try {
    log.info(`Creating ${topicsToCreate.length} topics...`);
    const result = await admin.createTopics({
      topics: topicsToCreate,
      waitForLeaders: true,
      timeout: 30000,
    });
    
    if (result) {
      log.success(`Successfully created ${topicsToCreate.length} topics!`);
      topicsToCreate.forEach(t => {
        console.log(`  ${colors.green}[OK]${colors.reset} ${t.topic}`);
      });
    } else {
      log.warning('Topics may already exist or creation returned false');
    }
  } catch (error) {
    log.error(`Failed to create topics: ${error.message}`);
    throw error;
  }
}

// Delete all topics (DANGEROUS!)
async function deleteAllTopics(admin, existingTopics) {
  if (existingTopics.length === 0) {
    log.info('No topics to delete');
    return;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.red}WARNING: DELETING ALL TOPICS${colors.reset}`);
  console.log('='.repeat(60));
  existingTopics.forEach((topic, index) => {
    console.log(`${index + 1}. ${colors.red}${topic}${colors.reset}`);
  });
  console.log('='.repeat(60) + '\n');
  
  if (isDryRun) {
    log.warning('DRY RUN MODE - No topics will be deleted');
    return;
  }
  
  try {
    log.warning(`Deleting ${existingTopics.length} topics...`);
    await admin.deleteTopics({
      topics: existingTopics,
      timeout: 30000,
    });
    log.success(`Successfully deleted ${existingTopics.length} topics!`);
  } catch (error) {
    log.error(`Failed to delete topics: ${error.message}`);
    throw error;
  }
}

// Main function
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('KAFKA TOPIC MANAGER FOR AIVEN CLUSTER');
  console.log('='.repeat(60) + '\n');
  
  // Load configuration
  const topicsConfig = loadTopicsConfig();
  log.success(`Loaded ${topicsConfig.length} topics from configuration`);
  
  // Connect to Kafka
  const kafka = getKafkaClient();
  const admin = kafka.admin();
  
  try {
    log.info('Connecting to Kafka cluster...');
    await admin.connect();
    log.success('Connected to Kafka cluster');
    
    // List existing topics
    const existingTopics = await listTopics(admin);
    
    // Execute action based on flags
    if (shouldList) {
      // Just list topics, already done above
      log.info('Topic listing complete');
    } else if (shouldDeleteAll) {
      await deleteAllTopics(admin, existingTopics);
    } else {
      // Create topics
      await createTopics(admin, topicsConfig, existingTopics);
    }
    
    console.log('\n' + '='.repeat(60));
    log.success('Operation completed successfully!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    log.error(`Operation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await admin.disconnect();
    log.info('Disconnected from Kafka cluster');
  }
}

// Run
main().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

