# 🔧 Guide de Correction : Station 87.6 MHz

## Problème identifié
Marcus diffuse sur 87.6 MHz au lieu de Sarah. La configuration correcte devrait être **Radio Liberty** avec **Sarah** comme DJ.

## ✅ Solution : Correction automatisée disponible

J'ai analysé et corrigé les erreurs d'importation Firebase dans le code. Les fonctions de correction sont maintenant opérationnelles.

### Méthode 1 : Interface d'administration (Recommandée)

1. **Accéder à l'interface d'administration**
   ```
   http://localhost:9002/admin/stations
   ```

2. **Utiliser le bouton de correction automatique**
   - En haut à droite, cliquez sur le bouton **"Fix 87.6"**
   - Confirmez l'action dans la boîte de dialogue
   - La correction se fera automatiquement :
     - Suppression de l'ancienne station avec Marcus
     - Création de "Radio Liberty" avec Sarah
     - Nettoyage du cache

3. **Vérification**
   - Retournez à la page principale (`http://localhost:9002`)
   - Syntonisez sur 87.6 MHz
   - Vérifiez que Sarah diffuse maintenant

### Méthode 2 : Console de développement

1. **Ouvrir la console du navigateur**
   - F12 → Onglet Console
   - Ou utiliser le script `fix-marcus-876.js` que j'ai créé

2. **Exécuter le code de correction**
   ```javascript
   // Test de la fréquence actuelle
   radioDebug.testFrequency(87.6);
   
   // Correction automatique
   radioDebug.fix876();
   
   // Nettoyage du cache
   radioDebug.clearCache();
   
   // Vérification finale
   radioDebug.testFrequency(87.6);
   ```

### Méthode 3 : Boutons de diagnostic (En développement)

Si vous êtes en mode développement, utilisez les boutons disponibles :
- **"Vérifier"** : Diagnostique toutes les stations
- **"Fix 87.6"** : Correction spécifique de 87.6 MHz
- **"Reset"** : Réinitialisation complète de toutes les stations

## 🔍 Configuration corrigée

Après correction, la station 87.6 MHz devrait avoir :

```javascript
{
  frequency: 87.6,
  name: 'Radio Liberty',
  djCharacterId: 'sarah',  // ✅ Sarah au lieu de Marcus
  theme: 'Nouvelles de l\'aube et musiques de liberté',
  ownerId: 'system'
}
```

## 🛠️ Corrections techniques apportées

1. **Ajout des imports Firebase manquants** dans `src/lib/firebase.ts`
   - `collection`, `doc`, `deleteDoc`, `query`, `where`, `getDocs`
   - Toutes les fonctions Firestore nécessaires

2. **Fonction `fixSpecificStation(87.6)`** dans `src/app/actions-improved.ts`
   - Supprime l'ancienne station
   - Recrée avec la bonne configuration
   - Invalide les caches Next.js

3. **Interface de debug** disponible via `radioDebug` en développement

## 📋 Statut de la correction

- ✅ Erreurs d'importation Firebase corrigées
- ✅ Fonction de correction opérationnelle  
- ✅ Interface d'administration fonctionnelle
- ✅ Scripts de diagnostic disponibles
- ✅ Build de l'application réussi

## 🎯 Prochaines étapes

1. Exécuter la correction via l'interface d'administration
2. Vérifier que Sarah diffuse sur 87.6 MHz
3. Tester la fonctionnalité complète de la station
4. Supprimer les fichiers temporaires si nécessaire :
   - `fix-876.js`
   - `fix-marcus-876.js`
   - `CORRECTION_876_MHZ.md` (ce fichier)

---

**Note** : La correction préserve toutes les autres stations et ne supprime que la station problématique sur 87.6 MHz.