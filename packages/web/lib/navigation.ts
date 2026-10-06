import { Pickaxe, Scale, MapPin, SlidersHorizontal, TrendingDown, LineChart, ShieldCheck, BookOpen } from "lucide-react";

export const NAVIGATION_GROUPS = [
  { title: "Workspace", items: [
    { href: "/dashboard", label: "Dashboard", description: "Fundamental overview and issuer rankings", icon: Pickaxe },
    { href: "/compare", label: "Compare issuers", description: "Compare two issuers in one view", icon: Scale },
    { href: "/map", label: "Mining map", description: "Mining sites, operators, and related issuers", icon: MapPin },
  ] },
  { title: "Research & analysis", items: [
    { href: "/scenario", label: "Scenario Studio", description: "Test changes in prices, demand, and licenses", icon: SlidersHorizontal },
    { href: "/cost-curve", label: "Cost curve", description: "Cost per ton and production volume", icon: TrendingDown },
    { href: "/divergence", label: "Valuation map", description: "Compare reserve value and market capitalization", icon: LineChart },
  ] },
  { title: "Data & methodology", items: [
    { href: "/coverage", label: "Data coverage", description: "Completeness, data sources, and credit usage", icon: ShieldCheck },
    { href: "/methodology", label: "Methodology", description: "Formulas, assumptions, and calculation limits", icon: BookOpen },
  ] },
];

export const NAVIGATION_PAGES = NAVIGATION_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, category: group.title })));
