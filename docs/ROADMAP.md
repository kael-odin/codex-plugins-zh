# Roadmap

## M0 · 调研与本机修复 ✅（2026-10-08）

- [x] 确认官方仓库 `openai/plugins` 结构：`marketplace.json`（65）/ `api_marketplace.json`（50）/ `plugins/<name>`
- [x] 实机定位「onboarding 跳过」病根：config 占位路径 `C:\Users\user`
- [x] 摸清 `codex plugin marketplace add` 参数面（owner/repo / HTTPS / SSH / local / --ref / --sparse）
- [x] 确认 API 用户侧 `openai-api-curated`（Built by OpenAI · 50）为 App 自管、不可删

## M1 · 流水线骨架 ✅（2026-10-08）

- [x] `tools/sync.mjs`：上游镜像 + commit 级 diff
- [x] `tools/compose.mjs`：发布树合成（白名单覆写）+ catalog 生成
- [x] `tools/verify.mjs`：无损对账（首轮 5404 文件 / 5338 字节一致 / 66 白名单 / 0 分歧）
- [x] `tools/translate.mjs`：哈希键控译文账本 + 种子采纳 + GLM API 批量翻译

## M2 · 汉化覆盖 ⏳

- [x] echobird 种子译文采纳：747/814 条（92%）
- [ ] GLM API 全量翻译补缺（仓库 Secrets 配 `GLM_API_KEY` 后 CI 自动跑；或本地 `--execute`）
- [ ] SKILL.md frontmatter description 汉化灰度（译文已入库，待触发质量 A/B 后在 compose 启用）
- [ ] 术语表扩充（错误信息 / policy 字段）

## M3 · 导航站 ✅ v1（2026-10-08）→ ⏳ 打磨

- [x] 搜索（中英混搜）/ 分类 / 只看已译 / 详情双语对照 / 复制市场地址
- [ ] 插件官方图标（assets 里现成，需解决 Pages 体积与商标展示口径）
- [ ] ChatGPT 应用/连接器分区（source-blip 的 1500+ 数据可作种子，仅站点展示、不进市场仓）
- [ ] 更新日志页（data/diff.json 可视化「本次更新」）

## M4 · 分发与生态 ⏳

- [ ] cnb.cool 镜像仓（国内 git 加速，CI 同步推送）
- [ ] 教程补实机截图；setup-guide 英文版
- [ ] upstream 出 LICENSE 后的合规复查
- [ ] （远期）Cloudflare Worker 搜索 API / 深链直达插件

## 已知边界

- 上游清单有 3 条引用不存在的目录（crowdstrike-falcon-*、qodo），catalog 中标 `missing`，等待上游修复。
- `marketplace add` 手动添加读取的是 `marketplace.json`；`api_marketplace.json` 是否被手动添加的 git 市场自动识别待实测（M1 遗留验证点）。
