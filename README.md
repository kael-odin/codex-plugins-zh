# codex-plugins-zh · Codex 官方插件中文市场

自动同步 [openai/plugins](https://github.com/openai/plugins) 的 **Codex 官方插件中文市场**：
**无损汉化**（机器可证明）+ **可视化中文导航站** + **每日自动跟进上游**。

一个数据源，两个出口：

| 出口 | 地址 | 用途 |
| --- | --- | --- |
| 市场仓（本仓库） | `https://github.com/kael-odin/codex-plugins-zh.git` | 粘贴进 Codex「添加市场」，插件面板直接显示中文介绍 |
| 静态导航站 | https://kael-odin.github.io/codex-plugins-zh/ | 浏览器里搜索/筛选/看详情，附安装教程 |

当前数据：**62 个插件 · 上游 `0722921d` · 无损校验 PASS**（见 [data/quality-report.json](data/quality-report.json)）。

---

## 三步用上

1. Codex 中打开 **设置 → 插件 → 添加市场**
2. 粘贴：
   ```
   https://github.com/kael-odin/codex-plugins-zh.git
   ```
   或命令行等价操作：
   ```bash
   codex plugin marketplace add https://github.com/kael-odin/codex-plugins-zh.git
   ```
3. 重开会话，市场列表出现「**Codex 官方插件 · 中文版**」，插件卡片/详情即是中文。

> 原味官方市场（英文）同样可以手动添加：`codex plugin marketplace add https://github.com/openai/plugins.git`。
> 两个市场**并存互不干扰**，中文版只是门面，出问题随时只用官方版。
> 适用的完整场景（包括 API-key 登录、第三方中转、onboarding 被跳过的情况）见 [docs/setup-guide.md](docs/setup-guide.md)。

## 「无损」是怎么保证的

每次发布前，`tools/verify.mjs` 会把发布树与上游逐文件对账：

- 除白名单外（市场清单的 `name`/`interface`、各插件 `plugin.json` 的 `interface.*`），**其余 5300+ 文件必须与上游逐字节一致**（sha256 对账）；
- 白名单文件本身也做结构化比对——白名单之外的任何字段被改动即失败退出；
- 结果落盘 `data/quality-report.json`，CI 全绿才允许推送。

所以：**技能正文、脚本、MCP 配置一律不动**，翻译只发生在「你看得见的门面」（卡片副标题、长介绍、上手示例），插件行为零改变。品牌名（Figma、GitHub 等）保留英文不译。

## 自动更新怎么工作

```
github.com/openai/plugins
   │ ① tools/sync.mjs     每日 GitHub Actions 拉取并按 commit 对比 → data/diff.json
   ▼
echobird 种子译文 + GLM API 增量翻译
   │ ② tools/translate.mjs  译文按「源文本哈希」存 i18n/zh/*.json，上游改词自动失效
   ▼
   │ ③ tools/compose.mjs   上游副本 + 白名单覆写 → 发布树 + data/catalog.json
   ▼
   │ ④ tools/verify.mjs    无损对账 → data/quality-report.json（FAIL 则中止发布）
   ▼
┌────────────────┬─────────────────┐
│ 推送本仓库      │ tools/build-site │
│ （市场仓更新）  │ → dist/ → Pages  │
└────────────────┴─────────────────┘
```

你这一侧只需要偶尔执行 `codex plugin marketplace upgrade`（或等 Codex 自动刷新快照），就能拿到最新版。

## 译文的来源与可信度

- 种子：[echobird/codex-plugins](https://cnb.cool/echobird/codex-plugins) 快照译文（标记 `verified: false`，可能滞后于上游措辞）；
- API 翻译：GLM（`glm-4.5-flash`，OpenAI 兼容接口）批量翻译，标记 `verified: true`，会覆盖种子；
- 译文以**源文本哈希**为键存放在 `i18n/zh/<插件名>.json`——上游任何改动都会让旧译文自动失效、重新翻译，杜绝「张冠李戴」的错位翻译；
- 详情页始终保留英文原文对照。

## 本地开发

零依赖，Node ≥ 20：

```bash
git clone https://github.com/kael-odin/codex-plugins-zh.git
cd codex-plugins-zh
node tools/sync.mjs                        # 克隆/更新 .upstream，产出 diff
node tools/translate.mjs --seed <别的克隆>  # 可选：采纳种子译文
GLM_API_KEY=xxx node tools/translate.mjs --execute   # 可选：API 翻译缺口
node tools/compose.mjs                     # 合成发布树 + catalog
node tools/verify.mjs                      # 无损对账（必须 PASS）
node tools/build-site.mjs                  # 打包 dist/（本地预览站点）
```

目录速览：

```
.agents/plugins/      zh 版市场清单（name: openai-curated-zh / openai-api-curated-zh）
plugins/              上游插件树（仅 interface.* 经白名单覆写）
i18n/zh/              译文账本（sidecar，按源文本哈希键控）
tools/                四件套 + 建站脚本（零依赖 Node）
config/               市场命名 / 分类术语表
data/                 产物：catalog / diff / quality-report / last-sha
site/                 导航站源码（原生 HTML/JS，无框架）
```

## 常见问题

- **和官方 openai-curated 什么关系？** 并存的独立市场。中文名 `openai-curated-zh`，绝不占用官方 ID；本仓库被下架/失效时，官方市场照常工作。
- **API-key 登录用户装哪个？** 你的 Codex 里应该已经有一个「Built by OpenAI · 50 个插件」（`openai-api-curated`，App 自动管理，**别删**）。中文市场仓内含对应的 API 版清单（`openai-api-curated-zh`）。详见 setup-guide。
- **为什么 SKILL.md 正文不翻译？** 技能正文是给模型读的指令，翻译会引入语义漂移并让维护成本爆炸；frontmatter 的 description 触发短语涉及技能触发质量，同样保持原文（译文已入库，后续可在灰度验证后启用）。
- **上游没有 LICENSE， Redistribution 合规吗？** 见 [NOTICE.md](NOTICE.md)：本仓库自身代码 MIT；上游内容逐字转载、保留全部权利、非商业、提供下架通道。

## Roadmap

见 [docs/ROADMAP.md](docs/ROADMAP.md)：cnb.cool 国内镜像、插件官方图标接入、SKILL.md 描述汉化灰度、ChatGPT 应用分区等。
