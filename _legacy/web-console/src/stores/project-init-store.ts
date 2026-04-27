/**
 * project-init-store — 项目初始化向导状态管理
 * 跨步骤保存表单数据，支持前进/后退/跳转/重置
 */
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import {
  INITIAL_FORM,
  type ProjectInitForm,
  type CharacterDraft,
} from '@/lib/project-config';

// ──────────────────────────────────────────────────────────
// 步骤定义
// ──────────────────────────────────────────────────────────

/** 七步向导，索引从 0 开始 */
export const WIZARD_STEPS = [
  { id: 0, key: 'basic',    label: '基础信息' },
  { id: 1, key: 'world',    label: '世界观' },
  { id: 2, key: 'chars',    label: '角色' },
  { id: 3, key: 'style',    label: '风格' },
  { id: 4, key: 'outline',  label: '大纲' },
  { id: 5, key: 'pipeline', label: '管线确认' },
  { id: 6, key: 'done',     label: '完成' },
] as const;

export const TOTAL_STEPS = WIZARD_STEPS.length;

// ──────────────────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────────────────

interface ProjectInitState {
  currentStep: number;
  form: ProjectInitForm;
  submitting: boolean;
  error: string | null;
}

interface ProjectInitActions {
  /** 更新表单部分字段 */
  updateForm: (patch: Partial<ProjectInitForm>) => void;
  /** 添加角色卡片 */
  addCharacter: () => void;
  /** 更新指定角色 */
  updateCharacter: (id: string, patch: Partial<CharacterDraft>) => void;
  /** 删除角色 */
  removeCharacter: (id: string) => void;
  /** 前进一步 */
  nextStep: () => void;
  /** 后退一步 */
  prevStep: () => void;
  /** 跳转到指定步骤 */
  goToStep: (step: number) => void;
  /** 设置提交状态 */
  setSubmitting: (value: boolean) => void;
  /** 设置错误信息 */
  setError: (value: string | null) => void;
  /** 重置向导 */
  reset: () => void;
}

export type ProjectInitStore = ProjectInitState & ProjectInitActions;

/** 创建一个空白角色 */
function createEmptyCharacter(): CharacterDraft {
  return {
    id: nanoid(8),
    name: '',
    role: '',
    personality: '',
    appearance: '',
    background: '',
    arc: '',
  };
}

export const useProjectInitStore = create<ProjectInitStore>((set) => ({
  currentStep: 0,
  form: { ...INITIAL_FORM },
  submitting: false,
  error: null,

  updateForm: (patch) =>
    set((state) => ({ form: { ...state.form, ...patch } })),

  addCharacter: () =>
    set((state) => ({
      form: {
        ...state.form,
        characters: [...state.form.characters, createEmptyCharacter()],
      },
    })),

  updateCharacter: (id, patch) =>
    set((state) => ({
      form: {
        ...state.form,
        characters: state.form.characters.map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        ),
      },
    })),

  removeCharacter: (id) =>
    set((state) => ({
      form: {
        ...state.form,
        characters: state.form.characters.filter((c) => c.id !== id),
      },
    })),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),

  goToStep: (step) =>
    set({
      currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)),
    }),

  setSubmitting: (value) => set({ submitting: value }),
  setError: (value) => set({ error: value }),

  reset: () =>
    set({
      currentStep: 0,
      form: { ...INITIAL_FORM },
      submitting: false,
      error: null,
    }),
}));
