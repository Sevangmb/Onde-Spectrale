'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseService } from '@/services/BaseService';

interface ServiceManagerConfig {
  enableMetrics?: boolean;
  healthCheckInterval?: number;
  retryFailedServices?: boolean;
}

interface ServiceStatus {
  name: string;
  status: 'loading' | 'ready' | 'error' | 'disconnected';
  lastHealthCheck?: Date;
  error?: string;
}

interface UseServiceManagerReturn {
  services: Map<string, any>;
  serviceStatus: Map<string, ServiceStatus>;
  isReady: boolean;
  registerService: (name: string, serviceLoader: () => Promise<any>) => Promise<void>;
  getService: <T>(name: string) => T | null;
  reloadService: (name: string) => Promise<void>;
  getHealthStatus: () => Record<string, ServiceStatus>;
}

/**
 * Enhanced service manager hook for dynamic service loading and health monitoring
 */
export function useServiceManager(config: ServiceManagerConfig = {}): UseServiceManagerReturn {
  const {
    enableMetrics = true,
    healthCheckInterval = 30000, // 30 seconds
    retryFailedServices = true
  } = config;

  const [services] = useState(() => new Map<string, any>());
  const [serviceStatus] = useState(() => new Map<string, ServiceStatus>());
  const [isReady, setIsReady] = useState(false);
  const serviceLoaders = useRef(new Map<string, () => Promise<any>>());
  const healthCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Service registration with dynamic loading
  const registerService = useCallback(async (name: string, serviceLoader: () => Promise<any>) => {
    serviceLoaders.current.set(name, serviceLoader);
    
    // Set initial status
    serviceStatus.set(name, {
      name,
      status: 'loading'
    });

    try {
      // Load service
      const service = await serviceLoader();
      services.set(name, service);
      
      // Update status
      serviceStatus.set(name, {
        name,
        status: 'ready',
        lastHealthCheck: new Date()
      });

      // Check if all services are ready
      updateReadyState();

      console.log(`✅ Service ${name} loaded successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      serviceStatus.set(name, {
        name,
        status: 'error',
        error: errorMessage
      });

      console.error(`❌ Failed to load service ${name}:`, error);
      
      // Retry failed service if enabled
      if (retryFailedServices) {
        setTimeout(() => reloadService(name), 5000);
      }
    }
  }, [retryFailedServices]);

  // Get service instance
  const getService = useCallback(<T>(name: string): T | null => {
    const service = services.get(name);
    return service || null;
  }, []);

  // Reload specific service
  const reloadService = useCallback(async (name: string) => {
    const loader = serviceLoaders.current.get(name);
    if (!loader) {
      console.warn(`No loader found for service: ${name}`);
      return;
    }

    await registerService(name, loader);
  }, [registerService]);

  // Update ready state based on service status
  const updateReadyState = useCallback(() => {
    const allServicesReady = Array.from(serviceStatus.values()).every(
      status => status.status === 'ready'
    );
    setIsReady(allServicesReady);
  }, []);

  // Health check for services
  const performHealthCheck = useCallback(async () => {
    for (const [name, service] of services.entries()) {
      try {
        // Check if service has health check method
        if (service && typeof service.healthCheck === 'function') {
          const healthResult = await service.healthCheck();
          
          if (healthResult.success) {
            serviceStatus.set(name, {
              ...serviceStatus.get(name)!,
              status: 'ready',
              lastHealthCheck: new Date()
            });
          } else {
            serviceStatus.set(name, {
              ...serviceStatus.get(name)!,
              status: 'error',
              error: healthResult.error || 'Health check failed',
              lastHealthCheck: new Date()
            });
          }
        }
      } catch (error) {
        serviceStatus.set(name, {
          ...serviceStatus.get(name)!,
          status: 'error',
          error: error instanceof Error ? error.message : 'Health check error',
          lastHealthCheck: new Date()
        });
      }
    }
    
    updateReadyState();
  }, [updateReadyState]);

  // Get health status summary
  const getHealthStatus = useCallback(() => {
    const status: Record<string, ServiceStatus> = {};
    for (const [name, serviceStatus] of serviceStatus.entries()) {
      status[name] = { ...serviceStatus };
    }
    return status;
  }, []);

  // Setup health check interval
  useEffect(() => {
    if (enableMetrics && healthCheckInterval > 0) {
      healthCheckIntervalRef.current = setInterval(performHealthCheck, healthCheckInterval);
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [enableMetrics, healthCheckInterval, performHealthCheck]);

  // Service event listener
  useEffect(() => {
    const unsubscribe = BaseService.addEventListener((event) => {
      if (enableMetrics) {
        console.debug(`[ServiceManager] Event from ${event.service}:`, event.type, event.data);
      }
    });

    return unsubscribe;
  }, [enableMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup all services
      for (const [name, service] of services.entries()) {
        if (service && typeof service.cleanup === 'function') {
          try {
            service.cleanup();
          } catch (error) {
            console.warn(`Failed to cleanup service ${name}:`, error);
          }
        }
      }
    };
  }, []);

  return {
    services,
    serviceStatus,
    isReady,
    registerService,
    getService,
    reloadService,
    getHealthStatus
  };
}