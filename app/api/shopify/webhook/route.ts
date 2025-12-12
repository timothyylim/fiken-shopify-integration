import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getValidTokenForShop } from "@/lib/fiken";
import crypto from "crypto";
import { FIKEN_CONFIG } from "@/app/fiken/lib/constants";
import { convertToNokMinor } from "@/app/fiken/lib/helpers";

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

    console.log(`Processing order webhook for shop: ${shopDomain}`);

    // 6. Process Order Logic
    const order = JSON.parse(rawBody);

    // --- LOG: Raw Shopify Order for Debugging ---
    console.log("--- SHOPIFY RAW ORDER ---");
    console.log(JSON.stringify(order, null, 2));
    console.log("-------------------------");

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
    console.log(`Using Fiken Contact ID: ${contactId} for order sync.`);

    // 8. Create Sales Order (Salgsordre)
    const baseUrl = process.env.FIKEN_API_BASE_URL;
    const fikenLines = [];
    const isNok = order.currency === "NOK";

    // 8a. Process Order Line Items
    for (const item of order.line_items) {
      // Calculate Line Total (Price * Qty) in minor units (cents/øre)
      const unitPriceMinor = Math.round(parseFloat(item.price) * 100);
      const lineTotalMinor = unitPriceMinor * item.quantity;

      // Skip zero-value lines to satisfy Fiken requirements
      if (lineTotalMinor === 0) continue;

      // Calculate NOK Equivalent (Base Currency)
      const lineTotalNok = convertToNokMinor(lineTotalMinor, order.currency);

      let lineObject: any = {
        description: `${item.quantity} x ${item.title}`,
        netPrice: lineTotalNok, // Base currency (NOK)
        netPriceInCurrency: lineTotalMinor, // Foreign currency
        vatType: FIKEN_CONFIG.vatTypes.outside, // Default to Export
        account: FIKEN_CONFIG.accounts.salesExport, // Default to Export
      };

      if (isNok) {
        // --- Domestic (NOK) Logic ---
        if (item.taxable) {
          lineObject.vatType = FIKEN_CONFIG.vatTypes.high;
          lineObject.account = FIKEN_CONFIG.accounts.salesTaxable;
          // Calculate VAT
          const vatAmount = Math.round(lineTotalNok * 0.25);
          lineObject.vat = vatAmount;
          lineObject.vatInCurrency = vatAmount;
        } else {
          lineObject.vatType = FIKEN_CONFIG.vatTypes.none;
          lineObject.account = FIKEN_CONFIG.accounts.salesExempt;
        }
      } else {
        // --- Foreign (Export) Logic ---
        // Use "OUTSIDE" to match account 3200.
        // Important: Do NOT add 'vat' fields here to avoid validation errors.
        lineObject.vatType = FIKEN_CONFIG.vatTypes.outside;
        lineObject.account = FIKEN_CONFIG.accounts.salesExport;
      }

      fikenLines.push(lineObject);
    }

    // 8b. Process Shipping Lines
    if (order.shipping_lines) {
      for (const shipping of order.shipping_lines) {
        const shippingAmountMinor = Math.round(
          parseFloat(shipping.price) * 100
        );

        if (shippingAmountMinor > 0) {
          const shippingNok = convertToNokMinor(
            shippingAmountMinor,
            order.currency
          );

          let shipObject: any = {
            description: `Shipping: ${shipping.title}`,
            netPrice: shippingNok,
            netPriceInCurrency: shippingAmountMinor,
            vatType: FIKEN_CONFIG.vatTypes.outside,
            account: FIKEN_CONFIG.accounts.salesExport,
          };

          if (isNok) {
            // Assume taxed if order has tax total > 0
            if (parseFloat(order.total_tax) > 0) {
              shipObject.vatType = FIKEN_CONFIG.vatTypes.high;
              shipObject.account = FIKEN_CONFIG.accounts.salesTaxable;
              const shipVat = Math.round(shippingNok * 0.25);
              shipObject.vat = shipVat;
              shipObject.vatInCurrency = shipVat;
            } else {
              shipObject.vatType = FIKEN_CONFIG.vatTypes.none;
              shipObject.account = FIKEN_CONFIG.accounts.salesExempt;
            }
          }

          fikenLines.push(shipObject);
        }
      }
    }

    // 8c. Calculate Final Totals
    const totalPaidMinor = Math.round(parseFloat(order.total_price) * 100);
    const totalPaidNok = convertToNokMinor(totalPaidMinor, order.currency);

    const salesOrderPayload = {
      kind: "external_invoice",
      date: order.created_at.split("T")[0], // YYYY-MM-DD
      customerId: contactId,

      // Total Paid in NOK (Base) - Required for accounting balance
      totalPaid: totalPaidNok,

      // Total Paid in Foreign Currency
      totalPaidInCurrency: totalPaidMinor,

      currency: order.currency,
      lines: fikenLines,
      identifier: order.name,
    };

    console.log(`Creating Fiken sales order for Shopify Order: ${order.name}`);

    // 8d. Send to Fiken
    const saleRes = await fetch(`${baseUrl}/companies/${companySlug}/sales`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fikenToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(salesOrderPayload),
    });

    if (!saleRes.ok) {
      const errorText = await saleRes.text();
      console.error("Fiken Sales Order Failed:", errorText);
      // Return 200 to stop retry loops, but log the error
      return NextResponse.json(
        { error: "Failed to create order in Fiken", details: errorText },
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
