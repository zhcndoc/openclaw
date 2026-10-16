---
doc-schema-version: 1
summary: "外部管理的配对工作主机上的工作推断"
title: "工人本地推理"
read_when:
  - "在外部管理的机器上托管专用的本机工作人员"
  - "通过外部凭证托管人路由工作人员提供者请求"
---

# <a id="worker-local-inference"></a> Worker-本地推理

Worker 通常通过网关转发代理模型请求。配置的配对设备配置文件可以选择 **worker inference**，使用相同的准入、转向声明、本地编码工具、转录提交、实时事件和节点主管。没有单独的运行时服务器或网络协议。

您的平台拥有主机、容器或 Pod 及其修订版。内置`device`提供者采用配对节点并释放逻辑租约；它不会创建、替换或删除平台工作负载。主管仍然拥有其子级工人和管理的工作空间。每个信任边界使用专用节点帐户。工作空间授权不是操作系统沙箱：代码运行时该帐户具有其正常的文件系统和进程访问权限。

## <a id="deployment-and-credential-trust-contract"></a> 部署和凭证信任合约

将受信任的 OpenClaw 网关置于不受信任的工作负载之外。配对节点及其工作线程运行本机循环和编码工具；它们不是作为同一操作系统用户运行的代码的凭证隔离边界。此类代码可以访问启动文件、环境和进程内存。私有启动管道和输出编辑不会更改该信任边界。

对于此部署，外部凭证保管人或提供商代理必须在工作负载之外保存实际的提供商密钥。配置节点的模型端点以访问该服务，并仅将服务的范围内的、不透明的身份验证值提供到节点中。 OpenClaw 通过所选的提供者适配器传递这些值；它不会将它们解释为提供者密钥、将它们解析为密钥或实现托管人。本机提供程序操作使用自己的传输策略，而不是网关的进程本地秘密标记解释或受保护的 fetch/SSRF 策略，包括嵌入式循环导入网关帮助程序时的情况。网关请求保留其现有策略。因此，所配置的端点和工作负载出口限制是部署信任决策。本机提供程序请求需要 HTTPS，保留在配置的端点源上，并拒绝所有重定向，包括同源重定向。配置最终端点 URL。普通 HTTP 仅允许用于文字环回 IP 地址（不是 DNS 名称，例如 localhost），用于可信的同一主机跃点或隔离线证明。该异常不是外部凭证隔离边界。正常 TLS 证书和主机名验证保持启用状态。适配器特定的身份验证帧和 HTTP 标头规则仍然适用。不要在节点或工作线程上提供实际的提供者密钥。

启动时检查传输策略以及指定的 auth 值是否存在；它无法区分原始提供者密钥和不透明令牌、证明托管人或强制执行工作负载的操作系统出口限制。任何非空命名值都将满足凭证存在的要求。仅经纪人托管规则是部署要求，而不是声称 OpenClaw 在技术上验证密钥来源。

该部署拥有网关和托管人、工作负载出口、端点信任、令牌发行、范围、到期、撤销和提供者凭证轮换的隔离。任何能够读取工作负载令牌的人都可以行使其外部授予的权限。 OpenClaw workspace/model 授予、转向取消和输出编辑补充部署策略；它们不会撤销公开的令牌或替换外部授权。该外部服务的配置和实时认证不属于该核心功能的范围。

## <a id="provision-the-node"></a> 配置节点

Windows 工人本地推断被推迟。 Windows节点不通告此能力；在那里使用网关推理。现有网关代理工作人员保留其当前行为。 Windows 支持需要单独的、选择加入的凭证传输实现和本机验证。

安装匹配的网关和节点版本并正常配对节点。将外部托管人的不透明身份验证值放入节点服务的配置启动环境中，而不是网关配置或配置文件设置中。通过 **node's** `openclaw.json` 中熟悉的顶级 `models.providers` 字段配置端点和模型目录，然后启用工作线程托管：

```json5
{
  models: {
    providers: {
      openai: {
        api: "openai-completions",
        baseUrl: "https://credential-proxy.example.test/v1",
        apiKey: "${WORKER_PROXY_AUTH}",
        models: [
          {
            id: "worker-model",
            name: "Worker model",
            contextWindow: 32768,
            maxTokens: 4096,
            reasoning: true,
            thinkingLevelMap: { low: "low", high: "high" },
            input: ["text", "image"],
            cost: { input: 2, output: 8, cacheRead: 1, cacheWrite: 2 },
          },
        ],
      },
    },
  },
  nodeHost: {
    workerRuns: {
      enabled: true,
      capacity: 1,
      isolation: "none",
    },
  },
}
```

外部平台可以在容器内运行节点。本地推理不支持 OpenClaw 的附加嵌套容器工作模式。保持节点配置和服务环境只能由服务帐户读取。对于受信任的私有代理 CA，通过节点服务的 `NODE_EXTRA_CA_CERTS` 提供只读 CA 捆绑包，或使用其 `NODE_USE_SYSTEM_CA` 设置。现有的工作环境保留这些设置；它不继承 `NODE_OPTIONS` 或通用 `HTTP_PROXY` / `HTTPS_PROXY` 变量。将兼容代理端点显式配置为 `baseUrl`，并且切勿禁用证书验证。

将端点替换为外部托管人的兼容 API 并使用其模型元数据。价格为每百万代币。 `apiKey` 使用与普通 OpenClaw 模型配置相同的文字、环境插值以及支持的 SecretRef 形式；提供外部范围的代理值而不是原始提供者密钥。可选的提供程序和模型 `headers` 也是节点本地启动值。所有配置的标头值都受到保守保护，免受工作器诊断和协议输出的影响。

`models.providers` 下具有可用凭证的每个兼容模型均可用于此节点上的工作本地启动。没有第二个 workspace/model 许可名单。主管将准确承认的工作空间投影到每个子节点中，节点和工作节点都检查其规范化身份。模型配置不会从工作区、轮次请求、网关身份验证配置文件或 dotenv 文件加载。

节点在启动时对其保存的模型配置和解析的身份验证值进行快照。轮换需要在整个平台生命周期内进行受控的 node/worker 更换；它不会改变正在运行的快照。在工具执行之前删除私有启动载体是为了避免意外继承，而不是将其与同一用户代码隔离。工作区准备、存储库设置和不相关的代理工作人员不会继承它。

## <a id="select-the-placement-on-the-gateway"></a> 选择网关上的位置

使用配对设备 ID 配置显式设备配置文件：

```json5
{
  models: {
    providers: {
      openai: {
        api: "openai-completions",
        models: [
          {
            id: "worker-model",
            name: "Worker model",
            contextWindow: 32768,
            maxTokens: 4096,
            reasoning: true,
            thinkingLevelMap: { low: "low", high: "high" },
            input: ["text", "image"],
            cost: { input: 2, output: 8, cacheRead: 1, cacheWrite: 2 },
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "openai/worker-model" },
      models: { "openai/worker-model": { agentRuntime: { id: "openclaw" } } },
    },
    entries: { assistant: {} },
  },
  cloudWorkers: {
    profiles: {
      "dedicated-native": {
        provider: "device",
        settings: {
          device: "PAIRED_DEVICE_ID",
          inference: "worker",
        },
      },
    },
  },
}
```

网关副本为此自定义模型引用提供运行时元数据，以便它可以授权选择并准备工具。使这些功能与节点定义保持一致，但仅在节点配置中保留 `baseUrl`、`apiKey` 和秘密 `headers`。网关目录中已存在的模型不需要此附加元数据条目。

### <a id="make-the-dedicated-worker-mandatory"></a> 强制实行敬业工人

要要求此工人执行 OpenClaw 轮次，请在上例中将 `requiredProfile: "dedicated-native"` 与 `cloudWorkers.profiles` 一起添加。有关准入、权限、空工作区和现有会话行为，请参阅 [ 必需的工作人员配置文件 ](/gateway/config-cloud-workers#required-worker-profile)。配置的代理模型保持默认。

在允许聊天之前配置配对节点和本机注册表。注册可以在所需的配置文件可用之前开始，但在该配置文件丢失、不可用或准备时聊天仍会被阻止。不要将提供商凭据复制到网关来解决放置错误。重试并停止使用保留的会话和放置；初始消息恢复永远不会回退到网关执行。

对于下面由管理员选择的可选流程，请保留 `requiredProfile` 未设置。

可选配置文件仅路由其绑定的会话轮次。无会话助手（包括活动回顾）仍然在网关上运行，并且需要自己的网关凭据。因此，在无凭据网关上，即使工作程序成功，自动帮助程序也可以报告身份验证失败。当所有推理必须远离网关时，请使用 `requiredProfile`；该策略还阻止无会话模型助手。它不会将这些助手移动到节点。

### <a id="create-and-dispatch-with-worker-proxy-authentication"></a> 使用工作人员代理身份验证创建和调度

将经过身份验证的操作员 CLI/API 连接和配置的默认模型与 OpenClaw 运行时结合使用。配置文件发送需要 `operator.admin`。创建没有初始消息或显式 `model`/`agentRuntime` 选择的会话，将其分派到配置的配置文件，然后提交其第一轮：

```bash
openclaw gateway call sessions.create --json \
  --params '{"agentId":"assistant","label":"native-work","worktree":true,"worktreeSource":"empty"}'

# Replace SESSION_KEY with the key returned by sessions.create.
openclaw gateway call sessions.dispatch --json --timeout 240000 \
  --params '{"key":"SESSION_KEY","agentId":"assistant","profileId":"dedicated-native"}'

# Wait for placement.state to be active before sending.
# Use a fresh idempotencyKey for each new turn.
openclaw gateway call agent --json --timeout 180000 \
  --params '{"agentId":"assistant","sessionKey":"SESSION_KEY","message":"Say hello from the worker.","deliver":false,"idempotencyKey":"native-work-turn-1","timeout":120}'

# Replace RUN_ID with the runId returned by agent; acceptance is not completion.
openclaw gateway call agent.wait --json --timeout 195000 \
  --params '{"runId":"RUN_ID","timeoutMs":180000}'
```

空工作区是会话拥有的。对于存储库支持的会话，请改用 [ 存储库 create/dispatch flow](/gateway/cloud-workers/placement-and-machine-selection#codex-or-openclaw-on-a-cloud-profile)，仍然省略初始消息和显式 model/runtime 选择。选择 `profileId`，而不是普通的配对设备目标：普通设备放置仍保持代理。

在 Control UI 中，选择命名的工作器推理配置文件并保留代理的配置模型和 OpenClaw 运行时默认值。配置文件和活动放置可识别工作人员推理，而不会暴露提供商设置或凭据。现有会话使用其绑定环境的记录选择，而不是以后对配置文件的编辑。停止、回收和不精确的放置不会建立当前的工人推理绑定。

将 `requiredProfile` 设置为工作推理设备配置文件后，无需网关提供商凭据即可选择显式标准化 `model` 和 `agentRuntime: "openclaw"`。所需的放置会在运行回合之前检查节点的模型和凭据。显式网关帐户 pin 仍然要求该帐户可用。

**当前限制：**可选配置文件仍然使用网关模型可用性和身份验证检查来明确model/runtime选择；工作代理身份验证值不满足这些检查。模型选择器不是节点模型配置的目录。将上面配置的默认流程用于可选配置文件；不要将工作人员身份验证值复制到网关或禁用身份验证检查以进行显式选择传递。这些是选择时检查：它们不会使网关提供程序身份验证成为继续已绑定的工作推理会话的要求，包括之前接受的模型选择。网关身份验证、agent/model 授权、工具权限、会话和放置访问以及当前运行权限仍然适用。

发布带有功能门控推理选择和现有模型参考，而不是模型端点、标头或提供者凭据。缺少本地配置、不可用的模型、不兼容的工作人员和提供者错误阻碍了转变。工作线程和网关都拒绝本地轮流的代理回退。省略 `settings.inference` 或将其设置为 `gateway` 将保留默认值。

## <a id="troubleshooting"></a> 故障排查

工作线程本地推理因错误而停止。失败的转向永远不会退回到网关推理，因为这会默默地改变凭证的保管和放置。使用下面第一个匹配的诊断，修复其所有者，然后重试或重新启动失败的工作器放置。

| 诊断                                         | 要解决什么问题                                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `settings.inference must be "gateway" or "worker"` | 将所选设备配置文件的 `settings.inference` 设置为这些精确值之一。省略它以保留网关推理。                                                                    |
| `requires a paired device profile`                 | 将 `cloudWorkers.profiles.<id>.settings.device` 设置为连接的节点 ID 并通过该配置文件（而不是普通设备目标）进行调度。                                               |
| `cannot use ... for agent ...`                     | 允许该代理的模型策略中的模型，或选择允许的配置默认值。                                                                                                     |
| `missing from the Gateway model catalog`           | 在网关的 `models.providers` 下添加相同模型参考的非秘密元数据。将 `baseUrl`、凭证和秘密标头保留在节点上。                                  |
| `unavailable on paired device ...`                 | 更新并重新启动节点主机。使用 Linux 或 macOS，将 `nodeHost.workerRuns.isolation` 设置为 `"none"`，并检查节点是否至少有一个具有可用凭证的兼容模型。 |
| `not configured on this node`                      | 在节点的 `models.providers` 下添加兼容模型和可用凭证，然后重新启动节点主机，以便它拍摄新配置的快照。                                        |
| `model ... is unavailable on this node`            | 在节点的 `openclaw.json` 中配置确切的 provider/model 引用和凭证，然后重新启动节点主机。                                                                    |
| `startup data exceeds 2 MiB`                       | 减少配置的节点模型和标头的数量或大小，然后重新启动节点主机。                                                                                               |

如果 Control UI 报告 **Runner failed**，请打开诊断的放置详细信息。在不更改命名配置的情况下重新启动将重复相同的失败。网关日志不包含完整的节点凭据或节点本地模型目录。

当当前节点的本地模型配置或凭据丢失时，还会报告 `not configured on this node`。重启节点前配置节点；仅当该节点运行较旧的 OpenClaw 版本时才首先更新。

## <a id="upgrade-and-downgrade"></a> 升级降级

支持的配置文件值为`gateway`和`worker`；省略表示`gateway`。升级已发布的安装不会启用工作线程推理或添加本机配置。已分配的环境保留其原始快照；配置文件编辑不会更改活动绑定。无需重写数据库或更改架构版本。

在启用配置文件之前，将网关和节点服务升级到支持工作线程本地推理的兼容版本。网关在配对节点上安装其固定的工作包并验证其构建收据；单独的新工作程序包不会升级节点管理程序或为旧节点提供本机启动配置。本地转向需要 `worker-local-inference-v1` 功能，并且永远不会在不兼容的工作线程上回退到网关推理。遵循正常的 [worker 更新和恢复生命周期](/gateway/cloud-workers/session-lifecycle) 以及您平台的节点服务替换过程。

在将任一服务降级为不带此功能的版本之前：

1. 在替换 Control UI 之前，停止新提交并解决每个浏览器选项卡中待处理的必需放置第一条消息。确认会话历史记录中每条消息的结果；在当前构建上完成或显式撤销其挂起的恢复。如果结果未解决，请保留当前版本并单独保存消息文本和附件。不要盲目重发未经确认的消息。较旧的 Control UI 版本拒绝所需的布局恢复标记，并且无法恢复该待处理的输入；删除配置设置不会迁移浏览器恢复记录。

   完成或停止活动轮次，并在兼容网关和节点仍在运行时回收每个本机放置。使用 **Stop 云工作者…** 或现有的 RPC：

   ```bash
   openclaw gateway call sessions.reclaim --json --timeout 600000 \
     --params '{"key":"SESSION_KEY","agentId":"assistant"}'
   ```

   等待成功协调和 `reclaimed` 或 `local` 放置。离线设备或待拆机未确认发布；在继续之前重新连接并解决清理问题。不要仅仅为了降级而强制销毁。

2. 删除 `cloudWorkers.requiredProfile`（如果已设置），然后从 `cloudWorkers.profiles` 中删除本机配置文件以及引用它们的任何默认值。删除配置文件不会更改活动环境记录的推理选择；先收回它。如果普通节点本地 OpenClaw 操作不再使用仅工作线程模型条目和身份验证环境，则在平台生命周期中淘汰它们。
3. 仅在清理后降级。较旧的网关不会将 `settings.inference` 解释为本地推理要求。不要保留本机展示位置或配置文件以供旧网关恢复。任何后续网关或代理轮次都需要其自己配置的提供者凭据。

## <a id="behavior-and-limits"></a> 行为和限制

- 编码工具在工作线程中执行。现有的拨款和许可模式适用。交互式执行批准和工作人员 LLM-review 批准传输仍然不受支持；需要批准的执行被拒绝，而不是自动批准。
- 节点保存的模型配置拥有真实模型API、输入能力、上下文窗口、输出代币限制、价格和思维支持。不支持的想法和相互冲突的代币预算覆盖都会被拒绝。现有的工作重播投影在存储的网关记录中保留支持的提供者重播。
- 自动压缩和重试仍被现有工作运行时禁用。局部推理不会添加替代压缩路径。
- 需要环境端点配置和环境 Vertex ADC 标记凭据的 Azure 适配器被拒绝。未添加提供程序插件加载。
- 取消和替换使用现有的工作人员围栏并终止本地模型请求。第一次成功准入后，失去网关连接也会停止当前的本地转弯。重新连接可以解决中断的转向，但不会恢复其提供者请求；新的转变需要新的入场。仍支持初始 connection/admission 重试。网关保留记录、致谢和终端结算。
- 运行时保护文字凭证反射，包括流片段和标准化值。这不是一般的数据丢失防护，也不是针对作为节点操作系统用户运行的代码的隔离边界。

## <a id="verification"></a> 验证

集中编译过程证明使用隔离的真实网关服务、SQLite 转录本、生成的工作程序和环回 HTTP 模型装置：

```bash
node scripts/run-vitest.mjs run src/worker/native-worker.integration.test.ts
```

它涵盖本地提供商调用和工具、转录持久性、拒绝、取消、替换和代理同级。这不是付费提供商、外部托管人隔离或实时平台部署测试。测试运行器通过其拥有的运行时图编译源夹具；它不在子进程中使用临时 TS 加载程序。要验证实际的部署包、安装程序和节点管理程序：

```bash
pnpm build
TEST_NATIVE_WORKER_BUNDLE=1 node scripts/run-vitest.mjs run src/worker/native-worker.bundle.integration.test.ts
```

选择加入通道使用受支持的预打包 SHA- 地址存档路径，并检查真实安装程序、预热程序、主管程序和工作程序；它不会通过 HTTP 进行存档采集。如果缺少匹配的构建工件，则会失败。按照正常的[node和worker setup](/gateway/cloud-workers/setup-and-bundle-installation)进行安装；此功能不会自动部署或重新启动服务。
