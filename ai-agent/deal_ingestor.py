"""Deal ingestion helper for the concierge AI service."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, List, Any

from models import DealType
from deal_processor import DealProcessor


class DealIngestor:
    """Loads raw deal feeds and emits normalized deals ready for scoring/tagging."""

    def __init__(self, data_dir: Path | None = None):
        base_dir = data_dir or Path(__file__).resolve().parent / "data"
        self.feed_path = base_dir / "deals_feed.csv"

    def _parse_bool(self, value: str | None) -> bool:
        if value is None:
            return False
        return value.strip().lower() in {"true", "1", "yes", "y"}

    def _parse_tags(self, value: str | None) -> List[str]:
        if not value:
            return []
        return [tag.strip() for tag in value.split("|") if tag.strip()]

    def load_raw_records(self) -> List[Dict[str, Any]]:
        if not self.feed_path.exists():
            return []

        records: List[Dict[str, Any]] = []
        with self.feed_path.open(newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                try:
                    deal_type = DealType(row.get("deal_type", "hotel").lower())
                except ValueError:
                    continue

                metadata = {
                    "airline": row.get("airline"),
                    "stops": int(row["stops"]) if row.get("stops") else None,
                    "duration_hours": float(row["duration_hours"]) if row.get("duration_hours") else None,
                    "neighborhood": row.get("neighborhood"),
                    "amenities": [a.strip() for a in (row.get("amenities") or "").split("|") if a.strip()],
                    "pet_friendly": self._parse_bool(row.get("pet_friendly")),
                    "breakfast_included": self._parse_bool(row.get("breakfast_included")),
                    "near_transit": self._parse_bool(row.get("near_transit")),
                    "refundable": self._parse_bool(row.get("refundable")),
                    "transit_score": int(row["transit_score"]) if row.get("transit_score") else None,
                    "cancellation_policy": row.get("cancellation_policy"),
                    "refund_deadline": row.get("refund_deadline"),
                    "parking": row.get("parking"),
                    "car_vendor": row.get("car_vendor"),
                    "car_type": row.get("car_type"),
                    "transmission": (row.get("transmission") or "").lower() or None,
                    "fuel": (row.get("fuel") or "").lower() or None,
                    "limited_mileage": self._parse_bool(row.get("limited_mileage")),
                    "pickup_location": row.get("pickup_location"),
                    "city": row.get("city"),
                }

                destination = row.get("destination") or row.get("city") or None

                record = {
                    "deal_id": row.get("deal_id"),
                    "deal_type": deal_type,
                    "origin": row.get("origin") or None,
                    "destination": destination,
                    "listing_id": row.get("listing_id") or None,
                    "price": float(row.get("price", 0) or 0),
                    "currency": row.get("currency", "USD"),
                    "avg_30d_price": float(row.get("avg_30d_price") or 0) or None,
                    "availability": int(row["availability"]) if row.get("availability") else None,
                    "is_limited": self._parse_bool(row.get("is_limited")),
                    "tags": self._parse_tags(row.get("tags")),
                    "deal_metadata": metadata,
                    "deal_score": int(row.get("deal_score") or 0),
                    "status": row.get("status", "active"),
                    "promo_end": row.get("promo_end"),
                }

                if record["deal_metadata"] and "promo_end" not in record["deal_metadata"]:
                    record["deal_metadata"]["promo_end"] = record["promo_end"]

                if row.get("price_history"):
                    history = [float(value) for value in row["price_history"].split("|") if value]
                    record["price_history"] = history

                records.append(record)

        return records

    def detect_and_tag_deals(self) -> List[Any]:
        raw_records = self.load_raw_records()
        if not raw_records:
            return []

        detected = DealProcessor.detect_deals(raw_records)
        metadata_by_id = {record["deal_id"]: record.get("deal_metadata", {}) for record in raw_records}

        tagged = []
        for deal in detected:
            tagged.append(DealProcessor.tag_deal(deal, metadata_by_id.get(deal.deal_id, {})))

        return tagged
