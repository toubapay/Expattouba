import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserWithVendor, getOrCreatePhoneUser, ensureSuperAdmin, verifyAdminLogin } from './src/db/users.ts';
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
import { favoritesRouter } from './src/routes/favorites.ts';
import { ensureSchema } from './src/db/ensureSchema.ts';
import { seedCategories, listActiveCategories } from './src/db/categories.ts';
import { seedVendorPlans } from './src/db/vendorPlans.ts';
import { getHomeFeed, createListingForVendor, ListingLimitError, ListingFilters } from './src/db/listings.ts';
import { getSettings } from './src/db/settings.ts';

// 5 MB cap: these routes buffer the whole upload into process memory
// (memoryStorage), so an unbounded size is a trivial memory-exhaustion DoS.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Shared by GET /api/v1/home and GET /api/v1/listings — one place that
// decides what a query string is allowed to mean, so the two endpoints
// can't quietly diverge on how minPrice/maxPrice get parsed.
function parseListingFilters(query: any): ListingFilters {
  const str = (v: any) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const num = (v: any) => {
    const s = str(v);
    if (s === undefined) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    category: str(query.category),
    city: str(query.city),
    minPrice: num(query.minPrice),
    maxPrice: num(query.maxPrice),
    q: str(query.q),
  };
}

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
  app.use('/api/v1/favorites', favoritesRouter);

  // Schema sync runs on every boot — see ensureSchema.ts for why this
  // replaced `npm run db:push` as a required manual step. Seeding is
  // still caught separately: schema sync succeeding doesn't guarantee
  // the categories/plans seed queries can't fail for some unrelated
  // reason, and either way a seeding problem shouldn't crash the process
  // before the health check can come up.
  try {
    await ensureSchema();
    await ensureSuperAdmin();
    await seedCategories();
    await seedVendorPlans();
  } catch (error) {
    console.error('Startup schema sync or seeding failed:', error);
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

  // Superadmin email+password login — see users.ts's ensureSuperAdmin for
  // why this exists alongside Google/ADMIN_EMAILS rather than replacing it.
  app.post("/api/v1/auth/admin-login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

      if (!checkRateLimit(`admin-login:${email}`, 5, 15 * 60 * 1000)) {
        return res.status(429).json({ error: "Trop de tentatives. Reessayez plus tard." });
      }

      const admin = await verifyAdminLogin(email, password);
      // email goes in the token too, not just uid — /api/v1/auth/sync
      // (shared with phone/Google) reads req.user.email and upserts it
      // straight into the users row; without it, the first sync call
      // after login would overwrite this account's email to empty.
      const token = jwt.sign({ uid: admin.uid, email: admin.email }, JWT_SECRET, { expiresIn: '7d' });

      const userWithVendor = await getUserWithVendor(admin.uid);
      res.json({ token, user: userWithVendor });
    } catch (error: any) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
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
      const feed = await getHomeFeed(parseListingFilters(req.query));
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
      const { listings } = await getHomeFeed(parseListingFilters(req.query));
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
      const { title, description, price, category, city } = req.body;
      const user = await getUserWithVendor(uid);

      if (!user || !user.vendor) {
        return res.status(403).json({ error: "User is not a vendor" });
      }

      const priceNumber = Number(price);
      if (!title || !Number.isFinite(priceNumber) || priceNumber <= 0) {
        return res.status(400).json({ error: "Titre et prix (nombre positif) requis" });
      }

      // Sent as a JSON string in the multipart body (category-specific
      // fields from PostView's dynamic form — see src/lib/categoryFields.ts).
      // Malformed or absent is fine, not an error: not every category has
      // extra fields, and this must never reject a listing over it.
      let attributes: Record<string, string | number> | null = null;
      if (typeof req.body.attributes === "string" && req.body.attributes.trim()) {
        try {
          const parsed = JSON.parse(req.body.attributes);
          if (parsed && typeof parsed === "object") attributes = parsed;
        } catch {
          // ignored — attributes stay null
        }
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
        city: city || null,
        attributes,
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
