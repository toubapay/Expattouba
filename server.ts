import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, getUserWithVendor, getOrCreatePhoneUser } from './src/db/users.ts';
import { db } from './src/db/index.ts';
import { vendors, listings } from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;
  const JWT_SECRET = process.env.JWT_SECRET || 'secret-senemarket-key-2026';

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Phone Auth endpoint
  app.post("/api/v1/auth/phone", async (req, res) => {
    try {
      const { phone, pin } = req.body;
      if (!phone || !pin) return res.status(400).json({ error: "Phone and PIN required" });
      
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

  // Get feed listings
  app.get("/api/v1/listings", async (req, res) => {
    try {
      // For simplicity, just joining to get vendor details
      const feed = await db.select({
        id: listings.id,
        title: listings.title,
        price: listings.price,
        description: listings.description,
        image: listings.image,
        currency: listings.currency,
        whatsapp: listings.whatsapp,
        vendorId: vendors.id,
        vendorName: vendors.boutiqueName,
        vendorBadge: vendors.badgeStatus,
      }).from(listings).innerJoin(vendors, eq(listings.vendorId, vendors.id)).orderBy(desc(listings.createdAt));
      
      res.json(feed);
    } catch (error: any) {
      console.error("Fetch listings error:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Create listing
  app.post("/api/v1/listings", requireAuth, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { title, description, price } = req.body;
      const user = await getUserWithVendor(uid);
      
      if (!user || !user.vendor) {
        return res.status(403).json({ error: "User is not a vendor" });
      }

      // In a real app, upload file to GCS/Firebase Storage and get URL.
      // Here, we just store it as base64 for simplicity in the prototype (or simulate it).
      let imageUrl = "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=800"; // fallback
      if (req.file) {
         imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      }

      const newListing = await db.insert(listings).values({
        vendorId: user.vendor.id,
        title,
        description,
        price: price.toString(),
        image: imageUrl,
        whatsapp: user.vendor.whatsappNumber,
      }).returning();

      res.json(newListing[0]);
    } catch (error: any) {
      console.error("Create listing error:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  });

  // Mock Gemini API for Description Generation
  app.post("/api/ai/generate", upload.single("image"), async (req, res) => {
    try {
      const { title } = req.body;
      const file = req.file;

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

startServer();
