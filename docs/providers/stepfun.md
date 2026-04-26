---
summary: "在 OpenClaw 中使用 StepFun 模型"
read_when:
  - 你想在 OpenClaw 中使用 StepFun 模型
  - 你需要 StepFun 设置指南
title: "StepFun"
---

OpenClaw 包含一个内置的 StepFun 提供商插件，提供两个提供商 id：

- `stepfun` 用于标准端点
- `stepfun-plan` 用于步计划端点

<Warning>
标准和步计划是**独立的提供商**，具有不同的端点和模型引用前缀（`stepfun/...` 与 `stepfun-plan/...`）。使用中国密钥配合 `.com` 端点，使用全球密钥配合 `.ai` 端点。
</Warning>

## 区域和端点概述

| 端点  | 中国 (`.com`)                         | 全球 (`.ai`)                        |
| --------- | -------------------------------------- | ------------------------------------- |
| 标准  | `https://api.stepfun.com/v1`           | `https://api.stepfun.ai/v1`           |
| 步计划 | `https://api.stepfun.com/step_plan/v1` | `https://api.stepfun.ai/step_plan/v1` |

认证环境变量：`STEPFUN_API_KEY`

## 内置目录

标准 (`stepfun`)：

| 模型引用                | 上下文 | 最大输出 | 备注                  |
| ------------------------ | ------- | ---------- | ---------------------- |
| `stepfun/step-3.5-flash` | 262,144 | 65,536     | 默认标准模型 |

步计划 (`stepfun-plan`)：

| 模型引用                          | 上下文 | 最大输出 | 备注                      |
| ---------------------------------- | ------- | ---------- | -------------------------- |
| `stepfun-plan/step-3.5-flash`      | 262,144 | 65,536     | 默认步计划模型    |
| `stepfun-plan/step-3.5-flash-2603` | 262,144 | 65,536     | 额外步计划模型 |

## 开始使用

选择你的提供商接口类型并按照设置步骤操作。

<Tabs>
  <Tab title="标准">
    **适用于：** 通过标准 StepFun 端点进行通用用途。

    <Steps>
      <Step title="选择你的端点区域">
        | 认证选项                      | 端点                         | 区域        |
        | -------------------------------- | -------------------------------- | ------------- |
        | `stepfun-standard-api-key-intl`  | `https://api.stepfun.ai/v1`     | 国际 |
        | `stepfun-standard-api-key-cn`    | `https://api.stepfun.com/v1`    | 中国         |
      </Step>
      <Step title="运行初始化引导">
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

    ### 模型引用

    - 默认模型：`stepfun/step-3.5-flash`

  </Tab>

  <Tab title="步计划">
    **适用于：** 步计划推理端点。

    <Steps>
      <Step title="选择你的端点区域">
        | 认证选项                  | 端点                                | 区域        |
        | ---------------------------- | --------------------------------------- | ------------- |
        | `stepfun-plan-api-key-intl`  | `https://api.stepfun.ai/step_plan/v1`  | 国际 |
        | `stepfun-plan-api-key-cn`    | `https://api.stepfun.com/step_plan/v1` | 中国         |
      </Step>
      <Step title="运行初始化引导">
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

    ### 模型引用

    - 默认模型：`stepfun-plan/step-3.5-flash`
    - 备用模型：`stepfun-plan/step-3.5-flash-2603`

  </Tab>
</Tabs>

## 高级配置

<AccordionGroup>
  <Accordion title="完整配置：标准提供商">
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

  <Accordion title="完整配置：步计划提供商">
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
    - 该提供商与 OpenClaw 捆绑，因此没有单独的插件安装步骤。
    - `step-3.5-flash-2603` 目前仅在 `stepfun-plan` 上暴露。
    - 单个认证流程会为 `stepfun` 和 `stepfun-plan` 写入区域匹配的配置文件，因此可以同时发现这两个接口。
    - 使用 `openclaw models list` 和 `openclaw models set <provider/model>` 来检查或切换模型。
  </Accordion>
</AccordionGroup>

<Note>
有关更广泛的提供商概述，请参阅 [模型提供商](/concepts/model-providers)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有提供商、模型引用和故障转移行为概览。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    提供商、模型和插件的完整配置架构。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="StepFun 平台" href="https://platform.stepfun.com" icon="globe">
    StepFun API 密钥管理和文档。
  </Card>
</CardGroup>
