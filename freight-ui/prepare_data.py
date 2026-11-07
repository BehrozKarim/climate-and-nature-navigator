"""Prepare an auditable 2025 workbench from the Since AI synthetic raw feeds."""

import argparse
import csv
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median

HERE = Path(__file__).resolve().parent
DEFAULT_PACKAGE = HERE.parent / "Apetit_SinceAI2026 _1_" / "APETIT_CLIMATE_NATURE_NAVIGATOR_2026"
ROAD = {"EF-TKM-TRUCK", "EF-TKM-TRUCK-REEFER"}
SEA = {"EF-TKM-SHIP-BULK", "EF-TKM-SHIP-REEFER", "EF-TKM-ROPAX"}


def records(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def group(rows, key):
    groups = defaultdict(list)
    for row in rows:
        groups[key(row)].append(row)
    return groups


def issue(table, key, kind, confidence, title, explanation, source, owner, **detail):
    return {
        "table": table, "key": key, "type": kind, "confidence": confidence,
        "title": title, "explanation": explanation, "source": source, "owner": owner,
        **detail,
    }


def purchase_lanes(rows):
    receipts = group(
        (row for row in rows if row["movement_type"] == "101" and row["uom"] in ("KG", "TO")),
        lambda row: (int(row["posting_date"][:4]), row["doc_no"]),
    )
    return {
        key: (items[0]["origin_country"], items[0]["plant"], items[0]["material_id"])
        for key, items in receipts.items() if len(items) == 1 and items[0]["origin_country"]
    }


def missing_legs(lanes, shipments, year):
    linked = group(shipments, lambda row: (int(row["year"]), row["ref_doc"]))
    history = defaultdict(list)
    for key, legs in linked.items():
        if key[0] < year and key in lanes and any(row["ef_id"] in ROAD for row in legs):
            history[lanes[key]].append(legs)
    for key, legs in linked.items():
        if key[0] != year or key not in lanes or len(legs) != 1 or legs[0]["ef_id"] not in ROAD:
            continue
        origin, site, material = lanes[key]
        cohort = history[lanes[key]]
        if len(cohort) < 5:
            continue
        sea_by_factor = defaultdict(list)
        for comparable in cohort:
            for factor, matching in group(
                (row for row in comparable if row["ef_id"] in SEA), lambda row: row["ef_id"]
            ).items():
                if len(matching) == 1 and float(matching[0]["km"]) > 0:
                    sea_by_factor[factor].append(matching[0])
        if not sea_by_factor:
            continue
        factor, matches = max(sea_by_factor.items(), key=lambda entry: len(entry[1]))
        ratio = len(matches) / len(cohort)
        road = legs[0]
        weight = float(road["t"])
        if ratio < 0.9 or not math.isfinite(weight) or weight <= 0:
            continue
        comparable_km = [float(row["km"]) for row in matches]
        yield issue(
            "shipments", f"ship:{key[1]}:{factor}", "missing_leg", round(ratio, 3),
            "Possible missing sea leg",
            f"{len(matches)} of {len(cohort)} earlier receipts for this origin, destination site and material had this sea or ferry leg. The {year} receipt contains only a road leg.",
            "shipments.csv · ERP purchase lines", "Logistics",
            subject=f"{origin} → {site} · {material}", record=key[1], road=road["shipment_id"],
            mass=weight, factor=factor, km=median(comparable_km),
            range=[min(comparable_km), max(comparable_km)],
            examples=[row["shipment_id"] for row in matches[-4:]],
            exampleRows=[[row["shipment_id"], int(row["year"]), float(row["km"])] for row in matches[-4:]],
            matchCount=len(matches), cohortCount=len(cohort),
        )


def meter_checks(rows, year):
    groups = group(rows, lambda row: (row["site_id"], row["carrier"], int(row["year"])))
    for (site, carrier, entry_year), series in groups.items():
        if entry_year != year:
            continue
        by_month = group(series, lambda row: int(row["month"]))
        previous = groups.get((site, carrier, year - 1), [])
        prior_months = {int(row["month"]) for row in previous}
        if len(by_month) >= 8 and len(prior_months) >= 10:
            for month in sorted(set(range(1, 13)) - set(by_month)):
                key = f"energy:{site}:{year}-{month:02d}:{carrier}"
                yield issue(
                    "energy_meter_readings", key, "missing_record", 0.92, "Monthly meter reading missing",
                    f"The {carrier} series has {len(by_month)} recorded months this year and {len(prior_months)} last year. Request the original meter reading for month {month}.",
                    "energy_meter_readings.csv", "Site energy lead",
                    subject=f"{site} · {carrier} · {year}-{month:02d}", record=key,
                )
        normal = [float(row["value"]) for row in series if float(row["value"]) > 0]
        if len(normal) < 8:
            continue
        typical = median(normal)
        for month, entries in by_month.items():
            for row in entries:
                value = float(row["value"])
                if value <= 200 * typical:
                    continue
                key = f"energy:{site}:{year}-{month:02d}:{carrier}"
                yield issue(
                    "energy_meter_readings", key, "unit_error", 0.95, "Meter value may use the wrong unit",
                    f"{value:g} {row['unit']} is over 200 times the median for this site and carrier ({typical:g} {row['unit']}). Confirm the unit before replacing the value.",
                    "energy_meter_readings.csv", "Site energy lead",
                    subject=f"{site} · {carrier} · {year}-{month:02d}", record=key,
                )


def travel_checks(rows, year):
    seen = {}
    for row in rows:
        if int(row["year"]) != year:
            continue
        signature = tuple(row[key] for key in ("traveller_id", "travel_date", "route", "pkm", "nights"))
        prior = seen.get(signature)
        if prior:
            yield issue(
                "travel_bookings", f"travel:{row['booking_id']}", "duplicate_record", 0.99, "Travel booking repeats an earlier row",
                f"Booking {prior} has the same traveller, travel date, route, distance and nights. Confirm which booking should be counted.",
                "travel_bookings.csv", "Travel administration",
                subject=f"{row['booking_id']} · {row['route']}", record=row["booking_id"], examples=[prior],
            )
        else:
            seen[signature] = row["booking_id"]


def purchase_checks(rows, year):
    fields = ("company_code", "plant", "supplier_id", "material_id", "quantity",
              "uom", "net_amount", "currency", "lot_id")
    seen = {}
    prior_currencies = defaultdict(Counter)
    for row in rows:
        if row["movement_type"] != "101" or int(row["posting_date"][:4]) >= year:
            continue
        cohort = (row["company_code"], row["supplier_id"], row["material_id"])
        prior_currencies[cohort][row["currency"]] += 1
    for row in rows:
        if row["movement_type"] != "101" or int(row["posting_date"][:4]) != year:
            continue
        signature = tuple(row[field] for field in fields)
        key = f"erp:{row['doc_no']}:{row['line_no']}"
        details = {"subject": f"{row['supplier_id']} · {row['material_id']}", "record": key}
        if signature in seen:
            yield issue(
                "erp_purchase_lines", key, "duplicate_record", 0.99, "Purchase receipt repeats an earlier line",
                f"{seen[signature]} has the same company, site, supplier, material, quantity, unit, amount, currency and lot. Confirm which receipt should be counted.",
                "erp_purchase_lines_2021_2025.csv", "Procurement", examples=[seen[signature]], **details,
            )
            continue
        seen[signature] = key
        counts = prior_currencies[row["company_code"], row["supplier_id"], row["material_id"]]
        total = counts.total()
        if total < 8:
            continue
        expected, occurrences = counts.most_common(1)[0]
        if occurrences / total >= 0.98 and row["currency"] != expected:
            yield issue(
                "erp_purchase_lines", key, "currency_error", round(occurrences / total, 3),
                "Purchase currency differs from comparable receipts",
                f"{occurrences} of {total} earlier receipts for the same company, supplier and material used {expected}. This receipt uses {row['currency']}. Confirm the invoice currency.",
                "erp_purchase_lines_2021_2025.csv", "Procurement", **details,
            )


def pcf_checks(path, year):
    for file in sorted(path.glob(f"*_{year}.json")):
        supplier, material, _ = file.stem.split("_")
        footprint = json.loads(file.read_text(encoding="utf-8"))["pcf"]
        unit = footprint["declaredUnit"]
        start = footprint["referencePeriodStart"][:10]
        end = footprint["referencePeriodEnd"][:10]
        key = f"pcf:{supplier}:{material}:{year}"
        detail = {"subject": f"{supplier} · {material}", "record": key}
        if unit != "kilogram" or float(footprint["unitaryProductAmount"]) != 1:
            yield issue(
                "supplier_pcfs", key, "pcf_unit_error", 0.96, "Supplier footprint unit needs checking",
                f"The declared quantity is {footprint['unitaryProductAmount']} {unit}. Verify a value per kilogram before using it.",
                file.name, "Procurement", **detail,
            )
        if start > f"{year}-01-01" or end < f"{year}-12-31":
            yield issue(
                "supplier_pcfs", key, "pcf_stale_period", 0.98, "Supplier footprint does not cover the reporting year",
                f"The footprint covers {start} through {end}. Ask for a declaration that covers {year}.",
                file.name, "Procurement", **detail,
            )


def detect(data, shipments, purchases, lanes, year):
    feeds = data / "02_raw_feeds"
    return [
        *missing_legs(lanes, shipments, year),
        *purchase_checks(purchases, year),
        *meter_checks(records(feeds / "energy_meter_readings.csv"), year),
        *pcf_checks(feeds / "supplier_pcfs", year),
        *travel_checks(records(feeds / "travel_bookings.csv"), year),
    ]


def validate(package, data, shipments, purchases, lanes):
    labels = records(package / "tasks" / "dev" / "A1_dev_issue_labels_2023_2024.csv")
    for year in (2023, 2024):
        predicted = {row["key"]: row["type"] for row in detect(data, shipments, purchases, lanes, year)}
        truth = group((row for row in labels if int(row["year"]) == year), lambda row: row["record_key"])
        matched = predicted.keys() & truth.keys()
        correctly_typed = sum(predicted[key] in {label["issue_type"] for label in truth[key]} for key in matched)
        f1 = 2 * len(matched) / (len(predicted) + len(truth))
        accuracy = correctly_typed / len(matched) if matched else 0
        print(f"{year} dev: {len(matched)}/{len(predicted)} flags matched, {len(truth)} total labelled records, "
              f"A1 score {100 * f1 * (0.75 + 0.25 * accuracy):.2f}")


def studio_inputs(package, data):
    scenarios = data / "05_scenarios"
    nature = data / "06_nature"
    loads = records(package / "tasks" / "dev" / "D1_dev_catchments_2025.csv")
    metadata = {row["catchment_id"]: row for row in records(nature / "catchments.csv")}
    geometry = json.loads((nature / "catchments.geojson").read_text(encoding="utf-8"))["features"]
    shapes = {}
    for feature in geometry:
        points = feature["geometry"]["coordinates"][0]
        shapes[feature["properties"]["catchment_id"]] = [[x, y] for x, y, *_ in points]
    return {
        "catchments": [
            {
                "id": row["catchment_id"],
                "p": float(row["apetit_p_to_water_kg"]),
                "n": float(row["apetit_n_to_water_kg"]),
                "region": metadata[row["catchment_id"]]["region"],
                "status": metadata[row["catchment_id"]]["ecological_status_class"],
                "sensitivity": float(metadata[row["catchment_id"]]["p_sensitivity"]),
            }
            for row in loads
        ],
        "shapes": shapes,
        "origins": records(nature / "origin_state_of_nature_indicative.csv"),
        "levers": [row for row in records(scenarios / "decarbonisation_levers.csv")
                   if row["lever_id"] in {"L08", "L09", "L20", "L21", "L27"}],
        "transition": [row for row in records(scenarios / "transition_scenarios.csv")
                       if row["scenario"] in {"net_zero_2050", "delayed_transition"}],
        "prices": {row["item"]: [float(row["contract_price_eur_t"]), float(row["replacement_import_premium_frac"])]
                   for row in records(scenarios / "contract_prices_and_replacement_premiums.csv") if row["year"] == "2025"},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--package", type=Path, default=DEFAULT_PACKAGE)
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    data = args.package / "data"
    feeds = data / "02_raw_feeds"
    shipments = [row for row in records(feeds / "shipments.csv") if row["direction"] == "inbound"]
    purchases = records(feeds / "erp_purchase_lines_2021_2025.csv")
    lanes = purchase_lanes(purchases)
    issues = detect(data, shipments, purchases, lanes, 2025)
    site_names = {row["site_id"]: row["name"] for row in records(data / "01_master" / "sites.csv")}
    material_names = {row["material_id"]: row["name_en"] for row in records(data / "01_master" / "materials.csv")}
    for entry in issues:
        if entry["table"] == "shipments":
            origin, site, material = lanes[2025, entry["record"]]
            entry["subject"] = f"{material_names.get(material, material)} · {origin} → {site_names.get(site, site)}"
    payload = {
        "version": "1.0.0",
        "legs": [[row["shipment_id"], row["ref_doc"], row["mode"], row["ef_id"],
                  float(row["t"]), float(row["km"]), float(row["tkm"])]
                 for row in shipments if row["year"] == "2025"],
        "factors": {
            row["ef_id"]: {"name": row["name"], "unit": row["unit"], "rate": float(row["kgco2e_per_unit"]),
                           "source": row["reference_source"], "version": row["version"], "status": row["value_status"]}
            for row in records(data / "01_master" / "emission_factor_library.csv") if row["ef_id"].startswith("EF-TKM-")
        },
        "issues": issues,
        "studio": studio_inputs(args.package, data),
    }
    (HERE / "sample.js").write_text(
        "export default " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"{len(payload['legs'])} inbound legs, {len(issues)} candidates: {dict(Counter(row['table'] for row in issues))}")
    if args.validate:
        validate(args.package, data, shipments, purchases, lanes)


if __name__ == "__main__":
    main()
