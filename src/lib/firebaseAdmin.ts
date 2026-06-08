import * as admin from 'firebase-admin';

// Bypass TLS rejection for local development and proxy environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

if (!admin.apps.length) {
  try {
    // We expect the user to provide the service account JSON path or string
    // in the environment variables once they configure Firebase.
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized.');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT is not set. Database operations will fail.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const db = admin.apps.length ? admin.firestore() : null;

if (db) {
  try {
    db.settings({ preferRest: true });
  } catch (e) {
    // ignore if already set
  }
}

