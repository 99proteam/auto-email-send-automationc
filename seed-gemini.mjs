import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';

dotenv.config({ path: '.env.local' });

async function run() {
  console.log('Starting detailed product analysis with Gemini...');

  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!admin.apps.length && serviceAccountStr) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountStr))
    });
  }
  const db = admin.firestore();
  db.settings({ preferRest: true });

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const productsPath = path.join(process.cwd(), 'products.txt');
  const rawText = fs.readFileSync(productsPath, 'utf8');

  const prompt = `
  You are an expert sales copywriter and product analyst. Read the following text, which contains raw scraped data from 5 different product websites.
  
  Extract the information into a strict JSON array of objects. Do not summarize too briefly; provide comprehensive details.
  Each object MUST have:
  - "name": The name of the product.
  - "url": The website URL associated with the product.
  - "comprehensive_description": A detailed, multi-paragraph description explaining exactly what the software does, who it's for, and the main pain points it solves.
  - "key_features": An array of strings, listing EVERY major feature mentioned in the text (at least 5-10 features if available).
  - "pricing_info": Detailed pricing information found in the text.
  - "target_audience": Who is this product meant for (e.g., WooCommerce owners, B2B agencies).

  IMPORTANT: Return ONLY the raw JSON array. Do not include markdown formatting like \`\`\`json.

  Raw Text:
  ${rawText.substring(0, 35000)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let jsonStr = response.text.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();

    const products = JSON.parse(jsonStr);
    console.log(`Successfully extracted detailed info for ${products.length} products. Uploading...`);

    const batch = db.batch();
    const productsRef = db.collection('products');

    for (const product of products) {
      const docRef = productsRef.doc();
      batch.set(docRef, {
        ...product,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Added detailed product: ${product.name}`);
    }

    await batch.commit();
    console.log('Detailed products seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

run();
