---
summary: "在 OpenClaw 的模型和嵌入请求之前按需启动本地模型服务器"
read_when:
  - "你希望 OpenClaw 仅在选中其模型或嵌入提供方时才启动本地模型服务器"
  - "您运行 ds4、llmman、vLLM、llama.cpp、MLX 或其他 OpenAI- 兼容的本地服务器"
  - "你需要控制本地提供方的冷启动、就绪状态和空闲关闭"
title: "本地模型服务"
---

`models.providers.<id>.localService` 按需启动提供商拥有的本地模型服务器。当模型或嵌入请求选择该提供程序时，OpenClaw 会检查运行状况端点，如果该端点已关闭，则启动该进程，等待准备就绪，然后发送请求。使用它可以避免昂贵的本地服务器整天运行。

## <a id="how-it-works"></a> 工作原理

1. 模型或嵌入请求会解析到一个已配置的提供方。
2. 如果该提供商具有 `localService`，则 OpenClaw 检查 `healthUrl`。
3. 检查成功后，OpenClaw 使用已运行的服务器。
4. 如果检查失败，OpenClaw 会生成 `command` 和 `args`。
5. OpenClaw 会轮询健康检查端点，直到 `readyTimeoutMs` 过期。
6. 请求通过正常的模型或嵌入传输流程。
7. 如果 OpenClaw 启动了该进程并且设置了 `idleStopMs`，它会在最后一个进行中的请求空闲达到该时长后停止该进程。

OpenClaw 不会为此安装 launchd、systemd、Docker 或任何守护进程。服务器只是第一个需要它的 OpenClaw 进程的普通子进程。

启动是根据配置的提供程序和 command/argument/env 设置进行序列化的，因此同一服务的并发聊天和嵌入请求不会产生重复的服务器。每个请求都保留自己的租约，直到响应处理完成，因此空闲关闭会等待每个正在进行的模型和嵌入请求。配置的提供程序别名保持不同：两个别名可以指向不同的 GPU 主机，而不会折叠到相同的 Ollama、LM Studio 或 OpenAI- 兼容适配器 ID 上。

OpenClaw 在关闭本地服务时等待任何已经在进行的空闲关闭。对同一服务的新请求将等待该停止，然后再获取替代服务。关机错误仍然可见；后续请求在开始替换之前重新检查所属进程。

关闭完成需要子进程及其输出流关闭并完成挂起的树终止操作。单独缺失 PID 不会释放更换服务。

最终退出观察在有界树终止助手完成后开始。在 Windows 上，这可以让 `taskkill` 完成，而不会将已关闭的服务报告为关闭失败。

如果另一个 OpenClaw 进程已经在相同的 `healthUrl` 上有一个健康的服务器，则此进程会复用它，但不会接管它（每个进程只管理它自己启动的子进程）。启动和退出日志会包含有上限、已脱敏的子进程输出尾部，以及耗时和退出详细信息；已配置的环境变量值绝不会被输出。

对于其固定托管安装，llama.cpp 在新主机进程中发出第一个本地服务请求之前检查孤立服务器。在本机 Apple 芯片 macOS 上，仅当本机可执行文件恰好是此状态目录的托管二进制文件并且其显式主机、端口和预设参数匹配时，它才会回收 launchd- 采用的路由器；相对预设还需要配置的工作目录。它捕获匹配的后代，发送 SIGTERM，等待最多五秒，然后在需要时使用 SIGKILL。在每个信号之前都会重新检查进程的诞生和可执行文件的身份。实时父级、自定义二进制文件、其他状态目录、没有唯一显式 host/port/preset 参数的配置以及不同的端口或预设均保留。然后，新的托管子级会正常启动，包括在先前的网关因 SIGHUP、SIGKILL 或崩溃而死亡之后。这不会改变继承的 `nohup` 信号处理。

一起更新主机和插件以启用恢复；没有恢复功能的旧兼容主机保留其现有的重用行为。没有本机进程标识支持的主机、Linux 和 Windows 保留现有的重用行为； Linux PID 1 本身可能是活动网关，因此父 PID 单独无法识别孤儿。在受支持的主机上，如果无法安全地识别匹配的孤立主机，则启动会报告其 PID 并要求您在重试之前手动停止它。

## <a id="managed-llama.cpp"></a><a id="managed-llama-cpp"></a> 托管 llama.cpp

官方 llama.cpp 提供商会自动生成此形状。其引导安装会安装固定的、经过验证的 `llama-server`，写入绝对命令和路由器预设，选择空闲环回端口，并存储生成的 `baseUrl` 和 `localService` 配置。聊天和本地嵌入通过正常的 OpenAI- 兼容传输租用同一托管路由器。

不要在计算机之间复制生成的命令路径。在每个网关主机上运行 llama.cpp 设置，以便 OpenClaw 选择并验证匹配的平台构建。参见 [llama.cpp Provider](/plugins/llama-cpp)。

## <a id="config-shape"></a> 配置结构

```json5
{
  models: {
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "local-model",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/absolute/path/to/server",
          args: ["--host", "127.0.0.1", "--port", "8000"],
          cwd: "/absolute/path/to/working-dir",
          env: { LOCAL_MODEL_CACHE: "/absolute/path/to/cache" },
          healthUrl: "http://127.0.0.1:8000/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "my-local-model",
            name: "My Local Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

在提供程序条目上设置 `timeoutSeconds`（不是 `localService`），以便缓慢的冷启动和长代不会达到默认模型请求超时。每当您的服务器在基础 URL 上的 `/models` 之外的其他位置公开就绪状态时，请设置显式 `healthUrl`。

在 `memory_search` 期间，托管嵌入启动使用 `readyTimeoutMs` 而不是搜索和查询嵌入超时。这些计时器在服务准备好后恢复。嵌入请求、检索和结果处理保留了现有的时间限制。并发 wiki 搜索和管理器清理保持单独的限制，调用者取消仍然可以停止启动。

## <a id="fields"></a> 字段

| 字段            | 必需的 | 描述                                                                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `command`        | 是      | 可执行文件的绝对路径。不进行 shell 的 PATH 查找。                                                                                      |
| `args`           | no       | 进程参数。不进行 shell 展开、管道、通配符匹配或引用处理。                                                                  |
| `cwd`            | no       | 进程的工作目录。                                                                                                   |
| `env`            | no       | 与 OpenClaw 进程环境合并的环境变量。                                                                  |
| `healthUrl`      | no       | 就绪检查 URL。默认在 `baseUrl` 后追加 `/models`（`http://127.0.0.1:8000/v1` 变为 `http://127.0.0.1:8000/v1/models`）。 |
| `readyTimeoutMs` | no       | 启动就绪截止时间。默认值：`120000`。                                                                                       |
| `idleStopMs`     | no       | OpenClaw-started 进程的空闲关闭延迟。 `0` 或省略使其保持活动状态，直到 OpenClaw 退出。                             |

## <a id="llmman-example"></a> llmman 示例

llmman 是自定义 OpenAI- 兼容 `/v1` 后端，因此相同的 `localService` API 可与 `llmman` 提供程序条目配合使用。默认监听`127.0.0.1:17434`； `LLMMAN_HOST` 覆盖绑定地址，而 `LLMMAN_LLM_LIBRARY` 覆盖 GPU 自动检测。其 API 没有身份验证，因此保留默认环回绑定，除非受信任的网络边界限制访问。 llmman has no `/health` route；使用 `/v1/models` 或 `/api/version` 作为 `healthUrl`。

```json5
{
  agents: {
    defaults: {
      model: { primary: "llmman/qwen3.8" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      llmman: {
        baseUrl: "http://127.0.0.1:17434/v1",
        apiKey: "${LLMMAN_API_KEY}",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/opt/homebrew/bin/llmman",
          args: ["serve"],
          env: { LLMMAN_CONTEXT_LENGTH: "65536" },
          healthUrl: "http://127.0.0.1:17434/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "qwen3.8",
            name: "Qwen3.8 (llmman)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 65536,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

在运行 OpenClaw 的机器上将 `command` 替换为 `which llmman` 的结果，并在 `~/.openclaw/.env` 中设置 `LLMMAN_API_KEY=llmman-local`。裸 `llmman serve` 不需要模型参数，并在第一个命名它的请求上加载模型；一个可选的模型参数会预加载它。守护进程设置（例如 `LLMMAN_CONTEXT_LENGTH`）位于 `env` 中。完整的 llmman 设置，包括混合本地 + 托管路由：[llmman](/providers/llmman)。

## <a id="ds4-example"></a> ds4 示例

```json5
{
  models: {
    providers: {
      ds4: {
        baseUrl: "http://127.0.0.1:18000/v1",
        apiKey: "ds4-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "<DS4_DIR>/ds4-server",
          args: [
            "--model",
            "<DS4_DIR>/ds4flash.gguf",
            "--host",
            "127.0.0.1",
            "--port",
            "18000",
            "--ctx",
            "32768",
            "--tokens",
            "128",
          ],
          cwd: "<DS4_DIR>",
          healthUrl: "http://127.0.0.1:18000/v1/models",
          readyTimeoutMs: 300000,
          idleStopMs: 0,
        },
        models: [],
      },
    },
  },
}
```

完整的设置、上下文大小调整和验证命令：[ds4](/providers/ds4)。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="本地模型" href="/gateway/local-models" icon="server">
    本地模型设置、提供者选择和安全指导。
  </Card>
  <Card title="llmman" href="/providers/llmman" icon="cpu">
    本地模型、混合本地 + 托管路由以及 llmman 的按需启动。
  </Card>
</CardGroup>
