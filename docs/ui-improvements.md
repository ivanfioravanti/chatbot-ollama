# UI Improvements Plan

This document proposes practical, incremental enhancements to the UI/UX of the app. Items are grouped by theme and scoped for phased delivery, prioritizing high-impact, low-risk changes first.

## Phase 1 — Quick Wins (polish, low risk)

- Chat composer
  - Enter to send; Shift+Enter for newline; Esc to blur.
  - Auto-resize textarea; visible character/token count.
  - Keyboard shortcuts: Cmd/Ctrl+K (command palette), Cmd/Ctrl+L (clear input), Up arrow to edit last user message.
- Streaming & feedback
  - Stop generation button; visual “streaming” indicator.
  - Auto-scroll toggle that stops on user scroll up.
  - Thumbs up/down per assistant message; store rating locally.
- Code blocks
  - Copy button; language label; line numbers toggle; wrap toggle.
  - Expand/collapse long blocks; “Download as file” option.
  - Use dynamic imports to lazy-load prism/hljs languages as needed.
- Message actions
  - Copy message; Edit and Resend (for user messages); Regenerate (for assistant messages); Delete; Pin.
- Toasters & status
  - Consistent error toasts with “Copy details” and “Retry” actions.
  - Connection status indicator (OK/Degraded/Offline) during stream.

## Phase 2 — Model & Settings UX

- Model switcher
  - Global dropdown with search; show local models and load state.
  - Per-conversation model persistence; quick-switch via keyboard.
- Parameters sheet
  - Temperature, top_p, top_k, presence/frequency penalties, seed.
  - Context window/mirostat toggles where supported.
  - Save presets; select default preset per conversation.
- Settings modal/page
  - Default system prompt, default model, language, theme, telemetry toggle.
  - Endpoint configuration and health check (with non-blocking validation).

## Phase 3 — History, Organization, Discovery

- Conversations list
  - Folders and tags; drag-and-drop; multi-select + bulk actions.
  - Archive and restore; confirm destructive actions.
- Search
  - Fuzzy search across titles and message content; highlight matches.
  - Filters by model, date, tag, rating.
- Import/Export UI
  - Guided import with preview & conflict resolution (merge vs. replace).
  - Export current conversation, selected, or all (uses existing utility).

## Phase 4 — Accessibility, Theming, Performance

- Accessibility
  - Proper roles/landmarks; focus trap in modals; skip-to-content.
  - Keyboard navigability for menus, lists, and actions.
  - Color contrast audit and visible focus states.
- Theming & i18n
  - Theme switcher (system/light/dark) with smooth transitions.
  - High-contrast theme; font-size scale; respects OS prefers-reduced-motion.
  - i18n polish: dates, plurals, and structured messages; language switcher.
- Performance
  - Virtualize long message lists; memoize markdown rendering.
  - Split heavy components (markdown/code blocks) via dynamic imports.
  - Offload token counting to a worker; cache static assets.

## Visual/Interaction Details

- Layout
  - Responsive sidebar for conversations with collapse on mobile.
  - Sticky top bar (model switcher, actions) and sticky composer.
- Markdown/Math
  - Improve MathJax rendering fallbacks; loading skeletons; inline copy.
  - Sanitize markdown consistently; handle large tables with overflow.
- Avatars & identity
  - Distinct user/assistant avatars; optional custom system avatar.
  - Per-message timestamp and model label (e.g., `llama3.1:70b`).

## QA & Observability (optional but valuable)

- Add lightweight E2E smoke tests for send/regenerate/copy/stop.
- Error boundary around message list; log structured errors (Sentry optional).
- Basic performance metrics (TTI for chat screen, stream time).

## Implementation Notes

- Technology fit
  - Tailwind + Next.js + React 19: use transitions and suspense wisely.
  - Keep prism languages lazy-loaded; only register languages actually used.
  - Keep i18n strings centralized; avoid hard-coded text in components.
- Data model
  - Persist per-conversation settings (model/params) in existing store.
  - Store feedback (👍/👎) with message IDs for future learning/export.
- Progressive delivery
  - Ship Phase 1 behind small PRs (copy buttons, stop, toasts) to reduce risk.
  - Gate larger features with feature flags (env or local storage).

## Suggested Milestones

1. Polish essentials: copy/stop/auto-scroll toggle/toasts/shortcuts.
2. Code block enhancements: labels, line numbers, wrap, download.
3. Model switcher + parameters sheet + per-chat persistence.
4. Virtualized list + accessibility audit + theme improvements.
5. History organization (folders/tags/search) + import/export UI.

