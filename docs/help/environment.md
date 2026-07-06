---
summary: "OpenClaw 从哪里加载环境变量以及优先级顺序"
read_when:
  - 你需要知道会加载哪些环境变量，以及按什么顺序加载
  - 你正在调试 Gateway 中缺失的 API key
  - 你正在编写提供商认证或部署环境文档
title: "环境变量"
---

OpenClaw 从多个来源加载环境变量。规则是**绝不覆盖现有值**。
Workspace `.env` 文件属于低信任来源：OpenClaw 在应用优先级规则前，会忽略 workspace `.env` 中的提供商凭据和受保护的运行时控制项。

## 优先级（从高到低）

1. **进程环境**（Gateway 进程从父 shell/daemon 继承的内容）。
2. **当前工作目录中的 `.env`**（dotenv 默认行为；不会覆盖；会忽略提供商凭据和受保护的运行时控制项）。
3. **全局 `.env`**：`~/.openclaw/.env`（也就是 `$OPENCLAW_STATE_DIR/.env`；推荐用于提供商 API key；不会覆盖）。
4. **`~/.openclaw/openclaw.json` 中的 `env` 块**（仅在缺失时应用）。
5. **可选的登录 shell 导入**（`env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1`），仅应用于缺失的预期键。

在使用默认状态目录的新装 Ubuntu 上，OpenClaw 还会在全局 `.env` 之后将 `~/.config/openclaw/gateway.env` 作为兼容性回退。如果这两个文件都存在且内容不一致，OpenClaw 会保留 `~/.openclaw/.env` 并打印警告。

如果配置文件完全缺失，则跳过第 4 步；如果启用了 shell 导入，第 5 步仍会运行。

## 提供商凭据与 workspace `.env`

不要只将提供商 API 密钥保存在 workspace `.env` 中。OpenClaw 会阻止从 workspace `.env` 文件中使用一大类提供商凭据和端点重定向密钥，包括所有已知的提供商认证环境变量（例如 `GEMINI_API_KEY`、`GOOGLE_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`、`GROQ_API_KEY`、`DEEPSEEK_API_KEY`、`PERPLEXITY_API_KEY`、`BRAVE_API_KEY`、`TAVILY_API_KEY`、`EXA_API_KEY`、`FIRECRAWL_API_KEY`），以及任何以 `_API_HOST`、`_BASE_URL` 或 `_HOMESERVER` 结尾的键，还有整个 `OPENCLAW_*`、`CLAWHUB_*`、`ANTHROPIC_API_KEY_*` 和 `OPENAI_API_KEY_*` 命名空间。

请改为使用以下受信任来源之一提供提供商凭据：

- Gateway 进程环境，例如 shell、launchd/systemd 单元、容器 secret 或 CI secret。
- 全局运行时 dotenv 文件：`~/.openclaw/.env` 或 `$OPENCLAW_STATE_DIR/.env`。
- `~/.openclaw/openclaw.json` 中的 `env` 块。
- 在启用 `env.shellEnv.enabled` 或 `OPENCLAW_LOAD_SHELL_ENV=1` 时，可选的登录 shell 导入。

如果你之前只把提供商密钥存放在 workspace `.env` 中，请将它们迁移到上述受信任来源之一。Workspace `.env` 仍然可以提供普通的项目变量，这些变量不是凭据、端点重定向、主机覆盖或 `OPENCLAW_*` 运行时控制项。

请参见 [Workspace `.env` files](/gateway/security#workspace-env-files) 了解安全原因。

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
- `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`（默认 `15000`）

## Exec shell snapshots

On non-Windows Gateway hosts, the `exec` command for bash and zsh uses startup snapshots by default.
Setting `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` in the Gateway process environment can disable this path.
`false`, `no`, and `off` also disable it. The `exec.env` value for a single invocation cannot switch snapshots or redirect the snapshot cache.

## 运行时注入的环境变量

OpenClaw 还会向派生的子进程注入上下文标记：

- `OPENCLAW_SHELL=exec`: 通过 `exec` 工具运行的命令会设置此项。
- `OPENCLAW_SHELL=acp-client`: 当 `openclaw acp client` 启动 ACP bridge 进程时会设置此项。
- `OPENCLAW_SHELL=tui-local`: 本地 TUI `!` shell 命令会设置此项。
- `OPENCLAW_CLI=1`: 由 CLI 入口点派生的子进程会设置此项。

这些是运行时标记（不是必需的用户配置）。它们可用于 shell/profile 逻辑
以应用特定于上下文的规则。

## UI 环境变量

- `OPENCLAW_THEME=light`：当终端是浅色背景时，强制使用浅色 TUI 调色板。
- `OPENCLAW_THEME=dark`：强制使用深色 TUI 调色板。
- `COLORFGBG`：如果终端导出了它，OpenClaw 会使用背景色提示自动选择 TUI 调色板。

## Environment Variable Substitution in Configuration

You can directly use the `${VAR_NAME}` syntax in configuration string values to reference environment variables:

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

For full details, see [Configuration: Env var substitution](/gateway/configuration-reference#env-var-substitution).

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
| `OPENCLAW_HOME`          | 覆盖用于内部 OpenClaw 路径默认值的主目录（`~/.openclaw/`、agent 目录、sessions、credentials、installer onboarding，以及默认的开发检出目录）。在将 OpenClaw 作为专用服务用户运行时很有用。 |
| `OPENCLAW_STATE_DIR`     | 覆盖状态目录（默认 `~/.openclaw`）。                                                                                                                                                                                   |
| `OPENCLAW_CONFIG_PATH`   | 覆盖配置文件路径（默认 `~/.openclaw/openclaw.json`）。                                                                                                                                                                    |
| `OPENCLAW_INCLUDE_ROOTS` | `$include` 指令可在其中解析配置目录之外文件的目录路径列表（默认：无——`$include` 限定在配置目录内）。支持波浪号展开。                                                         |

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

如果在 Gateway 进程启动时仍然设置了这些变量，OpenClaw 会发出一条
Node 弃用警告（`OPENCLAW_LEGACY_ENV_VARS`），列出检测到的前缀和
总数。请将每个值中的旧前缀替换为 `OPENCLAW_`（例如将
`CLAWDBOT_GATEWAY_TOKEN` 改为
`OPENCLAW_GATEWAY_TOKEN`）；旧名称不会生效。

## 相关内容

- [Gateway 配置](/gateway/configuration)
- [常见问题：env vars 和 .env 加载](/help/faq#env-vars-and-env-loading)
- [模型概览](/concepts/models)
