---
summary: "ClawHub 登录、API 令牌、CLI 登录、令牌存储和撤销。"
read_when:
  - "登录 ClawHub"
  - "使用 ClawHub CLI"
  - "调试401"
---

# Auth

ClawHub 使用 GitHub 进行 Web 登录。 CLI 使用通过该登录帐户创建的 ClawHub API 代币。

## <a id="web-sign-in"></a> 网页登录

使用GitHub登录[clawhub.ai](https://clawhub.ai).

删除、禁止或禁用的帐户无法完成正常的 ClawHub 登录。如果登录后您返回到注销状态，则您的帐户可能信誉不佳。如果您的帐户被禁止或禁用，并且您认为这是一个错误，请使用 [ClawHub 申诉表](https://appeals.openclaw.ai/)。

## <a id="cli-login"></a> CLI 登录

默认 CLI 登录使用设备代码批准：

```bash
clawhub login
clawhub whoami
```

会发生什么：

1. CLI 打印一次性代码和验证 URL。
2. 在此设备或其他设备上打开打印的 URL，并根据需要使用 GitHub 登录。
3. 确认代码与您的终端匹配，然后选择 **Authorize**。
4. CLI 轮询批准，接收 API 令牌，通过 `whoami` 验证它，并将其存储在您的 ClawHub 配置文件中。

CLI不会打开浏览器或启动本地回调服务器。代码在 15 分钟后过期；如果您的过期，请再次运行 `clawhub login`。

## <a id="headless-login"></a> 无头登录

在 ClawHub 设置 → API 令牌中创建令牌，然后将其传递给 CLI：

```bash
clawhub login --token clh_...
```

使用此流程在服务器或 CI 作业中进行无人值守登录。仅`--no-input`仍在等待设备批准。

默认设备流也适用于远程 shell。 `--device` 显式选择相同的流：

```bash
clawhub login --device
```

在另一台设备上的浏览器中打开打印的验证URL，并在CLI等待期间授权代码。

## <a id="token-storage"></a> 代币存储

默认配置路径：

- macOS: `~/Library/Application Support/clawhub/config.json`
- Linux/XDG: `$XDG_CONFIG_HOME/clawhub/config.json` or `~/.config/clawhub/config.json`
- Windows: `%APPDATA%\\clawhub\\config.json`

使用以下命令覆盖路径：

```bash
export CLAWHUB_CONFIG_PATH=/path/to/config.json
```

使用以下命令打印 CI 设置的存储令牌：

```bash
clawhub token
```

## <a id="revocation"></a> 撤销

您可以在ClawHub网页UI中撤销API代币。

已撤销、无效或丢失的令牌将返回 `401 Unauthorized`。使用 `clawhub login` 再次登录或使用 `clawhub login --token` 提供新令牌。

已删除、禁止或禁用的帐户无法继续使用现有的 API 代币。如果您的帐户被禁止或禁用，并且您认为这是一个错误，请使用 [ClawHub 申诉表](https://appeals.openclaw.ai/)。
