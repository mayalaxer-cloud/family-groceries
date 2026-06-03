import { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDt5F-RFMCYU7JRmBMTm5tyboWD5cW5BU0",
  authDomain: "freudenberger-groceries-app.firebaseapp.com",
  projectId: "freudenberger-groceries-app",
  storageBucket: "freudenberger-groceries-app.firebasestorage.app",
  messagingSenderId: "971527147357",
  appId: "1:971527147357:web:1b116a07c5b6383927e2b4"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);



const CATEGORIES = ["🥦 ירקות ופירות","🥩 בשר ודגים","🧀 מוצרי חלב","🥖 מאפים","🥫 מזון יבש","🧃 משקאות","🧴 ניקיון ובית","❄️ מוצרי קפוא","🍬 חטיפים","אחר"];
const STORES = [
  { name: "רמי לוי", emoji: "🔴", color: "#e74c3c" },
  { name: "כורזין",  emoji: "🟢", color: "#27ae60" },
  { name: "אחר",    emoji: "🛍️", color: "#8e44ad" },
];
const FAMILY_MEMBERS = ["קובי","מאיה","תותי","עומר","ג׳ון-ג׳ון"];
const MEMBER_COLORS = {
  "קובי":       { bg: "#FF6B6B", shadow: "#c0392b", emoji: "🦁" },
  "מאיה":       { bg: "#A29BFE", shadow: "#6c5ce7", emoji: "🦄" },
  "תותי":       { bg: "#FD79A8", shadow: "#c0346a", emoji: "🍓" },
  "עומר":       { bg: "#55EFC4", shadow: "#00b894", emoji: "🐢" },
  "ג׳ון-ג׳ון":  { bg: "#FDCB6E", shadow: "#e17055", emoji: "🌟" },
};
const STAR_POSITIONS = [
  {top:"8%",left:"5%",size:18,delay:0},{top:"15%",left:"92%",size:14,delay:0.3},
  {top:"35%",left:"2%",size:10,delay:0.6},{top:"55%",left:"95%",size:16,delay:0.9},
  {top:"75%",left:"4%",size:12,delay:1.2},{top:"90%",left:"88%",size:10,delay:0.4},
];

export default function GroceryApp() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [editItem, setEditItem] = useState(null);
  const [activeUser, setActiveUser] = useState("מאיה");
  const [filterCat, setFilterCat] = useState("הכל");
  const [filterMember, setFilterMember] = useState("הכל");
  const [filterStore, setFilterStore] = useState("הכל");
  const [showChecked, setShowChecked] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: "", qty: 1, unit: "יח׳", category: "🥦 ירקות ופירות", store: "רמי לוי", note: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [popItem, setPopItem] = useState(null);
  const nameRef = useRef();

  useEffect(() => {
    const q = query(collection(db, "groceries"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const resetForm = () => setForm({ name: "", qty: 1, unit: "יח׳", category: "🥦 ירקות ופירות", store: "רמי לוי", note: "" });
  const openAdd = () => { resetForm(); setEditItem(null); setView("add"); setTimeout(() => nameRef.current?.focus(), 100); };
  const openEdit = (item) => { setForm({ name: item.name, qty: item.qty, unit: item.unit, category: item.category, store: item.store || "רמי לוי", note: item.note || "" }); setEditItem(item); setView("edit"); setTimeout(() => nameRef.current?.focus(), 100); };

  const submitForm = async () => {
    if (!form.name.trim()) return;
    try {
      if (view === "edit" && editItem) {
        await updateDoc(doc(db, "groceries", editItem.id), { ...form, name: form.name.trim() });
        showToast(`✏️ "${form.name.trim()}" עודכן!`);
      } else {
        await addDoc(collection(db, "groceries"), { ...form, name: form.name.trim(), addedBy: activeUser, checked: false, createdAt: serverTimestamp() });
        showToast(`⭐ "${form.name.trim()}" נוסף!`);
      }
      resetForm(); setView("list");
    } catch { showToast("❌ שגיאה, נסי שוב"); }
  };

  const toggleCheck = async (item) => {
    setPopItem(item.id); setTimeout(() => setPopItem(null), 600);
    await updateDoc(doc(db, "groceries", item.id), { checked: !item.checked });
  };

  const deleteItem = async (id) => {
    const item = items.find(i => i.id === id);
    await deleteDoc(doc(db, "groceries", id));
    setDeleteConfirm(null);
    showToast(`🗑️ "${item?.name}" הוסר`);
  };

  const clearChecked = async () => {
    const checked = items.filter(i => i.checked);
    await Promise.all(checked.map(i => deleteDoc(doc(db, "groceries", i.id))));
    showToast(`🧹 ${checked.length} פריטים נוקו!`);
  };

  const filtered = items.filter(i => {
    if (!showChecked && i.checked) return false;
    if (filterCat !== "הכל" && i.category !== filterCat) return false;
    if (filterMember !== "הכל" && i.addedBy !== filterMember) return false;
    if (filterStore !== "הכל" && i.store !== filterStore) return false;
    return true;
  });

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const usedCategories = ["הכל", ...CATEGORIES.filter(c => items.some(i => i.category === c))];
  const usedMembers = ["הכל", ...FAMILY_MEMBERS.filter(m => items.some(i => i.addedBy === m))];
  const mc = MEMBER_COLORS[activeUser];
  const inputStyle = { width:"100%", padding:"13px 14px", borderRadius:14, border:"2px solid rgba(162,155,254,0.4)", background:"rgba(255,255,255,0.07)", fontSize:16, fontFamily:"inherit", color:"#fff", outline:"none", boxSizing:"border-box", textAlign:"right" };

  return (
    <div dir="rtl" style={{ minHeight:"100vh", background:"linear-gradient(160deg,#0f0c29,#302b63,#24243e)", fontFamily:"'Segoe UI','Arial Hebrew',Arial,sans-serif", color:"#fff", paddingBottom:100, position:"relative", overflow:"hidden" }}>
      {STAR_POSITIONS.map((s,i) => <div key={i} style={{ position:"fixed", top:s.top, left:s.left, width:s.size, height:s.size, background:"white", borderRadius:"50%", opacity:0.15, animation:`twinkle 3s ${s.delay}s infinite ease-in-out`, pointerEvents:"none" }} />)}

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#6c5ce7,#a29bfe)", padding:"0 20px", position:"sticky", top:0, zIndex:100, boxShadow:"0 4px 20px rgba(108,92,231,0.5)", borderBottom:"3px solid #a29bfe" }}>
        <div style={{ maxWidth:600, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0 8px" }}>
            <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"4px 12px", fontSize:12, fontWeight:700 }}>{checkedCount}/{totalCount} ✓</div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:24, fontWeight:900, textShadow:"0 2px 8px rgba(0,0,0,0.4)" }}>🛒 רשימת הקניות</div>
              <div style={{ fontSize:11, opacity:0.8, marginTop:1 }}>של משפחת פרוידנברגר 👨‍👩‍👧‍👦</div>
            </div>
            <div style={{ width:60 }} />
          </div>
          <div style={{ paddingBottom:12 }}>
            <div style={{ fontSize:11, opacity:0.7, marginBottom:6, textAlign:"center" }}>👾 בחר שחקן</div>
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
              {FAMILY_MEMBERS.map(m => { const c=MEMBER_COLORS[m]; const active=activeUser===m; return (
                <button key={m} onClick={()=>setActiveUser(m)} style={{ padding:"6px 14px", borderRadius:20, border:active?"3px solid #fff":"3px solid transparent", background:active?c.bg:"rgba(255,255,255,0.1)", color:"#fff", fontSize:13, fontWeight:active?800:500, cursor:"pointer", fontFamily:"inherit", boxShadow:active?`0 0 16px ${c.bg}99`:"none", transform:active?"scale(1.08)":"scale(1)", transition:"all 0.2s" }}>{c.emoji} {m}</button>
              );})}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:600, margin:"0 auto", padding:"0 16px" }}>
        {/* XP Bar */}
        {totalCount > 0 && (
          <div style={{ padding:"16px 0 8px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:8, opacity:0.85 }}>
              <span style={{ fontWeight:700 }}>⚡ התקדמות: {Math.round((checkedCount/totalCount)*100)}%</span>
              {checkedCount>0 && <button onClick={clearChecked} style={{ background:"rgba(255,107,107,0.25)", border:"2px solid #ff6b6b", color:"#ff6b6b", fontSize:11, cursor:"pointer", fontFamily:"inherit", borderRadius:10, padding:"2px 10px", fontWeight:700 }}>🧹 נקה ({checkedCount})</button>}
            </div>
            <div style={{ height:14, background:"rgba(255,255,255,0.1)", borderRadius:10, overflow:"hidden", border:"2px solid rgba(255,255,255,0.15)" }}>
              <div style={{ height:"100%", width:`${(checkedCount/totalCount)*100}%`, background:"linear-gradient(90deg,#55efc4,#00cec9,#6c5ce7)", borderRadius:10, transition:"width 0.5s cubic-bezier(.34,1.56,.64,1)", boxShadow:"0 0 10px #55efc4aa" }} />
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ paddingBottom:8 }}>
          <div style={{ display:"flex", gap:6, flexDirection:"row-reverse", overflowX:"auto", paddingBottom:4 }}>
            {usedCategories.map(c => <button key={c} onClick={()=>setFilterCat(c)} style={{ whiteSpace:"nowrap", padding:"5px 12px", borderRadius:16, border:filterCat===c?"2px solid #a29bfe":"2px solid rgba(255,255,255,0.15)", background:filterCat===c?"#6c5ce7":"rgba(255,255,255,0.07)", color:filterCat===c?"#fff":"rgba(255,255,255,0.7)", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:filterCat===c?700:400, transition:"all 0.15s" }}>{c}</button>)}
          </div>
          <div style={{ display:"flex", gap:6, flexDirection:"row-reverse", overflowX:"auto", paddingTop:4 }}>
            {usedMembers.map(m => { const c=MEMBER_COLORS[m]; const active=filterMember===m; return <button key={m} onClick={()=>setFilterMember(m)} style={{ whiteSpace:"nowrap", padding:"4px 10px", borderRadius:16, border:active?`2px solid ${c?.bg||"#fff"}`:"2px solid rgba(255,255,255,0.15)", background:active?(c?.bg||"#6c5ce7"):"rgba(255,255,255,0.07)", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:active?700:400, transition:"all 0.15s" }}>{c?`${c.emoji} `:""}{m}</button>; })}
            <button onClick={()=>setShowChecked(v=>!v)} style={{ whiteSpace:"nowrap", padding:"4px 10px", borderRadius:16, border:showChecked?"2px solid #55efc4":"2px solid rgba(255,255,255,0.15)", background:showChecked?"#00b894":"rgba(255,255,255,0.07)", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:showChecked?700:400 }}>✓ הצג גמורים</button>
          </div>
          <div style={{ display:"flex", gap:6, flexDirection:"row-reverse", overflowX:"auto", paddingTop:4 }}>
            {["הכל",...STORES.map(s=>s.name)].map(s => { const store=STORES.find(x=>x.name===s); const active=filterStore===s; return <button key={s} onClick={()=>setFilterStore(s)} style={{ whiteSpace:"nowrap", padding:"4px 12px", borderRadius:16, border:active?`2px solid ${store?.color||"#a29bfe"}`:"2px solid rgba(255,255,255,0.15)", background:active?(store?.color||"#6c5ce7"):"rgba(255,255,255,0.07)", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:active?700:400, transition:"all 0.15s" }}>{store?`${store.emoji} `:""}{s}</button>; })}
          </div>
        </div>

        {loading && <div style={{ textAlign:'center', padding:'60px 0', opacity:0.7 }}><div style={{ fontSize:40, animation:'float 1.5s infinite ease-in-out' }}>🛒</div><div style={{ fontSize:14, marginTop:12 }}>טוען רשימה...</div></div>}
        {!loading && filtered.length===0 && <div style={{ textAlign:"center", padding:"60px 0", opacity:0.6 }}><div style={{ fontSize:50, marginBottom:12, animation:"float 3s infinite ease-in-out" }}>🌌</div><div style={{ fontSize:16, fontWeight:700 }}>הרשימה ריקה — הוסיפו משהו!</div></div>}

        {!loading && filtered.length>0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10, paddingTop:4 }}>
            {filtered.map(item => {
              const imc=MEMBER_COLORS[item.addedBy]||{bg:"#a29bfe",shadow:"#6c5ce7",emoji:"👤"};
              const isPop=popItem===item.id;
              const storeInfo=STORES.find(s=>s.name===item.store);
              return (
                <div key={item.id} style={{ background:item.checked?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.08)", borderRadius:18, padding:"14px 16px", border:item.checked?"2px solid rgba(255,255,255,0.08)":`2px solid ${imc.bg}55`, display:"flex", alignItems:"center", gap:12, opacity:item.checked?0.55:1, transition:"all 0.25s", boxShadow:item.checked?"none":`0 4px 16px ${imc.bg}22`, transform:isPop?"scale(1.03)":"scale(1)", backdropFilter:"blur(6px)" }}>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={()=>openEdit(item)} style={{ width:34, height:34, borderRadius:10, border:"2px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.08)", cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>✏️</button>
                    <button onClick={()=>setDeleteConfirm(item.id)} style={{ width:34, height:34, borderRadius:10, border:"2px solid rgba(255,107,107,0.4)", background:"rgba(255,107,107,0.1)", cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center" }}>🗑</button>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:16, fontWeight:700, textDecoration:item.checked?"line-through":"none", color:item.checked?"rgba(255,255,255,0.4)":"#fff" }}>{item.name}</span>
                      <span style={{ fontSize:13, color:"rgba(255,255,255,0.6)", background:"rgba(255,255,255,0.08)", borderRadius:8, padding:"1px 7px" }}>{item.qty} {item.unit}</span>
                    </div>
                    <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
                      <span style={{ fontSize:11, opacity:0.6 }}>{item.category}</span>
                      <span style={{ fontSize:11, color:"#fff", background:imc.bg, borderRadius:10, padding:"2px 8px", fontWeight:700 }}>{imc.emoji} {item.addedBy}</span>
                      {storeInfo && <span style={{ fontSize:11, color:"#fff", background:storeInfo.color, borderRadius:10, padding:"2px 8px", fontWeight:700 }}>{storeInfo.emoji} {item.store}</span>}
                      {item.note && <span style={{ fontSize:11, opacity:0.55, fontStyle:"italic" }}>"{item.note}"</span>}
                    </div>
                  </div>
                  <button onClick={()=>toggleCheck(item)} style={{ width:32, height:32, borderRadius:10, flexShrink:0, border:`3px solid ${item.checked?"#55efc4":"rgba(255,255,255,0.25)"}`, background:item.checked?"#55efc4":"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#1a1a2e", fontWeight:900, boxShadow:item.checked?"0 0 12px #55efc4aa":"none", transition:"all 0.2s cubic-bezier(.34,1.56,.64,1)", transform:isPop?"scale(1.3) rotate(10deg)":"scale(1)" }}>{item.checked?"✓":""}</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Overlay */}
      {(view==="add"||view==="edit") && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,12,41,0.85)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={e=>{if(e.target===e.currentTarget){setView("list");resetForm();}}}>
          <div style={{ background:"linear-gradient(160deg,#1a1a3e,#2d2b55)", borderRadius:"28px 28px 0 0", padding:"24px 20px 44px", width:"100%", maxWidth:600, border:"2px solid rgba(162,155,254,0.3)", borderBottom:"none", boxShadow:"0 -8px 40px rgba(108,92,231,0.4)", overflowY:"auto", maxHeight:"90vh" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <button onClick={()=>{setView("list");resetForm();}} style={{ background:"rgba(255,255,255,0.1)", border:"2px solid rgba(255,255,255,0.2)", borderRadius:12, width:36, height:36, cursor:"pointer", fontSize:20, color:"#fff" }}>×</button>
              <h2 style={{ margin:0, fontSize:20, color:"#fff", fontWeight:800 }}>{view==="edit"?"✏️ עריכת פריט":"⭐ הוספה לרשימה"}</h2>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:6, textAlign:"right", fontWeight:700 }}>שם הפריט *</label>
                <input ref={nameRef} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&submitForm()} placeholder="לדוגמה: ביצים אורגניות" dir="rtl" style={inputStyle} />
              </div>
              <div style={{ display:"flex", gap:10, flexDirection:"row-reverse" }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:6, textAlign:"right", fontWeight:700 }}>כמות</label>
                  <input type="number" min="0.25" step="0.25" value={form.qty} onChange={e=>setForm(f=>({...f,qty:parseFloat(e.target.value)||1}))} style={{...inputStyle,textAlign:"center"}} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:6, textAlign:"right", fontWeight:700 }}>יחידה</label>
                  <input value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))} placeholder="יח׳, קג…" dir="rtl" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:6, textAlign:"right", fontWeight:700 }}>🏪 מקום קניה</label>
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  {STORES.map(s => <button key={s.name} onClick={()=>setForm(f=>({...f,store:s.name}))} style={{ flex:1, padding:"10px 8px", borderRadius:14, fontSize:13, cursor:"pointer", border:form.store===s.name?`2px solid ${s.color}`:"2px solid rgba(255,255,255,0.15)", background:form.store===s.name?s.color:"rgba(255,255,255,0.07)", color:"#fff", fontFamily:"inherit", fontWeight:form.store===s.name?700:400, boxShadow:form.store===s.name?`0 0 12px ${s.color}88`:"none", transition:"all 0.2s" }}>{s.emoji}<br/>{s.name}</button>)}
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:6, textAlign:"right", fontWeight:700 }}>קטגוריה</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
                  {CATEGORIES.map(c => <button key={c} onClick={()=>setForm(f=>({...f,category:c}))} style={{ padding:"6px 12px", borderRadius:14, fontSize:12, cursor:"pointer", border:form.category===c?"2px solid #a29bfe":"2px solid rgba(255,255,255,0.15)", background:form.category===c?"#6c5ce7":"rgba(255,255,255,0.07)", color:"#fff", fontFamily:"inherit", fontWeight:form.category===c?700:400 }}>{c}</button>)}
                </div>
              </div>
              <div>
                <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:6, textAlign:"right", fontWeight:700 }}>הערה (אופציונלי)</label>
                <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="מותג, גודל, העדפות…" dir="rtl" style={{...inputStyle,fontSize:14}} />
              </div>
              {view==="add" && (
                <div>
                  <label style={{ fontSize:11, color:"rgba(255,255,255,0.6)", display:"block", marginBottom:6, textAlign:"right", fontWeight:700 }}>מוסיף בשם</label>
                  <div style={{ display:"flex", gap:6, justifyContent:"flex-end", flexWrap:"wrap" }}>
                    {FAMILY_MEMBERS.map(m => { const c=MEMBER_COLORS[m]; return <button key={m} onClick={()=>setActiveUser(m)} style={{ padding:"6px 12px", borderRadius:14, fontSize:12, cursor:"pointer", border:activeUser===m?`2px solid ${c.bg}`:"2px solid rgba(255,255,255,0.15)", background:activeUser===m?c.bg:"rgba(255,255,255,0.07)", color:"#fff", fontFamily:"inherit", fontWeight:activeUser===m?700:400 }}>{c.emoji} {m}</button>; })}
                  </div>
                </div>
              )}
              <button onClick={submitForm} disabled={!form.name.trim()} style={{ padding:"16px", borderRadius:16, border:"none", background:form.name.trim()?`linear-gradient(135deg,${mc.bg},${mc.shadow})`:"rgba(255,255,255,0.1)", color:"#fff", fontSize:16, fontWeight:800, cursor:form.name.trim()?"pointer":"not-allowed", fontFamily:"inherit", marginTop:4, boxShadow:form.name.trim()?`0 4px 20px ${mc.bg}66`:"none", transition:"all 0.2s" }}>
                {view==="edit"?"💾 שמור שינויים":`⭐ הוסף "${form.name||"פריט"}" לרשימה`}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(15,12,41,0.85)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(4px)" }}>
          <div style={{ background:"linear-gradient(160deg,#2d1b1b,#3d1f1f)", borderRadius:20, padding:28, maxWidth:320, width:"100%", textAlign:"center", border:"2px solid rgba(255,107,107,0.3)" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>💣</div>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:6 }}>להסיר פריט?</div>
            <div style={{ fontSize:14, opacity:0.7, marginBottom:22 }}>"{items.find(i=>i.id===deleteConfirm)?.name}" יוסר לצמיתות!</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>deleteItem(deleteConfirm)} style={{ flex:1, padding:13, borderRadius:12, border:"none", background:"linear-gradient(135deg,#ff6b6b,#c0392b)", color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:"inherit" }}>💥 הסר!</button>
              <button onClick={()=>setDeleteConfirm(null)} style={{ flex:1, padding:13, borderRadius:12, border:"2px solid rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.07)", cursor:"pointer", fontSize:14, fontFamily:"inherit", color:"#fff" }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:"fixed", bottom:100, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#6c5ce7,#a29bfe)", color:"#fff", padding:"12px 22px", borderRadius:28, fontSize:14, fontWeight:700, zIndex:400, boxShadow:"0 4px 20px rgba(108,92,231,0.5)", animation:"popUp 0.35s cubic-bezier(.34,1.56,.64,1)", whiteSpace:"nowrap", border:"2px solid rgba(255,255,255,0.2)" }}>{toast}</div>}

      <button onClick={openAdd} style={{ position:"fixed", bottom:28, left:28, width:64, height:64, borderRadius:20, background:`linear-gradient(135deg,${mc.bg},${mc.shadow})`, border:"3px solid rgba(255,255,255,0.3)", color:"#fff", fontSize:30, cursor:"pointer", boxShadow:`0 6px 24px ${mc.bg}88`, display:"flex", alignItems:"center", justifyContent:"center", zIndex:150, transition:"all 0.2s cubic-bezier(.34,1.56,.64,1)", fontWeight:900 }}
        onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.15) rotate(-5deg)";}}
        onMouseLeave={e=>{e.currentTarget.style.transform="scale(1) rotate(0deg)";}}
      >+</button>

      <style>{`
        @keyframes twinkle{0%,100%{opacity:0.1;transform:scale(1)}50%{opacity:0.35;transform:scale(1.4)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes popUp{from{opacity:0;transform:translate(-50%,14px) scale(0.85)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
        *{-webkit-tap-highlight-color:transparent;}
        input:focus{border-color:#a29bfe!important;}
        ::-webkit-scrollbar{display:none;}
      `}</style>
    </div>
  );
}
