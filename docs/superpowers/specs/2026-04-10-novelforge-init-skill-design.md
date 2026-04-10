# Feature 2：`novelforge-init` Skill — 设计 Spec

> **状态**：🟡 占位 — 待 brainstorm 产出
> **最后更新**：2026-04-10
> **优先级**：P1
> **所属路线图**：[ROADMAP.md # Feature 2](../../ROADMAP.md#feature-2novelforge-init-skill)

## 概述

把小说项目初始化的头脑风暴流程包成 superpowers 风格的 skill，实现 **CLI First**：
- CLI 用户可以直接 `claude` → 触发 skill → 多轮对话 → 自动落盘
- Web 控制台的 CLI 模式也调用这个 skill，保证行为一致

## 动机

- Feature 3 的 Web AI 辅助初始化最终也会调用 Claude CLI + skill，与其在 Web 里重写一套 prompt，不如先做通用 skill
- 让 "shell + VSCode + 命令行" 派用户直接受益
- 符合 superpowers "头脑风暴是可复用 skill" 的设计哲学

## 待澄清问题

- [ ] Skill 存放位置：`~/.claude/skills/` 还是项目内 `.claude/skills/`？
- [ ] SKILL.md 的触发机制：用户怎么调用？"帮我初始化小说项目" 的关键词识别？
- [ ] 信息收集阶段的 prompt 结构：借鉴 superpowers brainstorming 多少？哪些小说专属的问题？
- [ ] 写文件的策略：每步写还是收尾一次性写？
- [ ] 如果用户中途中断对话怎么办？保存草稿？
- [ ] 脚本语言：bash 还是 Node.js？跨平台？
- [ ] 是否需要和 `scripts/init-project.sh` 合并或替代？

## TODO

待 brainstorm 后填充：
- SKILL.md 完整内容
- 脚本清单与参数约定
- 信息收集流程图
- 文件写入时序
- CLI 试用脚本
- 与 `scripts/init-project.sh` 的关系
