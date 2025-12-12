import { FIKEN_CONFIG } from "./constants";

export const fetcher = async (url: string, token: string) => {
  if (!token) throw new Error("No token provided");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const error: any = new Error("Failed to fetch");
    error.status = res.status;
    throw error;
  }

  return res.json();
};

export function convertToNokMinor(
  amountMinor: number,
  currency: string
): number {
  if (currency === "NOK") return amountMinor;

  const rate =
    FIKEN_CONFIG.exchangeRates[currency] || FIKEN_CONFIG.exchangeRates.DEFAULT;
  return Math.round(amountMinor * rate);
}
