import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config({ path: '.env.local' });

async function run() {
  console.log('Starting product seeding process...');

  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountStr) {
    console.error('FIREBASE_SERVICE_ACCOUNT is missing in .env.local');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountStr))
    });
  }
  const db = admin.firestore();
  db.settings({ preferRest: true });

  const products = [
    {
      name: "Doffl",
      url: "https://doffl.com",
      description: "Doffl is an all-encompassing digital platform designed to provide software solutions and workflow automations to scaling businesses. By leveraging proprietary software ecosystems, Doffl helps agency owners and B2B operators unify their tech stack. Whether it's managing customer relationships, orchestrating follow-up emails, or hosting enterprise-level landing pages, Doffl acts as the central hub. Ideal for companies looking to replace multiple expensive SaaS subscriptions with a single, cohesive workflow engine.",
      features: ["All-in-one Digital Solutions", "Workflow Automation Engine", "CRM Integration", "B2B Lead Generation Toolkit", "Landing Page Hosting"],
      pricing_info: "Enterprise Solutions & Bundles Available",
      target_audience: "B2B Agencies, Digital Marketers, Enterprise Scalers"
    },
    {
      name: "Pro Fin Suite",
      url: "https://bundlewp.com/pro-fin-suite/l",
      description: "Pro Fin Suite is the ultimate financial tracking plugin bundle built natively for WordPress. It transforms a standard WP dashboard into a powerful accounting and tracking interface. Users can monitor incoming revenue from WooCommerce, log manual expenses, generate P&L (Profit and Loss) statements, and forecast future revenue. This eliminates the need for expensive third-party tools like QuickBooks for small to medium web-based businesses, keeping all data securely on their own server.",
      features: ["Native WordPress Accounting", "Automated P&L Reporting", "WooCommerce Revenue Sync", "Expense Logging & Categorization", "Predictive Revenue Forecasting"],
      pricing_info: "Premium Bundle Pricing via BundleWP",
      target_audience: "WordPress Site Owners, E-commerce Merchants, Freelancers"
    },
    {
      name: "Fin Tools: 100 Premium Web Tools for WordPress",
      url: "https://bundlewp.com/fin-tools-100-premium-web-tools-for-wordpress/",
      description: "A massive collection of 100 highly functional, embeddable web tools meant to drive organic SEO traffic and provide utility to site visitors. The Fin Tools bundle includes everything from mortgage calculators and currency converters to investment forecasting graphs and ROI simulators. Instead of building these tools from scratch, webmasters can simply use shortcodes to deploy them instantly. Perfect for financial bloggers, real estate sites, and fintech startups wanting to reduce bounce rates.",
      features: ["100+ Ready-to-Use Tools", "Simple Shortcode Embedding", "Mortgage & ROI Calculators", "Real-time Currency Converters", "SEO-Optimized Micro-Apps"],
      pricing_info: "Premium Bundle Pricing via BundleWP",
      target_audience: "Financial Bloggers, Real Estate Agents, Niche SEO Marketers"
    },
    {
      name: "All-in-One Smart Extractor",
      url: "https://bundlewp.com/all-in-one-smart-extractor/",
      description: "All-in-One Smart Extractor is a heavy-duty data scraping and lead generation utility for WordPress. It gives site administrators the power to scrape public directories, parse complex HTML tables, and extract verified email addresses or phone numbers with minimal configuration. Built with proxy-rotation compatibility, it ensures that your B2B lead generation doesn't get IP-banned. The extracted data can be directly piped into your CRM or email sequence tools for immediate cold outreach.",
      features: ["Smart HTML/DOM Parsing", "Email & Phone Number Extraction", "Proxy Rotation Support", "Direct CRM Data Piping", "Automated Scraping Schedules"],
      pricing_info: "Premium Bundle Pricing via BundleWP",
      target_audience: "Lead Generation Specialists, B2B Sales Teams, Data Analysts"
    },
    {
      name: "WooFlow Manager: Store Automation Toolkit",
      url: "https://bundlewp.com/wooflow-manager-store-automation-toolkit-for-woocommerce/",
      description: "WooFlow Manager revolutionizes how WooCommerce stores operate by automating the entire backend process. Store owners can create custom 'If This, Then That' logic loops. For example, if a high-value customer abandons their cart, WooFlow can automatically trigger a sequence of SMS and Email discounts. It also handles automatic inventory alerts to suppliers when stock is low, and dynamically changes user roles after specific purchases, turning a static store into a dynamic, hands-free sales machine.",
      features: ["Visual Automation Builder", "Abandoned Cart Recovery Sequences", "Dynamic User Role Assignment", "Low Stock Supplier Alerts", "SMS & Email Trigger Integrations"],
      pricing_info: "Premium Bundle Pricing via BundleWP",
      target_audience: "WooCommerce Store Owners, E-commerce Managers, Dropshippers"
    }
  ];

  try {
    const productsRef = db.collection('products');

    for (const product of products) {
      // Use sequential .add() instead of batch.set() to force REST API and avoid GRPC TLS hangs
      const docRef = await productsRef.add({
        ...product,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Added product: ${product.name} with ID: ${docRef.id}`);
    }

    console.log('All detailed products have been successfully seeded to the database!');
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

run();
