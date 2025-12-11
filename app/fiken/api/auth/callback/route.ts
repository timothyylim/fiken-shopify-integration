import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@lib/fiken";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // 1. Handle Fiken Errors
  if (error) {
    return NextResponse.json(
      { error: `Fiken Auth Error: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  // 2. Decode the State to get the Shop back
  let shop = "";
  try {
    if (state) {
      const decodedState = JSON.parse(
        Buffer.from(state, "base64").toString("utf-8")
      );
      shop = decodedState.shop;
    }
  } catch (e) {
    console.error("Failed to decode state:", e);
    return NextResponse.json(
      { error: "Invalid state parameter" },
      { status: 400 }
    );
  }

  if (!shop) {
    return NextResponse.json(
      { error: "Shop parameter lost during OAuth flow." },
      { status: 400 }
    );
  }

  try {
    // 3. Exchange the code for a persistent access token
    const tokenData = await exchangeCodeForToken(code);

    // 4. Redirect to your Select Company Page
    const selectCompanyUrl = new URL("/fiken/select-company", request.url);

    // 5. Pass EVERYTHING to the frontend
    selectCompanyUrl.searchParams.append("token", tokenData.access_token);
    if (tokenData.refresh_token) {
      selectCompanyUrl.searchParams.append(
        "refresh_token",
        tokenData.refresh_token
      );
    }
    if (tokenData.expires_in) {
      selectCompanyUrl.searchParams.append(
        "expires_in",
        tokenData.expires_in.toString()
      );
    }
    // Pass the shop back to the UI
    selectCompanyUrl.searchParams.append("shop", shop);

    return NextResponse.redirect(selectCompanyUrl);
  } catch (err: any) {
    console.error("Auth Callback Error:", err);
    return NextResponse.json(
      { error: "Failed to exchange token", details: err.message },
      { status: 500 }
    );
  }
}
