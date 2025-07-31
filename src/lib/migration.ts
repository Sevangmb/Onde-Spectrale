// Migration utilities for enhanced architecture
// This file helps migrate from old architecture to new enhanced architecture

export interface MigrationResult {
  success: boolean;
  migratedData?: any;
  errors?: string[];
  warnings?: string[];
}

export class ArchitectureMigration {
  
  /**
   * Migrate data from old radio store to enhanced radio store
   */
  static migrateRadioStoreData(): MigrationResult {
    try {
      const result: MigrationResult = {
        success: true,
        warnings: [],
        errors: []
      };
      
      // Get old store data from localStorage
      const oldStoreData = localStorage.getItem('onde-spectrale-radio-store');
      
      if (!oldStoreData) {
        result.warnings?.push('No old store data found to migrate');
        return result;
      }
      
      const oldData = JSON.parse(oldStoreData);
      
      // Migrate to new enhanced store format
      const migratedData = {
        radio: {
          frequency: oldData.state?.frequency || 100.7,
          sliderValue: oldData.state?.sliderValue || 100.7,
          signalStrength: 0,
          isScanning: false,
          error: null,
        },
        playback: {
          currentTrack: null,
          isPlaying: false,
          isLoading: false,
          position: 0,
          volume: 0.8,
          errorMessage: null,
        },
        ui: {
          showPlaylist: false,
          autoPlayEnabled: false,
          ttsEnabled: false,
          audioContextEnabled: false,
          ttsMessage: null,
        },
        data: {
          stations: new Map(),
          currentStation: null,
          playlists: new Map(),
          failedTracks: new Set(),
          lastUpdated: {},
          isLoadingStation: false,
        },
        user: {
          user: null,
          customDJs: [],
        }
      };
      
      // Save migrated data
      localStorage.setItem('enhanced-onde-spectrale-radio-store', JSON.stringify({
        state: migratedData,
        version: 1
      }));
      
      result.migratedData = migratedData;
      result.warnings?.push('Successfully migrated radio store data');
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        errors: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
  
  /**
   * Clean up old store data after successful migration
   */
  static cleanupOldStoreData(): void {
    try {
      // Remove old store data
      localStorage.removeItem('onde-spectrale-radio-store');
      console.log('✅ Old store data cleaned up');
    } catch (error) {
      console.warn('⚠️ Failed to cleanup old store data:', error);
    }
  }
  
  /**
   * Validate enhanced store data integrity
   */
  static validateEnhancedStoreData(): boolean {
    try {
      const storeData = localStorage.getItem('enhanced-onde-spectrale-radio-store');
      
      if (!storeData) {
        return false;
      }
      
      const data = JSON.parse(storeData);
      
      // Check required structure
      const requiredKeys = ['radio', 'playback', 'ui', 'data', 'user'];
      const hasAllKeys = requiredKeys.every(key => 
        data.state && typeof data.state[key] === 'object'
      );
      
      return hasAllKeys;
      
    } catch (error) {
      console.error('Store validation failed:', error);
      return false;
    }
  }
  
  /**
   * Create backup of current store state
   */
  static createStoreBackup(): string | null {
    try {
      const storeData = localStorage.getItem('enhanced-onde-spectrale-radio-store');
      
      if (!storeData) {
        return null;
      }
      
      const backupKey = `onde-spectrale-backup-${Date.now()}`;
      localStorage.setItem(backupKey, storeData);
      
      console.log(`📦 Store backup created: ${backupKey}`);
      return backupKey;
      
    } catch (error) {
      console.error('Failed to create backup:', error);
      return null;
    }
  }
  
  /**
   * Restore store from backup
   */
  static restoreFromBackup(backupKey: string): boolean {
    try {
      const backupData = localStorage.getItem(backupKey);
      
      if (!backupData) {
        console.error(`Backup not found: ${backupKey}`);
        return false;
      }
      
      localStorage.setItem('enhanced-onde-spectrale-radio-store', backupData);
      console.log(`📦 Store restored from backup: ${backupKey}`);
      
      return true;
      
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }
  
  /**
   * Run complete migration process
   */
  static async runMigration(): Promise<MigrationResult> {
    console.log('🚀 Starting architecture migration...');
    
    try {
      // Step 1: Create backup
      const backupKey = this.createStoreBackup();
      
      // Step 2: Migrate radio store data
      const migrationResult = this.migrateRadioStoreData();
      
      if (!migrationResult.success) {
        console.error('❌ Migration failed:', migrationResult.errors);
        
        // Restore backup if migration failed
        if (backupKey) {
          this.restoreFromBackup(backupKey);
        }
        
        return migrationResult;
      }
      
      // Step 3: Validate migrated data
      const isValid = this.validateEnhancedStoreData();
      
      if (!isValid) {
        console.error('❌ Migrated data validation failed');
        
        // Restore backup if validation failed
        if (backupKey) {
          this.restoreFromBackup(backupKey);
        }
        
        return {
          success: false,
          errors: ['Migrated data validation failed']
        };
      }
      
      // Step 4: Clean up old data
      this.cleanupOldStoreData();
      
      console.log('✅ Migration completed successfully');
      
      return {
        success: true,
        warnings: ['Migration completed successfully'],
        migratedData: migrationResult.migratedData
      };
      
    } catch (error) {
      console.error('❌ Migration process failed:', error);
      
      return {
        success: false,
        errors: [`Migration process failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

// Auto-migration helper
export function runAutoMigration(): void {
  // Check if migration is needed
  const hasOldData = localStorage.getItem('onde-spectrale-radio-store');
  const hasNewData = localStorage.getItem('enhanced-onde-spectrale-radio-store');
  
  if (hasOldData && !hasNewData) {
    console.log('🔄 Auto-migration triggered');
    
    ArchitectureMigration.runMigration()
      .then(result => {
        if (result.success) {
          console.log('✅ Auto-migration completed');
        } else {
          console.error('❌ Auto-migration failed:', result.errors);
        }
      })
      .catch(error => {
        console.error('❌ Auto-migration error:', error);
      });
  }
}

import React from 'react';

// Component wrapper for migration
export function withMigration<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function MigratedComponent(props: P) {
    React.useEffect(() => {
      runAutoMigration();
    }, []);
    
    return React.createElement(Component, props);
  };
}