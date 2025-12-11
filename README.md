# SaaS Integration Master Plan: Shopify & Fiken

This document outlines the complete architecture and implementation guide for the SaaS integration. This service allows merchants to connect their Shopify stores to their Fiken accounting software.

**Core Architecture:**

- **Platform:** Next.js (App Router, TypeScript).
- **Database:** PostgreSQL (via Prisma ORM).
- **Authentication:** OAuth2 (Fiken) & Token Encryption (AES-256).
- **Shopify Config:** Managed via Shopify CLI (`shopify.app.toml`).
- **Logic Style:** Functional, Route-Centric.
- **Data Matching:** Strict ID Matching (Shopify Customer ID mapped to Fiken `memberNumberString`).

---

## Part 1: The Codebase (Implemented)

The following components are built and ready in your Next.js project.

### 1. Fiken Logic (The "Manager")

- **File:** `lib/fiken.ts`
- **Capabilities:**
  - `exchangeCodeForToken`: Swaps temporary auth codes for permanent, long-lived "Refresh Tokens."
  - **Smart Refresh:** When an Access Token is found to be expired during an operation (e.g., processing a new order), the app silently uses the Refresh Token to request and receive a new Access Token from Fiken, ensuring continuous operation without user re-authentication.

### 2. Security & Encryption

- **File:** `lib/encryption.ts`
- **Standard:** AES-256-CBC encryption.
- **Encryption Trigger:** Tokens are encrypted via the `POST /fiken/api/save-config` route immediately after the user authorizes the connection.
- **Decryption Trigger:** Decryption happens automatically in the background. For example, the Refresh Token is decrypted just-in-time when an Access Token expires and needs to be refreshed, which can occur during any Fiken-authenticated API call (like the `POST /api/shopify-webhook`).

### 3. The Webhook Logic (The "Brain") - **Code Written, Setup Pending**

- **File:** `app/api/shopify-webhook/route.ts`
- **Status:** Code for webhook processing is written.
- **Pending Setup:**
  - Configuration of Shopify secret (`SHOPIFY_CLIENT_SECRET`) is required for HMAC verification.
  - Full integration and testing with a live Shopify webhook are still needed.
- **Intended Flow (Once Setup):**
  1. Receives "Order Created" signal.
  2. Identifies Shop via Header.
  3. Retrieves encrypted credentials from DB.
  4. Matches/Creates Contact in Fiken.
  5. Creates Sales Order (`Salgsordre`).

---

## Part 2: The Intended User Experience (Future Flow)

Once you complete the Shopify configuration (Part 3), this is how the app _will_ work for users.

### 1. Installation & Authorization

- **Shopify Handshake:** The merchant clicks "Install" and is directed to your app.
- **Fiken Login:** They are immediately redirected to Fiken's secure login page.
- **Granting Permission:** The merchant logs in to Fiken and approves the integration.

### 2. Configuration (The "Handshake")

- **Company Selection:** Authenticated users see your **Company Selection Screen** (from Part 1).
- **Activation:** Clicking "Connect" securely encrypts their credentials and saves them to your database.

### 3. "It Just Works"

- **Automation:** Every sale in Shopify triggers the webhook logic.
- **Maintenance-Free:** The system automatically refreshes Fiken tokens in the background.

---

## Part 3: Shopify Configuration (Required Next Steps)

**You must perform these steps to make the app actually installable.**

### Prerequisites

1. **Public URL:** You must have a public HTTPS URL (e.g., Vercel deployment or `ngrok` for local testing). We refer to this as `[YOUR_APP_URL]`.
2. **Shopify CLI:** Installed (`npm install -g @shopify/cli@latest`) and logged in.

### Step 1: Link Project

Link your local folder to Shopify to create the App ID.

1. Run `shopify app config link` in the project root.
2. Select "Create a new app".
3. Name it "Fiken Sync SaaS".

### Step 2: Configuration as Code

Edit the generated `shopify.app.toml` file. This tells Shopify where to send users and webhooks.

**Copy/Paste this content (Replace `[YOUR_APP_URL]` with your real URL):**

```toml
# shopify.app.toml

client_id = "..." # Do not change (Auto-filled by CLI)
name = "Fiken Sync SaaS"
application_url = "[YOUR_APP_URL]"
embedded = true

[auth]
redirect_urls = [
  "[YOUR_APP_URL]/api/auth/shopify/callback",
  "[YOUR_APP_URL]/fiken/api/auth/callback"
]

[webhooks]
api_version = "2024-01"

  [[webhooks.subscriptions]]
  topics = [ "orders/create" ]
  uri = "/api/shopify-webhook"
```

### Step 3: Secrets Management

1. Run `shopify app info` to get your **Client Secret**.
2. Add it to your `.env` file as `SHOPIFY_CLIENT_SECRET`.

````bash
shopify app deploy```

## Part 4: Distribution & Usage

### 1. Distribute to Trusted Client

1. Log in to the **[Shopify Partner Dashboard](https://partners.shopify.com/)**.
2. Navigate to **Apps** > **Fiken Sync SaaS** > **Distribution**.
3. Click **Promote to custom app**.
4. Enter your client's store URL (e.g., `client-store.myshopify.com`).
5. Generate and copy the **Install Link**.

### 2. Client Installation

1. Send the link to the client.
2. They accept the install.
3. They are redirected to your **Company Selection Page** to finish the setup.

They are redirected to your Company Selection Page to finish the setup.
````
