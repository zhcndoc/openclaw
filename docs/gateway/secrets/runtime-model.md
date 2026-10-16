---
summary: "网关如何在运行时解析、注入和隔离机密"
read_when:
  - "了解所有者隔离、哨兵注入和代理访问边界"
  - "诊断非活动表面过滤或引导参考预检失败"
title: "Secrets 运行时模型"
---

本页介绍了机密在运行时的行为方式：所有者隔离、出口时哨兵注入、代理访问边界、活动表面过滤以及报告它们的预检诊断。

## <a id="runtime-model"></a> 运行时模型

- Secrets 在激活期间主动解析为内存中的运行时快照，而不是在请求路径上延迟解析。
- 当已知非网关所有者支持隔离时， 冷网关启动会将可重试的 SecretRef 故障隔离给该所有者。映射的所有者类包括模型提供者和技能、media/TTS/cron 提供者、合格的身份验证配置文件、每个代理内存、沙箱 SSH、通道帐户和清单声明的插件路由。网关启动，将所有者记录为配置不可用，并发出经过编辑的降级警告。网关入口身份验证、结构上无效的引用或解析值、需要启动才能在失败时停止的所有者以及运行时所有者未映射的引用仍然无法启动。
- 重新加载时，会分别验证每个已映射的所有者，然后发布一个原子快照。健康的所有者会刷新。符合条件的失败所有者会保留其最后已知的良好值；仅当其引用标识、提供商定义以及完整的非敏感信息所有者契约均未发生变化时，才会变为陈旧状态；发生变化或新增的失败所有者会变为冷状态。严格失败会拒绝重新加载，并保留当前活动快照。
- 当秘密提供者编辑更改解析的凭据时，Config 重新加载还会协调通道连接。支持帐户范围内重新加载的插件仅重新启动受影响的命名帐户；共享、默认、删除或未解决的帐户更改使用插件的全通道重启策略。冷帐户停止，符合条件的陈旧帐户继续使用其最后已知的良好凭据，并且恢复保留手动停止。
- 策略违规（例如 OAuth-mode 身份验证配置文件与 SecretRef 输入相结合）在运行时交换之前无法激活。
- Runtime 请求仅读取活动的内存快照。模型提供者 SecretRef 凭证作为进程本地哨兵通过身份验证存储和流选项，直到出口。出站传送路径（Discord reply/thread 传送、Telegram 操作发送）也会读取该快照，并且不会重新解析每次发送的引用。
- 只读通道能力发现独立评估账户。已配置但不可用的帐户不会隐藏健康的同级帐户的消息操作，而通过不可用帐户的直接发送仍会被阻止。

这可以让密钥提供商故障不影响热点请求路径。

网关入口保护、结构上无效的配置或解析值、策略违规和未知的所有权仍然会阻止启动或重新加载。孤立的所有者永远不会遇到优先级较低的凭证源。

当启动数据库准入标记代理不可用时，机密准备会忽略该确切数据库的身份验证存储，而不替换空的凭据存储。等待背景检查并不是秘密失败：准入所有者在准入代理之前解决并发布代理的凭据并准备其模型。成功准备后无需手动重新加载机密。检查失败和拒绝所有权仍然是冷藏店业主的维修指导。没有匹配的准入拒绝的不可读存储仍然无法准备；仅重新加载机密无法重新允许代理。

后台准备将保存的模型配置与运行时目录默认值分开保存，因此恢复不会禁用其他兼容的运行时选择，例如 Codex。

## <a id="egress-time-injection-(sentinels)"></a><a id="egress-time-injection-sentinels"></a> 出口时注入（哨兵值）

对于 SecretRefs 支持的模型提供者凭证，OpenClaw 在模型身份验证解析期间会创建一个不透明的进程本地哨兵。因此，身份验证存储、流选项、SDK 配置、日志、错误对象和大多数运行时自省会看到诸如 `oc-sent-v2.<authenticated-ciphertext>.end` 之类的值，而不是提供者凭据。受保护的模型获取和托管本地提供程序运行状况检查会在每个请求离开流程之前立即替换 URL 中的已知哨兵和标头值。

未知的哨兵形状值会在网络活动之前阻止请求。 OpenClaw 拒绝发送请求，而不是将未解析的哨兵转发给提供者。解析的秘密值也被注册用于精确值日志编辑，作为深度防御措施。

提供方适配器会使用其 SDK 所支持的最新注入点：

- 具有自定义提取选项的 SDK 接收 OpenClaw 的受保护提取，因此 SDK 保留哨兵。
- 没有自定义获取选项的 SDK 会在客户端构建之前立即解开哨兵。插件拥有的提供程序流和代理harness在最终核心拥有的切换时展开，因为这些传输不共享 OpenClaw 的受保护的获取。

哨兵值可减少模型调用链中的明文暴露，但它们并不等同于进程隔离。真实值仍然存在于同一进程内存中，并会出现在最终的适配器边界。未通过 SecretRefs 配置的普通环境变量凭据仍然是明文，并且不在此机制范围内。

设置 `OPENCLAW_SECRET_SENTINELS=off`（也接受 `0` 或 `false`，不区分大小写）以在事件响应或兼容性故障排除期间禁用模型提供者哨兵铸造。此开关既不会禁用网关托管子进程的精确值编辑注册，也不会禁用受保护存储密封。

## <a id="agent-access-boundary"></a> 代理访问边界

SecretRefs 阻止凭据保留在配置和生成的模型文件中，但它们不是进程隔离边界。留在磁盘上代理可以读取的路径中的明文凭证仍然可以通过文件或 shell 工具读取。工具结果和成绩单不会秘密掩盖该内容。

对于代理可访问文件纳入范围的生产部署，只有在满足以下所有条件时，才应视为迁移完成：

- 受支持的凭据使用 SecretRefs，而不是明文值。
- 已从 `openclaw.json`、SQLite 身份验证配置文件存储、`.env` 和生成的 `models.json` 文件中清除旧的明文残留。已弃用的身份验证 JSON 是由 doctor 管理的迁移输入，`secrets apply` 永远不会重写它。
- 迁移后，`openclaw secrets audit --check` 检查结果为干净。
- 任何剩余的不受支持或轮换的凭据均受 OS 隔离、容器隔离或外部凭据代理的保护。

这就是为什么 audit/configure/apply 工作流是一个安全迁移门禁，而不仅仅是一个便捷辅助工具。

<Warning>
SecretRefs 并不能让任意可读文件变得安全。备份、复制的配置、旧的生成模型目录，以及不受支持的凭据类型，在被删除、移出代理信任边界，或单独隔离之前，仍然属于生产密钥。
</Warning>

## <a id="active-surface-filtering"></a> 活动表面过滤

SecretRefs 仅在实际上处于活动状态的表面上进行验证：

- **启用的表面**：映射的可重试故障，可隔离所有者进入冷或陈旧降级。严格故障、必须停止启动的故障、需要网关的故障和未映射的故障会阻止 startup/reload.
- **非活动表面**：未解析的参考不会阻止startup/reload；它们发出非致命的 `SECRETS_REF_IGNORED_INACTIVE_SURFACE` 诊断。

通道热重启还会跳过禁用的空闲帐户的凭据准备。在被禁用之前正在运行的帐户仍会使用其承认的运行时凭据进行清理。

<Accordion id="examples-of-inactive-surfaces" title="非活动表面的示例">
- 禁用 channel/account 条目。
- 已禁用的通道/账户条目。
- 禁用 tool/feature 曲面。
- 未被 `tools.web.search.provider` 选中的 Web 搜索提供方特定密钥。在自动模式（未设置 provider）下，会按优先级轮询这些密钥进行自动检测，直到某个密钥解析成功；选定后，未被选中的提供方密钥即为非活动状态。
- Sandbox SSH 认证材料（`agents.defaults.sandbox.ssh.identityData`、`certificateData`、`knownHostsData`，以及每个 agent 的覆盖项）仅在有效的 sandbox 后端为 `ssh` 且 sandbox 模式不是 `off` 时才处于活动状态，适用于默认 agent 或已启用的 agent。
- `gateway.remote.token` / `gateway.remote.password` SecretRefs 在满足以下任一条件时处于活动状态：
  - `gateway.mode=remote`
  - 已配置 `gateway.remote.url`
  - `gateway.tailscale.mode` 为 `serve` 或 `funnel`
  - 在没有这些远程表面的本地模式下：当令牌身份验证可以获胜且未配置 env/auth 令牌时，`gateway.remote.token` 处于活动状态； `gateway.remote.password`仅在密码认证成功且未配置env/auth密码时才有效。
- 活动的 `gateway.auth.token` / `gateway.auth.password` SecretRefs 的权威性高于 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`；当相应的本地配置输入缺失时，环境凭据才作为后备。

</Accordion>

## <a id="gateway-auth-surface-diagnostics"></a> Gateway 认证表面诊断

当在 `gateway.auth.token`、`gateway.auth.password`、`gateway.remote.token` 或 `gateway.remote.password` 上设置 SecretRef 时，网关 startup/reload 将在代码 `SECRETS_GATEWAY_AUTH_SURFACE` 下记录表面状态：

- `active`：该 SecretRef 是有效认证表面的一部分，且必须能够解析。
- `inactive`：另一个身份验证表面获胜，或者远程身份验证 disabled/not 处于活动状态。

日志条目包含所使用的 active-surface 策略原因。

## <a id="onboarding-reference-preflight"></a> 入门引用预检

在交互式入门过程中，选择 SecretRef 存储会在保存前运行预检验证：

- 环境变量引用：验证环境变量名称，并确认设置期间可见的值非空。
- 提供商引用（`file`、`exec` 或 `store`）：验证提供商选择，解析 `id`，并检查解析后的值类型。
- 快速启动流程：当 `gateway.auth.token` 已经是 SecretRef 时，载入会在 check/dashboard 引导之前解决它（对于 `env`、`file`、`exec` 和 `store` 参考）使用相同的快速失败门。
- 生成的网关令牌：设置本身会铸造`gateway.auth.token`，因此参考模式没有任何提示。导出 `OPENCLAW_GATEWAY_TOKEN` 后，它会向该变量写入 `env` 引用，从而保持以后的旋转权威；否则，它将令牌写入 `OPENCLAW_GATEWAY_TOKEN` 下的秘密存储并存储 `store` 引用。现有的商店条目将被重用而不是轮换，因此重新运行设置永远不会使已配对的客户端失效。

验证失败时会显示错误，并允许你重试。
