"""Build the UI's portable sample from the synthetic challenge package."""

import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
PACKAGE = HERE.parent / "Apetit_SinceAI2026 _1_" / "APETIT_CLIMATE_NATURE_NAVIGATOR_2026" / "data"


def records(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def main():
    shipments = records(PACKAGE / "02_raw_feeds" / "shipments.csv")
    factors = records(PACKAGE / "01_master" / "emission_factor_library.csv")
    legs = [
        [
            row["shipment_id"], row["ref_doc"], row["mode"], row["ef_id"],
            float(row["t"]), float(row["km"]), float(row["tkm"]),
        ]
        for row in shipments
        if row["year"] == "2025" and row["direction"] == "inbound"
    ]
    ids = {leg[3] for leg in legs} | {"EF-TKM-TRUCK-HVO"}
    factor_library = {
        row["ef_id"]: {
            "name": row["name"],
            "unit": row["unit"],
            "rate": float(row["kgco2e_per_unit"]),
            "source": row["reference_source"],
            "version": row["version"],
        }
        for row in factors if row["ef_id"] in ids
    }
    payload = {"legs": legs, "factors": factor_library}
    (HERE / "sample.js").write_text(
        "export default " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
