---
summary: "将 OpenClaw 连接到 Ollama：通过本地主机进行身份验证规则、加入和云模型"
read_when:
  - "您正在首次连接 OpenClaw 至 Ollama"
  - "您需要本地、LAN、远程或云主机的身份验证规则"
  - "您希望通过一台 Ollama 主机提供云和本地模型服务"
title: "Ollama 设置"
sidebarTitle: "设置"
---

## <a id="auth-rules"></a> 认证规则

<AccordionGroup>
  <Accordion id="local-and-lan-hosts" title="本地和 LAN 主机">
    环回、专用网络、`.local` 和裸主机名 Ollama URL 不需要真正的承载令牌。 OpenClaw 使用 `ollama-local` 标记来表示这些。
  </Accordion>
  <Accordion id="remote-and-ollama-cloud-hosts" title="远程和 Ollama Cloud 主机">
    公共远程主机和 `https://ollama.com` 需要真实凭证：`OLLAMA_API_KEY`、身份验证配置文件，或提供方的 `apiKey`。对于直接托管使用，建议优先使用 `ollama-cloud` 提供方。
  </Accordion>
  <Accordion id="custom-provider-ids" title="自定义提供商 ID">
    具有 `api: "ollama"` 的自定义提供程序遵循相同的规则。例如，指向私有 LAN 主机的 `ollama-remote` 提供程序可以使用 `apiKey: "ollama-local"`；子代理通过 Ollama 提供程序挂钩解析该标记，而不是将其视为丢失的凭证。 `memory.search.provider` 还可以指向自定义提供者 ID，因此嵌入使用该 Ollama 端点。
  </Accordion>
  <Accordion id="auth-profiles" title="身份验证配置文件">
    SQLite 身份验证存储保存提供者 ID 的凭证；将端点设置（`baseUrl`、`api`、模型、标头、超时）放入 `models.providers.<id>` 中。较旧的平面 `auth-profiles.json` 文件（例如 `{ "ollama-windows": { "apiKey": "ollama-local" } }`）不是运行时格式； `openclaw doctor --fix` 将它们作为带有备份的 `ollama-windows:default` API-key 配置文件导入到 SQLite 中。该旧文件中的 `baseUrl` 值是噪音，应移至提供程序配置。
  </Accordion>
  <Accordion id="memory-embedding-scope" title="内存嵌入范围">
    Ollama 内存嵌入的 bearer 认证仅作用于其声明时对应的主机：

    - 提供方级密钥仅发送到该提供方的主机。
    - `memory.search.remote.apiKey` 和每个代理的覆盖设置仅发送到各自的远程嵌入主机。
    - A 纯 `OLLAMA_API_KEY` env 值被视为 Ollama Cloud 约定，默认情况下不会发送到 local/self-hosted 主机。

  </Accordion>
</AccordionGroup>

## <a id="getting-started"></a> 入门

<Tabs>
  <Tab id="onboarding-recommended" title="入门引导（推荐）">
    <Steps>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard
        ```

        选择 **Ollama**，然后选择一种模式：**Cloud + Local** 或 **Local only**。对于没有本地 Ollama 主机的托管模型，请选择 **Ollama Cloud**。

        在全新的引导设置中，OpenClaw 首先检查默认或配置的 Ollama 主机。自动发现仅考虑已加载到内存中的模型（如 `/api/ps` 所报告），并具有工具支持和 `/api/show` 确认的至少 16K 上下文。安装在磁盘上但未加载的合格模型不会自动成为候选模型。所选路线仍需真正完成后，OpenClaw 才能保存； discovery 永远不会拉取或加载空闲模型。

        要在桌面模型设置中使用已安装但空闲的模型，请在 Ollama 卡上选择 **选择连接**，然后选择 **仅本地**。此显式设置路径可以为实时检查准备合格的已安装模型，而无需已加载它。
      </Step>
      <Step id="select-a-model" title="选择模型">
        `Cloud + Local` 和 `Local only` 提示 Ollama 底座 URL 并检查已安装的模型； `ollama.com` URL 被拒绝，因为托管访问属于 **Ollama Cloud**。如果找不到支持工具的模型，安装程序可以请求获取推荐模型的权限。已安装的 `:latest` 标签（例如 `gemma4:latest`）仅显示一次，而不是重复 `gemma4`。 `Cloud + Local` 还会检查主机是否已登录云访问。
      </Step>
      <Step id="verify" title="验证">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    非交互式：

    ```bash
    openclaw onboard --non-interactive --accept-risk --skip-health \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b"
    ```

    `--custom-base-url` 和 `--custom-model-id` 是可选的。省略基本 URL 使用本地默认主机。如果没有模型 ID，安装程序会优先选择具有工具支持和至少 16K 上下文的已安装模型，优先考虑非推理模型，然后是较小的模型。如果没有符合条件，它将尝试 `gemma4` 建议的模型。

    无法选择宣传为仅嵌入的本地模型作为聊天默认模型。安装程序报告错误并保持现有配置不变；重置预检还会拒绝明确选择的仅嵌入模型或广告为完全仅嵌入的库存。支持补全和嵌入的模型仍然符合资格。

    现有的配置嵌入行不会被删除。从 `models.providers.ollama.models` 中删除它们，或重新运行 Ollama 载入以重建列表。重新加入会替换该提供程序的模型目录，因此请在运行之前保留您想要保留的任何自定义模型条目。

  </Tab>

  <Tab id="manual-setup" title="手动设置">
    <Steps>
      <Step id="install-and-start-ollama" title="安装并启动Ollama">
        从 [ollama.com/download](https://ollama.com/download) 获取，然后拉取一个模型：

        ```bash
        ollama pull gemma4
        ```

        对于混合云访问，请在同一主机上运行 `ollama signin`。
      </Step>
      <Step id="set-a-credential" title="设置凭证">
        对于本地或 LAN 主机，任何值都有效：

        ```bash
        export OLLAMA_API_KEY="ollama-local"
        ```

        对于 `https://ollama.com`，请改用真实密钥：

        ```bash
        export OLLAMA_API_KEY="your-real-key"
        ```

        或在配置中：`openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"`。
      </Step>
      <Step id="select-the-model" title="选择模型">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        或在配置中：

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "ollama/gemma4" },
            },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## <a id="cloud-models-through-a-local-host"></a> 通过本地主机使用云模型

`Cloud + Local` 会通过一个可访问的 Ollama 主机同时路由本地和 `:cloud` 模型——这就是 Ollama 的混合流程，也是当你想同时使用两者时在设置阶段应选择的模式。

OpenClaw 提示输入基础 URL、发现本地模型并检查 `ollama signin` 状态。登录后，它会建议托管默认值（`minimax-m2.7:cloud`、`minimax-m3:cloud`、`kimi-k3:cloud`、`glm-5.2:cloud`）。如果未登录，安装程序将保持仅限本地状态，直到您运行 `ollama signin`。

如果需要在没有本地守护进程的情况下进行仅云端访问，请使用 `openclaw onboard --auth-choice ollama-cloud` 并查看 [Ollama Cloud](/providers/ollama-cloud) —— 该路径不需要 `ollama signin` 或正在运行的服务器：

```bash
openclaw onboard --auth-choice ollama-cloud
openclaw models set ollama-cloud/minimax-m2.7:cloud
```

Ollama Cloud 模型列表来自使用您的密钥进行实时 `https://ollama.com/api/tags` 发现，因此选择器反映了当前托管的目录。如果没有可用密钥，OpenClaw 将显示其捆绑的 Ollama Cloud 目录。
