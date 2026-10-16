---
summary: "将有界提示委托给在配对节点上运行的 Ollama 模型"
read_when:
  - "您希望代理在配对的桌面或服务器节点上运行模型"
  - "您需要 Ollama 命令的节点配对和批准步骤"
  - "您想要在没有代理轮流的情况下验证节点命令"
title: "Ollama 节点本地推理"
sidebarTitle: "Node-局部推理"
---

## <a id="node-local-inference"></a> Node-局部推理

代理可以将简短的任务委派给配对桌面或服务器节点上的 Ollama 模型。提示和响应跨越现有的经过身份验证的 Gateway/node 连接；该请求在节点自己的环回 Ollama 端点 （`http://127.0.0.1:11434`） 上运行。

<Steps>
  <Step id="start-ollama-on-the-node" title="在节点上启动Ollama">
    ```bash
    ollama pull qwen3:0.6b
    ollama list
    ```
  </Step>
  <Step id="connect-the-node-host" title="连接节点主机">
    ```bash
    openclaw node run \
      --host <gateway-host> \
      --port 18789 \
      --display-name "Local inference"
    ```

    在 Gateway 主机上批准该设备及其节点命令，然后验证：

    ```bash
    openclaw devices list
    openclaw devices approve <deviceRequestId>
    openclaw nodes pending
    openclaw nodes approve <nodeRequestId>
    openclaw nodes status --connected
    ```

    首次连接，或者新增 Ollama 命令的升级，都可能触发节点命令审批。如果节点连接时没有声明 `ollama.models` 和 `ollama.chat`，请再次检查 `openclaw nodes pending`。

  </Step>
  <Step id="use-it-from-an-agent" title="从代理处使用">
    随附的 Ollama 插件提供 `node_inference` 工具。代理会先调用 `action: "discover"`，然后使用该结果中的节点和模型调用 `action: "run"`（如果恰好只有一个可用节点已连接，则 `run` 可以省略节点）。例如：“发现我节点上的 Ollama 模型，然后使用加载速度最快的模型总结这段文本。”
  </Step>
</Steps>

发现过程会读取 `/api/tags`，检查 `/api/show` 能力，并在可用时使用 `/api/ps` 优先对已加载模型排序。它只返回 Ollama 报告为可用于聊天的本地模型（`completion` 能力）——Ollama Cloud 行和仅支持嵌入的模型会被排除。每次运行都会禁用模型思考，并将输出默认设为 512 个 token（硬上限 8192），除非工具调用请求了不同的 `maxTokens`；某些模型（例如 GPT-OSS）不支持禁用思考，仍可能输出推理 token。

若要让 Ollama 在节点上持续运行，但不向代理暴露它：

```bash
openclaw config set plugins.entries.ollama.config.nodeInference.enabled false
```

重新启动节点（对于前台会话，`openclaw node restart` 或 stop/rerun `openclaw node run`）。节点停止发布`ollama.models`和`ollama.chat`； Ollama 本身和网关的 Ollama 提供商不受影响。将值设置回`true`并重启即可重新启用；重新连接后，更改的命令表面可能需要再次获得 `openclaw nodes pending` 批准。

直接验证节点命令，不经过代理轮次：

```bash
openclaw nodes invoke \
  --node "Local inference" \
  --command ollama.models \
  --params '{}' \
  --invoke-timeout 90000 \
  --timeout 100000

openclaw nodes invoke \
  --node "Local inference" \
  --command ollama.chat \
  --params '{"model":"qwen3:0.6b","prompt":"Reply with exactly: pong","maxTokens":32,"timeoutMs":120000}' \
  --invoke-timeout 130000 \
  --timeout 140000
```

`--invoke-timeout` 限制节点执行该命令的最长时间；`--timeout` 限制 Gateway 调用的总时长，应设置得更大。

Node- 本地推理始终使用节点自己的环回端点 - 它不会重用已配置的 remote/cloud `models.providers.ollama.baseUrl`。默认情况下，节点命令在 macOS、Linux 和 Windows 节点主机上可用，并且仍受正常节点 pairing/command 策略的约束。
