---
summary: "通过 OpenClaw 插件使用 Qwen Cloud"
read_when:
  - "您想要将 Qwen 与 OpenClaw 一起使用"
  - "你拥有阿里云 Token Plan 订阅"
title: "Qwen"
---

Qwen Cloud 是官方外部 OpenClaw 提供商插件，主 ID 为 `qwen`。它针对Qwen云/阿里巴巴DashScope标准和编码计划端点，将令牌计划公开为`qwen-token-plan`，保留`modelstudio`作为兼容性别名，并独立拥有阿里巴巴记录的`bailian-token-plan`自定义提供商id。

| 属性               | 值                                      |
| ---------------------- | ------------------------------------------ |
| 提供者               | `qwen`                                     |
| Token Plan 提供商    | `qwen-token-plan`                          |
| 首选环境变量      | `QWEN_API_KEY`                             |
| Token Plan 环境变量     | `QWEN_TOKEN_PLAN_API_KEY`                  |
| 也接受（兼容性） | `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY` |
| API款式              | OpenAI-兼容                          |

<Tip>
`qwen3.7-plus` 和 `qwen3.6-plus` 与编码计划和标准端点配合使用。对于`qwen3.8-max`或`qwen3.8-flash`，请使用**标准（按需付费）**或**代币计划**。旧的编码计划不包括这些模型。 `qwen3.7-max` 和 `qwen3.6-flash` 也需要标准或代币计划。
</Tip>

## <a id="install-plugin"></a> 安装插件

`qwen` 作为官方外部插件提供，不与核心捆绑在一起。安装它：

```bash
openclaw plugins install @openclaw/qwen-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

选择你的计划类型并按照设置步骤进行。

如果您仅提供 `QWEN_API_KEY`（或 `MODELSTUDIO_API_KEY` / `DASHSCOPE_API_KEY`），而不提供 `models.providers.qwen.baseUrl`，则 OpenClaw 使用全局编码计划端点：`https://coding-intl.dashscope.aliyuncs.com/v1`。环境变量名称不选择计划或区域。对于标准即用即付密钥，请运行 `openclaw onboard --auth-choice qwen-standard-api-key` 或将 `models.providers.qwen.baseUrl` 设置为 `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`。显式端点配置优先；使用匹配计划和区域密钥。

<Tabs>
  <Tab id="coding-plan-subscription" title="编程计划（订阅）">
    **最适合：** 通过 Qwen Coding Plan 进行基于订阅的访问。

    <Steps>
      <Step id="get-your-api-key" title="获取您的 API 密钥">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys). 创建或复制 API 密钥
      </Step>
      <Step id="run-onboarding" title="运行入门引导培训">
        对于 **Global** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        对于 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step id="set-a-default-model" title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step id="verify-the-model-is-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧版 `modelstudio-*` 身份验证选择 ID 和 `modelstudio/...` 模型引用仍可用作兼容性别名，但新的设置流程应优先选择当前的 `qwen-*` 身份验证选择 ID 和 `qwen/...` 模型引用。如果您使用另一个 `api` 值定义精确的自定义 `models.providers.modelstudio` 条目，则该自定义提供程序拥有 `modelstudio/...` 引用，而不是 Qwen 兼容性别名。
    </Note>

  </Tab>

  <Tab id="standard-pay-as-you-go" title="标准计划（按量付费）">
    **最适合：** 通过 Standard Model Studio 端点进行按需付费访问，包括 `qwen3.8-max` 和 `qwen3.8-flash`，这些在旧版编码计划中不可用。

    <Steps>
      <Step id="get-your-api-key-1" title="获取您的 API 密钥">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys). 创建或复制 API 密钥
      </Step>
      <Step id="run-onboarding-1" title="运行入门引导培训">
        对于 **Global** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        对于 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step id="set-a-default-model-1" title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step id="verify-the-model-is-available-1" title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧版 `modelstudio-*` 身份验证选择 ID 和 `modelstudio/...` 模型引用仍可用作兼容性别名，但新的设置流程应优先选择当前的 `qwen-*` 身份验证选择 ID 和 `qwen/...` 模型引用。如果您使用另一个 `api` 值定义精确的自定义 `models.providers.modelstudio` 条目，则该自定义提供程序拥有 `modelstudio/...` 引用，而不是 Qwen 兼容性别名。
    </Note>

  </Tab>

  <Tab id="token-plan-team-edition" title="令牌计划（团队版）">
    **最适合：** 通过阿里云 Model Studio 访问 Qwen 及受支持的第三方模型的基于积分的团队订阅。

    <Steps>
      <Step id="get-your-dedicated-key" title="获取您的专用钥匙">
        分配一个 Token Plan 席位并创建其专属的 `sk-sp-...` 密钥。Token Plan、Coding Plan 和按量付费密钥不能互换。请参阅 [Global Token Plan 概览](https://www.alibabacloud.com/help/en/model-studio/token-plan-overview) 或 [China Token Plan 概览](https://help.aliyun.com/zh/model-studio/token-plan-overview)。
      </Step>
      <Step id="run-onboarding-2" title="运行入门引导培训">
        对于 Singapore 中的 **Global / International** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-token-plan
        ```

        对于北京的 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-token-plan-cn
        ```
      </Step>
      <Step id="verify-the-provider" title="验证提供商">
        ```bash
        openclaw models list --provider qwen-token-plan
        openclaw agent --model qwen-token-plan/qwen3.7-plus --message "Reply with: token plan ready"
        ```
      </Step>
    </Steps>

    <Note>
    阿里巴巴的 OpenClaw 指南使用 `bailian-token-plan` 作为手动自定义提供程序。该插件将该 ID 注册为兼容性所有者，但新配置应使用 `qwen-token-plan`。精确的自定义 `models.providers.bailian-token-plan` 条目保留其配置的传输和目录的所有权；它永远不会合并到 OpenAI 目录中。
    </Note>

    <Warning>
    仅在交互式 OpenClaw 会话中使用 Token Plan。不要将其用于 cron 作业、无人值守脚本或应用后端。阿里巴巴表示，非交互式使用可能会暂停订阅或撤销其 API key。
    </Warning>

  </Tab>

</Tabs>

## <a id="retired-qwen-portal-authentication"></a> 已退休 Qwen Portal认证

`qwen-oauth` 门户提供商及其旧版 OAuth 流已被删除。门户令牌不可与 Qwen Cloud 或 DashScope API 密钥互换。使用当前的 Qwen 插件需要对所选端点进行新的 API-key 身份验证并更新模型配置。跟随[安装插件](/providers/qwen#install-plugin)和[入门](/providers/qwen#getting-started)；现有门户凭据不会自动转换。

## <a id="plan-types-and-endpoints"></a> 计划类型和端点

| 计划                       | 区域 | 认证选项                | 端点                                                         |
| -------------------------- | ------ | -------------------------- | ---------------------------------------------------------------- |
| 编程计划（订阅） | 中国  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`                               |
| 编程计划（订阅） | 全球 | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`                          |
| 标准计划（按量付费）   | 中国  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`                      |
| 标准计划（按量付费）   | 全球 | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1`                 |
| 令牌计划（团队版）  | 中国  | `qwen-token-plan-cn`       | `token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`     |
| 令牌计划（团队版）  | 全球 | `qwen-token-plan`          | `token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` |

提供商根据您的身份验证选择自动选择端点。当前选择使用 `qwen-*` 系列； `modelstudio-*` 仍然仅兼容。使用配置中的自定义 `baseUrl` 覆盖。

<Tip>
**管理密钥：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **文档：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)
</Tip>

## <a id="built-in-catalog"></a> 内置目录

安装程序会保留连接设置和模型别名，包括 `modelstudio` 别名，而无需将生成的目录行复制到您的配置中。显式 `models.mode: "replace"` 保持目录播种启用；自定义模型行保持不变。

OpenClaw 从配置的端点的经过身份验证的 `/models` API 发现模型。该插件保留以下种子元数据以供离线发现和仅返回模型 ID 的端点使用。编码计划配置忽略了未包含在该计划中的模型；标准模型列表不建立令牌计划或编码计划访问权限。

| 模型引用                   | 输入       | 上下文   | 笔记                   |
| --------------------------- | ----------- | --------- | ----------------------- |
| `qwen/qwen3.5-plus`         | 文本、图像 | 1,000,000 | 默认模型           |
| `qwen/qwen3.6-flash`        | 文本、图像 | 1,000,000 | 仅 Standard 端点 |
| `qwen/qwen3.6-plus`         | 文本、图像 | 1,000,000 | 编码计划+标准  |
| `qwen/qwen3.7-max`          | 文本        | 1,000,000 | 仅 Standard 端点 |
| `qwen/qwen3.7-plus`         | 文本、图像 | 1,000,000 | 编码计划+标准  |
| `qwen/qwen3.8-max`          | 文本、图像 | 1,000,000 | 仅 Standard 端点 |
| `qwen/qwen3.8-flash`        | 文本、图像 | 1,000,000 | 仅 Standard 端点 |
| `qwen/qwen3-max-2026-01-23` | 文本        | 262,144   | Qwen Max 系列           |
| `qwen/qwen3-coder-next`     | 文本        | 262,144   | 编程                  |
| `qwen/qwen3-coder-plus`     | 文本        | 1,000,000 | 编程                  |
| `qwen/MiniMax-M2.5`         | 文本        | 1,000,000 | 支持推理       |
| `qwen/glm-5`                | 文本        | 202,752   | GLM                     |
| `qwen/glm-4.7`              | 文本        | 202,752   | GLM                     |
| `qwen/kimi-k2.5`            | 文本、图像 | 262,144   | 由阿里巴巴提供的 Moonshot AI |

<Note>
即使模型存在于种子目录中，可用性仍可能因端点和计费计划而异。无需更新插件即可显示端点返回的其他聊天模型。对于本地托管模型，请使用 [Ollama](/providers/ollama) 或 [LM Studio](/providers/lmstudio) 发现流程。
</Note>

### <a id="token-plan-catalog"></a> 令牌计划目录

令牌计划使用单独的精确字符串白名单。内置目录展示了阿里巴巴目前推荐的套餐模型。其他列入白名单的模型 ID 仍可用作自定义模型参考。仅图像生成计划模型不包含在此处，因为它们使用不同的 API。

| 模型引用                       | 输入       | 上下文   | 选择器状态 |
| ------------------------------- | ----------- | --------- | ------------- |
| `qwen-token-plan/qwen3.7-plus`  | 文本、图像 | 1,000,000 | 可见       |
| `qwen-token-plan/qwen3.8-max`   | 文本、图像 | 1,000,000 | 可见       |
| `qwen-token-plan/qwen3.8-flash` | 文本、图像 | 1,000,000 | 可见       |
| `qwen-token-plan/qwen3.6-plus`  | 文本、图像 | 1,000,000 | 可见       |
| `qwen-token-plan/kimi-k2.5`     | 文本、图像 | 262,144   | 可见       |
| `qwen-token-plan/glm-5`         | 文本        | 202,752   | 可见       |
| `qwen-token-plan/MiniMax-M2.5`  | 文本        | 196,608   | 可见       |

## <a id="thinking-controls"></a> 思考控制

代理运行和独立完成使用相同的特定于模型的思维控制，包括令牌计划工具选择和推理重播要求。

`qwen3.8-max`和`qwen3.8-flash`支持`off`、`low`、`medium`和`xhigh`思维，默认为`xhigh`。 `minimal` 映射到 `low`； `high` 和 `max` 映射到 `xhigh`。这适用于标准和令牌计划。两种模型都支持 131,072 个输出令牌。在工具使用过程中，OpenClaw 将返回的推理保留在其单独的 `reasoning_content` 重播字段中，而不是将其放置在可见的答案文本中。

请求参数中的显式 `thinking_budget` 优先于映射的 `reasoning_effort`：Qwen 拒绝包含两者的请求。参见[Q文思维参考](https://docs.qwencloud.com/developer-guides/text-generation/thinking)。

`qwen3.7-max`、`qwen3.7-plus`、`qwen3.6-flash` 和 `qwen3.6-plus` 在内置目录中启用推理。对于 `qwen` 系列上的推理模型，提供程序将 OpenClaw 思维级别映射到 DashScope 的顶级 `enable_thinking` 请求标志：禁用思维发送 `enable_thinking: false`，任何其他级别发送 `enable_thinking: true`。自定义模型可以通过在模型条目上设置 `compat.thinkingFormat: "qwen-chat-template"` 来选择备用聊天模板思考负载。当回合、会话或配置选择思考级别时，使用 `compat.reasoningEffortMap: { "high": "xhigh" }` 声明 `compat.supportedReasoningEfforts: ["low", "medium", "xhigh"]` 还会发送 `chat_template_kwargs.reasoning_effort` 以及上面的 Qwen 3.8 层映射。如果不进行选择，OpenClaw 会省略嵌套工作并保留服务器模板默认值。

代币计划模型也被标记为具有推理能力。 `kimi-k2.7-code` 和 `MiniMax-M2.5` 仅思考，因此即使会话请求 `/think off`，OpenClaw 也会保持思考启用状态。 DeepSeek V4 将 `minimal` 到 `high` 映射到服务的 `high` 工作量，并将 `xhigh` 或 `max` 映射到 `max`。 GLM 5.2 接受整个 `minimal` 至 `max` 系列； GLM、5.1 和 GLM 5 通过 `xhigh` 接受，并且所有三个都默认为 `high`。其他混合动力模型遵循所要求的 on/off 状态。

## <a id="multimodal-add-ons"></a> 多模态附加能力

`qwen` 插件仅在 **Standard** DashScope 端点上公开多模态能力，不支持 Coding Plan 端点：

- 通过 `qwen3.6-plus` 进行**图像和视频理解**
- 通过 `wan2.6-t2v`（默认）、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v` 进行**Wan 视频生成**

媒体理解会根据已配置的 Qwen 认证信息自动解析；无需额外配置。请确保你使用的是 Standard（按量付费）端点，以便媒体理解正常工作。

### <a id="video-generation"></a> 视频生成

从标准端点使用 `QWEN_API_KEY`。使 Qwen 成为默认视频提供程序：

```json5
{
  agents: {
    defaults: {
      mediaModels: { video: { primary: "qwen/wan2.6-t2v" } },
    },
  },
}
```

如果只有一张参考图像且没有视频，`wan2.6-t2v` 会自动使用 `wan2.6-i2v`；结果报告已解析的模型。仅当已知模型目录中存在同代图像到视频同级时，此路由才适用。其他请求使用所选模型的模式：

| 模式                         | 模型                           | 参考输入限制                      | 最大时长 | 支持的控制项                                                   |
| ---------------------------- | -------------------------------- | ------------------------------------- | ------------ | -------------------------------------------------------------------- |
| 文本生成视频                | `wan2.6-t2v`                     | n/a                                   | 15 s         | `size`, `aspectRatio`, `resolution`, `audio`, `watermark`            |
| 图像到视频               | `wan2.6-i2v`                     | 1 张图片                               | 15 s         | `resolution`, `audio`, `watermark`                                   |
| 参考视频（Wan 2.6） | `wan2.6-r2v`, `wan2.6-r2v-flash` | 5共images/videos；最多 3 个视频 | 10 s         | `size`, `aspectRatio`, `resolution`, `audio`, `watermark`            |
| 参考视频（Wan 2.7） | `wan2.7-r2v`                     | 5共images/videos；最多 3 个视频 | 10 s         | `size`、`aspectRatio`、`resolution`、`watermark`；音频始终开启 |

Wan 2.6 text/reference 模型将 `resolution` 加上 `aspectRatio` 转换为记录的确切 `size`。 Wan 2.6 图像到视频发送 `resolution` 层并使用输入图像的宽高比。 Wan 2.7 视频参考发送 `media`、`resolution` 和 `ratio` 并始终生成音频。

图像到视频和 Wan 2.7 参考图像接受本地文件或远程 `http(s)` URL。本地图像以 Base64 数据 URI 形式发送，编码前每个图像最多 20 MB，与 [Wan 图像输入限制 ](https://www.alibabacloud.com/help/en/model-studio/image-to-video-api-reference) 匹配。参考视频和 Wan 2.6 视频参考图像仍然需要远程 `http(s)` URL。

<Note>
参见 [视频生成](/tools/video-generation)，了解共享工具参数、提供商选择和故障转移行为。
</Note>

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="qwen-model-availability" title="Qwen 模型可用性">
    `qwen3.7-plus` 和 `qwen3.6-plus` 在编码计划和标准端点上可用。对于 `qwen3.8-max`、`qwen3.8-flash`、`qwen3.7-max` 或 `qwen3.6-flash`，请使用标准或令牌计划。标准（即用即付）端点是：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    OpenClaw 从编码计划目录中省略了这些模型。如果编码计划端点返回“不支持的模型”错误，请切换到匹配的标准或令牌计划端点及其专用密钥。

  </Accordion>

  <Accordion id="video-generation-region-routing" title="视频生成区域路由">
    OpenClaw 会在提交视频任务之前，将已配置的 Qwen 区域映射到对应的 DashScope AIGC 主机：

    - Global/Intl: `https://dashscope-intl.aliyuncs.com`
    - 中国：`https://dashscope.aliyuncs.com`

    指向 Coding Plan 或 Standard Qwen 主机的正常 `models.providers.qwen.baseUrl` 仍会将视频生成路由到对应的区域性 DashScope 视频端点。

  </Accordion>

  <Accordion id="streaming-usage-compatibility" title="流媒体使用兼容性">
    原生 Qwen 端点在共享的 `openai-completions` 传输层上声明了流式使用兼容性，因此指向相同原生主机的 DashScope 兼容自定义 provider id 会继承相同行为，而无需特定使用内置的 `qwen` provider id。此行为适用于 Coding Plan、 Standard 和 Token Plan 端点：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`
    - `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion id="capability-plan" title="能力计划">
    `qwen` 插件今天涵盖了 Qwen 云的哪些部分：

    - **Text/chat 模型：** 可通过插件使用
    - **工具调用、结构化输出、思考：**继承自OpenAI-兼容传输
    - **Image/video 了解：** 可通过标准端点上的插件使用
    - **视频生成：** 可通过共享视频生成能力经由插件使用
    - **图像生成：**未由插件暴露
    - **Speech/audio：** 插件未公开
    - **Memory embeddings/reranking：** 插件未公开

  </Accordion>

  <Accordion id="environment-and-daemon-setup" title="环境和守护进程设置">
    如果 Gateway 以守护进程（launchd/systemd）方式运行，请确保 `QWEN_API_KEY` 或 `QWEN_TOKEN_PLAN_API_KEY` 对该进程可用（例如，放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享视频工具参数和提供商选择。
  </Card>
  <Card title="Alibaba Model Studio" href="/providers/alibaba" icon="cloud">
    同一 DashScope 平台上的捆绑 Wan 视频生成提供商。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和 FAQ。
  </Card>
</CardGroup>
