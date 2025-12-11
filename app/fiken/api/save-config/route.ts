import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shopDomain,
      access_token,
      refresh_token,
      expires_in,
      company_slug,
    } = body;

    if (!shopDomain || !access_token || !company_slug) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Encrypt sensitive data
    const encryptedAccess = encrypt(access_token);
    // If refresh_token is missing (some flows), we might handle it gracefully or fail.
    // OAuth code flow should provide it.
    const encryptedRefresh = refresh_token ? encrypt(refresh_token) : "";

    // Calculate expiration
    const expiresAt = Date.now() + expires_in * 1000;

    await prisma.shop.upsert({
      where: { domain: shopDomain },
      update: {
        fikenToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: expiresAt,
        companySlug: company_slug,
      },
      create: {
        domain: shopDomain,
        fikenToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: expiresAt,
        companySlug: company_slug,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save Config Error:", error);
    return NextResponse.json(
      { error: "Failed to save configuration", details: error.message },
      { status: 500 }
    );
  }
}
