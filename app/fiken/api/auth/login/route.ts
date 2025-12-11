import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.FIKEN_CLIENT_ID;
  const redirectUri = process.env.FIKEN_REDIRECT_URI;
  const baseUri = process.env.FIKEN_BASE_URL;

  // 1. Get the shop from the incoming URL (Standard Shopify behavior)
  const shop = request.nextUrl.searchParams.get("shop");

  if (!clientId || !redirectUri || !baseUri) {
    return NextResponse.json(
      { error: "Missing Fiken credentials in .env" },
      { status: 500 }
    );
  }

  if (!shop) {
    return NextResponse.json(
      {
        error:
          "Missing 'shop' parameter. Please launch this app from your Shopify Admin.",
      },
      { status: 400 }
    );
  }

  // 2. Create a secure state object containing the shop
  // We encode this so it can pass through Fiken's OAuth flow safely
  const statePayload = JSON.stringify({
    shop: shop,
    nonce: Math.random().toString(36).substring(7), // Security nonce
  });
  const state = Buffer.from(statePayload).toString("base64");

  // 3. Construct the Fiken Authorization URL
  const fikenAuthUrl = new URL(`${baseUri}/oauth/authorize`);
  fikenAuthUrl.searchParams.append("client_id", clientId);
  fikenAuthUrl.searchParams.append("redirect_uri", redirectUri);
  fikenAuthUrl.searchParams.append("response_type", "code");
  fikenAuthUrl.searchParams.append("state", state);

  // 4. Redirect the user to Fiken
  return NextResponse.redirect(fikenAuthUrl.toString());
}
