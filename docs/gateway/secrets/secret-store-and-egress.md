---
summary: "共享秘密存储、默认关闭的秘密出口代理和文件支持的 API 密钥"
read_when:
  - "将团队范围的秘密和环境值存储在共享秘密存储中"
  - "启用目标绑定的秘密出口代理或其流量白名单"
  - "使用主机上保存的已配置模型凭据运行 Crabbox 应用程序"
title: "共享秘密存储和出口代理"
---

此页面涵盖共享秘密存储、默认关闭的秘密出口代理及其流量允许列表以及文件支持的 API 密钥。

## <a id="shared-secret-store"></a> 共享密钥存储

共享秘密存储是网关范围内、团队范围内的位置，用于存储拥有状态目录的网关的秘密和环境值。从 Control UI 中的 **Settings → Secrets** 或在本地使用 `openclaw secrets store` 进行管理。 CLI 通过该本地网关写入路由，或在其停止时获取独占离线所有权。这些命令不接受网关 URL 或令牌选项。

条目有两种显式访问模式。两者都保留现有的 `secret` 和 `env` 存储类型，并且任一类型都可以支持 SecretRef：

- **受保护的秘密** （`kind: "secret"`）值在保存后是只写的。网关列表结果、Control UI 和 CLI list/get 输出从不包含它们；没有透露RPC。受保护的值是惰性的，直到受支持的配置字段通过 SecretRef 引用它，或者启用的目标绑定 [ 秘密出口代理 ](#secret-egress-proxy) 使用它。
- **代理可读环境** （`kind: "env"`） 值对 Control UI 中的管理员保持可见，并且可由 `store list` 和 `store get` 返回。 OpenClaw 将它们作为明文添加到通过其执行工具运行的网关托管命令中，在继承的过程值之后和显式的每次调用环境之前。代理可以打印、传输或保留这些值。受保护的主机密钥将被忽略，并显示可见警告。

代理可读的环境值不会到达 Codex 本机 shell、Codex 沙箱执行服务器、ACP 子项（例如 Claude Code、OpenClaw 沙箱执行程序或远程 `node` 执行程序）。这些路径组装了不同的儿童环境。在符合条件的Codex应用服务器轮流中，使用`gateway_exec`故意重新进入OpenClaw网关执行路径； `gateway_process` 提供现有的每会话后台跟踪。原生 Codex shell 仍然是普通本地工作的首选。网关托管的 exec 在运行中第一次执行时捕获存储快照。后期的添加、替换、删除、主机编辑都需要重新运行；存储凭证不会刷新已捕获的执行快照。

默认情况下，`secret` 条目永远不会注入到子进程环境中。当启用默认关闭的 [ 秘密出口代理 ](#secret-egress-proxy) 时，网关托管的 exec 命令接收进程本地标记而不是纯文本值。

名称使用与 env SecretRefs 相同的大写语法，每个 UTF-8 值限制为 64 KiB（65,536 字节）。存储保留提交的空格和换行符。 `secret` 条目必须携带一个值；空秘密会被拒绝，因为它们只会作为令人困惑的下游身份验证失败而出现。 `env` 条目可能为空。这支持 PEM 密钥和服务帐户 JSON，而无需继承普通环境变量的较小限制。

Exec 通过共享状态读取工作线程捕获其快照。所选条目、名称和主机元数据的读取预算为 32 MiB；过大的快照会明显失败，而不是注入部分环境。商店支持的 SecretRefs 也读取了该工作人员。两个读取器都不会创建丢失的存储或表。

使用 `store` 源引用 `openclaw.json` 中的条目：

```json5
{
  models: {
    providers: {
      openai: {
        apiKey: { source: "store", provider: "default", id: "OPENAI_API_KEY" },
      },
    },
  },
}
```

当活动源配置或身份验证配置文件快照中的 `store` SecretRef 引用更改的名称时，Control UI 突变和路由 CLI 写入会自动刷新活动机密运行时。未引用的名称会跳过该工作。网关启动时会加载离线 CLI 更改。如果在线写入成功但运行时刷新失败，则错误报告已保存的更改；解决提供程序错误并运行 `openclaw secrets reload`。

代理还可以要求您使用 [`secrets` 工具 ](/tools/secrets) 添加条目：它命名条目和原因，您在屏蔽提示中键入值，网关将其直接写入存储中。该值永远不会进入聊天、记录或模型的上下文，并且应用相同的自动运行时刷新。

凭据提示与确切的请求机构绑定，并在其关闭时取消。即使后续运行时刷新失败，提交的答案也是终端。保存的值仍然存在；解决提供程序错误并重试 `openclaw secrets reload`，而不是答案。使用该工具返回的完整 SecretRef，包括其提供者别名。

<Warning>
存储值不会在静态存储时加密。它们以未加密形式存储在共享状态 SQLite 数据库（`state/openclaw.sqlite`）中，并通过与该数据库中其他凭据相同的 `0600` 文件和 `0700` 目录权限进行保护。需要更强存储隔离的操作员应使用外部 exec provider，例如 [1Password plugin](/plugins/onepassword) 或 [Vault SecretRefs](/plugins/vault)。
</Warning>

## <a id="secret-egress-proxy"></a> 秘密出口代理

秘密出口代理允许网关托管的代理子进程使用共享存储 `secret` 条目，而无需接收其明文。 OpenClaw 将现有的经过身份验证的哨兵放入子进程环境中，然后网关拥有的环回代理在出口之前立即在请求 URL、标头和流式主体中替换它。

侦听器在拥有 TLS、证书准备、替换和转发的专用网关工作器中运行。请求和响应字节远离网关的主事件循环。网关与该工作人员交换进程授权和证书健康状况；撤销会在连接关闭之前立即隔离该授权。失败的工作线程会关闭受保护的出口并需要重新启动网关。

每个机密还必须命名允许替换的确切 HTTPS 主机。主机名以 ASCII/punycode 形式小写存储并完全匹配；不支持通配符、后缀匹配和端口。没有允许的主机的秘密永远不会被替换。绑定主机而不替换存储的值：

```bash
openclaw secrets store set OPENAI_API_KEY --allow-host api.openai.com
```

重复 `--allow-host` 以替换与多个主机的绑定，或使用 `--clear-allowed-hosts` 删除每个绑定。被拒绝的请求会命名秘密并打印该目标所需的确切 `store set ... --allow-host ...` 命令。

显式启用它，然后重新启动网关：

```bash
openclaw config set secrets.egressProxy.enabled true --strict-json
openclaw gateway restart
```

例如，将 OpenAI 密钥绑定到其 API 主机并启用代理：

```bash
openclaw secrets store set OPENAI_API_KEY --allow-host api.openai.com
openclaw config set secrets.egressProxy.enabled true --strict-json
```

重新启动网关后，网关托管的代理可以运行：

```bash
curl -sS https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

在代理环境中，`$OPENAI_API_KEY` 是 `oc-sent-v2...end` 哨兵。代理仅将其替换为 `api.openai.com` 的存储值。对未绑定主机的请求被拒绝，并显示 `Secret "OPENAI_API_KEY" is not allowed for host "<host>". Run: openclaw secrets store set OPENAI_API_KEY --allow-host <host>`。

等效配置：

```json5
{
  secrets: {
    egressProxy: {
      enabled: true,
      allowedHosts: ["api.openai.com"],
      bypassHosts: ["pinned-api.example.com"],
    },
  },
}
```

启用后，OpenClaw 将这些值添加到网关托管的执行环境中：

- `HTTPS_PROXY` 和 `HTTP_PROXY`，环回代理 URL 中嵌入了每个进程的凭据
- `NODE_USE_ENV_PROXY=1`，这使得受支持的 Node.js 全球 `fetch` 客户端在不使用 `NODE_OPTIONS` 的情况下荣誉 `HTTP_PROXY` 和 `HTTPS_PROXY`
- `NODE_EXTRA_CA_CERTS`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`REQUESTS_CA_BUNDLE` 和 `GIT_SSL_CAINFO`，指向网关的可信证书包
- each 团队存储 `secret` 条目作为 `oc-sent-v2...end` 哨兵； `env` 条目保留其现有行为和优先级

代理身份验证使用标准基本代理身份验证，并为每个托管执行进程使用用户名 `openclaw` 和随机密码。 OpenClaw 在批准和启动检查后创建拨款。当发起代理轮次结束时，后台命令保留其授权；它的进程管理器拥有执行和代理访问权。 Base64 不被视为加密：侦听器仅绑定到环回，并且可以从代理环境读取代理令牌的进程已经可以读取该环境中的哨兵。丢失、错误或撤销的凭据将收到 `407 Proxy Authentication Required`，并且永远不会转发。

起源 HTTP 也支持基本身份验证：客户端可以在其用户名或密码中编码哨兵，例如 `curl --user "user:$REGISTRY_TOKEN"`。代理仅验证和解码源 `Authorization: Basic ...` 凭据，检查每个哨兵的注册目标绑定、替换并重新编码它们。普通基本标头原封不动地转发。它不会解码其他 Base64 标头或正文，并且 `Proxy-Authorization` 仅保留代理身份验证，并在转发之前将其删除。未知、被篡改或目标被拒绝的哨兵无法关闭。代理不遵循重定向；每个重定向的请求必须独立地通过目标授权。

进程退出、启动失败、取消和超时会撤销该进程的授予并拆除其代理连接、上游请求和旁路隧道。取消会在本机进程终止之前撤销访问权限。停止一个命令不会撤销同级命令的授权。网关关闭会撤销所有授权；重新启动需要启动新命令。新的授权不能恢复已撤销的连接或绑定。在撤销之前已经交给上游传输的字节不能被撤回。

每个进程都会收到所属运行的秘密快照的固定副本，包括每个哨兵的秘密名称和允许的主机。后续命令无法更改现有进程的授权。代理身份验证后，代理会在该进程的注册中查找匹配的哨兵，并在解密哨兵之前授权规范化的目标主机名。未注册、未解析、未绑定或绑定到其他主机的哨兵在其明文转发之前会被拒绝。

<Warning>
目标绑定不会使允许的主机变得值得信赖。反映请求凭据的绑定服务仍然可以将明文返回给代理。 DNS-level 妥协可以重定向允许的主机名，因为策略是基于主机名的，而不是 IP pin。非 HTTPS 请求将被拒绝而不是受到保护，除了到文字环回目标的普通 HTTP 请求之外，代理根据其流量策略转发这些请求而不替换机密。 HTTPS 拦截仍具有以下协议限制。当这些威胁在范围内时，使用外部网络策略或进程隔离。
</Warning>

CA 在每次网关启动时在状态目录下生成一次，证书有效期为十年。它的密钥仍然是流程拥有的，不保留十年。代理跨命令重复使用最多 128 个主机名证书，同时保持每个命令的 TLS 连接和秘密绑定分开。该缓存属于进程 CA，并在关闭时被清除。一日叶证书在最后一小时内按需续订，无需更换 CA 或中断已建立的 TLS 连接。这使得已经运行的子流程在续订过程中信任同一发行者。它的目录模式为 `0700`，其私钥模式为 `0600`，它在网关关闭期间被删除，并且 OpenClaw 永远不会将其安装在系统信任存储中。当无法验证或解析哨兵时，请求将被拒绝；代理永远不会转发或默默地删除未解决的哨兵。请求主体被扫描为具有有限进位窗口的流，因此当哨兵跨越块边界或出现在大型上传中时，替换也可以工作。

`openclaw status` 和 `openclaw doctor` 报告证书准备失败，并在进程 CA 到期后 7 天内发出警告。失败的准备拒绝新的 CONNECT 请求，并出现可操作错误；下一个请求可以在 OpenSSL、文件系统访问或时钟问题得到纠正后重试。过期或尚未生效的 CA 需要检查系统时钟并重新启动网关，而不是禁用 TLS 验证。当受保护的出口降级时，网关 RPC 可以保持可达。对于只读、机器可读的检查，请运行 `openclaw doctor --lint --only core/doctor/gateway-health --json`；默认 JSON 检查不检查正在运行的网关。

生成的证书包括严格的 TLS 客户端所需的密钥标识符，包括 Python 3.13 及更高版本，以及 OpenSSL 或 macOS LibreSSL。更新后，重新启动网关以生成新进程 CA 并启动新命令来加载新的信任包。

对于有效 `Content-Length` 最多为 100 MiB 的 HTTP 请求，代理会在一个进程内存缓冲区中收集原始字节。然后，它检查当前目标和哨兵绑定，就地替换，并向上游发送测量的字节长度。这保留了固定长度的二进制上传，而不为每个传入块保留一个对象。 Sentinel 替代品无法扩大身体；没有 MIME 类型免于扫描，并且不会写入请求正文临时文件。

每个代理在命令之间共享 128 MiB 预留预算，收取声明的正文长度加上 256 KiB 的每个请求净空，最多准备或发送 64 个缓冲上传。这限制了分阶段的有效负载和请求计数，而不是总进程 RSS。繁忙的代理拒绝使用 `503` 进行额外的缓冲上传；正在进行的请求完成后重试。每个缓冲上传都有五分钟的 preparation/send 截止时间，包括上游连接设置。超时、取消、授权撤销和传输失败会释放其资源。收集时不会打开上游连接，转发审核会记录上游发送完成情况而不是缓冲区准备情况。

100 MiB 信封是每个请求的暂存限制，而不是目标上传大小限制。较大的请求和未知长度的请求通过分块帧和背压保持流式传输；需要 `Content-Length` 的目标仍然可以拒绝这些请求。已经交给上游传输的字节不能被撤回。

`bypassHosts` 包含对于证书固定客户端必须保持端到端 TLS 的确切主机名。这些主机使用经过身份验证的盲 CONNECT 隧道。隧道内不可替换；发送到那里的哨兵在构造上是安全的，因为它是经过身份验证的密文而不是凭证，因此供应商会看到无效凭证并拒绝它。

### <a id="traffic-allowlist"></a> 流量白名单

目标绑定保护秘密，而不是流量：一旦命令持有代理凭据，不携带哨兵的请求就可以到达任何主机。设置 `secrets.egressProxy.allowedHosts` 来限制非哨兵流量的去向：

```bash
openclaw config set secrets.egressProxy.allowedHosts '["api.openai.com"]' --strict-json
```

当列表存在时，代理仅转发到列表中的主机名、绑定到为请求进程注册的密钥的主机以及 `bypassHosts`，因此现有的 `--allow-host` 绑定可以继续工作，而无需两次列出其主机。到任何其他主机的请求或 CONNECT 隧道被拒绝，并显示 `Host "<host>" is not in the secret egress proxy traffic allowlist. Add it to secrets.egressProxy.allowedHosts or bind a store secret to it with: openclaw secrets store set <NAME> --allow-host <host>, then restart the Gateway.`

空阵列是锁定模式：只有每个秘密绑定的主机和 `bypassHosts` 保持可达。省略 `allowedHosts` 将使流量不受限制。主机名遵循与秘密绑定相同的规则：小写 ASCII/punycode 完全匹配，没有通配符或端口。更改允许列表后重新启动网关。

当前限制：

- 流量允许列表仅限制遵守代理环境的合作客户端（`HTTPS_PROXY` 和 CA 变量）。子进程可以忽略这些变量并打开原始套接字，因此白名单是深度防御；目标绑定的哨兵仍然是主要防御，因为它们能够幸免于代理绕过。
- 不支持HTTP/2上行连接；代理使用 HTTP/1.1 上游。
- WebSocket 升级支持握手 URL 和标头中的秘密替换。消息帧不变地通过； WebSocket 消息中的哨兵不会被替换。
- Non-443 HTTPS 替换不是受支持的兼容性目标。
- 不支持身份范围的机密；只有团队商店参与。
- Allowed-host 策略仅是精确主机名授权。它不会验证已解析的 IP 或阻止允许的来源反映凭据。
- Plain HTTP 会被拒绝，但对文字环回目标（`localhost`、`127.0.0.0/8` 或 `::1`）的直接代理请求除外。这些请求保留在代理身份验证、流量白名单、审核和上传限制之下。 DNS 答案不符合此例外的其他主机名。携带秘密哨兵的环回HTTP请求仍然被拒绝；秘密永远不会替换为明文 HTTP。
- 自动共享存储秘密出口仅适用于网关托管的执行程序。沙箱和远程 `node` exec 既不接收代理变量也不接收标记，因此共享存储 `secret` 条目在那里不可用。提供者本机harness子流程也不使用此代理。下面的显式 Crabbox 命令单独授予配置的模型凭据。
- 后台子进程保留其原始秘密快照，直到退出或停止。对存储的凭据或目标绑定的更改需要新的运行和新的命令；停止现有命令以立即撤销其旧授权。

## <a id="job-scoped-setup-grants"></a> 工作范围的设置补助金

官方插件可以通过在 `openclaw/plugin-sdk/secret-egress-runtime` 中显式选择共享存储 SecretRefs 到 `withSetupSecretEgress` 来准备一项作业。此功能仅读取一个一致的读取工作线程快照中的命名 `kind: "secret"` 条目及其允许的主机绑定。不加载或注册不相关的机密和代理可读的 `env` 条目。在启动作业之前，缺失或非秘密选择失败；对存储的更改适用于下一个作业的快照。

云工作人员配置文件使用 `settings.setupSecrets`（用于存储 SecretRefs 的 POSIX 环境名称的有界映射）选择这些作业。只有具有确切目标绑定的受保护条目才符合资格。已提交的开发容器 `secrets` 属性请求此批准的地图中的名称；它不能选择另一个商店条目或授予目标。在运行存储库命令之前，会一起报告缺少的映射。请参见[云环境文件](/gateway/cloud-workers/environment-file)。

配置文件设置、准备和后期 create/start 在工作人员拥有的协调器 Linux 租赁上使用 Crabbox 原生 `egress run`。 Crabbox 0.77.0 或更新版本允许普通 HTTPS 包下载的公共目标，而网关仅在该秘密的绑定主机上替换每个哨兵。此作业不需要 `secrets.egressProxy.enabled`。不支持的租约、不可用的帮助程序或代理服务以及旧的 CLI 会在存储库代码之前出现修复指导失败。公开的工作保留其现有的交通工具。受保护的设置仅导出 HTTPS 代理设置并取消设置继承的 `HTTP_PROXY` 和 `http_proxy` 值。普通 HTTP 下载直接从租约中进行，并且永远不会收到替代的秘密。

该作业接收远程哨兵环境值和公共 CA 捆绑包内容。其经过身份验证的上游代理环境仅属于拥有凭据的主机，而不属于远程环境或快照。主桥提供远程代理和 CA 设置。设置和模型作业共享相同的工作人员拥有的授权生命周期：取消会在进程终止之前同步撤销访问权限，完成或失败会撤销授权、停止代理并删除临时 CA 文件。请参阅 [SDK 运行时合约 ](/plugins/sdk-runtime#setup-secret-egress)。

设置机密不再禁用快照。兼容性记录使用排序的环境名称并存储具有受保护出口标识的引用，而不是值或哨兵字节。 Capture 会删除运行者拥有的 CA 文件和 Crabbox 命令暂存。不保留运行者生成的凭证配置；存储库配置仍归存储库所有。旧版 `setupEnv` 需要 Doctor 对现有绑定存储条目进行修复；该迁移永远不会转发或重写值。

## <a id="model-credentials-for-crabbox-commands"></a> Crabbox 命令的模型凭证

Crabbox 插件允许 Linux 租约中的前台应用程序使用主机上保存的凭证调用 OpenAI- 兼容的 API。云代理已经在网关上保留了自己的推理和提供商身份验证；该命令适用于应用程序本身进行的 API 调用。

### <a id="requirements"></a> 要求

从拥有租约的本地项目目录，在拥有已配置凭据的主机上运行命令。使用独占的、协调器支持的 Linux 租约，并配置 Crabbox 登录且没有活动的出口会话。 Crabbox 二进制文件必须支持 `egress run` 和 `--upstream-proxy-env`；该命令在读取凭据之前检查支持。使用 `--binary <path>` 选择另一个二进制文件。

所选提供商必须在 `models.providers.<provider>.apiKey` 中使用 API- 密钥 SecretRef。文件、环境、exec 和共享存储 SecretRefs 使用现有解析器，而不将凭证复制到另一个存储中。该模型必须解析为在端口 443 上具有 HTTPS 端点的 `openai-responses` 或 `openai-completions` 路由。端点 URL 不能包含凭据、查询或片段。不支持身份验证配置文件和 OAuth 凭据、自定义标头、请求 proxy/TLS 覆盖、禁用的身份验证标头和本地服务配置。

### <a id="prepare-and-run"></a> 准备并运行

首先通过正常的 Crabbox 工作流程同步文件、水合工作区并安装依赖项。模型命令传递 `--no-sync --no-hydrate`，因此它使用准备好的工作区，并且无法通过其仅模型主机桥获取依赖项。保留相同的本地项目目录以进行准备和执行：`--id` 选择租约，但不会覆盖 Crabbox 的存储库声明或工作区选择。

对于现有租约和配置的 OpenAI SecretRef，此示例检查 `curl` 是否可用，然后发出响应 API 请求而不读取密钥：

```bash
cd ~/path/to/project
crabbox run --id <lease-id> -- curl --version
openclaw crabbox run --id <lease-id> --model openai/gpt-5.6-sol -- sh -c '
  curl --fail-with-body --silent --show-error "${OPENAI_BASE_URL%/}/responses" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    --data "{\"model\":\"$OPENAI_MODEL\",\"input\":\"Reply with OK.\"}"
'
```

成功返回提供者的响应 JSON。将 `sh -c ...` 替换为您的应用程序命令，例如 `node test-app.js`。使用适合已配置路由的端点；仅完成提供者需要其匹配的 API 调用。 `--provider <backend>` 选择 Crabbox 后端，而 `--model` 选择模型提供者。 `--timeout <seconds>` 将设置和执行限制在一起（1–86400 秒，默认 600）。取消和超时会立即撤销凭证访问权限，并给 Crabbox 75 秒的时间进行正常清理。

OpenClaw 解析所选模型的已配置或提供商拥有的 API 端点，并启动隔离的秘密代理。 Crabbox 的原生 `egress run` 拥有前台桥接器、远程命令和会话清理功能。 OpenClaw 提供 `OPENAI_API_KEY` 作为不透明哨兵、`OPENAI_BASE_URL` 和 `OPENAI_MODEL`，以及 HTTP 代理设置和临时公共 CA 捆绑包。 API 密钥、上游代理身份验证和 CA 私钥保留在主机上。网桥仅允许选定的主机名；这不会阻止程序打开直接套接字。模型选择设置应用程序的默认环​​境，而不是对提供者凭证的 API 操作或模型的限制。

应用程序的 HTTP 客户端必须遵守代理和 CA 设置。 `curl` 和 Python 的默认 `urllib.request` 开启器使用注入环境。对于 Node.js，请将支持 `NODE_USE_ENV_PROXY` 的运行时（例如 Node.js 24+）与 `NODE_EXTRA_CA_CERTS` 结合使用。自定义 Node 调度程序、Python 开启程序或 SDK 客户端可以覆盖这些默认值；如果需要，显式配置其代理并信任。禁用证书验证或忽略代理不会建立受保护模型访问。

### <a id="lifetime-and-recovery"></a> 寿命和恢复

在命令清理解决之前，取消和超时会立即撤销凭证的使用。完成后将关闭授权和桥接并停止匹配的租赁方出口客户端。租约和准备好的工作空间仍然可用。在整个应用程序生命周期中保持前台命令运行；分离的应用程序退出时会失去模型访问权限。普通远程 `exec`、`background` 和沙箱命令不会获得此授权。

旧的二进制文件被拒绝并显示更新消息。活动出口错误需要空闲租约或停止您拥有的现有会话。存储库声明错误意味着您必须返回到租约所属的本地项目目录。请勿收回其他工作的租约来绕过任何一项检查。

如果清理无法确认结算，则命令失败。检查 `crabbox egress status --id <lease-id>`，当失败的命令报告会话 ID 时，对该会话重试 `crabbox egress stop --id <lease-id> --session <egress-session-id>`。在重新使用租约之前，还要确认远程工作负载已停止，或者通过其正常所有者释放一次性租约。撤销并不能证明无法访问的远程进程已经退出。

此独立命令不需要 `secrets.egressProxy.enabled`、更改网关配置或重新启动网关。完成或取消命令后，启动新命令以获得新的授权；其旧哨兵和 CA 文件不是可重复使用的凭据。

## <a id="file-backed-api-keys"></a> 文件支持的 API 密钥

不要将 `file:...` 字符串放入配置 `env` 块中。该块是字面的且非重写的，因此 `file:...` 永远不会在那里解析。

请改为在受支持的凭据字段上使用文件类型的 SecretRef：

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

对于 `mode: "singleValue"`，SecretRef 的 `id` 是 `"value"`。对于 `mode: "json"`，请使用绝对 JSON Pointer，例如 `"/providers/xai/apiKey"`。

有关接受 SecretRefs 的字段，请参阅 [SecretRef 凭证 Surface](/reference/secretref-credential-surface)。
