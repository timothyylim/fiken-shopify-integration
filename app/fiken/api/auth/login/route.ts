import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.FIKEN_CLIENT_ID;
  const baseUrl = process.env.BASE_URL;
  const fikenRedirectPath = process.env.FIKEN_REDIRECT_URI;
  const baseUri = process.env.FIKEN_BASE_URL;

  // 1. Get the shop from the incoming URL
  const shop = request.nextUrl.searchParams.get("shop");

  if (!clientId || !baseUrl || !fikenRedirectPath || !baseUri) {
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

  const redirectUri = baseUrl + fikenRedirectPath;
  // 2. Create a secure state object
  const statePayload = JSON.stringify({
    shop: shop,
    nonce: Math.random().toString(36).substring(7),
  });
  const state = Buffer.from(statePayload).toString("base64");

  // 3. Construct the Fiken Authorization URL
  const fikenAuthUrl = new URL(`${baseUri}/oauth/authorize`);
  fikenAuthUrl.searchParams.append("client_id", clientId);
  fikenAuthUrl.searchParams.append("redirect_uri", redirectUri);
  fikenAuthUrl.searchParams.append("response_type", "code");
  fikenAuthUrl.searchParams.append("state", state);

  // 4. Redirect
  return NextResponse.redirect(fikenAuthUrl.toString());
}
