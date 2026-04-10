import type Database from 'better-sqlite3';

export interface OperationSeed {
  id: string;
  category: string;
  displayName: string;
  description: string;
  recommendedTier: 'flagship' | 'mid' | 'efficient' | 'reasoning';
  recommendedRationale: string;
  sortOrder: number;
}

export const OPERATIONS: OperationSeed[] = [
  // ── project ──
  {
    id: 'project.brainstorm',
    category: 'project',
    displayName: '新项目头脑风暴',
    description: '多轮对话收集小说需求，产出世界观/角色/大纲草稿。',
    recommendedTier: 'flagship',
    recommendedRationale: '指挥性任务，需要深度推理与创意探索。',
    sortOrder: 10,
  },

  // ── lore ──
  {
    id: 'lore.world.generate',
    category: 'lore',
    displayName: '世界观生成',
    description: '基于题材和关键词生成或扩充世界设定（力量体系、地理、规则）。',
    recommendedTier: 'mid',
    recommendedRationale: '资料生成，影响后续全链条，需要质量门级别。',
    sortOrder: 20,
  },
  {
    id: 'lore.character.generate',
    category: 'lore',
    displayName: '角色生成',
    description: '生成或扩充单个角色卡（性格、背景、弧线）。',
    recommendedTier: 'mid',
    recommendedRationale: '同世界观生成。',
    sortOrder: 21,
  },
  {
    id: 'lore.style.generate',
    category: 'lore',
    displayName: '写作风格定义',
    description: '确定叙事视角、语言基调、参考作品。',
    recommendedTier: 'mid',
    recommendedRationale: '语言风格对中文理解敏感，需要质量门级别。',
    sortOrder: 22,
  },

  // ── outline ──
  {
    id: 'outline.volume.plan',
    category: 'outline',
    displayName: '卷大纲规划',
    description: '规划一整卷的主线、分支、节奏拐点。',
    recommendedTier: 'flagship',
    recommendedRationale: '整卷结构规划，顶层骨架决策。',
    sortOrder: 30,
  },
  {
    id: 'outline.chapter.plan',
    category: 'outline',
    displayName: '章大纲细化',
    description: '把卷大纲拆解为具体章节的场景清单。',
    recommendedTier: 'mid',
    recommendedRationale: '细化执行，需要风格感知。',
    sortOrder: 31,
  },

  // ── showrunner ──
  {
    id: 'showrunner.decide',
    category: 'showrunner',
    displayName: '制片人决策',
    description: '判断下一步动作：继续写、更新资料、触发检查点。',
    recommendedTier: 'flagship',
    recommendedRationale: '管线级全局决策。',
    sortOrder: 40,
  },
  {
    id: 'showrunner.brief',
    category: 'showrunner',
    displayName: '章节任务简报',
    description: '为编剧室生成本章写作任务。',
    recommendedTier: 'efficient',
    recommendedRationale: '根据决策写任务单，纯执行。',
    sortOrder: 41,
  },

  // ── writer ──
  {
    id: 'writer.architect',
    category: 'writer',
    displayName: '章节架构师',
    description: '先行分析章节结构、场景切分、冲突节奏，产出章节蓝图。',
    recommendedTier: 'flagship',
    recommendedRationale: '章节级指挥，决定场景/冲突/节奏。',
    sortOrder: 50,
  },
  {
    id: 'writer.main',
    category: 'writer',
    displayName: '主写手',
    description: '根据架构蓝图产出章节正文。💡 这是读者直接阅读的文字，质量敏感者推荐 Sonnet 或 Opus。',
    recommendedTier: 'mid',
    recommendedRationale: '执行性但质量敏感——默认 Sonnet 4.6，用户可调。',
    sortOrder: 51,
  },
  {
    id: 'writer.character_advocate',
    category: 'writer',
    displayName: '角色代言人',
    description: '逐角色检查言行是否符合设定，纠正 OOC。',
    recommendedTier: 'efficient',
    recommendedRationale: '按设定核对，纯检查。',
    sortOrder: 52,
  },
  {
    id: 'writer.atmosphere',
    category: 'writer',
    displayName: '氛围师',
    description: '强化场景描写、情绪基调、五感细节。',
    recommendedTier: 'efficient',
    recommendedRationale: '根据场景加五感描写，执行性。',
    sortOrder: 53,
  },
  {
    id: 'writer.foreshadow_weaver',
    category: 'writer',
    displayName: '伏笔编织者',
    description: '植入暗线、回收前伏笔、为后续铺钩子。',
    recommendedTier: 'efficient',
    recommendedRationale: '按清单植入暗线。',
    sortOrder: 54,
  },
  {
    id: 'writer.revise',
    category: 'writer',
    displayName: '第一轮修订',
    description: '统稿后修复连贯性和表达问题。',
    recommendedTier: 'efficient',
    recommendedRationale: '按反馈修改。',
    sortOrder: 55,
  },
  {
    id: 'writer.final_revise',
    category: 'writer',
    displayName: '终审润色',
    description: '最后一遍语法/流畅度打磨。',
    recommendedTier: 'mid',
    recommendedRationale: '出街前最后一道质检，不能妥协。',
    sortOrder: 56,
  },

  // ── review ──
  {
    id: 'critic.review',
    category: 'review',
    displayName: '文学评审',
    description: '从读者/编辑视角评价情节、节奏、吸引力。',
    recommendedTier: 'mid',
    recommendedRationale: '需要文学鉴赏，审美判断。',
    sortOrder: 60,
  },
  {
    id: 'continuity.check',
    category: 'review',
    displayName: '连贯性校对',
    description: '核对事实、时间线、世界规则一致性。',
    recommendedTier: 'efficient',
    recommendedRationale: '纯事实核对。',
    sortOrder: 61,
  },

  // ── context ──
  {
    id: 'context.l0.refresh',
    category: 'context',
    displayName: 'L0 全局摘要刷新',
    description: '整合所有资料生成顶层摘要（小说级）。',
    recommendedTier: 'efficient',
    recommendedRationale: '总结整合。',
    sortOrder: 70,
  },
  {
    id: 'context.l1.refresh',
    category: 'context',
    displayName: 'L1 卷级摘要刷新',
    description: '整合最近章节生成卷级上下文。',
    recommendedTier: 'efficient',
    recommendedRationale: '总结整合。',
    sortOrder: 71,
  },
];

export function seedOperations(db: Database.Database): number {
  const insert = db.prepare(`
    INSERT INTO ai_operations (
      id, category, display_name, description,
      recommended_tier, recommended_rationale, is_enabled, sort_order
    ) VALUES (
      @id, @category, @displayName, @description,
      @recommendedTier, @recommendedRationale, 1, @sortOrder
    )
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      display_name = excluded.display_name,
      description = excluded.description,
      recommended_tier = excluded.recommended_tier,
      recommended_rationale = excluded.recommended_rationale,
      sort_order = excluded.sort_order
  `);

  let count = 0;
  const txn = db.transaction(() => {
    for (const op of OPERATIONS) {
      insert.run(op);
      count++;
    }
  });
  txn();

  return count;
}
