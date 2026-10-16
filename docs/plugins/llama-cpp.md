---
summary: "与托管或现有 llama.cpp 服务器和托管本地嵌入运行 GGUF 聊天"
read_when:
  - "您希望 OpenClaw 安装和管理本地 llama.cpp 服务器"
  - "您需要网关硬件的本地模型推荐"
  - "您希望 OpenClaw 连接到现有的 llama-server"
  - "你希望使用本地 GGUF 模型生成内存搜索嵌入"
  - "你正在配置 memory.search.provider = \"local\""
title: "llama.cpp 提供商"
sidebarTitle: "llama.cpp 提供商"
---

这`llama-cpp`插件提供了一个`llama-cpp`模型提供商。OpenClaw可以管理本地`llama-server`或连接到您操作的设备。两种选择都使用`llama-cpp/<model>`参考文献和OpenAI-兼容的运输。

```bash
openclaw plugins install @openclaw/llama-cpp-provider
openclaw onboard
```

## <a id="choose-server-ownership"></a> 选择服务器所有权

| 设置选择          | 流程所有者                 | 本地嵌入 |
| --------------------- | ----------------------------- | ---------------- |
| 托管本地服务器  | OpenClaw                      | 是              |
| 现有的 llama 服务器 | 您或外部主管 | No               |

`models.providers.llama-cpp.localService` 是所有权鉴别器。如果存在，则 OpenClaw 管理该进程。如果没有它，`baseUrl` 会识别现有端点。切换选择会重写同一提供者上特定于所有权的状态。它永远不会创建另一个提供者名称空间。

托管 llama.cpp 使用插件的非秘密身份验证标记。较旧的 `apiKey` SecretRef 保留在您的配置中，但对于此托管传输处于非活动状态。显式标头和请求凭据仍然可以正常解析。其他托管提供商保留自己的身份验证规则；仅 `localService` 并不能使编写的 API 密钥成为可选的。

## <a id="managed-local-server"></a> 托管本地服务器

托管环回服务器不需要 API 密钥。新设置使 `apiKey` 未设置；提供者在运行时提供其非秘密身份验证标记。现有配置的凭据将保留用于 Doctor 和显式秘密迁移，并且外部服务器保留其自己的身份验证要求。

当 OpenClaw 应安装、启动和停止服务器时，选择 **托管本地服务器**。安装程序读取 **Gateway 主机的** 硬件，并根据其可用内存、GPU 功能和可用磁盘空间推荐模型。连接到远程网关的浏览器在该网关上安装并运行模型，而不是在浏览器的计算机上。

查看指定的主机、执行后端、模型和下载大小，然后确认下载。安装程序会验证固定模型文件和 llama.cpp 构建，准备环回端点，并在保存新默认值之前检查推理。引导激活还要求模型通过 OpenClaw 工具读取临时文件并返回其内容。工具检查使用独立的工作区，无需代理的引导指令。仅纯文本回复无法通过该检查。每次验证检查都有 90 秒的截止时间。更改 `agents.defaults.timeoutSeconds` 不会扩展设置验证。失败确定响应检查或工具使用检查是否超时。

如果 OpenClaw 的当前托管安装中缺少配置的服务器可执行文件，则聊天和本地嵌入会在启动之前恢复相同的已验证版本。旧版本的自定义服务器路径和安装仍然需要手动修复或重新运行安装。

托管本地模型会自动使用结构化 [Tool Search](/tools/tool-search)，除非您已明确配置它。可选功能仍然可用。它们的模式根据需要加载，减少了模型在回复之前必须处理的输入。安装程序未启用精益模式。正常的聊天仍然包含您的代理的指示。在 CPU-only 主机上，即使设置验证成功后，第一次回复也可能需要几分钟。

### <a id="model-recommendations"></a> 模型推荐

如果内存允许，安装程序更喜欢这些纯文本食谱。每个都使用 65,536 个令牌上下文并支持工具：

| 模型                   | 聊天下载 | 最小主机内存         |
| ----------------------- | ------------- | --------------------------- |
| Qwen3.5 4B Q4_K_M       | 关于 2.7 GB  | 8 GiB                       |
| Qwen3.5 9B Q4_K_M       | 关于 5.7 GB  | 16 GiB                      |
| Gemma 4 12B IT Q4_K_M   | 关于 7.1 GB  | 24 GiB 和 GPU 加速度 |
| 缪斯微光 30B Q4_K_M | 关于 16.8 GB | 32 GiB 和 GPU 加速度 |
| Qwen3.8 27B UD-Q4_K_M   | 关于 16.5 GB | 32 GiB 和 GPU 加速度 |

当内存预算合适时，Qwen3.8 是首选。 Muse 的上下文缓存预算较小，可以容纳 24 个 GiB NVIDIA 卡，而 Qwen3.8 则不能。 CPU 建议停止于 Qwen3.5 9B。 Gemma 4 E2B、E4B 和 26B A4B 保留在现有路由和缓存下载的目录中。推荐顺序是产品默认的，而不是声称一个模型赢得每项任务。

这些是精选楼层，不保证适合或速度。安装程序为操作系统、上下文缓存、运行时和默认嵌入模型保留内存。它考虑了当前内存压力和容器内存限制，并且在 RAM、GPU 内存或磁盘空间有限时可能会推荐较小的模型。单独的 NVIDIA 卡不会添加在一起以假设模型适合。现有的 Gemma 4 E4B 配置和缓存的自定义模型仍然受支持。

聊天下载还包括您配置的本地嵌入模型，默认情况下为 EmbeddingGemma（大约为 0.3 GB）。为运行时和下载暂存留出额外的磁盘空间。安装程序在提供推荐模型之前会检查这一点。当缓存和运行时使用独立卷时，安装程​​序会分别检查每个卷的可用空间。无法建立独立性的共享存储池和卷使用组合保留。自定义嵌入模型可能需要比这些预算更多的内存和磁盘空间。

### <a id="execution-backends"></a> 执行后端

| 网关主机                                         | 托管后端           |
| ---------------------------------------------------- | ------------------------- |
| macOS 在 Apple 硅片上                               | 金属统一记忆 |
| 英特尔 macOS                                       | CPU                       |
| Linux x64或arm64                                   | CPU                       |
| Windows x64，带有受支持的 NVIDIA GPU              | CUDA 12.4                 |
| Windows x64，不支持 CUDA，或 Windows arm64 | CPU                       |

经过验证的 Windows CUDA 版本需要 NVIDIA 驱动程序 551.78 或更新版本以及计算功能 5.0 或更新版本。安装程序会检查驱动程序并安装运行时的设备发现。当 NVIDIA GPU 没有兼容的托管 CUDA 版本时，安装程​​序会在确认中解释限制并命名 CPU 执行。对于其他加速后端，请自行运行兼容的服务器并选择 **EExisting llama-server**。

运行时验证每个可执行版本检查最多允许两分钟，因此 macOS 安全评估和 Metal 初始化可以在安装后或重用运行时时完成。设置在验证期间仍然可以取消。

经过验证的 macOS 版本需要 macOS 13.3 或更高版本，并且安装程序会在下载旧版本之前停止。要保留托管聊天和本地嵌入，请在该 Mac 上构建 `llama-server` 并将 `models.providers.llama-cpp.localService.command` 设置为其绝对路径；参见[本地模型服务](/gateway/local-model-services)。

如果没有适合的建议，安装程序会解释是否释放内存、释放磁盘空间或修复缓存目录权限。取消或失败引导验证会保留选择先前的默认模型。设置候选者有自己的服务器预设，因此验证不会重写现有托管服务器的预设。下载的文件可能会保留缓存以便重试。安装程序会验证并重用缓存的建议，并仅针对丢失的模型和运行时文件收取磁盘空间费用。

托管路由器预设按固定顺序保留配置的聊天模型，并删除该清单之外的模型部分。聊天和嵌入准备更新其拥有的设置，同时保留标题、`[*]` 默认值、注释和保留模型上的其他选项。仅嵌入设置使用新的预设。

托管嵌入默认为一个服务器插槽 （`parallel = 1`）、一个 2,048 个令牌上下文和一个 2,048 个令牌物理批次 （`ubatch-size`）。内存索引为分词器开销和服务器的上下文边界保留四个位置。这些默认值也适用于自定义 GGUF 和旧版 EmbeddingGemma 缓存路径。一个插槽将 llama.cpp 的大型嵌入输出缓冲区限制到一个输入；上下文绑定避免为短内存块保留自定义模型的完整训练上下文。

嵌入部分、`[*]` 或托管服务的参数或环境中的现有上下文、批处理和槽设置仍然具有权威性。 OpenClaw 仅在未配置槽计数或每槽上下文时添加上下文绑定，因为 llama.cpp 可以跨槽划分总上下文。如果您选择不同的槽数，也要调整其上下文的大小。长查询或直接嵌入请求可能需要在支持它们的模型上设置更大的本机容量设置。缺少的默认值将在下一次托管预设准备时添加。

### <a id="set-up-only-local-embeddings"></a> 仅设置本地嵌入

当 `memory.search.provider` 为 `local` 并且聊天设置无法继续或被拒绝时，OpenClaw 提供单独的仅嵌入设置。在明确同意后，它仅安装托管服务器和配置的嵌入模型。它不会添加 llama.cpp 聊天模型或更改当前聊天模型。安装程序发现保持只读状态，并且从不安装或下载任何内容。

如果没有推荐的聊天模型适合您的内存预算，请启用本地内存搜索并重试设置以获得仅嵌入的优惠（默认嵌入模型约为 0.3 GB）：

```bash
openclaw config set memory.search.provider local
openclaw models auth login --provider llama-cpp --method local
```

如果您使用 `--profile`，请对这两个命令使用相同的配置文件。

如果 llama.cpp 提供程序具有任何已配置的聊天模型，则仅嵌入设置将使其保持不变。将所有聊天路由移至其他提供商并删除这些模型条目，然后重试。在 OpenClaw 可以管理嵌入之前，还必须删除现有的外部 llama.cpp 服务器配置。

### <a id="use-another-managed-gguf"></a> 使用另一个托管的GGUF

在 `models.providers.llama-cpp.models` 下添加模型，选择其 `llama-cpp/<id>` 参考，然后再次运行托管安装：

```json5
{
  id: "my-local-model",
  name: "My local GGUF",
  reasoning: false,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 65536,
  maxTokens: 2048,
  params: {
    modelPath: "~/Models/my-model.Q4_K_M.gguf",
    contextSize: 65536,
  },
  compat: { supportsTools: true },
}
```

`modelPath` 接受本地路径、缓存相关文件名、完整 `hf:` 文件 URI 和发布 SHA-256 响应摘要的 HTTPS GGUF URL。默认缓存为 `~/.openclaw/models/llama.cpp`。配置的 `modelCacheDir` 对于托管设置仍然具有权威性。

安装程序会解析模型别名和对所选创作模型的帐户限定引用，并保留该模型，即使该模型未缓存也是如此。它显示固定配方或源元数据（如果可用）的下载大小，并在下载前询问。无效来源会产生特定于模型的错误，而不是不同的建议。拒绝会使配置的路由保持不变。当未配置托管聊天模型时，适用硬件建议；自定义模型仍然受到源校验和和运行时验证的约束。

## <a id="managed-local-ocr-and-vision"></a> 管理本地OCR和愿景

在网关主机上运行此命令：

```bash
openclaw models auth login --provider llama-cpp --method local-media
```

安装程序建议将 OCR 和视觉配方与网关的硬件、当前可用内存、支持的运行时后端和可用磁盘分开。它在请求许可之前显示主机、后端、模型和投影仪下载、内存预算、拒绝的候选者和降级模式。未经同意不得下载。

初始自动媒体设置范围为 **Linux x64，执行 CPU**。其他托管后端仍然可用于聊天和嵌入，但这些主机上的自动 OCR 和视觉激活等待匹配的端到端验证。使用 Linux x64 网关进行此设置，或配置其他映像提供程序。更新 OpenClaw 永远不会激活这些路由；设置需要明确同意。

策划的配方使用 **** 模型和多模式投影仪的固定存储库修订、大小和 SHA-256 校验和。现有托管安装程序验证 llama.cpp 运行时。然后，安装程序通过注册的图像提供程序运行两个真实图像：`OPENCLAW OCR 4827` 的转录，以及有关蓝色圆圈上方的红色方块的问题，第二个图像中没有文本。在保存配置之前，这两项检查都必须通过。取消或失败将保留先前的配置并删除候选预设。已验证的下载仍会缓存以供重试。

| 角色   | 食谱               | 模型+投影仪下载 | 模型内存预算 |
| ------ | -------------------- | -------------------------- | ------------------- |
| OCR    | GLM-OCR Q8_0         | 关于 1.43 GB              | 4 GiB               |
| 视觉 | SmolVLM2 2.2B Q4_K_M | 关于 1.71 GB              | 5 GiB               |

完整的对至少需要 6 个 GiB 主机 RAM、足够的 **可用** 内存（余量后）以及用于丢失文件和运行时暂存的磁盘。这些是资格底线，不能保证速度或准确性。一次仅驻留一种路由器模型，包括现有的聊天模型和嵌入模型。切换任务可能会导致模型加载延迟。没有安装额外的模型流程管理器。

### <a id="choose-the-image-task"></a> 选择图像任务

`local_image` 工具接受本地路径或 `media://` 引用和显式任务：

```json
{ "path": "./receipt.png", "task": "ocr" }
```

```json
{
  "path": "./diagram.png",
  "task": "vision",
  "prompt": "Explain the relationship between these shapes."
}
```

省略 `task` 选择视觉。 OCR 转录可见文本；它不能取代照片、图表、地图或界面的视觉解释。该工具将键入的任务映射到已安装的模型，并使用与正常图像理解相同的注册提供程序。提示关键字从不选择路线。本地文件权限、输入限制、取消和输出限制仍然适用。该工具在沙箱中不可用，因为它需要主机的本地文件访问权限。

安装程序将这些选择记录在 `models.providers.llama-cpp.params.mediaModels` 中，将两个支持图像的模型添加到现有清单中，在 `tools.media.models` 中设置显式图像路径，并选择局部视觉作为 `agents.defaults.imageModel`，没有后备。现有的聊天默认设置、嵌入配置、模型库存、提供商设置和保留的预设评论保持不变。现有媒体条目需要显式 `capabilities`，因此安装程序可以在替换图像路由时保留 audio/video 路由。外部服务器和托管直接模型命令必须首先配置为托管路由器。路由器命令行限制覆盖模型预设。安装程序拒绝超出媒体配方预算的图像令牌、上下文或并行性参数；降低这些限制或将它们放置在现有模型的单独预设部分中。兼容的下限和不相关的路由器选项被保留。

CLI 还可以显式选择已安装的 OCR 路由：

```bash
openclaw infer image describe --file ./receipt.png \
  --model llama-cpp/glm-ocr-q8_0 --timeout-ms 600000 --json
```

### <a id="privacy-and-limits"></a> 隐私和限制

托管映像路由使用环回服务器，无需远程回退。它们拒绝该地址的显式请求代理和环境代理路由。如果您的主机使用 HTTP 代理，请在设置和推理之前将托管服务器地址包含在 `NO_PROXY` 中（例如 `127.0.0.1,::1`）。 Inference 永远不会下载丢失的模型或投影仪；重新运行安装程序以修复缓存。原始介质仍可用于正常管道。 **现有的云聊天模型在其原生视觉策略下仍然可以接收原始图像。** 本地图像预处理不会改变主要的聊天提供者。

初始模型每个请求处理一张图像，输入上限为 10 MiB，图像编码和输出有界。密集的文本可能需要单独裁剪。 GLM-OCR 不安装文档布局检测或 PDF 渲染。小视觉模型可能会误解复杂的图表和空间关系；安装程序检查基本功能，而不是一般准确性。每个验证请求的截止时间最多为十分钟，以适应 CPU 推理；较短的配置图像超时仍然适用。

## <a id="existing-llama-server"></a> 现有 llama-server

当另一个终端、容器、服务管理器或计算机拥有该进程时，选择 **Existing llama-server**。

<Steps>
  <Step id="start-llama-server" title="启动 llama-server">
    给模型一个稳定的别名：

    ```bash
    llama-server \
      --model /path/to/model.gguf \
      --alias my-model \
      --host 127.0.0.1 \
      --port 8080
    ```

  </Step>
  <Step id="configure-openclaw" title="配置OpenClaw">
    运行`openclaw onboard`，选择**Existing llama-server**，然后输入端点。仅当服务器或代理需要时才启用 API-key 身份验证。

    URL 提示接受 HTTP 或 HTTPS 端点和主机简写，例如 `localhost:8080`。无效的 URL 和嵌入的凭据会被内联拒绝，因此您可以更正端点，而无需重新启动设置。

  </Step>
  <Step id="select-the-model" title="选择模型">
    ```bash
    openclaw models list --provider llama-cpp
    openclaw models set llama-cpp/my-model
    ```
  </Step>
</Steps>

OpenClaw 读取为 `/health`、`/models`（回退到 `/v1/models`）和 `/props`。路由器属性检查使用 `autoload=false`。 Discovery 永远不会加载、唤醒、卸载、下载或重新加载模型。

发现和推理共享提供商的专用网络请求策略。 `models.providers.llama-cpp.request.allowPrivateNetwork: true` 允许两者到达操作员控制的链路本地服务器，例如 Podman 主机网关。相同的选择加入还允许被推理策略阻止的地址，包括元数据地址；仅将其用于受信任的端点。将其设置为 `false` 会禁用发现和推理的专用网络和配置源信任。 Discovery 没有单独的重试或重定向异常。

对于已发现的模型，仅当 `/props` 将 `chat_template_caps.supports_reasoning_effort` 设置为 `true` 时，OpenClaw 才会通告推理和工作量控制。缺失或错误的值会使这些功能无法被宣传。显式配置的上下文和工具值仍然对发现具有权威性。

仅当实时 `/props` 验证上下文限制和工具支持时，安装程​​序才会保存它们。卸载的路由器模型保留在配置的清单中，但这些字段未设置。运行时发现使用 128,000 个令牌上下文回退，并在这些事实未知时保持工具禁用；它不会将这些默认值保存为模型覆盖。自己加载模型后，刷新其实时事实：

```bash
openclaw models list --provider llama-cpp --refresh
```

刷新会从实时 `/props` 填充运行时目录中未设置的上下文和工具字段，而无需更改显式覆盖或加载其他模型。较旧的安装版本可能已保存卸载模型的 `contextWindow: 128000`、`contextTokens: 128000` 和 `compat.supportsTools: false`。如果这些是由安装程序生成的，而不是您想要固定的值，请从 `models.providers.llama-cpp.models` 中删除受影响的模型行，然后刷新或重新运行 **E 现有的 llama-server** 安装程序。首先加载模型以发现其实际限制。单独重新运行安装程序会保留现有的覆盖。

刷新配置的外部服务器会在发现失败时报告身份验证拒绝或不可用。先前发现的模型仅在其端点和凭据未更改时才保持可见。成功的空列表会删除发现的行。显式配置的模型仍然存在。恢复服务器或更正其凭据，然后再次刷新以恢复实时清单。

### <a id="authentication-and-endpoint-replacement"></a> 身份验证和端点替换

现有端点支持无身份验证、API 密钥、SecretRefs、身份验证配置文件和显式授权标头。除非安装程序收到新密钥，否则显式 `Authorization` 标头将胜过环境 API-key 发现。选择不使用 API 密钥将删除默认的 llama.cpp 身份验证配置文件和过时的内联密钥字段，同时保留显式的 `Authorization` 标头和不相关的标头。包含用户名或密码的端点 URL 将被拒绝。

```bash
export LLAMA_SERVER_API_KEY="<API_KEY>"
openclaw onboard
```

当端点更改时，安装程​​序不会将旧端点的环境、配置文件、配置的密钥或标头凭据发送给替换端点。从托管模式切换还会删除 `localService`、托管 model/cache 参数以及发现前的托管请求超时。

对于非交互式设置：

```bash
openclaw onboard \
  --non-interactive \
  --accept-risk \
  --auth-choice llama-cpp-existing-server \
  --custom-base-url http://127.0.0.1:8080/v1 \
  --custom-model-id my-model
```

当替换端点需要新凭证时，请使用 `--llama-server-api-key <API_KEY>`。 `LLAMA_SERVER_API_KEY` 仍可用于初始设置和未更改的端点。

### <a id="manual-configuration"></a> 手动配置

建议使用引导式设置，因为它可以验证发现。最小的手动形状是：

```json5
{
  models: {
    mode: "merge",
    providers: {
      "llama-cpp": {
        baseUrl: "http://127.0.0.1:8080/v1",
        api: "openai-completions",
        request: { allowPrivateNetwork: true },
        models: [],
      },
    },
  },
}
```

自定义提供商 ID 还可以通过通用 OpenAI- 兼容路径指向 llama-server。它们仍然是自定义提供程序，并且应显式声明 `llamacpp` 工具架构配置文件。请参阅 [ 自定义提供商能力声明 ](/gateway/config-tools#custom-provider-capability-declarations)。

## <a id="requests-and-local-embeddings"></a> 请求和本地嵌入

两种所有权选择都使用 OpenClaw 的正常聊天、图像、流媒体和工具传输。 llama.cpp 兼容性系列清除了不受支持的工具架构约束。代理轮流和独立完成还将思考请求映射到服务器的聊天模板标志，并针对旧的 llama-server 版本调整 JSON 架构请求。

本地内存嵌入需要托管模式：

对于自动仅嵌入设置，请配置本地内存并明确同意下载嵌入模型和经过验证的 llama.cpp 运行时：

```bash
openclaw config set memory.search.provider local
openclaw onboard --non-interactive --accept-risk \
  --auth-choice llama-cpp --llama-cpp-embedding-only
openclaw memory index --force
openclaw memory status --deep
```

`--llama-cpp-embedding-only` 仅安装嵌入模型（默认情况下约为 0.3 GB）和服务器运行时。它使用与交互式仅嵌入设置相同的设置路径，并保留您的聊天模型。它尊重已启用代理的配置嵌入模型；使用本地内存的代理必须就该模型达成一致。现有外部服务器或托管聊天路由无法被此仅嵌入路径替换。如果没有同意标志，非交互式托管安装在下载任何内容之前都会失败。

要显式选择嵌入模型：

```json5
{
  memory: {
    search: {
      provider: "local",
      local: {
        modelPath: "hf:ggml-org/embeddinggemma-300m-qat-q8_0-GGUF/embeddinggemma-300m-qat-Q8_0.gguf",
      },
    },
  },
}
```

默认的 EmbeddingGemma 模型自动接收搜索查询和索引文档的不同任务前缀。不使用这些前缀构建的现有索引将在下次搜索或同步时重建一次，无需 `--force`。缓存的原始嵌入不会被重用，并且关键字搜索在恢复期间仍然可用。有意更改嵌入模型后运行 `openclaw memory status --index`。

## <a id="troubleshooting"></a> 故障排查

- 托管设置：运行`openclaw doctor`和`openclaw memory status --deep`。
- 托管运行时状态需要健康的 `/health`、`/models` 和 `/props` 端点，并且没有模型加载错误。当自定义服务器省略`--metrics`时，可选的`/metrics`可以是`unavailable`；这不会使运行时失败。
- 现有服务器：检查`/health`、`/models`和`/props`。 HTTP 503 表示模型仍在加载中。
- 缺少工具：验证 `/props` 中的两个工具功能标志并使用具有工具功能的 Jinja 聊天模板。
- 托管 Linux 构建需要 x64 上的 glibc 2.34 或 arm64 上的 2.38。 Windows 构建需要 Microsoft Visual C++ 2015-2022 Redistributable。
- 默认情况下不会选择 A 模型，该模型会回复简单提示但未通过设置工具检查。检查其工具支持后重试或选择其他模型。
- 没有经过验证的托管构建的平台应使用现有服务器。

OpenClaw 不会自动选择 ROCm、SYCL、OpenVINO 或 Vulkan 存档。

## <a id="related"></a> 相关内容

- [本地模特服务](/gateway/local-model-services)
- [模型提供商](/concepts/model-providers)
- [LM Studio](/providers/lmstudio)
- [Llama Cpp 插件参考](/plugins/reference/llama-cpp) — 托管和外部 llama.cpp 服务器的清单和配置参考
