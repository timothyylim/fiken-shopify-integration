export interface FikenToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface FikenCompany {
  name: string;
  slug: string; // The "companySlug" needed for API calls
  organizationNumber: string;
  vatType: string;
}

export interface FikenContact {
  contactId: number;
  name: string;
  email: string;
  memberNumberString?: string; // Where we store the Shopify Customer ID
}
