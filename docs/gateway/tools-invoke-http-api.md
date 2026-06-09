---
summary: "Invoke a single tool directly through the Gateway HTTP endpoint"
read_when:
  - when calling tools without running a full agent turn
  - when building automation that needs tool-policy enforcement
title: "Tool Invocation API"
---

OpenClaw’s Gateway provides a simple HTTP endpoint for invoking a single tool directly. It is always enabled and uses Gateway authentication plus tool policy. As with the OpenAI-compatible `/v1/*` surface, shared-secret bearer authentication is treated as full trusted-operator access for the gateway.

- `POST /tools/invoke`
- Same port as Gateway (WS + HTTP multiplexed): `http://<gateway-host>:<port>/tools/invoke`

The default maximum payload size is 2 MB.

## Authentication

Use the Gateway authentication configuration.

Common HTTP authentication modes:

- Shared-secret authentication (`gateway.auth.mode="token"` or `"password"`):
  `Authorization: Bearer <token-or-password>`
- Trusted, identity-bearing HTTP authentication (`gateway.auth.mode="trusted-proxy"`):
  Route the request through the configured identity-aware proxy and let it inject the required identity headers
- Private-ingress open authentication (`gateway.auth.mode="none"`):
  No authentication header required

Notes:

- When `gateway.auth.mode="token"`, use `gateway.auth.token` (or `OPENCLAW_GATEWAY_TOKEN`).
- When `gateway.auth.mode="password"`, use `gateway.auth.password` (or `OPENCLAW_GATEWAY_PASSWORD`).
- When `gateway.auth.mode="trusted-proxy"`, the HTTP request must come from a configured trusted proxy source; loopback proxying on the same host requires explicitly setting `gateway.auth.trustedProxy.allowLoopback = true`.
- Same-host internal calls that bypass the proxy can use `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD` as a local direct-connect fallback. Any `Forwarded`, `X-Forwarded-*`, or `X-Real-IP` header evidence keeps the request on the trusted-proxy path.
- If `gateway.auth.rateLimit` is configured and too many authentication failures occur, the endpoint returns `429` with `Retry-After`.

## Security boundary (important)

Treat this endpoint as **full operator access** to the gateway instance.

- The HTTP bearer auth here is not a narrow per-user scope model.
- A valid Gateway token/password for this endpoint should be treated as owner/operator credentials.
- For shared-secret authentication modes (`token` and `password`), the endpoint restores the normal full operator default values even if the caller sends narrower `x-openclaw-scopes` headers.
- Shared-secret authentication also treats direct tool calls on this endpoint as owner-sender turns.
- Trusted, identity-bearing HTTP modes (for example trusted-proxy auth, or `gateway.auth.mode="none"` on private ingress) honor `x-openclaw-scopes` when present, otherwise they fall back to the normal operator default scope set.
- Only place this endpoint on loopback/tailnet/private ingress; do not expose it directly to the public internet.

Authentication matrix:

- `gateway.auth.mode="token"` or `"password"` + `Authorization: Bearer ...`
  - Proves possession of the shared gateway operator secret
  - Ignores narrower `x-openclaw-scopes`
  - Restores the full default operator scope set:
    `operator.admin`, `operator.approvals`, `operator.pairing`,
    `operator.read`, `operator.talk.secrets`, `operator.write`
  - Treats direct tool calls on this endpoint as owner-sender turns
- Trusted, identity-bearing HTTP modes (for example trusted-proxy auth, or `gateway.auth.mode="none"` on private ingress)
  - Authenticates some externally trusted identity or deployment boundary
  - Honors `x-openclaw-scopes` when present in the request headers
  - Falls back to the normal operator default scope set when request headers are absent
  - Only loses owner semantics when the caller explicitly narrows scopes and omits `operator.admin`

## Request body

```json
{
  "tool": "sessions_list",
  "action": "json",
  "args": {},
  "sessionKey": "main",
  "dryRun": false
}
```

Fields:

- `tool` (string, required): The tool name to invoke.
- `action` (string, optional): If the tool schema supports `action` and it is omitted from the args payload, it will be mapped into `args`.
- `args` (object, optional): Tool-specific parameters.
- `sessionKey` (string, optional): Target session key. If omitted or `"main"`, Gateway uses the configured primary session key (respecting `session.mainKey` and the default agent, or `global` in global scope).
- `dryRun` (boolean, optional): Reserved for future use; currently ignored.

## Policy + routing behavior

Tool availability is filtered through the same policy chain used by Gateway agents:

- `tools.profile` / `tools.byProvider.profile`
- `tools.allow` / `tools.byProvider.allow`
- `agents.<id>.tools.allow` / `agents.<id>.tools.byProvider.allow`
- Group policy (if the session key maps to a group or channel)
- Sub-agent policy (when invoking with a sub-agent session key)

If a tool is not allowed by policy, the endpoint returns **404**.

Important boundary notes:

- Exec approval is an operator guardrail, not a separate authorization boundary for this HTTP endpoint. Once it is reachable here through Gateway auth + tool policy, `/tools/invoke` does not add per-call approval prompts.
- If `exec` is accessible here, treat it as a mutable shell surface. Even if `write`, `edit`, `apply_patch`, or HTTP file-write tools are denied, shell execution is not thereby read-only.
- Do not share Gateway bearer credentials with untrusted callers. If you need isolation across trust boundaries, run a separate gateway (ideally with a separate OS user/host as well).

Gateway HTTP also applies a hard deny list by default, even if the session policy allows the tool:

- `exec` - direct command execution (RCE surface)
- `spawn` - arbitrary subprocess creation (RCE surface)
- `shell` - shell command execution (RCE surface)
- `fs_write` - modify arbitrary files on the host
- `fs_delete` - delete arbitrary files on the host
- `fs_move` - move/rename arbitrary files on the host
- `apply_patch` - patch application may rewrite arbitrary files
- `sessions_spawn` - session orchestration; remotely starting agents is RCE
- `sessions_send` - cross-session message injection
- `cron` - persistent automation control plane
- `gateway` - gateway control plane; prevents reconfiguration over HTTP
- `nodes` - node command forwarding can reach `system.run` on paired hosts
- `whatsapp_login` - interactive setup that requires scanning a QR code at a terminal; it would hang over HTTP

You can customize this deny list via `gateway.tools`:

```json5
{
  gateway: {
    tools: {
      // Additional tools blocked via HTTP /tools/invoke
      deny: ["browser"],
      // Remove tools from the default deny list for owner/admin callers
      allow: ["gateway"],
    },
  },
}
```

`gateway.tools.allow` is an exposure override, not a scope upgrade. In
identity-bearing HTTP modes, `cron`, `gateway`, and `nodes` remain unavailable
to callers that do not have owner/admin identity (`operator.admin`) even when
they are listed in `gateway.tools.allow`. Shared-secret bearer auth still follows
the full trusted-operator rule above.

To help group policies resolve context, you can optionally set:

- `x-openclaw-message-channel: <channel>` (examples: `slack`, `telegram`)
- `x-openclaw-account-id: <accountId>` (when multiple accounts exist)

## Response

- `200` → `{ ok: true, result }`
- `400` → `{ ok: false, error: { type, message } }` (invalid request or tool input error)
- `401` → unauthorized
- `429` → authentication rate limited (`Retry-After` set)
- `404` → tool unavailable (not found or not on the allow list)
- `405` → method not allowed
- `500` → `{ ok: false, error: { type, message } }` (unexpected tool execution error; cleaned-up message)

## Examples

```bash
curl -sS http://127.0.0.1:18789/tools/invoke \
  -H 'Authorization: Bearer secret' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "sessions_list",
    "action": "json",
    "args": {}
  }'
```

## Related

- [Gateway protocol](/gateway/protocol)
- [Tools and plugins](/tools)
