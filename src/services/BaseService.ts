'use client';

/**
 * BaseService - Foundation service class with enhanced patterns
 * 
 * Features:
 * - Consistent error handling with recovery strategies
 * - Performance monitoring integration
 * - Event-driven communication
 * - Caching coordination
 * - Type-safe service results
 */

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    duration?: number;
    cached?: boolean;
    retryCount?: number;
    timestamp: string;
  };
}

export interface ServiceConfig {
  enableCaching?: boolean;
  enableMetrics?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

export interface ServiceEvent {
  type: string;
  service: string;
  data?: any;
  timestamp: string;
}

export abstract class BaseService {
  protected config: ServiceConfig;
  protected serviceName: string;
  private static eventBus?: EventTarget;

  constructor(serviceName: string, config: ServiceConfig = {}) {
    this.serviceName = serviceName;
    this.config = {
      enableCaching: true,
      enableMetrics: true,
      retryAttempts: 3,
      timeout: 10000,
      ...config
    };
    
    // Initialize event bus if not exists
    if (!BaseService.eventBus && typeof window !== 'undefined') {
      BaseService.eventBus = new EventTarget();
    }
  }

  /**
   * Execute operation with enhanced error handling and metrics
   */
  protected async execute<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      retryable?: boolean;
      cacheKey?: string;
      timeout?: number;
    } = {}
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = options.retryable !== false ? this.config.retryAttempts! : 0;

    while (retryCount <= maxRetries) {
      try {
        // Check cache first if enabled
        if (options.cacheKey && this.config.enableCaching) {
          const cachedResult = await this.getFromCache<T>(options.cacheKey);
          if (cachedResult) {
            return {
              success: true,
              data: cachedResult,
              metadata: {
                duration: Date.now() - startTime,
                cached: true,
                retryCount,
                timestamp: new Date().toISOString()
              }
            };
          }
        }

        // Execute operation with timeout
        const timeoutMs = options.timeout || this.config.timeout!;
        const result = await this.withTimeout(operation(), timeoutMs);

        // Cache successful result
        if (options.cacheKey && this.config.enableCaching) {
          await this.setCache(options.cacheKey, result);
        }

        // Emit success event
        this.emitEvent('operation.success', {
          operationName,
          duration: Date.now() - startTime,
          retryCount
        });

        // Record metrics
        if (this.config.enableMetrics) {
          this.recordMetric(operationName, Date.now() - startTime, 'success');
        }

        return {
          success: true,
          data: result,
          metadata: {
            duration: Date.now() - startTime,
            cached: false,
            retryCount,
            timestamp: new Date().toISOString()
          }
        };

      } catch (error) {
        retryCount++;
        
        // If we've exhausted retries, return error
        if (retryCount > maxRetries) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Emit error event
          this.emitEvent('operation.error', {
            operationName,
            error: errorMessage,
            retryCount: retryCount - 1,
            duration: Date.now() - startTime
          });

          // Record error metrics
          if (this.config.enableMetrics) {
            this.recordMetric(operationName, Date.now() - startTime, 'error');
          }

          return {
            success: false,
            error: errorMessage,
            metadata: {
              duration: Date.now() - startTime,
              cached: false,
              retryCount: retryCount - 1,
              timestamp: new Date().toISOString()
            }
          };
        }

        // Wait before retry with exponential backoff
        await this.delay(Math.pow(2, retryCount - 1) * 1000);
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: 'Unexpected error in operation execution',
      metadata: {
        duration: Date.now() - startTime,
        cached: false,
        retryCount,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Emit service event
   */
  protected emitEvent(type: string, data?: any): void {
    if (BaseService.eventBus) {
      const event = new CustomEvent('service.event', {
        detail: {
          type,
          service: this.serviceName,
          data,
          timestamp: new Date().toISOString()
        } as ServiceEvent
      });
      BaseService.eventBus.dispatchEvent(event);
    }
  }

  /**
   * Subscribe to service events
   */
  static addEventListener(callback: (event: ServiceEvent) => void): () => void {
    if (!BaseService.eventBus) return () => {};

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceEvent>;
      callback(customEvent.detail);
    };

    BaseService.eventBus.addEventListener('service.event', handler);
    
    return () => {
      BaseService.eventBus?.removeEventListener('service.event', handler);
    };
  }

  /**
   * Cache operations (override in implementations)
   */
  protected async getFromCache<T>(key: string): Promise<T | null> {
    try {
      if (typeof window === 'undefined') return null;
      
      const cached = sessionStorage.getItem(`${this.serviceName}:${key}`);
      if (!cached) return null;

      const { data, expiresAt } = JSON.parse(cached);
      if (Date.now() > expiresAt) {
        sessionStorage.removeItem(`${this.serviceName}:${key}`);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  protected async setCache<T>(key: string, data: T, ttlMs: number = 300000): Promise<void> {
    try {
      if (typeof window === 'undefined') return;
      
      const cacheData = {
        data,
        expiresAt: Date.now() + ttlMs
      };
      
      sessionStorage.setItem(`${this.serviceName}:${key}`, JSON.stringify(cacheData));
    } catch {
      // Ignore cache errors
    }
  }

  /**
   * Utility methods
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private recordMetric(operation: string, duration: number, status: 'success' | 'error'): void {
    // Simple metrics recording - can be extended with external services
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        performance.mark(`${this.serviceName}.${operation}.${status}`);
        console.debug(`[${this.serviceName}] ${operation}: ${duration}ms (${status})`);
      } catch {
        // Ignore performance API errors
      }
    }
  }

  /**
   * Health check method - override in implementations
   */
  async healthCheck(): Promise<ServiceResult<{ status: string; timestamp: string }>> {
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Service cleanup method - override in implementations
   */
  async cleanup(): Promise<void> {
    // Override in implementations
  }
}