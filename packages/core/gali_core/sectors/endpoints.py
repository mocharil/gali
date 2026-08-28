"""Typed definitions and metadata for Sectors API endpoints."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

TierType = Literal["cold", "warm", "hot"]


@dataclass(frozen=True)
class EndpointMeta:
    path: str
    tier: TierType
    credit_cost: int
    description: str


# Registry of known Sectors API endpoints used in GALI
ENDPOINTS: dict[str, EndpointMeta] = {
    # Test / Smoke
    "subsectors": EndpointMeta(
        path="/v2/subsectors/",
        tier="cold",
        credit_cost=1,
        description="List of IDX subsectors",
    ),
    # Cold Tier — Mining reference, sites, licenses, national context
    "mining_companies": EndpointMeta(
        path="/v2/mining/companies/",
        tier="cold",
        credit_cost=1,
        description="Mining companies list (paginated, limit=30)",
    ),
    "mining_licenses": EndpointMeta(
        path="/v2/mining/licenses/",
        tier="cold",
        credit_cost=1,
        description="Mining licenses IUP/IUPK/KK from ESDM (paginated, limit=30)",
    ),
    "mining_sites": EndpointMeta(
        path="/v2/mining/sites/",
        tier="cold",
        credit_cost=1,
        description="Mining sites list (paginated, limit=30)",
    ),
    "mining_site_detail": EndpointMeta(
        path="/v2/mining/sites/{slug}/",
        tier="cold",
        credit_cost=1,
        description="Mining site detail with coordinates and reserve estimates",
    ),
    "mining_contracts": EndpointMeta(
        path="/v2/mining/contracts/",
        tier="cold",
        credit_cost=1,
        description="Mining contractor relationships",
    ),
    "mining_commodities": EndpointMeta(
        path="/v2/mining/commodities/",
        tier="cold",
        credit_cost=1,
        description="List of tracked commodities",
    ),
    "mining_exports": EndpointMeta(
        path="/v2/mining/exports/",
        tier="cold",
        credit_cost=1,
        description="National export destination data per commodity",
    ),
    "mining_total_production": EndpointMeta(
        path="/v2/mining/total-production/",
        tier="cold",
        credit_cost=1,
        description="National total production history",
    ),
    "mining_resources_reserves_province": EndpointMeta(
        path="/v2/mining/resources-reserves/{province}/",
        tier="cold",
        credit_cost=1,
        description="Provincial resources and reserves breakdown",
    ),
    "mining_global_commodity": EndpointMeta(
        path="/v2/mining/global-commodity/",
        tier="cold",
        credit_cost=1,
        description="Global commodity market context",
    ),
    "mining_license_auctions": EndpointMeta(
        path="/v2/mining/license-auctions/",
        tier="cold",
        credit_cost=1,
        description="ESDM WIUP license auctions",
    ),
    # Warm Tier — Company operations, financials, ownership, destinations (quarterly)
    "mining_company_performance": EndpointMeta(
        path="/v2/mining/companies/performance/{slug}/",
        tier="warm",
        credit_cost=1,
        description="Company production, reserves, strip ratio, quality specs",
    ),
    "mining_company_financials": EndpointMeta(
        path="/v2/mining/companies/financials/{slug}/",
        tier="warm",
        credit_cost=1,
        description="Company mining revenue and cost breakdown (USD)",
    ),
    "mining_company_ownership": EndpointMeta(
        path="/v2/mining/companies/ownership/{slug}/",
        tier="warm",
        credit_cost=1,
        description="Ownership tree: parents, subsidiaries, ticker mapping",
    ),
    "mining_sales_destination": EndpointMeta(
        path="/v2/mining/sales-destination/{slug}/",
        tier="warm",
        credit_cost=1,
        description="Sales breakdown by destination country",
    ),
    # Hot Tier — Market cap, commodity prices, flow data
    "companies_screener_structured": EndpointMeta(
        path="/v2/companies/",
        tier="hot",
        credit_cost=1,
        description="Structured company screener using where/order_by",
    ),
    "companies_screener_nl": EndpointMeta(
        path="/v2/companies/",
        tier="hot",
        credit_cost=3,
        description="Natural language company screener using ?q=",
    ),
    "companies_screener": EndpointMeta(
        path="/v2/companies/",
        tier="hot",
        credit_cost=1,
        description="Batch company screener for market caps and sector info (default structured)",
    ),
    "commodity_price": EndpointMeta(
        path="/v2/mining/commodities/{name}/price/",
        tier="hot",
        credit_cost=1,
        description="Monthly commodity benchmark price history",
    ),
    "daily_close": EndpointMeta(
        path="/v2/daily/{symbol}/",
        tier="hot",
        credit_cost=1,
        description="Daily stock close price and volume",
    ),
    "foreign_flow": EndpointMeta(
        path="/v2/foreign-flow/{symbol}/",
        tier="hot",
        credit_cost=1,
        description="Net foreign buy/sell flow",
    ),
    "broker_summary": EndpointMeta(
        path="/v2/broker-summary/",
        tier="hot",
        credit_cost=1,
        description="Top broker transactions by cohort",
    ),
    "free_float": EndpointMeta(
        path="/v2/free-float/{symbol}/",
        tier="hot",
        credit_cost=1,
        description="Free float percentage",
    ),
    "filings": EndpointMeta(
        path="/v2/filings/{symbol}/",
        tier="hot",
        credit_cost=1,
        description="Insider/substantial shareholder transaction filings",
    ),
    "company_report": EndpointMeta(
        path="/v2/company-report/{symbol}/",
        tier="hot",
        credit_cost=3,
        description="Comprehensive company report",
    ),
}
