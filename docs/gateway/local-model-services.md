---
summary: "在 OpenClaw 模型请求之前按需启动本地模型服务器"
read_when:
  - 你希望 OpenClaw 仅在选中模型时启动本地模型服务器
  - 你运行 ds4、inferrs、vLLM、llama.cpp、MLX 或其他兼容 OpenAI 的本地服务器
  - 你需要控制本地提供者的冷启动、就绪状态和空闲关闭
title: "本地模型服务"
---

`models.providers.<id>.localService` 允许 OpenClaw 按需启动由提供者拥有的本地
模型服务器。这是提供者级别的配置：当所选模型属于该提供者时，OpenClaw 会探测服务，
如果端点不可用则启动进程，等待就绪，然后发送模型请求。

它适用于那些全天运行成本较高的本地服务器，或者适用于只要选择模型就足以让后端启动的
手动配置。

## 工作原理

1. 模型请求解析到一个已配置的提供者。
2. 如果该提供者有 `localService`，OpenClaw 会探测 `healthUrl`。
3. 如果探测成功，OpenClaw 使用现有服务器。
4. 如果探测失败，OpenClaw 使用 `args` 启动 `command`。
5. OpenClaw 轮询就绪状态，直到 `readyTimeoutMs` 过期。
6. 模型请求通过正常的提供者传输发送。
7. 如果 OpenClaw 启动了该进程，并且 `idleStopMs` 为正数，那么在最后一个正在处理中的请求空闲达到该时长后，进程会被停止。

OpenClaw 不会为此安装 launchd、systemd、Docker 或守护进程。该服务器是 OpenClaw 进程的子进程，
由第一个需要它的 OpenClaw 进程创建。

## 配置结构

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

## 字段

- `command`：绝对可执行文件路径。不使用 shell 查找。
- `args`：进程参数。不应用 shell 展开、管道、通配符或引用规则。
- `cwd`：进程的可选工作目录。
- `env`：可选环境变量，会与 OpenClaw 进程环境进行合并覆盖。
- `healthUrl`：就绪检查 URL。如果省略，OpenClaw 会在 `baseUrl` 后附加 `/models`，因此
  `http://127.0.0.1:8000/v1` 会变成
  `http://127.0.0.1:8000/v1/models`。
- `readyTimeoutMs`：启动就绪截止时间。默认值：`120000`。
- `idleStopMs`：OpenClaw 启动的进程的空闲关闭延迟。`0` 或省略会使进程保持运行，直到 OpenClaw 退出。

## Inferrs 示例

Inferrs 是一个自定义的兼容 OpenAI 的 `/v1` 后端，因此同样的本地服务
API 也适用于 `inferrs` 提供者条目。

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        localService: {
          command: "/opt/homebrew/bin/inferrs",
          args: [
            "serve",
            "google/gemma-4-E2B-it",
            "--host",
            "127.0.0.1",
            "--port",
            "8080",
            "--device",
            "metal",
          ],
          healthUrl: "http://127.0.0.1:8080/v1/models",
          readyTimeoutMs: 180000,
          idleStopMs: 0,
        },
        models: [
          {
            id: "google/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

将 `command` 替换为在运行 OpenClaw 的机器上执行 `which inferrs` 的结果。

## ds4 示例

完整的设置、上下文大小指导和验证命令，请参见
[ds4](/providers/ds4)。

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

## 运行说明

- 一个 OpenClaw 进程只管理它启动的子进程。另一个看到相同 health URL 已经在线的 OpenClaw 进程会复用它，但不会接管它。
- 启动会按提供者命令和参数集串行化，因此并发请求不会为相同配置生成重复服务器。
- 活跃的流式响应会持有租约；空闲关闭会等待响应体处理完成。
- 对于较慢的本地提供者，请在 `timeoutSeconds` 中设置较大的值，这样冷启动和长时间生成就不会触发默认的模型请求超时。
- 如果你的服务器在 `/v1/models` 之外的其他位置暴露就绪接口，请使用显式的 `healthUrl`。

## 相关内容

<CardGroup cols={2}>
  <Card title="本地模型" href="/gateway/local-models" icon="server">
    本地模型设置、提供者选择和安全指导。
  </Card>
  <Card title="Inferrs" href="/providers/inferrs" icon="cpu">
    通过 inferrs 兼容 OpenAI 的本地服务器运行 OpenClaw。
  </Card>
</CardGroup>
