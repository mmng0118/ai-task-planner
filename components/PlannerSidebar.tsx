"use client";

import Image from "next/image";

export type PlannerScreen = "add" | "list" | "analyze" | "calendar" | "settings";

export function PlannerSidebar({ screen, onNavigate }: { screen: PlannerScreen; onNavigate: (screen: PlannerScreen) => void }) {
  return (
    <aside className="sidebar">
      <picture className="brand-lockup">
        <source media="(max-width: 760px)" srcSet="/images/AITaskPlanner_noText.png" />
        <Image className="brand-logo" src="/images/AITaskPlanner_logo.png?v=20261014" alt="AI Task Planner" width={2172} height={724} priority unoptimized />
      </picture>
      <nav className="side-nav" aria-label="メインメニュー">
        <button type="button" className={`nav-item ${screen === "add" ? "active" : ""}`} onClick={() => onNavigate("add")}>
          <span className="nav-glyph glyph-plus" aria-hidden="true">＋</span><span className="nav-label-desktop">タスク登録</span><span className="nav-label-mobile">登録</span>
        </button>
        <button type="button" className={`nav-item ${screen === "list" ? "active" : ""}`} onClick={() => onNavigate("list")}>
          <span className="nav-glyph glyph-list" aria-hidden="true"><i /><i /><i /></span><span className="nav-label-desktop">タスク一覧</span><span className="nav-label-mobile">タスク</span>
        </button>
        <button type="button" className={`nav-item ${screen === "analyze" ? "active" : ""}`} onClick={() => onNavigate("analyze")}>
          <span className="nav-glyph glyph-bars" aria-hidden="true"><i /><i /><i /></span><span>プラン</span>
        </button>
        <button type="button" className={`nav-item ${screen === "calendar" ? "active" : ""}`} onClick={() => onNavigate("calendar")}>
          <span className="nav-glyph glyph-calendar" aria-hidden="true" /><span>カレンダー</span>
        </button>
      </nav>
      <button type="button" className={`nav-item settings-nav-item ${screen === "settings" ? "active" : ""}`} onClick={() => onNavigate("settings")}>
        <span className="nav-glyph glyph-settings" aria-hidden="true">⚙</span><span>設定</span>
      </button>
      <nav className="mobile-tab-bar" aria-label="メインメニュー">
        <button type="button" aria-label="タスク" className={`nav-item ${screen === "list" ? "active" : ""}`} onClick={() => onNavigate("list")}>
          <span className="nav-glyph glyph-list" aria-hidden="true"><i /><i /><i /></span><span className="nav-label-mobile">タスク</span>
        </button>
        <button type="button" aria-label="プラン" className={`nav-item ${screen === "analyze" ? "active" : ""}`} onClick={() => onNavigate("analyze")}>
          <span className="nav-glyph glyph-bars" aria-hidden="true"><i /><i /><i /></span><span className="nav-label-mobile">プラン</span>
        </button>
        <button type="button" aria-label="登録" className={`nav-item ${screen === "add" ? "active" : ""}`} onClick={() => onNavigate("add")}>
          <span className="nav-glyph glyph-plus" aria-hidden="true">＋</span><span className="nav-label-mobile">登録</span>
        </button>
        <button type="button" aria-label="カレンダー" className={`nav-item ${screen === "calendar" ? "active" : ""}`} onClick={() => onNavigate("calendar")}>
          <span className="nav-glyph glyph-calendar" aria-hidden="true" /><span className="nav-label-mobile">カレンダー</span>
        </button>
        <button type="button" aria-label="設定" className={`nav-item ${screen === "settings" ? "active" : ""}`} onClick={() => onNavigate("settings")}>
          <span className="nav-glyph glyph-settings" aria-hidden="true">⚙</span><span className="nav-label-mobile">設定</span>
        </button>
      </nav>
    </aside>
  );
}
