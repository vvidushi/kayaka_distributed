import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const logLevel = process.env.LOG_LEVEL || 'info';

// Check if we can write to log directory
let canWriteLogs = false;
try {
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  canWriteLogs = true;
} catch (error) {
  // If we can't create log directory, continue with console logging only
  console.warn('Could not create log directory, using console logging only:', error.message);
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  })
];

// Only add file transports if we can write to log directory
if (canWriteLogs) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: logLevel
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'error'
    })
  );
}

const loggerConfig = {
  level: logLevel,
  format: logFormat,
  transports
};

// Only add file handlers if we can write to log directory
if (canWriteLogs) {
  loggerConfig.exceptionHandlers = [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ];
  loggerConfig.rejectionHandlers = [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ];
}

export const logger = winston.createLogger(loggerConfig);

export const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

