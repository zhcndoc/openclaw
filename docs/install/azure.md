---
summary: "在 Azure Linux VM 上 24/7 运行 OpenClaw Gateway，并使用持久化状态"
read_when:
  - 你希望在 Azure 上配合网络安全组加固，24/7 运行 OpenClaw
  - 你希望在自己的 Azure Linux VM 上部署生产级、始终在线的 OpenClaw Gateway
  - 你希望通过 Azure Bastion SSH 进行安全管理
title: "Azure"
---

使用 Azure CLI 设置 Azure Linux VM，应用网络安全组（NSG）加固，配置 Azure Bastion 以进行 SSH 访问，并安装 OpenClaw。

## 你将完成什么

- 使用 Azure CLI 创建 Azure 网络（VNet、子网、NSG）和计算资源
- 应用 NSG 规则，使 VM 的 SSH 仅允许来自 Azure Bastion
- 使用 Azure Bastion 进行 SSH 访问（VM 上没有公共 IP）
- 使用安装程序脚本安装 OpenClaw
- 验证网关

## 你需要准备

- 一个具有创建计算和网络资源权限的 Azure 订阅
- 已安装 Azure CLI（参见 [Azure CLI 安装步骤](https://learn.microsoft.com/cli/azure/install-azure-cli)）
- 一对 SSH 密钥（如果需要，本指南将介绍如何生成）
- 大约 20-30 分钟

## 配置部署

<Steps>
  <Step title="登录 Azure CLI">
    ```bash
    az login
    az extension add -n ssh
    ```

    `ssh` 扩展是 Azure Bastion 原生 SSH 隧道所必需的。

  </Step>

  <Step title="注册所需的资源提供程序（仅需一次）">
    ```bash
    az provider register --namespace Microsoft.Compute
    az provider register --namespace Microsoft.Network
    ```

    验证注册状态；等待两者都显示为 `Registered`。

    ```bash
    az provider show --namespace Microsoft.Compute --query registrationState -o tsv
    az provider show --namespace Microsoft.Network --query registrationState -o tsv
    ```

  </Step>

  <Step title="设置部署变量">
    ```bash
    RG="rg-openclaw"
    LOCATION="westus2"
    VNET_NAME="vnet-openclaw"
    VNET_PREFIX="10.40.0.0/16"
    VM_SUBNET_NAME="snet-openclaw-vm"
    VM_SUBNET_PREFIX="10.40.2.0/24"
    BASTION_SUBNET_PREFIX="10.40.1.0/26"
    NSG_NAME="nsg-openclaw-vm"
    VM_NAME="vm-openclaw"
    ADMIN_USERNAME="openclaw"
    BASTION_NAME="bas-openclaw"
    BASTION_PIP_NAME="pip-openclaw-bastion"
    ```

    根据你的环境调整名称和 CIDR 范围。Bastion 子网必须至少为 `/26`。

  </Step>

  <Step title="选择 SSH 密钥">
    如果你已有现有的公钥，请使用它：

    ```bash
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

    否则，生成一个：

    ```bash
    ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519 -C "you@example.com"
    SSH_PUB_KEY="$(cat ~/.ssh/id_ed25519.pub)"
    ```

  </Step>

  <Step title="选择 VM 大小和 OS 磁盘大小">
    ```bash
    VM_SIZE="Standard_B2as_v2"
    OS_DISK_SIZE_GB=64
    ```

    - 轻量使用时先选小一点，之后再扩容。
    - 对于更重的自动化、更多通道或更大的模型/工具工作负载，使用更多 vCPU/RAM/磁盘。
    - 如果某个规格在你的区域或订阅配额中不可用，请选择最接近的可用 SKU。

    列出目标区域中可用的 VM 规格：

    ```bash
    az vm list-skus --location "${LOCATION}" --resource-type virtualMachines -o table
    ```

    检查当前的 vCPU 和磁盘使用量/配额：

    ```bash
    az vm list-usage --location "${LOCATION}" -o table
    ```

  </Step>
</Steps>

## 部署 Azure 资源

<Steps>
  <Step title="创建资源组">
    ```bash
    az group create -n "${RG}" -l "${LOCATION}"
    ```
  </Step>

  <Step title="创建网络安全组">
    创建 NSG 并添加规则，使只有 Bastion 子网可以通过 SSH 进入 VM。

    ```bash
    az network nsg create \
      -g "${RG}" -n "${NSG_NAME}" -l "${LOCATION}"

    # 仅允许来自 Bastion 子网的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n AllowSshFromBastionSubnet --priority 100 \
      --access Allow --direction Inbound --protocol Tcp \
      --source-address-prefixes "${BASTION_SUBNET_PREFIX}" \
      --destination-port-ranges 22

    # 拒绝来自公网的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n DenyInternetSsh --priority 110 \
      --access Deny --direction Inbound --protocol Tcp \
      --source-address-prefixes Internet \
      --destination-port-ranges 22

    # 拒绝来自其他 VNet 来源的 SSH
    az network nsg rule create \
      -g "${RG}" --nsg-name "${NSG_NAME}" \
      -n DenyVnetSsh --priority 120 \
      --access Deny --direction Inbound --protocol Tcp \
      --source-address-prefixes VirtualNetwork \
      --destination-port-ranges 22
    ```

    规则按优先级评估，数字越小越先执行：Bastion 流量在 100 处被允许，然后所有其他 SSH 分别在 110 和 120 处被阻止。

  </Step>

  <Step title="创建虚拟网络和子网">
    创建包含 VM 子网（已附加 NSG）的 VNet，然后添加 Bastion 子网。

    ```bash
    az network vnet create \
      -g "${RG}" -n "${VNET_NAME}" -l "${LOCATION}" \
      --address-prefixes "${VNET_PREFIX}" \
      --subnet-name "${VM_SUBNET_NAME}" \
      --subnet-prefixes "${VM_SUBNET_PREFIX}"

    # 将 NSG 关联到 VM 子网
    az network vnet subnet update \
      -g "${RG}" --vnet-name "${VNET_NAME}" \
      -n "${VM_SUBNET_NAME}" --nsg "${NSG_NAME}"

    # AzureBastionSubnet: Azure 要求使用这个精确名称
    az network vnet subnet create \
      -g "${RG}" --vnet-name "${VNET_NAME}" \
      -n AzureBastionSubnet \
      --address-prefixes "${BASTION_SUBNET_PREFIX}"
    ```

  </Step>

  <Step title="创建 VM">
    VM 不会获得公共 IP。SSH 访问将完全通过 Azure Bastion 进行。

    ```bash
    az vm create \
      -g "${RG}" -n "${VM_NAME}" -l "${LOCATION}" \
      --image "Canonical:ubuntu-24_04-lts:server:latest" \
      --size "${VM_SIZE}" \
      --os-disk-size-gb "${OS_DISK_SIZE_GB}" \
      --storage-sku StandardSSD_LRS \
      --admin-username "${ADMIN_USERNAME}" \
      --ssh-key-values "${SSH_PUB_KEY}" \
      --vnet-name "${VNET_NAME}" \
      --subnet "${VM_SUBNET_NAME}" \
      --public-ip-address "" \
      --nsg ""
    ```

    `--public-ip-address ""` 可防止分配公共 IP。`--nsg ""` 会跳过 NIC 级别的 NSG，因为子网级别的 NSG 已经负责安全控制。

    如果你想固定某个 Ubuntu 镜像版本而不是使用 `latest`，请先列出可用版本：

    ```bash
    az vm image list \
      --publisher Canonical --offer ubuntu-24_04-lts \
      --sku server --all -o table
    ```

  </Step>

  <Step title="创建 Azure Bastion">
    Azure Bastion 提供托管 SSH 访问，而无需在 VM 上暴露公共 IP。基于 CLI 的 `az network bastion ssh` 需要启用隧道功能的 Standard SKU。

    ```bash
    az network public-ip create \
      -g "${RG}" -n "${BASTION_PIP_NAME}" -l "${LOCATION}" \
      --sku Standard --allocation-method Static

    az network bastion create \
      -g "${RG}" -n "${BASTION_NAME}" -l "${LOCATION}" \
      --vnet-name "${VNET_NAME}" \
      --public-ip-address "${BASTION_PIP_NAME}" \
      --sku Standard --enable-tunneling true
    ```

    Bastion 的部署通常需要 5-10 分钟，但在某些区域可能需要 15-30 分钟。

  </Step>
</Steps>

## 安装 OpenClaw

<Steps>
  <Step title="通过 Azure Bastion SSH 进入 VM">
    ```bash
    VM_ID="$(az vm show -g "${RG}" -n "${VM_NAME}" --query id -o tsv)"

    az network bastion ssh \
      --name "${BASTION_NAME}" \
      --resource-group "${RG}" \
      --target-resource-id "${VM_ID}" \
      --auth-type ssh-key \
      --username "${ADMIN_USERNAME}" \
      --ssh-key ~/.ssh/id_ed25519
    ```

  </Step>

  <Step title="安装 OpenClaw（在 VM shell 中）">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh -o /tmp/install.sh
    bash /tmp/install.sh
    rm -f /tmp/install.sh
    ```

    如果尚未安装，安装程序会安装 Node 和依赖项，安装 OpenClaw，并启动引导流程。详情请参阅 [安装](/install)。

  </Step>

  <Step title="验证网关">
    在引导完成后：

    ```bash
    openclaw gateway status
    ```

    如果你的组织已经拥有 GitHub Copilot 许可证，你可以在引导过程中选择 GitHub Copilot 提供方，而不是单独的模型 API 密钥。请参阅 [GitHub Copilot 提供方](/providers/github-copilot)。

  </Step>
</Steps>

## 成本考虑

大致的每月成本（请在 Azure Pricing Calculator 中确认当前价格，因为费率会因区域不同而变化，并且会随时间调整）：

- Azure Bastion Standard SKU：大约 $140/月
- VM（`Standard_B2as_v2`）：大约 $55/月

如需降低成本：

- 不使用时解除分配 VM。这样会停止计算费用（磁盘费用仍会保留）。在解除分配期间，网关不可访问。

  ```bash
  az vm deallocate -g "${RG}" -n "${VM_NAME}"
  az vm start -g "${RG}" -n "${VM_NAME}"   # 之后重新启动
  ```

- 在不需要时删除 Bastion，并在需要再次 SSH 访问时重新创建；它是最大的成本组成部分，而且部署只需几分钟。
- 如果你只需要基于 Portal 的 SSH，而不需要 CLI 隧道（`az network bastion ssh`），可以使用 Basic Bastion SKU（大约 $38/月）。

## 清理

删除此指南创建的所有资源：

```bash
az group delete -n "${RG}" --yes --no-wait
```

这将删除资源组及其中的一切（VM、VNet、NSG、Bastion、公共 IP）。

## 后续步骤

- 设置消息通道：[Channels](/channels)
- 将本地设备配对为节点：[Nodes](/nodes)
- 配置网关：[Gateway configuration](/gateway/configuration)
- 了解更多使用 GitHub Copilot 模型提供程序在 Azure 上部署的细节：[OpenClaw on Azure with GitHub Copilot](https://github.com/johnsonshi/openclaw-azure-github-copilot)

## 相关内容

- [安装概述](/install)
- [GCP](/install/gcp)
- [DigitalOcean](/install/digitalocean)
