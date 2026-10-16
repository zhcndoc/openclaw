---
summary: "SecretRef 源、id 语法、验证规则和提供者配置"
read_when:
  - "为提供者凭证和 SQLite 身份验证配置文件引用编写 SecretRefs"
  - "配置 env、file、exec 和 store 提供程序"
title: "SecretRef 合约和提供商配置"
---

此页面是 SecretRef 参考：接受的源及其 id 语法、验证规则以及支持它们的提供程序配置块。

## <a id="secretref-contract"></a> SecretRef 合约

一个对象形状，处处通用：

```json5
{ source: "env" | "file" | "exec" | "store", provider: "default", id: "..." }
```

`env` 和 `store` 引用在其源的有效默认别名处有一个隐式提供程序：`secrets.defaults.env` 或 `secrets.defaults.store`，未设置时回退到 `default`。匹配的同源 `secrets.providers` 条目优先；否则，引用将使用内置读取器，而无需提供程序条目。

结构化参考文献始终包含 `provider`。对于仅包含 `source` 和 `id` 的旧对象运行 `openclaw doctor --fix`。 Doctor 将源的配置默认提供程序添加到注册的配置凭据中。存储的身份验证配置文件引用保留其历史 `default` 提供程序，独立于配置默认值。 Doctor 在重写之前备份配置和身份验证数据库；更新运行相同的修复。插件 SDK 的输入强制保持兼容，并且 SDK auth 以当前格式写入保存引用。

SecretRefs 恰好包含这三个字段。如果注册的配置凭证或身份验证配置文件中较旧的无提供程序引用包含其他字段，Doctor 会报告其删除情况，并在写入当前格式的引用之前在其备份或源存档中保留原始配置或身份验证行。注册凭证路径之外的不透明值保持不变。新的 SDK 身份验证写入在更改存储或发布状态之前拒绝扩展输入。单独保留该元数据并在保存之前显式调用 `coerceSecretRef` 以选择当前格式引用。

其他别名和所有 `file`/`exec` 引用需要具有相同 `source` 的注册 `secrets.providers` 条目。更改源的默认值不会重写显式引用：覆盖后仍命名为 `default` 的引用必须与注册的相同源提供程序匹配，否则解析失败。

<Tabs>
  <Tab id="env" title="环境">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    SecretInput 字段也接受简写字符串：

    ```json5
    "${OPENAI_API_KEY}"
    "$OPENAI_API_KEY"
    ```

    校验：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Z][A-Z0-9_]{0,127}$`

  </Tab>
  <Tab id="file" title="文件">
    ```json5
    { source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
    ```

    校验：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须是绝对 JSON 指针 （`/...`），或者 `singleValue` 提供程序的文字 `value`
    - 分段中的 RFC 6901 转义：`~` 变为 `~0`，`/` 变为 `~1`

  </Tab>
  <Tab id="exec" title="执行">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey#value" }
    ```

    校验：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 必须匹配 `^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支持诸如 `secret#json_key` 之类的选择器）
    - `id` 不能包含 `.` 或 `..` 作为由斜杠分隔的路径段（例如 `a/../b` 会被拒绝）

  </Tab>
  <Tab id="store" title="店铺">
    ```json5
    { source: "store", provider: "default", id: "OPENAI_API_KEY" }
    ```

    校验：

    - `provider` 必须匹配 `^[a-z][a-z0-9_-]{0,63}$`
    - `id` 使用环境变量名称语法 `^[A-Z][A-Z0-9_]{0,127}$`
    - 仅解决了网关范围的团队范围

  </Tab>
</Tabs>

## <a id="provider-config"></a> Provider 配置

在 `secrets.providers` 下定义 provider：

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      teamstore: { source: "store" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // or "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
      "team-secrets": {
        source: "exec",
        pluginIntegration: {
          pluginId: "acme-secrets",
          integrationId: "secret-store",
        },
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
      store: "teamstore",
    },
  },
}
```

Provider 别名具有源特定性。匹配的显式 provider 条目优先；如果某个 `env` 或 `store` 默认别名也被另一个源的条目使用，则该源的内置 provider 优先。非默认别名以及 `file` 或 `exec` provider 必须解析为具有匹配源的显式条目。

只读检查无需打开数据库即可识别有效的 `store` 绑定。这是配置证据，而不是该值存在的证明：凭证可用性在运行时解决之前保持未知。

<Accordion id="env-provider" title="环境提供商">
- 通过 `allowlist` 的可选确切名称白名单。即使它是选定的默认值，匹配的显式环境提供程序也会强制执行此列表。省略列表以允许任何名称；使用 `[]` 拒绝每个名称。
- 环境值缺失或为空无法解析。显式环境 SecretRef 保持权威，不会落入另一个凭证或身份验证配置文件。

</Accordion>

<Accordion id="file-provider" title="文件提供者">
- 读取 `path` 指定的本地文件。
- `mode: "json"`（默认）要求载荷为 JSON 对象，并将 `id` 解析为 JSON 指针。
- `mode: "singleValue"` 要求引用 id 为 `"value"`，并返回文件的原始内容（去除末尾换行符）。
- Path 必须是具有一个硬链接的私有常规文件，并通过 ownership/permission 检查。符号链接和硬链接文件被拒绝； `timeoutMs`（默认 5000）和 `maxBytes`（默认 1 MiB）绑定读取。
- Windows ACL 检查：如果 ACL 验证对该路径不可用，则解析失败。将机密移至 ACL OpenClaw 可以验证的路径；没有提供商级别的旁路。

如果升级报告 `must not be hardlinked`，请将内容复制到新的私有文件中并替换配置的路径。单独更改权限不会破坏硬链接。在 Linux 或 macOS 上，使用现有私有目录中的实际凭证路径以网关用户身份运行此命令：

```bash
(
  set -eu
  umask 077
  credential_path="$HOME/.openclaw/secrets.json"
  replacement="$(mktemp "${credential_path}.XXXXXX")"
  trap 'rm -f "$replacement"' EXIT
  cat "$credential_path" > "$replacement"
  chmod 600 "$replacement"
  mv -f "$replacement" "$credential_path"
)
```

这会在创建单链接 `0600` 文件时保留配置的路径和内容。旧索引节点的其他名称保持不变。对于正在运行的网关，运行 `openclaw secrets reload`；如果启动失败，请在再次启动网关之前修复该文件。请参阅 [ 激活行为](/gateway/secrets/operations#activation-triggers)。 [1密码集成](/gateway/secrets/integration-examples#1password)保留其对经纪人令牌硬链接的单独、明确的允许。

</Accordion>

<Accordion id="exec-provider" title="执行提供商">
- 直接运行配置的绝对二进制路径，不使用 shell。
- `command` 不能是符号链接，不能是组可写或全局可写，并且在 POSIX 上必须由当前用户拥有。对于包管理器垫片，解析真实的二进制路径（例如使用 `realpath "$(command -v vault)"`）并配置该绝对路径。使用 `trustedDirs` 将可执行文件限制到批准的目录。
- [`config validate`](/cli/config#config-validate) 检查每个手动执行命令路径而不执行提供程序。配置写入和试运行仅检查已更改或新引用的提供程序，因此不相关的非活动提供程序不会阻止修复。这些是路径信任检查，而不是提供者可以执行或返回秘密的证明。
- 支持 `timeoutMs`（默认 5000）、`noOutputTimeoutMs`（默认等于 `timeoutMs`）、`maxOutputBytes`（默认 1 MiB）、`env`/`passEnv` 白名单和`trustedDirs`。
- `jsonOnly` 默认为 `true`。当设置为 `jsonOnly: false` 且只请求一个 id 时，纯非 JSON 的 stdout 将被接受为该 id 的值。
- Windows ACL 检查：如果 ACL 验证对于命令路径不可用，则解析失败。使用ACL OpenClaw可以验证的命令路径；没有提供商级别的旁路。
- Plugin 管理的 exec 提供程序可以使用 `pluginIntegration` 而不是复制的 `command`/`args`. OpenClaw 在 startup/reload 期间从已安装的插件清单中解析当前命令详细信息；如果插件被禁用、删除、不受信任或不再声明集成，则该提供程序上的活动 SecretRefs 无法解析。

请求载荷（stdin）：

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

响应载荷（stdout）：

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } }
```

可选的每个 id 错误：

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "code": "NOT_FOUND" } }
}
```

`code` 是一个可选的机器可读诊断信息。OpenClaw 会将识别出的 `NOT_FOUND` 和 `AMBIGUOUS_DUPLICATE_KEY` 代码与 provider 和 ref id 一起显示。其他代码以及诸如 `message` 之类的自由格式字段可用于 protocol-v1 兼容性， 但不会显示，因为解析器输出可能包含凭据信息。

</Accordion>

<Accordion id="store-provider" title="商店提供商">
- 从 OpenClaw 的共享状态 SQLite 数据库中读取值。
- 该 provider 不包含连接设置。`secrets.defaults.store` 选择其默认别名。
- 仅解决团队范围。尚不支持身份范围。

</Accordion>
