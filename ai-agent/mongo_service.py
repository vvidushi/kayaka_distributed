"""Async MongoDB helper for the AI agent."""

import os
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Sequence

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection


class MongoService:
    """Async MongoDB wrapper for AI agent queries using motor."""

    def __init__(self):
        self._uri = os.getenv("MONGODB_URI")
        self._db_name = os.getenv("MONGODB_DB", "kayak")
        self._client: Optional[AsyncIOMotorClient] = None

    async def _get_collection(self, name: str) -> AsyncIOMotorCollection:
        if not self._uri:
            raise RuntimeError("MONGODB_URI is not configured")

        if not self._client:
            self._client = AsyncIOMotorClient(self._uri, serverSelectionTimeoutMS=5000)

        return self._client[self._db_name][name]

    async def query(
        self,
        collection: str,
        filters: Optional[Dict[str, Any]],
        projection: Optional[Dict[str, Any]] = None,
        sort: Optional[Sequence[Sequence[Any]]] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        coll = await self._get_collection(collection)
        cursor = coll.find(filters or {}, projection)

        if sort:
            sort_pairs = []
            for entry in sort:
                if isinstance(entry, (list, tuple)) and len(entry) >= 2:
                    field = entry[0]
                    try:
                        direction = int(entry[1])
                    except (TypeError, ValueError):
                        direction = 1
                    sort_pairs.append((field, 1 if direction >= 0 else -1))
            if sort_pairs:
                cursor = cursor.sort(sort_pairs)

        cursor = cursor.limit(max(1, min(int(limit or 20), 50)))
        docs = await cursor.to_list(length=max(1, limit or 20))
        return [self._sanitize_document(doc) for doc in docs]

    def _sanitize_document(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        return {key: self._serialize_value(value) for key, value in doc.items()}

    def _serialize_value(self, value: Any) -> Any:
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, list):
            return [self._serialize_value(item) for item in value]
        if isinstance(value, dict):
            return {k: self._serialize_value(v) for k, v in value.items()}
        return value
