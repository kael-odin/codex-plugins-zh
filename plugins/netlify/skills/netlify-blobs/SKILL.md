---
name: netlify-blobs
description: "使用 Netlify Blobs 对象存储的指南。在不需要完整数据库的情况下存储文件、图片、文档或简单键值数据时使用。涵盖 `getStore()`、CRUD 操作、元数据、列表查询、部署作用域与站点作用域存储，以及本地开发。"
---

# Netlify Blobs

Netlify Blobs is zero-config object storage available from any Netlify compute (functions, edge functions, framework server routes). No provisioning required.

```bash
npm install @netlify/blobs
```

## Getting a Store

```typescript
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "my-store" });

// Use "strong" consistency when you need immediate reads after writes
const store = getStore({ name: "my-store", consistency: "strong" });
```

## CRUD Operations

These are the **only** store methods. Do not invent others.

### Create / Update

```typescript
// String or binary data
await store.set("key", "value");
await store.set("key", fileBuffer);

// With metadata
await store.set("key", data, {
  metadata: { contentType: "image/png", uploadedAt: new Date().toISOString() },
});

// JSON data
await store.setJSON("key", { name: "Example", count: 42 });
```

### Read

```typescript
// Text (default)
const text = await store.get("key");                    // string | null

// Typed retrieval
const json = await store.get("key", { type: "json" });  // object | null
const stream = await store.get("key", { type: "stream" });
const blob = await store.get("key", { type: "blob" });
const buffer = await store.get("key", { type: "arrayBuffer" });

// With metadata
const result = await store.getWithMetadata("key");
// { data: any, etag: string, metadata: object } | null

// Metadata only (no data download)
const meta = await store.getMetadata("key");
// { etag: string, metadata: object } | null
```

### Delete

```typescript
await store.delete("key");
```

### List

```typescript
const { blobs } = await store.list();
// blobs: [{ etag: string, key: string }, ...]

// Filter by prefix
const { blobs } = await store.list({ prefix: "uploads/" });
```

## Store Types

- **Site-scoped** (`getStore()`): Persist across all deploys. Use for most cases.
- **Deploy-scoped** (`getDeployStore()`): Tied to a specific deploy lifecycle.

## Limits

| Limit | Value |
|---|---|
| Max object size | 5 GB |
| Store name max length | 64 bytes |
| Key max length | 600 bytes |

## Local Development

Local dev uses a sandboxed store (separate from production). For Vite-based projects, install `@netlify/vite-plugin` to enable local Blobs access. Otherwise, use `netlify dev`.

**Common error**: "The environment has not been configured to use Netlify Blobs" — install `@netlify/vite-plugin` or run via `netlify dev`.
