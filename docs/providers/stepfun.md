---
summary: "使用 StepFun 模型与 OpenClaw"
read_when:
  - "您想要 OpenClaw 中的 StepFun 模型"
  - "你需要 StepFun 的设置指导"
title: "StepFun"
---

StepFun 作为外部官方插件（`@openclaw/stepfun-provider`）提供，包含两个 provider id：

- `stepfun` 为标准端点（models.dev 别名：`stepfun-ai`）
- `stepfun-plan` 用于步骤计划端点（models.dev 别名：`stepfun-ai-step-plan`）

<Warning>
标准版和 Step Plan 是**独立的提供方**，它们的端点和模型 ref 前缀不同（`stepfun/...` vs `stepfun-plan/...`）。`.com` 端点请使用中国密钥，`.ai` 端点请使用全球密钥。
</Warning>

## <a id="install-plugin"></a> 安装插件

```bash
openclaw plugins install @openclaw/stepfun-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="region-and-endpoint-overview"></a> 区域和端点概览

| 端点  | 中国（`.com`）                         | 全球（`.ai`）                        |
| --------- | -------------------------------------- | ------------------------------------- |
| 标准  | `https://api.stepfun.com/v1`           | `https://api.stepfun.ai/v1`           |
| 步骤计划 | `https://api.stepfun.com/step_plan/v1` | `https://api.stepfun.ai/step_plan/v1` |

认证环境变量：`STEPFUN_API_KEY`。

## <a id="built-in-catalog"></a> 内置目录

安装程序会保存连接设置和别名，而无需将生成的目录行复制到您的配置中。显式 `models.mode: "replace"` 保持目录播种启用；自定义模型行保持不变。

标准（`stepfun`）：

| 模型引用                | 上下文 | 最大输出 | 笔记                          |
| ------------------------ | ------- | ---------- | ------------------------------ |
| `stepfun/step-3.5-flash` | 262,144 | 65,536     | 默认标准模型         |
| `stepfun/step-3.7-flash` | 262,144 | 262,144    | 支持多模态图像输入 |

步骤计划（`stepfun-plan`）：

| 模型引用                          | 上下文 | 最大输出 | 笔记                          |
| ---------------------------------- | ------- | ---------- | ------------------------------ |
| `stepfun-plan/step-3.5-flash`      | 262,144 | 65,536     | 默认 Step Plan 模型        |
| `stepfun-plan/step-3.7-flash`      | 262,144 | 262,144    | 支持多模态图像输入 |
| `stepfun-plan/step-3.5-flash-2603` | 262,144 | 65,536     | 额外的 Step Plan 模型     |

## <a id="getting-started"></a> 入门

<Tabs>
  <Tab id="standard" title="标准">
    通过标准 StepFun 端点进行通用用途使用的最佳选择。

    <Steps>
      <Step id="choose-your-endpoint-region" title="选择您的端点区域">
        | 认证选项                    | 端点                     | 区域        |
        | -------------------------------- | ----------------------------- | -------------- |
        | `stepfun-standard-api-key-intl` | `https://api.stepfun.ai/v1`  | 国际 |
        | `stepfun-standard-api-key-cn`   | `https://api.stepfun.com/v1` | 中国          |
      </Step>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl
        ```

        中国端点：

        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-cn
        ```
      </Step>
      <Step id="non-interactive-alternative" title="非交互式替代方案">
        ```bash
        openclaw onboard --non-interactive --accept-risk --skip-health \
          --auth-choice stepfun-standard-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step id="verify-models-are-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider stepfun
        ```
      </Step>
    </Steps>

    默认模型：`stepfun/step-3.5-flash` 备用模型：`stepfun/step-3.7-flash`

  </Tab>

  <Tab id="step-plan" title="步骤计划">
    适用于 Step Plan 推理端点的最佳选择。

    <Steps>
      <Step id="choose-your-endpoint-region-1" title="选择您的端点区域">
        | 认证选项                 | 端点                                | 区域        |
        | ------------------------------ | ------------------------------------------ | -------------- |
        | `stepfun-plan-api-key-intl` | `https://api.stepfun.ai/step_plan/v1`  | 国际 |
        | `stepfun-plan-api-key-cn`   | `https://api.stepfun.com/step_plan/v1` | 中国          |
      </Step>
      <Step id="run-onboarding-1" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl
        ```

        中国端点：

        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-cn
        ```
      </Step>
      <Step id="non-interactive-alternative-1" title="非交互式替代方案">
        ```bash
        openclaw onboard --non-interactive --accept-risk --skip-health \
          --auth-choice stepfun-plan-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step id="verify-models-are-available-1" title="验证模型是否可用">
        ```bash
        openclaw models list --provider stepfun-plan
        ```
      </Step>
    </Steps>

    默认模型：`stepfun-plan/step-3.5-flash` 备用模型：`stepfun-plan/step-3.7-flash`、`stepfun-plan/step-3.5-flash-2603`

  </Tab>
</Tabs>

一次认证流程会为 `stepfun` 和 `stepfun-plan` 写入与区域匹配的配置文件，因此在一次初始化运行后即可同时发现这两个端点。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="full-config-standard-provider" title="完整配置：标准提供商">
    ```json5
    {
      env: { vars: { STEPFUN_API_KEY: "your-key" } },
      agents: { defaults: { model: { primary: "stepfun/step-3.5-flash" } } },
      models: {
        mode: "merge",
        providers: {
          stepfun: {
            baseUrl: "https://api.stepfun.ai/v1",
            api: "openai-completions",
            apiKey: "${STEPFUN_API_KEY}",
            models: [
              {
                id: "step-3.7-flash",
                name: "Step 3.7 Flash",
                reasoning: true,
                input: ["text", "image"],
                thinkingLevelMap: { off: "low", minimal: "low", xhigh: "high", max: "high" },
                cost: { input: 0.2, output: 1.15, cacheRead: 0.04, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
                reasoning: true,
                input: ["text"],
                cost: { input: 0.1, output: 0.3, cacheRead: 0.02, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion id="full-config-step-plan-provider" title="完整配置：步骤计划提供者">
    ```json5
    {
      env: { vars: { STEPFUN_API_KEY: "your-key" } },
      agents: { defaults: { model: { primary: "stepfun-plan/step-3.5-flash" } } },
      models: {
        mode: "merge",
        providers: {
          "stepfun-plan": {
            baseUrl: "https://api.stepfun.ai/step_plan/v1",
            api: "openai-completions",
            apiKey: "${STEPFUN_API_KEY}",
            models: [
              {
                id: "step-3.7-flash",
                name: "Step 3.7 Flash",
                reasoning: true,
                input: ["text", "image"],
                thinkingLevelMap: { off: "low", minimal: "low", xhigh: "high", max: "high" },
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
              {
                id: "step-3.5-flash-2603",
                name: "Step 3.5 Flash 2603",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion id="notes" title="笔记">
    - `step-3.7-flash` 接受通过 OpenClaw 输入的文本和图像。 StepFun 的 API 还支持视频，而 OpenClaw 未将视频声明为 StepFun 模型的输入模式。
    - Step 3.7 支持 `low`、`medium` 和 `high` 推理强度。由于该模型没有非推理模式，`/think off` 会映射为 `low`。
    - `step-3.5-flash-2603` 仅在 `stepfun-plan` 上公开。
    - 使用 `openclaw models list` 和 `openclaw models set <provider/model>` 来查看或切换模型。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    所有提供程序、模型引用和故障转移行为的概述。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    提供程序、模型和插件的完整配置架构。
  </Card>
  <Card title="模型 CLI" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="StepFun平台" href="https://platform.stepfun.com" icon="globe">
    StepFun API 密钥管理和文档。
  </Card>
</CardGroup>
