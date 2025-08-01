/**
 * Service de logging conditionnel pour l'application
 * Remplace les console.log par un système plus robuste
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private storage: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: this.getLogLevelFromEnv(),
      enableConsole: process.env.NODE_ENV === 'development',
      enableStorage: true,
      maxStorageEntries: 1000,
      enableRemoteLogging: process.env.NODE_ENV === 'production',
      remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
      ...config
    };
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'NONE': return LogLevel.NONE;
      default: return process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: Date.now(),
      level,
      message,
      context,
      metadata,
      stack: level === LogLevel.ERROR ? new Error().stack : undefined
    };
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelName = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}]` : '';
    return `${timestamp} ${levelName} ${context} ${entry.message}`;
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const formattedMessage = this.formatMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.metadata);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, entry.metadata, entry.stack);
        break;
    }
  }

  private storeLog(entry: LogEntry): void {
    if (!this.config.enableStorage) return;

    this.storage.push(entry);
    
    // Limiter la taille du storage
    if (this.storage.length > this.config.maxStorageEntries) {
      this.storage = this.storage.slice(-this.config.maxStorageEntries);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemoteLogging || !this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Éviter les boucles infinies en cas d'erreur de logging
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  private writeLog(
    level: LogLevel,
    message: string,
    context?: string,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context, metadata);
    
    this.logToConsole(entry);
    this.storeLog(entry);
    
    // Envoi asynchrone vers le serveur distant
    if (this.config.enableRemoteLogging) {
      this.sendToRemote(entry).catch(() => {
        // Ignore les erreurs de logging distant
      });
    }
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.writeLog(LogLevel.DEBUG, message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.writeLog(LogLevel.INFO, message, context, metadata);
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.writeLog(LogLevel.WARN, message, context, metadata);
  }

  error(message: string, context?: string, metadata?: Record<string, unknown>): void {
    this.writeLog(LogLevel.ERROR, message, context, metadata);
  }

  // Méthodes utilitaires
  getLogs(level?: LogLevel): LogEntry[] {
    if (level === undefined) return [...this.storage];
    return this.storage.filter(entry => entry.level === level);
  }

  clearLogs(): void {
    this.storage = [];
  }

  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Méthodes de compatibilité pour remplacer console.log
  log(message: string, ...args: unknown[]): void {
    this.info(message, undefined, { args });
  }
}

// Instance singleton
export const logger = new Logger();

// Fonctions utilitaires pour remplacer console.*
export const log = {
  debug: (message: string, context?: string, metadata?: Record<string, unknown>) => 
    logger.debug(message, context, metadata),
  info: (message: string, context?: string, metadata?: Record<string, unknown>) => 
    logger.info(message, context, metadata),
  warn: (message: string, context?: string, metadata?: Record<string, unknown>) => 
    logger.warn(message, context, metadata),
  error: (message: string, context?: string, metadata?: Record<string, unknown>) => 
    logger.error(message, context, metadata),
};

// Export par défaut
export default logger;