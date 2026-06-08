import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config({ path: '.env.local' });

async function run() {
  console.log('Testing Firestore connection...');
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountStr))
      });
    }
    
    const db = admin.firestore();
    // Use REST to bypass potential GRPC TLS issues
    db.settings({ preferRest: true });

    console.log('Writing test document...');
    const docRef = await db.collection('products').add({
      name: "Test Connection Product",
      description: "If you see this, Firebase is working!",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Successfully wrote document with ID:', docRef.id);
    process.exit(0);
  } catch (err) {
    console.error('Firestore Error:', err);
    process.exit(1);
  }
}

run();
