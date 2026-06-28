const STATE = { currentUser: '', currentRole: '', loginTime: '', tempItems: [], editItemIndex: -1, prevScreen: 'dashboard', newJobDetails: null, editingCardId: null };
const STAGE_CFG = {
  "Job Card Created": { color: "#c9963a", pct: 5 },
  "Handover to Design": { color: "#b8860b", pct: 12 },
  "Design In Progress": { color: "#a855f7", pct: 18 },
  "Handover to Production": { color: "#e8a030", pct: 25 },
  "Material Approval": { color: "#06b6d4", pct: 30 },
  "Materials Approved": { color: "#4caf78", pct: 35 },
  "Pressing": { color: "#c084fc", pct: 40 },
  "BIM Saw": { color: "#a855f7", pct: 48 },
  "Edge Banding": { color: "#8b5cf6", pct: 56 },
  "CNC": { color: "#6366f1", pct: 64 },
  "Cleaning": { color: "#ec4899", pct: 72 },
  "Fitting": { color: "#db2777", pct: 80 },
  "SW Carpentry": { color: "#7c3aed", pct: 50 },
  "Upholstery": { color: "#db2777", pct: 65 },
  "Polish": { color: "#eab308", pct: 85 },
  "Packing": { color: "#6b7280", pct: 92 },
  "QC Requested": { color: "#e8a030", pct: 94 },
  "QC Passed": { color: "#4caf78", pct: 97 },
  "Rework": { color: "#e05555", pct: 80 },
  "Dispatched": { color: "#84cc16", pct: 100 },
  "Query from Design": { color: "#e05555", pct: 10 },
  "Query from Production": { color: "#e05555", pct: 22 }
};
const PANEL_STAGES = ["Pressing", "BIM Saw", "Edge Banding", "CNC", "Cleaning", "Fitting", "Packing"];
const SOFA_STAGES = ["SW Carpentry", "Upholstery", "Polish", "Packing"];
const DEPT_ROLES = ["SW Carpentry", "Upholstery"];
const IN_PROD_STAGES = ["Handover to Production", "Material Approval", "Materials Approved", "Pressing", "BIM Saw", "Edge Banding", "CNC", "Cleaning", "Fitting", "SW Carpentry", "Upholstery", "Polish", "Packing", "QC Requested", "QC Passed", "Rework"];
const ROLE_INFO = { "Project Coordinator": { abbr: "PC", cls: "role-pc" }, "Design Head": { abbr: "DH", cls: "role-dh" }, "Production Head": { abbr: "PH", cls: "role-ph" }, "Purchase Head": { abbr: "PUR", cls: "role-pur" }, "Store": { abbr: "ST", cls: "role-store" }, "Admin": { abbr: "ADM", cls: "role-admin" } };
const getRoleInfo = r => ROLE_INFO[r] || { abbr: r.substring(0, 3).toUpperCase(), cls: "role-dept" };
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz2iFFQqe3CuaaXyi4bz_yMvFjC21XJe15_haCPdaJ_5ppPfJzGmkewFCqkEGGVIYE/exec"; // Paste Apps Script Web App URL here
const DB = {
  getCards: () => JSON.parse(localStorage.getItem('FF_Cards') || '[]'),
  setCards: (c) => { localStorage.setItem('FF_Cards', JSON.stringify(c)); syncToGoogle("setCards", c); },
  getCard: (id) => DB.getCards().find(c => c.id === id),
  saveCard: (id, u) => { let cs = DB.getCards(), i = cs.findIndex(c => c.id === id); if (i > -1) { cs[i] = { ...cs[i], ...u }; DB.setCards(cs); } },
  addCard: (c) => { let cs = DB.getCards(); cs.push(c); DB.setCards(cs); },
  deleteCard: (id) => { let cs = DB.getCards().filter(c => c.id !== id); DB.setCards(cs); },
  getMats: () => JSON.parse(localStorage.getItem('FF_Mats') || '[]'),
  setMats: (m) => { localStorage.setItem('FF_Mats', JSON.stringify(m)); syncToGoogle("setMats", m); },
  getUsers: () => JSON.parse(localStorage.getItem('FF_Users') || '[]'),
  setUsers: (u) => { localStorage.setItem('FF_Users', JSON.stringify(u)); syncToGoogle("setUsers", u); }
};

function syncToGoogle(action, data) {
  if (!GOOGLE_SCRIPT_URL) return;
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: action, data: data })
  }).then(() => {
    console.log("Background sync successful: " + action);
  }).catch(err => {
    console.warn("Background sync failed: " + err);
  });
}

function initGoogleSync() {
  if (!GOOGLE_SCRIPT_URL) return;
  Promise.all([
    fetch(GOOGLE_SCRIPT_URL + "?action=getCards").then(r => r.json()).catch(() => null),
    fetch(GOOGLE_SCRIPT_URL + "?action=getMats").then(r => r.json()).catch(() => null),
    fetch(GOOGLE_SCRIPT_URL + "?action=getUsers").then(r => r.json()).catch(() => null)
  ]).then(results => {
    const [cards, mats, users] = results;
    let updated = false;
    if (cards && Array.isArray(cards) && cards.length > 0) {
      localStorage.setItem('FF_Cards', JSON.stringify(cards));
      updated = true;
    }
    if (mats && Array.isArray(mats) && mats.length > 0) {
      localStorage.setItem('FF_Mats', JSON.stringify(mats));
      updated = true;
    }
    if (users && Array.isArray(users) && users.length > 0) {
      localStorage.setItem('FF_Users', JSON.stringify(users));
      updated = true;
    }
    if (updated) {
      showToast("Data Synced with Google Sheets!");
      if (STATE.currentUser) {
        navigate(STATE.prevScreen || 'dashboard');
      }
    }
  });
}
const $ = id => document.getElementById(id);
const ts = () => Date.now().toString();
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '--';
function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('toast-container').appendChild(t); setTimeout(() => t.remove(), 3000); }

const APP = document.getElementById('app-container');
const TPLS = {};
document.querySelectorAll('template[id^="tpl-"]').forEach(t => { TPLS[t.id.replace('tpl-', '')] = t; });
function navigate(screen, params = {}) {
  const tpl = TPLS[screen]; if (!tpl) return;
  APP.innerHTML = ''; APP.appendChild(tpl.content.cloneNode(true));
  APP.querySelectorAll('[data-action="back"]').forEach(b => b.onclick = () => navigate(STATE.prevScreen));
  APP.querySelectorAll('[data-action="logout"]').forEach(b => b.onclick = doLogout);
  updateNav(screen); SCREENS[screen] && SCREENS[screen](params);
}
function updateNav(screen) {
  const nav = $('bottom-nav');
  if (['login', 'newJob', 'itemEdit', 'jobDetail', 'jobBomDetail'].includes(screen)) { nav.classList.add('hidden'); return; }
  nav.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.target === screen));
  $('nav-materials').classList.toggle('hidden', !['Store', 'Purchase Head', 'Admin'].includes(STATE.currentRole));
}
function doLogout() { if (!confirm('Are you sure you want to logout?')) return; STATE.currentUser = ''; STATE.currentRole = ''; STATE.tempItems = []; showToast('Logged out'); navigate('login'); }

const SCREENS = {};
SCREENS.login = () => {
  $('login-form').onsubmit = e => {
    e.preventDefault();
    const un = $('username').value.trim();
    const pw = $('password').value;
    const users = DB.getUsers();
    const user = users.find(u => u.username.toLowerCase() === un.toLowerCase() && u.password === pw);
    if (user) {
      STATE.currentUser = user.username;
      STATE.currentRole = user.role;
      STATE.loginTime = new Date().toLocaleString('en-IN');
      STATE.tempItems = [];
      navigate('dashboard');
    } else {
      showToast('Invalid username or password');
    }
  };
};
SCREENS.dashboard = () => {
  STATE.prevScreen = 'dashboard';
  const role = STATE.currentRole, info = getRoleInfo(role);
  $('db-title').textContent = 'FurniFlow';

  APP.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    APP.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    APP.querySelectorAll('.tab-pane').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('tab-' + t.dataset.tab).classList.add('active');
  });

  const canCreate = ['Project Coordinator', 'Admin'].includes(role);
  if (canCreate) { $('btn-new-job').classList.remove('hidden'); $('btn-new-job').onclick = () => { STATE.prevScreen = 'dashboard'; STATE.newJobDetails = null; STATE.tempItems = []; navigate('newJob'); }; }

  const content = $('dashboard-content'), cards = DB.getCards().sort((a, b) => b.createdAt - a.createdAt);
  content.innerHTML = '<div class="welcome-banner"><h3>Welcome, ' + (STATE.currentUser || role) + '</h3><p>' + role + ' Dashboard</p></div>';

  if (role === 'Project Coordinator') renderDashPC(content, cards);
  else if (role === 'Design Head') renderDashDH(content, cards);
  else if (role === 'Production Head') renderDashPH(content, cards);
  else if (role === 'Purchase Head') renderDashPUR(content, cards);
  else if (role === 'Store') renderDashStore(content, cards);
  else if (role === 'Admin') renderDashAdmin(content, cards);
  else renderDashDept(content, cards, role);

  if (role === 'Admin' || role === 'Project Coordinator') {
    $('tab-btn-costs').classList.remove('hidden');
    renderCosts(cards);
    if (role === 'Admin') {
      $('tab-btn-users').classList.remove('hidden');
      renderUserManagement();
    } else {
      if ($('tab-btn-users')) $('tab-btn-users').classList.add('hidden');
    }
  } else {
    if ($('tab-btn-costs')) $('tab-btn-costs').classList.add('hidden');
    if ($('tab-btn-users')) $('tab-btn-users').classList.add('hidden');
  }

  renderTimeline(cards);

  // Live search filter
  const srch = $('db-search');
  if (srch) {
    srch.oninput = () => {
      const q = srch.value.toLowerCase().trim();
      document.querySelectorAll('#dashboard-content .list-item-card').forEach(el => {
        el.style.display = (!q || el.textContent.toLowerCase().includes(q)) ? '' : 'none';
      });
    };
    srch.focus();
  }
};

function renderUserManagement() {
  const el = $('dashboard-users');
  if (!el) return;
  const users = DB.getUsers();

  let html = `<div class="card mb-3">
    <h4>Add / Edit User</h4>
    <form id="form-user" class="form-row" style="align-items:flex-end">
      <input type="hidden" id="um-id">
      <div class="form-group"><label>Username</label><input type="text" id="um-username" required autocomplete="off"></div>
      <div class="form-group"><label>Password</label><input type="text" id="um-password" required autocomplete="off"></div>
      <div class="form-group"><label>Role</label><select id="um-role" required>
        <option value="Project Coordinator">Project Coordinator</option>
        <option value="Design Head">Design Head</option>
        <option value="Production Head">Production Head</option>
        <option value="Purchase Head">Purchase Head</option>
        <option value="Store">Store Manager</option>
        <option value="SW Carpentry">Solid Wood Carpentry</option>
        <option value="Upholstery">Upholstery</option>
        <option value="Admin">Admin</option>
      </select></div>
      <div class="form-group"><button type="submit" class="btn btn-primary" id="btn-save-user">Save User</button></div>
      <div class="form-group"><button type="button" class="btn btn-ghost hidden" id="btn-cancel-user" onclick="renderUserManagement()">Cancel</button></div>
    </form>
  </div>`;

  html += `<div class="section-title">Existing Users (${users.length})</div>
  <div style="overflow-x:auto;"><table class="ff-table">
    <thead><tr><th>Username</th><th>Password</th><th>Role</th><th>Actions</th></tr></thead><tbody>`;

  users.forEach(u => {
    html += `<tr>
      <td><b>${u.username}</b></td>
      <td>${u.password}</td>
      <td><span class="badge" style="background:var(--primary)">${u.role}</span></td>
      <td>
        <button class="btn btn-sm btn-indigo" onclick="editUser('${u.id}')">Edit</button>
        ${u.username !== 'admin' ? `<button class="btn btn-sm btn-red" onclick="deleteUser('${u.id}')">Delete</button>` : ''}
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  el.innerHTML = html;

  $('form-user').onsubmit = (e) => {
    e.preventDefault();
    const id = $('um-id').value;
    const un = $('um-username').value.trim();
    const pw = $('um-password').value;
    const rl = $('um-role').value;
    let us = DB.getUsers();

    if (us.some(x => x.username.toLowerCase() === un.toLowerCase() && x.id !== id)) {
      showToast('Username already exists'); return;
    }

    if (id) {
      const idx = us.findIndex(x => x.id === id);
      if (idx > -1) { us[idx].username = un; us[idx].password = pw; us[idx].role = rl; }
      showToast('User updated');
    } else {
      us.push({ id: 'U-' + ts(), username: un, password: pw, role: rl });
      showToast('User created');
    }
    DB.setUsers(us);
    renderUserManagement();
  };
}

window.editUser = function (id) {
  const u = DB.getUsers().find(x => x.id === id);
  if (u) {
    $('um-id').value = u.id;
    $('um-username').value = u.username;
    $('um-password').value = u.password;
    $('um-role').value = u.role;
    $('btn-save-user').textContent = 'Update User';
    $('btn-cancel-user').classList.remove('hidden');
  }
};

window.deleteUser = function (id) {
  if (!confirm('Delete this user?')) return;
  DB.setUsers(DB.getUsers().filter(x => x.id !== id));
  renderUserManagement();
};

function renderCosts(cards) {
  const el = $('dashboard-costs');
  if (!el) return;
  el.innerHTML = '<div class="section-title">Project Material Cost Summary</div>';
  let totalAll = 0;
  let html = '<div style="overflow-x:auto;"><table class="ff-table"><thead><tr><th>Job Card</th><th>Project Name</th><th>Status</th><th style="text-align:right">Material Cost</th></tr></thead><tbody>';
  cards.forEach(c => {
    const cost = (c.bom || []).reduce((s, b) => s + ((b.qty || 0) * (b.price || 0)), 0);
    totalAll += cost;
    const cfg = STAGE_CFG[c.stage] || { color: '#888' };
    html += `<tr onclick="showProjectCostModal('${c.id}')" style="cursor:pointer">
      <td style="font-size:0.75rem;color:var(--text-secondary)"><b>${c.id}</b><br><span style="font-size:0.65rem;color:#c9963a;font-weight:600">Art No: ${c.artNo || '--'}</span></td>
      <td style="font-weight:600">${c.projectName}</td>
      <td><span class="badge" style="background:${cfg.color};font-size:0.6rem">${c.stage}</span></td>
      <td style="text-align:right;font-weight:700;color:var(--green)">₹ ${cost.toLocaleString('en-IN')}</td>
    </tr>`;
  });
  html += `</tbody><tfoot><tr style="background:rgba(255,255,255,0.05)"><td colspan="3" style="font-weight:800;text-align:right">GRAND TOTAL</td><td style="text-align:right;font-weight:800;color:var(--green);font-size:1rem">₹ ${totalAll.toLocaleString('en-IN')}</td></tr></tfoot></table></div>`;
  el.innerHTML += html;

  // Add Export CSV Button
  const btnExport = document.createElement('button');
  btnExport.className = 'btn btn-indigo mt-3';
  btnExport.textContent = '📥 Export Costs to CSV';
  btnExport.onclick = () => {
    let csv = 'Job Card,Project Name,Client,Status,Material Cost (Rs)\n';
    cards.forEach(c => {
      const cost = (c.bom || []).reduce((s, b) => s + ((b.qty || 0) * (b.price || 0)), 0);
      csv += `${c.id},"${c.projectName || ''}","${c.clientName || ''}","${c.stage}",${cost}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Project_Costs.csv';
    a.click();
  };
  el.appendChild(btnExport);
}

function showProjectCostModal(id) {
  const card = DB.getCard(id);
  if (!card) return;
  const issued = (card.bom || []).filter(b => b.status === 'issued' || b.price > 0);

  let html = '<div class="modal-overlay" onclick="this.parentElement.innerHTML=\'\'"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>';
  html += '<div class="flex-between mb-2"><h3>Cost Breakdown: ' + card.projectName + '</h3><button class="btn btn-sm btn-indigo" onclick="$(\'modal-container\').innerHTML=\'\';navigate(\'jobDetail\',{id:\'' + id + '\'})">View Full Card</button></div>';
  html += '<p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px">Detailed list of materials issued and their costs.</p>';

  if (issued.length === 0) {
    html += '<div class="empty-state">No materials have been issued or priced for this project yet.</div>';
  } else {
    html += '<div style="overflow-x:auto;max-height:60vh;margin-bottom:20px"><table class="ff-table"><thead><tr><th>Category</th><th>Material</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>';
    let total = 0;
    issued.forEach(b => {
      const lineTotal = (b.qty || 0) * (b.price || 0);
      total += lineTotal;
      html += `<tr>
        <td style="font-size:0.65rem">${b.category || '--'}</td>
        <td style="font-size:0.75rem;font-weight:600">${b.material}</td>
        <td>${b.qty} ${b.unit}</td>
        <td>₹${b.price || 0}</td>
        <td style="text-align:right;font-weight:700;color:var(--green)">₹${lineTotal.toLocaleString('en-IN')}</td>
      </tr>`;
    });
    html += `</tbody><tfoot><tr style="background:rgba(255,255,255,0.05)"><td colspan="4" style="font-weight:800;text-align:right">PROJECT TOTAL</td><td style="text-align:right;font-weight:800;color:var(--green)">₹${total.toLocaleString('en-IN')}</td></tr></tfoot></table></div>`;
  }

  html += '<button class="btn btn-ghost btn-block" onclick="$(\'modal-container\').innerHTML=\'\'">Close</button></div></div>';
  $('modal-container').innerHTML = html;
}
function renderTimeline(cards) {
  const tl = $('dashboard-timeline');
  if (!tl) return;
  tl.innerHTML = '<div class="section-title">Project Stage Tracker</div>';
  if (!cards.length) { tl.innerHTML += '<div class="empty-state">No jobs found.</div>'; return; }
  cards.forEach(c => {
    const cfg = STAGE_CFG[c.stage] || { color: '#c9963a', pct: 5 };
    const div = document.createElement('div');
    div.className = 'card';
    div.style.borderLeft = '4px solid ' + cfg.color;
    div.innerHTML = `
        <div class="flex-between">
          <div style="font-weight:700;font-size:0.9rem">${c.projectName}</div>
          <span class="badge" style="background:${cfg.color}">${c.stage}</span>
        </div>
        <div class="item-subtitle" style="margin-bottom:8px">${c.id}</div>
        <div class="progress-bar-container"><div class="progress-bar" style="width:${c.stagePercent || cfg.pct}%;background:${cfg.color}"></div></div>
        <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:6px;display:flex;justify-content:space-between">
          <span><b>Stage:</b> ${c.stage}</span>
          <span style="color:var(--indigo)">Click to view history &rarr;</span>
        </div>
     `;
    div.onclick = () => showHistoryModal(c.id);
    tl.appendChild(div);
  });
}

function showHistoryModal(id) {
  const card = DB.getCard(id);
  if (!card) return;
  let html = '<div class="modal-overlay" onclick="this.parentElement.innerHTML=\'\'"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>';
  html += '<div class="flex-between mb-2"><h3>' + card.projectName + '</h3><button class="btn btn-sm btn-indigo" onclick="$(\'modal-container\').innerHTML=\'\';navigate(\'jobDetail\',{id:\'' + id + '\'})">View Full Card</button></div>';
  html += '<p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px">Full Project Lifecycle Tracking</p>';
  html += '<div class="timeline" style="margin-bottom:20px">';

  let history = card.stageHistory || [];
  if (history.length === 0) history = [{ stage: 'Job Card Created', date: card.jobCardDate || today(), time: '--', by: card.createdBy || 'Unknown' }];

  const base = ["Job Card Created", "Handover to Design", "Design In Progress", "Handover to Production", "Material Approval", "Materials Approved"];
  const prod = card.prodType === 'Panel' ? PANEL_STAGES : (card.prodType === 'Sofa' ? SOFA_STAGES : []);
  const final = ["QC Requested", "QC Passed", "Dispatched"];

  // Unique stages in order
  const allStages = Array.from(new Set([...base, ...prod, ...final]));

  allStages.forEach((s, idx) => {
    const h = history.find(x => x.stage === s);
    const nextS = allStages[idx + 1];
    const nextH = nextS ? history.find(x => x.stage === nextS) : null;

    const isDone = !!h;
    const isCurrent = card.stage === s;
    const cls = isDone ? 'done' : (isCurrent ? 'active' : 'pending');

    let dateInfo = '';
    if (isDone) {
      dateInfo = `<div style="font-size:0.65rem;color:var(--text-secondary);margin-top:2px">
          <b>Received:</b> ${fmtDate(h.date)} ${h.time !== '--' ? 'at ' + h.time : ''} (by ${h.by})<br>
          ${nextH ? `<b>Forwarded:</b> ${fmtDate(nextH.date)} ${nextH.time !== '--' ? 'at ' + nextH.time : ''}` : (isCurrent ? '<b style="color:var(--indigo)">Currently Working Here</b>' : '')}
        </div>`;
    } else {
      dateInfo = '<span style="font-size:0.65rem;color:#555">Pending</span>';
    }

    html += `<div class="tl-item ${cls}">
       <div class="tl-label">
         <b>${s}</b>
         ${dateInfo}
       </div>
     </div>`;
  });

  html += '</div><button class="btn btn-ghost btn-block" onclick="$(\'modal-container\').innerHTML=\'\'">Close</button></div></div>';
  $('modal-container').innerHTML = html;
}

function renderJobList(container, cards, clickable) {
  if (!cards.length) { container.innerHTML += '<div class="empty-state">No job cards found.</div>'; return; }
  cards.forEach(c => {
    const cfg = STAGE_CFG[c.stage] || { color: '#c9963a', pct: 5 };
    const el = document.createElement('div'); el.className = 'list-item-card';
    let sub = c.id + (c.artNo ? ' (Art No: ' + c.artNo + ')' : '') + ' - PO: ' + c.poNo + (c.currentDept ? ' - ' + c.currentDept : '');
    if (c.currentDeptStatus === 'Done') sub += ' <span style="color:#4caf78;font-weight:bold">(Ready to Forward)</span>';
    el.innerHTML = '<div class="flex-between mb-1"><div><div class="item-title">' + (c.projectName || 'Unnamed') + '</div><div class="item-subtitle">' + sub + '</div></div><span class="badge" style="background:' + cfg.color + '">' + c.stage + '</span></div><div class="progress-bar-container"><div class="progress-bar" style="width:' + (c.stagePercent || cfg.pct) + '%;background:' + cfg.color + '"></div></div>';
    if (clickable) el.onclick = () => { STATE.prevScreen = 'dashboard'; navigate('jobDetail', { id: c.id }); };
    container.appendChild(el);
  });
}
function makeStatCard(val, label, color, filter) {
  return '<div class="stat-card" onclick="showFilteredModal(\'' + label + '\',null,\'' + filter + '\')"><div class="stat-value" style="color:' + color + '">' + val + '</div><div class="stat-label">' + label + '</div></div>';
}

function renderDashPC(el, cards) {
  const a = cards.filter(c => c.stage !== 'Dispatched').length, d = cards.filter(c => ['Handover to Design', 'Design In Progress'].includes(c.stage)).length, p = cards.filter(c => IN_PROD_STAGES.includes(c.stage)).length, dis = cards.filter(c => c.stage === 'Dispatched').length;
  el.innerHTML += '<div class="stats-row">' + makeStatCard(a, 'Active', '#c9963a', 'active') + makeStatCard(d, 'Design', '#a855f7', 'design') + makeStatCard(p, 'Production', '#e8a030', 'production') + makeStatCard(dis, 'Dispatched', '#4caf78', 'Dispatched') + '</div>';

  const queries = cards.filter(c => c.stage === 'Query from Design');
  if (queries.length) {
    el.insertAdjacentHTML('beforeend', '<div class="section-title" style="color:var(--red)">Queries from Design (' + queries.length + ')</div>');
    renderJobList(el, queries, true);
  }

  el.insertAdjacentHTML('beforeend', '<div class="section-title">All Job Cards</div>');
  renderJobList(el, cards, true);
}
function renderDashDH(el, cards) {
  const mine = cards.filter(c => ['Handover to Design', 'Design In Progress', 'Query from Production'].includes(c.stage));
  const total = cards.length;
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">' + makeStatCard(mine.length, 'In Design', '#a855f7', 'design') + makeStatCard(total, 'Total Jobs', '#c9963a', 'all') + '</div>');

  const queries = cards.filter(c => c.stage === 'Query from Production');
  if (queries.length) {
    el.insertAdjacentHTML('beforeend', '<div class="section-title" style="color:var(--red)">Queries from Production (' + queries.length + ')</div>');
    renderJobList(el, queries, true);
  }

  el.insertAdjacentHTML('beforeend', '<div class="section-title">Jobs In Design (' + (mine.length - queries.length) + ')</div>');
  renderJobList(el, mine.filter(c => c.stage !== 'Query from Production'), true);

  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:16px">All Jobs (View Only)</div>');
  renderJobList(el, cards, true);
}
function renderDashPH(el, cards) {
  const prodCards = cards.filter(c => IN_PROD_STAGES.includes(c.stage));
  const approved = cards.filter(c => c.stage === 'Materials Approved');
  const handovers = cards.filter(c => c.stage === 'Handover to Production');
  const swCnt = prodCards.filter(c => c.currentDept === 'SW Carpentry').length;
  const uphCnt = prodCards.filter(c => c.currentDept === 'Upholstery').length;
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">' +
    makeStatCard(prodCards.length, 'In Prod', '#e8a030', 'production') +
    makeStatCard(approved.length, 'Mat. Approved', '#4caf78', 'Materials Approved') +
    makeStatCard(swCnt, 'Solid Wood', '#7c3aed', 'SW Carpentry') +
    makeStatCard(uphCnt, 'Upholstery', '#db2777', 'Upholstery') +
    '</div>');

  if (handovers.length) {
    el.insertAdjacentHTML('beforeend', '<div class="section-title" style="color:var(--amber)">New Handover from Design (' + handovers.length + ')</div>');
    renderJobList(el, handovers, true);
  }

  if (approved.length) { el.insertAdjacentHTML('beforeend', '<div class="section-title">Ready to Start Production (' + approved.length + ')</div>'); renderJobList(el, approved, true); }
  el.insertAdjacentHTML('beforeend', '<div class="section-divider"><span>PRODUCTION DEPARTMENTS</span></div><div class="dept-grid" id="prod-grid"></div>');
  const pg = el.querySelector('#prod-grid');
  const allDepts = Array.from(new Set([...PANEL_STAGES, ...SOFA_STAGES]));
  allDepts.forEach(dept => {
    const cnt = prodCards.filter(c => c.currentDept === dept).length;
    const cfg = STAGE_CFG[dept] || { color: '#a855f7' };
    const name = dept === 'SW Carpentry' ? 'Solid Wood Carpentry' : dept;
    const d = document.createElement('div');
    d.className = 'dept-card';
    d.innerHTML = '<div class="dept-count" style="color:' + cfg.color + '">' + cnt + '</div><div class="dept-name">' + name + '</div><div class="dept-label">Active</div>';
    d.onclick = () => showFilteredModal(name, null, dept);
    pg.appendChild(d);
  });
  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:14px">All Production Jobs</div>');
  renderJobList(el, prodCards, true);
}
function renderDashPUR(el, cards) {
  const mats = DB.getMats();
  const inStock = mats.filter(m => m.stock > 0).length, ordered = mats.filter(m => m.status === 'in_purchase').length, total = mats.length;
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">' +
    makeStatCard(inStock, 'In Stock Items', '#4caf78', 'all') +
    makeStatCard(ordered, 'Items On Order', '#e8a030', 'in_purchase_bom') +
    makeStatCard(total, 'Total Catalog', '#5b9bd5', 'all') +
    '</div>');
  const awaitingBOM = cards.filter(c => c.stage === 'Material Approval' && c.bomSentToPurchase);
  el.insertAdjacentHTML('beforeend', '<div class="section-title">Awaiting Material Approval (' + awaitingBOM.length + ')</div>');
  renderJobList(el, awaitingBOM, true);
  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:14px">All Job Cards</div>');
  renderJobList(el, cards, true);
}
function renderDashStore(el, cards) {
  let allBom = []; cards.filter(c => c.bomSentToPurchase).forEach(c => (c.bom || []).forEach(b => allBom.push({ ...b, jobName: c.projectName, jobId: c.id })));
  const p = allBom.filter(b => b.status === 'pending').length, a = allBom.filter(b => b.status === 'available').length, iss = allBom.filter(b => b.status === 'issued').length;
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">' +
    makeStatCard(p, 'Pending', '#e05555', 'pending_bom') +
    makeStatCard(a, 'Available', '#4caf78', 'available_bom') +
    makeStatCard(iss, 'Issued', '#3db8a0', 'issued_bom') +
    '</div>');
  el.insertAdjacentHTML('beforeend', '<div class="section-title">All Job Cards</div>');
  renderJobList(el, cards, true);
}
function renderDashDept(el, cards, role) {
  const mine = cards.filter(c => c.currentDept === role), cfg = STAGE_CFG[role] || { color: '#e07d40' };
  el.insertAdjacentHTML('beforeend', '<div class="dept-chip" style="background:' + cfg.color + '22;color:' + cfg.color + '">' + role + ' Department</div><div class="section-title">Jobs Assigned Here (' + mine.length + ')</div>');
  if (!mine.length) el.insertAdjacentHTML('beforeend', '<div class="empty-state">No jobs assigned to your department yet.</div>');
  else renderJobList(el, mine, true);
  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:16px">All Jobs (View Only)</div>');
  renderJobList(el, cards, true);
}
function renderDashAdmin(el, cards) {
  const t = cards.length, dis = cards.filter(c => c.stage === 'Dispatched').length, act = cards.filter(c => c.stage !== 'Dispatched').length;
  const d = cards.filter(c => ['Handover to Design', 'Design In Progress'].includes(c.stage)).length, p = cards.filter(c => [...PANEL_STAGES, ...SOFA_STAGES].includes(c.stage)).length;
  const ma = cards.filter(c => c.stage === 'Material Approval').length, m = cards.filter(c => c.stage === 'Materials Approved').length;
  const q = cards.filter(c => c.stage === 'QC Requested').length, r = cards.filter(c => c.stage === 'Rework').length;
  el.insertAdjacentHTML('beforeend', '<div class="section-title">Pipeline Overview</div><div class="stats-row">' + makeStatCard(t, 'Total', '#c9963a', 'all') + makeStatCard(act, 'Active', '#e8a030', 'active') + makeStatCard(dis, 'Dispatched', '#4caf78', 'Dispatched') + '</div>');
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">' + makeStatCard(d, 'In Design', '#a855f7', 'design') + makeStatCard(p, 'In Production', '#e07d40'
