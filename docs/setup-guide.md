# Codex 插件市场：冗余清理与官方市场配置指南

写给：用第三方 API / 中转站接入 Codex（不走 OpenAI 官方认证链路）、觉得插件市场一团乱麻的用户。
本文所有结论基于 2026-10 的 Codex 桌面版（26.1002.x）实测。

## 一、先搞清楚你的 Codex 里有哪些市场

终端里跑（只读，安全）：

```bash
codex plugin marketplace list
```

以一台 API-key 用户的实机为例：

| MARKETPLACE | ROOT 指向 | 是什么 | 该怎么办 |
| --- | --- | --- | --- |
| `openai-primary-runtime` | `~/.cache/codex-runtimes/...` | App 核心运行时插件（documents/pdf/spreadsheets 等） | **别动** |
| `openai-bundled` | `~/.codex/.tmp/bundled-marketplaces/...` | App 内置插件（browser/chrome/computer-use/visualize 等） | **别动** |
| `openai-api-curated` | `~/.codex/.tmp/plugins` | **官方给 API-key 用户的插件市场**（清单 `api_marketplace.json`，约 50 个），UI 里显示为「Built by OpenAI · 50 个插件」 | **别删！这是你的正版官方市场** |
| `baomiao-codex`（示例） | `~/.codex/.tmp/marketplaces/baomiao-codex` | 你自己手动添加的第三方市场 | 自己决定，不用可删 |
| （不出现在 list 里） | config.toml 里 `[marketplaces.openai-curated]` 指向 `C:\Users\user\...` | onboarding 预写却**从未生效的占位死条目**（路径里的 `user` 是占位用户名，不是你的用户目录） | **删**，见下文 |

> 「Built by OpenAI · 50 个插件」那条 ≠ 冗余。它就是 API 链路用户该有的官方市场，路径正确、可升级、可安装。删了它你的官方插件就真没了。

## 二、清理冗余（按需执行）

关闭 Codex App 后再动配置（App 退出时可能回写 config.toml）。

1. **删掉死的 openai-curated 占位条目**（若 `marketplace list` 里没有它，说明它加载失败被静默忽略，但 TOML 残留仍在）：

   ```bash
   codex plugin marketplace remove openai-curated
   ```

   若 remove 报「不存在」，直接编辑 `~/.codex/config.toml` 删掉这三行即可：

   ```toml
   [marketplaces.openai-curated]
   source_type = "local"
   source = "\\\\?\\C:\\Users\\user\\.codex\\.tmp\\plugins"
   ```

2. **删掉指向已不存在市场的插件开关**：config.toml 里 `[plugins."xxx@openai-curated-remote"]` 之类的条目，其市场已不在 `marketplace list` 里，属于死配置，整段删除。

3. **临时文件大扫除**（可选，App 关闭后执行）：
   - `~/.codex/.tmp/git-*`：市场物化过程的临时目录，可删；
   - `~/.codex/plugins/cache/kami/`、`ponytail/`：空的内测市场缓存残留，可删；
   - `~/.codex/` 下 `..codex-global-state.json.tmp-*` 历史临时文件，可删。

   不要碰：`config.toml`、`auth.json`、各 sqlite 文件、`plugins/cache/` 下有内容的目录、`.tmp/plugins/`（它是 api-curated 市场的实体）。

## 三、把官方市场补回来（两种姿势）

### 姿势 A：git 源（推荐，一条命令跟进上游）

```bash
# 先移除死条目避免撞名（市场名取自清单内 name 字段，就是 openai-curated）
codex plugin marketplace remove openai-curated

# 添加官方市场（ChatGPT 账号清单 65 个插件）
codex plugin marketplace add https://github.com/openai/plugins.git

# 添加中文版市场（本仓库，62 个插件，中文门面）
codex plugin marketplace add https://github.com/kael-odin/codex-plugins-zh.git

# 以后跟进上游更新：
codex plugin marketplace upgrade
```

说明：
- `marketplace add` 接受四种写法：`owner/repo[@ref]` 简写、HTTPS/SSH Git URL、本地路径；`--ref <commit>` 可钉住版本，`--sparse <path>` 可稀疏检出。
- 添加后 git 快照物化在 `~/.codex/.tmp/marketplaces/<市场名>/`。
- 添加 git 源注册的是仓库里的 `marketplace.json`（65 个，ChatGPT 账号口径）；API-key 用户已经有的 `openai-api-curated`（50 个，含 superpowers、game-studio 等 CODEX 专属）不受影响，两者并存。

### 姿势 B：修 config 指向已有副本（零网络）

如果你的 `~/.codex/.tmp/plugins/` 已经有完整副本（README + plugins 结构），可以把 config.toml 里的死路径改成真实路径：

```toml
[marketplaces.openai-curated]
source_type = "local"
source = "\\\\?\\C:\\<你的用户名>\\.codex\\.tmp\\plugins"
```

缺点：local 源不会自动跟进上游，更新要自己 `git pull`。推荐还是姿势 A。

## 四、常见坑

- **撞名**：市场名来自清单里的 `name` 字段，不是仓库名。添加 openai/plugins 注册名必为 `openai-curated`，同名条目已存在时会冲突——先 remove 再 add。
- **装完插件不出现**：装完/切开关后需要**重开会话**（新开一个对话线程）才生效。
- **API 用户 vs ChatGPT 用户清单不同**：官方仓库里 `marketplace.json`（65，ChatGPT 账号）与 `api_marketplace.json`（50，API key，`products:["CODEX"]` 标记）是两套。手动加 git 源拿到的是前者；后者 App 会自动管理。
- **第三方中转站用户**：`requires_openai_auth = false` 时 onboarding 的市场预配步骤可能写出占位路径（本文的 `C:\Users\user` 即此 bug 的现场），按第二节清理即可。

## 五、验证

```bash
codex plugin marketplace list      # 新市场应出现且 ROOT 指向 .tmp/marketplaces/<name>
codex plugin list                  # 能列出各市场的插件
```

然后重开 Codex 会话，插件面板应能看到「Codex 官方插件 · 中文版」。
