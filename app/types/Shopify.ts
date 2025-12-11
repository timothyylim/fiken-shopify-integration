export interface ShopifyOrder {
  id: number; // Shopify uses numbers for IDs in JSON
  name: string; // e.g. "#1001"
  email: string;
  total_price: string;
  currency: string;
  customer: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    default_address?: {
      address1?: string;
      city?: string;
      zip?: string;
      country?: string;
    };
  };
  line_items: Array<{
    title: string;
    quantity: number;
    price: string;
    taxable: boolean;
  }>;
}
