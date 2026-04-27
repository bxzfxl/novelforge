import { NextResponse } from 'next/server';
import { runOperation } from '@/lib/ai/run-operation';
import { registerAllAdapters } from '@/lib/ai-providers/adapters';
import {
  OperationNotConfiguredError,
  OperationDisabledError,
  BudgetHardBlockedError,
  BudgetSoftBlockedError,
  OperationFailedError,
} from '@/lib/ai-providers/errors';

export async function POST(request: Request) {
  let body: {
    operation_id: string;
    system_prompt?: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    max_tokens?: number;
    temperature?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.operation_id || !Array.isArray(body.messages)) {
    return NextResponse.json(
      { ok: false, error: 'operation_id and messages are required' },
      { status: 400 },
    );
  }

  registerAllAdapters();

  try {
    const result = await runOperation(body.operation_id, {
      systemPrompt: body.system_prompt,
      messages: body.messages,
      maxTokens: body.max_tokens,
      temperature: body.temperature,
    });

    return NextResponse.json({
      ok: true,
      content: result.content,
      usage: result.usage,
      costUsd: result.costUsd,
      wasCliMode: result.wasCliMode,
      finishReason: result.finishReason,
    });
  } catch (err) {
    if (err instanceof OperationNotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: 'NOT_CONFIGURED' },
        { status: 400 },
      );
    }
    if (err instanceof OperationDisabledError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: 'DISABLED' },
        { status: 400 },
      );
    }
    if (err instanceof BudgetHardBlockedError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: 'BUDGET_HARD_BLOCK' },
        { status: 402 },
      );
    }
    if (err instanceof BudgetSoftBlockedError) {
      return NextResponse.json(
        { ok: false, error: err.message, code: 'BUDGET_SOFT_BLOCK' },
        { status: 402 },
      );
    }
    if (err instanceof OperationFailedError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          code: 'OPERATION_FAILED',
          snapshotId: err.snapshotId,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
