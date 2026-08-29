"""Dagster refresh schedules for cold, warm, and hot tiers."""

from __future__ import annotations

from dagster import AssetSelection, ScheduleDefinition, define_asset_job

# Cold tier refresh job (monthly) — reference data, companies list, sites, contracts
cold_job = define_asset_job(
    name="cold_refresh_job",
    selection=AssetSelection.groups("raw", "core"),
    description="Monthly refresh of cold-tier mining and reference data.",
)

cold_schedule = ScheduleDefinition(
    job=cold_job,
    cron_schedule="0 0 1 * *",  # 1st day of each month at 00:00 UTC
    execution_timezone="Asia/Jakarta",
)

# Warm tier refresh job (quarterly) — company performance, financials, ownership, destinations
warm_job = define_asset_job(
    name="warm_refresh_job",
    selection=AssetSelection.assets(
        "core_company_performance",
        "core_company_financials",
        "core_sales_destinations",
    ),
    description="Quarterly refresh of company operational and financial reports.",
)

warm_schedule = ScheduleDefinition(
    job=warm_job,
    cron_schedule="0 0 1 */3 *",  # Quarterly on the 1st
    execution_timezone="Asia/Jakarta",
)

# Hot tier refresh job (daily at 18:30 WIB / 11:30 UTC after IDX close)
hot_job = define_asset_job(
    name="hot_refresh_job",
    selection=AssetSelection.groups("market") | AssetSelection.assets("core_commodity_prices"),
    description="Daily refresh after IDX market close.",
)

hot_schedule = ScheduleDefinition(
    job=hot_job,
    cron_schedule="30 18 * * 1-5",  # Mon-Fri at 18:30 WIB
    execution_timezone="Asia/Jakarta",
)

ALL_SCHEDULES = [cold_schedule, warm_schedule, hot_schedule]
ALL_JOBS = [cold_job, warm_job, hot_job]
