import { FikenToken } from "@mytypes/Fiken";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { Shop } from "./generated/prisma/client";

// 1. Initial Exchange (Used in Callback)
export async function exchangeCodeForToken(code: string): Promise<FikenToken> {
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", process.env.FIKEN_REDIRECT_URI!);
  params.append("client_id", process.env.FIKEN_CLIENT_ID!);
  params.append("client_secret", process.env.FIKEN_CLIENT_SECRET!);

  const res = await fetch(`${process.env.FIKEN_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Fiken Token Exchange Failed:", errorText);
    throw new Error(`Failed to exchange token: ${errorText}`);
  }

  return res.json();
}

// 2. Refresh Token Logic (Internal Helper)
async function refreshFikenToken(oldRefreshToken: string): Promise<FikenToken> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", oldRefreshToken);
  params.append("client_id", process.env.FIKEN_CLIENT_ID!);
  params.append("client_secret", process.env.FIKEN_CLIENT_SECRET!);

  const res = await fetch(`${process.env.FIKEN_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return (await res.json()) as FikenToken;
}

// 3. Get Valid Token (Used by Webhook)
export async function getValidTokenForShop(
  shopDomain: string
): Promise<string> {
  // Explicitly typing the result as 'Shop | null' from Prisma
  const shop: Shop | null = await prisma.shop.findUnique({
    where: { domain: shopDomain },
  });

  if (!shop) throw new Error(`Shop not found: ${shopDomain}`);

  const now = Date.now();
  // Convert BigInt to Number for comparison
  const expiresAt = Number(shop.expiresAt);
  const buffer = 5 * 60 * 1000; // 5 minute buffer before actual expiration

  // Case A: Token is still valid
  if (now < expiresAt - buffer) {
    return decrypt(shop.fikenToken);
  }

  // Case B: Token expired -> Refresh it
  console.log(`Refreshing expired token for ${shopDomain}...`);

  // Decrypt the stored refresh token to use it
  const decryptedRefreshToken = decrypt(shop.refreshToken);

  // Perform the refresh
  const newTokenData = await refreshFikenToken(decryptedRefreshToken);

  // Encrypt new tokens before saving
  const encryptedAccess = encrypt(newTokenData.access_token);

  // If Fiken rotates the refresh token, use the new one. Otherwise keep the old one.
  const encryptedRefresh = newTokenData.refresh_token
    ? encrypt(newTokenData.refresh_token)
    : shop.refreshToken;

  // Calculate new expiration (Fiken returns seconds, we store milliseconds)
  const newExpiresAt = Date.now() + newTokenData.expires_in * 1000;

  // Update DB
  await prisma.shop.update({
    where: { domain: shopDomain },
    data: {
      fikenToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: newExpiresAt,
    },
  });

  return newTokenData.access_token;
}
