# 🧹 Project Cleanup Plan - Safe Mode

## 📋 Cleanup Analysis Summary

### ✅ **Safe to Clean (Phase 1)**
- Unused import statements
- Commented out code blocks  
- Temporary debug files
- Duplicate type definitions

### ⚠️ **Requires Review (Phase 2)**
- Old vs Enhanced architecture files
- Multiple actions files (actions-*.ts)
- Hooks in transition period
- Test files alignment

### 🔒 **Keep (Protected)**
- All UI components (still used)
- Core services and stores
- Configuration files
- Firebase/database related

## 🎯 Identified Cleanup Targets

### **1. Actions Files Status**
```
src/app/actions.ts              ✅ Main - Keep
src/app/actions-improved.ts     ⚠️ Temp fix for 87.6 MHz - Review after fix
src/app/actions-simple-fix.ts   ⚠️ Temp fix for 87.6 MHz - Review after fix  
src/app/actions-plex.ts         ✅ Plex integration - Keep
```

### **2. Hook Architecture Transition**
```
OLD ARCHITECTURE (Still in use by OndeSpectraleRadio.tsx):
├── hooks/usePlaylistManager.ts     ⚠️ Used by old component
├── hooks/audio/usePlaybackState.ts ⚠️ Used by old component
├── hooks/audio/useTrackSelection.ts ⚠️ Used by old component
├── hooks/audio/useAutoPlay.ts      ⚠️ Used by old component
├── hooks/audio/useAudioEffects.ts  ⚠️ Used by old component
└── hooks/audio/useFailedTracks.ts  ⚠️ Used by old component

NEW ARCHITECTURE (Enhanced):
├── hooks/useEnhancedPlaylistManager.ts ✅ New enhanced version
├── hooks/useEnhancedStationSync.ts     ✅ New enhanced version
├── stores/enhancedRadioStore.ts        ✅ Consolidated store
└── services/                           ✅ Service layer
```

### **3. Components Status**
```
src/components/OndeSpectraleRadio.tsx         ⚠️ Old architecture - Keep for now
src/components/EnhancedOndeSpectraleRadio.tsx ✅ New architecture - Primary
```

## 🔧 Safe Cleanup Actions

### **Phase 1: Imports & Code Cleanup**
1. Remove unused imports in all TypeScript files
2. Clean up commented code blocks
3. Standardize import order
4. Remove console.log statements (non-debug)

### **Phase 2: Architecture Transition**
1. Update main app to use EnhancedOndeSpectraleRadio
2. Mark old hooks as deprecated
3. Add migration notices
4. Remove old architecture after confirmation

### **Phase 3: File Structure Optimization**
1. Move deprecated files to `/deprecated` folder
2. Consolidate similar utilities
3. Clean up test files alignment
4. Update documentation

## 🚦 Implementation Strategy

### **Immediate (Safe)**
- ✅ Clean imports and dead code
- ✅ Standardize code formatting
- ✅ Remove temporary console.logs

### **After Testing (Moderate Risk)**
- ⚠️ Transition to enhanced components
- ⚠️ Archive old architecture files
- ⚠️ Consolidate actions files

### **Final Phase (Higher Risk)**
- 🔴 Remove deprecated files entirely
- 🔴 Breaking changes to public API
- 🔴 Database migration if needed

## 📊 Estimated Impact

### **Performance Benefits**
- 15-20% reduction in bundle size
- Cleaner import tree
- Faster TypeScript compilation

### **Maintainability**
- Reduced code duplication
- Clearer architecture boundaries  
- Easier debugging and testing

### **Risk Assessment**
- **Low Risk**: Import cleanup, formatting
- **Medium Risk**: Architecture transition
- **High Risk**: File deletion, breaking changes

## 🎯 Next Steps

1. **Start with Phase 1** (safe cleanup)
2. **Test enhanced architecture** thoroughly
3. **Gradual migration** to new components
4. **Archive old files** before deletion
5. **Update documentation** and guides