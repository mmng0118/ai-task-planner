"use client";

export type PlannerScreen = "add" | "analyze";

export function PlannerSidebar({ screen, onNavigate }: { screen: PlannerScreen; onNavigate: (screen: PlannerScreen) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand-lockup" aria-label="AI Task Planner">
        <span className="brand-name">AI Task Planner</span>
        <span className="brand-dots" aria-hidden="true"><i /><i /><i /></span>
      </div>
      <nav className="side-nav" aria-label="メインメニュー">
        <button type="button" className={`nav-item ${screen === "add" ? "active" : ""}`} onClick={() => onNavigate("add")}>
          <span className="nav-glyph glyph-plus" aria-hidden="true">＋</span><span>タスク登録</span>
        </button>
        <button type="button" className={`nav-item ${screen === "analyze" ? "active" : ""}`} onClick={() => onNavigate("analyze")}>
          <span className="nav-glyph glyph-bars" aria-hidden="true"><i /><i /><i /></span><span>分析結果</span>
        </button>
      </nav>
    </aside>
  );
}
