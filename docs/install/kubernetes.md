---
summary: "使用 Kustomize 将 OpenClaw Gateway 部署到 Kubernetes 集群"
read_when:
  - 你想在 Kubernetes 集群上运行 OpenClaw
  - 你想在 Kubernetes 环境中测试 OpenClaw
title: "Kubernetes"
---

# Kubernetes 上的 OpenClaw

在 Kubernetes 上运行 OpenClaw 的最小起点——并非生产就绪的部署。涵盖了核心资源，旨在适配你的环境。

## 为什么不用 Helm？

OpenClaw 是一个单容器加上一些配置文件。有趣的自定义在于代理内容（markdown 文件、技能、配置覆盖），而非基础设施模板。Kustomize 处理覆盖层时没有 Helm chart 的额外负担。如果部署变得更复杂，可以在这些清单的基础上叠加 Helm chart。

## 你需要的东西

- 一个正在运行的 Kubernetes 集群（AKS、EKS、GKE、k3s、kind、OpenShift 等）
- 连接到集群的 `kubectl`
- 至少一个模型提供者的 API 密钥

## 快速开始

```bash
# 替换为你的提供者：ANTHROPIC、GEMINI、OPENAI 或 OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh

kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

获取网关 Token 并粘贴到控制 UI：

```bash
kubectl get secret openclaw-secrets -n openclaw -o jsonpath='{.data.OPENCLAW_GATEWAY_TOKEN}' | base64 -d
```

本地调试时，运行 `./scripts/k8s/deploy.sh --show-token` 会在部署后打印 Token。

## 使用 Kind 本地测试

如果没有集群，可以用 [Kind](https://kind.sigs.k8s.io/) 在本地创建一个：

```bash
./scripts/k8s/create-kind.sh           # 自动识别 docker 或 podman
./scripts/k8s/create-kind.sh --delete  # 销毁集群
```

然后用 `./scripts/k8s/deploy.sh` 正常部署。

## 逐步操作

### 1）部署

**选项 A** — 在环境变量中配置 API 密钥（一步完成）：

```bash
# 替换为你的提供者：ANTHROPIC、GEMINI、OPENAI 或 OPENROUTER
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh
```

脚本会创建一个 Kubernetes Secret，包含 API 密钥和自动生成的网关 Token，然后进行部署。如果该 Secret 已存在，会保留当前的网关 Token 和未更改的 provider 密钥。

**选项 B** — 单独创建 Secret：

```bash
export <PROVIDER>_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

无论哪种命令，若想在本地测试时打印 Token，可加上 `--show-token` 参数。

### 2）访问网关

```bash
kubectl port-forward svc/openclaw 18789:18789 -n openclaw
open http://localhost:18789
```

## 部署内容

```
Namespace: openclaw (可以通过 OPENCLAW_NAMESPACE 配置)
├── Deployment/openclaw        # 单个 Pod，包含初始化容器和网关
├── Service/openclaw           # ClusterIP，端口 18789
├── PersistentVolumeClaim      # 10Gi，存储代理状态和配置
├── ConfigMap/openclaw-config  # 包含 openclaw.json 和 AGENTS.md
└── Secret/openclaw-secrets    # 网关 Token 和 API 密钥
```

## 自定义

### 代理指令

编辑 `scripts/k8s/manifests/configmap.yaml` 中的 `AGENTS.md` 后重新部署：

```bash
./scripts/k8s/deploy.sh
```

### 网关配置

编辑 `scripts/k8s/manifests/configmap.yaml` 中的 `openclaw.json`。完整参考请见 [Gateway 配置](/gateway/configuration)。

### 添加提供者

导出其他密钥后重新运行：

```bash
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
./scripts/k8s/deploy.sh --create-secret
./scripts/k8s/deploy.sh
```

Secret 中的现有 provider 密钥会保留，除非被覆盖。

或者直接 patch Secret：

```bash
kubectl patch secret openclaw-secrets -n openclaw \
  -p '{"stringData":{"<PROVIDER>_API_KEY":"..."}}'
kubectl rollout restart deployment/openclaw -n openclaw
```

### 自定义命名空间

```bash
OPENCLAW_NAMESPACE=my-namespace ./scripts/k8s/deploy.sh
```

### 自定义镜像

编辑 `scripts/k8s/manifests/deployment.yaml` 中的 `image` 字段：

```yaml
image: ghcr.io/openclaw/openclaw:latest # or pin to a specific version from https://github.com/openclaw/openclaw/releases
```

### 端口转发以外的暴露方式

默认清单把网关绑定在 Pod 内的回环地址。这适合用 `kubectl port-forward`，但不适合 Kubernetes `Service` 或需要访问 Pod IP 的 Ingress 路径。

若想通过 Ingress 或负载均衡器暴露网关：

- 将 `scripts/k8s/manifests/configmap.yaml` 中的网关绑定地址从 `loopback` 改为符合部署模型的非环回地址
- 保持网关认证启用，使用适当的 TLS 终端入口
- 配置控制 UI 以远程访问，并使用支持的 Web 安全模型（例如 HTTPS/Tailscale Serve 及必要时显式允许的来源）

## 重新部署

```bash
./scripts/k8s/deploy.sh
```

此操作会应用所有清单，重启 Pod 以拾取任何配置或 Secret 变化。

## 卸载

```bash
./scripts/k8s/deploy.sh --delete
```

此操作会删除命名空间及其内所有资源，包括 PVC。

## 架构说明

- 默认网关绑定在 Pod 内的回环地址，因此包含的设置适用于 `kubectl port-forward`
- 无集群作用域资源——所有资源都在单个命名空间中
- 安全性：启用 `readOnlyRootFilesystem`，丢弃所有能力，使用非 root 用户（UID 1000）
- 默认配置将控制 UI 保持在更安全的本地访问路径：回环绑定加 `kubectl port-forward` 到 `http://127.0.0.1:18789`
- 若超出本地主机访问，使用支持的远程模式：HTTPS/Tailscale 和相应的网关绑定及控制 UI 来源设置
- Secret 在临时目录生成后直接应用到集群——不会写入到仓库代码

## 文件结构

```
scripts/k8s/
├── deploy.sh                   # 创建命名空间和 Secret，通过 kustomize 部署
├── create-kind.sh              # 本地 Kind 集群（自动识别 docker/podman）
└── manifests/
    ├── kustomization.yaml      # Kustomize 基础配置
    ├── configmap.yaml          # 包含 openclaw.json 和 AGENTS.md
    ├── deployment.yaml         # Pod 规格，包含安全强化
    ├── pvc.yaml                # 10Gi 持久存储
    └── service.yaml            # 18789 端口的 ClusterIP 服务
```
