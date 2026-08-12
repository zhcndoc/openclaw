---
summary: "通过其 OpenClaw 插件使用 Qwen 云"
read_when:
  - 你想在 OpenClaw 中使用 Qwen
  - 你拥有阿里云 Token Plan 订阅
title: "Qwen"
---

Qwen Cloud 是官方的外部 OpenClaw 提供商插件，规范 ID 为 `qwen`。它面向 Qwen Cloud / 阿里云 DashScope Standard 和 Coding Plan 端点，将 Token Plan 公开为 `qwen-token-plan`，保留 `modelstudio` 作为兼容性别名，并独立使用阿里云文档中所述的 `bailian-token-plan` 自定义提供商 ID。

| 属性                   | 值                                         |
| ---------------------- | ------------------------------------------ |
| 提供商                 | `qwen`                                     |
| Token Plan 提供商      | `qwen-token-plan`                          |
| 首选环境变量           | `QWEN_API_KEY`                             |
| Token Plan 环境变量    | `QWEN_TOKEN_PLAN_API_KEY`                  |
| 也接受（兼容性）       | `MODELSTUDIO_API_KEY`、`DASHSCOPE_API_KEY` |
| API 风格               | OpenAI 兼容                               |

<Tip>
`qwen3.7-plus` 和 `qwen3.6-plus` 可与 Coding Plan 和 Standard 端点配合使用。
对于 `qwen3.7-max` 或 `qwen3.6-flash`，请使用 **Standard（按量付费）** 端点。
</Tip>

## 安装插件

`qwen` 作为官方外部插件提供，不包含在核心中。安装后重启 Gateway：

```bash
openclaw plugins install @openclaw/qwen-provider
openclaw gateway restart
```

## 入门

选择你的计划类型并按照设置步骤进行。

<Tabs>
  <Tab title="Coding Plan（订阅制）">
    **最适合：** 通过 Qwen Coding Plan 进行基于订阅的访问。

    <Steps>
      <Step title="获取你的 API key">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制一个 API key。
      </Step>
      <Step title="运行引导配置">
        对于 **Global** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        对于 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
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
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧的 `modelstudio-*` auth-choice ID 和 `modelstudio/...` 模型引用仍然
    可以作为兼容别名使用，但新的设置流程应优先使用规范的
    `qwen-*` auth-choice ID 和 `qwen/...` 模型引用。如果你定义了一个精确的
    自定义 `models.providers.modelstudio` 条目并使用了不同的 `api` 值，那么该
    自定义提供方会拥有 `modelstudio/...` 引用，而不是 Qwen 兼容
    别名。
    </Note>

  </Tab>

  <Tab title="标准（按量付费）">
    **最适合：** 通过 Standard Model Studio 端点按量付费访问，包括 `qwen3.7-max` 和 `qwen3.6-flash`，这些模型在 Coding Plan 中不可用。

    <Steps>
      <Step title="获取你的 API key">
        从 [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) 创建或复制一个 API key。
      </Step>
      <Step title="运行引导配置">
        对于 **Global** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        对于 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
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
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    旧的 `modelstudio-*` auth-choice ID 和 `modelstudio/...` 模型引用仍然
    可以作为兼容别名使用，但新的设置流程应优先使用规范的
    `qwen-*` auth-choice ID 和 `qwen/...` 模型引用。如果你定义了一个精确的
    自定义 `models.providers.modelstudio` 条目并使用了不同的 `api` 值，那么该
    自定义提供方会拥有 `modelstudio/...` 引用，而不是 Qwen 兼容
    别名。
    </Note>

  </Tab>

  <Tab title="Token Plan（团队版）">
    **最适合：** 通过阿里云 Model Studio 访问 Qwen 及受支持的第三方模型的基于积分的团队订阅。

    <Steps>
      <Step title="获取你的专属密钥">
        分配一个 Token Plan 席位并创建其专属的 `sk-sp-...` 密钥。Token Plan、Coding Plan 和按量付费密钥不能互换。请参阅 [Global Token Plan 概览](https://www.alibabacloud.com/help/en/model-studio/token-plan-overview) 或 [China Token Plan 概览](https://help.aliyun.com/zh/model-studio/token-plan-overview)。
      </Step>
      <Step title="运行引导配置">
        对于新加坡的 **Global / International** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-token-plan
        ```

        对于北京的 **China** 端点：

        ```bash
        openclaw onboard --auth-choice qwen-token-plan-cn
        ```
      </Step>
      <Step title="验证提供方">
        ```bash
        openclaw models list --provider qwen-token-plan
        openclaw agent --model qwen-token-plan/qwen3.7-plus --message "请回复：token plan ready"
        ```
      </Step>
    </Steps>

    <Note>
    阿里巴巴的 OpenClaw 指南在手动自定义提供方中使用 `bailian-token-plan`。
    该插件将该 ID 注册为兼容性所有者，但新配置应使用 `qwen-token-plan`。
    精确的自定义 `models.providers.bailian-token-plan` 条目会保留其已配置的传输
    和目录所有权；它绝不会合并到规范的 OpenAI 目录中。
    </Note>

    <Warning>
    仅在交互式 OpenClaw 会话中使用 Token Plan。不要将其用于
    cron 作业、无人值守脚本或应用后端。阿里巴巴表示，非交互式使用
    可能会暂停订阅或撤销其 API key。
    </Warning>

  </Tab>

</Tabs>

## 计划类型和端点

| 计划                       | 区域   | 认证选项                  | 端点                                                             |
| -------------------------- | ------ | ------------------------- | ---------------------------------------------------------------- |
| 编程计划（订阅）           | 中国   | `qwen-api-key-cn`         | `coding.dashscope.aliyuncs.com/v1`                               |
| 编程计划（订阅）           | 全球   | `qwen-api-key`            | `coding-intl.dashscope.aliyuncs.com/v1`                          |
| 标准计划（按量付费）       | 中国   | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`                      |
| 标准计划（按量付费）       | 全球   | `qwen-standard-api-key`   | `dashscope-intl.aliyuncs.com/compatible-mode/v1`                 |
| 令牌计划（团队版）         | 中国   | `qwen-token-plan-cn`      | `token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`     |
| 令牌计划（团队版）         | 全球   | `qwen-token-plan`         | `token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` |

提供方会根据你的认证选项自动选择端点。标准化选项使用 `qwen-*` 系列；`modelstudio-*` 仅保留兼容模式。  
可通过配置中的自定义 `baseUrl` 覆盖。

<Tip>
**管理密钥：** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) |
**文档：** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)
</Tip>

## 内置目录

OpenClaw 提供此 Qwen 静态目录。该目录支持端点感知：Coding
Plan 配置会省略那些仅适用于 Standard 端点的模型。

| 模型引用                    | 输入        | 上下文    | 备注                 |
| --------------------------- | ----------- | --------- | -------------------- |
| `qwen/qwen3.5-plus`         | 文本、图像  | 1,000,000 | 默认模型             |
| `qwen/qwen3.6-flash`        | 文本、图像  | 1,000,000 | 仅 Standard 端点     |
| `qwen/qwen3.6-plus`         | 文本、图像  | 1,000,000 | Coding Plan + Standard  |
| `qwen/qwen3.7-max`          | 文本        | 1,000,000 | 仅 Standard 端点     |
| `qwen/qwen3.7-plus`         | 文本、图像  | 1,000,000 | Coding Plan + Standard  |
| `qwen/qwen3-max-2026-01-23` | 文本        | 262,144   | Qwen Max 系列        |
| `qwen/qwen3-coder-next`     | 文本        | 262,144   | Coding               |
| `qwen/qwen3-coder-plus`     | 文本        | 1,000,000 | Coding               |
| `qwen/MiniMax-M2.5`         | 文本        | 1,000,000 | 支持推理             |
| `qwen/glm-5`                | 文本        | 202,752   | GLM                  |
| `qwen/glm-4.7`              | 文本        | 202,752   | GLM                  |
| `qwen/kimi-k2.5`            | 文本、图像  | 262,144   | 由阿里巴巴提供的 Moonshot AI |

<Note>
即使某个模型存在于静态目录中，可用性仍可能因端点和计费计划而异。
</Note>

### 令牌计划目录

令牌计划使用单独的精确字符串允许列表。内置目录展示阿里巴巴当前推荐的计划模型，并保留较新的 Qwen3-Coder 兼容性层以供选择，但将其隐藏。其他列入允许列表的模型 ID 仍可作为自定义模型引用使用。仅用于图像生成的计划模型未包含在此处，因为它们使用不同的 API。

| 模型引用                         | 输入        | 上下文    | 选择器状态 |
| -------------------------------- | ----------- | --------- | ---------- |
| `qwen-token-plan/qwen3.7-plus`     | 文本、图像  | 1,000,000 | 可见       |
| `qwen-token-plan/qwen3.6-plus`     | 文本、图像  | 1,000,000 | 可见       |
| `qwen-token-plan/qwen3-coder-next` | 文本        | 262,144   | 隐藏       |
| `qwen-token-plan/kimi-k2.5`        | 文本、图像  | 262,144   | 可见       |
| `qwen-token-plan/glm-5`            | 文本        | 202,752   | 可见       |
| `qwen-token-plan/MiniMax-M2.5`     | 文本        | 196,608   | 可见       |

## 思考控制

在内置目录中，`qwen3.7-max`、`qwen3.7-plus`、`qwen3.6-flash` 和 `qwen3.6-plus`
都支持推理。对于 `qwen` 系列的推理模型，提供方会将 OpenClaw 的思考级别映射到 DashScope 顶层的
`enable_thinking` 请求标志：关闭思考时发送 `enable_thinking: false`，
其他任何级别都发送 `enable_thinking: true`。自定义模型可以通过在模型条目上设置
`compat.thinkingFormat: "qwen-chat-template"` 来启用另一种聊天模板思考载荷。

Token Plan 模型也被标记为具备推理能力。`kimi-k2.7-code` 和
`MiniMax-M2.5` 仅支持思考，因此即使会话请求 `/think off`，OpenClaw 也会保持思考开启。DeepSeek V4 将
`minimal` 到 `high` 映射为服务的 `high` effort，并将 `xhigh` 或 `max` 映射为 `max`。GLM 5.2 接受
完整的 `minimal` 到 `max` 范围；GLM 5.1 和 GLM 5 接受直到
`xhigh`，并且三者默认都为 `high`。其他混合模型遵循
请求的开/关状态。

## 多模态附加能力

`qwen` 插件仅在 **Standard** DashScope
端点上公开多模态能力，不支持 Coding Plan 端点：

- 通过 `qwen3.6-plus` 进行**图像和视频理解**
- 通过 `wan2.6-t2v`（默认）、`wan2.6-i2v`、`wan2.6-r2v`、`wan2.6-r2v-flash`、`wan2.7-r2v` 进行**Wan 视频生成**

媒体理解会根据已配置的 Qwen 认证信息自动解析；无需额外
配置。请确保你使用的是 Standard（按量付费）端点，以便媒体理解正常工作。

要将 Qwen 设为默认视频提供商：

```json5
{
  agents: {
    defaults: {
      mediaModels: { video: { primary: "qwen/wan2.6-t2v" } },
    },
  },
}
```

每个 Wan 模型仅声明与其匹配的运行模式：

| 模式                         | 模型                             | 参考输入限制                         | 最大时长 | 支持的控制参数                                                   |
| ---------------------------- | -------------------------------- | ------------------------------------- | ------------ | -------------------------------------------------------------------- |
| 文生视频                     | `wan2.6-t2v`                     | 不适用                               | 15 秒         | `size`、`aspectRatio`、`resolution`、`audio`、`watermark`            |
| 图生视频                     | `wan2.6-i2v`                     | 1 张图像                             | 15 秒         | `resolution`、`audio`、`watermark`                                   |
| 参考生视频（Wan 2.6）        | `wan2.6-r2v`、`wan2.6-r2v-flash` | 总计 5 个图像/视频；最多 3 个视频    | 10 秒         | `size`、`aspectRatio`、`resolution`、`audio`、`watermark`            |
| 参考生视频（Wan 2.7）        | `wan2.7-r2v`                     | 总计 5 个图像/视频；最多 3 个视频    | 10 秒         | `size`、`aspectRatio`、`resolution`、`watermark`；音频始终开启 |

Wan 2.6 文生视频和参考生视频模型会将 `resolution` 与 `aspectRatio` 转换为文档中规定的精确 `size`。Wan 2.6 图生视频会发送 `resolution` 档位，并使用输入图像的宽高比。Wan 2.7 参考生视频会发送 `media`、`resolution` 和 `ratio`，并始终生成音频。

参考图像/视频输入要求使用远程 http(s) URL；本地文件路径会被预先拒绝，因为 DashScope 视频端点不接受这些参考输入的本地上传缓冲区。

<Note>
参见 [视频生成](/tools/video-generation)，了解共享工具参数、提供商选择和故障转移行为。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="Qwen 3.6 和 3.7 可用性">
    `qwen3.7-plus` 和 `qwen3.6-plus` 可用于 Coding Plan 和 Standard 端点。`qwen3.7-max` 和 `qwen3.6-flash` 仅适用于 Standard。Standard（按量付费）端点为：

    - 中国：`dashscope.aliyuncs.com/compatible-mode/v1`
    - 全球：`dashscope-intl.aliyuncs.com/compatible-mode/v1`

    OpenClaw 会从 Coding Plan 目录中省略 `qwen3.7-max` 和 `qwen3.6-flash`。
    如果 Coding Plan 端点对任一模型返回“unsupported model”错误，
    请切换到匹配的 Standard 端点和密钥。

  </Accordion>

  <Accordion title="视频生成区域路由">
    OpenClaw 会在提交视频任务之前，将已配置的 Qwen 区域映射到对应的 DashScope AIGC 主机：

    - 全局/国际：`https://dashscope-intl.aliyuncs.com`
    - 中国：`https://dashscope.aliyuncs.com`

    指向 Coding Plan
    或 Standard Qwen 主机的正常 `models.providers.qwen.baseUrl` 仍会将视频生成路由到对应的
    区域性 DashScope 视频端点。

  </Accordion>

  <Accordion title="流式使用兼容性">
    原生 Qwen 端点在共享的
    `openai-completions` 传输层上声明了流式使用兼容性，因此指向相同原生主机的
    DashScope 兼容自定义 provider id 会继承相同行为，而无需特定使用内置的
    `qwen` provider id。此行为适用于 Coding Plan、
    Standard 和 Token Plan 端点：

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - `https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`
    - `https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="能力计划">
    `qwen` 插件正在被定位为完整 Qwen
    Cloud 能力的厂商主页，而不仅仅是编码/文本模型。

    - **文本/聊天模型：** 通过插件提供
    - **工具调用、结构化输出、思考：** 继承自兼容 OpenAI 的传输层
    - **图像生成：** 计划在提供方插件层支持
    - **图像/视频理解：** 在 Standard 端点上可通过插件使用
    - **语音/音频：** 计划在提供方插件层支持
    - **记忆嵌入/重排序：** 计划通过 embedding 适配器表面支持
    - **视频生成：** 可通过共享视频生成能力经由插件使用

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果 Gateway 以守护进程（launchd/systemd）方式运行，请确保 `QWEN_API_KEY`
    或 `QWEN_TOKEN_PLAN_API_KEY` 对该进程可用（例如，放在
    `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供商选择。
  </Card>
  <Card title="Alibaba Model Studio" href="/providers/alibaba" icon="cloud">
    同一 DashScope 平台上的捆绑 Wan 视频生成提供商。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常规故障排查和常见问题解答。
  </Card>
</CardGroup>
