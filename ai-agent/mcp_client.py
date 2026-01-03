"""Minimal JSON-RPC client for Supabase's hosted MCP server."""

import asyncio
import json
import os
import re
from typing import Any, Dict, List, Optional

import httpx


class MCPClientError(RuntimeError):
    """Raised when the MCP server returns an error response."""


class MCPClient:
    """HTTP client that speaks the MCP JSON-RPC protocol."""

    PROTOCOL_VERSION = os.getenv("MCP_PROTOCOL_VERSION", "2024-11-05")

    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        access_token: Optional[str] = None,
        session_id: Optional[str] = None,
        timeout: Optional[float] = None,
        client_name: Optional[str] = None,
        client_version: Optional[str] = None,
    ):
        self.mcp_url = base_url or os.getenv("SUPABASE_MCP_URL")
        self.access_token = access_token or os.getenv("SUPABASE_ACCESS_TOKEN") or os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY"
        )
        self.timeout = timeout or float(os.getenv("SUPABASE_MCP_TIMEOUT", "30"))
        self.client_name = client_name or os.getenv("MCP_CLIENT_NAME", "kayak-concierge")
        self.client_version = client_version or os.getenv("MCP_CLIENT_VERSION", "2.0.0")

        self._request_id = 0
        self._session_id: Optional[str] = session_id or os.getenv("SUPABASE_MCP_SESSION_ID")
        self._initialized = False
        self._init_lock = asyncio.Lock()

    async def execute_sql(self, query: str) -> Dict[str, Any]:
        """Execute SQL via the MCP execute_sql tool and return parsed rows."""

        if not query.strip():
            raise MCPClientError("Empty SQL query")

        text = await self.call_tool("execute_sql", {"query": query})
        rows = self._extract_rows(text)
        return {"rows": rows, "raw": text}

    async def call_tool(self, name: str, arguments: Optional[Dict[str, Any]] = None) -> str:
        """Call an MCP tool and return the aggregated text content."""

        await self._ensure_initialized()
        payload = self._build_request(
            method="tools/call",
            params={"name": name, "arguments": arguments or {}},
        )
        result = await self._post(payload)

        if isinstance(result, list):  # batched response
            raise MCPClientError("Unexpected batched response from MCP server")

        is_error = result.get("isError", False)
        content = result.get("content") or []
        text_chunks: List[str] = []
        for chunk in content:
            if isinstance(chunk, dict) and chunk.get("type") == "text" and chunk.get("text"):
                text_chunks.append(chunk["text"])
        combined = "\n".join(text_chunks).strip()
        combined = self._normalize_text(combined)

        if is_error:
            message = self._extract_error_message(combined)
            raise MCPClientError(message)

        return combined

    async def list_tools(self) -> Dict[str, Any]:
        await self._ensure_initialized()
        payload = self._build_request(method="tools/list")
        return await self._post(payload)

    async def _ensure_initialized(self) -> None:
        if self._initialized:
            return
        async with self._init_lock:
            if self._initialized:
                return
            if not self.mcp_url or not self.access_token:
                raise MCPClientError(
                    "MCP server is not configured. Provide base_url/access_token or set SUPABASE_MCP_URL/SUPABASE_ACCESS_TOKEN."
                )
            payload = self._build_request(
                method="initialize",
                params={
                    "protocolVersion": self.PROTOCOL_VERSION,
                    "capabilities": {},
                    "clientInfo": {
                        "name": self.client_name,
                        "version": self.client_version,
                    },
                },
            )
            await self._post(payload, include_session=False)
            self._initialized = True

    def _build_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        self._request_id += 1
        payload: Dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
        }
        if params:
            payload["params"] = params
        return payload

    async def _post(self, payload: Dict[str, Any], include_session: bool = True) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if include_session and self._session_id:
            headers["Mcp-Session-Id"] = self._session_id

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.mcp_url, headers=headers, json=payload)

        if response.status_code == 401:
            raise MCPClientError("MCP unauthorized. Check access token or permissions.")

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:  # pragma: no cover - inspected manually
            raise MCPClientError(f"MCP request failed: {exc}") from exc

        session_header = response.headers.get("mcp-session-id")
        if session_header:
            self._session_id = session_header

        data = response.json()
        if isinstance(data, list):
            if not data:
                raise MCPClientError("MCP server returned empty response")
            data = data[-1]

        if "error" in data:
            error = data["error"] or {}
            message = error.get("message") or "Unknown MCP error"
            raise MCPClientError(message)

        return data.get("result", {})

    @staticmethod
    def _extract_error_message(payload: str) -> str:
        message = payload.strip() or "MCP tool call failed"
        try:
            parsed = json.loads(message)
            if isinstance(parsed, dict):
                err = parsed.get("error") or {}
                detail = err.get("message") or err.get("name")
                if detail:
                    return str(detail)
        except json.JSONDecodeError:
            pass
        return message

    @staticmethod
    def _extract_rows(text: str) -> List[Dict[str, Any]]:
        # Match the last occurrence of untrusted-data tags to get the actual data
        pattern = r"<untrusted-data-([^>]+)>\s*(\[.*?\]|\{.*?\})\s*</untrusted-data-\1>"
        match = re.search(pattern, text, flags=re.DOTALL)
        if not match:
            return []
        json_blob = match.group(2).strip()
        try:
            data = json.loads(json_blob)
        except json.JSONDecodeError:
            return []
        if isinstance(data, list):
            return data
        return [data]

    @staticmethod
    def _normalize_text(text: str) -> str:
        if len(text) >= 2 and text.startswith('"') and text.endswith('"'):
            try:
                text = bytes(text[1:-1], "utf-8").decode("unicode_escape")
            except UnicodeDecodeError:
                text = text[1:-1]
        return text
