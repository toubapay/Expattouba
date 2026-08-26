# SeneMarket Blueprint & Architecture

## 1. Tech Stack (Production)
- **Mobile App**: Flutter (Dart) with Riverpod for state management.
- **Backend API**: Node.js (NestJS) with PostgreSQL (Prisma/TypeORM) + Redis.
- **Admin Panel**: Next.js + Tailwind CSS.
- **Payments**: Wave Senegal API, Orange Money Web Payment.
- **AI Integration**: Gemini API for auto-tagging and description generation.

## 2. Database Schema (PostgreSQL)

```sql
-- Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendors (Boutiques)
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    boutique_name VARCHAR(100) NOT NULL,
    address TEXT,
    whatsapp_number VARCHAR(20),
    badge_status VARCHAR(20) DEFAULT 'BRONZE', -- BRONZE, SILVER, GOLD
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products / Listings
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'FCFA',
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SOLD, DRAFT
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Listing Media
CREATE TABLE listing_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(20) DEFAULT 'IMAGE', -- IMAGE, VIDEO, AUDIO
    is_primary BOOLEAN DEFAULT FALSE
);

-- Transactions / Wallet
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount DECIMAL(12, 2) NOT NULL,
    type VARCHAR(20), -- DEPOSIT, WITHDRAWAL, PAYMENT, TRANSFER
    status VARCHAR(20), -- PENDING, COMPLETED, FAILED
    gateway VARCHAR(50), -- WAVE, ORANGE_MONEY, MANUAL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 3. Core API Contracts (RESTful)

### Auth & Onboarding
- `POST /api/v1/auth/request-pin` - `{ "phone": "+22177..." }`
- `POST /api/v1/auth/verify-pin` - `{ "phone": "+22177...", "pin": "1234" }` -> Returns JWT
- `POST /api/v1/vendors/onboard` - `{ "boutiqueName": "...", "whatsapp": "..." }`

### Listings (Quick-Post)
- `POST /api/v1/listings` (Multipart/form-data)
  - Fields: `title`, `price`, `description`
  - Files: `media` (up to 5 images/videos), `voice_note` (optional)
- `POST /api/v1/ai/generate-description`
  - Payload: `{ "title": "Nike Air Max", "imageUrl": "..." }`
  - Response: `{ "description": "Chaussures Nike Air Max originales..." }`

### Wallet & Payments
- `GET /api/v1/wallet/balance`
- `POST /api/v1/wallet/topup/wave` - `{ "amount": 5000 }` -> Returns payment URL/Deep link

## 4. Frontend Prototype Details
This repository contains a functional **mobile-first web prototype** demonstrating the core UX:
- **Home Discovery**: Top categories and feed.
- **Quick-Post Flow**: AI-powered description generation.
- **Wallet Integration**: Mock UI for Wave/Orange Money top-ups.
