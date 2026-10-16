---
summary: "Deepgram、BytePlus、ComfyUI 和共享 image/music/video 一代现场扫描"
title: "媒体提供商直播通道"
read_when:
  - "您正在运行图像、音乐或视频生成实时扫描"
  - "您更改了媒体提供商插件并需要其实时通道"
---

## <a id="deepgram-live-(audio-transcription)"></a><a id="deepgram-live-audio-transcription"></a> Deepgram 实时（音频转录）

- 测试：`extensions/deepgram/audio.live.test.ts`
- 启用：`DEEPGRAM_API_KEY=... DEEPGRAM_LIVE_TEST=1 pnpm test:live extensions/deepgram/audio.live.test.ts`

## <a id="byteplus-coding-plan-live"></a> BytePlus 编码计划实时版

- 测试：`extensions/byteplus/live.test.ts`
- 启用：`BYTEPLUS_API_KEY=... BYTEPLUS_LIVE_TEST=1 pnpm test:live extensions/byteplus/live.test.ts`
- 可选模型覆盖：`BYTEPLUS_CODING_MODEL=ark-code-latest`。

## <a id="comfyui-workflow-media-live"></a> ComfyUI 工作流媒体实时测试

- 测试：`extensions/comfy/comfy.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 COMFY_LIVE_TEST=1 pnpm test:live -- extensions/comfy/comfy.live.test.ts`
- 范围：
  - 测试 comfy 图像、视频和 `music_generate` 路径
  - 除非配置了 `plugins.entries.comfy.config.<capability>`，否则跳过相应能力
  - 适用于更改 comfy 工作流提交、轮询、下载或插件注册后进行验证。

## <a id="image-generation-live"></a> 图像生成 live

- 测试：`test/image-generation.runtime.live.test.ts`
- 命令：`pnpm test:live test/image-generation.runtime.live.test.ts`
- 运行器：`pnpm test:live:media image`
- 范围：
  - 枚举每个已注册的图像生成 provider 插件
  - 在检查之前使用已导出的提供程序环境变量
  - 默认情况下在存储的身份验证配置文件之前使用 live/env API 密钥，因此 SQLite 身份验证存储中的过时测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的 provider
  - 通过共享的图像生成 runtime 运行每个已配置 provider：
    - `<provider>:generate`
    - 当 provider 声明支持编辑时运行 `<provider>:edit`
- 当前覆盖的内置 provider：
  - `deepinfra`
  - `fal`
  - `google`
  - `minimax`
  - `openai`
  - `openrouter`
  - `vydra`
  - `xai`
- 可选缩小范围：
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="openai,google,openrouter,xai"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_PROVIDERS="deepinfra"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_MODELS="openai/gpt-image-2,google/gemini-3.1-flash-image,openrouter/google/gemini-3.1-flash-image-preview,xai/grok-imagine-image"`
  - `OPENCLAW_LIVE_IMAGE_GENERATION_CASES="google:flash-generate,google:pro-edit,openrouter:generate,xai:default-generate,xai:default-edit"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

对于随 CLI 一起发布的路径，在 provider/runtime live 测试通过后，再增加一个 `infer` 烟雾测试：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_INFER_CLI_TEST=1 pnpm test:live -- test/image-generation.infer-cli.live.test.ts
openclaw infer image providers --json
openclaw infer image generate \
  --model google/gemini-3.1-flash-image \
  --prompt "Minimal flat test image: one blue square on a white background, no text." \
  --output ./openclaw-infer-image-smoke.png \
  --json
```

这覆盖了 CLI 参数解析、config/default-agent 解析、捆绑插件激活、共享的图像生成 runtime，以及 live provider 请求。插件依赖应在 runtime 加载之前就已存在。

## <a id="music-generation-live"></a> 音乐生成 live

- 测试：`extensions/music-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/music-generation-providers.live.test.ts`
- 运行器：`pnpm test:live:media music`
- 范围：
  - 练习共享的打包音乐生成提供方路径
  - 目前覆盖 `fal`、`google`、`minimax` 和 `openrouter`
  - 在检查之前使用已导出的提供程序环境变量
  - 默认情况下在存储的身份验证配置文件之前使用 live/env API 密钥，因此 SQLite 身份验证存储中的过时测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的 provider
  - 在可用时运行两种声明的运行时模式：
    - 使用仅提示输入的 `generate`
    - 当提供商声明 `capabilities.edit.enabled` 时，`edit`
  - `comfy` 有自己单独的 live 文件，不在这个共享扫描中
- 可选缩小范围：
  - `OPENCLAW_LIVE_MUSIC_GENERATION_PROVIDERS="google,minimax"`
  - `OPENCLAW_LIVE_MUSIC_GENERATION_MODELS="google/lyria-3-clip-preview,minimax/music-2.6"`
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

## <a id="video-generation-live"></a> 视频生成 live

- 测试：`extensions/video-generation-providers.live.test.ts`
- 启用：`OPENCLAW_LIVE_TEST=1 pnpm test:live -- extensions/video-generation-providers.live.test.ts`
- harness：`pnpm test:live:media video`
- 范围：
  - 在 `alibaba`、`byteplus`、`deepinfra`、`fal`、`google`、`minimax`、`openrouter` 上执行共享的捆绑视频生成提供商路径`pixverse`、`qwen`、`runway`、`together`、`vydra`、`xai`
  - 默认使用发布安全的冒烟路径：每个 provider 一次 text-to-video 请求、一个一秒的 lobster 提示词，以及来自 `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS` 的每个 provider 操作上限（默认 `180000`）
  - 默认跳过 FAL，因为 provider 侧队列延迟可能会主导发布耗时；传入 `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="fal"`（或清空跳过列表）即可显式运行它
  - 在检查之前使用已导出的提供程序环境变量
  - 默认情况下在存储的身份验证配置文件之前使用 live/env API 密钥，因此 SQLite 身份验证存储中的过时测试密钥不会掩盖真实的 shell 凭据
  - 跳过没有可用 auth/profile/model 的 provider
  - 默认只运行 `generate`
  - 设置 `OPENCLAW_LIVE_VIDEO_GENERATION_FULL_MODES=1` 也会在可用时运行已声明的 transform 模式：
    - `imageToVideo`，当提供者声明 `capabilities.imageToVideo.enabled` 并且所选 provider/model 在共享扫描中接受缓冲区支持的本地图像输入时
    - `videoToVideo`，当提供者声明 `capabilities.videoToVideo.enabled` 并且所选 provider/model 在共享扫描中接受缓冲区支持的本地视频输入时
  - 当前在共享扫描中已声明但被跳过的 `imageToVideo` provider：
    - `vydra`（此通道不支持 buffer-backed 本地图像输入）
  - Vydra 的特定覆盖：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_VYDRA_VIDEO=1 pnpm test:live -- extensions/vydra/vydra.live.test.ts`
    - 该文件默认运行 `veo3` 文本生成视频，以及一个使用远程图像 URL 夹具的 `kling` 图像生成视频通道（可通过 `OPENCLAW_LIVE_VYDRA_KLING_IMAGE_URL` 覆盖）。
  - Provider-specific xAI 覆盖：
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_XAI_VIDEO=1 pnpm test:live -- extensions/xai/xai.live.test.ts -t "classic Grok Imagine"`
    - 经典案例会先生成一个方形本地 PNG 首帧，省略几何参数，请求一个一秒钟的图像生成视频片段，轮询直到完成，并验证下载的 buffer。
    - `OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_XAI_VIDEO=1 pnpm test:live -- extensions/xai/xai.live.test.ts -t "Grok Imagine Video 1.5"`
    - 1.5 案例会生成一个本地 PNG 首帧，请求一个一秒钟的 1080P 图像生成视频片段，轮询直到完成，并验证下载的 buffer。
  - 当前 `videoToVideo` live 覆盖：
    - `runway` 仅当所选模型解析为 `gen4_aleph` 时
  - 共享扫描中当前已声明但被跳过的 `videoToVideo` provider：
    - `alibaba`、`google`、`qwen`、`xai` 因为这些路径当前需要远程 `http(s)` 引用 URL，而不是缓冲支持的本地输入
- 可选缩小范围：
  - `OPENCLAW_LIVE_VIDEO_GENERATION_PROVIDERS="deepinfra,google,runway,xai"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_MODELS="google/veo-3.1-fast-generate-preview,xai/grok-imagine-video,runway/gen4_aleph"`
  - `OPENCLAW_LIVE_VIDEO_GENERATION_SKIP_PROVIDERS=""` 以包含默认扫描中的每个 provider，包括 FAL
  - `OPENCLAW_LIVE_VIDEO_GENERATION_TIMEOUT_MS=60000` 以降低每个 provider 的操作上限，进行更激进的烟雾运行
- 可选认证行为：
  - `OPENCLAW_LIVE_REQUIRE_PROFILE_KEYS=1` 以强制使用 profile 存储认证并忽略仅环境变量覆盖

## <a id="media-live-harness"></a> 媒体 live 运行器

- 命令：`pnpm test:live:media`
- 入口点：`test/e2e/qa-lab/media/hosted-media-provider-live.ts`，它会针对每个选定的 suite 运行 `pnpm test:live -- <suite-test-file>`，因此心跳和静默模式行为会与其他 `pnpm test:live` 运行保持一致。
- 目的：
  - 通过一个仓库原生入口点运行共享的 image、music 和 video live suites
  - 自动从 `~/.profile` 加载缺失的 provider 环境变量
  - 默认自动将每个 suite 缩小到当前具有可用认证的 provider
- 标志：
  - `--providers <csv>` 全局 provider 过滤器；`--image-providers` / `--music-providers` / `--video-providers` 将过滤器限定到单个 suite
  - `--all-providers` 跳过基于认证的自动过滤
  - `--allow-empty` 当过滤后没有可运行的 provider 时以 `0` 退出
  - `--quiet` / `--no-quiet` 传递给 `test:live`
- 示例：
  - `pnpm test:live:media`
  - `pnpm test:live:media image video --providers google,minimax,xai`
  - `pnpm test:live:media video --video-providers runway,xai --all-providers`
  - `pnpm test:live:media music --quiet`
