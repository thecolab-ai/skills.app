// Category taxonomy for the NZ skills, inferred from the skill set.
// Each skill maps to exactly one category; unmapped skills fall back to "other".

import {
  Building2,
  Bus,
  CloudSun,
  Fuel,
  type LucideIcon,
  MapPin,
  Package,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";

export interface Category {
  id: string;
  label: string;
  blurb: string;
  icon: LucideIcon;
}

export const CATEGORIES: Category[] = [
  {
    id: "transport",
    label: "Transport",
    blurb: "Buses, trains, ferries, flights, and road conditions",
    icon: Bus,
  },
  {
    id: "weather-environment",
    label: "Weather & Environment",
    blurb: "Forecasts, quakes, water quality, tides, and conservation",
    icon: CloudSun,
  },
  {
    id: "fuel-energy",
    label: "Fuel & Energy",
    blurb: "Petrol prices, fuel supply, and the electricity market",
    icon: Fuel,
  },
  {
    id: "groceries",
    label: "Groceries",
    blurb: "Supermarket prices, specials, and store data",
    icon: ShoppingCart,
  },
  {
    id: "retail",
    label: "Retail & Marketplace",
    blurb: "Product search, prices, and stock across NZ retailers",
    icon: ShoppingBag,
  },
  {
    id: "property",
    label: "Property & Land",
    blurb: "Estimates, rates, valuations, and LINZ geospatial data",
    icon: Building2,
  },
  {
    id: "finance",
    label: "Finance & Markets",
    blurb: "Banking, the RBNZ, the NZX, and mortgage rates",
    icon: TrendingUp,
  },
  {
    id: "government",
    label: "Government & Business",
    blurb: "Open data, official stats, company and vehicle registers",
    icon: Building2,
  },
  {
    id: "food-events",
    label: "Food & Events",
    blurb: "Dining deals, events, cinemas, and TV listings",
    icon: Ticket,
  },
  {
    id: "community",
    label: "Community & Civic",
    blurb: "Bin days, libraries, council facilities, and health services",
    icon: Users,
  },
  {
    id: "logistics",
    label: "Logistics & Post",
    blurb: "Parcel tracking and NZ Post locations",
    icon: Package,
  },
  {
    id: "places-news",
    label: "Places & News",
    blurb: "Points of interest and New Zealand headlines",
    icon: MapPin,
  },
  {
    id: "other",
    label: "Other",
    blurb: "Uncategorised skills",
    icon: Package,
  },
];

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

/** Authoritative skill → category map (all 54 skills). */
export const SKILL_CATEGORY: Record<string, string> = {
  // Transport
  "at-transport": "transport",
  "nz-buses": "transport",
  "nz-trains": "transport",
  "nz-ferries": "transport",
  "nz-airports": "transport",
  "nz-road-closures": "transport",
  // Weather & Environment
  "metservice-nz": "weather-environment",
  "geonet-nz": "weather-environment",
  "lawa-nz": "weather-environment",
  "safeswim-nz": "weather-environment",
  "nz-tides-surf": "weather-environment",
  "doc-nz": "weather-environment",
  // Fuel & Energy
  "fuelclock-nz": "fuel-energy",
  "gaspy-nz": "fuel-energy",
  "petrolmate-nz-au": "fuel-energy",
  "nz-electricity": "fuel-energy",
  // Groceries
  "paknsave-nz": "groceries",
  "newworld-nz": "groceries",
  "woolworths-nz": "groceries",
  // Retail & Marketplace
  bunnings: "retail",
  "mitre10-nz": "retail",
  kmart: "retail",
  "the-warehouse-nz": "retail",
  "briscoes-nz": "retail",
  "pbtech-nz": "retail",
  "bargainchemist-nz": "retail",
  "chemistwarehouse-nz": "retail",
  "nz-pricewatch": "retail",
  "trademe-nz": "retail",
  // Property & Land
  "homes-nz": "property",
  "property-rates-nz": "property",
  "linz-data-service": "property",
  // Finance & Markets
  "akahu-personal": "finance",
  "rbnz-data": "finance",
  nzx: "finance",
  "interest-co-nz": "finance",
  // Government & Business
  "data-govt-nz": "government",
  "stats-nz": "government",
  "companies-office-nz": "government",
  "nzbn-register": "government",
  "carjam-nz": "government",
  // Food & Events
  "first-table-nz": "food-events",
  "bookme-nz": "food-events",
  "eventfinda-nz": "food-events",
  "nz-cinemas": "food-events",
  "nz-tv-guide": "food-events",
  // Community & Civic
  "auckland-bin-schedule": "community",
  "wellington-bin-schedule": "community",
  "nz-libraries": "community",
  "nz-council": "community",
  "nz-healthpoint": "community",
  // Logistics & Post
  nzpost: "logistics",
  // Places & News
  "osm-nz": "places-news",
  "nz-news": "places-news",
};

export function categoryFor(skillName: string): Category {
  const id = SKILL_CATEGORY[skillName] ?? "other";
  return CATEGORY_BY_ID[id] ?? CATEGORY_BY_ID.other;
}
