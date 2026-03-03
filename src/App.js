import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Health", "Utilities", "Other"];
const COLORS = ["#00FFB2", "#0088FF", "#FF6B35", "#FFD700", "#FF3CAC", "#A855F7", "#64748B"];

const SAMPLE_TRANSACTIONS = [
  { id: 1, date: "2026-02-01", description: "Whole Foods Market", amount: 94.32, category: "Food" },
  { id: 2, date: "2026-02-03", description: "Uber", amount: 18.50, category: "Transport" },
  { id: 3, date: "2026-02-05", description: "Netflix", amount: 15.99, category: "Entertainment" },
  { id: 4, date: "2026-02-07", description: "CVS Pharmacy", amount: 42.10, category: "Health" },
  { id: 5, date: "2026-02-09", description: "Amazon", amount: 67.89, category: "Shopping" },
  { id: 6, date: "2026-02-10", description: "Chipotle", amount: 14.25, category: "Food" },
  { id: 7, date: "2026-02-12", description: "Con Edison", amount: 89.00, category: "Utilities" },
  { id: 8, date: "2026-02-14", description: "Spotify", amount: 9.99, category: "Entertainment" },
  { id: 9, date: "2026-02-15", description: "Lyft", amount: 22.40, category: "Transport" },
  { id: 10, date: "2026-02-17", description: "Trader Joe's", amount: 76.55, category: "Food" },
  { id: 11, date: "2026-02-19", description: "Nike", amount: 130.00, category: "Shopping" },
  { id: 12, date: "2026-02-21", description: "Gym Membership", amount: 45.00, category: "Health" },
  { id: 13, date: "2026-02-23", description: "Starbucks", amount: 6.75, category: "Food" },
  { id: 14, date: "2026-02-25", description: "Apple Store", amount: 199.00, category: "Shopping" },
  { id: 15, date: "2026-02-27", description: "Metro Card", amount: 33.00, category: "Transport" },
];

const MONTHLY_DATA = [
  { month: "Sep", amount: 1820 },
  { month: "Oct", amount: 2100 },
  { month: "Nov", amount: 2450 },
  { month: "Dec", amount: 3200 },
  { month: "Jan", amount: 1950 },
  { month: "Feb", amount: 2464 },
];

const API_KEY = process.env.REACT_APP_ANTHROPIC_KEY || "";

export default function FinSight() {
  const [transactions, setTransactions] = useState(SAMPLE_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", text: "Hey! I'm your FinSight AI. Ask me anything about your spending — I've analyzed all your transactions." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTx, setNewTx] = useState({ date: "", description: "", amount: "", category: "Food" });
  const [animateCards, setAnimateCards] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { setTimeout(() => setAnimateCards(true), 100); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const totalSpent = transactions.reduce((s, t) => s + t.amount, 0);
  const topCategory = (() => {
    const totals = {};
    transactions.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  })();
  const biggestTx = [...transactions].sort((a, b) => b.amount - a.amount)[0];

  const pieData = CATEGORIES.map(cat => ({
    name: cat,
    value: Math.round(transactions.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0))
  })).filter(d => d.value > 0);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    if (!API_KEY) {
      setChatMessages(prev => [...prev, { role: "assistant", text: "API key not configured. Add REACT_APP_ANTHROPIC_KEY to your .env file." }]);
      setIsLoading(false);
      return;
    }

    const txSummary = CATEGORIES.map(cat => {
      const total = transactions.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
      return `${cat}: $${total.toFixed(2)}`;
    }).join(", ");

    try {
      const response = await fetch("https://corsproxy.io/?https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are FinSight, a smart personal finance assistant. The user's spending: ${txSummary}. Total: $${totalSpent.toFixed(2)}. Give concise, specific, actionable insights in 2-3 sentences max. Be friendly but sharp.`,
          messages: [{ role: "user", content: userMsg }]
        })
      });
      const data = await response.json();
      const reply = data.content?.[0]?.text || "Couldn't get a response. Try again!";
      setChatMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", text: "Connection error. Check your internet and try again." }]);
    }
    setIsLoading(false);
  };

  const handleAddTransaction = () => {
    if (!newTx.date || !newTx.description || !newTx.amount) return;
    setTransactions(prev => [...prev, { ...newTx, id: Date.now(), amount: parseFloat(newTx.amount) }]);
    setNewTx({ date: "", description: "", amount: "", category: "Food" });
    setShowAddForm(false);
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").slice(1);
      const parsed = lines.map((line, i) => {
        const [date, description, amount, category] = line.split(",");
        return { id: Date.now() + i, date: date?.trim(), description: description?.trim(), amount: parseFloat(amount), category: category?.trim() || "Other" };
      }).filter(t => t.date && t.description && !isNaN(t.amount));
      setTransactions(parsed);
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080B14", color: "#E8EDF5", fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0D1220; }
        ::-webkit-scrollbar-thumb { background: #1E2D45; border-radius: 4px; }
        .card { background: #0D1220; border: 1px solid #1A2640; border-radius: 16px; }
        .tab-btn { background: none; border: none; color: #4A6080; cursor: pointer; padding: 8px 20px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; border-radius: 8px; transition: all 0.2s; }
        .tab-btn.active { background: #0D1220; color: #00FFB2; border: 1px solid #1A2640; }
        .tab-btn:hover:not(.active) { color: #8AAAC8; }
        .stat-card { padding: 24px; border-radius: 16px; border: 1px solid #1A2640; background: #0D1220; opacity: 0; transform: translateY(20px); transition: opacity 0.5s ease, transform 0.5s ease, border-color 0.2s; }
        .stat-card.visible { opacity: 1; transform: translateY(0); }
        .stat-card:hover { border-color: #2A3F60; }
        .chat-input { background: #0D1220; border: 1px solid #1A2640; border-radius: 12px; color: #E8EDF5; padding: 12px 16px; font-family: 'DM Sans', sans-serif; font-size: 14px; width: 100%; outline: none; transition: border-color 0.2s; }
        .chat-input:focus { border-color: #00FFB2; }
        .send-btn { background: #00FFB2; color: #080B14; border: none; border-radius: 10px; padding: 12px 20px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: opacity 0.2s; }
        .send-btn:hover { opacity: 0.85; }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .tx-row { display: grid; grid-template-columns: 110px 1fr 90px 110px; gap: 16px; padding: 14px 20px; border-bottom: 1px solid #0F1A2A; align-items: center; transition: background 0.15s; }
        .tx-row:hover { background: #0F1A2A; }
        .cat-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
        .action-btn { background: #0D1220; border: 1px solid #1A2640; color: #8AAAC8; border-radius: 10px; padding: 9px 18px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; transition: all 0.2s; }
        .action-btn:hover { border-color: #00FFB2; color: #00FFB2; }
        .form-input { background: #080B14; border: 1px solid #1A2640; border-radius: 10px; color: #E8EDF5; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; width: 100%; }
        .form-input:focus { border-color: #00FFB2; }
        .bg-grid { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: linear-gradient(rgba(0,255,178,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,178,0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; z-index: 0; }
        .glow-orb { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-5px); opacity: 1; } }
      `}</style>

      <div className="bg-grid" />
      <div className="glow-orb" style={{ width: 400, height: 400, background: "rgba(0,255,178,0.04)", top: -100, right: -100 }} />
      <div className="glow-orb" style={{ width: 300, height: 300, background: "rgba(0,136,255,0.04)", bottom: 100, left: -50 }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "28px 0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #00FFB2, #0088FF)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💰</div>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>Fin<span style={{ color: "#00FFB2" }}>Sight</span></span>
          </div>
          <div style={{ display: "flex", gap: 8, background: "#0D1220", border: "1px solid #1A2640", borderRadius: 12, padding: 4 }}>
            {["dashboard", "transactions", "chat"].map(tab => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                {tab === "dashboard" ? "📊 Dashboard" : tab === "transactions" ? "📋 Transactions" : "💬 AI Insights"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: "#4A6080" }}>Feb 2026</div>
        </div>

        {/* DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {[
                { label: "Total Spent", value: `$${totalSpent.toFixed(2)}`, sub: "This month", color: "#00FFB2", delay: "0s" },
                { label: "Top Category", value: topCategory[0], sub: `$${topCategory[1].toFixed(2)} spent`, color: "#0088FF", delay: "0.1s" },
                { label: "Biggest Purchase", value: `$${biggestTx.amount.toFixed(2)}`, sub: biggestTx.description, color: "#FF6B35", delay: "0.2s" },
              ].map((card, i) => (
                <div key={i} className={`stat-card ${animateCards ? "visible" : ""}`} style={{ transitionDelay: card.delay }}>
                  <div style={{ fontSize: 12, color: "#4A6080", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>{card.label}</div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 800, color: card.color, marginBottom: 4 }}>{card.value}</div>
                  <div style={{ fontSize: 12, color: "#4A6080" }}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 12, color: "#4A6080", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Spending Trend</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Last 6 Months</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={MONTHLY_DATA}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FFB2" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#00FFB2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: "#4A6080", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4A6080", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={{ background: "#0D1220", border: "1px solid #1A2640", borderRadius: 10, fontSize: 13 }} formatter={v => [`$${v}`, "Spent"]} />
                    <Area type="monotone" dataKey="amount" stroke="#00FFB2" strokeWidth={2} fill="url(#grad)" dot={{ fill: "#00FFB2", strokeWidth: 0, r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 12, color: "#4A6080", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>By Category</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Breakdown</div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <PieChart width={160} height={160}>
                    <Pie data={pieData} cx={75} cy={75} innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ flex: 1 }}>
                    {pieData.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                          <span style={{ fontSize: 12, color: "#8AAAC8" }}>{item.name}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>${item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        {activeTab === "transactions" && (
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #0F1A2A", display: "flex", gap: 10, alignItems: "center" }}>
              <button className="action-btn" onClick={() => setShowAddForm(!showAddForm)}>+ Add Transaction</button>
              <label className="action-btn" style={{ cursor: "pointer" }}>
                📂 Import CSV
                <input type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
              </label>
              <div style={{ marginLeft: "auto", fontSize: 13, color: "#4A6080" }}>{transactions.length} transactions · <span style={{ color: "#00FFB2" }}>${totalSpent.toFixed(2)}</span> total</div>
            </div>

            {showAddForm && (
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #0F1A2A", background: "#080B14", display: "grid", gridTemplateColumns: "120px 1fr 100px 130px auto", gap: 10, alignItems: "end" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#4A6080", marginBottom: 6 }}>DATE</div>
                  <input className="form-input" type="date" value={newTx.date} onChange={e => setNewTx({ ...newTx, date: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#4A6080", marginBottom: 6 }}>DESCRIPTION</div>
                  <input className="form-input" placeholder="e.g. Whole Foods" value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#4A6080", marginBottom: 6 }}>AMOUNT</div>
                  <input className="form-input" type="number" placeholder="0.00" value={newTx.amount} onChange={e => setNewTx({ ...newTx, amount: e.target.value })} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#4A6080", marginBottom: 6 }}>CATEGORY</div>
                  <select className="form-input" value={newTx.category} onChange={e => setNewTx({ ...newTx, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <button onClick={handleAddTransaction} style={{ background: "#00FFB2", color: "#080B14", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Add</button>
              </div>
            )}

            <div className="tx-row" style={{ borderBottom: "1px solid #1A2640" }}>
              {["DATE", "DESCRIPTION", "AMOUNT", "CATEGORY"].map(h => (
                <div key={h} style={{ fontSize: 11, color: "#4A6080", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</div>
              ))}
            </div>

            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => {
                const catIdx = CATEGORIES.indexOf(tx.category);
                const color = COLORS[catIdx >= 0 ? catIdx : 6];
                return (
                  <div key={tx.id} className="tx-row">
                    <div style={{ fontSize: 13, color: "#4A6080" }}>{tx.date}</div>
                    <div style={{ fontSize: 14 }}>{tx.description}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>${tx.amount.toFixed(2)}</div>
                    <div><span className="cat-badge" style={{ background: `${color}18`, color }}>{tx.category}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CHAT */}
        {activeTab === "chat" && (
          <div className="card" style={{ display: "flex", flexDirection: "column", height: 520 }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #0F1A2A" }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700 }}>AI Insights</div>
              <div style={{ fontSize: 13, color: "#4A6080", marginTop: 2 }}>Ask anything about your spending</div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "75%", padding: "12px 16px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user" ? "#00FFB2" : "#131D2E",
                    color: msg.role === "user" ? "#080B14" : "#E8EDF5",
                    fontSize: 14, lineHeight: 1.6,
                    border: msg.role === "assistant" ? "1px solid #1A2640" : "none",
                    fontWeight: msg.role === "user" ? 500 : 400
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div style={{ display: "flex" }}>
                  <div style={{ background: "#131D2E", border: "1px solid #1A2640", borderRadius: "16px 16px 16px 4px", padding: "12px 16px", display: "flex", gap: 6 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FFB2", animation: `bounce 1s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: "0 24px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Where am I overspending?", "Compare to last month", "How can I save more?"].map(q => (
                <button key={q} onClick={() => setChatInput(q)}
                  style={{ background: "#0D1220", border: "1px solid #1A2640", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "#8AAAC8", cursor: "pointer" }}>
                  {q}
                </button>
              ))}
            </div>

            <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10 }}>
              <input className="chat-input" placeholder="Ask about your spending..." value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !isLoading && handleSendMessage()} />
              <button className="send-btn" onClick={handleSendMessage} disabled={isLoading || !chatInput.trim()}>Send</button>
            </div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}