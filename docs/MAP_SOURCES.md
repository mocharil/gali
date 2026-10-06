# Geographic basemap

GALI bundles regional Natural Earth 1:50m admin-0 country geometry from the project’s official repository. The basemap is georeferenced; it is not a generated illustration or a mining-license boundary dataset.

- Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
- Download SHA-256: 3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb
- License: public domain, https://www.naturalearthdata.com/about/terms-of-use/
- Processing: retain 13 Southeast Asian and neighboring countries, names, codes and label coordinates; round geometry to five decimal places. No manual island outlines or marker displacement.
- Mining points come from the active GALI GeoJSON endpoint and retain its coordinates.
- Country boundaries are not permit boundaries.

## Optional online street detail

The map starts with bundled geometry. The user can select **Street detail** to request ordinary viewport tiles from OpenStreetMap. It requires internet access, but no API token. A tile failure returns the map to the bundled geographic basemap and leaves site filtering and selection available.

- Tiles: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- Attribution: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright
- Usage policy: https://operations.osmfoundation.org/policies/tiles/
- Provider configuration: optional `NEXT_PUBLIC_MAP_TILE_URL` and matching `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` at build time.
- Tiles are requested directly by the browser with its ordinary referer, user agent, and HTTP cache behavior. No bulk downloads, offline tile archives, or prefetch feature are provided. Automated tests intercept the optional tile requests; bundled-map tests use only local resources.
