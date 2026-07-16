import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Structured logging format for production (JSON)
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  // Return JSON for structured logging
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta
  });
});

// Console format (colored for development)
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Configure transports based on environment
const transports = [
  // Console transport (always enabled)
  new winston.transports.Console({
    format: isProduction ? json() : consoleFormat,
    level: process.env.LOG_LEVEL || 'info',
  }),
];

// Add file transports in production or when explicitly configured
if (isProduction || process.env.LOG_TO_FILE === 'true') {
  transports.push(
    // Error logs - rotated daily, kept for 30 days
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: json(),
    }),
    // Combined logs - rotated daily, kept for 15 days
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '15d',
      format: json(),
    }),
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    isProduction ? json() : logFormat
  ),
  transports: transports,
  exitOnError: false, // Don't exit on handled exceptions
});

// Add a stream for Morgan or other middleware that expects a write stream
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Export a helper for creating child loggers with context
export function createLogger(context) {
  return logger.child({ context });
}

// Export a function to log metrics for monitoring systems
export function logMetric(metricName, value, tags = {}) {
  logger.info('metric', {
    metric: metricName,
    value,
    ...tags,
    timestamp: new Date().toISOString(),
  });
}

// Export a function for structured error logging with context
export function logError(error, context = {}) {
  logger.error('error', {
    error: error.message,
    type: error.name,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

// Export a function for performance logging
export function logPerformance(operation, duration, context = {}) {
  logger.info('performance', {
    operation,
    durationMs: duration,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

export default logger;