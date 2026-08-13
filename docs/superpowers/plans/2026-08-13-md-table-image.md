# Markdown Table Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first web tool that imports Markdown, converts only GFM tables into high-resolution PNG images, preserves the surrounding article content, and copies the polished result for WeChat Official Accounts.

**Architecture:** A Vite + React + TypeScript single-page app parses Markdown with Marked, marks table wrappers as capture targets, and uses `html-to-image` in the browser to replace those targets with PNG previews. Pure parsing and table-style decisions live outside React so they can be tested without browser rendering. Clipboard export writes both rich HTML and plain text, while generated table PNG files remain individually downloadable.

**Tech Stack:** React 19, TypeScript, Vite, Marked, DOMPurify, html-to-image, Vitest, Testing Library, jsdom.

---

## File structure

- `src/lib/markdown.ts`: safe Markdown-to-HTML rendering and table target annotation.
- `src/lib/tableModel.ts`: table sizing, theme, filename, and capture option decisions.
- `src/lib/tableCapture.ts`: DOM-to-PNG conversion and replacement utilities.
- `src/lib/clipboard.ts`: rich HTML/plain-text clipboard export.
- `src/components/EditorWorkspace.tsx`: import, edit, convert, download, and copy workflow.
- `src/App.tsx`: page composition and product framing.
- `src/styles.css`: responsive warm editorial design system and WeChat article styles.
- `src/test/*.test.ts(x)`: unit and interaction coverage.

### Task 1: Project foundation and Markdown contract

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/lib/markdown.ts`
- Test: `src/test/markdown.test.ts`

- [ ] Write a failing test proving `renderMarkdown()` preserves headings and paragraphs while wrapping each GFM table in `[data-table-capture]`.
- [ ] Run `npm test -- src/test/markdown.test.ts` and confirm failure because `renderMarkdown` is missing.
- [ ] Implement `renderMarkdown(markdown: string): string` with Marked GFM parsing, a custom table renderer, and DOMPurify sanitization.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Table image decisions

**Files:**
- Create: `src/lib/tableModel.ts`
- Test: `src/test/tableModel.test.ts`

- [ ] Write failing tests for deterministic filenames, 2x pixel ratio, and width classes for narrow, standard, and wide tables.
- [ ] Run `npm test -- src/test/tableModel.test.ts` and confirm failure because the functions are missing.
- [ ] Implement `getTableCaptureOptions(columnCount)`, `getTableWidthClass(columnCount)`, and `getTableFilename(index)`.
- [ ] Re-run the focused test and confirm it passes.

### Task 3: Browser capture and article replacement

**Files:**
- Create: `src/lib/tableCapture.ts`
- Test: `src/test/tableCapture.test.ts`

- [ ] Write a failing DOM test proving a successful capture replaces only the table wrapper with an image containing the original table's accessible text.
- [ ] Run `npm test -- src/test/tableCapture.test.ts` and confirm failure because `replaceTablesWithImages` is missing.
- [ ] Implement dependency-injected `replaceTablesWithImages(root, capture)` so production uses `html-to-image.toPng` and tests use a deterministic capture function.
- [ ] Re-run the focused test and confirm it passes.

### Task 4: Editor workflow

**Files:**
- Create: `src/components/EditorWorkspace.tsx`, `src/lib/clipboard.ts`, `src/App.tsx`
- Test: `src/test/EditorWorkspace.test.tsx`

- [ ] Write failing interaction tests for sample rendering, `.md` file import, converting all tables, downloading generated PNGs, and rich-copy status feedback.
- [ ] Run `npm test -- src/test/EditorWorkspace.test.tsx` and confirm expected failures.
- [ ] Implement the split editor/phone-preview workflow with one primary `转换表格并复制` action and secondary import/download/reset controls.
- [ ] Re-run interaction tests and confirm they pass.

### Task 5: Editorial visual system and documentation

**Files:**
- Create: `src/styles.css`, `README.md`, `LICENSES.md`
- Modify: `src/App.tsx`, `src/components/EditorWorkspace.tsx`

- [ ] Define centralized warm-paper tokens, accessible focus states, responsive layouts, and reduced-motion behavior.
- [ ] Style captured tables for 1080px-equivalent output with readable Chinese typography, strong borders, zebra rows, and graceful wide-table handling.
- [ ] Document local use, browser clipboard limitations, architecture, and upstream inspirations/licenses (`doocs/md`, `html-to-image`, `marked`, `DOMPurify`).
- [ ] Run `npm run lint`, `npm test`, and `npm run build`; confirm all exit successfully.

### Task 6: Browser verification

**Files:**
- Modify only if visual or interaction defects are discovered.

- [ ] Start the app with `npm run dev -- --host 127.0.0.1`.
- [ ] Verify desktop and mobile layouts, file import, multi-table conversion, individual PNG download, and clipboard feedback in Chromium.
- [ ] Capture a screenshot for handoff and stop the development server.
