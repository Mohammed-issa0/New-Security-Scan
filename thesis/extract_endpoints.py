"""Extract API endpoints from data.json into JSON and Markdown tables."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JSON = ROOT / "data.json"
OUT_JSON = Path(__file__).resolve().parent / "sources" / "api_endpoints.json"
OUT_MD = Path(__file__).resolve().parent / "sources" / "appendix-a-endpoints.md"


def extract():
    spec = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    rows = []
    for path, methods in spec.get("paths", {}).items():
        for method, detail in methods.items():
            if method in ("parameters", "summary", "description"):
                continue
            if not isinstance(detail, dict):
                continue
            tags = detail.get("tags", ["—"])
            summary = detail.get("summary", detail.get("description", "—"))
            if isinstance(summary, str):
                summary = summary.replace("\r\n", " ").replace("\n", " ")[:120]
            rows.append({
                "path": path,
                "method": method.upper(),
                "tag": tags[0] if tags else "—",
                "summary": summary or "—",
            })
    rows.sort(key=lambda r: (r["tag"], r["path"], r["method"]))
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# ملحق أ: جدول واجهات برمجة التطبيقات (API Endpoints)",
        "",
        f"**الإجمالي:** {len(rows)} endpoint",
        "",
        "| # | الوحدة | الطريقة | المسار | الوصف |",
        "|---|--------|---------|--------|-------|",
    ]
    for i, r in enumerate(rows, 1):
        lines.append(
            f"| {i} | {r['tag']} | {r['method']} | `{r['path']}` | {r['summary']} |"
        )
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"Extracted {len(rows)} endpoints -> {OUT_JSON}")
    return rows


if __name__ == "__main__":
    extract()
