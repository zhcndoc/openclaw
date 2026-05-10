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
      allowSymlinkTargets: ["~/Projects/manager/skills"],
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

- 内置技能根目录始终包括 `~/.openclaw/skills`、`~/.agents/skills`、
  `<workspace>/.agents/skills` 和 `<workspace>/skills`。
- `allowBundled`：仅用于 **捆绑** 技能的可选白名单。设置后，只有列表中的
  捆绑技能才有资格启用（已管理、agent 和工作区技能不受影响）。
- `load.extraDirs`：要扫描的额外技能目录（优先级最低）。
- `load.allowSymlinkTargets`：受信任的真实目标目录；即使符号链接位于
  该目标根目录之外，符号链接的技能文件夹也可以解析到这些目录中。
  当你有意使用相邻仓库布局时请使用此项，例如
  `~/.agents/skills/manager -> ~/Projects/manager/skills`。
- `load.watch`：监听技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监听事件的防抖时间，单位毫秒（默认：250）。
- `install.preferBrew`：在可用时优先使用 brew 安装器（默认：true）。
- `install.nodeManager`：node 安装器偏好（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。
  这只会影响 **技能安装**；Gateway 运行时仍应使用 Node
  （不建议在 WhatsApp/Telegram 中使用 Bun）。
  - `openclaw setup --node-manager` 的范围更窄，目前仅接受 `npm`、
    `pnpm` 或 `bun`。如果你想使用基于 Yarn 的技能安装，请手动设置
    `skills.install.nodeManager: "yarn"`。
- `entries.<skillKey>`：按技能覆盖。
- `agents.defaults.skills`：可选的默认技能白名单，由省略
  `agents.list[].skills` 的 agent 继承。
- `agents.list[].skills`：可选的按 agent 最终技能白名单；显式
  列表会替代继承的默认值，而不是合并。

## 符号链接的相邻仓库

默认情况下，每个技能根目录都是一个包含边界。如果 `~/.agents/skills` 下的
某个技能文件夹是一个符号链接，并且解析后位于 `~/.agents/skills` 之外，
OpenClaw 会跳过它并记录 `Skipping escaped skill path outside its configured
root`。

保留符号链接布局，并且仅允许受信任的目标根目录：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

使用此配置后，诸如
`~/.agents/skills/manager -> ~/Projects/manager/skills` 的符号链接在
realpath 解析后会被接受。`extraDirs` 也会直接扫描相邻仓库，而
`allowSymlinkTargets` 会为现有的 agent-技能布局保留符号链接路径。
请保持目标条目范围狭窄；不要指向诸如 `~` 或
`~/Projects` 之类的宽泛根目录，除非该根目录下的每个技能树都值得信任。

按技能字段：

- `enabled`：即使技能已捆绑/安装，也可将其禁用时设为 `false`。
- `env`：注入给 agent 运行时的环境变量（仅在尚未设置时生效）。
- `apiKey`：适用于声明了主要环境变量的技能的可选便捷配置。
  支持纯文本字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 说明

- `entries` 下的键默认映射到技能名称。如果某个技能定义了
  `metadata.openclaw.skillKey`，则使用该键代替。
- 加载优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` →
  `~/.agents/skills` → `~/.openclaw/skills` → 捆绑技能 →
  `skills.load.extraDirs`。
- 在启用监视器时，对技能的更改会在下一个 agent 回合中被拾取。

### 沙箱化的技能与环境变量

当会话处于 **沙箱化** 状态时，技能进程会在配置好的沙箱后端内运行。该沙箱不会继承宿主机的 `process.env`。

<Warning>
  全局 `env` 和 `skills.entries.<skill>.env`/`apiKey` 仅适用于 **宿主机** 运行。在沙箱内部它们不起作用，因此依赖 `GEMINI_API_KEY` 的技能会失败并显示 `apiKey not configured`，除非沙箱单独提供了该变量。
</Warning>

请使用以下之一：

- `agents.defaults.sandbox.docker.env` 用于 Docker 后端（或按 agent 配置的 `agents.list[].sandbox.docker.env`）。
- 将环境变量烘焙进你的自定义沙箱镜像或远程沙箱环境中。

## 相关内容

<CardGroup cols={2}>
  <Card title="技能" href="/tools/skills" icon="puzzle-piece">
    技能是什么，以及它们如何加载。
  </Card>
  <Card title="创建技能" href="/tools/creating-skills" icon="hammer">
    编写自定义技能包。
  </Card>
  <Card title="斜杠命令" href="/tools/slash-commands" icon="terminal">
    原生命令目录和聊天指令。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    `skills` 和 `agents.skills` 的完整 schema。
  </Card>
</CardGroup>
