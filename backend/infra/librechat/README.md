# Rally LibreChat

The reduced local stack runs only LibreChat and MongoDB; file RAG, vector search, Meilisearch, and the admin panel are intentionally excluded from the hackathon path.

```bash
docker compose up -d
docker compose logs -f api
```

Open `http://localhost:3080`. Register the first local account, select the `Rally ClickHouse Analytics` MCP server, and complete the ClickHouse-hosted OAuth flow. ClickHouse MCP access must first be enabled by the ClickHouse Cloud account owner.

Secrets live in the ignored `.env`; `.env.example` is safe to commit. The named volumes preserve LibreChat users, OAuth state, and MongoDB data across container restarts.

