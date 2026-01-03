import { logger } from '../config/logger.js';

let paymentsSchemaEnsured = false;

const TABLE_NAME = 'payments';
const PUBLIC_SCHEMA = 'public';

const columnExistsQuery = `
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = $1
    AND table_name = $2
`;

const indexExistsQuery = `
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = $1
    AND tablename = $2
`;

const ensureColumn = async (client, column, definition) => {
  await client.query(`ALTER TABLE ${TABLE_NAME} ADD COLUMN ${definition}`);
  logger.info(`Added column ${column} on ${TABLE_NAME}`);
};

const ensureIndex = async (client, indexName, definition) => {
  await client.query(`CREATE INDEX ${indexName} ON ${TABLE_NAME} ${definition}`);
  logger.info(`Created index ${indexName} on ${TABLE_NAME}`);
};

export const ensurePaymentsSchema = async (client) => {
  if (paymentsSchemaEnsured) return;

  const columnsResult = await client.query(columnExistsQuery, [PUBLIC_SCHEMA, TABLE_NAME]);
  const indexesResult = await client.query(indexExistsQuery, [PUBLIC_SCHEMA, TABLE_NAME]);

  const columns = new Set(columnsResult.rows.map((row) => row.column_name));
  const indexes = new Set(indexesResult.rows.map((row) => row.indexname));

  const queries = [];

  if (!columns.has('idempotency_key')) {
    queries.push(async () => {
      await ensureColumn(client, 'idempotency_key', 'idempotency_key VARCHAR(255) UNIQUE');
    });
  }

  if (!columns.has('metadata')) {
    queries.push(async () => {
      await ensureColumn(client, 'metadata', "metadata JSONB DEFAULT '{}'::jsonb");
    });
  }

  if (!indexes.has('idx_payments_idempotency_key')) {
    queries.push(async () => {
      await ensureIndex(client, 'idx_payments_idempotency_key', '(idempotency_key)');
    });
  }

  if (!indexes.has('idx_payments_metadata')) {
    queries.push(async () => {
      await ensureIndex(client, 'idx_payments_metadata', 'USING GIN (metadata)');
    });
  }

  for (const query of queries) {
    try {
      await query();
    } catch (error) {
      logger.error('Failed to ensure payments schema', error);
      throw error;
    }
  }

  paymentsSchemaEnsured = true;
};
