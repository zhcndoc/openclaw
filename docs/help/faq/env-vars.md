---
summary: "OpenClaw 如何加载环境变量以及为什么服务启动会丢失它们"
title: "环境变量和 .env 加载"
read_when:
  - "您正在通过 env 或 .env 设置 API 密钥"
  - "将网关作为服务启动后，您的环境变量消失了"
---

## <a id="env-vars-and-.env-loading"></a><a id="env-vars-and-env-loading"></a> 环境变量和 .env 加载

<AccordionGroup>
  <Accordion id="how-does-openclaw-load-environment-variables" title="OpenClaw如何加载环境变量？">
    OpenClaw 会从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 来自当前工作目录的 `.env`。
    - 来自 `~/.openclaw/.env` （`$OPENCLAW_STATE_DIR/.env`） 的全局回退 `.env`。

    通常，`.env` 文件都不会覆盖现有的环境变量。对于 OpenClaw- 安装的 systemd 服务，全局 `.env` 只能替换 OpenClaw 记录为托管的服务值；运营商拥有的服务价值仍然优先。提供程序凭证和端点路由密钥是工作区 `.env` 的例外：`GEMINI_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY` 等密钥或以 `_ENDPOINT` 结尾的任何密钥（以及其他捆绑提供程序身份验证或端点环境变量）在工作区 `.env` 中被忽略并且应该存在于进程环境 `~/.openclaw/.env` 或配置 `env.vars` 中。

    配置中的内联环境变量仅在进程环境中缺失时才会生效：

    ```json5
    {
      env: {
        vars: {
          OPENROUTER_API_KEY: "sk-or-...",
          GROQ_API_KEY: "gsk-...",
        },
      },
    }
    ```

    完整优先级和来源请参见 [/environment](/help/environment)。

  </Accordion>

  <Accordion id="i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now" title="我通过服务启动了网关，我的环境变量消失了。现在怎么办？">
    两种修复方法：

    1. 将缺失的键放到 `~/.openclaw/.env` 中，这样即使 service 没有继承你的 shell 环境也会加载。
    2. 启用 shell 导入（可选便利功能）：
       ```json5
       {
         env: {
           shellEnv: {
             enabled: true,
             timeoutMs: 15000,
           },
         },
       }
       ```
       这会运行你的登录 shell，并且只导入缺失的预期键（绝不会覆盖）。对应的环境变量为：`OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion id="i-set-copilot-github-token-but-models-status-shows-shell-env-off-why" title='我设置了 COPILOT_GITHUB_TOKEN，但模型状态显示“Shell env： off”。为什么？'>
    `openclaw models status` 会报告是否启用了**shell 环境导入**。"Shell env: off" 并**不**意味着你的环境变量丢失了——它只是表示 OpenClaw 不会自动加载你的登录 shell。

    如果 Gateway 作为 service（launchd/systemd）运行，它不会继承你的 shell 环境。解决方法是把 token 放到 `~/.openclaw/.env`，启用 `env.shellEnv.enabled: true`，或者将其添加到配置 `env` 中（仅在缺失时生效），然后重启 gateway 并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot 仅通过显式 `models.providers.github-copilot` 条目、保存的 Copilot 身份验证配置文件或 `COPILOT_GITHUB_TOKEN` 激活。通用 `GH_TOKEN` 和 `GITHUB_TOKEN` 变量不会启用或验证 Copilot。运行`openclaw models auth login --provider github-copilot`进行登录。

    参见 [/concepts/model-providers](/concepts/model-providers) 和 [/environment](/help/environment).

  </Accordion>
</AccordionGroup>
