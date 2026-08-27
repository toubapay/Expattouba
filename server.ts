import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserWithVendor, getOrCreatePhoneUser } from './src/db/users.ts';
import { db } from './src/db/index.ts';
import { vendors } from './src/db/schema.ts';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './src/lib/jwt.ts';
import { checkRateLimit } from './src/lib/rateLimit.ts';
import { adminRouter } from './src/routes/admin.ts';
import { chatRouter } from './src/routes/chat.ts';
import { walletRouter } from './src/routes/wallet.ts';
import { vendorPlansRouter } from './src/routes/vendorPlans.ts';
import { paymentsRouter } from './src/routes/payments.ts';
import { seedCategories, listActiveCategories } from './src/db/categories.ts';
import { seedVendorPlans } from './src/db/vendorPlans.ts';
import { getHomeFeed, createListingForVendor, ListingLimitError } from './src/db/listings.ts';
import { getSettings } from './src/db/settings.ts';

// 5 MB cap: these routes buffer the whole upload into process memory
// (memoryStorage), so an unbounded size is a trivial memory-exhaustion DoS.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Render (and most PaaS hosts) terminate TLS at the edge and forward
  // over plain HTTP internally — without this, req.protocol always reads
  // "http" even for an external https:// request, which would build
  // http:// Paydunya callback/return URLs (src/routes/vendorPlans.ts's
  // APP_URL fallback) on a site that's only ever served over https.
  app.set('trust proxy', 1);

  app.use(express.json());
  app.use('/api/admin', adminRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/wallet', walletRouter);
  app.use('/api/v1/vendors/plans', vendorPlansRouter);
  app.use('/api/payments', paymentsRouter);

  // Seeded once, on an empty table — an admin's edits afterwards are never
  // touched again, same pattern as the sister app's seedServices().
  //
  // Caught rather than left to crash the boot: on a fresh database before
  // `npm run db:push` has been run (the schema here isn't auto-synced on
  // boot — see render.yaml), these tables don't exist yet, and this used
  // to take the whole process down as an unhandled rejection before the
  // health check could even come up. A missing table now just logs a
  // loud warning — every DB-backed route still 500s honestly until
  // db:push runs, but the process itself stays up.
  try {
    await seedCategories();
    await seedVendorPlans();
  } catch (error) {
    console.error(
      'Startup seeding failed — has `npm run db:push` been run against this database yet?',
      error
    );
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Phone Auth endpoint
  app.post("/api/v1/auth/phone", async (req, res) => {
    try {
      const { phone, pin } = req.body;
      if (!phone || !pin) return res.status(400).json({ error: "Phone and PIN required" });

      // A 4-digit PIN is only 10,000 combinations, so this route needs a
      // real cost to guessing — cap attempts per phone number rather than
      // relying on the PIN comparison alone.
      if (!checkRateLimit(`auth:${phone}`, 5, 15 * 60 * 1000)) {
        return res.status(429).json({ error: "Trop de tentatives. Reessayez plus tard." });
      }

      const user = await getOrCreatePhoneUser(phone, pin);
      const token = jwt.sign({ uid: user.uid, phone: user.phoneNumber }, JWT_SECRET, { expiresIn: '7d' });
      
      const userWithVendor = await getUserWithVendor(user.uid);
      res.json({ token, user: userWithVendor });
    } catch (error: any) {
      console.error("Phone auth error:", error);
      res.status(401).json({ error: error.message || "Authentication failed" });
    }
  });

  // Auth sync endpoint (called after Firebase login on client)
  app.post("/api/v1/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || "";
      const user = await getOrCreateUser(uid, email);
      const userWithVendor = await getUserWithVendor(uid);
      res.json(userWithVendor);
    } catch (error: any) {
      console.error("Auth sync error:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });

  // Onboard vendor
  app.post("/api/v1/vendors/onboard", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { boutiqueName, whatsappNumber, address } = req.body;
      const user = await getUserWithVendor(uid);
      if (!user) return res.status(404).json({ error: "User not found" });

      const newVendor = await db.insert(vendors).values({
        userId: user.id,
        boutiqueName,
        whatsappNumber,
        address,
      }).returning();

      res.json(newVendor[0]);
    } catch (error: any) {
      console.error("Vendor onboard error:", error);
      res.status(500).json({ error: "Failed to onboard vendor" });
    }
  });

  // Home page categories rail — admin-editable, seeded once from the old
  // hardcoded list (see seedCategories).
  app.get("/api/v1/categories", async (_req, res) => {
    try {
      res.json(await listActiveCategories());
    } catch (error) {
      console.error("Fetch categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // One request for the whole home screen: the active feed plus which of
  // those listings are "featured" right now — a vendor plan lapsing takes
  // effect on the very next fetch since featured is derived, not stored.
  app.get("/api/v1/home", async (req, res) => {
    try {
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const feed = await getHomeFeed(category);
      // Only the home-page display settings and the wallet-purchase switch
      // go out here — commission/fee defaults are margin, not something an
      // unauthenticated endpoint should ever publish (same reasoning as
      // the sister app's publicService()).
      const { home, walletPurchaseEnabled } = await getSettings();
      res.json({ ...feed, home, walletPurchaseEnabled });
    } catch (error) {
      console.error("Fetch home feed error:", error);
      res.status(500).json({ error: "Failed to fetch home feed" });
    }
  });

  // Kept for any existing caller — same feed, without the featured split.
  app.get("/api/v1/listings", async (req, res) => {
    try {
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const { listings } = await getHomeFeed(category);
      res.json(listings);
    } catch (error) {
      console.error("Fetch listings error:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Create listing
  app.post("/api/v1/listings", requireAuth, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { title, description, price, category } = req.body;
      const user = await getUserWithVendor(uid);

      if (!user || !user.vendor) {
        return res.status(403).json({ error: "User is not a vendor" });
      }

      const priceNumber = Number(price);
      if (!title || !Number.isFinite(priceNumber) || priceNumber <= 0) {
        return res.status(400).json({ error: "Titre et prix (nombre positif) requis" });
      }

      // In a real app, upload file to GCS/Firebase Storage and get URL.
      // Here, we just store it as base64 for simplicity in the prototype (or simulate it).
      let imageUrl = "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800"; // fallback
      if (req.file) {
         imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      }

      const newListing = await createListingForVendor({
        vendorId: user.vendor.id,
        title,
        description,
        price: priceNumber.toString(),
        image: imageUrl,
        whatsapp: user.vendor.whatsappNumber,
        category: category || null,
      });

      res.json(newListing);
    } catch (error: any) {
      if (error instanceof ListingLimitError) {
        return res.status(403).json({ error: error.message });
      }
      console.error("Create listing error:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  });

  // Mock Gemini API for Description Generation
  app.post("/api/ai/generate", requireAuth, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      const { title } = req.body;
      const file = req.file;

      // This spends the shared GEMINI_API_KEY quota per call — cap it per
      // signed-in user rather than leaving it open to anyone who can reach
      // the route.
      if (!checkRateLimit(`ai:${req.user!.uid}`, 20, 60 * 60 * 1000)) {
        return res.status(429).json({ error: "Trop de generations. Reessayez plus tard." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      let prompt = `You are an expert copywriter for a Senegalese marketplace (like Dakar-export). 
Write a catchy, SEO-friendly product description in French for a product titled: "${title}". 
Keep it short, engaging, and suitable for mobile (Instagram/Snapchat style). Include relevant emojis. Do not include hashtags.`;

      const contents = [];
      
      if (file) {
        contents.push({
          inlineData: {
             data: file.buffer.toString("base64"),
             mimeType: file.mimetype
          }
        });
        prompt += " Use the provided image to make the description more accurate.";
      }

      contents.push(prompt);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      res.json({ description: response.text });
    } catch (error) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: "Failed to generate description" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
