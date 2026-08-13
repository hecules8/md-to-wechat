# Table Pagination, Themes, and Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee complete table images by paginating long tables, add four export themes, ZIP download for every generated image, and a separate one-click WeChat rich-copy action.

**Architecture:** Before capture, each table is converted into one or more bounded-height page figures with repeated headers. Every page receives explicit width and height capture options and becomes an individual article image/artifact. Theme selection is stored on the preview article and implemented with centralized CSS variables, while ZIP export and clipboard export remain separate user-controlled actions.

**Tech Stack:** React, TypeScript, html-to-image, JSZip, Vitest, Testing Library, Playwright CLI.

---

### Task 1: Long-table pagination regression

**Files:**
- Modify: `src/lib/tableCapture.ts`
- Modify: `src/lib/tableModel.ts`
- Test: `src/test/tableCapture.test.ts`

- [x] Add a failing test with 25 body rows and assert three artifacts, repeated table headers, sequential filenames, and explicit `height`/`canvasHeight` capture options.
- [x] Run `npm test -- src/test/tableCapture.test.ts` and confirm it fails because capture currently produces one image.
- [x] Implement bounded 12-row pagination with repeated `thead`, ordered page replacement, cleanup on failure, and explicit measured capture dimensions.
- [x] Re-run the focused test and confirm it passes.

### Task 2: Theme model and themed preview

**Files:**
- Create: `src/lib/themes.ts`
- Modify: `src/components/EditorWorkspace.tsx`
- Modify: `src/styles.css`
- Test: `src/test/EditorWorkspace.test.tsx`

- [x] Add failing interaction tests for selecting 科技蓝 and preserving that theme through conversion.
- [x] Implement four theme options: 墨绿编辑、科技蓝、雅致红、黑白报告.
- [x] Apply themes through `data-table-theme` and scoped table CSS tokens so previews and PNG capture use identical computed styles.
- [x] Re-run the focused tests.

### Task 3: Download-all ZIP and separate WeChat copy

**Files:**
- Create: `src/lib/download.ts`
- Modify: `src/components/EditorWorkspace.tsx`
- Test: `src/test/download.test.ts`, `src/test/EditorWorkspace.test.tsx`

- [x] Add failing tests for data-URL-to-ZIP export and for separate 生成图片、下载全部、复制至微信公众号 actions.
- [x] Install JSZip and implement one ZIP containing every generated PNG.
- [x] Split conversion from clipboard copy; enable copy/download only after all pages have generated successfully.
- [x] Re-run focused tests.

### Task 4: Full and real-browser verification

**Files:**
- Modify: `README.md`
- Create: `output/playwright/long-table-paginated.png`

- [x] Update usage and theme/export documentation.
- [x] Run `npm run lint`, `npm test`, and `npm run build`.
- [x] In Chromium, convert a 40-row table, verify four output images, verify every page has a header, download the ZIP, and invoke WeChat copy.
- [x] Restart the production service on `127.0.0.1:4173` and verify HTTP 200 with the new bundle.
