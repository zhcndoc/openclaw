---
summary: "网关端口、远程模式客户端、绑定地址以及运行多个网关"
title: "网关端口，已运行，远程模式"
read_when:
  - "网关不会绑定或报告它已经在运行"
  - "您正在将客户端连接到其他地方的网关"
---

## <a id="gateway%3A-ports%2C-%22already-running%22%2C-and-remote-mode"></a><a id="gateway-ports-already-running-and-remote-mode"></a> 网关：端口、“已在运行”和远程模式。

<AccordionGroup>
  <Accordion id="what-port-does-the-gateway-use" title="网关使用什么端口？">
    `gateway.port` 控制 WebSocket + HTTP 的单个复用端口（Control UI、钩子等）。优先级：

    ```text
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <a id="why-does-openclaw-gateway-status-say-runtime-running-but-connectivity-probe-failed" />

  <Accordion id="why-does-openclaw-gateway-status-report-a-running-process-but-a-failed-connection" title='为什么openclaw网关状态报告正在运行进程但连接失败？'>
    “正在运行”是**supervisor的**视图（launchd/systemd/schtasks）；连通性检查是CLI实际连接到网关WebSocket。在`openclaw gateway status`中，将连接目标URL与`Listening:`（端口上实际绑定的内容）进行比较，并检查`Last gateway error:`当进程处于活动状态但端口未监听时失败的原因。
  </Accordion>

  <Accordion id="why-does-openclaw-gateway-status-show-config-cli-and-config-service-different" title='为什么openclaw网关状态显示“Config（cli）”和“Config（service）”不同？'>
    你正在编辑一个配置文件，而服务运行的是另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复方法：从服务应使用的同一个 `--profile` / 环境中运行：

    ```bash
    openclaw gateway install --force
    ```

  </Accordion>

  <Accordion id="what-does-another-gateway-instance-is-already-listening-mean" title='“另一个网关实例已经在监听”是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁（默认 `ws://127.0.0.1:18789`）。如果绑定因 `EADDRINUSE` 失败，就会抛出 `GatewayLockError`（“另一个网关实例已经在监听”）。

    修复：停止另一个实例、释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion id="how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere" title="如何在远程模式下运行 OpenClaw（客户端连接到其他地方的网关）？">
    将 `gateway.mode: "remote"` 并指向一个远程 WebSocket URL，也可以附带共享密钥远程凭据：

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    - `openclaw gateway` 仅在 `gateway.mode` 为 `local` 时启动（或你传入覆盖标志时）。
    - macOS 应用会监视配置文件，并在这些值变化时实时切换模式。
    - `gateway.remote.token` / `.password` 只是客户端侧的远程凭据；它们本身不会启用本地网关认证。

  </Accordion>

  <Accordion id="the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now" title='Control UI 显示“未经授权”（或不断重新连接）。现在怎么办？'>
    您的网关身份验证路径和 UI 的身份验证方法不匹配。

    事实（来自代码）：

    - Control UI 将令牌保留在 `sessionStorage` 中，范围仅限于当前浏览器选项卡和选定的网关 URL，因此同一选项卡刷新可以继续工作，而无需长期保留本地存储令牌。
    - 在 `AUTH_TOKEN_MISMATCH` 时，受信任客户端在网关返回重试提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）时，可使用缓存的设备令牌进行一次有界重试。
    - 该缓存令牌重试会复用与设备令牌一起存储的已批准作用域；显式传入 `deviceToken` / 显式 `scopes` 的调用者会保留其请求的作用域集合，而不是继承缓存作用域。
    - 在该重试路径之外，connect 认证优先级依次为：显式共享 token/password，其次显式 `deviceToken`，然后是已存储的 device token，最后是 bootstrap token。
    - 内置设置代码引导会返回一个带 `scopes: []` 的节点设备令牌，以及一个用于受信任移动端引导的有界操作员交接令牌。操作员交接可以读取设置时的原生配置，但不会授予配对变更作用域或 `operator.admin`。

    使固定：

    - 最快方式：`openclaw dashboard`（打印并复制控制面板 URL，尝试打开；在无头环境下会显示 SSH 提示）。
    - 还没有令牌：`openclaw doctor --generate-gateway-token`。
    - 远程：先通过 `ssh -N -L 18789:127.0.0.1:18789 user@host` 建立隧道，然后打开 `http://127.0.0.1:18789/`。
    - 共享机密模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后将匹配的机密粘贴到 Control UI 设置中。
    - Tailscale Serve 模式：确认已启用 `gateway.auth.allowTailscale`，并且你打开的是 Serve URL，而不是绕过 Tailscale 身份标头的原始 loopback/tailnet URL。
    - 受信任代理模式：确认你是通过配置的身份感知代理访问的。同主机 loopback 代理也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - Mismatch 在一次重试后仍然存在：rotate/re-approve 配对的设备令牌：
      ```bash
      openclaw devices list
      openclaw devices rotate --device <id> --role operator
      ```
    - 轮换被拒绝：配对设备会话只能轮换它们**自己的**设备，除非它们也拥有 `operator.admin`，且显式 `--scope` 值不能超过调用者当前的操作员作用域。
    - 仍然卡住：`openclaw status --all` 再加上[故障排查](/gateway/troubleshooting)。认证细节见[控制面板](/web/dashboard)。

  </Accordion>

  <Accordion id="i-set-gateway-bind-tailnet-but-it-listens-only-on-loopback" title="我设置了 gateway.bind tailnet 但它只监听环回">
    `tailnet` 绑定会从你的网络接口中选择一个 Tailscale IP（100.64.0.0/10）。如果机器不在 Tailscale 上（或接口已关闭），网关会回退到 loopback，而不是暴露另一个网络接口。

    修复：在该主机上启动 Tailscale 并重启网关，或者明确切换为 `gateway.bind: "loopback"` / `"lan"`。

    `tailnet` 是显式的；`auto` 优先选择 loopback。使用 `gateway.bind: "tailnet"` 可将非 loopback 暴露限制在 Tailnet 内，同时保留所需的同主机 `127.0.0.1` 监听。

  </Accordion>

  <Accordion id="can-i-run-multiple-gateways-on-the-same-host" title="我可以在同一主机上运行多个网关吗？">
    通常不行——一个网关可以运行多个消息通道和 agents。只有在需要冗余（例如一个救援 bot）或硬隔离时才使用多个网关，并且要为每个实例隔离各自的 `OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、`agents.defaults.workspace` 和唯一的 `gateway.port`。

    推荐：每个实例使用 `openclaw --profile <name> ...`（会自动创建 `~/.openclaw-<name>`），每个 profile 配置使用唯一的 `gateway.port`（或手动运行时使用 `--port`），并通过 `openclaw --profile <name> gateway install` 为每个 profile 安装独立服务。

    Profiles 也会作为服务名后缀：launchd `ai.openclaw.<profile>`、systemd `openclaw-gateway-<profile>.service`、Windows `OpenClaw Gateway (<profile>)`。未限定的 `openclaw-gateway` systemd 单元只存在于默认 profile；旧的、重命名前的 systemd 单元名 `clawdbot-gateway` 会自动迁移。

    完整指南：[多个网关](/gateway/multiple-gateways)。

  </Accordion>

  <Accordion id="what-does-invalid-handshake-code-1008-mean" title='“无效握手”/代码 1008 是什么意思？'>
    网关是一个 **WebSocket 服务器**，并且期望第一条消息是 `connect` 帧。任何其他内容都会以 **code 1008**（违反策略）关闭连接。

    常见原因：您在浏览器而不是 WS 客户端中打开了 **HTTP** URL，使用了错误的 port/path，或者 proxy/tunnel 剥离了身份验证标头或发送了非网关请求。

    修复：使用 WS URL（`ws://<host>:18789`，或通过 HTTPS 使用 `wss://...`），不要在普通浏览器标签页中打开 WS 端口，并在启用认证时在 `connect` 帧中包含 token/password。CLI/TUI 示例：

    ```bash
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议细节：[网关协议](/gateway/protocol)。

  </Accordion>
</AccordionGroup>
