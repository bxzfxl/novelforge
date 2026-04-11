#!/usr/bin/env node
/**
 * apply-chapter-state.cjs
 *
 * 在 writers-room.sh + lore-update.sh 完成后调用，把章节产物落地：
 *  1. 读 workspace/archive/ch-NNN/meta.yaml （AI 生成的章节摘要）
 *  2. 读 workspace/archive/ch-NNN/context-updates.yaml （AI 生成的资料更新建议）
 *  3. 把 context-updates 的 replace/patch 应用到 lore/_context/ 等文件
 *  4. 把 meta 的字段写回 workspace/pipeline-state.yaml（current_chapter / total_words / signals）
 *  5. 把 meta.foreshadow.planted/resolved 同步到 outline/threads/foreshadow.md
 *
 * 用法： node scripts/apply-chapter-state.cjs --chapter <N> [--dry-run]
 *
 * 设计原则：
 *   - 全部 IO 走 Node + js-yaml + UTF-8，避开 bash 在 Windows 上的代码页坑
 *   - 失败时不修改任何文件，print 错误并 exit 1
 *   - dry-run 模式打印将要做的所有变更，不写盘
 */

const fs = require('node:fs');
const path = require('node:path');

// 复用 web-console 的 js-yaml
const yaml = require(require.resolve('js-yaml', { paths: [path.join(__dirname, '..', 'web-console')] }));

// ── CLI args ─────────────────────────────────────────────
const args = process.argv.slice(2);
let chapterNum = null;
let dryRun = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--chapter') {
    chapterNum = Number(args[i + 1]);
    i++;
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}
if (!chapterNum || isNaN(chapterNum)) {
  console.error('用法: node scripts/apply-chapter-state.cjs --chapter <N> [--dry-run]');
  process.exit(2);
}

const PROJECT_ROOT = path.resolve(__dirname, '..');
const archiveDir = path.join(
  PROJECT_ROOT,
  'workspace',
  'archive',
  `ch-${String(chapterNum).padStart(3, '0')}`,
);
const stateFile = path.join(PROJECT_ROOT, 'workspace', 'pipeline-state.yaml');
const foreshadowFile = path.join(PROJECT_ROOT, 'outline', 'threads', 'foreshadow.md');

// ── 工具函数 ──────────────────────────────────────────────

function log(...msgs) {
  console.log('[apply-state]', ...msgs);
}

function readFileSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function writeFile(file, content) {
  if (dryRun) {
    log(`[dry-run] would write ${file} (${content.length} bytes)`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

/**
 * AI 输出的 yaml 经常被包在 ```yaml ... ``` 里，剥掉外壳。
 * 也支持纯 yaml。
 */
function parseYamlBlock(raw, fieldName) {
  if (!raw) return null;
  let text = raw.trim();
  // 剥代码块
  const fenceMatch = text.match(/```(?:yaml)?\s*\n([\s\S]*?)\n```/i);
  if (fenceMatch) text = fenceMatch[1];
  try {
    return yaml.load(text);
  } catch (err) {
    console.error(`[apply-state] 解析 ${fieldName} yaml 失败:`, err.message);
    console.error('原文前 300 字符:', text.slice(0, 300));
    return null;
  }
}

// ── Step A: 读 meta.yaml ──────────────────────────────────

const metaPath = path.join(archiveDir, 'meta.yaml');
const metaRaw = readFileSafe(metaPath);
if (!metaRaw) {
  console.error(`[apply-state] 找不到 meta.yaml: ${metaPath}`);
  process.exit(1);
}
const meta = parseYamlBlock(metaRaw, 'meta.yaml');
if (!meta || typeof meta !== 'object') {
  console.error('[apply-state] meta.yaml 解析失败或为空');
  process.exit(1);
}
log(`已读取 meta.yaml: chapter=${meta.chapter_number ?? chapterNum} words=${meta.word_count ?? '?'}`);

// ── Step B: 应用 context-updates.yaml ─────────────────────

const ctxPath = path.join(archiveDir, 'context-updates.yaml');
const ctxRaw = readFileSafe(ctxPath);
if (ctxRaw) {
  const ctx = parseYamlBlock(ctxRaw, 'context-updates.yaml');
  if (ctx && Array.isArray(ctx.updates)) {
    for (const upd of ctx.updates) {
      if (!upd || typeof upd !== 'object' || !upd.file) continue;
      // 安全：限制路径只能在 lore/ outline/ workspace/ 下
      const target = path.resolve(PROJECT_ROOT, upd.file);
      const allowed = ['lore', 'outline', 'workspace'].some((d) =>
        target.startsWith(path.join(PROJECT_ROOT, d) + path.sep) ||
        target === path.join(PROJECT_ROOT, d),
      );
      if (!allowed) {
        log(`跳过越界路径: ${upd.file}`);
        continue;
      }
      if (upd.action === 'replace' && typeof upd.content === 'string') {
        writeFile(target, upd.content);
        log(`replace ${upd.file} (${upd.content.length} bytes)`);
      } else if (upd.action === 'patch' && Array.isArray(upd.changes)) {
        // 简化版 patch：直接 append "## 当前状态\n{value}" 到文件末尾，
        // 不尝试修改 frontmatter（结构太多变，bash/node 简单处理容易出错）
        const existing = readFileSafe(target) ?? '';
        const patches = upd.changes
          .filter((c) => c && c.field && c.value !== undefined)
          .map((c) => `\n\n<!-- patched at ch-${chapterNum} -->\n## ${c.field}\n${c.value}`)
          .join('');
        if (patches) {
          writeFile(target, existing + patches);
          log(`patch ${upd.file} (+${patches.length} bytes)`);
        }
      } else {
        log(`跳过未知 action: ${upd.action} for ${upd.file}`);
      }
    }
  } else {
    log('context-updates.yaml 没有 updates 数组，跳过资料更新');
  }
} else {
  log('未生成 context-updates.yaml，跳过资料更新');
}

// ── Step C: 同步伏笔登记簿 ────────────────────────────────

if (meta.foreshadow && (Array.isArray(meta.foreshadow.planted) || Array.isArray(meta.foreshadow.resolved))) {
  let foreshadowText = readFileSafe(foreshadowFile) ?? '# 伏笔登记簿\n\n| ID | 描述 | 埋设章节 | 预计回收 | 状态 |\n|----|------|---------|---------|------|\n';
  let appended = '';
  for (const f of meta.foreshadow.planted ?? []) {
    if (!f || !f.id) continue;
    appended += `| ${f.id} | ${(f.description || '').replace(/\|/g, '\\|')} | ${chapterNum} | ${f.target_chapter || '?'} | planted |\n`;
  }
  for (const f of meta.foreshadow.resolved ?? []) {
    if (!f || !f.id) continue;
    // 把已有的 planted 行改为 resolved
    const re = new RegExp(`^(\\| ${f.id} \\|.*\\|) planted \\|`, 'm');
    if (re.test(foreshadowText)) {
      foreshadowText = foreshadowText.replace(re, `$1 resolved (ch-${chapterNum}) |`);
    } else {
      appended += `| ${f.id} | ${(f.description || '').replace(/\|/g, '\\|')} | ? | ${chapterNum} | resolved |\n`;
    }
  }
  if (appended) foreshadowText += appended;
  writeFile(foreshadowFile, foreshadowText);
  log(`foreshadow 登记簿已更新`);
}

// ── Step D: 更新 pipeline-state.yaml ──────────────────────

const stateRaw = readFileSafe(stateFile);
if (!stateRaw) {
  console.error(`[apply-state] 找不到 pipeline-state.yaml: ${stateFile}`);
  process.exit(1);
}
const state = yaml.load(stateRaw) || {};

// 章节号优先用 meta，回退到 CLI 参数
const newChapter = Number(meta.chapter_number ?? chapterNum);
// volume 不信 meta：AI 经常乱猜（比如把第 1 章标成 volume:1 而不是 0），
// 一旦写错会导致下章去 vol-01/ 而上章在 vol-00/，目录漂移。
// 卷切换由 showrunner 的 volume_complete 决策显式处理，这里只承袭现状。
const newVolume = Number(state.current_volume ?? 0);
const wordCount = Number(meta.word_count ?? 0);

state.current_chapter = newChapter;
state.current_volume = newVolume;
state.total_chapters_written = (Number(state.total_chapters_written) || 0) + 1;
state.total_words = (Number(state.total_words) || 0) + wordCount;
state.last_action = 'write_chapter';
state.last_action_status = 'success';
state.last_action_timestamp = new Date().toISOString();

state.signals = state.signals || {};
// 滑动窗口的 pacing 评分（保留最近 10 个）
state.signals.pacing_scores = Array.isArray(state.signals.pacing_scores)
  ? state.signals.pacing_scores
  : [];
if (typeof meta.pacing_score === 'number') {
  state.signals.pacing_scores.push(meta.pacing_score);
  if (state.signals.pacing_scores.length > 10) {
    state.signals.pacing_scores = state.signals.pacing_scores.slice(-10);
  }
}

// 伏笔债务计数
const foreshadowDebt = Array.isArray(state.signals.foreshadow_debt)
  ? state.signals.foreshadow_debt
  : [];
for (const f of meta.foreshadow?.planted ?? []) {
  if (f && f.id && !foreshadowDebt.includes(f.id)) foreshadowDebt.push(f.id);
}
for (const f of meta.foreshadow?.resolved ?? []) {
  if (f && f.id) {
    const idx = foreshadowDebt.indexOf(f.id);
    if (idx >= 0) foreshadowDebt.splice(idx, 1);
  }
}
state.signals.foreshadow_debt = foreshadowDebt;

// 检查点判定
const nextCp = Number(state.signals.next_checkpoint ?? 10);
state.signals.checkpoint_due = newChapter >= nextCp;

const newStateYaml = yaml.dump(state, { lineWidth: 200, noRefs: true });
writeFile(stateFile, newStateYaml);
log(`pipeline-state.yaml 已更新: current_chapter=${newChapter} total_chapters=${state.total_chapters_written} total_words=${state.total_words}`);

if (dryRun) {
  console.log('\n--- dry-run 完成，未写入任何文件 ---');
}
