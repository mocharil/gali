"""End-to-end API regressions using the explicit synthetic fixture dataset."""

import pytest
from gali_api.main import app
from httpx import ASGITransport, AsyncClient

pytestmark = [pytest.mark.anyio, pytest.mark.usefixtures("seeded_dataset")]


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.parametrize(
    "body",
    [
        {"destination_shocks": {"China": -0.1}},
        {"destination_shocks": {"China": 1.1}},
        {"destination_shocks": {"": 0.5}},
        {"price_shock_pct": 3},
        {"discount_rate": 0},
        {"variable_cost_share": 2},
    ],
)
async def test_scenario_invalid_parameters_return_422(body):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.post("/v1/scenario", json=body)).status_code == 422


async def test_map_preserves_shared_ownership_and_excludes_incomplete_gps():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        data = (await client.get("/v1/sites?issuer=ADRO")).json()
        site = next(site for site in data["features"] if site["properties"]["slug"] == "qa-tutupan")
        assert set(site["properties"]["issuer_symbols"]) == {"ADRO", "AADI"}
        assert all(site["properties"]["slug"] != "qa-missing-latitude" for site in data["features"])
        coverage = (await client.get("/v1/coverage")).json()
        gps = next(metric for metric in coverage["metrics"] if metric["entity"] == "In-Universe Mining Sites GPS")
        assert gps["numerator"] == 1
        assert gps["denominator"] == 2


async def test_flow_window_excludes_old_huge_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = (await client.get("/v1/flow-overlay")).json()
        aadi = next(item for item in response["issuers"] if item["symbol"] == "AADI")
        assert aadi["net_foreign_flow_30d_idr"] == 1e9


async def test_published_scenario_uses_latest_period_and_frozen_inputs():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        detail = (await client.get("/v1/issuers/AADI")).json()
        assert detail["rli_years"] == 20
        assert detail["attributable_gross_profit_usd"] == 400e6
        assert detail["evidence"]["provenance"]["rbv_model"]["excluded_identity_links"] == ["qa-aadi"]
        assert detail["evidence"]["provenance"]["financial_years"]["qa-aadi-operator"] == 2025
        assert "qa-aadi-operator" in detail["evidence"]["source_references"][0]["endpoint"]
        price = (await client.post("/v1/scenario", json={"price_shock_pct": -0.25})).json()
        aadi = next(item for item in price["impacts"] if item["symbol"] == "AADI")
        assert aadi["delta_rbv_pct"] == -62.5
        assert aadi["model_basis"] == "revenue_cost"
        assert aadi["baseline_rbv_usd"] == detail["reserve_backed_value_usd"]
        assert sum(driver["delta_rbv_usd"] for driver in aadi["drivers"]) == pytest.approx(
            aadi["delta_rbv_usd"], abs=0.02
        )
        assert aadi["sensitivity"]


async def test_score_rankings_keep_incomplete_scores_provisional():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = (await client.get("/v1/rankings?metric=ground_truth_score")).json()
        items = response["items"]
        provisional = [item for item in items if item["ranking_status"] == "provisional"]
        assert provisional
        assert all(item["rank"] is None for item in provisional)
        assert all(item["rank"] is not None for item in items if item["ranking_status"] == "complete")


async def test_gross_loss_and_sensitivity_survive_api_serialization():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = (await client.post("/v1/scenario", json={"price_shock_pct": -1})).json()
        aadi = next(item for item in response["impacts"] if item["symbol"] == "AADI")
        assert aadi["post_shock_gp_usd"] == -600e6
        assert aadi["gross_loss_usd"] == 600e6
        assert aadi["post_shock_rbv_usd"] == 0
        assert all(item["delta_rbv_pct"] == -100 for item in aadi["sensitivity"] if item["price_shock_pct"] == -1)


async def test_unknown_issuer_and_unsupported_commodity():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/v1/issuers/UNKNOWN")).status_code == 404
        assert (await client.get("/v1/cost-curve?commodity=Nickel")).status_code == 422
