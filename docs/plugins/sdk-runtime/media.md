---
summary: "语音、媒体理解、image/video/music 生成、网络搜索和媒体实用程序"
read_when:
  - "您正在合成语音或转录入站音频"
  - "您正在从插件生成图像、视频或音乐"
  - "您需要 MIME 检测、调整大小或 QR 帮助程序"
title: "插件运行时媒体助手"
sidebarTitle: "媒体帮手"
---

语音、媒体理解、生成、网络搜索和低级媒体实用程序。 [Plugin 运行时助手](/plugins/sdk-runtime) 参考的一部分。

## <a id="ffmpeg-command-discovery"></a> FFmpeg 命令发现

官方插件源使用来自私有 `openclaw/plugin-sdk/media-ffmpeg` 运行时的 `resolveFfmpegBin`。它解析与媒体运行时相同的受信任系统路径，并在 FFmpeg 不可用时抛出安装提示。这个狭窄的入口点使媒体生成和代理运行时不受源音频工作器启动的影响。它有一个JavaScript-only主机出口；它的声明不包含在包中。第三方插件保留从 `openclaw/plugin-sdk/media-runtime` 导出的现有 `resolveFfmpegBin`。

官方插件发布构建器为此私有导入（包括工作条目）发出 `media-runtime`，因此已发布的插件可以在早于 `media-ffmpeg` 的受支持主机上继续工作。两个路径都使用主机的 FFmpeg 解析器。

## <a id="realtime-voice-playback"></a> 实时语音播放

官方音频工作人员使用私有 `openclaw/plugin-sdk/realtime-voice-playback` 运行时中的 `createRealtimeVoiceOutputActivityTracker` 和 `isRealtimeVoiceAudioAudible` 来避免从源加载语音会话和代理运行时。发布构建器为这些帮助器发出现有的 `openclaw/plugin-sdk/realtime-voice` 主机导入（包括工作器条目），以保留支持的主机。源门面具有 JavaScript-only 主机导出；它的声明不包含在包中。

## <a id="media-and-generation-namespaces"></a> 媒体和生成命名空间

<AccordionGroup>
  <Accordion title="api.runtime.tts">
    文本转语音合成。

    ```typescript
    // Standard TTS
    const clip = await api.runtime.tts.textToSpeech({
      text: "Hello from OpenClaw",
      cfg: api.config,
    });

    // Telephony-optimized TTS
    const telephonyClip = await api.runtime.tts.textToSpeechTelephony({
      text: "Hello from OpenClaw",
      cfg: api.config,
    });

    // List available voices
    const voices = await api.runtime.tts.listVoices({
      provider: "elevenlabs",
      cfg: api.config,
    });
    ```

    使用 Core 的 `tts` 配置和 provider 选择。返回 PCM 音频缓冲区及采样率。还提供 `textToSpeechStream` 以支持流式合成。

    `buildSystemPromptHintAsync(config, agentId?, options?)` 通过状态所有者准备TTS 提示提示并返回`Promise<string | undefined>`。在较旧的主机接口上它是可选的；缺席时需要升级。请参阅 [async 提示准备秘诀 ](/plugins/sdk-migration/async-transcript-and-tts#tts-prompts)。

  </Accordion>
  <Accordion title="api.runtime.mediaUnderstanding">
    图像、音频和视频分析。

    ```typescript
    // Describe an image
    const image = await api.runtime.mediaUnderstanding.describeImageFile({
      filePath: "/tmp/inbound-photo.jpg",
      cfg: api.config,
      agentDir: "/tmp/agent",
    });

    // Prepare a capture limit before installing audio receive listeners.
    const budget = await api.runtime.mediaUnderstanding.resolveAudioInputBudget({
      cfg: api.config,
    });
    // budget.enabled is false when audio understanding is disabled. Otherwise,
    // budget.maxBytes includes the container header and covers the largest fallback.

    // Transcribe audio
    const { text } = await api.runtime.mediaUnderstanding.transcribeAudioFile({
      filePath: "/tmp/inbound-audio.ogg",
      cfg: api.config,
      mime: "audio/ogg", // optional, for when MIME cannot be inferred
    });

    // Describe a video
    const video = await api.runtime.mediaUnderstanding.describeVideoFile({
      filePath: "/tmp/inbound-video.mp4",
      cfg: api.config,
    });

    // Generic file analysis
    const result = await api.runtime.mediaUnderstanding.runFile({
      filePath: "/tmp/inbound-file.pdf",
      cfg: api.config,
    });

    // Structured image extraction through a specific provider/model.
    // Include at least one image; text inputs are supplemental context.
    // receiptImageBuffer is your own image bytes, not an SDK-provided value.
    const evidence = await api.runtime.mediaUnderstanding.extractStructuredWithModel({
      provider: "codex",
      model: "gpt-6-astra",
      input: [
        {
          type: "image",
          buffer: receiptImageBuffer,
          fileName: "receipt.png",
          mime: "image/png",
        },
        { type: "text", text: "Prefer the printed total over handwritten notes." },
      ],
      instructions: "Extract vendor, total, and searchable tags.",
      schemaName: "receipt.evidence",
      jsonSchema: {
        type: "object",
        properties: {
          vendor: { type: "string" },
          total: { type: "number" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["vendor", "total"],
      },
      cfg: api.config,
    });
    ```

    当没有产生输出时返回 `{ text: undefined }`（e.g. 跳过输入）。

    `describeImageFileWithModel(...)` 会通过特定 provider/model 描述一个已知图像，绕过 `describeImageFile(...)` 使用的默认活动模型解析。

  </Accordion>
  <Accordion title="api.runtime.imageGeneration">
    图像生成。

    ```typescript
    const result = await api.runtime.imageGeneration.generate({
      prompt: "A robot painting a sunset",
      cfg: api.config,
    });

    const providers = api.runtime.imageGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.videoGeneration">
    视频生成，形态与图像生成一致。

    ```typescript
    const result = await api.runtime.videoGeneration.generate({
      prompt: "A drone shot flying over a coastline at sunrise",
      cfg: api.config,
    });

    const providers = api.runtime.videoGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.musicGeneration">
    音乐生成，形态与图像生成一致。

    ```typescript
    const result = await api.runtime.musicGeneration.generate({
      prompt: "An upbeat lo-fi track for a coding session",
      cfg: api.config,
    });

    const providers = api.runtime.musicGeneration.listProviders({ cfg: api.config });
    ```

  </Accordion>
  <Accordion title="api.runtime.webSearch">
    网页搜索。

    ```typescript
    const providers = api.runtime.webSearch.listProviders({ config: api.config });

    const result = await api.runtime.webSearch.search({
      config: api.config,
      args: { query: "OpenClaw plugin SDK", count: 5 },
    });
    ```

    搜索调用者可以提供与 `signal` 同步的 `assertCurrent` 回调，以通过提供者准备保留其权限。受保护的 HTTP 请求在传输准备之后以及每个请求或重定向之前检查它。在等待准备之后，使用其他传输的注册搜索提供程序必须在每个外部副作用之前调用执行上下文的 `assertCurrent`。回调属于调用者，并在搜索完成时过期；提供商不得替换它或将其缺席视为许可。

  </Accordion>
  <Accordion title="api.runtime.media">
    低级媒体工具。

    ```typescript
    const webMedia = await api.runtime.media.loadWebMedia(url);
    const mime = await api.runtime.media.detectMime({ buffer });
    const kind = api.runtime.media.mediaKindFromMime("image/jpeg"); // "image"
    const isVoice = api.runtime.media.isVoiceCompatibleAudio({ fileName: filePath });
    const metadata = await api.runtime.media.getImageMetadata(buffer);
    const resized = await api.runtime.media.resizeToJpeg({ buffer, maxSide: 800, quality: 85 });
    ```

    QR 助手由 `openclaw/plugin-sdk/media-runtime` 导出：

    ```typescript
    import { resolvePreferredOpenClawTmpDir } from "openclaw/plugin-sdk/temp-path";

    const qr = await import("openclaw/plugin-sdk/media-runtime");
    const terminalQr = await qr.renderQrTerminal("https://openclaw.ai");
    const pngQr = await qr.renderQrPngBase64("https://openclaw.ai", {
      scale: 6, // 1-12
      marginModules: 4, // 0-16
    });
    const pngQrDataUrl = await qr.renderQrPngDataUrl("https://openclaw.ai");
    const tmpRoot = resolvePreferredOpenClawTmpDir();
    const pngQrFile = await qr.writeQrPngTempFile("https://openclaw.ai", {
      tmpRoot,
      dirPrefix: "my-plugin-qr-",
      fileName: "qr.png",
    });
    ```

  </Accordion>
</AccordionGroup>
