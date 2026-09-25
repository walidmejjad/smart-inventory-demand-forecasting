import asyncio
import json
from urllib.parse import urlsplit

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.database import Base, get_db
from app.main import app


@pytest.fixture
def db_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def api(db_engine):
    def test_db():
        with Session(db_engine, autoflush=False) as session:
            yield session

    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = test_db

    async def request(method, url, payload, headers):
        parsed = urlsplit(url)
        body = json.dumps(payload).encode() if payload is not None else b""
        messages = []
        request_headers = [(b"content-type", b"application/json")]
        request_headers.extend(
            (key.lower().encode(), value.encode()) for key, value in headers.items()
        )

        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}

        async def send(message):
            messages.append(message)

        await app(
            {
                "type": "http",
                "asgi": {"version": "3.0", "spec_version": "2.3"},
                "http_version": "1.1",
                "method": method,
                "scheme": "http",
                "path": parsed.path,
                "raw_path": parsed.path.encode(),
                "query_string": parsed.query.encode(),
                "root_path": "",
                "headers": request_headers,
                "client": ("127.0.0.1", 12345),
                "server": ("testserver", 80),
            },
            receive,
            send,
        )
        start = next(item for item in messages if item["type"] == "http.response.start")
        response_body = b"".join(
            item.get("body", b"")
            for item in messages
            if item["type"] == "http.response.body"
        )
        response_headers = {
            key.decode(): value.decode() for key, value in start["headers"]
        }
        return (
            start["status"],
            json.loads(response_body) if response_body else None,
            response_headers,
        )

    def call(method, url, payload=None, *, headers=None, with_headers=False):
        result = asyncio.run(request(method, url, payload, headers or {}))
        return result if with_headers else result[:2]

    yield call
    app.dependency_overrides.clear()
    app.dependency_overrides.update(previous_overrides)
