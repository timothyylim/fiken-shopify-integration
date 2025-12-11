import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidTokenForShop } from "@/lib/fiken"; // Ensure this matches your file path
import crypto from "crypto";

// ---------------------------------------------------------
// Helper: Verify Webhook HMAC (Security)
// ---------------------------------------------------------
async function verifyShopifyWebhook(req: NextRequest, rawBody: string) {
  const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256");
  const secret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!hmacHeader || !secret) {
    console.warn("Missing HMAC header or SHOPIFY_CLIENT_SECRET");
    return false;
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return hash === hmacHeader;
}

// ---------------------------------------------------------
// Helper: Search Fiken Contact
// ---------------------------------------------------------
async function getContact(
  token: string,
  companySlug: string,
  shopifyId: string
) {
  // Uses API base URL (api.fiken.no/api/v2)
  const baseUrl = process.env.FIKEN_API_BASE_URL;

  const res = await fetch(
    `${baseUrl}/companies/${companySlug}/contacts?memberNumberString=${shopifyId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.length > 0 ? data[0] : null;
}

// ---------------------------------------------------------
// Helper: Create Fiken Contact
// ---------------------------------------------------------
async function createContact(
  token: string,
  companySlug: string,
  customer: any
) {
  const baseUrl = process.env.FIKEN_API_BASE_URL;

  const res = await fetch(`${baseUrl}/companies/${companySlug}/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: customer.first_name
        ? `${customer.first_name} ${customer.last_name}`
        : customer.email,
      email: customer.email,
      memberNumberString: customer.id.toString(), // The strict link
      customer: true,
      address: customer.default_address
        ? {
            postalCode: customer.default_address.zip,
            postalPlace: customer.default_address.city,
            address1: customer.default_address.address1,
            country: customer.default_address.country,
          }
        : undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create contact: ${errText}`);
  }

  // Fiken usually returns the created object URL in 'Location' header
  const location = res.headers.get("Location");
  if (location) {
    const newRes = await fetch(location, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return newRes.json();
  }

  // Fallback: try parsing body if available
  try {
    return await res.json();
  } catch (e) {
    throw new Error("Contact created but failed to retrieve ID");
  }
}

// ---------------------------------------------------------
// Main Route Handler
// ---------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // 1. Get Raw Body (Critical for HMAC verification)
    const rawBody = await req.text();

    // 2. Verify Security
    const isValid = await verifyShopifyWebhook(req, rawBody);
    if (!isValid) {
      console.error("HMAC Verification Failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Identify the Shop
    const shopDomain = req.headers.get("X-Shopify-Shop-Domain");
    if (!shopDomain) {
      return NextResponse.json(
        { error: "Missing Shop Domain Header" },
        { status: 400 }
      );
    }

    // 4. Get Valid Token (Handles DB lookup, Decryption, and Refresh)
    let fikenToken: string;
    try {
      fikenToken = await getValidTokenForShop(shopDomain);
    } catch (e: any) {
      console.error(`Token/Auth Error for ${shopDomain}:`, e.message);
      // Return 200 to stop Shopify retries if we don't have this shop on file
      return NextResponse.json(
        { message: "Shop not authorized" },
        { status: 200 }
      );
    }

    // 5. Get Company Slug (Need to look up separately as it's not in the token return)
    const shopConfig = await prisma.shop.findUnique({
      where: { domain: shopDomain },
    });
    if (!shopConfig) {
      return NextResponse.json(
        { error: "Configuration lost" },
        { status: 404 }
      );
    }
    const companySlug = shopConfig.companySlug;

    // 6. Process Order Logic
    const order = JSON.parse(rawBody);

    // Safety check: Ensure customer exists
    if (!order.customer) {
      console.log("Order has no customer, skipping sync.");
      return NextResponse.json(
        { message: "No customer data" },
        { status: 200 }
      );
    }

    // 7. Find or Create Contact
    let contact = await getContact(
      fikenToken,
      companySlug,
      order.customer.id.toString()
    );

    if (!contact) {
      console.log(
        `Creating new Fiken contact for Shopify ID: ${order.customer.id}`
      );
      contact = await createContact(fikenToken, companySlug, order.customer);
    }

    const contactId = contact.contactId;

    // 8. Create Sales Order (Salgsordre)
    const baseUrl = process.env.FIKEN_API_BASE_URL;

    const salesOrderPayload = {
      date: order.created_at.split("T")[0], // YYYY-MM-DD
      customer: { contactId: contactId },
      currency: order.currency,
      lines: order.line_items.map((item: any) => ({
        description: item.title,
        quantity: item.quantity,
        unitPrice: parseFloat(item.price),
        vatType: item.taxable ? "HIGH" : "NONE", // Simple logic: High (25%) or None.
        // For production, you might need a mapping table for tax codes.
      })),
      // Optional: Add shipping line if shipping cost exists
      // Optional: Add external invoice reference (Shopify Order Name)
      identifier: order.name,
    };

    const saleRes = await fetch(`${baseUrl}/companies/${companySlug}/sales`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fikenToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(salesOrderPayload),
    });

    if (!saleRes.ok) {
      console.error("Fiken Sales Order Failed:", await saleRes.text());
      // Return 200 to stop retry loops, but log the error
      return NextResponse.json(
        { error: "Failed to create order in Fiken" },
        { status: 200 }
      );
    }

    console.log(`Successfully synced order ${order.name} to Fiken.`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Internal Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
