import { useState } from "react";

const phases = [
  {
    id: 1,
    label: "Phase 1",
    title: "Foundation & Setup",
    color: "#00d4ff",
    tasks: [
      {
        id: "t1",
        title: "Project Architecture",
        priority: "critical",
        notes: "React + Vite frontend, Node.js backend, PostgreSQL DB",
        tags: ["Dev", "Planning"],
      },
      {
        id: "t2",
        title: "API Integrations",
        priority: "critical",
        notes: "Alpha Vantage or Polygon.io for market data. NewsAPI or Benzinga for news feed.",
        tags: ["API", "Dev"],
      },
      {
        id: "t3",
        title: "Auth & User Accounts",
        priority: "high",
        notes: "JWT login, user profiles, subscription tiers",
        tags: ["Dev", "Security"],
      },
      {
        id: "t4",
        title: "Obsidian Vault Structure",
        priority: "high",
        notes: "Set up folders: /features, /research, /bugs, /decisions. Use daily notes for dev log.",
        tags: ["Planning", "Obsidian"],
      },
    ],
  },
  {
    id: 2,
    label: "Phase 2",
    title: "Risk Assessment Module",
    color: "#ff6b35",
    tasks: [
      {
        id: "t5",
        title: "Risk/Reward Calculator",
        priority: "critical",
        notes: "Input: entry, stop-loss, target. Output: R:R ratio, position size, max loss $",
        tags: ["Feature", "Risk"],
      },
      {
        id: "t6",
        title: "Position Size Engine",
        priority: "critical",
        notes: "Based on account % risk (1-3% rule). Ties into budget module.",
        tags: ["Feature", "Risk"],
      },
      {
        id: "t7",
        title: "Volatility Indicators",
        priority: "high",
        notes: "ATR (Average True Range), Beta, implied volatility display per ticker",
        tags: ["Feature", "Data"],
      },
      {
        id: "t8",
        title: "Risk Dashboard Widget",
        priority: "medium",
        notes: "Visual gauge: portfolio heat map, drawdown meter, correlation matrix",
        tags: ["UI", "Risk"],
      },
    ],
  },
  {
    id: 3,
    label: "Phase 3",
    title: "Live News & Sentiment",
    color: "#7c3aed",
    tasks: [
      {
        id: "t9",
        title: "Real-Time News Feed",
        priority: "critical",
        notes: "Filtered by ticker/sector. Sources: Reuters, Bloomberg, SEC filings, earnings.",
        tags: ["Feature", "API"],
      },
      {
        id: "t10",
        title: "Sentiment Analysis",
        priority: "high",
        notes: "NLP scoring of headlines: Bullish / Neutral / Bearish. Use Claude AI or FinBERT.",
        tags: ["AI", "Feature"],
      },
      {
        id: "t11",
        title: "Economic Calendar",
        priority: "high",
        notes: "CPI, FOMC, earnings dates, jobs report. Flag high-impact events.",
        tags: ["Feature", "Data"],
      },
      {
        id: "t12",
        title: "Futures & Pre-Market Data",
        priority: "high",
        notes: "ES, NQ, YM futures. Pre/post market movers with % gap display.",
        tags: ["Feature", "Data"],
      },
    ],
  },
  {
    id: 4,
    label: "Phase 4",
    title: "Budget Management",
    color: "#10b981",
    tasks: [
      {
        id: "t13",
        title: "Portfolio Tracker",
        priority: "critical",
        notes: "Manual or broker-linked (Alpaca, IBKR). P&L by day/week/month.",
        tags: ["Feature", "Budget"],
      },
      {
        id: "t14",
        title: "Trade Journal",
        priority: "critical",
        notes: "Log entry/exit, strategy used, emotion rating, outcome. Export to CSV/Obsidian.",
        tags: ["Feature", "Budget"],
      },
      {
        id: "t15",
        title: "Capital Allocation Rules",
        priority: "high",
        notes: "Set max % per trade, sector caps, cash reserve minimums. Auto-warns on breach.",
        tags: ["Feature", "Risk"],
      },
      {
        id: "t16",
        title: "Drawdown Alerts",
        priority: "medium",
        notes: "Daily/weekly drawdown limits. Auto stop-trading flag if threshold hit.",
        tags: ["Feature", "Budget"],
      },
    ],
  },
  {
    id: 5,
    label: "Phase 5",
    title: "Entry & Exit Education",
    color: "#f59e0b",
    tasks: [
      {
        id: "t17",
        title: "Strategy Library",
        priority: "critical",
        notes: "Documented setups: Bull Flag, VWAP Reclaim, Gap & Go, Opening Range Breakout, etc.",
        tags: ["Education", "Content"],
      },
      {
        id: "t18",
        title: "Interactive Chart Lessons",
        priority: "high",
        notes: "Annotated charts with entry triggers, stop placement, target zones using TradingView embed.",
        tags: ["Education", "UI"],
      },
      {
        id: "t19",
        title: "Paper Trading Simulator",
        priority: "high",
        notes: "Practice entries/exits on live or historical data with no real money at risk.",
        tags: ["Feature", "Education"],
      },
      {
        id: "t20",
        title: "Quizzes & Checkpoints",
        priority: "medium",
        notes: "Test understanding of patterns, risk rules, and setups before advancing lessons.",
        tags: ["Education", "UX"],
      },
    ],
  },
];

const priorityConfig = {
  critical: { label: "CRITICAL", color: "#ff4444", bg: "rgba(255,68,68,0.12)" },
  high: { label: "HIGH", color: "#ff9500", bg: "rgba(255,149,0,0.12)" },
  medium: { label: "MED", color: "#00d4ff", bg: "rgba(0,212,255,0.12)" },
  low: { label: "LOW", color: "#888", bg: "rgba(136,136,136,0.12)" },
};

const tagColors = {
  Dev: "#3b82f6",
  Planning: "#8b5cf6",
  API: "#ec4899",
  Security: "#ef4444",
  Feature: "#10b981",
  Risk: "#f59e0b",
  Data: "#06b6d4",
  UI: "#a78bfa",
  UX: "#c084fc",
  AI: "#f472b6",
  Budget: "#34d399",
  Education: "#fbbf24",
  Content: "#fb923c",
  Obsidian: "#818cf8",
};

export default function TradingPlanningBoard() {
  const [checked, setChecked] = useState({});
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setChecked((p) => ({ ...p, [id]: !p[id] }));
  const expand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const totalTasks = phases.reduce((a, p) => a + p.tasks.length, 0);
  const doneTasks = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((doneTasks / totalTasks) * 100);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c14",
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        color: "#c8d6e5",
        padding: "32px 20px",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@400;600;700&display=swap'); * { box-sizing: border-box; } ::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-track { background: #0d1526; } ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; } .card:hover { transform: translateY(-2px); transition: transform 0.2s ease; } .task-row { transition: background 0.15s; } .task-row:hover { background: rgba(255,255,255,0.04) !important; } .check-btn { cursor: pointer; transition: all 0.2s; } .check-btn:hover { transform: scale(1.15); } .expand-btn { cursor: pointer; background: none; border: none; color: #4a6fa5; font-size: 11px; padding: 2px 6px; } .expand-btn:hover { color: #00d4ff; } .progress-bar-inner { transition: width 0.5s ease; }`}</style>

      {/* Header */}
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 36,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#4a6fa5", marginBottom: 6, textTransform: "uppercase" }}>
              Project Blueprint
            </div>
            <h1
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(24px, 4vw, 40px)",
                fontWeight: 700,
                margin: 0,
                background: "linear-gradient(135deg, #00d4ff 0%, #7c3aed 50%, #10b981 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.5px",
              }}
            >
              TradeOS — Development Roadmap
            </h1>
            <div style={{ fontSize: 12, color: "#4a6fa5", marginTop: 6 }}>
              Stock Market Analysis & Education Platform
            </div>
          </div>

          {/* Progress */}
          <div
            style={{
              background: "#0d1526",
              border: "1px solid #1e3a5f",
              borderRadius: 12,
              padding: "16px 24px",
              minWidth: 200,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#4a6fa5", marginBottom: 8 }}>OVERALL PROGRESS</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 32, fontWeight: 600, color: "#00d4ff" }}>{pct}%</span>
              <span style={{ fontSize: 11, color: "#4a6fa5" }}>
                {doneTasks}/{totalTasks} tasks
              </span>
            </div>
            <div style={{ height: 4, background: "#1e3a5f", borderRadius: 4, overflow: "hidden" }}>
              <div
                className="progress-bar-inner"
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 32,
            padding: "12px 16px",
            background: "#0a1120",
            border: "1px solid #1a2d4a",
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 10, color: "#4a6fa5", letterSpacing: 2, marginRight: 8 }}>PRIORITY:</span>
          {Object.entries(priorityConfig).map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 4,
                background: v.bg,
                color: v.color,
                letterSpacing: 1,
              }}
            >
              {v.label}
            </span>
          ))}
          <span style={{ margin: "0 8px", color: "#1e3a5f" }}>|</span>
          <span style={{ fontSize: 10, color: "#4a6fa5", letterSpacing: 2, marginRight: 4 }}>TIP:</span>
          <span style={{ fontSize: 10, color: "#5a7fa5" }}>
            Click task name to expand notes · Check box to mark complete
          </span>
        </div>

        {/* Phases Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {phases.map((phase) => {
            const done = phase.tasks.filter((t) => checked[t.id]).length;
            const phasePct = Math.round((done / phase.tasks.length) * 100);
            return (
              <div
                key={phase.id}
                className="card"
                style={{
                  background: "#0d1526",
                  border: `1px solid ${phase.color}22`,
                  borderTop: `3px solid ${phase.color}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Phase Header */}
                <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #1a2d4a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, letterSpacing: 3, color: phase.color, opacity: 0.8 }}>
                      {phase.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 10, color: phasePct === 100 ? "#10b981" : "#4a6fa5" }}>
                      {done}/{phase.tasks.length} {phasePct === 100 ? "✓ DONE" : `(${phasePct}%)`}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#e2eaf5",
                      marginBottom: 10,
                    }}
                  >
                    {phase.title}
                  </div>
                  <div style={{ height: 2, background: "#1e3a5f", borderRadius: 2, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${phasePct}%`,
                        background: phase.color,
                        borderRadius: 2,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>

                {/* Tasks */}
                <div style={{ padding: "8px 0" }}>
                  {phase.tasks.map((task) => {
                    const p = priorityConfig[task.priority];
                    const isChecked = checked[task.id];
                    const isExpanded = expanded[task.id];
                    return (
                      <div key={task.id}>
                        <div
                          className="task-row"
                          style={{
                            padding: "10px 18px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                            background: isChecked ? "rgba(16,185,129,0.04)" : "transparent",
                            opacity: isChecked ? 0.55 : 1,
                          }}
                        >
                          {/* Checkbox */}
                          <div
                            className="check-btn"
                            onClick={() => toggle(task.id)}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              flexShrink: 0,
                              marginTop: 1,
                              border: `2px solid ${isChecked ? "#10b981" : "#2a4a6a"}`,
                              background: isChecked ? "#10b981" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {isChecked && <span style={{ color: "#000", fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <button
                                className="expand-btn"
                                onClick={() => expand(task.id)}
                                style={{
                                  fontFamily: "inherit",
                                  fontSize: 13,
                                  color: isChecked ? "#4a6fa5" : "#c8d6e5",
                                  textDecoration: isChecked ? "line-through" : "none",
                                  textAlign: "left",
                                  padding: 0,
                                }}
                              >
                                {task.title}
                              </button>
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "2px 6px",
                                  borderRadius: 3,
                                  background: p.bg,
                                  color: p.color,
                                  letterSpacing: 1,
                                  flexShrink: 0,
                                }}
                              >
                                {p.label}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: 9,
                                    padding: "1px 5px",
                                    borderRadius: 3,
                                    background: `${tagColors[tag] || "#4a6fa5"}18`,
                                    color: tagColors[tag] || "#4a6fa5",
                                    border: `1px solid ${tagColors[tag] || "#4a6fa5"}33`,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Expanded Notes */}
                            {isExpanded && (
                              <div
                                style={{
                                  marginTop: 8,
                                  padding: "8px 10px",
                                  background: "#080c14",
                                  border: `1px solid ${phase.color}33`,
                                  borderRadius: 6,
                                  fontSize: 11,
                                  color: "#7a9fc0",
                                  lineHeight: 1.6,
                                  borderLeft: `3px solid ${phase.color}66`,
                                }}
                              >
                                📋 {task.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ height: 1, background: "#111d30", margin: "0 18px" }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Obsidian Notes Tip */}
        <div
          style={{
            marginTop: 32,
            padding: "20px 24px",
            background: "#0a1120",
            border: "1px solid #818cf833",
            borderLeft: "4px solid #818cf8",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <span style={{ fontSize: 20 }}>💎</span>
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  color: "#818cf8",
                  marginBottom: 6,
                }}
              >
                Obsidian Workflow Tip
              </div>
              <div style={{ fontSize: 12, color: "#5a7fa5", lineHeight: 1.8 }}>
                Create a vault folder <span style={{ color: "#818cf8" }}>/TradeOS/</span> with subfolders:&nbsp;
                <span style={{ color: "#c084fc" }}>/features</span> (feature specs) ·&nbsp;
                <span style={{ color: "#c084fc" }}>/research</span> (API docs, patterns) ·&nbsp;
                <span style={{ color: "#c084fc" }}>/devlog</span> (daily notes) ·&nbsp;
                <span style={{ color: "#c084fc" }}>/decisions</span> (architecture choices). Use the{" "}
                <span style={{ color: "#818cf8" }}>Kanban plugin</span> in Obsidian to mirror this board, and{" "}
                <span style={{ color: "#818cf8" }}>Dataview plugin</span> to auto-generate status reports.
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack Footer */}
        <div
          style={{
            marginTop: 20,
            padding: "16px 24px",
            background: "#0a1120",
            border: "1px solid #1a2d4a",
            borderRadius: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 10, color: "#4a6fa5", letterSpacing: 2 }}>SUGGESTED STACK:</span>
          {[
            { label: "React + Vite", color: "#61dafb" },
            { label: "Node.js", color: "#84cc16" },
            { label: "PostgreSQL", color: "#06b6d4" },
            { label: "TradingView Charts", color: "#f59e0b" },
            { label: "Polygon.io API", color: "#a78bfa" },
            { label: "NewsAPI", color: "#f472b6" },
            { label: "Claude AI (Sentiment)", color: "#ff9500" },
            { label: "Alpaca Broker API", color: "#10b981" },
          ].map((s) => (
            <span
              key={s.label}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 6,
                background: `${s.color}15`,
                color: s.color,
                border: `1px solid ${s.color}30`,
              }}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
