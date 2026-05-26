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

配置中的 `env` 块只接受字面字符串值。它不会展开 `file:...` 值；例如，`XAI_API_KEY: "file:secrets/xai-api-key.txt"` 会作为该精确字符串传递给提供商。

对于由文件支持的提供商密钥，请在支持它的凭据字段上使用 SecretRef：

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

有关受支持字段，请参见 [密钥管理](/gateway/secrets) 和 [SecretRef 凭据表面](/reference/secretref-credential-surface)。

## Shell 环境导入

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

- `OPENCLAW_SHELL=exec`：为通过 `exec` 工具运行的命令设置。
- `OPENCLAW_SHELL=acp`：为 ACP 运行时后端进程派生设置（例如 `acpx`）。
- `OPENCLAW_SHELL=acp-client`：为 `openclaw acp client` 派生 ACP 桥接进程时设置。
- `OPENCLAW_SHELL=tui-local`：为本地 TUI `!` shell 命令设置。
- `OPENCLAW_CLI=1`：为由 CLI 入口点派生的子进程设置。

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

两者都会在激活时从进程环境中解析。SecretRef 的细节记录在 [密钥管理](/gateway/secrets) 中。
配置中的 `env` 块本身不会解析 SecretRef 或 `file:...`
简写值。

## 路径相关环境变量

| 变量                     | 用途                                                                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_HOME`          | 覆盖内部 OpenClaw 路径默认值所使用的 home 目录（`~/.openclaw/`、agent 目录、会话、凭据、安装器引导，以及默认开发检出目录）。当 OpenClaw 作为专用服务用户运行时很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆盖 state 目录（默认 `~/.openclaw`）。                                                                                                                                                                                   |
| `OPENCLAW_CONFIG_PATH`   | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                                                                                    |
| `OPENCLAW_INCLUDE_ROOTS` | `$include` 指令可以解析配置目录外文件的目录路径列表（默认：无——`$include` 仅限于配置目录）。会展开波浪号。                                                         |

## 日志

| 变量                           | 用途                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_LOG_LEVEL`             | 覆盖文件和控制台的日志级别（例如 `debug`、`trace`）。优先级高于配置中的 `logging.level` 和 `logging.consoleLevel`。无效值会被忽略并给出警告。 |
| `OPENCLAW_DEBUG_MODEL_TRANSPORT` | 在不启用全局 debug 日志的情况下，以 `info` 级别输出针对性的模型请求/响应时序诊断。                                                                                  |
| `OPENCLAW_DEBUG_MODEL_PAYLOAD`   | 模型负载诊断：`summary`、`tools` 或 `full-redacted`。`full-redacted` 有长度上限并会脱敏，但可能包含 prompt/message 文本。                                               |
| `OPENCLAW_DEBUG_SSE`             | 流式诊断：`events` 用于首个/完成时序，`peek` 会包含前五个脱敏的 SSE 事件。                                                                                 |
| `OPENCLAW_DEBUG_CODE_MODE`       | 代码模式的模型表面诊断，包括 provider 工具隐藏和 exec/wait-only 强制执行。                                                                                          |

### `OPENCLAW_HOME`

设置后，`OPENCLAW_HOME` 会替代系统 home 目录（`$HOME` / `os.homedir()`），用于内部 OpenClaw 路径默认值。这包括默认 state 目录、配置路径、agent 目录、凭据、安装器引导工作区，以及 `openclaw update --channel dev` 使用的默认开发检出目录。

**优先级：** `OPENCLAW_HOME` > `$HOME` > `USERPROFILE` > Android 上 Termux 的 `PREFIX` home 回退 > `os.homedir()`

**示例**（macOS LaunchDaemon）：

```xml
<key>EnvironmentVariables</key>
<dict>
  <key>OPENCLAW_HOME</key>
  <string>/Users/user</string>
</dict>
```

`OPENCLAW_HOME` 也可以设置为波浪号路径（例如 `~/svc`），使用前会通过相同的 OS home 回退链进行展开。

像 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_GIT_DIR` 这样的显式路径变量仍然具有更高优先级。诸如 shell 启动文件检测、包管理器设置以及主机 `~` 展开等 OS 账户任务，仍可能使用真实的系统 home。

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

- [Gateway 配置](/gateway/configuration)
- [常见问题：env vars 和 .env 加载](/help/faq#env-vars-and-env-loading)
- [模型概览](/concepts/models)
