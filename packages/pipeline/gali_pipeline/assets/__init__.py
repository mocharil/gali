"""Dagster Assets package export."""

from gali_pipeline.assets.core import (
    core_commodity_prices,
    core_company_financials,
    core_company_performance,
    core_mining_companies,
    core_mining_contracts,
    core_mining_sites,
    core_sales_destinations,
)
from gali_pipeline.assets.graph import (
    graph_license_backfill,
    graph_ownership_structure,
)
from gali_pipeline.assets.market import market_idx_companies
from gali_pipeline.assets.metrics import metric_run_all
from gali_pipeline.assets.raw import (
    raw_companies_screener,
    raw_mining_commodities,
    raw_mining_commodity_prices,
    raw_mining_companies,
    raw_mining_contracts,
    raw_mining_sites,
)

RAW_ASSETS = [
    raw_mining_companies,
    raw_mining_sites,
    raw_mining_contracts,
    raw_mining_commodities,
    raw_mining_commodity_prices,
    raw_companies_screener,
]


CORE_ASSETS = [
    core_mining_companies,
    core_mining_sites,
    core_mining_contracts,
    core_company_performance,
    core_company_financials,
    core_sales_destinations,
    core_commodity_prices,
]

GRAPH_ASSETS = [
    graph_ownership_structure,
    graph_license_backfill,
]

MARKET_ASSETS = [
    market_idx_companies,
]

METRIC_ASSETS = [
    metric_run_all,
]

ALL_ASSETS = [*RAW_ASSETS, *CORE_ASSETS, *GRAPH_ASSETS, *MARKET_ASSETS, *METRIC_ASSETS]
