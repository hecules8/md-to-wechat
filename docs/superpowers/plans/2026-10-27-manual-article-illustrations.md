# 半自动文章配图 Implementation Plan

**Goal:** 在 ChatGPT 生图后导入本地图片，按文章块插图，并在本地完成预览、复制和草稿导出。

**Architecture:** 不调用模型或外部服务。Markdown 保持原文；配图单独保存为本页的本地 data URL，按稳定的文章块标识插入安全 HTML。编辑后失效的位置保留在图片库并提示重选。转换表格时从带配图的文章克隆，复制和导出沿用预览内容。

**Tech Stack:** React、TypeScript、DOMPurify、Marked、FileReader、现有 Vitest 测试。

## Steps

- [x] 为位置锚点、插图、位置失效、文件校验及生图说明编写失败测试。
- [x] 实现 `src/lib/illustrations.ts`：稳定块标识、HTML 插图、文件读取、说明生成。
- [x] 实现 `src/components/IllustrationPanel.tsx`：多图导入、位置选择、图注、替换、移除、说明复制。
- [x] 在 `EditorWorkspace.tsx` 接入配图和复制；无表格文章可直接复制；提供包含图片的 HTML 草稿下载。
- [x] 为导入、移动、删除、替换、表格生成后保图、编辑后的失效位置及无表格复制添加交互测试。
- [x] 添加响应式样式和说明；运行测试、lint、独立目录构建；浏览器检查实际图片导入和导出。

初始实施阶段仅本地预览。2026-10-28 用户确认按当前版本同步 GitHub；提交和推送按该确认执行。
