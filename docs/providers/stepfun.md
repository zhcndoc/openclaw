---
summary: "在 OpenClaw 中使用 StepFun 模型"
read_when:
  - 你希望在 OpenClaw 中使用 StepFun 模型
  - 你需要 StepFun 的设置指导
title: "StepFun"
---

StepFun 提供方插件支持两个 provider id：

- `stepfun` 用于标准端点
- `stepfun-plan` 用于 Step Plan 端点

<Warning>
标准版和 Step Plan 是**独立的提供方**，它们的端点和模型 ref 前缀不同（`stepfun/...` vs `stepfun-plan/...`）。`.com` 端点请使用中国密钥，`.ai` 端点请使用全球密钥。
</Warning>

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/stepfun-provider
openclaw gateway restart
```

## 区域和端点概览

| Endpoint  | China (`.com`)                         | Global (`.ai`)                        |
| --------- | -------------------------------------- | ------------------------------------- |
| Standard  | `https://api.stepfun.com/v1`           | `https://api.stepfun.ai/v1`           |
| Step Plan | `https://api.stepfun.com/step_plan/v1` | `https://api.stepfun.ai/step_plan/v1` |

认证环境变量：`STEPFUN_API_KEY`

## 内置目录

Standard (`stepfun`)：

| Model ref                | Context | Max output | Notes                  |
| ------------------------ | ------- | ---------- | ---------------------- |
| `stepfun/step-3.5-flash` | 262,144 | 65,536     | 默认标准模型 |

Step Plan (`stepfun-plan`)：

| Model ref                          | Context | Max output | Notes                      |
| ---------------------------------- | ------- | ---------- | -------------------------- |
| `stepfun-plan/step-3.5-flash`      | 262,144 | 65,536     | 默认 Step Plan 模型    |
| `stepfun-plan/step-3.5-flash-2603` | 262,144 | 65,536     | 额外的 Step Plan 模型 |

## 快速开始

选择你的提供方入口并按照设置步骤进行。

<Tabs>
  <Tab title="Standard">
    **最适合：** 通过标准 StepFun 端点进行通用用途。

    <Steps>
      <Step title="选择你的端点区域">
        | Auth choice                      | Endpoint                         | Region        |
        | -------------------------------- | -------------------------------- | ------------- |
        | `stepfun-standard-api-key-intl`  | `https://api.stepfun.ai/v1`     | International |
        | `stepfun-standard-api-key-cn`    | `https://api.stepfun.com/v1`    | China         |
      </Step>
      <Step title="运行初始化">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl
        ```

        或者对于中国端点：

        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-cn
        ```
      </Step>
      <Step title="非交互式替代方案">
        ```bash
        openclaw onboard --auth-choice stepfun-standard-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider stepfun
        ```
      </Step>
    </Steps>

    ### 模型 refs

    - 默认模型：`stepfun/step-3.5-flash`

  </Tab>

  <Tab title="Step Plan">
    **最适合：** Step Plan 推理端点。

    <Steps>
      <Step title="选择你的端点区域">
        | Auth choice                  | Endpoint                                | Region        |
        | ---------------------------- | --------------------------------------- | ------------- |
        | `stepfun-plan-api-key-intl`  | `https://api.stepfun.ai/step_plan/v1`  | International |
        | `stepfun-plan-api-key-cn`    | `https://api.stepfun.com/step_plan/v1` | China         |
      </Step>
      <Step title="运行初始化">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl
        ```

        或者对于中国端点：

        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-cn
        ```
      </Step>
      <Step title="非交互式替代方案">
        ```bash
        openclaw onboard --auth-choice stepfun-plan-api-key-intl \
          --stepfun-api-key "$STEPFUN_API_KEY"
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider stepfun-plan
        ```
      </Step>
    </Steps>

    ### 模型 refs

    - 默认模型：`stepfun-plan/step-3.5-flash`
    - 备用模型：`stepfun-plan/step-3.5-flash-2603`

  </Tab>
</Tabs>

## 高级配置

<AccordionGroup>
  <Accordion title="完整配置：标准提供方">
    ```json5
    {
      env: { STEPFUN_API_KEY: "your-key" },
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
                id: "step-3.5-flash",
                name: "Step 3.5 Flash",
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

  <Accordion title="完整配置：Step Plan 提供方">
    ```json5
    {
      env: { STEPFUN_API_KEY: "your-key" },
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

  <Accordion title="备注">
    - 该提供方是一个官方外部包；请在设置前先安装。
    - `step-3.5-flash-2603` 当前仅在 `stepfun-plan` 上可用。
    - 单一认证流程会为 `stepfun` 和 `stepfun-plan` 都写入与区域匹配的配置文件，因此两个入口可以一起被发现。
    - 使用 `openclaw models list` 和 `openclaw models set <provider/model>` 来查看或切换模型。

  </Accordion>
</AccordionGroup>

<Note>
如需更广泛的提供方概览，请参阅 [模型提供方](/concepts/model-providers)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供方、模型 refs 和故障转移行为的概览。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    提供方、模型和插件的完整配置模式。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="StepFun 平台" href="https://platform.stepfun.com" icon="globe">
    StepFun API 密钥管理和文档。
  </Card>
</CardGroup>
