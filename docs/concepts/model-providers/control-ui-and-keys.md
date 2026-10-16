---
summary: "从“设置”->“模型”配置提供程序、插件拥有的提供程序行为和 API 密钥轮换。"
read_when:
  - "您正在添加或替换 Control UI 中的提供商密钥"
  - "您想知道提供商插件拥有什么"
  - "您正在配置多个 API 密钥或轮换"
title: "Control UI 和 API 按键"
---

## <a id="configure-providers-in-the-control-ui"></a> 在 Control UI 中配置提供方

打开 Control UI 中的 **Settings → Models** 以添加、替换或删除提供程序 API 密钥。该页面和 `openclaw models auth paste-api-key` 使用相同的凭证编写器：密钥材料保留在身份验证存储中，配置的提供程序引用保存的配置文件。环境提供的密钥仍然由网关进程环境管理。该页面显示凭证来源，但不泄露密钥。

保存密钥和刷新目录是不同的结果。如果刷新失败，保存的key仍然存在；按照报告的恢复步骤进行操作。删除存储的密钥将保留模型默认值和提供商连接设置。有关匹配的 CLI 命令，请参阅 [Auth 配置文件](/cli/models#auth-profiles)。

在加载提供程序详细信息时，配置的全局模型默认值仍然可用。提供程序和已安装应用程序详细信息将保留其初始加载视图，直到凭据、模型目录、配置和已安装应用程序清单准备就绪。使用情况和本地成本随后独立加载，因此缓慢的使用响应不会阻止提供商设置。模型发现完成后，AI 设置摘要保持不变。

后台目录更新使当前提供者行和使用情况保持可见。完成登录更新该提供商的凭据，而无需重新启动其他提供商的使用或本地成本加载。如果另一个客户端在登录选择器打开时更改凭据，则页面会在您完成、取消或关闭登录时协调这些更改。使用 **Refresh** 显式重新加载所有提供程序数据。

帐户配额恢复后，模型可用性会反映已恢复的帐户，即使目录刷新在帐户被阻止时开始也是如此。

从页眉打开 **Model Setup** 以检查检测到的 AI 访问。如果可用，它会显示身份验证方法（API 密钥或帐户登录）以及提供商或本地运行时报告的实际电子邮件地址。 API 密钥和令牌保持隐藏状态。

使用 **测试连接** 运行实时提供商检查并查看延迟或分类身份验证、速率限制、计费、超时或响应错误。检查发出真实的提供商请求，并可能消耗少量令牌。 OAuth 和令牌配置文件也可以从提供商卡注销。

**Defaults** 卡管理已配置模型目录中的主要模型、实用模型、首次回退、思维级别和快速模式。更改会自动保存到现有的 `agents.defaults` 设置。对于实用新型，**Auto** 保留设置未设置，**Disabled** 存储空字符串以关闭公用设施路由。

如果模型发现失败，默认卡会显示报告的错误 **Retry**。当您重试时，您保存的模型选择仍然可用。

后备选择器编辑有序后备链中的第一个模型。替换它会保留任何已配置的后续后备。标签下方的计数显示了这些额外的后备措施。当存在多个回退时，**无回退模型**显示清除链时将删除多少个模型。使用 `openclaw models fallbacks` 管理完整的有序列表。

## <a id="plugin-owned-provider-behavior"></a> 提供商专属行为

大多数特定于提供者的逻辑位于提供者插件 （`registerProvider(...)`） 中，而 OpenClaw 保留通用推理循环。插件拥有入门、模型目录、身份验证环境变量映射、transport/config 规范化、工具架构清理、故障转移分类、OAuth 刷新、使用情况报告、thinking/reasoning 配置文件等。

有关提供商 SDK 钩子和捆绑插件示例的完整列表，请参阅[提供商插件](/plugins/sdk-provider-plugins)。需要完全自定义请求执行器的提供商属于更深层次的扩展领域。

<Note>
提供者拥有的运行器行为依赖于显式提供者挂钩，例如重放策略、工具模式规范化、流包装和 transport/request 帮助程序。旧版 `ProviderPlugin.capabilities` 静态包仅具有兼容性，并且不再由共享运行程序逻辑读取。
</Note>

## <a id="api-key-rotation"></a> API 密钥轮换

<AccordionGroup>
  <Accordion id="key-sources-and-priority" title="主要来源和优先事项">
    通过以下方式配置多个密钥：

    - `OPENCLAW_LIVE_<PROVIDER>_KEY`（单个实时覆盖，优先级最高）
    - `<PROVIDER>_API_KEYS`（逗号或分号分隔列表）
    - `<PROVIDER>_API_KEY`（主密钥）
    - `<PROVIDER>_API_KEY_*`（编号列表，e.g. `<PROVIDER>_API_KEY_1`）

    对于 Google 提供商，也会将 `GOOGLE_API_KEY` 作为回退项。密钥选择顺序会保留优先级并去重。

  </Accordion>
  <Accordion id="when-rotation-kicks-in" title="当旋转开始时">
    - 只有在速率限制响应时才会使用下一个密钥重试请求（例如 `429`、`rate_limit`、`quota`、`resource exhausted`、`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`，或周期性的用量限制消息）。
    - 非速率限制失败会立即失败；不会尝试密钥轮换。
    - 当所有候选密钥都失败时，返回最后一次尝试的最终错误。

  </Accordion>
</AccordionGroup>
