/**
 * Custom error types for the AI provider layer.
 * All errors are structured so callers can branch on instanceof.
 */

export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIError';
  }
}

export class OperationNotConfiguredError extends AIError {
  constructor(public operationId: string) {
    super(`Operation ${operationId} has no model binding (no override, no category default)`);
    this.name = 'OperationNotConfiguredError';
  }
}

export class OperationDisabledError extends AIError {
  constructor(public operationId: string) {
    super(`Operation ${operationId} is disabled in configuration`);
    this.name = 'OperationDisabledError';
  }
}

export class TargetNotAvailableError extends AIError {
  constructor(public targetId: string, public reason: string) {
    super(`Model target ${targetId} is not available: ${reason}`);
    this.name = 'TargetNotAvailableError';
  }
}

export class AdapterNotFoundError extends AIError {
  constructor(public provider: string, public mode: string) {
    super(`No adapter registered for provider=${provider} mode=${mode}`);
    this.name = 'AdapterNotFoundError';
  }
}

export class BudgetWarnError extends AIError {
  constructor(public pct: number, public budget: number) {
    super(`Budget warning: ${pct.toFixed(1)}% of $${budget}`);
    this.name = 'BudgetWarnError';
  }
}

export class BudgetSoftBlockedError extends AIError {
  constructor(public pct: number, public budget: number) {
    super(`Budget soft-blocked at ${pct.toFixed(1)}% of $${budget} — confirm to continue`);
    this.name = 'BudgetSoftBlockedError';
  }
}

export class BudgetHardBlockedError extends AIError {
  constructor(public pct: number, public budget: number) {
    super(`Budget hard-blocked at ${pct.toFixed(1)}% of $${budget}`);
    this.name = 'BudgetHardBlockedError';
  }
}

export class OperationFailedError extends AIError {
  constructor(
    public operationId: string,
    public originalError: Error,
    public snapshotId: string,
  ) {
    super(
      `Operation ${operationId} failed: ${originalError.message} (snapshot: ${snapshotId})`,
    );
    this.name = 'OperationFailedError';
  }
}

export class ProviderAPIError extends AIError {
  constructor(
    public provider: string,
    public status: number | null,
    public originalMessage: string,
  ) {
    super(`Provider ${provider} API error (status=${status}): ${originalMessage}`);
    this.name = 'ProviderAPIError';
  }
}

/** Classify a thrown error as transient / permanent / unknown */
export function classifyError(err: unknown): 'transient' | 'permanent' | 'unknown' {
  if (err instanceof ProviderAPIError) {
    if (err.status === null) return 'transient'; // network error
    if (err.status === 429) return 'transient';
    if (err.status >= 500 && err.status < 600) return 'transient';
    if (err.status === 401 || err.status === 403) return 'permanent';
    if (err.status === 404) return 'permanent';
    if (err.status >= 400 && err.status < 500) return 'permanent';
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('econnrefused')) {
      return 'transient';
    }
    if (msg.includes('unauthorized') || msg.includes('forbidden')) {
      return 'permanent';
    }
  }

  return 'unknown';
}
