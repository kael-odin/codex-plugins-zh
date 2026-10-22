# 维护手册（MAINTENANCE）

写给未来的维护者（多半是你自己）。本项目分三个数据面，更新方式各不相同。

## 每日自动（你什么都不用做）

GitHub Actions `sync-upstream`（每天北京时间 10:17）自动执行：

```
拉取 openai/plugins → diff → 合并 .seed 完整目录快照 → 采纳种子译文
→ （可选）GLM API 补翻 → compose 合成 → verify 双源对账（门禁）
→ 全绿才 commit+push → Pages 自动重新部署
```

- `verify` 不过 = 不推送，站点与市场仓保持上一个完好版本（门禁禁管道，失败即红）。
- echobird 快照仓若更新，CI 当天自动跟进（每天现克隆 `.seed`）。

## 你这侧：让 Codex 里的插件跟上最新

```bash
codex plugin marketplace upgrade     # 刷新 git 快照（建议每月一次，或攒着随时跑）
codex plugin marketplace list        # 验证 openai-curated-zh 还在
```

重开会话后生效。也可以什么都不做——已安装的插件内容不会失效，只是可能拿不到最新上游改动。

Claude Code 那侧同理（同一个仓、同一份译文）：

```bash
claude plugin marketplace update openai-curated-zh
```

## 手动维护（低频）

| 任务 | 频率 | 操作 |
| --- | --- | --- |
| 应用目录刷新（1,505 条） | source-blip 更新时（看其仓库 pushedAt） | `git clone --depth 1 https://github.com/Source-blip/codex-plugin-chinese-navigation .refs/source-blip-nav && node tools/extract-apps.mjs .refs/source-blip-nav/index.html` → commit |
| 全量译文补缺（当前 92%+种子已覆盖） | 随时 | 仓库 Settings → Secrets → Actions 加 `GLM_API_KEY`（智谱开放平台，OpenAI 兼容接口），次日 CI 自动跑 `translate --execute`；或本地 `GLM_API_KEY=… node tools/translate.mjs --execute` |
| echobird 快照失效/删库 | 万一 | 换源：改 `config/zh-marketplace.json` 的 `seedRepo`，CI 的 `.seed` 克隆步骤同步改 `.github/workflows/sync.yml` |
| 上游清单新增插件 | 自动 | CI 自动合并进清单；若上游又出「清单有条目但无目录」（如 crowdstrike-*），catalog 标 `missing`，等上游 |
| 官方远程目录直连 | 等待 | 目前仅 ChatGPT 账号认证可拉（`codex-rs` 源码明确 api-key 不支持）。若未来开放，写一个 remote 拉取器替换 `.seed` 即可，管线其余部分不动 |

## 第一性原理获取完整目录（如果你有 ChatGPT 账号）

完整 curated 目录（~194）由 App 从 OpenAI 远程市场物化到本地。拿到一份的办法：

1. 用任意 CODEX_HOME 以 **ChatGPT 账号**登录一次（`CODEX_HOME=D:\tmp\codex-full codex login`），打开插件面板让 App 物化远程市场；
2. 备份 `D:\tmp\codex-full\.codex\.tmp\plugins\`（或 `marketplaces\` 下远程物化目录）；
3. 把它做成一个 git 仓（含 `.agents/plugins/marketplace.json` + `plugins/`），替换 `.seed`。

这一步做完，快照就从「echobird 2026-09-19」升级成「你自己 2026-XX-XX」，来源第一手。没有 ChatGPT 账号就继续用社区快照，功能无损。

## 校验与数字速查

```bash
node tools/sync.mjs && node tools/compose.mjs && node tools/verify.mjs   # 必须全绿
cat data/quality-report.json   # 6,720 files · 0 divergences 为健康态（claude manifest: 189 entries）
cat data/full-catalog.json     # 上游/快照来源与日期
```

站点数字：**189 可装插件（62 上游 + 127 快照）+ 1,505 应用 = 1,694**；图标 186/192 插件 + 1,699 应用。
两份市场清单：Codex 原生 `.agents/plugins/{marketplace,api_marketplace}.json`（192 条）与
Claude Code 的 `.claude-plugin/marketplace.json`（189 条，`compose` 生成、`verify` 三方对账）。
