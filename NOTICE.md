# NOTICE — 商标与内容归属

本仓库（codex-plugins-zh）包含两类内容，权利归属与授权范围不同：

## 1. 本仓库原创内容（MIT License）

`tools/`、`site/`、`config/`、`data/`（catalog / diff / quality-report 等生成物）、
`i18n/zh/`（译文账本）、`docs/`、`.github/workflows/`、README。

以 MIT 授权（见 LICENSE）。

## 2. 上游内容（openai/plugins，逐字转载）

`plugins/` 目录与 `.agents/` 下的插件清单、技能、脚本、图片等内容
来自 [openai/plugins](https://github.com/openai/plugins)，**该仓库未附带开源许可证**，
按默认著作权法口径其权利归 OpenAI 及相应第三方权利人所有。

本仓库对这些内容**仅做逐字转载**，唯一的修改是与「中文门面」直接相关的白名单字段
（市场清单的 `name`/`interface`、各插件 `plugin.json` 的 `interface.*` 展示性文案），
并有 `tools/verify.mjs` 机器对账证明其余内容逐字节一致。

- 转载目的：互操作性（让中文用户的 Codex 能消费同一份插件目录），非商业；
- 各插件名称、商标、图标归其权利人所有；
- 若你是权利人并要求下架，请提 issue 或联系仓库所有者，我们会在 72 小时内处理；
- 中文译文（`interface.*` 的中文表述与 `i18n/zh/` 账本）为社区贡献，仅供参考，
  与英文原文冲突时以英文原文为准。

## 3. 种子译文

首轮译文账本部分条目来自
[echobird/codex-plugins](https://cnb.cool/echobird/codex-plugins)（快照，标记 `source: "seed"`、
`verified: false`）。感谢其公开成果。权利人要求下架时同样处理。
