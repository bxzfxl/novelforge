#!/usr/bin/env node
/**
 * advance-checkpoint.cjs
 *
 * 在 showrunner 触发 checkpoint action 之后调用：
 *   - 把 pipeline-state.signals.checkpoint_due 置 false
 *   - 把 next_checkpoint 推到下一个区间（默认 +10）
 *
 * 这样 showrunner 下一次循环不会反复触发同一个检查点。
 * 人工审阅是异步的，由 scripts/apply-corrections.cjs 在每次循环顶部
 * 扫描 checkpoints/*_instructions.md 应用修正。
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require(require.resolve('js-yaml', { paths: [path.join(__dirname, '..', 'web-console')] }));

const PROJECT_ROOT = path.resolve(__dirname, '..');
const stateFile = path.join(PROJECT_ROOT, 'workspace', 'pipeline-state.yaml');

const stateRaw = fs.readFileSync(stateFile, 'utf8');
const state = yaml.load(stateRaw) || {};

state.signals = state.signals || {};
state.signals.checkpoint_due = false;

// 检查点间距：默认 10 章
const interval = Number(process.env.CHECKPOINT_INTERVAL || 10);
const cur = Number(state.signals.next_checkpoint ?? 10);
const curChapter = Number(state.current_chapter ?? 0);
// 推到当前章节之后的下一个间距点
state.signals.next_checkpoint = Math.max(cur + interval, curChapter + interval);

fs.writeFileSync(stateFile, yaml.dump(state, { lineWidth: 200, noRefs: true }), 'utf8');
console.log(
  `[advance-checkpoint] checkpoint_due=false next_checkpoint=${state.signals.next_checkpoint}`,
);
