'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, doc, updateDoc, serverTimestamp, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SystemLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  category: 'player' | 'station' | 'playlist' | 'auth' | 'system';
  timestamp: Date;
  userId?: string;
  stationId?: string;
  metadata?: Record<string, any>;
}

export function useSystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to system logs
  useEffect(() => {
    const logsRef = collection(db, 'systemLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(100));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: SystemLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        logsData.push({
          id: doc.id,
          level: data.level || 'info',
          message: data.message,
          category: data.category || 'system',
          timestamp: data.timestamp?.toDate() || new Date(),
          userId: data.userId,
          stationId: data.stationId,
          metadata: data.metadata || {}
        });
      });
      setLogs(logsData);
      setIsLoading(false);
    }, (error) => {
      console.error('Error monitoring system logs:', error);
      setError('Erreur lors du chargement des logs');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Add a new log entry
  const addLog = useCallback(async (log: Omit<SystemLog, 'id' | 'timestamp'>) => {
    const logsRef = collection(db, 'systemLogs');
    const newLog = {
      ...log,
      timestamp: serverTimestamp()
    };

    try {
      await updateDoc(doc(logsRef), {
        logs: [...logs, newLog].slice(-100) // Keep last 100 logs
      });
    } catch (error) {
      console.error('Error adding system log:', error);
    }
  }, [logs]);

  // Filter logs by level
  const getLogsByLevel = useCallback((level: SystemLog['level']) => {
    return logs.filter(log => log.level === level);
  }, [logs]);

  // Filter logs by category
  const getLogsByCategory = useCallback((category: SystemLog['category']) => {
    return logs.filter(log => log.category === category);
  }, [logs]);

  // Get error logs
  const errorLogs = getLogsByLevel('error');
  const warningLogs = getLogsByLevel('warning');
  const infoLogs = getLogsByLevel('info');
  const successLogs = getLogsByLevel('success');

  // Get recent logs (last 24 hours)
  const getRecentLogs = useCallback(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return logs.filter(log => log.timestamp > oneDayAgo);
  }, [logs]);

  return {
    logs,
    isLoading,
    error,
    addLog,
    getLogsByLevel,
    getLogsByCategory,
    getRecentLogs,
    errorLogs,
    warningLogs,
    infoLogs,
    successLogs
  };
} 