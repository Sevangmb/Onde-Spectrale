// src/lib/logger.ts

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

type LogLevel = keyof typeof logLevels;

const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function log(level: LogLevel, message: string, ...args: any[]) {
  if (logLevels[level] >= logLevels[currentLogLevel]) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message} ${args.length > 0 ? JSON.stringify(args) : ''}`;

    console.log(logMessage);

    // Only attempt file logging on server-side
    if (typeof window === 'undefined' && typeof process !== 'undefined') {
      try {
        // Dynamic import to avoid bundling fs on client
        import('fs').then(async (fs) => {
          const path = await import('path');
          const logDirectory = path.join(process.cwd(), 'logs');
          
          if (!fs.existsSync(logDirectory)) {
            fs.mkdirSync(logDirectory, { recursive: true });
          }
          
          const logFilePath = path.join(logDirectory, `${new Date().toISOString().split('T')[0]}.log`);
          fs.appendFile(logFilePath, logMessage + '\n', (err) => {
            if (err) {
              console.error('Error writing to log file:', err);
            }
          });
        }).catch(() => {
          // Silently fail if fs is not available
        });
      } catch {
        // Silently fail if dynamic import fails
      }
    }
  }
}

const logger = {
  debug: (message: string, ...args: any[]) => log('debug', message, ...args),
  info: (message: string, ...args: any[]) => log('info', message, ...args),
  warn: (message: string, ...args: any[]) => log('warn', message, ...args),
  error: (message: string, ...args: any[]) => log('error', message, ...args),
};

export default logger;