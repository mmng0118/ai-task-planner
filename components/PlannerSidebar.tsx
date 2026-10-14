"use client";

import Image from "next/image";

export type PlannerScreen = "add" | "list" | "analyze" | "calendar";

export function PlannerSidebar({ screen, onNavigate }: { screen: PlannerScreen; onNavigate: (screen: PlannerScreen) => void }) {
  return (
    <aside className="sidebar">
      <picture className="brand-lockup">
        <source media="(max-width: 760px)" srcSet="/images/AITaskPlanner_noText.png" />
        <Image className="brand-logo" src="/images/AITaskPlanner_logo.png?v=20261014" alt="AI Task Planner" width={2172} height={724} priority unoptimized />
      </picture>
      <nav className="side-nav" aria-label="メインメニュー">
        <button type="button" className={`nav-item ${screen === "add" ? "active" : ""}`} onClick={() => onNavigate("add")}>
          <span className="nav-glyph glyph-plus" aria-hidden="true">＋</span><span>タスク登録</span>
        </button>
        <button type="button" className={`nav-item ${screen === "list" ? "active" : ""}`} onClick={() => onNavigate("list")}>
          <span className="nav-glyph glyph-list" aria-hidden="true"><i /><i /><i /></span><span>タスク一覧</span>
        </button>
        <button type="button" className={`nav-item ${screen === "analyze" ? "active" : ""}`} onClick={() => onNavigate("analyze")}>
          <span className="nav-glyph glyph-bars" aria-hidden="true"><i /><i /><i /></span><span>プラン</span>
        </button>
        <button type="button" className={`nav-item ${screen === "calendar" ? "active" : ""}`} onClick={() => onNavigate("calendar")}>
          <span className="nav-glyph glyph-calendar" aria-hidden="true" /><span>カレンダー</span>
        </button>
      </nav>
    </aside>
  );
}
