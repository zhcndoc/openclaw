---
summary: "使用 Amazon Bedrock（Converse API）模型与 OpenClaw"
read_when:
  - 您希望使用带有 OpenClaw 的 Amazon Bedrock 模型
  - 您需要为模型调用配置 AWS 凭证/区域
title: "Amazon Bedrock"
---

# Amazon Bedrock

OpenClaw 可以通过 pi-ai 的 **Bedrock Converse** 流式提供者使用 **Amazon Bedrock** 模型。Bedrock 认证使用 **AWS SDK 默认凭证链**，而非 API 密钥。

## What pi-ai supports

- 提供者：`amazon-bedrock`
- API：`bedrock-converse-stream`
- 认证：AWS 凭证（环境变量、共享配置或实例角色）
- 区域：`AWS_REGION` 或 `AWS_DEFAULT_REGION`（默认：`us-east-1`）

## 自动模型发现

如果检测到 AWS 凭证，OpenClaw 可以自动发现支持 **流式** 和 **文本输出** 的 Bedrock 模型。发现过程使用 `bedrock:ListFoundationModels`，并带缓存（默认缓存时间为 1 小时）。

配置选项位于 `models.bedrockDiscovery` 下：

```json5
{
  models: {
    bedrockDiscovery: {
      enabled: true,
      region: "us-east-1",
      providerFilter: ["anthropic", "amazon"],
      refreshInterval: 3600,
      defaultContextWindow: 32000,
      defaultMaxTokens: 4096,
    },
  },
}
```

说明：

- 当存在 AWS 凭证时，`enabled` 默认值为 `true`。
- `region` 默认值为 `AWS_REGION` 或 `AWS_DEFAULT_REGION`，否则为 `us-east-1`。
- `providerFilter` 用于匹配 Bedrock 提供者名称（例如 `anthropic`）。
- `refreshInterval` 以秒为单位；设置为 `0` 则禁用缓存。
- `defaultContextWindow`（默认：`32000`）和 `defaultMaxTokens`（默认：`4096`）用于发现的模型（如果了解模型限制可覆盖该值）。

## 上线指南

1. 确保在 **gateway 主机** 上已提供 AWS 凭证：

```bash
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
# 可选：
export AWS_SESSION_TOKEN="..."
export AWS_PROFILE="your-profile"
# 可选（Bedrock API Key / Bearer Token）：
export AWS_BEARER_TOKEN_BEDROCK="..."
```

2. 在配置中添加 Bedrock 提供者及模型（不需要 `apiKey`）：

```json5
{
  models: {
    providers: {
      "amazon-bedrock": {
        baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
        api: "bedrock-converse-stream",
        auth: "aws-sdk",
        models: [
          {
            id: "us.anthropic.claude-opus-4-6-v1:0",
            name: "Claude Opus 4.6 (Bedrock)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "amazon-bedrock/us.anthropic.claude-opus-4-6-v1:0" },
    },
  },
}
```

## EC2 实例角色

当 OpenClaw 在绑定有 IAM 角色的 EC2 实例上运行时，AWS SDK 会自动使用实例元数据服务（IMDS）进行认证。然而，OpenClaw 当前的凭证检测仅检查环境变量，不支持 IMDS 凭证。

**解决方案：** 设置 `AWS_PROFILE=default`，以告知存在 AWS 凭证。实际认证仍通过 IMDS 实例角色进行。

```bash
# 添加到 ~/.bashrc 或您的 shell 配置文件
export AWS_PROFILE=default
export AWS_REGION=us-east-1
```

EC2 实例角色的**必需 IAM 权限**：

- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `bedrock:ListFoundationModels`（用于自动发现）

或者，附加托管策略 `AmazonBedrockFullAccess`。

## 快速设置（AWS 路径）

```bash
# 1. 创建 IAM 角色和实例配置文件
aws iam create-role --role-name EC2-Bedrock-Access \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ec2.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy --role-name EC2-Bedrock-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

aws iam create-instance-profile --instance-profile-name EC2-Bedrock-Access
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-Bedrock-Access \
  --role-name EC2-Bedrock-Access

# 2. 关联到您的 EC2 实例
aws ec2 associate-iam-instance-profile \
  --instance-id i-xxxxx \
  --iam-instance-profile Name=EC2-Bedrock-Access

# 3. 在 EC2 实例上启用发现
openclaw config set models.bedrockDiscovery.enabled true
openclaw config set models.bedrockDiscovery.region us-east-1

# 4. 设置环境变量解决方案
echo 'export AWS_PROFILE=default' >> ~/.bashrc
echo 'export AWS_REGION=us-east-1' >> ~/.bashrc
source ~/.bashrc

# 5. 验证模型是否已发现
openclaw models list
```

## 备注

- Bedrock 需要在您的 AWS 账户/区域启用 **模型访问**。
- 自动发现需要 `bedrock:ListFoundationModels` 权限。
- 如果使用配置文件，须在 gateway 主机设置 `AWS_PROFILE`。
- OpenClaw 按照以下顺序获取凭证来源：`AWS_BEARER_TOKEN_BEDROCK`，然后是 `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`，再是 `AWS_PROFILE`，最后是默认 AWS SDK 链。
- 推理支持视模型而定；请查看 Bedrock 模型卡以了解当前能力。
- 如果您更喜欢托管密钥流程，也可以在 Bedrock 之前部署兼容 OpenAI 的代理，并将其配置为 OpenAI 提供者。
