/**
 * Safe Date Utilities - Onde Spectrale
 * 
 * Provides safe date conversion functions to prevent "Invalid time value" errors
 * when dealing with Firestore Timestamps and potentially corrupted date data.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts any date-like value to ISO string with fallback
 * @param date - Date value to convert (Timestamp, Date, string, number, null, undefined)  
 * @returns Safe ISO string, current date as fallback
 */
export function safeToISOString(date: unknown): string {
  try {
    if (!date) {
      return new Date().toISOString();
    }
    
    // Handle Firestore Timestamp
    if (date instanceof Timestamp) {
      return date.toDate().toISOString();
    }
    
    // Handle objects with toDate method (Firestore Timestamp-like)
    if (date && typeof date === 'object' && 'toDate' in date && typeof (date as any).toDate === 'function') {
      const converted = (date as any).toDate();
      if (converted instanceof Date && !isNaN(converted.getTime())) {
        return converted.toISOString();
      }
    }
    
    // Handle regular Date objects
    if (date instanceof Date) {
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    // Handle strings and numbers
    const dateObj = new Date(date as any);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }
    
    // Fallback for invalid values
    console.warn('Invalid date value received, using current date:', date);
    return new Date().toISOString();
    
  } catch (error) {
    console.error('Date conversion error:', error, 'Input:', date);
    return new Date().toISOString();
  }
}

/**
 * Safely converts any date-like value to Date object with fallback
 * @param date - Date value to convert
 * @returns Safe Date object, current date as fallback
 */
export function safeParseDate(date: unknown): Date {
  try {
    if (!date) {
      return new Date();
    }
    
    // Handle Firestore Timestamp
    if (date instanceof Timestamp) {
      return date.toDate();
    }
    
    // Handle objects with toDate method
    if (date && typeof date === 'object' && 'toDate' in date && typeof (date as any).toDate === 'function') {
      const converted = (date as any).toDate();
      if (converted instanceof Date && !isNaN(converted.getTime())) {
        return converted;
      }
    }
    
    // Handle regular Date objects
    if (date instanceof Date) {
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Handle strings and numbers
    const dateObj = new Date(date as any);
    if (!isNaN(dateObj.getTime())) {
      return dateObj;
    }
    
    // Fallback for invalid values
    console.warn('Invalid date value received, using current date:', date);
    return new Date();
    
  } catch (error) {
    console.error('Date parsing error:', error, 'Input:', date);
    return new Date();
  }
}

/**
 * Safely gets timestamp in milliseconds with fallback
 * @param date - Date value to convert
 * @returns Timestamp in milliseconds, current time as fallback
 */
export function safeGetTime(date: unknown): number {
  try {
    const parsedDate = safeParseDate(date);
    return parsedDate.getTime();
  } catch (error) {
    console.error('Timestamp conversion error:', error, 'Input:', date);
    return Date.now();
  }
}

/**
 * Validates if a date value is valid
 * @param date - Date value to validate
 * @returns true if date is valid, false otherwise
 */
export function isValidDate(date: unknown): boolean {
  try {
    if (!date) return false;
    
    // Handle Firestore Timestamp
    if (date instanceof Timestamp) {
      const converted = date.toDate();
      return !isNaN(converted.getTime());
    }
    
    // Handle objects with toDate method
    if (date && typeof date === 'object' && 'toDate' in date) {
      const converted = (date as any).toDate();
      return converted instanceof Date && !isNaN(converted.getTime());
    }
    
    // Handle Date objects
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }
    
    // Handle strings/numbers
    const dateObj = new Date(date as any);
    return !isNaN(dateObj.getTime());
    
  } catch (error) {
    return false;
  }
}

/**
 * Formats date safely with fallback
 * @param date - Date value to format
 * @param options - Intl.DateTimeFormat options
 * @param locale - Locale for formatting (default: 'fr-FR')
 * @returns Formatted date string, fallback message if invalid
 */
export function safeFormatDate(
  date: unknown, 
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  },
  locale: string = 'fr-FR'
): string {
  try {
    const parsedDate = safeParseDate(date);
    return new Intl.DateTimeFormat(locale, options).format(parsedDate);
  } catch (error) {
    console.error('Date formatting error:', error, 'Input:', date);
    return 'Date invalide';
  }
}

/**
 * Safe comparison of two dates
 * @param date1 - First date to compare
 * @param date2 - Second date to compare
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function safeDateCompare(date1: unknown, date2: unknown): number {
  try {
    const time1 = safeGetTime(date1);
    const time2 = safeGetTime(date2);
    
    if (time1 < time2) return -1;
    if (time1 > time2) return 1;
    return 0;
  } catch (error) {
    console.error('Date comparison error:', error);
    return 0;
  }
}