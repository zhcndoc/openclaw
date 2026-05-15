---
summary: "Tencent Cloud TokenHub for Hy3 preview setup"
title: "Tencent Cloud (TokenHub)"
read_when:
  - You want to use Tencent Hy3 preview in OpenClaw
  - You need to set up a TokenHub API key
---

Tencent Cloud is provided with OpenClaw as a bundled provider plugin. It uses the OpenAI-compatible API via the TokenHub endpoint (`tencent-tokenhub`) to give you access to the Tencent Hy3 preview.

| Property         | Value                                              |
| ---------------- | -------------------------------------------------- |
| Provider id      | `tencent-tokenhub`                                 |
| Plugin           | bundled, `enabledByDefault: true`                 |
| Auth env var     | `TOKENHUB_API_KEY`                                 |
| Onboarding flag  | `--auth-choice tokenhub-api-key`                   |
| Direct CLI flag  | `--tokenhub-api-key <key>`                         |
| API              | OpenAI-compatible (`openai-completions`)          |
| Default base URL | `https://tokenhub.tencentmaas.com/v1`              |
| Global base URL  | `https://tokenhub-intl.tencentmaas.com/v1` (override) |
| Default model    | `tencent-tokenhub/hy3-preview`                    |

## Quick start

<Steps>
  <Step title="Create a TokenHub API key">
    Create an API key in Tencent Cloud TokenHub. If you choose a limited access scope for this key, include **Hy3 preview** in the allowed models.
  </Step>
  <Step title="Run onboarding">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice tokenhub-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY"
```

```bash Env only
export TOKENHUB_API_KEY=...
```

    </CodeGroup>

  </Step>
  <Step title="Verify models">
    ```bash
    openclaw models list --provider tencent-tokenhub
    ```
  </Step>
</Steps>

## Non-interactive setup

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice tokenhub-api-key \
  --tokenhub-api-key "$TOKENHUB_API_KEY" \
  --skip-health \
  --accept-risk
```

## Built-in catalog

| Model reference                 | Name                      | Input | Context   | Max output | Notes                    |
| ------------------------------ | ------------------------- | ----- | --------- | ---------- | ------------------------ |
| `tencent-tokenhub/hy3-preview` | Hy3 preview (TokenHub)    | Text  | 256,000   | 64,000     | Default; supports reasoning |

Hy3 preview is a large MoE language model from Tencent Hunyuan, suitable for reasoning, long-context instruction following, code, and agent workflows. Tencent's OpenAI-compatible example uses `hy3-preview` as the model id and supports standard chat-completions tool calling as well as `reasoning_effort`.

<Tip>
  The model id is `hy3-preview`. Do not confuse it with Tencent's `HY-3D-*` models, which are 3D generation APIs and not the OpenClaw chat model configured by this provider.
</Tip>

## Tiered pricing

The bundled catalog includes tiered cost metadata that varies with input window length, so cost estimates can be populated without manual overrides.

| Input token range | Input rate | Output rate | Cache read |
| ----------------- | ---------- | ---------- | ---------- |
| 0 - 16,000        | 0.176      | 0.587      | 0.059      |
| 16,000 - 32,000   | 0.235      | 0.939      | 0.088      |
| 32,000+           | 0.293      | 1.173      | 0.117      |

Rates are calculated according to Tencent's published standard, in USD per million tokens. Override pricing under `models.providers.tencent-tokenhub` only if you need a different display.

## Advanced configuration

<AccordionGroup>
  <Accordion title="Endpoint override">
    OpenClaw uses Tencent Cloud's `https://tokenhub.tencentmaas.com/v1` endpoint by default. Tencent also provides an international TokenHub endpoint:

    ```bash
    openclaw config set models.providers.tencent-tokenhub.baseUrl "https://tokenhub-intl.tencentmaas.com/v1"
    ```

    Override this endpoint only if your TokenHub account or region requires it.

  </Accordion>

  <Accordion title="Daemon environment availability">
    If the Gateway runs as a managed service (launchd, systemd, Docker), `TOKENHUB_API_KEY` must be visible to that process. Set it in `~/.openclaw/.env`, or via `env.shellEnv`, so launchd, systemd, or Docker exec environments can read it.

    <Warning>
      仅在交互式 shell 中导出的密钥对受管理的 gateway 进程不可见。请使用 env 文件或 config seam 以确保持久可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## Related content

<CardGroup cols={2}>
  <Card title="Model providers" href="/concepts/model-providers" icon="layers">
    Choose providers, model references, and failover behavior.
  </Card>
  <Card title="Configuration reference" href="/gateway/configuration" icon="gear">
    Full configuration schema including provider settings.
  </Card>
  <Card title="Tencent TokenHub" href="https://cloud.tencent.com/product/tokenhub" icon="arrow-up-right-from-square">
    Product page for Tencent Cloud TokenHub.
  </Card>
  <Card title="Hy3 preview model card" href="https://huggingface.co/tencent/Hy3-preview" icon="square-poll-horizontal">
    Details and benchmarks for Tencent Hunyuan Hy3 preview.
  </Card>
</CardGroup>