// Production-safe logging utility
// Only logs in development or when DEBUG flag is set

const isDev = process.env.NODE_ENV === 'development';
const isDebug = process.env.DEBUG === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (isDev || isDebug) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev || isDebug) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (isDev || isDebug) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDebug) {
      console.debug(...args);
    }
  }
};