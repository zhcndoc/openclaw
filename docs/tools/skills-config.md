---
summary: "技能配置模式和示例"
read_when:
  - 添加或修改技能配置
  - 调整捆绑允许列表或安装行为
title: "Skills config"
---

大多数技能加载/安装配置位于 `~/.openclaw/openclaw.json` 中的
`skills` 下。特定于 agent 的技能可见性位于
`agents.defaults.skills` 和 `agents.list[].skills` 下。

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills", "~/Projects/oss/some-skill-pack/skills"],
      watch: true,
      watchDebounceMs: 250,
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun（Gateway 运行时仍是 Node；不推荐使用 bun）
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或明文字符串
        env: {
          GEMINI_API_KEY: "GEMINI_KEY_HERE",
        },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

对于内置图像生成/编辑，优先使用 `agents.defaults.imageGenerationModel`
加上核心 `image_generate` 工具。`skills.entries.*` 仅用于自定义或
第三方技能工作流。

如果您选择了特定的图像提供商/模型，请同时配置该提供商的
认证/API 密钥。典型示例：`google/*` 使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，`openai/*` 使用 `OPENAI_API_KEY`，`fal/*` 使用 `FAL_KEY`。

示例：

- Native Nano Banana Pro-style setup: `agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- Native fal setup: `agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Agent 技能允许列表

当您希望相同的机器/工作区技能根目录，但不同 agent 显示不同技能集时，请使用 agent 配置。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // 继承默认值 -> github, weather
      { id: "docs", skills: ["docs-search"] }, // 替换默认值
      { id: "locked-down", skills: [] }, // 无技能
    ],
  },
}
```

规则：

- `agents.defaults.skills`：agent 的共享基础允许列表，适用于省略
  `agents.list[].skills` 的 agent。
- 省略 `agents.defaults.skills` 可使默认情况下技能不受限制。
- `agents.list[].skills`：该 agent 的显式最终技能集；不会与默认值
  合并。
- `agents.list[].skills: []`：为该 agent 暴露零个技能。

## 字段

- 内置技能根目录始终包括 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：仅用于**捆绑**技能的可选允许列表。设置后，只有列表中的捆绑技能才有资格使用（托管、agent 和工作区技能不受影响）。
- `load.extraDirs`：要扫描的额外技能目录（优先级最低）。
- `load.watch`：监视技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监视器事件的防抖时间，单位毫秒（默认：250）。
- `install.preferBrew`：在可用时优先使用 brew 安装器（默认：true）。
- `install.nodeManager`：node 安装器偏好（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  这仅影响**技能安装**；Gateway 运行时仍应使用 Node
  （WhatsApp/Telegram 不推荐使用 Bun）。
  - `openclaw setup --node-manager` 的范围更窄，目前仅接受 `npm`、
    `pnpm` 或 `bun`。如果您想使用基于 Yarn 的技能安装，请手动将
    `skills.install.nodeManager` 设置为 `"yarn"`。
- `entries.<skillKey>`：按技能覆盖配置。
- `agents.defaults.skills`：可选的默认技能允许列表，由省略
  `agents.list[].skills` 的 agent 继承。
- `agents.list[].skills`：可选的按 agent 最终技能允许列表；显式
  列表会替换继承的默认值，而不是合并。

每个技能字段：

- `enabled`：设置为 `false` 即使技能已捆绑/安装也会禁用该技能。
- `env`：为代理运行注入环境变量（仅在未设置时生效）。
- `apiKey`：为声明主环境变量的技能提供的可选便捷字段。支持明文字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 备注

- `entries` 下的键默认映射到技能名称。如果技能定义了
  `metadata.openclaw.skillKey`，则使用该键代替。
- 加载优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → 捆绑技能 →
  `skills.load.extraDirs`。
- 当监视器启用时，技能的更改将在下一个代理回合中被捕获。

### 沙箱技能 + 环境变量

当会话处于**沙箱**中时，技能进程会在配置的沙箱后端内运行。
沙箱**不会**继承主机的 `process.env`。

解决方案：

- `agents.defaults.sandbox.docker.env` 适用于 Docker 后端（或按 agent 使用 `agents.list[].sandbox.docker.env`）
- 将环境变量烘焙到您的自定义沙箱镜像或远程沙箱环境中

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于**主机**运行。

## 相关内容

- [Skills](/tools/skills)
- [创建技能](/tools/creating-skills)
- [Slash commands](/tools/slash-commands)
