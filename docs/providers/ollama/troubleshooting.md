---
summary: "修复了 OpenClaw 中常见的 Ollama 故障"
read_when:
  - "未检测到 Ollama，或没有可用模型"
  - "您遇到连接被拒绝、输出乱码或超时"
  - "WSL2 设置反复重新启动"
title: "Ollama 故障排除"
sidebarTitle: "故障排查"
---

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="wsl2-crash-loop-repeated-reboots" title="WSL2 崩溃循环（反复重新启动）">
    在 WSL2 和 NVIDIA/CUDA 上，官方 Ollama Linux 安装程序使用 `Restart=always` 创建 `ollama.service` systemd 单元。如果该服务在 WSL2 启动期间自动启动并加载 GPU- 支持的模型，则 Ollama 可以在加载时固定主机内存； Hyper-V内存回收不能总是回收这些页面，因此Windows可以终止WSL2 VM，systemd重新启动Ollama，并且循环重复。

    证据：在WSL2启动后，WSL2 reboots/terminations、`app.slice`或`ollama.service`中出现高CPU，以及来自systemd而不是Linux的SIGTERM OOM 杀手。

    当 OpenClaw 检测到 WSL2、已启用 `ollama.service` 且 `Restart=always`，并且存在可见的 CUDA 标记时，会记录启动警告。

    缓解方法：

    ```bash
    sudo systemctl disable ollama
    ```

    在 Windows 端，将以下内容添加到 `%USERPROFILE%\.wslconfig`，然后运行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    或者缩短 keep-alive / 仅在需要时手动启动 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    参见 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion id="ollama-not-detected" title="未检测到 Ollama">
    确认 Ollama 正在运行并且位于代理的模型范围内。对于环境本地主机发现，设置 `OLLAMA_API_KEY`（或身份验证配置文件）。无论是否列出模型，都会发现显式自托管端点：

    ```bash
    ollama serve
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion id="no-models-available" title="无可用模型">
    在本地拉取该模型，或在 `models.providers.ollama` 中显式定义它：

    ```bash
    ollama list  # See what's installed
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # Or another model
    ```

  </Accordion>

  <Accordion id="connection-refused" title="连接被拒绝">
    ```bash
    # Check if Ollama is running
    ps aux | grep ollama

    # Or restart Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion id="remote-host-works-with-curl-but-not-openclaw" title="远程主机可以使用curl，但不能使用OpenClaw">
    请在运行 Gateway 的同一台机器和运行时中进行验证：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常见原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 运行在 Docker 中或另一台主机上。
    - URL 使用 `/v1`，选择 OpenAI- 兼容行为而不是本机 Ollama。
    - 远程主机需要防火墙或 LAN 绑定设置调整。
    - 模型在你笔记本电脑的守护进程上，但不在远程主机上。

  </Accordion>

  <Accordion id="model-outputs-tool-calls-as-text" title="模型以文本形式输出工具调用">
    通常提供程序处于 OpenAI- 兼容模式，或者模型无法处理工具模式。更喜欢本机模式：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434",
            api: "ollama",
          },
        },
      },
    }
    ```

    如果某个小型本地模型仍然在工具 schema 上失败，请在该模型条目上设置 `compat.supportsTools: false` 并重新测试。

    当回复包含命名可用工具的结构化工具调用尝试（包括包装的 XML、ReAct、`Action`/`Action Input` 和旧版 `[TOOL_CALL]` 块）时，OpenClaw 会要求模型一次在恢复安全时本地调用该工具。早期的副作用可以阻止重试。重复的文本呼叫明显失败，而不是报告成功。该守卫永远不会执行文本呼叫；实质性答案中的示例仍然是文本。原始回复和更正继续保留在会话历史记录中。

  </Accordion>

  <Accordion id="repeated-tool-errors-stop-the-turn" title="重复出现的刀具错误导致转向停止">
    在未设置 `tools.toolSearch` 的情况下，使用本机本地 Ollama 的嵌入式运行会直接公开策略批准的 `web_search`、`web_fetch`、`memory_search` 和 `memory_get`。其他可选工具仍然被推迟。显式工具搜索设置保留其配置的行为。直接暴露不会启用被拒绝的工具、启用内存或配置网络搜索提供商。

    OpenClaw 在同一工具和参数连续三次出现相同故障（包括重复的未知工具 ID）后停止。此保护始终处于活动状态；不需要启用 `tools.loopDetection`。

    Ollama 0.40 的通用解析器可能会将聊天模板标记误认为是广告工具名称。工具搜索跨提供商使用无冲突的 `dispatch_action` 名称，在指令、请求和新会话历史记录中具有相同的名称。它不再需要 `openclaw_tool_call` 线路别名。仍然冲突的直接公开名称（例如 `ls`、`name` 和 `function`）保留仅传输别名，例如 `openclaw_ls`。执行和会话历史记录保留这些工具的原始名称。

    这些剩余的别名覆盖本机 Ollama 和 Ollama 插件识别的 OpenAI- 兼容聊天完成路由。其他提供商不变。具有不同标记的自定义 Ollama 模板可能需要单独诊断。

    检查记录的错误中的参数。如果模型重复发明工具名称或无法使用公开的模式，请切换到具有本机工具调用的模型并开始新一轮。更改的错误和成功的重试会重置计数。参见[工具环检测](/tools/loop-detection)。

  </Accordion>

  <Accordion id="kimi-or-glm-returns-garbled-symbols" title="Kimi 或 GLM 返回乱码">
    较长的非语言符号运行的托管 Kimi/GLM 响应被视为失败的提供程序调用而不是成功的回复，因此正常的 retry/fallback/error 处理将接管，而不是将损坏的文本保留到会话中。

    如果再次出现，请捕获模型名称、当前会话文件以及运行是否使用 `Cloud + Local` 还是 Ollama Cloud，然后尝试新的会话和后备模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.6:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion id="cold-local-model-times-out" title="冷本地模型超时">
    大型本地模型首次加载可能需要很长时间。将超时时间限定到 Ollama 提供方，并可选地在轮次之间保持模型加载：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            timeoutSeconds: 300,
            models: [
              {
                id: "gemma4:26b",
                name: "gemma4:26b",
                params: { keep_alive: "15m" },
              },
            ],
          },
        },
      },
    }
    ```

    如果主机本身接受连接很慢，`timeoutSeconds` 也会为该提供方延长受保护的连接超时时间。

  </Accordion>

  <Accordion id="large-context-model-is-too-slow-or-runs-out-of-memory" title="大上下文模型太慢或内存不足">
    许多模型宣传的上下文超出了您的硬件可以舒适运行的范围。本机请求转发有效的 `contextTokens`，除非 `params.num_ctx` 覆盖它。限制 OpenClaw 的预算和 Ollama 的请求上下文，以实现可预测的第一个令牌延迟：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                contextTokens: 32768,
                params: { num_ctx: 32768, thinking: false },
              },
            ],
          },
        },
      },
    }
    ```

    如果 OpenClaw 发送过多提示，请降低模型条目的 `contextTokens`。如果 Ollama 的运行时上下文对于机器来说太大，则降低 `params.num_ctx`。如果发电运行时间过长，则降低 `maxTokens`。

  </Accordion>

  <Accordion id="ollama-still-aborts-or-hangs-on-this-host" title="Ollama 仍在此主机上中止或挂起">
    如果 `curl` 至 Ollama 工作但代理程序中止，请尝试 [llmman](/providers/llmman) 作为本地服务器。

  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排除](/help/troubleshooting)和[FAQ](/help/faq)。
</Note>
