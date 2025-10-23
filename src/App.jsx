// src/App.jsx
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

/* ---------------- constants ---------------- */
const TEAMS = [
  "Chamba","Dharamshala","Mandi","Solan","Hamirpur","Bilaspur","Nahan",
  "Wildlife","Kullu","Rampur","Shimla","HPSFDC","Direction"
];

const SPORTS = [
  "100 m","200 m","400 m","800 m","1500 m","5000 m","4x100 m relay",
  "Long Jump","High Jump","Triple Jump","Discuss Throw","Shotput","Javelin throw",
  "400 m walking","800 m walking","Chess","Carrom (Singles)","Carrom (Doubles)",
  "Table Tennis(Singles)","Table Tennis(Doubles)","Table Tennis (Mix Doubles)",
  "Badminton (Singles)","Badminton (Doubles)","Badminton (Mixed Doubles)",
  "Volleyball","Kabaddi","Basketball","Tug of War","Football","Lawn Tennis","Quiz","10k Marathon"
];

const AGE_CLASSES = [
  "Men - Open",
  "Men - Veteran (45+)",
  "Men - Senior Veteran (53+)",
  "Women - Open",
  "Women - Veteran (40+)"
];

// default mapping (for most sports)
const POINTS_DEFAULT = { 1: 5, 2: 3, 3: 1, 4: 0 };

// special team sports (different scale)
const SPECIAL_TEAM_SPORTS = ["Football","Volleyball","Basketball","Kabaddi","Tug of War"];
const POINTS_SPECIAL = { 1: 10, 2: 5, 3: 3, 4: 3 };

/* ------------- helper functions ------------- */
function allowedSportsFor(ageClass) {
  if (!ageClass) return [];

  const all = SPORTS.slice();

  if (ageClass === "Men - Open") {
    return all.filter(s => s.toLowerCase() !== "400 m walking" && s.toLowerCase() !== "800 m walking");
  }

  if (ageClass === "Men - Veteran (45+)") {
    const excluded = new Set([
      "800 m","1500 m","5000 m","4x100 m relay","triple jump","400 m walking","800 m walking",
      "carrom (singles)","carrom (doubles)"
    ].map(s => s.toLowerCase()));
    return all.filter(s => !excluded.has(s.toLowerCase()));
  }

  if (ageClass === "Men - Senior Veteran (53+)") {
    const allowed = new Set([
      "800 m walking",
      "table tennis(singles)","table tennis(doubles)","table tennis (mix doubles)",
      "badminton (singles)","badminton (doubles)","badminton (mixed doubles)",
      "quiz","10k marathon"
    ].map(s => s.toLowerCase()));
    return all.filter(s => allowed.has(s.toLowerCase()));
  }

  if (ageClass === "Women - Open") {
    return all.filter(s => s.toLowerCase() !== "football" && s.toLowerCase() !== "lawn tennis");
  }

  if (ageClass === "Women - Veteran (40+)") {
    const allowed = new Set(["800 m walking","quiz","10k marathon"].map(s => s.toLowerCase()));
    return all.filter(s => allowed.has(s.toLowerCase()));
  }

  return all;
}

function pointsForSportPosition(sport, position) {
  if (!sport || !position) return 0;
  const sportLc = sport.toLowerCase();
  if (SPECIAL_TEAM_SPORTS.map(s => s.toLowerCase()).includes(sportLc)) {
    return POINTS_SPECIAL[position] ?? 0;
  }
  return POINTS_DEFAULT[position] ?? 0;
}

/* ---------------- Public Leaderboard (read-only) ---------------- */
function PublicLeaderboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leaderboard_entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMessage("Error fetching leaderboard: " + (error.message || JSON.stringify(error)));
      setEntries([]);
    } else {
      setEntries(data || []);
      setMessage("");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const teamTotals = entries.reduce((acc, e) => {
    if (!e.team_name) return acc;
    const t = e.team_name;
    if (!acc[t]) acc[t] = { team: t, gold: 0, silver: 0, bronze: 0, fourth: 0, points: 0 };
    if (e.position === 1) acc[t].gold++;
    if (e.position === 2) acc[t].silver++;
    if (e.position === 3) acc[t].bronze++;
    if (e.position === 4) acc[t].fourth++;
    acc[t].points += Number(e.points || 0);
    return acc;
  }, {});
  const leaderboard = Object.values(teamTotals).sort((a,b) => b.points - a.points);

  const lastUpdated = entries.length > 0 ? new Date(entries[0].created_at).toLocaleString() : null;

  const copyWhatsApp = async () => {
    const now = new Date().toLocaleString();
    let txt = `🏆 26th H.P. Forest Sports & Duty Meet, 2025
🌲 LIVE LEADERBOARD (updated: ${now})

`;
    leaderboard.forEach((r,i) => {
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'🌿';
      txt += `${medal} ${r.team} — ${r.gold} Gold | ${r.silver} Silver | ${r.bronze} Bronze | ${r.points} pts\n`;
    });
    txt += `

📍 (official portal)`;
    try {
      // ensure real newlines
      txt = txt.replace(/\\n/g, "\n");
      await navigator.clipboard.writeText(txt);
      setMessage("WhatsApp message copied to clipboard. Paste into WhatsApp.");
    } catch (err) {
      setMessage("Clipboard failed: " + (err.message || ""));
    }
  };

  return (
    <div className="app" style={{ padding: 20 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="Forest Sports logo" className="logo" />
            <div>
              <h1 style={{ margin: 0, fontSize: 28 }}>26th H.P. Forest Sports & Duty Meet, 2025</h1>
              <div className="small">Live Leaderboard — Public view</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="small">Last update:</div>
            <div style={{ fontWeight: 700 }}>{ lastUpdated || "-" }</div>
          </div>
        </div>

        <div className="card">
          <h3>Leaderboard</h3>
          {loading ? <div className="small">Loading...</div> : (
            leaderboard.length === 0 ? <div className="small">No team scores yet</div> :
            leaderboard.map((r, idx) => (
              <div key={r.team} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderRadius: 6, background: "rgba(15,118,110,0.04)", marginBottom: 6 }}>
                <div><strong>{idx+1}. {r.team}</strong><div className="small">{r.gold}🥇 {r.silver}🥈 {r.bronze}🥉 {r.fourth}4th</div></div>
                <div style={{ fontWeight: 700 }}>{r.points} pts</div>
              </div>
            ))
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn" onClick={copyWhatsApp}>Copy WhatsApp message</button>
            <button className="btn secondary" onClick={fetchEntries}>Reload</button>
          </div>
          {message && <div className="error" style={{ marginTop: 8 }}>{message}</div>}
        </div>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <small>Visit the <a href="/" onClick={(e)=>{ e.preventDefault(); window.location.href = '/'; }}>Admin portal</a> for management (login required).</small>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Admin UI (login + management) ---------------- */
function AdminLogin({ onLogin }) {
  const [pwd, setPwd] = useState("");
  return (
    <div className="card">
      <h3>Admin Login</h3>
      <div className="form-row">
        <label>Password</label>
        <input className="input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
      </div>
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <button className="btn" onClick={()=>onLogin(pwd)}>Login</button>
      </div>
    </div>
  );
}

/* ------------------- main Admin App ------------------- */
export default function App() {
  // detect public path
  const path = (typeof window !== "undefined" && window.location && window.location.pathname) ? window.location.pathname : "/";
  if (path === "/public" || path === "/public/") {
    // Render the public leaderboard page only
    return <PublicLeaderboard />;
  }

  // Admin portal state
  const [logged, setLogged] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ ageClass: "", sport: "" });
  const [positions, setPositions] = useState({
    1: { team: "", player: "" },
    2: { team: "", player: "" },
    3: { team: "", player: "" },
    4: { team: "", player: "" }
  });
  const [message, setMessage] = useState("");

  // Manage entries filters
  const [filterAge, setFilterAge] = useState("");
  const [filterSport, setFilterSport] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("leaderboard_entries").select("*").order("created_at",{ ascending: false });
    if (error) { setMessage("Fetch error: " + (error.message || JSON.stringify(error))); setEntries([]); }
    else { setEntries(data || []); setMessage(""); }
    setLoading(false);
  }, []);
  useEffect(()=>{ fetchEntries(); }, [fetchEntries]);

  const handleLogin = (pwd) => {
    if (pwd === "admin123") setLogged(true);
    else setMessage("Invalid password (demo)");
  };

  const handleAgeClassChange = (val) => {
    setMeta({ ageClass: val, sport: "" });
    setPositions({ 1: { team: "", player: "" }, 2: { team: "", player: "" }, 3: { team: "", player: "" }, 4: { team: "", player: "" } });
    setMessage("");
  };
  const handleSportChange = (val) => { setMeta(m=>({...m, sport: val})); setMessage(""); };

  const setPositionTeam = (pos, team) => setPositions(p=>({...p, [pos]: {...p[pos], team}}));
  const setPositionPlayer = (pos, player) => setPositions(p=>({...p, [pos]: {...p[pos], player}}));

  const submitResults = async () => {
    setMessage("");
    if (!meta.ageClass) { setMessage("Please select Age Class."); return; }
    if (!meta.sport) { setMessage("Please select Sport."); return; }

    const allowed = allowedSportsFor(meta.ageClass).map(s => s.toLowerCase());
    if (!allowed.includes(meta.sport.toLowerCase())) {
      setMessage(`The sport "${meta.sport}" is not permitted for ${meta.ageClass}.`);
      return;
    }

    const rows = [];
    for (let pos = 1; pos <= 4; pos++) {
      const { team, player } = positions[pos];
      if ((!team || team === "") && (!player || player.trim() === "")) continue;
      rows.push({
        team_name: team && team !== "" ? team : null,
        player_name: player && player.trim() !== "" ? player.trim() : null,
        sport: meta.sport,
        age_class: meta.ageClass,
        position: pos,
        points: pointsForSportPosition(meta.sport, pos),
        created_at: new Date().toISOString()
      });
    }
    if (rows.length === 0) { setMessage("No positions filled — nothing to submit."); return; }

    setLoading(true);
    const { data, error } = await supabase.from("leaderboard_entries").insert(rows).select();
    setLoading(false);
    if (error) { setMessage("Insert error: " + (error.message || JSON.stringify(error))); return; }
    setMessage("Results submitted.");
    setMeta({ ageClass: "", sport: "" });
    setPositions({ 1: { team: "", player: "" }, 2: { team: "", player: "" }, 3: { team: "", player: "" }, 4: { team: "", player: "" } });
    await fetchEntries();
  };

  const deleteEntry = async (id) => {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("leaderboard_entries").delete().eq("id", id);
    if (error) { setMessage("Delete error: " + (error.message || JSON.stringify(error))); return; }
    setMessage("Deleted.");
    await fetchEntries();
  };

  const editEntry = async (entry) => {
    const newTeam = prompt("Team (leave blank for Individual)", entry.team_name || "");
    const newPlayer = prompt("Player name (optional)", entry.player_name || "");
    const newPos = prompt("Position (1-4)", String(entry.position));
    const posNum = Number(newPos);
    const patch = {
      team_name: newTeam && newTeam.trim() !== "" ? newTeam.trim() : null,
      player_name: newPlayer && newPlayer.trim() !== "" ? newPlayer.trim() : null,
      position: isNaN(posNum) ? entry.position : posNum,
      points: pointsForSportPosition(entry.sport, isNaN(posNum) ? entry.position : posNum)
    };
    const { error } = await supabase.from("leaderboard_entries").update(patch).eq("id", entry.id);
    if (error) { setMessage("Update error: " + (error.message || JSON.stringify(error))); return; }
    setMessage("Updated.");
    await fetchEntries();
  };

  // compute leaderboard for admin view
  const teamTotals = entries.reduce((acc, e) => {
    if (!e.team_name) return acc;
    const t = e.team_name;
    if (!acc[t]) acc[t] = { team: t, gold: 0, silver: 0, bronze: 0, fourth: 0, points: 0 };
    if (e.position === 1) acc[t].gold++;
    if (e.position === 2) acc[t].silver++;
    if (e.position === 3) acc[t].bronze++;
    if (e.position === 4) acc[t].fourth++;
    acc[t].points += Number(e.points || 0);
    return acc;
  }, {});
  const leaderboard = Object.values(teamTotals).sort((a,b)=>b.points-a.points);

  const generateWhatsAppMessage = async () => {
    const now = new Date().toLocaleString();
    let txt = `🏆 *26th H.P. Forest Sports & Duty Meet, 2025*
🌲 *LIVE LEADERBOARD* (updated: ${now})

`;
    leaderboard.forEach((r,i)=> {
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'🌿';
      txt += `${medal} ${r.team} — ${r.gold} Gold | ${r.silver} Silver | ${r.bronze} Bronze | ${r.points} pts\n`;
    });
    txt += `

📍 Portal: https://forest-sports-leaderboard.vercel.app/public`;
    try {
      txt = txt.replace(/\\n/g, "\n");
      await navigator.clipboard.writeText(txt);
      setMessage("WhatsApp message copied to clipboard — paste into group to share.");
    } catch (err) {
      setMessage("Clipboard copy failed: " + (err.message || ""));
    }
  };

  const filteredEntries = entries.filter(e => {
    if (filterAge && filterAge !== e.age_class) return false;
    if (filterSport && filterSport !== e.sport) return false;
    return true;
  });

  const downloadCSV = () => {
    const rows = filteredEntries.map(r => ({
      id: r.id,
      team: r.team_name ?? "Individual",
      player: r.player_name ?? "",
      sport: r.sport,
      age_class: r.age_class,
      position: r.position,
      points: r.points,
      created_at: r.created_at
    }));
    if (rows.length === 0) { setMessage("No rows to download for current filters."); return; }
    const header = Object.keys(rows[0]);
    const csv = [
      header.join(","),
      ...rows.map(r => header.map(h => {
        const v = r[h] ?? "";
        return `"${String(v).replace(/"/g,'""')}"`;
      }).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaderboard_entries_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage("CSV download started.");
  };

  if (!logged) {
    return (
      <div className="app">
        <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/logo.png" alt="Forest Sports logo" className="logo" />
            <div>
              <h1 style={{ margin: 0 }}>Leaderboard Admin</h1>
              <div className="small">26th H.P. Forest Sports & Duty Meet, 2025 — Management</div>
            </div>
          </div>
          <div>
            <button className="btn" onClick={()=>{ window.open("/public", "_blank"); }}>Open public leaderboard</button>
          </div>
        </div>
        <AdminLogin onLogin={handleLogin} />
        {message && <div className="error" style={{ marginTop: 8 }}>{message}</div>}
      </div>
    );
  }

  const allowedSports = meta.ageClass ? allowedSportsFor(meta.ageClass) : [];

  return (
    <div className="app">
      <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="Forest Sports logo" className="logo" />
          <div>
            <h1 style={{ margin: 0 }}>Leaderboard Admin</h1>
            <div className="small">26th H.P. Forest Sports & Duty Meet, 2025 — Management</div>
          </div>
        </div>
        <div>
          <button className="btn" onClick={()=>{ window.open("/public", "_blank"); }}>Open public leaderboard</button>
        </div>
      </div>

      {/* Enter Results */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Enter Results (age class → sport → positions)</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ minWidth: 220 }}>
            <label>Age Class</label>
            <select className="input" value={meta.ageClass} onChange={e => handleAgeClassChange(e.target.value)}>
              <option value="">Select age class</option>
              {AGE_CLASSES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 320 }}>
            <label>Sport</label>
            <select className="input" disabled={!meta.ageClass} value={meta.sport} onChange={e => handleSportChange(e.target.value)}>
              <option value="">Select sport</option>
              {allowedSports.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {!meta.ageClass && <div className="small" style={{ marginTop: 6 }}>Choose Age Class first to see allowed sports.</div>}
          </div>
        </div>

        <div>
          <strong>Positions (team optional; player name optional)</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {[1, 2, 3, 4].map(pos => (
              <div key={pos} style={{ border: "1px solid #e6eef2", padding: 8, borderRadius: 6 }}>
                <div style={{ fontWeight: 700 }}>{pos}{pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'} Position</div>
                <div style={{ marginTop: 6 }}>
                  <select className="input" value={positions[pos].team} onChange={e => setPositionTeam(pos, e.target.value)}>
                    <option value="">— Individual / No Team —</option>
                    {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div style={{ marginTop: 8 }}>
                  <label>Player name (optional)</label>
                  <input className="input" value={positions[pos].player} onChange={e => setPositionPlayer(pos, e.target.value)} placeholder="Enter player name (optional)" />
                </div>

                <div className="small" style={{ marginTop: 6 }}>Points: {pointsForSportPosition(meta.sport || "", pos)}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn" onClick={submitResults} disabled={loading}>Submit Results</button>
            <button className="btn secondary" onClick={() => { setMeta({ ageClass: "", sport: "" }); setPositions({ 1: { team: "", player: "" }, 2: { team: "", player: "" }, 3: { team: "", player: "" }, 4: { team: "", player: "" } }); setMessage(""); }}>Reset</button>
            <button className="btn secondary" onClick={fetchEntries}>Refresh</button>
          </div>

          {message && <div className="error" style={{ marginTop: 8 }}>{message}</div>}
        </div>
      </div>

      {/* Leaderboard (below Enter Results) */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Leaderboard (Team totals)</h3>
        {leaderboard.length === 0 ? <div className="small">No team scores yet</div> :
          leaderboard.map((r, idx) => (
            <div key={r.team} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderRadius: 6, background: "rgba(15,118,110,0.04)", marginBottom: 6 }}>
              <div><strong>{idx + 1}. {r.team}</strong><div className="small">{r.gold}🥇 {r.silver}🥈 {r.bronze}🥉 {r.fourth}4th</div></div>
              <div style={{ fontWeight: 700 }}>{r.points} pts</div>
            </div>
          ))
        }
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button className="btn" onClick={generateWhatsAppMessage}>Generate WhatsApp Message</button>
          <button className="btn secondary" onClick={fetchEntries}>Refresh</button>
        </div>
      </div>

      {/* Manage Entries */}
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Manage Entries</h3>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
          <div>
            <label>Filter Age Class</label>
            <select className="input" value={filterAge} onChange={e => setFilterAge(e.target.value)}>
              <option value="">All age classes</option>
              {AGE_CLASSES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label>Filter Sport</label>
            <select className="input" value={filterSport} onChange={e => setFilterSport(e.target.value)}>
              <option value="">All sports</option>
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn" onClick={downloadCSV}>Download CSV</button>
            <button className="btn secondary" onClick={fetchEntries}>Reload</button>
          </div>
        </div>

        {loading ? <div className="small">Loading...</div> : (
          <table className="table">
            <thead><tr><th>Team</th><th>Player</th><th>Sport</th><th>Age Class</th><th>Pos</th><th>Pts</th><th>Action</th></tr></thead>
            <tbody>
              {filteredEntries.map(e => (
                <tr key={e.id}>
                  <td>{e.team_name || <span className="small">Individual</span>}</td>
                  <td>{e.player_name || "-"}</td>
                  <td>{e.sport}</td>
                  <td>{e.age_class}</td>
                  <td>{e.position}</td>
                  <td>{e.points}</td>
                  <td>
                    <button className="btn small" onClick={() => editEntry(e)}>Edit</button>
                    <button className="btn secondary" onClick={() => deleteEntry(e.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
