---
summary: "技能配置模式和示例"
read_when:
  - 添加或修改技能配置时
  - 调整捆绑允许列表或安装行为时
title: "技能配置"
---

# 技能配置

所有与技能相关的配置都位于 `~/.openclaw/openclaw.json` 中的 `skills` 下。

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
      "nano-banana-pro": {
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

## 字段

- `allowBundled`：仅针对**捆绑**技能的可选允许列表。设置后，只有列表中的捆绑技能是可用的（管理/工作区技能不受影响）。
- `load.extraDirs`：额外的技能目录扫描路径（最低优先级）。
- `load.watch`：监视技能文件夹并刷新技能快照（默认：true）。
- `load.watchDebounceMs`：技能监视器事件的防抖时间，单位为毫秒（默认：250）。
- `install.preferBrew`：优先使用 brew 安装器（默认：true）。
- `install.nodeManager`：节点安装器偏好（`npm` | `pnpm` | `yarn` | `bun`，默认：npm）。仅影响**技能安装**；Gateway 运行时仍应使用 Node（WhatsApp/Telegram 不推荐使用 Bun）。
- `entries.<skillKey>`：每个技能的覆盖配置。

每个技能字段：

- `enabled`：设置为 `false` 即使技能已捆绑/安装也禁用该技能。
- `env`：为代理运行注入环境变量（仅当未设置时生效）。
- `apiKey`：为声明主环境变量的技能提供的可选便捷字段。支持明文字符串或 SecretRef 对象（`{ source, provider, id }`）。

## 备注

- `entries` 下面的键默认映射到技能名称。如果技能定义了 `metadata.openclaw.skillKey`，则使用该键。
- 当启用监视器时，技能配置变更将会在下一轮代理运行时生效。

### 沙箱技能 + 环境变量

当会话处于**沙箱模式**时，技能进程在 Docker 中运行。沙箱**不会**继承主机的 `process.env`。

解决方案：

- 使用 `agents.defaults.sandbox.docker.env`（或每个代理的 `agents.list[].sandbox.docker.env`）
- 将环境变量烘焙进您自定义的沙箱镜像

全局 `env` 和 `skills.entries.<skill>.env/apiKey` 仅适用于**主机**运行。
