---
summary: "Stdio、SSE/HTTP 和 Streamable HTTP 传输字段以及 MCP OAuth 工作流程"
title: "运输和 OAuth"
read_when:
  - "为已保存的 MCP 服务器选择传输"
  - "查找传输配置字段"
  - "运行或修复 MCP OAuth 登录流程"
---

这些是保存的 MCP 服务器定义可以使用的传输形状，以及 HTTP 传输可以进行身份​​验证的 OAuth 工作流程。

当 Codex 拥有 MCP 连接时，显式 `connectionTimeoutMs` 值控制启动，包括初始化和初始工具发现，以及 `requestTimeoutMs` 值控制工具调用。当将这些值转换为 Codex 的基于秒的设置时，OpenClaw 保留毫秒精度；未设置的值保留 Codex 的默认值。 `supportsParallelToolCalls` 提示也被转发。 Codex 还可以并行运行带有 `readOnlyHint` 注释的工具。

## <a id="stdio-transport"></a> Stdio传输

启动本地子进程并通过 stdin/stdout. 进行通信

| 字段                      | 描述                       |
| -------------------------- | --------------------------------- |
| `command`                  | 要启动的可执行文件（必需）    |
| `args`                     | 命令行参数数组   |
| `env`                      | 额外的环境变量       |
| `cwd` / `workingDirectory` | 进程的工作目录 |

关闭可以强制慢速锚点和中继在其控制、输出和沿袭管道关闭后退出。一名还活着的主播被杀死并通过其中继而收获。如果主播组已经消失，主机可以直接杀死一个无响应的中继。然后主持人确认实际退出和团体消失。确认清理工作正常完成；稍后的连接会启动一个新的服务器。未经确认的清理仍会报告错误，其中包含缺少的关闭事实、经过的时间以及任何失败的信号传递。当关闭升级时，清理期限不会改变。

<Warning>
**Stdio 环境变量安全过滤器**

OpenClaw 在生成 std​​io MCP 服务器之前拒绝解释器启动、加载程序劫持和 shell-init 环境密钥，即使它们出现在服务器的 `env` 块中也是如此。这使用与其他 OpenClaw- 生成的进程相同的主机环境安全策略：它阻止已知的解释器启动挂钩（例如 `NODE_OPTIONS`、`PYTHONSTARTUP`、`PERL5OPT`、`RUBYOPT`、`BASHOPTS`、`KSH_ENV`）、共享库和函数注入前缀（`DYLD_*`、`LD_*`、`BASH_FUNC_*`）以及类似的运行时控制变量。启动会默默地删除这些内容并记录警告，以便它们无法注入隐式前奏、交换解释器、启用调试器或针对 stdio 进程劫持动态链接器。显式允许列表使普通 MCP 凭证环境变量保持可用（`GITHUB_TOKEN`、`GH_TOKEN`、`GITLAB_TOKEN`、`NPM_TOKEN`、`NODE_AUTH_TOKEN`、`DATABASE_URL`、`MONGODB_URI`、 `REDIS_URL`、`AMQP_URL`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`AWS_SESSION_TOKEN`、`AZURE_CLIENT_ID`、`AZURE_CLIENT_SECRET`），以及普通代理和服务器特定的环境变量（`HTTP_PROXY`、自定义） `*_API_KEY`等）。其他 `AWS_*` 密钥（例如 `AWS_CONFIG_FILE` 和 `AWS_SHARED_CREDENTIALS_FILE`）仍然被阻止，因为它们指向凭证文件而不是直接携带凭证值。

如果你的 MCP 服务器确实需要其中某个被阻止的变量，请将其设置在网关主机进程上，而不是放在 stdio 服务器的 `env` 下。
</Warning>

## <a id="sse-%2F-http-transport"></a><a id="sse-/-http-transport"></a> SSE / HTTP 运输

通过 HTTP 服务器发送的事件连接到远程 MCP 服务器。

| 字段                       | 描述                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| `url`                       | 远程服务器的 HTTP 或 HTTPS URL（必填）                |
| `headers`                   | 可选的 HTTP 头键值映射（例如认证令牌） |
| `connectionTimeoutMs`       | 每个服务器的连接超时（以毫秒为单位）（可选）                   |
| `requestTimeoutMs`          | 每个服务器 MCP 请求超时（以毫秒为单位）                   |
| `auth: "oauth"`             | 使用 `openclaw mcp login` 保存的 MCP OAuth 凭证          |
| `sslVerify`                 | 仅对明确信任的私有 HTTPS 端点设置 false    |
| `clientCert` / `clientKey`  | mTLS 客户端证书和密钥路径                            |
| `supportsParallelToolCalls` | 提示并发调用对于该服务器是安全的              |

示例：

```json
{
  "mcp": {
    "servers": {
      "remote-tools": {
        "url": "https://mcp.example.com",
        "auth": "oauth",
        "requestTimeoutMs": 20000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

`url` 中的敏感值（userinfo）和 `headers` 会在日志和状态输出中被脱敏。`openclaw mcp doctor` 会在 `headers` 或 `env` 条目包含字面量值时发出警告，以便操作员将这些值移出已提交的配置。

Doctor 在环境替换之前检查创作的值，包括 `$include` 文件中的值。设置变量时，诸如 `${MCP_TOKEN}` 和 `Bearer ${MCP_TOKEN}` 之类的引用不会触发文字值警告。非空文字后备（例如 `${MCP_TOKEN:-literal-token}`、转义占位符和引用周围的文字文本）仍然会发出警告；允许使用 `Bearer` 和 `Basic` 身份验证方案前缀。连接探测仍然使用解析值。

如果旧版 SSE 消息端点返回 HTTP 404，或者有状态 Streamable HTTP 会话过期，则 OpenClaw 会停用该连接并在下次发现时重新连接。报告失败的调用而不重播它，因为工具可能在连接失败之前已经更改了状态。

## <a id="oauth-workflow"></a> OAuth 工作流程

OAuth 适用于通告 MCP OAuth 流的 HTTP MCP 服务器。当启用 `auth: "oauth"` 时，服务器会忽略静态 `Authorization` 标头。默认情况下，OAuth 凭证是共享的并由操作员管理。 `openclaw mcp login` 保存的凭证可与嵌入式 MCP、CLI 运行程序和本地 Codex 应用程序服务器配合使用。

原生 MCP OAuth 会话存储在所有者专用的共享 SQLite 数据库 `<state-dir>/state/openclaw.sqlite`（`mcp_oauth_stores`）中。该行可以包含访问令牌和刷新令牌、动态客户端注册密钥、发现元数据以及临时 PKCE verifier。刷新、登录和注销使用同一个 SQLite 租约，因此并行运行的 OpenClaw 进程无法重复使用同一个刷新令牌，也无法让已注销的会话重新恢复。

从已弃用的 `<state-dir>/mcp-oauth/*.json` 存储迁移，仅由 `openclaw doctor --fix` 处理。运行时代码不会读取、写入这些文件，也不会回退到这些文件。

在共享凭据可用之前，OpenClaw 只会从代理运行时中省略该 MCP 服务器，而不是让代理回合失败。随后，操作员或具有 shell 访问权限的代理可以运行 `openclaw mcp login <name>`，并在之后的回合中使用该服务器。

如果服务器使用 `insufficient_scope` 拒绝令牌，OpenClaw 会保留所请求的作用域，并要求运行 `openclaw mcp login <name>`，而不是重复执行无法授予新作用域的刷新操作。该登录会启动新的授权请求，同时保留之前的令牌，直到保存替换凭据。

如果远程 MCP 服务已经由单独的、支持 OpenClaw 刷新的身份验证配置文件提供支持，你可以选择设置 `oauth.authProfileId`。OpenClaw 会在运行时投影之前刷新任一凭据来源，并且只将当前访问令牌传递给下游 MCP 客户端。

当每个经过身份验证的发送者都应连接到单独的账户时，设置 `oauth.identity: "per-requester"`。每个请求者的 OAuth 都要求使用 HTTP 服务器 URL，并且不能使用 `oauth.authProfileId`。将 `gateway.publicOrigin` 配置为 Gateway 对外可访问的 HTTPS 源；在本地开发期间，仅对于字面上的回环主机（`localhost`、`127.0.0.1` 或 `[::1]`）接受 HTTP。提供方会在授权后重定向到 `<gateway.publicOrigin>/oauth/mcp/callback`。

```json5
{
  gateway: {
    publicOrigin: "https://gateway.example.com",
  },
  mcp: {
    servers: {
      docs: {
        url: "https://mcp.example.com/mcp",
        transport: "streamable-http",
        auth: "oauth",
        oauth: {
          identity: "per-requester",
          scope: "docs.read",
        },
      },
    },
  },
}
```

每个请求者的流程由发送者驱动：

1. 发送者在连接账户之前调用服务器中的工具。
2. OpenClaw 为该发送者返回登录链接，而不是暴露其他发送者的凭据。
3. 提供方通过 Gateway 回调进行重定向。回调成功后，发送者使用其已连接的账户重试工具调用。

如果缺少 `gateway.publicOrigin`，登录结果会指出该设置，`openclaw doctor` 也会报告相同的操作员修复方案。对于共享凭据，`openclaw mcp login` 和 `openclaw mcp logout` 仍然是仅限操作员使用的命令；它们不会管理每个请求者的账户。

登录链接是一次性 bearer 链接：任何打开该链接的聊天参与者，都会将自己的账户连接到该链接签发给的发送者。请在每个受信任的发送者相互信任的频道中使用每个请求者的 OAuth；请求者私有的登录交接仍作为后续工作进行跟踪。

共享的操作员流程使用以下命令：

<Steps>
  <Step id="save-the-server" title="保存服务器">
    使用 `auth: "oauth"` 和任何可选的 OAuth 元数据添加或更新服务器。

    ```bash
    openclaw mcp set docs '{"url":"https://mcp.example.com/mcp","transport":"streamable-http","auth":"oauth","oauth":{"scope":"docs.read"}}'
    ```

    对于由 auth-profile 支持的 bearer，保存配置文件绑定：

    ```bash
    openclaw mcp set docs '{"url":"https://mcp.example.com/mcp","transport":"streamable-http","auth":"oauth","oauth":{"authProfileId":"docs:mcp"}}'
    ```

  </Step>
  <Step id="start-login" title="开始登录">
    运行登录以创建授权请求。

    ```bash
    openclaw mcp login docs
    ```

    OpenClaw 会启动已注册的回环回调，打印授权 URL，并将临时 OAuth verifier 状态存储在共享 SQLite 中。在浏览器中批准请求，然后返回终端；回调到达后，令牌交换会自动完成。

    提供者可以在没有端口的情况下注册 HTTP 环回回调，如 RFC 8252 所允许的。OpenClaw 保留对相同 `127.0.0.1`、`[::1]` 或 `localhost` 回调的注册，同时在授权和令牌请求中发送侦听器的端口。其他回调组件必须匹配；非环回回调仍然需要精确匹配。

  </Step>
  <Step id="use-the-manual-fallback-when-needed" title="需要时使用手动回退">
    如果浏览器运行在另一台机器上，或者无法访问打印出的回环地址，请复制返回的代码并将其传回 OpenClaw。

    ```bash
    openclaw mcp login docs --code abc123
    ```

  </Step>
  <Step id="check-authorization" title="检查授权">
    使用 status 或 doctor 确认令牌已存在且不需要额外授权。如果 status 报告 `authorization-required`，或者 doctor 提示需要额外授权，请再次运行 `openclaw mcp login <name>`。

    ```bash
    openclaw mcp status --verbose
    openclaw mcp doctor docs --probe
    ```

  </Step>
  <Step id="clear-credentials" title="清除凭证">
    注销会移除已存储的 OAuth 凭据，但会保留已保存的服务器定义。

    ```bash
    openclaw mcp logout docs
    ```

  </Step>
</Steps>

如果提供者轮换令牌或授权状态卡住，请运行 `openclaw mcp logout <name>`，然后重复 `login`。即使 `auth: "oauth"` 已从配置中删除，只要服务器名称和 URL 仍标识凭证存储条目，`logout` 就可以清除已保存 HTTP 服务器的凭证。

## <a id="streamable-http-transport"></a> Streamable HTTP 传输

`streamable-http` 是与 `sse` 和 `stdio` 并列的另一种传输选项。它使用 HTTP 流式传输与远程 MCP 服务器进行双向通信。

| 字段                       | 描述                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `url`                       | 远程服务器的 HTTP 或 HTTPS URL（必填）                                      |
| `transport`                 | 设置为 `"streamable-http"` 以选择此传输；如果省略，OpenClaw 将使用 `sse` |
| `headers`                   | 可选的 HTTP 头键值映射（例如认证令牌）                       |
| `connectionTimeoutMs`       | 每个服务器的连接超时（以毫秒为单位）（可选）                                         |
| `requestTimeoutMs`          | 每个服务器 MCP 请求超时（以毫秒为单位）                                         |
| `auth: "oauth"`             | 使用 `openclaw mcp login` 保存的 MCP OAuth 凭证                                |
| `sslVerify`                 | 仅对明确信任的私有 HTTPS 端点设置 false                          |
| `clientCert` / `clientKey`  | mTLS 客户端证书和密钥路径                                                  |
| `supportsParallelToolCalls` | 提示并发调用对于该服务器是安全的                                    |

OpenClaw 配置使用 `transport: "streamable-http"` 作为当前拼写。 CLI-native MCP `type: "http"` 值在通过 `openclaw mcp set` 保存并由现有配置中的 `openclaw doctor --fix` 修复时被接受，但 `transport` 是嵌入式 OpenClaw 直接使用的值。

示例：

```json
{
  "mcp": {
    "servers": {
      "streaming-tools": {
        "url": "https://mcp.example.com/stream",
        "transport": "streamable-http",
        "connectionTimeoutMs": 10000,
        "requestTimeoutMs": 30000,
        "headers": {
          "Authorization": "Bearer <token>"
        }
      }
    }
  }
}
```

<Note>
注册表命令不会启动通道桥接。只有 `probe` 和 `doctor --probe` 会打开实时 MCP 客户端会话，以证明目标服务器可达。
</Note>
