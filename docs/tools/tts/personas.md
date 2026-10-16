---
summary: "角色定义、提供者绑定、解析顺序和后备策略"
title: "文本转语音角色"
read_when:
  - "您希望跨提供商拥有一个稳定的语音身份"
  - "您需要角色和提供商解析顺序"
  - "您正在选择角色后备策略"
---

## <a id="personas"></a> 人设

**persona** 是一种稳定的语音身份，可以在各个提供商之间一致应用。它可以选择一个提供者，定义提供者中立的提示意图，并为语音、模型、提示模板、种子和语音设置携带提供者特定的绑定。

### <a id="minimal-persona"></a> 最小 persona

```json5
{
  tts: {
    auto: "always",
    persona: "narrator",
    personas: {
      narrator: {
        label: "Narrator",
        provider: "elevenlabs",
        providers: {
          elevenlabs: {
            speakerVoiceId: "EXAVITQu4vr4xnSDxMaL",
            modelId: "eleven_multilingual_v2",
          },
        },
      },
    },
  },
}
```

### <a id="full-persona-(provider-specific-shaping)"></a><a id="full-persona-provider-specific-shaping"></a> 完整 persona（提供商特定 shaping）

```json5
{
  tts: {
    auto: "always",
    persona: "alfred",
    personas: {
      alfred: {
        label: "Alfred",
        description: "Dry, warm British butler narrator.",
        provider: "google",
        fallbackPolicy: "preserve-persona",
        providers: {
          google: {
            model: "gemini-3.8-flash-tts",
            speakerVoice: "Algieba",
            promptTemplate: "audio-profile-v1",
          },
          openai: { model: "gpt-4o-mini-tts", speakerVoice: "cedar" },
          elevenlabs: {
            speakerVoiceId: "voice_id",
            modelId: "eleven_multilingual_v2",
            seed: 42,
            voiceSettings: {
              stability: 0.65,
              similarityBoost: 0.8,
              style: 0.25,
              useSpeakerBoost: true,
              speed: 0.95,
            },
          },
        },
      },
    },
  },
}
```

### <a id="persona-resolution"></a> Persona 解析

活动角色按以下顺序选择：

1. `/tts persona <id>` 本地偏好（如果已设置）。
2. `tts.persona`（如果已设置）。
3. 无 persona。

提供商选择按显式优先级运行：

1. 直接覆盖（CLI、gateway、Talk、允许的 TTS 指令）。
2. `/tts provider <id>` 本地偏好。
3. 活动 persona 的 `provider`。
4. `tts.provider`.
5. 注册表自动选择。

对于每次提供商尝试，OpenClaw 按以下顺序合并配置：

1. `tts.providers.<id>`
2. `tts.personas.<persona>.providers.<id>`
3. 受信任的请求覆盖
4. 允许的模型生成的 TTS 指令覆盖

### <a id="custom-persona-shaping"></a> 自定义 persona shaping

提供商中立的 `personas.<id>.prompt.*` 配置已停用。 Doctor 删除这些字段并指向语音提供者 API。将内置提供程序设置放在 `personas.<id>.providers.<provider>` 下（例如 Google `personaPrompt` 或 OpenAI `instructions`）。对于自定义整形，请使用 `prepareSynthesis(ctx)` 实现语音提供程序插件，并在 `synthesize()` 运行之前返回调整后的文本、提供程序配置或覆盖。这可以在请求语义已知的提供者代码中保持富有表现力的提示构造。

### <a id="fallback-policy"></a> 回退策略

`fallbackPolicy` 控制当某个 persona 对尝试的提供商**没有绑定**时的行为：

| 策略              | 行为                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `preserve-persona`  | **默认。** 保留提供商无关提示字段；提供商可以使用它们，也可以忽略它们。                                            |
| `provider-defaults` | 在该次尝试中，persona 不会参与提示准备；提供商使用其中性默认值，同时继续回退到其他提供商。 |
| `fail`              | 跳过该提供商尝试，并返回 `reasonCode: "not_configured"` 和 `personaBinding: "missing"`。仍会继续尝试回退提供商。              |

只有当**每个**被尝试的提供商都被跳过或失败时，整个 TTS 请求才会失败。

Talk 会话提供商选择是会话范围内的。Talk 客户端应从 `talk.catalog` 中选择提供商 id、模型 id、语音 id 和语言区域，并通过 Talk 会话或 handoff 请求传递它们。打开语音会话不应修改 `tts` 或全局 Talk 提供商默认值。
