# Feature 1：模型配置重构 + 用量监控强化 — 设计 Spec

> **状态**：🟡 占位 — 待 brainstorm 产出
> **最后更新**：2026-04-10
> **优先级**：P0
> **所属路线图**：[ROADMAP.md # Feature 1](../../ROADMAP.md#feature-1模型配置重构--用量监控强化)

## 概述

把 NovelForge 的模型配置从"按 provider"改为"按 AI 操作"，补齐 API Key 执行路径和成本监控。

## 动机

- **现状问题**：
  - Settings UI 允许配 OpenAI/DeepSeek 但代码从未调用过，UI 和执行层断层
  - 无"操作→模型"映射，`agents.yaml` 的 model 字段在 CLI 调用时被忽略
  - 无成本计算，切到 API Key 模式后用户花钱不知道花在哪
  - Settings 页按 provider 展示，用户要回答"我这个操作用哪个模型"时要在多个 provider 里翻找

- **目标**：
  - 新用户打开 Settings 立即能看到"所有 AI 操作清单"，每项独立选模型
  - 支持 API Key 和 CLI 两种模式混用
  - 用量监控能准确算出成本，按 operation / model / 时间拆分
  - 预算告警在超支前提醒

## 待澄清问题

- [ ] operation 清单的最终边界（目前 ROADMAP 列了 10 个，可能还要细分）
- [ ] 降级策略：主模型失败时是否自动切降级模型？切换条件？
- [ ] Settings 页旧 UI 是否完全移除？还是作为"Provider 凭证"次级页签保留？
- [ ] 用量监控预算告警是否阻断执行？还是只提醒？
- [ ] 迁移策略：已有的 `config/agents.yaml` 如何平滑迁移到 operation_model_bindings 表？
- [ ] CLI 模式下如何统计 token？（Claude CLI 不一定暴露 usage）

## TODO

待 brainstorm 后填充：
- 架构图
- DB schema 细节
- Provider 适配层接口
- Settings 页线框图
- `/usage` 页信息架构
- 迁移脚本设计
- 测试策略
