'use client';

/**
 * 资料库页面
 * 左侧文件列表 + 右侧 Textarea 编辑器
 * 支持世界观/角色/风格/上下文层 四个 Tab
 */

import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { agentClient } from '@/lib/agent-client';
import { dirMap, saveLoreFile } from '@/lib/lore';
import { FileText, Save, RefreshCw } from 'lucide-react';

// ── 资料类型配置 ────────────────────────────────

const TABS = [
  { key: 'world', label: '世界观' },
  { key: 'characters', label: '角色' },
  { key: 'style', label: '风格' },
  { key: 'context', label: '上下文层' },
] as const;

type LoreType = (typeof TABS)[number]['key'];

// ── 组件 ────────────────────────────────────────

export default function LorePage() {
  // 当前激活的 Tab
  const [activeTab, setActiveTab] = useState<LoreType>('world');
  // 各 Tab 下的文件列表：Record<loreType, filePath[]>
  const [fileList, setFileList] = useState<Record<string, string[]>>({});
  // 当前选中的文件路径
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  // 编辑器内容
  const [content, setContent] = useState('');
  // 加载状态
  const [loadingList, setLoadingList] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── 加载文件列表 ──

  const loadFileList = useCallback(async (type: LoreType) => {
    setLoadingList(true);
    try {
      const dir = dirMap[type];
      const entries = await agentClient.listDir(dir);
      const mdFiles = entries
        .filter((name: string) => name.endsWith('.md'))
        .map((name: string) => `${dir}/${name}`);
      setFileList((prev) => ({ ...prev, [type]: mdFiles }));
    } catch (err) {
      toast.error(`加载文件列表失败: ${String(err)}`);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Tab 切换时加载对应文件列表
  useEffect(() => {
    loadFileList(activeTab);
    // 切换 Tab 时清空编辑器
    setSelectedFile(null);
    setContent('');
  }, [activeTab, loadFileList]);

  // ── 加载单个文件 ──

  const handleSelectFile = async (filePath: string) => {
    if (selectedFile === filePath) return;
    setLoadingFile(true);
    setSelectedFile(filePath);
    try {
      const raw = await agentClient.readFile(filePath);
      setContent(raw);
    } catch (err) {
      toast.error(`读取文件失败: ${String(err)}`);
    } finally {
      setLoadingFile(false);
    }
  };

  // ── 保存文件 ──

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await saveLoreFile(selectedFile, content);
      toast.success('保存成功');
    } catch (err) {
      toast.error(`保存失败: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // ── 获取当前 Tab 的文件列表 ──

  const currentFiles = fileList[activeTab] ?? [];

  // ── 渲染 ──

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">资料库</h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as LoreType)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        {/* Tab 切换栏 */}
        <TabsList className="w-fit">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 内容区：左侧列表 + 右侧编辑器 */}
        {TABS.map((tab) => (
          <TabsContent
            key={tab.key}
            value={tab.key}
            className="mt-4 flex flex-1 gap-4 overflow-hidden"
          >
            {/* 左侧文件列表 */}
            <div className="flex w-56 flex-col rounded-lg border border-stone-200 bg-white">
              <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
                <span className="text-sm font-medium text-stone-600">文件列表</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => loadFileList(activeTab)}
                  disabled={loadingList}
                  title="刷新"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                {currentFiles.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-stone-400">
                    {loadingList ? '加载中…' : '暂无文件'}
                  </p>
                ) : (
                  <ul className="py-1">
                    {currentFiles.map((fp) => {
                      // 只显示文件名（去掉目录前缀）
                      const name = fp.split('/').pop() ?? fp;
                      const isSelected = fp === selectedFile;
                      return (
                        <li key={fp}>
                          <button
                            onClick={() => handleSelectFile(fp)}
                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-stone-50 ${
                              isSelected
                                ? 'bg-amber-50 font-medium text-amber-700'
                                : 'text-stone-700'
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            <span className="truncate">{name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </div>

            {/* 右侧编辑器 */}
            <div className="flex flex-1 flex-col gap-3 overflow-hidden">
              {selectedFile ? (
                <>
                  {/* 文件路径 + 保存按钮 */}
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm text-stone-500">{selectedFile}</span>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || loadingFile}
                      className="shrink-0"
                    >
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      {saving ? '保存中…' : '保存'}
                    </Button>
                  </div>
                  {/* 编辑器 */}
                  {loadingFile ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-stone-400">
                      加载中…
                    </div>
                  ) : (
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="flex-1 resize-none font-mono text-sm"
                      placeholder="文件内容…"
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-stone-200 text-sm text-stone-400">
                  从左侧选择文件开始编辑
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
