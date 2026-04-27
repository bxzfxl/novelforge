#!/usr/bin/env node
/**
 * apply-corrections.cjs
 *
 * 在 showrunner 主循环最顶部调用，扫描 checkpoints/ 目录里所有人工写的
 * 修正指令，把它们应用到对应章节。
 *
 * 输入约定：
 *   checkpoints/*_instructions.md 由 web 控制台 /checkpoints 页面写出，格式：
 *
 *     # 修改指令
 *
 *     [chapters: 1-3]              ← 可选，指定要修订的章节范围；不写则默认所有章节
 *     主角第 2 章末尾的态度太软，需要更冷峻一些；
 *     第 3 章新出现的"林姿"应该是男性而不是女性。
 *
 *     ---
 *     时间：2026-04-11T...
 *
 *   每个 instructions 文件处理完会创建一个同名的 *_applied.json 标记文件，
 *   包含 { applied_at, affected_chapters, status }。
 *
 * 处理流程（per instructions file）：
 *   1. 解析 chapter range（默认 = 全部已有章节）
 *   2. 对每个章节：
 *      a. 读 manuscript/vol-NN/ch-NNN.md 当前内容
 *      b. POST /api/operation/run，调 writer.revise，把修正指令作为 user message
 *         的"## 修改指令"段，把现有正文作为"## 当前正文"段
 *      c. 把返回的 content 写回 manuscript 文件
 *      d. 同步覆盖 workspace/archive/ch-NNN/draft-final.md（如果还在）
 *   3. 写 *_applied.json 标记
 *
 * 失败处理：
 *   - 单个 instructions 文件失败：记录到 *_applied.json 里 status=failed，
 *     不阻塞其它 instructions
 *   - 单章 revise 失败：跳过该章，继续下一章；标记里写明哪些章节失败
 *
 * 不会做的事：
 *   - 不会修改章节摘要 meta.yaml / 不会修改 lore/_context（这些跟着新版正文
 *     在下次 write_chapter 后自然滚动；当前 MVP 只重写正文，不级联）
 *   - 不会处理 checkpoints/*_approved.md / *_rejected.md（"通过"和"驳回"是
 *     给人看的状态记录，不影响管线行为）
 */

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CHECKPOINTS_DIR = path.join(PROJECT_ROOT, 'checkpoints');
const MANUSCRIPT_DIR = path.join(PROJECT_ROOT, 'manuscript');
const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';

// ── 工具 ────────────────────────────────────────────────

function log(...msgs) {
  console.log('[apply-corrections]', ...msgs);
}

function findInstructionsFiles() {
  if (!fs.existsSync(CHECKPOINTS_DIR)) return [];
  return fs
    .readdirSync(CHECKPOINTS_DIR)
    .filter((f) => f.endsWith('_instructions.md'))
    .map((f) => path.join(CHECKPOINTS_DIR, f))
    .filter((p) => {
      const marker = p.replace(/_instructions\.md$/, '_applied.json');
      return !fs.existsSync(marker);
    });
}

function parseInstructions(raw) {
  // 解析可选的 [chapters: 1-3] 或 [chapters: 1,2,5]
  const lines = raw.split('\n');
  let chaptersSpec = null;
  for (const line of lines) {
    const m = line.match(/^\s*\[chapters?:\s*([^\]]+)\]/i);
    if (m) {
      chaptersSpec = m[1].trim();
      break;
    }
  }

  // 把整段当作指令文本（剥掉 frontmatter / 时间戳尾巴）
  let body = raw;
  // 剥掉 # 修改指令 标题
  body = body.replace(/^#[^\n]*\n+/, '');
  // 剥掉 [chapters: ...] 行
  body = body.replace(/^\s*\[chapters?:[^\]]*\]\s*\n/im, '');
  // 剥掉 --- 之后的元信息
  const dashIdx = body.indexOf('\n---\n');
  if (dashIdx > 0) body = body.slice(0, dashIdx);
  body = body.trim();

  return { chaptersSpec, body };
}

function findAllChapters() {
  // 返回所有 manuscript/vol-NN/ch-NNN.md 路径，按章节号排序
  const result = [];
  if (!fs.existsSync(MANUSCRIPT_DIR)) return result;
  for (const volDir of fs.readdirSync(MANUSCRIPT_DIR)) {
    const volPath = path.join(MANUSCRIPT_DIR, volDir);
    if (!fs.statSync(volPath).isDirectory()) continue;
    if (!/^vol-\d+$/.test(volDir)) continue;
    for (const file of fs.readdirSync(volPath)) {
      const m = file.match(/^ch-(\d+)\.md$/);
      if (m) {
        result.push({
          chapterNum: Number(m[1]),
          path: path.join(volPath, file),
        });
      }
    }
  }
  result.sort((a, b) => a.chapterNum - b.chapterNum);
  return result;
}

function expandChaptersSpec(spec, allChapters) {
  if (!spec) return allChapters;
  const wanted = new Set();
  for (const part of spec.split(',')) {
    const trimmed = part.trim();
    const range = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let i = start; i <= end; i++) wanted.add(i);
    } else if (/^\d+$/.test(trimmed)) {
      wanted.add(Number(trimmed));
    }
  }
  return allChapters.filter((c) => wanted.has(c.chapterNum));
}

function postOperationRun(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL('/api/operation/run', WEB_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(data, 'utf8'),
        },
      },
      (res) => {
        let chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks).toString('utf8');
          try {
            resolve(JSON.parse(buf));
          } catch (err) {
            reject(new Error(`非法 JSON 响应: ${buf.slice(0, 300)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data, 'utf8');
    req.end();
  });
}

async function reviseChapter(chapterPath, chapterNum, instructionsBody) {
  const existing = fs.readFileSync(chapterPath, 'utf8');
  const userMsg =
    `# 任务\n` +
    `根据下面的"修改指令"重写第 ${chapterNum} 章。直接输出修订后的完整 Markdown 章节正文，` +
    `第一字符必须是 \`#\`，不要任何前言或解释，不要包裹代码块。保持原章节的整体结构与字数（±10%）。\n\n` +
    `## 修改指令\n${instructionsBody}\n\n` +
    `## 当前正文\n${existing}\n`;

  const resp = await postOperationRun({
    operation_id: 'writer.revise',
    system_prompt:
      '你是一个专业的小说修订师。根据用户提供的修改指令，对现有章节做最小但充分的修订。' +
      '只动需要改的地方，其它段落保持原样。',
    messages: [{ role: 'user', content: userMsg }],
  });

  if (!resp.ok) {
    throw new Error(`/api/operation/run 失败: ${JSON.stringify(resp).slice(0, 300)}`);
  }
  let revised = String(resp.content || '').trim();
  // 防御：剥 meta 前言
  if (!/^#/.test(revised)) {
    const idx = revised.search(/^# /m);
    if (idx > 0) revised = revised.slice(idx);
  }
  if (!revised) {
    throw new Error('writer.revise 返回空内容');
  }
  fs.writeFileSync(chapterPath, revised, 'utf8');
  // 同步覆盖 archive/draft-final.md（若存在）
  const archive = path.join(
    PROJECT_ROOT,
    'workspace',
    'archive',
    `ch-${String(chapterNum).padStart(3, '0')}`,
    'draft-final.md',
  );
  if (fs.existsSync(archive)) {
    fs.writeFileSync(archive, revised, 'utf8');
  }
}

// ── 主流程 ──────────────────────────────────────────────

async function main() {
  const pending = findInstructionsFiles();
  if (pending.length === 0) {
    return; // 静默退出，showrunner 会继续推进
  }

  log(`发现 ${pending.length} 个待处理修正指令`);
  const allChapters = findAllChapters();
  if (allChapters.length === 0) {
    log('manuscript 还没有章节，跳过');
    return;
  }

  for (const instrFile of pending) {
    const baseName = path.basename(instrFile);
    log(`处理 ${baseName}`);

    const raw = fs.readFileSync(instrFile, 'utf8');
    const { chaptersSpec, body } = parseInstructions(raw);
    if (!body) {
      log(`  跳过：指令正文为空`);
      writeMarker(instrFile, { status: 'skipped', reason: 'empty body' });
      continue;
    }

    const targets = expandChaptersSpec(chaptersSpec, allChapters);
    if (targets.length === 0) {
      log(`  跳过：解析后没有匹配的章节（chaptersSpec=${chaptersSpec}）`);
      writeMarker(instrFile, { status: 'skipped', reason: 'no matching chapters' });
      continue;
    }
    log(`  目标章节: ${targets.map((t) => t.chapterNum).join(', ')}`);

    const successes = [];
    const failures = [];
    for (const tgt of targets) {
      try {
        await reviseChapter(tgt.path, tgt.chapterNum, body);
        log(`  ✓ 第 ${tgt.chapterNum} 章已修订`);
        successes.push(tgt.chapterNum);
      } catch (err) {
        log(`  ✗ 第 ${tgt.chapterNum} 章修订失败: ${err.message}`);
        failures.push({ chapter: tgt.chapterNum, error: err.message });
      }
    }

    writeMarker(instrFile, {
      status: failures.length === 0 ? 'applied' : 'partial',
      applied_at: new Date().toISOString(),
      chapters_spec: chaptersSpec,
      successes,
      failures,
    });
  }
}

function writeMarker(instrFile, data) {
  const marker = instrFile.replace(/_instructions\.md$/, '_applied.json');
  fs.writeFileSync(marker, JSON.stringify(data, null, 2), 'utf8');
}

main().catch((err) => {
  console.error('[apply-corrections] 致命错误:', err);
  process.exit(1);
});
