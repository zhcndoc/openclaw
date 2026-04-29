---
summary: "技能配置架构与示例"
read_when:
  - 添加或修改技能配置
  - 调整捆绑白名单或安装行为
title: "技能配置"
---

大多数 skills 加载/安装配置都位于 `~/.openclaw/openclaw.json` 中的
`skills` 下。与 agent 相关的技能可见性位于 `agents.defaults.skills` 和
`agents.list[].skills` 下。

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
      nodeManager: "npm", // npm | pnpm | yarn | bun（Gateway 运行时仍然是 Node；不建议使用 bun）
    },
    entries: {
      "image-lab": {
        enabled: true,
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // 或纯文本字符串
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
加上核心的 `image_generate` 工具。`skills.entries.*` 仅用于自定义或第三方
技能工作流。

如果你选择了特定的图像提供商/模型，也要配置该提供商的认证/API 密钥。
常见示例：`google/*` 使用 `GEMINI_API_KEY` 或 `GOOGLE_API_KEY`，
`openai/*` 使用 `OPENAI_API_KEY`，`fal/*` 使用 `FAL_KEY`。

示例：

- 原生 Nano Banana Pro 风格设置：`agents.defaults.imageGenerationModel.primary: "google/gemini-3-pro-image-preview"`
- 原生 fal 设置：`agents.defaults.imageGenerationModel.primary: "fal/fal-ai/flux/dev"`

## Agent 技能白名单

当你希望同一台机器/工作区拥有相同的技能根目录，但每个 agent 的可见技能集不同
时，请使用 agent 配置。

```json5
{
  agents: {
    defaults: {
      skills: ["github", "weather"],
    },
    list: [
      { id: "writer" }, // 继承 defaults -> github, weather
      { id: "docs", skills: ["docs-search"] }, // 替换 defaults
      { id: "locked-down", skills: [] }, // 没有技能
    ],
  },
}
```

规则：

- `agents.defaults.skills`：适用于未省略 `agents.list[].skills` 的 agent 的共享基础白名单。
- 省略 `agents.defaults.skills` 可使默认情况下技能不受限制。
- `agents.list[].skills`：该 agent 的显式最终技能集；它不会与 defaults 合并。
- `agents.list[].skills: []`：为该 agent 暴露零个技能。

## 字段

- 内置技能根始终包括 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：仅用于 **捆绑** 技能的可选白名单。设置后，只有列表中的
  捆绑技能才有资格生效（不影响已管理、agent 和工作区技能）。
- `load.extraDirs`：要扫描的额外技能目录（优先级最低）。
- `load.watch`：监视技能文件夹并刷新技能快照（默认值：true）。
- `load.watchDebounceMs`：技能监视器事件的防抖时间，单位毫秒（默认值：250）。
- `install.preferBrew`：在可用时优先使用 brew 安装器（默认值：true）。
- `install.nodeManager`：node 安装器偏好（`npm` | `pnpm` | `yarn` | `bun`，默认值：npm）。
  这只影响 **技能安装**；Gateway 运行时仍应使用 Node
  （不建议在 WhatsApp/Telegram 中使用 Bun）。
  - `openclaw setup --node-manager` 的范围更窄，目前只接受 `npm`、
    `pnpm` 或 `bun`。如果你想使用基于 Yarn 的技能安装，请手动设置
    `skills.install.nodeManager: "yarn"`。
- `entries.<skillKey>`：按技能覆盖的配置。
- `agents.defaults.skills`：可选的默认技能白名单，由省略
  `agents.list[].skills` 的 agent 继承。
- `agents.list[].skills`：可选的每个 agent 最终技能白名单；显式列表会替换继承的默认值，而不是合并。

每个技能字段：

- `enabled`：设为 `false` 可禁用某个技能，即使它是捆绑/已安装的。
- `env`：为 agent 运行注入的环境变量（仅在尚未设置时）。
- `apiKey`：适用于声明了主环境变量的技能的可选便捷配置。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 说明

- `entries` 下的键默认映射到技能名称。如果某个技能定义了
  `metadata.openclaw.skillKey`，则使用该键代替。
- 加载优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → 捆绑技能 →
  `skills.load.extraDirs`。
- 在启用监视器时，对技能的更改会在下一个 agent 回合中被拾取。

### 沙盒化技能 + env 变量

当会话处于 **沙盒化** 状态时，技能进程会在配置的沙盒后端中运行。
该沙盒不会继承宿主的 `process.env`。

请使用以下之一：

- `agents.defaults.sandbox.docker.env` 用于 Docker 后端（或每个 agent 的 `agents.list[].sandbox.docker.env`）
- 将 env 烘焙进你的自定义沙盒镜像或远程沙盒环境中

全局 `env` 以及 `skills.entries.<skill>.env/apiKey` 仅适用于 **宿主** 运行。

## 相关内容

- [技能](/tools/skills)
- [创建技能](/tools/creating-skills)
- [斜杠命令](/tools/slash-commands)
