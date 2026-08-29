"""Integration tests for GALI FastAPI Layer (Tasks 5.1–5.10)."""

import pytest
from gali_api.main import app
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_health_check():
    """Verify /health returns 200 OK with status ok."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data


@pytest.mark.anyio
async def test_readiness_check():
    """Verify /ready checks DB and returns published run ID."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/ready")
        assert resp.status_code in (200, 503)
        data = resp.json()
        assert "database" in data
        if resp.status_code == 200:
            assert data["status"] == "ready"
            assert data["published_run_id"] is not None


@pytest.mark.anyio
async def test_list_issuers():
    """Verify GET /v1/issuers returns 9 in-universe coal titans with proper data quality flags."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/issuers")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 9

        symbols = [item["symbol"] for item in data]
        for expected in [
            "AADI",
            "ADMR",
            "ADRO",
            "BUMI",
            "BYAN",
            "GEMS",
            "ITMG",
            "PTBA",
            "DSSA",
        ]:
            assert expected in symbols

        # Verify strict data quality tagging
        ptba = next(item for item in data if item["symbol"] == "PTBA")
        dssa = next(item for item in data if item["symbol"] == "DSSA")
        adro = next(item for item in data if item["symbol"] == "ADRO")

        assert ptba["data_quality"] == "PARSIAL"
        assert dssa["data_quality"] == "PARSIAL"
        assert adro["data_quality"] == "LENGKAP"


@pytest.mark.anyio
async def test_get_issuer_detail_complete_and_partial():
    """Verify GET /v1/issuers/{symbol} for complete (ADRO) vs partial (PTBA, DSSA)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Complete issuer: ADRO
        resp_adro = await client.get("/v1/issuers/ADRO")
        assert resp_adro.status_code == 200
        data_adro = resp_adro.json()
        assert data_adro["symbol"] == "ADRO"
        assert data_adro["rli_years"] is not None
        assert data_adro["reserve_backed_value_usd"] is not None
        assert len(data_adro["linked_entities"]) > 0
        assert "source_raw_response_ids" in data_adro["evidence"]

        # 2. Partial issuer: PTBA (revenue/cost missing -> RBV & Cash Cost NULL)
        resp_ptba = await client.get("/v1/issuers/PTBA")
        assert resp_ptba.status_code == 200
        data_ptba = resp_ptba.json()
        assert data_ptba["data_quality"] == "PARSIAL"
        assert data_ptba["rli_years"] is not None  # PTBA has reserves (2933 Mt)
        assert data_ptba["reserve_backed_value_usd"] is None
        assert data_ptba["cash_cost_per_ton_usd"] is None

        # 3. Partial issuer: DSSA (reserves missing -> RLI & RBV NULL)
        resp_dssa = await client.get("/v1/issuers/DSSA")
        assert resp_dssa.status_code == 200
        data_dssa = resp_dssa.json()
        assert data_dssa["data_quality"] == "PARSIAL"
        assert data_dssa["rli_years"] is None
        assert data_dssa["reserve_backed_value_usd"] is None


@pytest.mark.anyio
async def test_get_issuer_graph():
    """Verify GET /v1/issuers/{symbol}/graph returns nodes and edges."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/issuers/AADI/graph")
        assert resp.status_code == 200
        data = resp.json()
        assert data["symbol"] == "AADI"
        assert len(data["nodes"]) >= 2
        assert len(data["edges"]) >= 1


@pytest.mark.anyio
async def test_get_mining_sites_geojson():
    """Verify GET /v1/sites returns valid RFC 7946 GeoJSON FeatureCollection with [lon, lat] coordinates."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/sites?in_universe_only=true")
        assert resp.status_code == 200
        data = resp.json()
        assert data["type"] == "FeatureCollection"
        assert data["total_features"] == len(data["features"])
        assert data["total_features"] > 0

        first_feature = data["features"][0]
        assert first_feature["type"] == "Feature"
        assert first_feature["geometry"]["type"] == "Point"
        coords = first_feature["geometry"]["coordinates"]
        assert len(coords) == 2
        # Check coordinate bounds for Indonesia: Longitude [95, 141], Latitude [-11, 6]
        lon, lat = coords[0], coords[1]
        assert 90.0 <= lon <= 145.0
        assert -15.0 <= lat <= 10.0
        assert "slug" in first_feature["properties"]
        assert "issuer_symbol" in first_feature["properties"]


@pytest.mark.anyio
async def test_get_rankings():
    """Verify GET /v1/rankings returns sorted leaderboard."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/rankings?metric=ground_truth_score")
        assert resp.status_code == 200
        data = resp.json()
        assert data["metric"] == "ground_truth_score"
        assert len(data["items"]) == 9
        assert data["items"][0]["rank"] == 1


@pytest.mark.anyio
async def test_get_cost_curve():
    """Verify GET /v1/cost-curve returns sorted points and excludes partial issuers."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/cost-curve")
        assert resp.status_code == 200
        data = resp.json()
        assert data["commodity"] == "Coal"
        assert data["benchmark_price_usd"] > 0
        assert len(data["points"]) > 0
        assert "PTBA" in data["partial_issuers_excluded"]

        # Points must be sorted ascending by cash cost
        costs = [p["cash_cost_per_ton_usd"] for p in data["points"]]
        assert costs == sorted(costs)


@pytest.mark.anyio
async def test_post_scenario_empty_body_invariant():
    """Task 5.12 API Invariant: Verify POST /v1/scenario with empty body produces exactly 0 delta on all complete issuers."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/v1/scenario", json={})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["impacts"]) == 9

        for imp in data["impacts"]:
            if imp["is_partial"]:
                assert imp["baseline_rbv_usd"] is None
                assert imp["post_shock_rbv_usd"] is None
            else:
                assert imp["baseline_rbv_usd"] is not None
                assert imp["post_shock_rbv_usd"] is not None
                assert imp["post_shock_rbv_usd"] == imp["baseline_rbv_usd"]
                assert imp["delta_rbv_usd"] == 0.0
                assert imp["delta_rbv_pct"] == 0.0
                assert imp["rank_change"] == 0


@pytest.mark.anyio
async def test_post_scenario_simulation():
    """Verify POST /v1/scenario executes live parametric shocks and returns pre/post valuations."""
    payload = {
        "price_shock_pct": -0.20,
        "destination_shocks": {"China": 0.30},
        "discount_rate": 0.12,
        "variable_cost_share": 0.65,
        "license_cliff_expiry_shock": True,
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/v1/scenario", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["impacts"]) == 9
        assert data["execution_time_ms"] < 400.0

        adro_imp = next(i for i in data["impacts"] if i["symbol"] == "ADRO")
        assert adro_imp["post_shock_rbv_usd"] is not None
        assert adro_imp["post_shock_rbv_usd"] < (adro_imp["baseline_rbv_usd"] or 0.0)


@pytest.mark.anyio
async def test_get_flow_overlay_and_coverage():
    """Verify GET /v1/flow-overlay and GET /v1/coverage."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Flow overlay
        resp_flow = await client.get("/v1/flow-overlay")
        assert resp_flow.status_code == 200
        data_flow = resp_flow.json()
        assert len(data_flow["issuers"]) == 9

        # Coverage
        resp_cov = await client.get("/v1/coverage")
        assert resp_cov.status_code == 200
        data_cov = resp_cov.json()
        assert data_cov["credits_used"] == 404
        assert len(data_cov["metrics"]) >= 4
