import json
import sys
from pathlib import Path

# Add apps/api directory to python path so app modules resolve
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app

def generate_openapi():
    openapi_data = app.openapi()
    
    # Target file: packages/contracts/openapi.json
    output_path = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "openapi.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_data, f, indent=2)
    
    print(f"✅ Generated OpenAPI schema successfully at: {output_path}")

if __name__ == "__main__":
    generate_openapi()
