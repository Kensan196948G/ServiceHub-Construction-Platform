"""Export OpenAPI schema from FastAPI app to JSON file.

Patches database and async modules to avoid requiring a running DB or asyncpg.

Usage:
    python scripts/export-openapi.py [output_path]
    Default output: frontend/src/generated/openapi.json
"""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

# Pre-inject mocks for modules that require external dependencies
_mock_asyncpg = MagicMock()
sys.modules["asyncpg"] = _mock_asyncpg
sys.modules["redis"] = MagicMock()
sys.modules["redis.asyncio"] = MagicMock()
_mock_minio = MagicMock()
sys.modules["minio"] = _mock_minio
sys.modules["minio.error"] = MagicMock()
sys.modules["structlog"] = MagicMock()

from app.main import app  # noqa: E402


def main():
    output_path = sys.argv[1] if len(sys.argv) > 1 else "frontend/src/generated/openapi.json"
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    schema = app.openapi()
    output.write_text(json.dumps(schema, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"OpenAPI schema exported to {output} ({len(schema.get('paths', {}))} endpoints)")


if __name__ == "__main__":
    main()
