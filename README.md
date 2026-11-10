* {
  box-sizing: border-box;
}

:root {
  --bg: #f4f7f6;
  --panel: #ffffff;
  --primary: #1d8a74;
  --primary-dark: #146d60;
  --income: #2ea97b;
  --expense: #eb735f;
  --text: #1f2a2d;
  --muted: #667a7d;
  --line: #e4ece9;
  --shadow: 0 18px 38px rgba(20, 35, 30, 0.07);
}

html, body {
  margin: 0;
  min-height: 100%;
  font-family: Inter, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
}

button, input, select {
  font: inherit;
}

button {
  cursor: pointer;
}

#toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: rgba(20, 31, 30, 0.92);
  color: #fff;
  padding: 10px 16px;
  border-radius: 12px;
  box-shadow: var(--shadow);
  z-index: 200;
  animation: fadeUp 0.2s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(135deg, #eaf8f4, #f4f7f6 45%, #eef4ff);
}

.auth-card {
  width: min(440px, 100%);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 30px 28px;
  box-shadow: var(--shadow);
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.brand-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary), #44b9a3);
  border-radius: 10px;
  color: white;
  font-size: 18px;
  font-weight: 700;
}

.brand-text {
  font-size: 1.2rem;
  font-weight: 700;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}

.tab {
  width: 50%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #f7faf9;
  color: var(--text);
  font-weight: 600;
}

.tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

#authForm {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 7px;
}

.field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--muted);
}

.field input,
.field select,
.toolbar input,
.toolbar select,
.controls input,
.controls select {
  width: 100%;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--text);
}

.primary-btn,
.secondary-btn,
.ghost-btn,
.mini-btn,
.close-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 16px;
  font-weight: 650;
}

.primary-btn {
  background: var(--primary);
  color: white;
}

.primary-btn:hover {
  background: var(--primary-dark);
}

.secondary-btn {
  background: #edf6f3;
  color: var(--primary);
}

.ghost-btn {
  background: white;
  border: 1px solid var(--line);
  color: var(--text);
}

.security-note {
  margin-top: 18px;
  background: #f1f8f5;
  color: var(--muted);
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 0.82rem;
}

.app-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px 40px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 84px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 24px;
}

.user-pill {
  background: #eaf7f2;
  color: var(--primary);
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 700;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
}

.hero h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2vw, 2.5rem);
}

.controls {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.controls input {
  width: 170px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 22px 18px;
  box-shadow: var(--shadow);
}

.stat-card.income {
  border-top: 4px solid var(--income);
}

.stat-card.expense {
  border-top: 4px solid var(--expense);
}

.stat-card.balance {
  border-top: 4px solid #7aa4ed;
}

.stat-label {
  color: var(--muted);
  font-size: 0.82rem;
  margin-bottom: 8px;
}

.stat-value {
  font-size: clamp(1.6rem, 2vw, 2.2rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  margin-bottom: 8px;
}

.stat-meta {
  color: var(--muted);
  font-size: 0.8rem;
}

.chart-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 18px;
  margin-bottom: 18px;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 18px;
}

.panel-title {
  font-weight: 700;
  margin-bottom: 14px;
}

.donut-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.legend {
  flex: 1;
  display: grid;
  gap: 10px;
}

.legend-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  color: var(--muted);
  font-size: 0.82rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 4px;
  display: inline-block;
}

.empty-legend {
  color: var(--muted);
  font-size: 0.82rem;
}

.table-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 18px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.toolbar h2 {
  margin: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar input,
.toolbar select {
  width: auto;
}

.table-wrap {
  width: 100%;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

th, td {
  padding: 13px 12px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

th {
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.type-tag {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.type-tag.income {
  background: rgba(46, 169, 123, 0.12);
  color: var(--income);
}

.type-tag.expense {
  background: rgba(235, 115, 95, 0.12);
  color: var(--expense);
}

.amount {
  font-weight: 800;
}

.income-text {
  color: var(--income);
}

.expense-text {
  color: var(--expense);
}

.empty-cell {
  text-align: center;
  color: var(--muted);
  padding: 18px;
}

.mini-btn {
  background: #edf4f2;
  color: var(--text);
  padding: 7px 10px;
  margin-right: 6px;
}

.mini-btn.danger {
  background: #fff0ee;
  color: #cc5f55;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12, 18, 18, 0.52);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 100;
}

.modal-card {
  width: min(540px, 100%);
  background: white;
  border-radius: 20px;
  padding: 18px 18px 14px;
  box-shadow: var(--shadow);
}

.import-modal {
  width: min(700px, 100%);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.modal-head h3 {
  margin: 0;
  font-size: 1.3rem;
}

.close-btn {
  width: 38px;
  height: 38px;
  background: #f4f8f6;
  color: var(--muted);
  font-size: 1.4rem;
  line-height: 1;
}

#billForm {
  display: grid;
  grid-template-columns: repeat(2, minmax(210px, 1fr));
  gap: 14px;
}

.full-width {
  grid-column: 1 / -1;
}

.modal-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.upload-box {
  background: #f7faf9;
  border: 1.5px dashed var(--line);
  border-radius: 16px;
  padding: 18px 12px;
  text-align: center;
}

.upload-label {
  display: inline-block;
  margin-bottom: 12px;
  font-weight: 700;
  color: var(--primary);
}

.import-status {
  margin-top: 12px;
  color: var(--muted);
  min-height: 24px;
}

.import-preview {
  margin-top: 14px;
  display: grid;
  gap: 8px;
  max-height: 240px;
  overflow: auto;
}

.preview-row {
  display: grid;
  grid-template-columns: 100px 90px 110px 110px 1fr;
  gap: 10px;
  align-items: center;
  font-size: 0.8rem;
  color: var(--muted);
  border-bottom: 1px dashed var(--line);
  padding-bottom: 6px;
}

#confirmImportBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 880px) {
  .stats-grid,
  .chart-grid {
    grid-template-columns: 1fr;
  }

  .hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 560px) {
  .app-shell {
    padding: 0 14px 24px;
  }

  .topbar {
    height: auto;
    padding: 16px 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .controls {
    width: 100%;
  }

  .controls > * {
    flex: 1;
  }

  #billForm {
    grid-template-columns: 1fr;
  }

  .preview-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
