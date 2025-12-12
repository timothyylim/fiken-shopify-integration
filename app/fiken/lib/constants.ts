// ---------------------------------------------------------
// Configuration: Accounts, VAT Types, and Rates
// ---------------------------------------------------------

export const FIKEN_CONFIG = {
  accounts: {
    salesTaxable: "3000", // Salgsinntekt, avgiftspliktig
    salesExempt: "3100", // Salgsinntekt, avgiftsfri (innenfor avgiftsområdet)
    salesExport: "3200", // Salgsinntekt, utenfor avgiftsområdet (Eksport)
  },
  vatTypes: {
    high: "HIGH", // 25% VAT
    none: "NONE", // 0% VAT (Domestic exempt)
    outside: "OUTSIDE", // Export/Foreign (Exempt)
  },
  // In a real production app, fetch live rates from Norges Bank API
  exchangeRates: {
    USD: 10.11,
    EUR: 11.2,
    GBP: 13.0,
    DEFAULT: 1.0,
  } as Record<string, number>,
};
