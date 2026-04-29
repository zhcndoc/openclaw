---
summary: "OpenClaw 从哪里加载环境变量以及优先级顺序"
read_when:
  - 你需要知道会加载哪些环境变量，以及按什么顺序加载
  - 你正在调试 Gateway 中缺失的 API key
  - 你正在编写提供商认证或部署环境文档
title: "环境变量"
---

OpenClaw 会从多个来源拉取环境变量。规则是 **绝不覆盖已有值**。

## 优先级（从高到低）

1. **进程环境**（Gateway 进程从父 shell/守护进程已经继承到的内容）。
2. **当前工作目录中的 `.env`**（dotenv 默认行为；不会覆盖）。
3. **全局 `.env`**，位于 `~/.openclaw/.env`（也就是 `$OPENCLAW_STATE_DIR/.env`；不会覆盖）。
4. **`~/.openclaw/openclaw.json` 中的配置 `env` 块**（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅对缺失的预期键应用。

在使用默认 state dir 的 Ubuntu 全新安装上，OpenClaw 还会将 `~/.config/openclaw/gateway.env` 视为全局 `.env` 之后的兼容回退。如果两个文件都存在且内容不一致，OpenClaw 会保留 `~/.openclaw/.env` 并打印警告。

如果配置文件完全缺失，则跳过第 4 步；如果启用了 shell 导入，第 5 步仍会运行。

## 配置 `env` 块

设置内联环境变量有两种等价方式（两者都不会覆盖已有值）：

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
  },
}
```

## Shell env 导入

`env.shellEnv` 会运行你的登录 shell，并且只导入**缺失的**预期键：

```json5
{
  env: {
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

环境变量等价项：

- `OPENCLAW_LOAD_SHELL_ENV=1`
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`

## 运行时注入的环境变量

OpenClaw 还会向派生的子进程注入上下文标记：

- `OPENCLAW_SHELL=exec`：通过 `exec` 工具运行的命令会设置该值。
- `OPENCLAW_SHELL=acp`：ACP 运行时后端进程拉起时会设置该值（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：`openclaw acp client` 拉起 ACP 桥接进程时会设置该值。
- `OPENCLAW_SHELL=tui-local`：本地 TUI 的 `!` shell 命令会设置该值。

这些是运行时标记（不是必需的用户配置）。它们可用于 shell/profile 逻辑
以应用特定于上下文的规则。

## UI 环境变量

- `OPENCLAW_THEME=light`：当终端是浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 调色板。
- `COLORFGBG`：如果终端导出了它，OpenClaw 会使用背景色提示自动选择 TUI 调色板。

## 配置中的环境变量替换

你可以在配置字符串值中直接使用 `${VAR_NAME}` 语法引用环境变量：

```json5
{
  models: {
    providers: {
      "vercel-gateway": {
        apiKey: "${VERCEL_GATEWAY_API_KEY}",
      },
    },
  },
}
```

完整细节请参见 [Configuration: Env var substitution](/gateway/configuration-reference#env-var-substitution)。

## Secret refs vs `${ENV}` 字符串

OpenClaw 支持两种基于环境变量的模式：

- 配置值中的 `${VAR}` 字符串替换。
- 用于支持 secrets 引用字段的 SecretRef 对象（`{ source: "env", provider: "default", id: "VAR" }`）。

两者都会在激活时从进程环境中解析。SecretRef 的细节记载于 [Secrets Management](/gateway/secrets)。

## 路径相关环境变量

| Variable               | Purpose                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`        | 覆盖用于所有内部路径解析的 home 目录（`~/.openclaw/`、agent 目录、sessions、credentials）。在将 OpenClaw 作为专用服务用户运行时很有用。 |
| `OPENCLAW_STATE_DIR`   | 覆盖 state 目录（默认 `~/.openclaw`）。                                                                                                                            |
| `OPENCLAW_CONFIG_PATH` | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                             |

## 日志

| Variable             | Purpose                                                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL` | 覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。其优先级高于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值会被忽略并给出警告。 |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 会在所有内部路径解析中替代系统 home 目录（`$HOME` / `os.homedir()`）。这使得无头服务账户可以实现完整的文件系统隔离。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > `os.homedir()`

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为 tilde 路径（例如 `~/svc`），使用前会先通过 `$HOME` 展开。

## nvm 用户：web_fetch TLS 失败

如果 Node.js 是通过 **nvm** 安装的（而不是系统包管理器），内置的 `fetch()` 会使用
nvm 自带的 CA 存储，其中可能缺少现代根 CA（Let's Encrypt 的 ISRG Root X1/X2、
DigiCert Global Root G2 等）。这会导致大多数 HTTPS 网站上的 `web_fetch` 失败，并报出 `"fetch failed"`。

在 Linux 上，OpenClaw 会自动检测 nvm，并在实际启动环境中应用修复：

- `openclaw gateway install` 会将 `NODE_EXTRA_CA_CERTS` 写入 systemd 服务环境
- `openclaw` CLI 入口会在 Node 启动前重新执行自身，并设置 `NODE_EXTRA_CA_CERTS`

**手动修复（适用于旧版本或直接 `node ...` 启动）：**

在启动 OpenClaw 之前导出该变量：

```bash
export NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
openclaw gateway run
```

不要仅依赖将该变量写入 `~/.openclaw/.env`；Node 会在进程启动时读取
`NODE_EXTRA_CA_CERTS`。

## 旧版环境变量

OpenClaw 只读取 `OPENCLAW_*` 环境变量。早期版本中的旧前缀
`CLAWDBOT_*` 和 `MOLTBOT_*` 会被静默
忽略。

如果在启动时 Gateway 进程上仍设置了这些变量中的任何一个，OpenClaw 会发出
一条 Node 弃用警告（`OPENCLAW_LEGACY_ENV_VARS`），列出检测到的前缀和总数。
请通过将旧前缀替换为 `OPENCLAW_` 来重命名每个值（例如 `CLAWDBOT_GATEWAY_TOKEN` →
`OPENCLAW_GATEWAY_TOKEN`）；旧名称不会生效。

## 相关内容

- [Gateway configuration](/gateway/configuration)
- [FAQ: env vars and .env loading](/help/faq#env-vars-and-env-loading)
- [Models overview](/concepts/models)
