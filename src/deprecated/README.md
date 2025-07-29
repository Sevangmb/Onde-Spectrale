# 📦 Deprecated Architecture Files

This folder contains the old architecture files that have been replaced by the enhanced architecture.

## ⚠️ **Migration Status**

### **Old Architecture (Deprecated)**
- `OndeSpectraleRadio.tsx` - Replaced by `EnhancedOndeSpectraleRadio.tsx`
- `usePlaylistManager.ts` - Replaced by `useEnhancedPlaylistManager.ts`
- `useStationSync.ts` - Replaced by `useEnhancedStationSync.ts`
- `audio/` hooks - Consolidated into enhanced store

### **Enhanced Architecture (Current)**
- ✅ `stores/enhancedRadioStore.ts` - Consolidated state management
- ✅ `services/` - Service layer architecture
- ✅ `hooks/useEnhanced*.ts` - Enhanced hooks with store integration
- ✅ `components/EnhancedOndeSpectraleRadio.tsx` - Optimized main component

## 🔄 **Migration Path**

1. **Update imports** from old to enhanced components
2. **Test functionality** with enhanced architecture
3. **Remove deprecated imports** after confirmation
4. **Archive files** to this folder before deletion

## 📅 **Timeline**

- **Created**: Enhanced architecture implemented
- **Deprecated**: Old architecture marked for migration
- **Removal**: After 1-2 weeks of stable enhanced architecture

## 🚨 **Breaking Changes**

If you're still using old architecture:
```typescript
// OLD (deprecated)
import { OndeSpectraleRadio } from '@/components/OndeSpectraleRadio';

// NEW (enhanced)
import { EnhancedOndeSpectraleRadio } from '@/components/EnhancedOndeSpectraleRadio';
```

For more information, see `ARCHITECTURE_GUIDE.md` in the root directory.