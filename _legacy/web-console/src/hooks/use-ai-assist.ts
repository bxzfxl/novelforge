'use client';

/**
 * useAiAssist — 调用 /api/operation/run 的统一钩子
 * 供项目初始化向导各步骤里的"🪄 AI 辅助"按钮使用。
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface AiAssistParams {
  /** 使用哪个 operation（通常是 project.brainstorm） */
  operationId: string;
  /** system prompt：描述 AI 的角色和输出要求 */
  systemPrompt: string;
  /** 用户消息：当前已有的表单数据 + 具体请求 */
  userPrompt: string;
}

export function useAiAssist() {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (params: AiAssistParams): Promise<string | null> => {
    setLoading(true);
    try {
      const res = await fetch('/api/operation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_id: params.operationId,
          system_prompt: params.systemPrompt,
          messages: [{ role: 'user', content: params.userPrompt }],
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        const msg = json.error ?? '未知错误';
        if (msg.includes('NOT_CONFIGURED') || msg.includes('OperationNotConfiguredError')) {
          toast.error(
            'project.brainstorm 未配置模型：请到 /settings 为 "新项目头脑风暴" 设置模型绑定（推荐 Claude Opus CLI）',
          );
        } else {
          toast.error(`AI 生成失败: ${msg}`);
        }
        return null;
      }
      return String(json.content ?? '').trim();
    } catch (err) {
      toast.error(`请求失败: ${String(err)}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading };
}
