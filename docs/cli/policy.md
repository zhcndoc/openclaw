---
summary: "CLI `openclaw policy` 一致性检查的参考"
read_when:
  - "你想将 OpenClaw 设置与编写的 policy.jsonc 进行比对"
  - "你希望在 doctor lint 中查看策略发现"
  - "你需要用于审计证据的策略证明哈希"
title: "策略"
---

# `openclaw policy`

`openclaw policy` 由捆绑的策略插件提供。它是现有 OpenClaw 设置之上的企业一致性层，而不是第二个配置系统。您在 `policy.jsonc` 中编写需求； OpenClaw 观察活动工作空间作为证据；政策报告通过 `doctor --lint` 漂移。策略不会在请求时强制执行工具调用或重写运行时行为，并且不会证明每个代理的凭据存储（例如 `openclaw-agent.sqlite`）。

策略检查配置的通道，MCP服务器、模型提供商、网络SSRF姿势，ingress/channel访问、网关暴露和节点命令态势、编写的消息路由检查、代理工作区访问、沙箱态势、数据处理态势、秘密provider/auth配置文件状态和受控工具元数据（`## Tools`的部分`AGENTS.md`）。当工作区需要持久的、可检查的语句（例如“Telegram不得启用”或“受管理的工具必须声明风险和所有者元数据。”如果您只需要本地行为而无需证明或偏差检测，则简单的配置就足够了。

另外，[`openclaw agent exec`](/cli/agent#agent-exec) 为每次运行应用隔离的隐式策略配置：代理沙箱关闭，完全允许网关主机执行，并且文件系统工具仅限于 `--cwd`。

## <a id="detailed-topics"></a> 详细主题

<CardGroup cols={3}>
  <Card title="编写策略文件" href="/cli/policy/authoring" icon="pen">
    启用插件并写入 `policy.jsonc`，示例涵盖每个部分。
  </Card>
  <Card title="政策规则参考" href="/cli/policy/rules" icon="table-list">
    每个规则命名空间、它观察到的 OpenClaw 状态以及何时使用它。
  </Card>
  <Card title="范围覆盖" href="/cli/policy/scopes" icon="layer-group">
    让指定代理或渠道遵守比基线更严格的规则。
  </Card>
  <Card title="运行检查" href="/cli/policy/running-checks" icon="play">
    `policy check`、`policy compare` 以及它们背后的插件配置。
  </Card>
  <Card title="接受策略状态" href="/cli/policy/attestation" icon="stamp">
    证据、证明哈希和 `policy watch` 漂移检测。
  </Card>
  <Card title="调查结果及修复" href="/cli/policy/findings" icon="list-check">
    每次检查 ID、`doctor --fix` 修复的内容以及退出代码。
  </Card>
</CardGroup>

- <a id="quick-start"></a>[快速入门](/cli/policy/authoring#quick-start)
  - <a id="policy-rule-reference"></a>[政策规则参考](/cli/policy/rules#policy-rule-reference)
    - <a id="scoped-overlays"></a>[范围覆盖](/cli/policy/scopes#scoped-overlays)
    - <a id="channels"></a>[频道](/cli/policy/rules#channels)
    - <a id="mcp-servers"></a>[MCP 服务器](/cli/policy/rules#mcp-servers)
    - <a id="model-providers"></a>[模型提供商](/cli/policy/rules#model-providers)
    - <a id="network"></a>[网络](/cli/policy/rules#network)
    - <a id="message-routing"></a>[消息路由](/cli/policy/rules#message-routing)
    - <a id="ingress-and-channel-access"></a>[入口和通道接入](/cli/policy/rules#ingress-and-channel-access)
    - <a id="gateway"></a>[网关](/cli/policy/rules#gateway)
    - <a id="agent-workspace"></a>[代理工作区](/cli/policy/rules#agent-workspace)
    - <a id="sandbox-posture"></a>[沙盒姿势](/cli/policy/rules#sandbox-posture)
    - <a id="data-handling"></a>[数据 Handling](/cli/policy/rules#data-handling)
    - <a id="secrets"></a>[秘密](/cli/policy/rules#secrets)
    - <a id="exec-approvals"></a>[执行批准](/cli/policy/rules#exec-approvals)
    - <a id="auth-profiles"></a>[授权配置文件](/cli/policy/rules#auth-profiles)
    - <a id="tool-metadata"></a>[工具元数据](/cli/policy/rules#tool-metadata)
    - <a id="tool-posture"></a>[工具姿态](/cli/policy/rules#tool-posture)
- <a id="run-checks"></a>[运行检查](/cli/policy/running-checks#run-checks)
- <a id="configure-policy"></a>[配置策略](/cli/policy/running-checks#configure-policy)
- <a id="accept-policy-state"></a>[接受政策状态](/cli/policy/attestation#accept-policy-state)
- <a id="findings"></a>[调查结果](/cli/policy/findings#findings)
- <a id="repair"></a>[修复](/cli/policy/findings#repair)
- <a id="exit-codes"></a>[退出代码](/cli/policy/findings#exit-codes)

## <a id="related"></a> 相关内容

- [Doctor lint 模式](/cli/doctor#lint-mode)
- [路径 CLI](/cli/path)
- [政策插件参考](/plugins/reference/policy) - 添加这些政策支持的医生检查的插件
