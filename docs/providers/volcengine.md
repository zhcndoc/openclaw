---
summary: "Volcano 引擎设置（Doubao 模型、编码端点和种子语音 TTS）"
title: "Volcengine (Doubao)"
read_when:
  - "您想要将 Volcano Engine 或 Doubao 模型与 OpenClaw 一起使用"
  - "你需要设置 Volcengine API 密钥"
  - "你想使用 Volcengine Speech 文本转语音"
---

Volcengine 提供程序允许访问 Volcano Engine 上托管的 Doubao 模型和第三方模型，并为一般工作负载和编码工作负载提供单独的端点。同一个官方插件还将 Volcengine Speech 注册为 TTS 提供程序。

| 详情     | 值                                                      |
| ---------- | ---------------------------------------------------------- |
| 供应商  | `volcengine`（通用 + TTS），`volcengine-plan`（代码）   |
| 模型认证 | `VOLCANO_ENGINE_API_KEY`                                   |
| TTS 认证   | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY` |
| API        | OpenAI-兼容模型，BytePlus种子语音TTS         |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/volcengine-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>
  <Step id="set-the-api-key" title="设置API密钥">
    运行交互式引导：

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    这将通过一个 API 密钥同时注册通用（`volcengine`）和编码（`volcengine-plan`）提供方。

  </Step>
  <Step id="set-a-default-model" title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
对于非交互式设置（CI、脚本），直接传入密钥：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## <a id="providers-and-endpoints"></a> 提供方和端点

| 提供者          | 端点                                  | 使用场景       |
| ----------------- | ----------------------------------------- | -------------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 通用模型 |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 编码模型  |

<Note>
两个提供方均通过单个 API key 进行配置。设置过程会自动注册两者，而编码提供方的模型选择器也会复用通用提供方的认证（`volcengine-plan` 是 `volcengine` 的认证别名）。
</Note>

## <a id="built-in-catalog"></a> 内置目录

<Tabs>
  <Tab id="general-volcengine" title="一般（火山引擎）">
    | 模型引用                                      | 名称                    | 输入              | 上下文   |
    | ---------------------------------------------- | ----------------------- | ------------------ | --------- |
    | `volcengine/doubao-seed-evolving`              | Doubao 种子进化    | 文本、图像、视频 | 1,024,000 |
    | `volcengine/doubao-seed-2-1-pro-260628`        | Doubao 种子 2.1 Pro     | 文本、图像、视频 | 256,000   |
    | `volcengine/doubao-seed-2-1-turbo-260628`      | Doubao 种子 2.1 涡轮   | 文本、图像、视频 | 256,000   |
    | `volcengine/glm-5-2-260617`                    | GLM 5.2                 | 文本               | 1,024,000 |
    | `volcengine/deepseek-v4-pro-260425`            | DeepSeek V4 Pro         | 文本               | 1,024,000 |
    | `volcengine/deepseek-v4-flash-260425`          | DeepSeek V4 闪存       | 文本               | 1,024,000 |
  </Tab>
  <Tab id="coding-volcengine-plan" title="编码（volcengine-计划）">
    | 模型引用                                  | 名称                  | 输入              | 上下文   |
    | ------------------------------------------ | --------------------- | ------------------ | --------- |
    | `volcengine-plan/ark-code-latest`          | Ark 编码计划       | 文本               | 256,000   |
    | `volcengine-plan/doubao-seed-2.1-turbo`    | Doubao 种子 2.1 涡轮 | 文本、图像、视频 | 256,000   |
    | `volcengine-plan/glm-5.2`                  | GLM 5.2               | 文本               | 1,024,000 |
    | `volcengine-plan/deepseek-v4-pro`          | DeepSeek V4 Pro       | 文本               | 1,024,000 |
    | `volcengine-plan/deepseek-v4-flash`        | DeepSeek V4 闪存     | 文本               | 1,024,000 |
  </Tab>
</Tabs>

两个目录都是静态的（没有 `/models` 发现调用）并支持 OpenAI- 兼容的流式使用记帐。两个提供程序的工具架构都会自动删除 `minLength`、`maxLength`、`minItems`、`maxItems`、`minContains` 和 `maxContains` 关键字，因为 Volcengine 工具调用 API 拒绝它们。

## <a id="text-to-speech"></a> 文本转语音

Volcengine TTS 使用 BytePlus 种子语音 HTTP API （`voice.ap-southeast-1.bytepluses.com`），并与 OpenAI- 兼容的 Doubao 模型 API 分开配置关键。在 BytePlus 控制台中，打开种子语音 > 设置 > API 密钥，复制 API 密钥，然后设置：

```bash
export VOLCENGINE_TTS_API_KEY="<seed-speech-api-key>"
export VOLCENGINE_TTS_RESOURCE_ID="seed-tts-1.0"
```

然后在 `openclaw.json` 中启用它：

```json5
{
  tts: {
    auto: "always",
    provider: "volcengine",
    providers: {
      volcengine: {
        apiKey: "${VOLCENGINE_TTS_API_KEY}",
        voice: "en_female_anna_mars_bigtts",
        speedRatio: 1.0,
      },
    },
  },
}
```

`tts.providers.volcengine` 下可用字段：`apiKey`、`voice`、`speedRatio`（0.2-3.0）、`emotion`、`cluster`、`resourceId`、`appKey` 和 `baseUrl`。当允许覆盖语音设置时，`!emotion=<value>` 也可以作为行内语音指令使用。

对于语音笔记目标，OpenClaw 会请求提供方原生的 `ogg_opus`。对于普通音频附件，它会请求 `mp3`。提供方别名 `bytedance` 和 `doubao` 也会解析到这个语音提供方。

默认资源 ID 为 `seed-tts-1.0`，默认情况下，授权 BytePlus 授予新创建的种子语音 API 密钥。如果您的项目具有 TTS 2.0 权利，请设置 `VOLCENGINE_TTS_RESOURCE_ID=seed-tts-2.0`。

<Warning>
`VOLCANO_ENGINE_API_KEY` 用于 ModelArk/Doubao 模型端点，不是 Seed Speech API key。TTS 需要来自 BytePlus Speech Console 的 Seed Speech API key，或者旧版 Speech Console 的 AppID/token 配对。
</Warning>

旧版 AppID/token 认证仍然支持较老的 Speech Console 应用：

```bash
export VOLCENGINE_TTS_APPID="speech_app_id"
export VOLCENGINE_TTS_TOKEN="speech_access_token"
export VOLCENGINE_TTS_CLUSTER="volcano_tts"
```

其他可选的 TTS 环境变量：`VOLCENGINE_TTS_VOICE`、`VOLCENGINE_TTS_APP_KEY` 和 `VOLCENGINE_TTS_BASE_URL` 在设置后会覆盖对应的 `tts.providers.volcengine` 配置字段。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="default-model-after-onboarding" title="入门引导后的默认模型">
    `openclaw onboard --auth-choice volcengine-api-key` 会将 `volcengine-plan/ark-code-latest` 设置为默认模型，同时注册通用的 `volcengine` 目录。
  </Accordion>

  <Accordion id="model-picker-fallback-behavior" title="模型选择器后备行为">
    在 onboarding/configure 模型选择期间，Volcengine 身份验证选择优先选择 `volcengine/*` 和 `volcengine-plan/*` 行。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示空的提供者范围选择器。
  </Accordion>

  <Accordion id="environment-variables-for-daemon-processes" title="守护进程的环境变量">
    如果 Gateway 作为守护进程（launchd/systemd）运行，请确保模型和 TTS 环境变量可供该进程使用，例如 `VOLCANO_ENGINE_API_KEY`、`VOLCENGINE_TTS_API_KEY`、`BYTEPLUS_SEED_SPEECH_API_KEY`、`VOLCENGINE_TTS_APPID` 和 `VOLCENGINE_TTS_TOKEN`（例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
  </Accordion>
</AccordionGroup>

<Warning>
当 OpenClaw 作为后台服务运行时，在交互式 shell 中设置的环境变量不会自动继承。请参阅上面的守护进程说明。
</Warning>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="FAQ" href="/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
