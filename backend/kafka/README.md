# Kafka Topics Management

This directory contains Kafka configuration and tools for managing topics on your Aiven Kafka cluster.

## Files

- `topics.yml` - Topic definitions (partitions, retention, etc.)
- `ca.pem` - CA certificate for SSL connection
- `service.cert` - Client certificate for SSL connection
- `service.key` - Client key for SSL connection

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install js-yaml
```

### 2. Create Topics

```bash
# Preview what will be created (dry run)
./scripts/kafka-topics.sh create-dry

# Create topics
./scripts/kafka-topics.sh create
```

### 3. List Topics

```bash
./scripts/kafka-topics.sh list
```

## Topic Configuration

Edit `topics.yml` to add or modify topics:

```yaml
topics:
  - name: my.new.topic
    partitions: 3          # Number of partitions
    replication: 2         # Replication factor (2 for Aiven)
    retention_ms: 604800000  # 7 days in milliseconds
    description: "Description of what this topic is for"
```

### Retention Periods

Common retention values:
- `604800000` = 7 days
- `2592000000` = 30 days  
- `7776000000` = 90 days
- `-1` = infinite retention

## Available Commands

### Create Topics
```bash
./scripts/kafka-topics.sh create
```

Creates all topics defined in `topics.yml` that don't already exist.

### Dry Run (Preview)
```bash
./scripts/kafka-topics.sh create-dry
```

Shows what topics would be created without actually creating them.

### List Topics
```bash
./scripts/kafka-topics.sh list
```

Lists all existing topics on your Kafka cluster.

### Delete All Topics (DANGEROUS!)
```bash
./scripts/kafka-topics.sh delete-all
```

Deletes ALL topics from your cluster. Use with extreme caution!

## Environment Variables

Required in `backend/.env`:

```env
KAFKA_BROKERS=kafka-xxxxx.aivencloud.com:12310
KAFKA_SSL_CA_PATH=./kafka/ca.pem
KAFKA_SSL_CERT_PATH=./kafka/service.cert
KAFKA_SSL_KEY_PATH=./kafka/service.key
KAFKA_CLIENT_ID=kayak-backend
```

## Current Topics

The following topics are configured for the Kayak platform:

### Booking Events
- `bookings.created` - New bookings
- `bookings.updated` - Booking updates
- `bookings.confirmed` - Confirmed bookings
- `bookings.cancelled` - Cancelled bookings

### Payment Events
- `payments.created` - Payment initiated
- `payments.succeeded` - Successful payments
- `payments.failed` - Failed payments
- `payments.refunded` - Refunded payments

### Inventory Events
- `inventory.updated` - Inventory changes (flights/hotels/cars)

### Other Events
- `deals.tagged` - Deal events
- `watches.triggered` - Price/inventory watch triggers

## Troubleshooting

### "KAFKA_BROKERS environment variable is not set"
Make sure `backend/.env` exists and contains KAFKA_BROKERS.

### "Failed to load SSL certificates"
Verify that:
1. SSL certificate files exist in `backend/kafka/`
2. Paths in `.env` are correct (relative to backend directory)
3. Files are readable

### "Topic already exists"
This is normal if you've already created topics. The script will skip existing topics.

### "This server does not host this topic-partition"
The topic doesn't exist yet. Run `./scripts/kafka-topics.sh create` to create it.

## Adding New Topics

1. Edit `kafka/topics.yml`
2. Add your topic configuration:
   ```yaml
   - name: my.new.event
     partitions: 3
     replication: 2
     retention_ms: 604800000
     description: "My new event stream"
   ```
3. Run: `./scripts/kafka-topics.sh create`

## Production Best Practices

1. **Replication Factor**: Use 2 or 3 for Aiven (2 is minimum for HA)
2. **Partitions**: Start with 3, increase if you need more parallelism
3. **Retention**: Balance between data availability and storage costs
4. **Naming**: Use dot notation (e.g., `service.event.verb`)
5. **Testing**: Always use `--dry-run` first to preview changes

## Integration with Application

The backend automatically:
1. Connects to Kafka on startup
2. Initializes consumers for all configured topics
3. Publishes events to these topics when appropriate actions occur

If topics don't exist, you'll see "topic-partition" errors in logs. Create the topics to resolve these errors.

