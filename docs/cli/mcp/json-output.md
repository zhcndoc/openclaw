---
summary: "JSON openclaw mcp 状态、医生和检查的输出形状"
title: "JSON 输出形状"
read_when:
  - "在 `openclaw mcp --json` 输出上编写脚本或构建仪表板"
  - "检查哪些字段`status`、`doctor`或`probe`报告"
---

这些是注册表读取命令发出的机器可读形状，以及它们描述的保存的服务器配置形状。

## <a id="json-output-shapes"></a> JSON 输出形状

脚本和仪表盘请使用 `--json`。字段集可能会随着时间增长，因此消费者应忽略未知键。

读取命令将无效配置、未知服务器和禁用命名检查报告为 `{ "ok": false, "error": { "type": "cli_error", "message": "..." } }`，并带有非零退出。一旦 `doctor` 或 `probe` 生成报告，错误将保留在该报告中，而不是生成第二个 JSON 文档。

<AccordionGroup>
  <Accordion id="status-json" title="状态 --json">
    ```json
    {
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "configured": true,
          "enabled": true,
          "ok": true,
          "transport": "streamable-http",
          "launch": "streamable-http https://mcp.example.com/mcp",
          "auth": "oauth",
          "authStatus": {
            "hasTokens": true,
            "requiresAuthorization": false,
            "hasClientInformation": true,
            "hasCodeVerifier": false,
            "hasDiscoveryState": true,
            "hasLastAuthorizationUrl": false,
            "state": "authorized"
          },
          "requestTimeoutMs": 20000,
          "connectionTimeoutMs": 5000,
          "toolFilter": {
            "include": ["search", "read_*"],
            "exclude": []
          },
          "supportsParallelToolCalls": true
        }
      ]
    }
    ```
  </Accordion>
  <Accordion id="doctor-json" title="医生--json">
    ```json
    {
      "ok": true,
      "path": "/home/user/.openclaw/openclaw.json",
      "servers": [
        {
          "name": "docs",
          "ok": true,
          "issues": [
            {
              "level": "warning",
              "message": "OAuth credentials are not authorized; run openclaw mcp login docs"
            }
          ]
        }
      ]
    }
    ```

    当任何已启用的检查服务器出现 `error`-level 问题时，`doctor --json` 退出非零。报告 `warning` 和 `info` 问题，但不会使命令本身失败。

  </Accordion>
  <Accordion id="probe-json" title="探头--json">
    ```json
    {
      "generatedAt": "2026-05-31T09:00:00.000Z",
      "servers": {
        "docs": {
          "launch": "streamable-http https://mcp.example.com/mcp",
          "tools": 2,
          "codexApprovalMode": "auto",
          "approvalHint": "tools have no safety annotations; calls require approval in prompting session postures",
          "resources": true,
          "listChanged": {
            "tools": true,
            "resources": false,
            "prompts": false
          }
        }
      },
      "tools": ["docs__read_page", "docs__search"],
      "diagnostics": []
    }
    ```

    `probe --json` 打开实时 MCP 客户端会话并直接打印其结果；与 `status`/`doctor` 不同，输出没有顶级 `path` 字段。每台服务器均包含其有效的`codexApprovalMode`；当该模式为 `auto` 并且发现的工具没有安全注释时，会出现 `approvalHint`。提示描述的是提示姿势下的批准要求，而不是默认的完全权限姿势。仅当服务器实际通告该功能时，`resources` 和 `prompts` 密钥才会出现（没有提示的服务器会忽略 `prompts` 密钥，而不是报告 `false`）。当诊断存在或选定的启用服务器未连接时，该命令会在退出非零之前打印完整的结果，因此自动化可以检查部分成功。使用 `probe` 进行可达性和功能证明，而不是用于静态配置审核。

  </Accordion>
</AccordionGroup>

示例配置形状：

```json
{
  "mcp": {
    "servers": {
      "context7": {
        "command": "uvx",
        "args": ["context7-mcp"]
      },
      "docs": {
        "url": "https://mcp.example.com",
        "transport": "streamable-http",
        "requestTimeoutMs": 20000,
        "connectionTimeoutMs": 5000,
        "supportsParallelToolCalls": true,
        "auth": "oauth",
        "oauth": {
          "scope": "docs.read"
        },
        "sslVerify": true,
        "clientCert": "/path/to/client.crt",
        "clientKey": "/path/to/client.key",
        "toolFilter": {
          "include": ["search_*"],
          "exclude": ["admin_*"]
        },
        "codex": {
          "defaultToolsApprovalMode": "approve"
        }
      }
    }
  }
}
```
