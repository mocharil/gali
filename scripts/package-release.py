"""Package a GALI source release while excluding local credentials and caches."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {
    "node_modules", ".next", ".git", ".venv", "venv", "__pycache__", ".pytest_cache",
    ".ruff_cache", ".mypy_cache", "test-results", "playwright-report", ".turbo", "dist",
    "secrets", "credentials",
}


def package(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".pending.zip")
    files: list[Path] = []
    skipped_credentials = 0
    for current, directories, names in os.walk(ROOT):
        directories[:] = sorted(name for name in directories if name not in EXCLUDED and not name.startswith(".ai-tests-"))
        for name in sorted(names):
            if name.endswith((".pyc", ".pyo", ".tsbuildinfo", ".pem", ".key")) or name in {".DS_Store", "Thumbs.db"}:
                continue
            if name.startswith(".env") and name not in {".env.example", ".env.local.example"}:
                continue
            source = Path(current) / name
            if source in {output, temporary}:
                continue
            if source.is_symlink():
                raise ValueError("Unexpected symlink in source release")
            if source.suffix == ".json":
                try:
                    data = json.loads(source.read_text())
                except (ValueError, UnicodeError):
                    data = None
                if isinstance(data, dict) and (data.get("type") == "service_account" or isinstance(data.get("private_key"), str)):
                    skipped_credentials += 1
                    continue
            if source.suffix in {".ts", ".tsx", ".js", ".mjs", ".py", ".md", ".json", ".txt"}:
                text = source.read_text(errors="replace")
                if re.search(r"-----BEGIN (?:RSA )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\s]{64,}-----END (?:RSA )?PRIVATE KEY-----", text):
                    raise ValueError("A private key was detected in a source file; release stopped")
            files.append(source)
    with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for source in files:
            archive.write(source, "gali-main/" + source.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(temporary) as archive:
        assert archive.testzip() is None
        for required in ["packages/web/.env.local.example", "docs/GEMINI_SETUP.md", "packages/web/app/api/ai/analyze/route.ts"]:
            assert "gali-main/" + required in archive.namelist()
    temporary.replace(output)
    print(json.dumps({"filename": output.name, "files": len(files), "bytes": output.stat().st_size, "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "credential_files_excluded": skipped_credentials}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "dist/gali-main.zip")
    package(parser.parse_args().output.resolve())
