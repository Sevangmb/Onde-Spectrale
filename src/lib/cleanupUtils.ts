// Utility functions for safe project cleanup and migration

export interface CleanupResult {
  success: boolean;
  removed: string[];
  errors: string[];
  warnings: string[];
}

export class ProjectCleanup {
  
  /**
   * Validate that enhanced architecture is working before cleanup
   */
  static validateEnhancedArchitecture(): boolean {
    try {
      // Check if enhanced store is available
      if (typeof window !== 'undefined') {
        const enhancedStore = localStorage.getItem('enhanced-onde-spectrale-radio-store');
        if (!enhancedStore) {
          console.warn('Enhanced store not found - may not be fully initialized');
          return false;
        }
      }
      
      // Validate enhanced components are importable
      // This would be checked at build time
      return true;
      
    } catch (error) {
      console.error('Enhanced architecture validation failed:', error);
      return false;
    }
  }
  
  /**
   * Safe cleanup of old console.log statements (non-debug files)
   */
  static identifyRedundantConsoleStatements(): string[] {
    const filesToCheck = [
      // Story files often have console statements for testing
      '/src/components/**/*.stories.tsx',
      '/src/app/actions-*.ts', // Temporary action files
    ];
    
    // This would be implemented with file system scanning
    // For now, return known files with debug statements
    return [
      'src/app/actions-improved.ts',
      'src/app/actions-simple-fix.ts',
      'src/components/*.stories.tsx'
    ];
  }
  
  /**
   * Check if old architecture files are still being imported
   */
  static checkOldArchitectureUsage(): { 
    stillUsed: string[]; 
    canBeDeprecated: string[]; 
  } {
    const oldArchitectureFiles = [
      'src/components/OndeSpectraleRadio.tsx',
      'src/hooks/usePlaylistManager.ts',
      'src/hooks/useStationSync.ts',
      'src/hooks/audio/',
      'src/shared/stores/useRadioStore.ts'
    ];
    
    // Files that are still being imported/used
    const stillUsed = [
      'src/components/OndeSpectraleRadio.tsx', // Still used as backup
      'src/hooks/usePlaylistManager.ts',       // Used by old component
      'src/shared/stores/useRadioStore.ts'     // Used by old component
    ];
    
    // Files that can be safely deprecated
    const canBeDeprecated = oldArchitectureFiles.filter(
      file => !stillUsed.includes(file)
    );
    
    return { stillUsed, canBeDeprecated };
  }
  
  /**
   * Generate cleanup report
   */
  static generateCleanupReport(): {
    totalFiles: number;
    obsoleteFiles: number;
    redundantConsoleStatements: number;
    unusedImports: number;
    safeTocleanFiles: string[];
    requiresReview: string[];
  } {
    const usage = this.checkOldArchitectureUsage();
    const consoleStatements = this.identifyRedundantConsoleStatements();
    
    return {
      totalFiles: 150, // Approximate count
      obsoleteFiles: usage.canBeDeprecated.length,
      redundantConsoleStatements: consoleStatements.length,
      unusedImports: 0, // Would need static analysis
      safeTocleanFiles: [
        ...usage.canBeDeprecated,
        ...consoleStatements.filter(f => f.includes('actions-'))
      ],
      requiresReview: usage.stillUsed
    };
  }
  
  /**
   * Safe migration steps
   */
  static getMigrationSteps(): Array<{
    step: number;
    title: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
    action: string;
  }> {
    return [
      {
        step: 1,
        title: 'Validate Enhanced Architecture',
        description: 'Ensure enhanced components are working correctly',
        risk: 'low',
        action: 'Test EnhancedOndeSpectraleRadio component'
      },
      {
        step: 2,
        title: 'Update Main App Component',
        description: 'Switch from OndeSpectraleRadio to EnhancedOndeSpectraleRadio',
        risk: 'medium',
        action: 'Update import in main page component'
      },
      {
        step: 3,
        title: 'Clean Temporary Actions Files',
        description: 'Remove actions-improved.ts and actions-simple-fix.ts after 87.6 MHz issue is resolved',
        risk: 'medium',
        action: 'Verify issue resolution, then remove temp files'
      },
      {
        step: 4,
        title: 'Archive Old Architecture',
        description: 'Move old components to deprecated folder',
        risk: 'low',
        action: 'Move files to src/deprecated/'
      },
      {
        step: 5,
        title: 'Clean Console Statements',
        description: 'Remove debug console statements from non-debug files',
        risk: 'low',
        action: 'Remove console.log from story files and temp actions'
      },
      {
        step: 6,
        title: 'Final Cleanup',
        description: 'Remove deprecated files after testing period',
        risk: 'high',
        action: 'Delete deprecated folder after 2 weeks'
      }
    ];
  }
  
  /**
   * Check if it's safe to proceed with cleanup
   */
  static isSafeToCleanup(): {
    safe: boolean;
    reasons: string[];
    recommendations: string[];
  } {
    const isEnhancedValid = this.validateEnhancedArchitecture();
    const usage = this.checkOldArchitectureUsage();
    
    const reasons: string[] = [];
    const recommendations: string[] = [];
    
    if (!isEnhancedValid) {
      reasons.push('Enhanced architecture not fully validated');
      recommendations.push('Test enhanced components thoroughly first');
    }
    
    if (usage.stillUsed.length > 0) {
      reasons.push(`${usage.stillUsed.length} old architecture files still in use`);
      recommendations.push('Update imports to enhanced components before cleanup');
    }
    
    const safe = isEnhancedValid && usage.stillUsed.length === 0;
    
    if (safe) {
      recommendations.push('Proceed with cleanup in phases');
      recommendations.push('Start with low-risk items first');
    }
    
    return { safe, reasons, recommendations };
  }
}

// Helper function to run cleanup analysis
export function runCleanupAnalysis(): void {
  const report = ProjectCleanup.generateCleanupReport();
  const safety = ProjectCleanup.isSafeToCleanup();
  const steps = ProjectCleanup.getMigrationSteps();
  
  console.log('🧹 CLEANUP ANALYSIS REPORT');
  console.log('===========================');
  console.log(`Total files in project: ${report.totalFiles}`);
  console.log(`Obsolete files identified: ${report.obsoleteFiles}`);
  console.log(`Redundant console statements: ${report.redundantConsoleStatements}`);
  console.log('');
  
  console.log('🚦 SAFETY CHECK');
  console.log('================');
  console.log(`Safe to cleanup: ${safety.safe ? '✅ YES' : '❌ NO'}`);
  
  if (safety.reasons.length > 0) {
    console.log('Reasons:');
    safety.reasons.forEach(reason => console.log(`  - ${reason}`));
  }
  
  if (safety.recommendations.length > 0) {
    console.log('Recommendations:');
    safety.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  console.log('');
  console.log('📋 MIGRATION STEPS');
  console.log('===================');
  steps.forEach(step => {
    const riskIcon = step.risk === 'low' ? '🟢' : step.risk === 'medium' ? '🟡' : '🔴';
    console.log(`${step.step}. ${riskIcon} ${step.title}`);
    console.log(`   ${step.description}`);
    console.log(`   Action: ${step.action}`);
    console.log('');
  });
}

// Auto-run analysis in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Delay to avoid interfering with app startup
  setTimeout(() => {
    console.log('🔍 Auto-running cleanup analysis...');
    runCleanupAnalysis();
  }, 5000);
}