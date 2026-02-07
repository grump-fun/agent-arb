"""Validate render.yaml structure (required Blueprint fields). Run in Docker with Python + PyYAML."""
import sys
import yaml

def main():
    with open("render.yaml") as f:
        d = yaml.safe_load(f)
    assert d, "empty file"
    assert "services" in d, "missing top-level services"
    assert isinstance(d["services"], list), "services must be a list"
    assert len(d["services"]) >= 1, "no services defined"
    s = d["services"][0]
    for k in ("type", "name", "runtime", "buildCommand", "startCommand"):
        assert k in s, f"service missing required field: {k}"
    assert s.get("type") == "web", "first service must be type: web"
    assert s.get("runtime") == "node", "expected runtime: node"
    print("Blueprint structure OK")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"Validation failed: {e}", file=sys.stderr)
        sys.exit(1)
