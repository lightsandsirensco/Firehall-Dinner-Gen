/**
 * Regional grocery banner catalog — filtered by province/country at discovery time.
 * Not a universal UI list; each hall sees banners for their region only.
 */

export interface RegionalBanner {
  banner: string;
  /** Provinces/states where this banner operates */
  regions: string[];
  countries: string[];
  supports_deals: boolean;
  /** Typical store name pattern */
  name_template: string;
}

export const REGIONAL_GROCERY_BANNERS: RegionalBanner[] = [
  { banner: "No Frills", regions: ["ON", "BC", "AB", "MB", "SK"], countries: ["CA"], supports_deals: true, name_template: "No Frills" },
  { banner: "Food Basics", regions: ["ON", "QC"], countries: ["CA"], supports_deals: true, name_template: "Food Basics" },
  { banner: "Metro", regions: ["ON", "QC"], countries: ["CA"], supports_deals: true, name_template: "Metro" },
  { banner: "Loblaws", regions: ["ON", "BC", "AB"], countries: ["CA"], supports_deals: true, name_template: "Loblaws" },
  { banner: "Real Canadian Superstore", regions: ["ON", "BC", "AB", "MB", "SK"], countries: ["CA"], supports_deals: true, name_template: "Real Canadian Superstore" },
  { banner: "Walmart", regions: ["ON", "BC", "AB", "MB", "SK", "QC", "NS", "NB"], countries: ["CA"], supports_deals: true, name_template: "Walmart" },
  { banner: "Costco", regions: ["ON", "BC", "AB", "MB", "SK", "QC"], countries: ["CA"], supports_deals: false, name_template: "Costco" },
  { banner: "Sobeys", regions: ["ON", "BC", "AB", "NS", "NB", "NL", "PE"], countries: ["CA"], supports_deals: true, name_template: "Sobeys" },
  { banner: "FreshCo", regions: ["ON", "AB", "SK", "MB"], countries: ["CA"], supports_deals: true, name_template: "FreshCo" },
  { banner: "Giant Tiger", regions: ["ON", "MB", "SK", "AB"], countries: ["CA"], supports_deals: true, name_template: "Giant Tiger" },
  { banner: "Safeway", regions: ["BC", "AB", "MB", "SK"], countries: ["CA"], supports_deals: true, name_template: "Safeway" },
  { banner: "Kroger", regions: ["CA", "TX", "OH", "GA", "MI"], countries: ["US"], supports_deals: true, name_template: "Kroger" },
  { banner: "Safeway", regions: ["CA", "WA", "OR", "AZ", "CO"], countries: ["US"], supports_deals: true, name_template: "Safeway" },
  { banner: "Walmart", regions: ["TX", "CA", "FL", "NY", "IL"], countries: ["US"], supports_deals: true, name_template: "Walmart" },
  { banner: "Costco", regions: ["CA", "WA", "TX", "NY", "FL"], countries: ["US"], supports_deals: false, name_template: "Costco" },
];

export function bannersForRegion(country: string, provinceState: string | null): RegionalBanner[] {
  return REGIONAL_GROCERY_BANNERS.filter((b) => {
    if (!b.countries.includes(country)) return false;
    if (!provinceState) return true;
    return b.regions.includes(provinceState);
  });
}
