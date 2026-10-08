# i18n/zh — 译文账本

每个插件一个 sidecar 文件：`i18n/zh/<插件名>.json`，另有 `i18n/zh/_global.json`（市场级文案，预留）。

```json
{
  "a1b2c3d4e5f60718": {
    "zh": "设计、合成、编辑",
    "field": "shortDescription",
    "source": "seed",
    "verified": false,
    "seededFrom": "codex-plugins-cn"
  }
}
```

- **键**：源文本（英文原文）的 SHA-256 前 16 位。上游改一个词，哈希变化，旧译文自动失效——不会出现把 A 插件的译文安到 B 头上的错位。
- `source`：`seed`（种子快照）| `api`（GLM 翻译）。
- `verified`：`false` 表示种子条目，可能滞后于上游措辞；API 翻译会写入 `verified: true` 并覆盖。
- 生成/消费方：`tools/translate.mjs` 写入，`tools/compose.mjs` 消费（应用白名单覆写）。

手动改译文直接编辑对应文件的 `zh` 字段即可，下次 compose 生效。
