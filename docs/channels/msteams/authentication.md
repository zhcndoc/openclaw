---
summary: "Microsoft Teams 机器人的证书和托管身份验证"
read_when:
  - "使用证书或托管身份替换客户端密钥"
  - "使用工作负载身份在 AKS 上部署 Teams 机器人"
title: "Microsoft Teams认证"
sidebarTitle: "认证"
---

Teams 机器人的联合身份验证，以及它如何与客户端密钥进行比较。

## <a id="federated-authentication-(certificate-plus-managed-identity)"></a><a id="federated-authentication-certificate-plus-managed-identity"></a> 联邦认证（证书 + 托管标识）

对于生产环境，OpenClaw 通过 `channels.msteams.authType: "federated"` 支持**联邦认证**，作为客户端密钥的替代方案。两种方法：

### <a id="option-a%3A-certificate-based-authentication"></a><a id="option-a-certificate-based-authentication"></a> 选项 A：基于证书的认证

使用通过 Entra ID 应用程序注册注册的 PEM 证书。

**设置：**

1. 生成或获取证书（包含私钥的 PEM 格式）。
2. Entra ID → 应用注册 → **证书和密码** → **证书** → 上传公钥证书。

**配置：**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      certificatePath: "/path/to/cert.pem",
      webhook: { path: "/api/messages" },
    },
  },
}
```

**环境变量：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_CERTIFICATE_PATH=/path/to/cert.pem`

### <a id="option-b%3A-azure-managed-identity"></a><a id="option-b-azure-managed-identity"></a> 选项 B：Azure 托管标识

使用 Azure 托管标识在 Azure 基础结构（AKS、应用服务、Azure VM）上进行无密码身份验证。

**工作方式：**

1. bot pod/VM 具有托管标识（系统分配或用户分配）。
2. 联邦身份凭据将托管标识链接到 Entra ID 应用注册。
3. 运行时，OpenClaw 使用 `@azure/identity` 从 Azure IMDS 端点获取令牌。
4. 该令牌会传递给 Teams SDK，用于 bot 认证。

**前置条件：**

- 启用了托管标识的 Azure 基础设施（AKS 工作负载标识、App Service、VM）。
- 已在 Entra ID 应用注册上创建联邦身份凭据。
- 从pod/VM.网络访问IMDS（`169.254.169.254:80`）

**配置（系统分配托管标识）：**

```json5
{
  channels: {
    msteams: {
      enabled: true,
      appId: "<APP_ID>",
      tenantId: "<TENANT_ID>",
      authType: "federated",
      useManagedIdentity: true,
      webhook: { path: "/api/messages" },
    },
  },
}
```

**配置（用户分配托管标识）：** 在上面的配置块中添加 `managedIdentityClientId: "<MI_CLIENT_ID>"`。

**环境变量：**

- `MSTEAMS_AUTH_TYPE=federated`
- `MSTEAMS_USE_MANAGED_IDENTITY=true`
- `MSTEAMS_MANAGED_IDENTITY_CLIENT_ID=<client-id>`（仅用户分配时）

### <a id="aks-workload-identity-setup"></a> AKS 工作负载标识设置

对于使用工作负载标识的 AKS 部署：

1. 在你的 AKS 集群上**启用工作负载标识**。
2. 在 Entra ID 应用注册上**创建联邦身份凭据**：

   ```bash
   az ad app federated-credential create --id <APP_OBJECT_ID> --parameters '{
     "name": "my-bot-workload-identity",
     "issuer": "<AKS_OIDC_ISSUER_URL>",
     "subject": "system:serviceaccount:<NAMESPACE>:<SERVICE_ACCOUNT>",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   ```

3. 使用应用客户端 ID 为 Kubernetes service account 添加**注解**：

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: my-bot-sa
     annotations:
       azure.workload.identity/client-id: "<APP_CLIENT_ID>"
   ```

4. 为工作负载标识注入**为 Pod 添加标签**：

   ```yaml
   metadata:
     labels:
       azure.workload.identity/use: "true"
   ```

5. **允许网络访问**到IMDS （`169.254.169.254`）：如果使用NetworkPolicy，请在端口80上添加`169.254.169.254/32`的出口规则。

### <a id="auth-type-comparison"></a> 认证类型对比

| 方法               | 配置                                         | 优点                               | 缺点                                  |
| -------------------- | ---------------------------------------------- | ---------------------------------- | ------------------------------------- |
| **客户端密钥**    | `appPassword`                                  | 设置简单                       | 需要轮换密钥，安全性较低 |
| **证书**      | `authType: "federated"` + `certificatePath`    | 网络中不传共享密钥      | 需要管理证书       |
| **托管标识** | `authType: "federated"` + `useManagedIdentity` | 无密码，不需要管理密钥 | 需要 Azure 基础设施         |

`certificateThumbprint` 可以与 `certificatePath` 一起设置，但不会被身份验证路径读取；它被接受只是为了向前兼容。

**默认值：** 当未设置 `authType` 时，OpenClaw 使用客户端密钥认证（`appPassword`）。现有配置将保持不变，继续正常工作。
