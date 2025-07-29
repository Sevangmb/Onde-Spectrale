#!/usr/bin/env node

/**
 * Firebase Admin Script
 * Usage: node scripts/firebase-admin.js [command] [args]
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (requires service account key)
const serviceAccount = require('../firebase-service-account.json'); // You need to add this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.firestore();

async function listUsers() {
  console.log('📋 Listing Firebase users...');
  const listUsersResult = await admin.auth().listUsers(1000);
  listUsersResult.users.forEach((userRecord) => {
    console.log(`User: ${userRecord.email} (${userRecord.uid})`);
  });
}

async function listStations() {
  console.log('📻 Listing stations...');
  const snapshot = await db.collection('stations').get();
  snapshot.forEach(doc => {
    console.log(`Station: ${doc.id}`, doc.data());
  });
}

async function cleanupInactiveStations() {
  console.log('🧹 Cleaning up inactive stations...');
  const snapshot = await db.collection('stations')
    .where('isActive', '==', false)
    .get();
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Deleted ${snapshot.size} inactive stations`);
}

// Command line interface
const command = process.argv[2];

switch(command) {
  case 'users':
    listUsers();
    break;
  case 'stations':
    listStations();
    break;
  case 'cleanup':
    cleanupInactiveStations();
    break;
  default:
    console.log('Available commands: users, stations, cleanup');
}