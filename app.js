const STATE={currentUser:'',currentRole:'',loginTime:'',tempItems:[],editItemIndex:-1,prevScreen:'dashboard',newJobDetails:null,editingCardId:null};
const STAGE_CFG={
  "Job Card Created":{color:"#c9963a",pct:5},
  "Handover to Design":{color:"#b8860b",pct:12},
  "Design In Progress":{color:"#a855f7",pct:18},
  "Handover to Production":{color:"#e8a030",pct:25},
  "Material Approval":{color:"#06b6d4",pct:30},
  "Materials Approved":{color:"#4caf78",pct:35},
  "Pressing":{color:"#c084fc",pct:40},
  "BIM Saw":{color:"#a855f7",pct:48},
  "Edge Banding":{color:"#8b5cf6",pct:56},
  "CNC":{color:"#6366f1",pct:64},
  "Cleaning":{color:"#ec4899",pct:72},
  "Fitting":{color:"#db2777",pct:80},
  "SW Carpentry":{color:"#7c3aed",pct:50},
  "Upholstery":{color:"#db2777",pct:65},
  "Polish":{color:"#eab308",pct:85},
  "Packing":{color:"#6b7280",pct:92},
  "QC Requested":{color:"#e8a030",pct:94},
  "QC Passed":{color:"#4caf78",pct:97},
  "Rework":{color:"#e05555",pct:80},
  "Dispatched":{color:"#84cc16",pct:100},
  "Query from Design":{color:"#e05555",pct:10},
  "Query from Production":{color:"#e05555",pct:22}
};
const PANEL_STAGES=["Pressing","BIM Saw","Edge Banding","CNC","Cleaning","Fitting","Packing"];
const SOFA_STAGES=["SW Carpentry","Upholstery","Polish","Packing"];
const DEPT_ROLES=["SW Carpentry","Upholstery"];
const IN_PROD_STAGES=["Handover to Production","Material Approval","Materials Approved","Pressing","BIM Saw","Edge Banding","CNC","Cleaning","Fitting","SW Carpentry","Upholstery","Polish","Packing","QC Requested","QC Passed","Rework"];
const ROLE_INFO={"Project Coordinator":{abbr:"PC",cls:"role-pc"},"Design Head":{abbr:"DH",cls:"role-dh"},"Production Head":{abbr:"PH",cls:"role-ph"},"Purchase Head":{abbr:"PUR",cls:"role-pur"},"Store":{abbr:"ST",cls:"role-store"},"Admin":{abbr:"ADM",cls:"role-admin"}};
const getRoleInfo=r=>ROLE_INFO[r]||{abbr:r.substring(0,3).toUpperCase(),cls:"role-dept"};
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz_VHu0sh0MAvhC7rlqPudQ6TfkCf9a6dGWDdVtJ9_lKMSYoUBGxx6X17Ajo-sLXOfi/exec"; // Paste Apps Script Web App URL here
const DB={
  getCards:()=>JSON.parse(localStorage.getItem('FF_Cards')||'[]'),
  setCards:(c)=>{localStorage.setItem('FF_Cards',JSON.stringify(c)); syncToGoogle("setCards", c);},
  getCard:(id)=>DB.getCards().find(c=>c.id===id),
  saveCard:(id,u)=>{let cs=DB.getCards(),i=cs.findIndex(c=>c.id===id);if(i>-1){cs[i]={...cs[i],...u};DB.setCards(cs);}},
  addCard:(c)=>{let cs=DB.getCards();cs.push(c);DB.setCards(cs);},
  deleteCard:(id)=>{let cs=DB.getCards().filter(c=>c.id!==id);DB.setCards(cs);},
  getMats:()=>JSON.parse(localStorage.getItem('FF_Mats')||'[]'),
  setMats:(m)=>{localStorage.setItem('FF_Mats',JSON.stringify(m)); syncToGoogle("setMats", m);},
  getUsers:()=>JSON.parse(localStorage.getItem('FF_Users')||'[]'),
  setUsers:(u)=>{localStorage.setItem('FF_Users',JSON.stringify(u)); syncToGoogle("setUsers", u);}
};

function syncToGoogle(action, data) {
  if (!GOOGLE_SCRIPT_URL) return;
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
const $=id=>document.getElementById(id);
const ts=()=>Date.now().toString();
const today=()=>new Date().toISOString().split('T')[0];
const fmtDate=d=>d?new Date(d).toLocaleDateString('en-IN'):'--';
function showToast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;$('toast-container').appendChild(t);setTimeout(()=>t.remove(),3000);}

const APP=document.getElementById('app-container');
const TPLS={};
document.querySelectorAll('template[id^="tpl-"]').forEach(t=>{TPLS[t.id.replace('tpl-','')]=t;});
function navigate(screen,params={}){
  const tpl=TPLS[screen];if(!tpl)return;
  APP.innerHTML='';APP.appendChild(tpl.content.cloneNode(true));
  APP.querySelectorAll('[data-action="back"]').forEach(b=>b.onclick=()=>navigate(STATE.prevScreen));
  APP.querySelectorAll('[data-action="logout"]').forEach(b=>b.onclick=doLogout);
  updateNav(screen);SCREENS[screen]&&SCREENS[screen](params);
}
function updateNav(screen){
  const nav=$('bottom-nav');
  if(['login','newJob','itemEdit','jobDetail','jobBomDetail'].includes(screen)){nav.classList.add('hidden');return;}
  nav.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.target===screen));
  $('nav-materials').classList.toggle('hidden',!['Store','Purchase Head','Admin'].includes(STATE.currentRole));
}
function doLogout(){if(!confirm('Are you sure you want to logout?'))return;STATE.currentUser='';STATE.currentRole='';STATE.tempItems=[];showToast('Logged out');navigate('login');}

const SCREENS={};
SCREENS.login=()=>{
  $('login-form').onsubmit=e=>{
    e.preventDefault();
    const un=$('username').value.trim();
    const pw=$('password').value;
    const users=DB.getUsers();
    const user=users.find(u=>u.username.toLowerCase()===un.toLowerCase() && u.password===pw);
    if(user){
      STATE.currentUser=user.username;
      STATE.currentRole=user.role;
      STATE.loginTime=new Date().toLocaleString('en-IN');
      STATE.tempItems=[];
      navigate('dashboard');
    } else {
      showToast('Invalid username or password');
    }
  };
};
SCREENS.dashboard=()=>{
  STATE.prevScreen='dashboard';
  const role=STATE.currentRole,info=getRoleInfo(role);
  $('db-title').textContent='FurniFlow';
  
  APP.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    APP.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    APP.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    $('tab-'+t.dataset.tab).classList.add('active');
  });

  const canCreate=['Project Coordinator','Admin'].includes(role);
  if(canCreate){$('btn-new-job').classList.remove('hidden');$('btn-new-job').onclick=()=>{STATE.prevScreen='dashboard';STATE.newJobDetails=null;STATE.tempItems=[];navigate('newJob');};}
  
  const content=$('dashboard-content'),cards=DB.getCards().sort((a,b)=>b.createdAt-a.createdAt);
  content.innerHTML='<div class="welcome-banner"><h3>Welcome, '+(STATE.currentUser||role)+'</h3><p>'+role+' Dashboard</p></div>';
  
  if(role==='Project Coordinator')renderDashPC(content,cards);
  else if(role==='Design Head')renderDashDH(content,cards);
  else if(role==='Production Head')renderDashPH(content,cards);
  else if(role==='Purchase Head')renderDashPUR(content,cards);
  else if(role==='Store')renderDashStore(content,cards);
  else if(role==='Admin')renderDashAdmin(content,cards);
  else renderDashDept(content,cards,role);

  if(role==='Admin' || role==='Project Coordinator'){
    $('tab-btn-costs').classList.remove('hidden');
    renderCosts(cards);
    if(role==='Admin'){
      $('tab-btn-users').classList.remove('hidden');
      renderUserManagement();
    } else {
      if($('tab-btn-users')) $('tab-btn-users').classList.add('hidden');
    }
  } else {
    if($('tab-btn-costs')) $('tab-btn-costs').classList.add('hidden');
    if($('tab-btn-users')) $('tab-btn-users').classList.add('hidden');
  }

  renderTimeline(cards);

  // Live search filter
  const srch = $('db-search');
  if(srch) {
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
  if(!el) return;
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
        ${u.username!=='admin' ? `<button class="btn btn-sm btn-red" onclick="deleteUser('${u.id}')">Delete</button>` : ''}
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
    
    if(us.some(x => x.username.toLowerCase() === un.toLowerCase() && x.id !== id)){
       showToast('Username already exists'); return;
    }
    
    if(id) {
       const idx = us.findIndex(x => x.id === id);
       if(idx > -1) { us[idx].username = un; us[idx].password = pw; us[idx].role = rl; }
       showToast('User updated');
    } else {
       us.push({id:'U-'+ts(), username:un, password:pw, role:rl});
       showToast('User created');
    }
    DB.setUsers(us);
    renderUserManagement();
  };
}

window.editUser = function(id) {
  const u = DB.getUsers().find(x => x.id === id);
  if(u) {
    $('um-id').value = u.id;
    $('um-username').value = u.username;
    $('um-password').value = u.password;
    $('um-role').value = u.role;
    $('btn-save-user').textContent = 'Update User';
    $('btn-cancel-user').classList.remove('hidden');
  }
};

window.deleteUser = function(id) {
  if(!confirm('Delete this user?')) return;
  DB.setUsers(DB.getUsers().filter(x => x.id !== id));
  renderUserManagement();
};

function renderCosts(cards) {
  const el = $('dashboard-costs');
  if(!el) return;
  el.innerHTML = '<div class="section-title">Project Material Cost Summary</div>';
  let totalAll = 0;
  let html = '<div style="overflow-x:auto;"><table class="ff-table"><thead><tr><th>Job Card</th><th>Project Name</th><th>Status</th><th style="text-align:right">Material Cost</th></tr></thead><tbody>';
  cards.forEach(c => {
    const cost = (c.bom||[]).reduce((s, b) => s + ((b.qty||0) * (b.price||0)), 0);
    totalAll += cost;
    const cfg = STAGE_CFG[c.stage] || {color:'#888'};
    html += `<tr onclick="showProjectCostModal('${c.id}')" style="cursor:pointer">
      <td style="font-size:0.75rem;color:var(--text-secondary)"><b>${c.id}</b><br><span style="font-size:0.65rem;color:#c9963a;font-weight:600">Art No: ${c.artNo||'--'}</span></td>
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
      const cost = (c.bom||[]).reduce((s, b) => s + ((b.qty||0) * (b.price||0)), 0);
      csv += `${c.id},"${c.projectName||''}","${c.clientName||''}","${c.stage}",${cost}\n`;
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
  if(!card) return;
  const issued = (card.bom||[]).filter(b => b.status === 'issued' || b.price > 0);
  
  let html = '<div class="modal-overlay" onclick="this.parentElement.innerHTML=\'\'"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>';
  html += '<div class="flex-between mb-2"><h3>Cost Breakdown: '+card.projectName+'</h3><button class="btn btn-sm btn-indigo" onclick="$(\'modal-container\').innerHTML=\'\';navigate(\'jobDetail\',{id:\''+id+'\'})">View Full Card</button></div>';
  html += '<p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px">Detailed list of materials issued and their costs.</p>';
  
  if(issued.length === 0) {
    html += '<div class="empty-state">No materials have been issued or priced for this project yet.</div>';
  } else {
    html += '<div style="overflow-x:auto;max-height:60vh;margin-bottom:20px"><table class="ff-table"><thead><tr><th>Category</th><th>Material</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>';
    let total = 0;
    issued.forEach(b => {
      const lineTotal = (b.qty||0) * (b.price||0);
      total += lineTotal;
      html += `<tr>
        <td style="font-size:0.65rem">${b.category||'--'}</td>
        <td style="font-size:0.75rem;font-weight:600">${b.material}</td>
        <td>${b.qty} ${b.unit}</td>
        <td>₹${b.price||0}</td>
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
  if(!tl) return;
  tl.innerHTML = '<div class="section-title">Project Stage Tracker</div>';
  if(!cards.length) { tl.innerHTML += '<div class="empty-state">No jobs found.</div>'; return; }
  cards.forEach(c => {
     const cfg = STAGE_CFG[c.stage] || {color: '#c9963a', pct: 5};
     const div = document.createElement('div');
     div.className = 'card';
     div.style.borderLeft = '4px solid ' + cfg.color;
     div.innerHTML = `
        <div class="flex-between">
          <div style="font-weight:700;font-size:0.9rem">${c.projectName}</div>
          <span class="badge" style="background:${cfg.color}">${c.stage}</span>
        </div>
        <div class="item-subtitle" style="margin-bottom:8px">${c.id}</div>
        <div class="progress-bar-container"><div class="progress-bar" style="width:${c.stagePercent||cfg.pct}%;background:${cfg.color}"></div></div>
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
  if(!card) return;
  let html = '<div class="modal-overlay" onclick="this.parentElement.innerHTML=\'\'"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div>';
  html += '<div class="flex-between mb-2"><h3>'+card.projectName+'</h3><button class="btn btn-sm btn-indigo" onclick="$(\'modal-container\').innerHTML=\'\';navigate(\'jobDetail\',{id:\''+id+'\'})">View Full Card</button></div>';
  html += '<p style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:12px">Full Project Lifecycle Tracking</p>';
  html += '<div class="timeline" style="margin-bottom:20px">';
  
  let history = card.stageHistory || [];
  if(history.length === 0) history = [{stage: 'Job Card Created', date: card.jobCardDate || today(), time: '--', by: card.createdBy || 'Unknown'}];
  
  const base = ["Job Card Created", "Handover to Design", "Design In Progress", "Handover to Production", "Material Approval", "Materials Approved"];
  const prod = card.prodType === 'Panel' ? PANEL_STAGES : (card.prodType === 'Sofa' ? SOFA_STAGES : []);
  const final = ["QC Requested", "QC Passed", "Dispatched"];
  
  // Unique stages in order
  const allStages = Array.from(new Set([...base, ...prod, ...final]));
  
  allStages.forEach((s, idx) => {
     const h = history.find(x => x.stage === s);
     const nextS = allStages[idx+1];
     const nextH = nextS ? history.find(x => x.stage === nextS) : null;
     
     const isDone = !!h;
     const isCurrent = card.stage === s;
     const cls = isDone ? 'done' : (isCurrent ? 'active' : 'pending');
     
     let dateInfo = '';
     if(isDone) {
        dateInfo = `<div style="font-size:0.65rem;color:var(--text-secondary);margin-top:2px">
          <b>Received:</b> ${fmtDate(h.date)} ${h.time!=='--'?'at '+h.time:''} (by ${h.by})<br>
          ${nextH ? `<b>Forwarded:</b> ${fmtDate(nextH.date)} ${nextH.time!=='--'?'at '+nextH.time:''}` : (isCurrent ? '<b style="color:var(--indigo)">Currently Working Here</b>' : '')}
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

function renderJobList(container,cards,clickable){
  if(!cards.length){container.innerHTML+='<div class="empty-state">No job cards found.</div>';return;}
  cards.forEach(c=>{
    const cfg=STAGE_CFG[c.stage]||{color:'#c9963a',pct:5};
    const el=document.createElement('div');el.className='list-item-card';
    let sub = c.id + (c.artNo ? ' (Art No: ' + c.artNo + ')' : '') + ' - PO: ' + c.poNo + (c.currentDept ? ' - ' + c.currentDept : '');
    if (c.currentDeptStatus === 'Done') sub += ' <span style="color:#4caf78;font-weight:bold">(Ready to Forward)</span>';
    el.innerHTML='<div class="flex-between mb-1"><div><div class="item-title">'+(c.projectName||'Unnamed')+'</div><div class="item-subtitle">'+sub+'</div></div><span class="badge" style="background:'+cfg.color+'">'+c.stage+'</span></div><div class="progress-bar-container"><div class="progress-bar" style="width:'+(c.stagePercent||cfg.pct)+'%;background:'+cfg.color+'"></div></div>';
    if(clickable)el.onclick=()=>{STATE.prevScreen='dashboard';navigate('jobDetail',{id:c.id});};
    container.appendChild(el);
  });
}
function makeStatCard(val,label,color,filter){
  return '<div class="stat-card" onclick="showFilteredModal(\''+label+'\',null,\''+filter+'\')"><div class="stat-value" style="color:'+color+'">'+val+'</div><div class="stat-label">'+label+'</div></div>';
}

function renderDashPC(el,cards){
  const a=cards.filter(c=>c.stage!=='Dispatched').length,d=cards.filter(c=>['Handover to Design','Design In Progress'].includes(c.stage)).length,p=cards.filter(c=>IN_PROD_STAGES.includes(c.stage)).length,dis=cards.filter(c=>c.stage==='Dispatched').length;
  el.innerHTML+='<div class="stats-row">'+makeStatCard(a,'Active','#c9963a','active')+makeStatCard(d,'Design','#a855f7','design')+makeStatCard(p,'Production','#e8a030','production')+makeStatCard(dis,'Dispatched','#4caf78','Dispatched')+'</div>';
  
  const queries=cards.filter(c=>c.stage==='Query from Design');
  if(queries.length){
    el.insertAdjacentHTML('beforeend', '<div class="section-title" style="color:var(--red)">Queries from Design ('+queries.length+')</div>');
    renderJobList(el,queries,true);
  }
  
  el.insertAdjacentHTML('beforeend', '<div class="section-title">All Job Cards</div>');
  renderJobList(el,cards,true);
}
function renderDashDH(el,cards){
  const mine=cards.filter(c=>['Handover to Design','Design In Progress','Query from Production'].includes(c.stage));
  const total = cards.length;
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">'+makeStatCard(mine.length, 'In Design', '#a855f7', 'design')+makeStatCard(total, 'Total Jobs', '#c9963a', 'all')+'</div>');
  
  const queries=cards.filter(c=>c.stage==='Query from Production');
  if(queries.length){
    el.insertAdjacentHTML('beforeend', '<div class="section-title" style="color:var(--red)">Queries from Production ('+queries.length+')</div>');
    renderJobList(el,queries,true);
  }
  
  el.insertAdjacentHTML('beforeend', '<div class="section-title">Jobs In Design ('+(mine.length - queries.length)+')</div>');
  renderJobList(el,mine.filter(c=>c.stage!=='Query from Production'),true);
  
  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:16px">All Jobs (View Only)</div>');
  renderJobList(el,cards,true);
}
function renderDashPH(el,cards){
  const prodCards=cards.filter(c=>IN_PROD_STAGES.includes(c.stage));
  const approved=cards.filter(c=>c.stage==='Materials Approved');
  const handovers=cards.filter(c=>c.stage==='Handover to Production');
  const swCnt = prodCards.filter(c=>c.currentDept==='SW Carpentry').length;
  const uphCnt = prodCards.filter(c=>c.currentDept==='Upholstery').length;
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">'+
    makeStatCard(prodCards.length, 'In Prod', '#e8a030', 'production') +
    makeStatCard(approved.length, 'Mat. Approved', '#4caf78', 'Materials Approved') +
    makeStatCard(swCnt, 'Solid Wood', '#7c3aed', 'SW Carpentry') +
    makeStatCard(uphCnt, 'Upholstery', '#db2777', 'Upholstery') +
  '</div>');
  
  if(handovers.length){
    el.insertAdjacentHTML('beforeend', '<div class="section-title" style="color:var(--amber)">New Handover from Design ('+handovers.length+')</div>');
    renderJobList(el,handovers,true);
  }
  
  if(approved.length){el.insertAdjacentHTML('beforeend', '<div class="section-title">Ready to Start Production ('+approved.length+')</div>');renderJobList(el,approved,true);}
  el.insertAdjacentHTML('beforeend', '<div class="section-divider"><span>PRODUCTION DEPARTMENTS</span></div><div class="dept-grid" id="prod-grid"></div>');
  const pg=el.querySelector('#prod-grid');
  const allDepts = Array.from(new Set([...PANEL_STAGES, ...SOFA_STAGES]));
  allDepts.forEach(dept=>{
    const cnt=prodCards.filter(c=>c.currentDept===dept).length;
    const cfg=STAGE_CFG[dept]||{color:'#a855f7'};
    const name = dept === 'SW Carpentry' ? 'Solid Wood Carpentry' : dept;
    const d=document.createElement('div');
    d.className='dept-card';
    d.innerHTML='<div class="dept-count" style="color:'+cfg.color+'">'+cnt+'</div><div class="dept-name">'+name+'</div><div class="dept-label">Active</div>';
    d.onclick=()=>showFilteredModal(name,null,dept);
    pg.appendChild(d);
  });
  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:14px">All Production Jobs</div>');
  renderJobList(el,prodCards,true);
}
function renderDashPUR(el,cards){
  const mats=DB.getMats();
  const inStock=mats.filter(m=>m.stock > 0).length,ordered=mats.filter(m=>m.status==='in_purchase').length,total=mats.length;
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">'+
    makeStatCard(inStock, 'In Stock Items', '#4caf78', 'all') +
    makeStatCard(ordered, 'Items On Order', '#e8a030', 'in_purchase_bom') +
    makeStatCard(total, 'Total Catalog', '#5b9bd5', 'all') +
  '</div>');
  const awaitingBOM=cards.filter(c=>c.stage==='Material Approval'&&c.bomSentToPurchase);
  el.insertAdjacentHTML('beforeend', '<div class="section-title">Awaiting Material Approval ('+awaitingBOM.length+')</div>');
  renderJobList(el,awaitingBOM,true);
  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:14px">All Job Cards</div>');
  renderJobList(el,cards,true);
}
function renderDashStore(el,cards){
  let allBom=[];cards.filter(c=>c.bomSentToPurchase).forEach(c=>(c.bom||[]).forEach(b=>allBom.push({...b,jobName:c.projectName,jobId:c.id})));
  const p=allBom.filter(b=>b.status==='pending').length,a=allBom.filter(b=>b.status==='available').length,iss=allBom.filter(b=>b.status==='issued').length;
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">'+
    makeStatCard(p, 'Pending', '#e05555', 'pending_bom') +
    makeStatCard(a, 'Available', '#4caf78', 'available_bom') +
    makeStatCard(iss, 'Issued', '#3db8a0', 'issued_bom') +
  '</div>');
  el.insertAdjacentHTML('beforeend', '<div class="section-title">All Job Cards</div>');
  renderJobList(el,cards,true);
}
function renderDashDept(el,cards,role){
  const mine=cards.filter(c=>c.currentDept===role),cfg=STAGE_CFG[role]||{color:'#e07d40'};
  el.insertAdjacentHTML('beforeend', '<div class="dept-chip" style="background:'+cfg.color+'22;color:'+cfg.color+'">'+role+' Department</div><div class="section-title">Jobs Assigned Here ('+mine.length+')</div>');
  if(!mine.length)el.insertAdjacentHTML('beforeend', '<div class="empty-state">No jobs assigned to your department yet.</div>');
  else renderJobList(el,mine,true);
  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:16px">All Jobs (View Only)</div>');
  renderJobList(el,cards,true);
}
function renderDashAdmin(el,cards){
  const t=cards.length,dis=cards.filter(c=>c.stage==='Dispatched').length,act=cards.filter(c=>c.stage!=='Dispatched').length;
  const d=cards.filter(c=>['Handover to Design','Design In Progress'].includes(c.stage)).length,p=cards.filter(c=>[...PANEL_STAGES,...SOFA_STAGES].includes(c.stage)).length;
  const ma=cards.filter(c=>c.stage==='Material Approval').length,m=cards.filter(c=>c.stage==='Materials Approved').length;
  const q=cards.filter(c=>c.stage==='QC Requested').length,r=cards.filter(c=>c.stage==='Rework').length;
  el.insertAdjacentHTML('beforeend', '<div class="section-title">Pipeline Overview</div><div class="stats-row">'+makeStatCard(t,'Total','#c9963a','all')+makeStatCard(act,'Active','#e8a030','active')+makeStatCard(dis,'Dispatched','#4caf78','Dispatched')+'</div>');
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">'+makeStatCard(d,'In Design','#a855f7','design')+makeStatCard(p,'In Production','#e07d40','production')+makeStatCard(ma,'Mat. Approval','#3db8a0','Material Approval')+'</div>');
  el.insertAdjacentHTML('beforeend', '<div class="stats-row">'+makeStatCard(m,'Mat. Approved','#4caf78','Materials Approved')+makeStatCard(q,'QC Pending','#e8a030','QC Requested')+makeStatCard(r,'Rework','#e05555','Rework')+'</div>');
  el.insertAdjacentHTML('beforeend', '<div class="section-divider"><span>PRODUCTION DEPARTMENTS</span></div><div class="dept-grid" id="adm-prod-grid"></div>');
  const pg=el.querySelector('#adm-prod-grid');
  const allDepts = Array.from(new Set([...PANEL_STAGES, ...SOFA_STAGES]));
  allDepts.forEach(dept=>{
    const cnt=cards.filter(c=>c.currentDept===dept).length;
    const cfg=STAGE_CFG[dept]||{color:'#a855f7'};
    const name = dept === 'SW Carpentry' ? 'Solid Wood Carpentry' : dept;
    const dc=document.createElement('div');
    dc.className='dept-card';
    dc.innerHTML='<div class="dept-count" style="color:'+cfg.color+'">'+cnt+'</div><div class="dept-name">'+name+'</div><div class="dept-label">Active Jobs</div>';
    dc.onclick=()=>showFilteredModal(name,null,dept);
    pg.appendChild(dc);
  });
  el.insertAdjacentHTML('beforeend', '<div class="section-title" style="margin-top:14px">All Job Cards</div>');
  renderJobList(el,cards,true);
}
function showFilteredModal(title,filtered,filter){
  const cards=DB.getCards();let list=filtered;
  if(!list){
    if(filter==='all') list=cards;
    else if(filter==='active') list=cards.filter(c=>c.stage!=='Dispatched');
    else if(filter==='design') list=cards.filter(c=>['Handover to Design','Design In Progress'].includes(c.stage));
    else if(filter==='production') list=cards.filter(c=>IN_PROD_STAGES.includes(c.stage));
    else if(filter==='panel') list=cards.filter(c=>c.prodType==='Panel'&&IN_PROD_STAGES.includes(c.stage));
    else if(filter==='sofa') list=cards.filter(c=>c.prodType==='Sofa'&&IN_PROD_STAGES.includes(c.stage));
    else if(filter==='pending_bom') list=cards.filter(c=>(c.bom||[]).some(b=>b.status==='pending'));
    else if(filter==='in_purchase_bom') list=cards.filter(c=>(c.bom||[]).some(b=>b.status==='in_purchase'));
    else if(filter==='available_bom') list=cards.filter(c=>(c.bom||[]).some(b=>b.status==='available'));
    else if(filter==='issued_bom') list=cards.filter(c=>(c.bom||[]).some(b=>b.status==='issued'));
    else list=cards.filter(c=>c.stage===filter||c.currentDept===filter);
  }
  let html='<div class="modal-overlay" onclick="this.parentElement.innerHTML=\'\'"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div><h3 style="margin-bottom:4px">'+title+'</h3><p style="font-size:.78rem;color:#9e8a6e;margin-bottom:12px">'+list.length+' job(s)</p><div id="flt-list"></div><button class="btn btn-ghost btn-block mt-3" onclick="$(\'modal-container\').innerHTML=\'\'">Close</button></div></div>';
  $('modal-container').innerHTML=html;
  if(!list.length){$('flt-list').innerHTML='<div class="empty-state">No jobs found.</div>';return;}
  list.forEach(c=>{const cfg=STAGE_CFG[c.stage]||{color:'#c9963a'};const e=document.createElement('div');e.className='list-item-card';e.innerHTML='<div class="item-title">'+(c.projectName||'Unnamed')+'</div><div class="item-subtitle">'+c.id + (c.artNo ? ' (Art No: ' + c.artNo + ')' : '') +' - PO: '+c.poNo+(c.currentDept?' - '+c.currentDept:'')+'</div><span class="badge mt-2" style="background:'+cfg.color+'">'+c.stage+'</span>';e.onclick=()=>{if($('modal-container'))$('modal-container').innerHTML='';STATE.prevScreen='dashboard';navigate('jobDetail',{id:c.id});};$('flt-list').appendChild(e);});
}

SCREENS.newJob=()=>{
  if(STATE.editingCardId) {
    $('nj-title').textContent = "Edit Job Card";
    $('btn-submit-job').textContent = "Update Job Card";
  } else {
    $('nj-title').textContent = "New Job Card";
    $('btn-submit-job').textContent = "Create Job Card";
  }

  if(STATE.newJobDetails) {
    $('nj-project').value = STATE.newJobDetails.project || '';
    $('nj-client').value = STATE.newJobDetails.client || '';
    $('nj-po').value = STATE.newJobDetails.po || '';
    $('nj-po-date').value = STATE.newJobDetails.poDate || '';
    $('nj-jc-date').value = STATE.newJobDetails.jcDate || today();
    $('nj-dispatch-date').value = STATE.newJobDetails.dispatchDate || '';
    $('nj-art').value = STATE.newJobDetails.art || '';
  } else {
    $('nj-jc-date').value=today();
  }
  const ri=()=>{
    const el=$('temp-items-list');
    if(!STATE.tempItems.length){el.innerHTML='<div class="empty-state">No items yet.</div>';return;}
    let h='<div style="overflow-x:auto;"><table class="ff-table"><thead><tr><th>No</th><th>Drawing No</th><th>Product Name</th><th>W x H x D</th><th>Qty</th><th>Product Description</th><th>Remarks</th></tr></thead><tbody>';
    STATE.tempItems.forEach((it,i)=>{
      let desc='';
      if(it.coreMaterial) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Core:</b> ${it.coreMaterial}</div>`;
      if(it.outerSurface) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Outer Lam:</b> ${it.outerSurface}</div>`;
      if(it.innerSurface) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Inner Lam:</b> ${it.innerSurface}</div>`;
      if(it.shutterLam) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Shutter Lam:</b> ${it.shutterLam}</div>`;
      if(it.exposePanel) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Expose:</b> ${it.exposePanel}</div>`;
      if(it.shutterHandle) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Shut. Handle:</b> ${it.shutterHandle}</div>`;
      if(it.profileHandle) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Prof. Handle:</b> ${it.profileHandle}</div>`;
      if(it.drawerHandle) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Drw. Handle:</b> ${it.drawerHandle}</div>`;
      if(it.lock) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Lock:</b> ${it.lock}</div>`;
      if(it.light) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Light:</b> ${it.light}</div>`;
      if(it.glass) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Glass:</b> ${it.glass}</div>`;
      if(it.legs) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Legs:</b> ${it.legs}</div>`;
      if(it.channel) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Channel:</b> ${it.channel}</div>`;
      if(it.hardware) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Hardware:</b> ${it.hardware}</div>`;
      if(it.additionalHardware) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Add. HW:</b> ${it.additionalHardware}</div>`;
      if(it.metal) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Metal:</b> ${it.metal}</div>`;
      if(it.panelPolish) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Polish:</b> ${it.panelPolish}</div>`;
      if(it.fab1) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Fab1:</b> ${it.fab1}</div>`;
      if(it.fab2) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Fab2:</b> ${it.fab2}</div>`;
      if(it.foamPrem) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Foam(Prem):</b> ${it.foamPrem}</div>`;
      if(it.foamReg) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Foam(Reg):</b> ${it.foamReg}</div>`;
      if(it.woodFin) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Wood Fin:</b> ${it.woodFin}</div>`;
      if(it.sofaLeg) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Leg:</b> ${it.sofaLeg}</div>`;
      if(it.sofaPolish) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">PU/Polish:</b> ${it.sofaPolish}</div>`;
      if(it.sofaHardware) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Sofa HW:</b> ${it.sofaHardware}</div>`;
      if(it.sofaMetal) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Sofa Metal:</b> ${it.sofaMetal}</div>`;
      if(it.sofaAddFinish) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Add. Fin:</b> ${it.sofaAddFinish}</div>`;
      
      h+=`<tr onclick="STATE.editItemIndex=${i};navigate('itemEdit',{type:'${it.itemType}',index:${i}})" style="cursor:pointer">
        <td>${i+1}</td><td>${it.drNo||'--'}</td><td><b>${it.itemName}</b></td><td>${it.width||'-'}x${it.height||'-'}x${it.depth||'-'}</td><td>${it.qty}</td><td>${desc}</td><td>${it.remark||'--'}</td>
      </tr>`;
    });
    h+='</tbody></table></div>';
    el.innerHTML=h;
  };
  ri();
  const saveFormState = () => {
    STATE.newJobDetails = {
      project: $('nj-project').value,
      client: $('nj-client').value,
      po: $('nj-po').value,
      poDate: $('nj-po-date').value,
      jcDate: $('nj-jc-date').value,
      dispatchDate: $('nj-dispatch-date').value,
      art: $('nj-art').value
    };
  };

  APP.querySelectorAll('[data-action="back"]').forEach(b=>b.onclick=()=>{
    if(confirm('Discard changes?')){
      const edId = STATE.editingCardId;
      STATE.newJobDetails = null;
      STATE.tempItems = [];
      STATE.editingCardId = null;
      if(edId) {
        navigate('jobDetail', {id: edId});
      } else {
        navigate('dashboard');
      }
    }
  });

  $('btn-add-item').onclick=()=>{saveFormState();STATE.editItemIndex=-1;navigate('itemEdit',{type:'furniture'});};
  $('btn-add-sofa').onclick=()=>{saveFormState();STATE.editItemIndex=-1;navigate('itemEdit',{type:'sofa'});};
  $('form-new-job').onsubmit=e=>{
    e.preventDefault();
    if(!$('nj-project').value||!$('nj-po').value){showToast('Project Name and PO required');return;}
    
    if(STATE.editingCardId) {
      const card = DB.getCard(STATE.editingCardId);
      const history=[...(card.stageHistory||[]), {stage:'Job Card Updated', date:today(), time:new Date().toLocaleTimeString(), by:STATE.currentUser||STATE.currentRole}];
      DB.saveCard(STATE.editingCardId, {
        projectName:$('nj-project').value, clientName: $('nj-client').value, poNo:$('nj-po').value, poDate:$('nj-po-date').value,
        jobCardDate:$('nj-jc-date').value, dispatchDate:$('nj-dispatch-date').value, artNo:$('nj-art').value,
        items:STATE.tempItems, stageHistory:history
      });
      const updatedId = STATE.editingCardId;
      STATE.tempItems=[];
      STATE.newJobDetails=null;
      STATE.editingCardId=null;
      showToast('Job Card Updated!');
      navigate('jobDetail', {id: updatedId});
    } else {
      const stage='Job Card Created',cfg=STAGE_CFG[stage],now=new Date();
      const history=[{stage, date:today(), time:now.toLocaleTimeString(), by:STATE.currentUser||STATE.currentRole}];
      DB.addCard({
        id:'JC-'+ts(), projectName:$('nj-project').value, clientName: $('nj-client').value, poNo:$('nj-po').value, poDate:$('nj-po-date').value,
        jobCardDate:$('nj-jc-date').value, dispatchDate:$('nj-dispatch-date').value, artNo:$('nj-art').value,
        stage, stageColor:cfg.color, stagePercent:cfg.pct, createdBy:STATE.currentUser, createdAt:Date.now(),
        items:STATE.tempItems, bom:[], drawings:[], selectionSheets:[], tickets:[],
        bomSentToPurchase:false, materialsApproved:false, prodType:null, currentDept:null,
        deptHistory:[], stageHistory:history
      });
      STATE.tempItems=[];
      STATE.newJobDetails=null;
      showToast('Job Card Created!');
      navigate('dashboard');
    }
  };
};

SCREENS.itemEdit=(params={})=>{
  const isSofa=params.type==='sofa';$('ie-type').value=params.type;
  $('ie-sofa-fields').classList.toggle('hidden',!isSofa);$('ie-furniture-fields').classList.toggle('hidden',isSofa);
  if(params.index>=0){
    $('ie-delete-container').classList.remove('hidden');
    $('btn-delete-item').onclick=()=>{
      if(confirm('Are you sure you want to delete this line item?')){
        STATE.tempItems.splice(params.index, 1);
        showToast('Line item deleted');
        navigate('newJob');
      }
    };
    const it=STATE.tempItems[params.index];$('ie-dr').value=it.drNo||'';$('ie-name').value=it.itemName||'';$('ie-w').value=it.width||'';$('ie-h').value=it.height||'';$('ie-d').value=it.depth||'';$('ie-qty').value=it.qty||1;$('ie-core').value=it.coreMaterial||'';$('ie-remark').value=it.remark||'';if(isSofa){$('ie-sofa-fab1').value=it.fab1||'';$('ie-sofa-fab2').value=it.fab2||'';$('ie-sofa-foam-prem').value=it.foamPrem||'';$('ie-sofa-foam-reg').value=it.foamReg||'';$('ie-sofa-wood-fin').value=it.woodFin||'';$('ie-sofa-leg').value=it.sofaLeg||'';$('ie-sofa-polish').value=it.sofaPolish||'';$('ie-sofa-hardware').value=it.sofaHardware||'';$('ie-sofa-metal').value=it.sofaMetal||'';$('ie-sofa-add-finish').value=it.sofaAddFinish||'';}else{$('ie-outer').value=it.outerSurface||'';$('ie-inner').value=it.innerSurface||'';$('ie-shutter-lam').value=it.shutterLam||'';$('ie-expose').value=it.exposePanel||'';$('ie-shutter-handle').value=it.shutterHandle||'';$('ie-profile-handle').value=it.profileHandle||'';$('ie-drawer-handle').value=it.drawerHandle||'';$('ie-lock').value=it.lock||'';$('ie-light').value=it.light||'';$('ie-glass').value=it.glass||'';$('ie-legs').value=it.legs||'';$('ie-channel').value=it.channel||'';$('ie-hardware').value=it.hardware||'';$('ie-add-hw').value=it.additionalHardware||'';$('ie-metal').value=it.metal||'';$('ie-panel-polish').value=it.panelPolish||'';}
  } else {
    $('ie-delete-container').classList.add('hidden');
  }
  $('btn-save-item').onclick=()=>{if(!$('ie-name').value){showToast('Item Name required');return;}const item={itemType:params.type,drNo:$('ie-dr').value,itemName:$('ie-name').value,width:$('ie-w').value,height:$('ie-h').value,depth:$('ie-d').value,qty:$('ie-qty').value,coreMaterial:$('ie-core').value,remark:$('ie-remark').value};if(isSofa){item.fab1=$('ie-sofa-fab1').value;item.fab2=$('ie-sofa-fab2').value;item.foamPrem=$('ie-sofa-foam-prem').value;item.foamReg=$('ie-sofa-foam-reg').value;item.woodFin=$('ie-sofa-wood-fin').value;item.sofaLeg=$('ie-sofa-leg').value;item.sofaPolish=$('ie-sofa-polish').value;item.sofaHardware=$('ie-sofa-hardware').value;item.sofaMetal=$('ie-sofa-metal').value;item.sofaAddFinish=$('ie-sofa-add-finish').value;}else{item.outerSurface=$('ie-outer').value;item.innerSurface=$('ie-inner').value;item.shutterLam=$('ie-shutter-lam').value;item.exposePanel=$('ie-expose').value;item.shutterHandle=$('ie-shutter-handle').value;item.profileHandle=$('ie-profile-handle').value;item.drawerHandle=$('ie-drawer-handle').value;item.lock=$('ie-lock').value;item.light=$('ie-light').value;item.glass=$('ie-glass').value;item.legs=$('ie-legs').value;item.channel=$('ie-channel').value;item.hardware=$('ie-hardware').value;item.additionalHardware=$('ie-add-hw').value;item.metal=$('ie-metal').value;item.panelPolish=$('ie-panel-polish').value;}if(params.index>=0)STATE.tempItems[params.index]=item;else STATE.tempItems.push(item);navigate('newJob');};
  APP.querySelectorAll('[data-action="back"]').forEach(b=>b.onclick=()=>navigate('newJob'));
};

SCREENS.jobDetail=(params={})=>{
  const card=DB.getCard(params.id);if(!card){navigate('dashboard');return;}
  const role=STATE.currentRole;
  $('jd-title').textContent=card.projectName||'Job Card';
  if($('jd-client')) $('jd-client').textContent=card.clientName||'--';
  APP.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{APP.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));APP.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));t.classList.add('active');$('tab-'+t.dataset.tab).classList.add('active');});
  const cfg=STAGE_CFG[card.stage]||{color:'#c9963a',pct:5};
  $('jd-stage-badge').textContent=card.stage;$('jd-stage-badge').style.background=cfg.color;
  $('jd-progress').style.width=(card.stagePercent||cfg.pct)+'%';$('jd-progress').style.background=cfg.color;
  $('jd-proj').textContent=card.projectName;$('jd-po').textContent=card.poNo;
  $('jd-po-date').textContent=fmtDate(card.poDate);$('jd-jc-date').textContent=fmtDate(card.jobCardDate);
  $('jd-disp-date').textContent=fmtDate(card.dispatchDate);$('jd-art').textContent=card.artNo||'--';
  $('jd-panel-dept').textContent=card.prodType==='Panel'?card.currentDept||'--':'--';
  $('jd-sofa-dept').textContent=card.prodType==='Sofa'?card.currentDept||'--':'--';
  let jobItemsHtml = '<div style="overflow-x:auto;"><table class="ff-table"><thead><tr><th>No</th><th>Drawing No</th><th>Product Name</th><th>W x H x D</th><th>Qty</th><th>Product Description</th><th>Remarks</th></tr></thead><tbody>';
  if(!card.items||!card.items.length) jobItemsHtml='<div class="empty-state">No items</div>';
  else {
    card.items.forEach((it,idx)=>{
       let desc='';
       if(it.coreMaterial) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Core:</b> ${it.coreMaterial}</div>`;
       if(it.outerSurface) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Outer Lam:</b> ${it.outerSurface}</div>`;
       if(it.innerSurface) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Inner Lam:</b> ${it.innerSurface}</div>`;
       if(it.shutterLam) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Shutter Lam:</b> ${it.shutterLam}</div>`;
       if(it.exposePanel) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Expose:</b> ${it.exposePanel}</div>`;
       if(it.shutterHandle) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Shut. Handle:</b> ${it.shutterHandle}</div>`;
       if(it.profileHandle) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Prof. Handle:</b> ${it.profileHandle}</div>`;
       if(it.drawerHandle) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Drw. Handle:</b> ${it.drawerHandle}</div>`;
       if(it.lock) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Lock:</b> ${it.lock}</div>`;
       if(it.light) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Light:</b> ${it.light}</div>`;
       if(it.glass) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Glass:</b> ${it.glass}</div>`;
       if(it.legs) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Legs:</b> ${it.legs}</div>`;
       if(it.channel) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Channel:</b> ${it.channel}</div>`;
       if(it.hardware) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Hardware:</b> ${it.hardware}</div>`;
       if(it.additionalHardware) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Add. HW:</b> ${it.additionalHardware}</div>`;
       if(it.metal) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Metal:</b> ${it.metal}</div>`;
       if(it.panelPolish) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Polish:</b> ${it.panelPolish}</div>`;
       if(it.fab1) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Fab1:</b> ${it.fab1}</div>`;
       if(it.fab2) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Fab2:</b> ${it.fab2}</div>`;
       if(it.foamPrem) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Foam(Prem):</b> ${it.foamPrem}</div>`;
       if(it.foamReg) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Foam(Reg):</b> ${it.foamReg}</div>`;
       if(it.woodFin) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Wood Fin:</b> ${it.woodFin}</div>`;
       if(it.sofaLeg) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Leg:</b> ${it.sofaLeg}</div>`;
       if(it.sofaPolish) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">PU/Polish:</b> ${it.sofaPolish}</div>`;
       if(it.sofaHardware) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Sofa HW:</b> ${it.sofaHardware}</div>`;
       if(it.sofaMetal) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Sofa Metal:</b> ${it.sofaMetal}</div>`;
       if(it.sofaAddFinish) desc+=`<div style="font-size:0.7rem"><b style="color:var(--text-secondary)">Add. Fin:</b> ${it.sofaAddFinish}</div>`;
       jobItemsHtml+=`<tr><td>${idx+1}</td><td>${it.drNo||'--'}</td><td><b>${it.itemName}</b></td><td>${it.width||'-'}x${it.height||'-'}x${it.depth||'-'}</td><td>${it.qty}</td><td>${desc}</td><td>${it.remark||'--'}</td></tr>`;
    });
    jobItemsHtml+='</tbody></table></div>';
  }
  $('jd-items-list').innerHTML=jobItemsHtml;

  const costRow=$('jd-cost-row'), costVal=$('jd-cost');
  if(['Project Coordinator', 'Purchase Head', 'Admin'].includes(role)){
    costRow.classList.remove('hidden');
    const total = (card.bom||[]).reduce((s, b) => s + ((b.qty||0) * (b.price||0)), 0);
    costVal.textContent = '₹ ' + total.toLocaleString('en-IN');
  } else {
    costRow.classList.add('hidden');
  }

  const histLog = $('jd-history-log'); histLog.innerHTML = '';
  let history = card.stageHistory || [];
  if(history.length === 0) history = [{stage: 'Job Card Created', date: card.jobCardDate || today(), time: '--', by: card.createdBy || 'Unknown', note:'', extra:''}];
  history.forEach(h => {
    const li = document.createElement('div'); li.className = 'tl-item done';
    li.innerHTML = `<div class="tl-label"><b>${h.stage}</b>${h.extra?`<span style="font-size:0.65rem;margin-left:6px;color:var(--amber)">${h.extra}</span>`:''}<br><span style="font-size:0.65rem">${fmtDate(h.date)} ${h.time!=='--'?'at '+h.time:''} (by ${h.by})</span>${h.note?`<div style="font-size:0.7rem;color:var(--indigo);margin-top:2px">📝 ${h.note}</div>`:''}</div>`;
    histLog.appendChild(li);
  });

  const acts=$('jd-action-buttons'); acts.innerHTML='';
  const addBtn=(label,cls,fn)=>{const b=document.createElement('button');b.className='btn '+cls+' btn-block mb-2';b.textContent=label;b.onclick=()=>{fn();};acts.appendChild(b);};
  const adv=(s)=>{
    const c2=STAGE_CFG[s]||{color:'#c9963a',pct:5}, now=new Date();
    const note = prompt(`Optional note for "${s}" (press OK to skip):`) || '';
    let extra = '';
    if(s==='Dispatched' && card.dispatchDate){
      const diff=Math.ceil((new Date(today())-new Date(card.dispatchDate))/(86400000));
      extra = diff>0?` ⚠ ${diff}d late`:diff<0?` ✔ ${Math.abs(diff)}d early`:' ✔ On time';
    }
    const h=[...(card.stageHistory||[]),{stage:s,date:today(),time:now.toLocaleTimeString(),by:STATE.currentRole,note,extra}];
    DB.saveCard(card.id,{stage:s,stageColor:c2.color,stagePercent:c2.pct,stageHistory:h});
    showToast('Moved to '+s+(extra?' | '+extra.trim():''));
    navigate('jobDetail',{id:card.id});
  };
  const advDept=(dept)=>{
    const c2=STAGE_CFG[dept]||{color:'#e8a030',pct:44}, now=new Date();
    const note = prompt(`Optional note for "${dept}" (press OK to skip):`) || '';
    const h=[...(card.stageHistory||[]),{stage:dept,date:today(),time:now.toLocaleTimeString(),by:STATE.currentRole,note}];
    const hist=[...(card.deptHistory||[]),{dept,time:now.toLocaleTimeString()}];
    DB.saveCard(card.id,{stage:dept,stageColor:c2.color,stagePercent:c2.pct,currentDept:dept,currentDeptStatus:'Pending',deptHistory:hist,stageHistory:h});
    showToast('Sent to '+dept);
    navigate('jobDetail',{id:card.id});
  };
  
  if(role==='Project Coordinator' || role==='Admin'){
    if(card.stage!=='Dispatched'){
      addBtn('✏ Edit Job Card','btn-indigo',()=>{
        STATE.editingCardId=card.id;
        STATE.newJobDetails={
          project:card.projectName||'',
          client:card.clientName||'',
          po:card.poNo||'',
          poDate:card.poDate||'',
          jcDate:card.jobCardDate||'',
          dispatchDate:card.dispatchDate||'',
          art:card.artNo||''
        };
        STATE.tempItems=JSON.parse(JSON.stringify(card.items||[]));
        navigate('newJob');
      });
    }
    if(card.stage==='Job Card Created' || card.stage==='Query from Design')addBtn('Handover to Design','btn-indigo',()=>adv('Handover to Design'));
    if(card.stage==='QC Requested'){
      addBtn('QC Pass','btn-success',()=>{
        const h=[...(card.stageHistory||[]), {stage:'QC Passed', date:today(), time:new Date().toLocaleTimeString(), by:STATE.currentRole}];
        DB.saveCard(card.id,{stage:'QC Passed',...STAGE_CFG['QC Passed'],qcStatus:'passed',stageHistory:h});
        showToast('QC Passed!');navigate('jobDetail',{id:card.id});
      });
      addBtn('QC Fail - Send to Rework','btn-red',()=>{
        const h=[...(card.stageHistory||[]), {stage:'Rework', date:today(), time:new Date().toLocaleTimeString(), by:STATE.currentRole}];
        DB.saveCard(card.id,{stage:'Rework',...STAGE_CFG['Rework'],qcStatus:'failed',stageHistory:h});
        showToast('Sent to Rework');navigate('jobDetail',{id:card.id});
      });
    }
    // Duplicate Job Card
    addBtn('📋 Duplicate Job Card','btn-ghost',()=>{
      if(confirm('Duplicate this job card as a new job?')){
        const nc={...card,id:'JC-'+ts(),createdAt:Date.now(),stage:'Job Card Created',...STAGE_CFG['Job Card Created'],stageHistory:[{stage:'Job Card Created',date:today(),time:new Date().toLocaleTimeString(),by:STATE.currentRole}],bom:[],bomSentToPurchase:false,materialsApproved:false,prodType:null,currentDept:null,deptHistory:[],tickets:[]};
        DB.addCard(nc);showToast('Job card duplicated!');navigate('dashboard');
      }
    });
    // Delete Job Card
    addBtn('🗑 Delete Job Card','btn-red',() => {
        if(confirm('Are you sure you want to delete this job card?')) {
            DB.deleteCard(card.id);
            showToast('Job card deleted');
            navigate('dashboard');
        }
    });
  }

  // Download Job Card (Visible to all)
  addBtn('📥 Download Job Card (PDF)','btn-ghost',()=>{
    let w=window.open('','_blank');
    let h=`<html><head><title>Job Card - ${card.projectName}</title><style>body{font-family:Arial,sans-serif;padding:20px;}h2{color:#0085CA;}table{width:100%;border-collapse:collapse;margin-top:10px;}th,td{border:1px solid #ccc;padding:8px;font-size:12px;text-align:left;}th{background:#0085CA;color:#fff;}.info{margin-bottom:6px;font-size:14px;}</style></head><body>`;
    h+=`<h2>Job Card – ${card.projectName}</h2>`;
    h+=`<div class="info"><b>Job ID:</b> ${card.id}</div><div class="info"><b>Client:</b> ${card.clientName||'--'}</div><div class="info"><b>PO No:</b> ${card.poNo}</div><div class="info"><b>Status:</b> ${card.stage}</div>`;
    h+=`<table><thead><tr><th>No</th><th>Item Name</th><th>WxHxD</th><th>Qty</th><th>Desc / Core / Lam</th><th>Remarks</th></tr></thead><tbody>`;
    (card.items||[]).forEach((it,i)=>{h+=`<tr><td>${i+1}</td><td><b>${it.itemName}</b></td><td>${it.width||'-'}x${it.height||'-'}x${it.depth||'-'}</td><td>${it.qty}</td><td>Core: ${it.coreMaterial||'--'}, Outer: ${it.outerSurface||'--'}, Shutter: ${it.shutterLam||'--'}</td><td>${it.remark||'--'}</td></tr>`;});
    h+=`</tbody></table></body></html>`;w.document.write(h);w.document.close();w.print();
  });
  
  addBtn('📥 Download Job Card (Excel)','btn-ghost',()=>{
    let csv = 'No,Item Name,Width,Height,Depth,Qty,Core Material,Outer Laminate,Inner Laminate,Shutter Laminate,Expose Panel,Shutter Handle,Profile Handle,Drawer Handle,Lock,Light,Glass,Legs,Channel,Hardware,Additional HW,Metal,Polish,Fabric 1,Fabric 2,Foam Premium,Foam Regular,Wood Finish,Sofa Leg,Sofa Polish,Sofa Hardware,Sofa Metal,Additional Finish,Remarks\n';
    (card.items||[]).forEach((it,i)=>{
      csv += `${i+1},"${it.itemName||''}","${it.width||''}","${it.height||''}","${it.depth||''}",${it.qty},"${it.coreMaterial||''}","${it.outerSurface||''}","${it.innerSurface||''}","${it.shutterLam||''}","${it.exposePanel||''}","${it.shutterHandle||''}","${it.profileHandle||''}","${it.drawerHandle||''}","${it.lock||''}","${it.light||''}","${it.glass||''}","${it.legs||''}","${it.channel||''}","${it.hardware||''}","${it.additionalHardware||''}","${it.metal||''}","${it.panelPolish||''}","${it.fab1||''}","${it.fab2||''}","${it.foamPrem||''}","${it.foamReg||''}","${it.woodFin||''}","${it.sofaLeg||''}","${it.sofaPolish||''}","${it.sofaHardware||''}","${it.sofaMetal||''}","${it.sofaAddFinish||''}","${it.remark||''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `JobCard_${card.poNo}.csv`;
    a.click();
  });
  if(role==='Design Head' || role==='Admin'){
    if(card.stage==='Handover to Design')addBtn('Start Design Work','btn-indigo',()=>adv('Design In Progress'));
    if(card.stage==='Design In Progress' || card.stage==='Query from Production')addBtn('Handover to Production','btn-success',()=>adv('Handover to Production'));
    
    if(['Handover to Design', 'Design In Progress'].includes(card.stage)) {
      addBtn('↩ Send Back to PC (Query)','btn-red',()=>{
        const note = prompt('Enter your query for the Project Coordinator:') || '';
        if(!note) { showToast('Query note is required to send back.'); return; }
        const h=[...(card.stageHistory||[]),{stage:'Query from Design',date:today(),time:new Date().toLocaleTimeString(),by:STATE.currentRole,note}];
        DB.saveCard(card.id,{stage:'Query from Design',...STAGE_CFG['Query from Design'],stageHistory:h});
        showToast('Sent back to PC with query');
        navigate('jobDetail',{id:card.id});
      });
    }
  }
  if(['Production Head', 'Admin', 'Design Head'].includes(role)){
    if(['Handover to Production', 'Materials Approved'].includes(card.stage)) {
      addBtn('↩ Send Back to Design (Query)','btn-red',()=>{
        const note = prompt('Enter your query for the Design Head:') || '';
        if(!note) { showToast('Query note is required to send back.'); return; }
        const h=[...(card.stageHistory||[]),{stage:'Query from Production',date:today(),time:new Date().toLocaleTimeString(),by:STATE.currentRole,note}];
        DB.saveCard(card.id,{stage:'Query from Production',...STAGE_CFG['Query from Production'],stageHistory:h});
        showToast('Sent back to Design with query');
        navigate('jobDetail',{id:card.id});
      });
    }
    if(card.stage==='Handover to Production'&&(card.bom||[]).length===0){
      addBtn('Add BOM and Send to Purchase','btn-amber',()=>{APP.querySelectorAll('.tab')[2].click();});
    }
    if(['Handover to Production', 'Materials Approved'].includes(card.stage)){
      addBtn('Start Production','btn-amber',()=>showProdModal(card));
    }
    if(card.currentDept && !['Dispatched', 'QC Requested', 'QC Passed', 'Rework'].includes(card.stage)){
      const stagesList = card.prodType === 'Panel' ? PANEL_STAGES : SOFA_STAGES;
      const d=document.createElement('div');
      d.innerHTML='<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:4px">Forward to Department:</div><select id="jd-next-dept" style="width:100%;padding:10px;margin-bottom:8px;background:#fff;color:var(--text-primary);border:1.5px solid var(--border);border-radius:8px;">'+stagesList.map(s=>'<option value="'+s+'" '+(s===card.currentDept?'disabled':'')+'>'+(s==='SW Carpentry'?'Solid Wood Carpentry':s)+'</option>').join('')+'</select>';
      acts.appendChild(d);
      
      if(!DEPT_ROLES.includes(card.currentDept) && card.currentDeptStatus !== 'Done'){
        addBtn('Mark Current Dept Done','btn-success',()=>{
          DB.saveCard(card.id,{currentDeptStatus:'Done'});
          showToast('Marked ' + card.currentDept + ' complete!');
          navigate('jobDetail',{id:card.id});
        });
      }

      addBtn('Forward to Selected Dept','btn-amber',()=>{
         const nd=$('jd-next-dept').value;
         if(nd)advDept(nd);
      });
      addBtn('Request QC','btn-amber',()=>adv('QC Requested'));
    }
    if(card.stage==='QC Passed'){
      addBtn('Dispatch','btn-teal',()=>adv('Dispatched'));
    }
    if(card.stage==='Dispatched'){
      const b=document.createElement('button');b.className='btn btn-ghost btn-block mb-2';b.textContent='DISPATCHED';b.disabled=true;b.style.color='#888';acts.appendChild(b);
      // Print Delivery Challan Button
      addBtn('🖨 Print Delivery Challan','btn-indigo',()=>{
        let w=window.open('','_blank');
        let h=`<html><head><title>Delivery Challan - ${card.projectName}</title><style>body{font-family:Arial,sans-serif;padding:20px;}h2{color:#0085CA;text-align:center;}table{width:100%;border-collapse:collapse;margin-top:10px;}th,td{border:1px solid #ccc;padding:8px;font-size:13px;text-align:left;}th{background:#0085CA;color:#fff;}.header{display:flex;justify-content:space-between;margin-bottom:20px;}</style></head><body>`;
        h+=`<h2>DELIVERY CHALLAN</h2><div class="header"><div><b>Project:</b> ${card.projectName}<br><b>Client:</b> ${card.clientName||'--'}<br><b>PO No:</b> ${card.poNo}</div><div><b>Date:</b> ${new Date().toLocaleDateString('en-IN')}<br><b>Job ID:</b> ${card.id}</div></div>`;
        h+=`<table><thead><tr><th>Sr</th><th>Description of Goods</th><th>Dimension</th><th>Qty</th><th>Remarks</th></tr></thead><tbody>`;
        (card.items||[]).forEach((it,i)=>{h+=`<tr><td>${i+1}</td><td><b>${it.itemName}</b></td><td>${it.width||'-'}x${it.height||'-'}x${it.depth||'-'}</td><td>${it.qty}</td><td></td></tr>`;});
        h+=`</tbody></table><br><br><div class="header"><div><b>Prepared By:</b> ________________</div><div><b>Received By (Sign):</b> ________________</div></div></body></html>`;
        w.document.write(h);w.document.close();w.print();
      });
    }
    if(card.stage==='Rework')addBtn('Rework Done - Request QC Again','btn-indigo',()=>adv('QC Requested'));
  }
  if(role==='Purchase Head' || role==='Admin'){
    if (card.stage==='Material Approval') {
        const b=document.createElement('button');b.className='btn btn-success btn-block mb-2';b.textContent='Approve Materials - Send to Production Head';
        b.onclick=()=>{
          const h=[...(card.stageHistory||[]), {stage:'Materials Approved', date:today(), time:new Date().toLocaleTimeString(), by:STATE.currentRole}];
          DB.saveCard(card.id,{stage:'Materials Approved',...STAGE_CFG['Materials Approved'],materialsApproved:true,stageHistory:h});
          showToast('Materials Approved!');navigate('jobDetail',{id:card.id});
        };
        acts.appendChild(b);
    }
  }
  if(DEPT_ROLES.includes(role)&&card.currentDept===role){
    if (card.currentDeptStatus === 'Done') {
      const b=document.createElement('button');b.className='btn btn-ghost btn-block mb-2';b.textContent='Waiting for Production Head...';b.disabled=true;acts.appendChild(b);
    } else {
      addBtn('Mark My Work Done','btn-success',()=>{DB.saveCard(card.id,{currentDeptStatus:'Done'});showToast('Marked complete - Production Head can advance.');navigate('jobDetail',{id:card.id});});
    }
  }
  if(acts.children.length===0)$('jd-actions-card').classList.add('hidden');
  else $('jd-actions-card').classList.remove('hidden');
  if(!['Design Head', 'Admin', 'Project Coordinator'].includes(role)) $('jd-add-drawing-card').classList.add('hidden');
  $('btn-upload-drw').onclick=()=>{const n=$('drw-name').value,u=$('drw-url').value;if(n){const d=[...(card.drawings||[]),{id:'DRW-'+ts(),name:n,url:u,date:today()}];DB.saveCard(card.id,{drawings:d});navigate('jobDetail',{id:card.id});}};
  $('jd-drawings-list').innerHTML='';
  (card.drawings||[]).forEach((d)=>{
    const e=document.createElement('div');
    e.className='list-item-card flex-between';
    e.innerHTML='<div><div class="item-title">'+d.name+'</div><div class="item-subtitle">'+d.date+'</div></div><div style="display:flex;gap:12px;align-items:center;">'+(d.url?'<a href="'+d.url+'" target="_blank" style="color:#c9963a;font-size:.8rem;text-decoration:none;font-weight:600">View</a>':'')+(['Project Coordinator', 'Admin'].includes(role)?'<span style="color:var(--red);font-size:.8rem;cursor:pointer;font-weight:600" onclick="deleteDrawing(\''+card.id+'\',\''+d.id+'\')">Delete</span>':'')+'</div>';
    $('jd-drawings-list').appendChild(e);
  });
  window.deleteDrawing=(cardId,drawingId)=>{
    if(confirm('Are you sure you want to delete this drawing?')){
      const c2=DB.getCard(cardId);
      if(c2){
        const upd=(c2.drawings||[]).filter(x=>x.id!==drawingId);
        DB.saveCard(cardId,{drawings:upd});
        showToast('Drawing deleted');
        navigate('jobDetail',{id:cardId});
      }
    }
  };
  const bomCatSelect = $('bom-category');
  if(bomCatSelect) {
    bomCatSelect.onchange = () => {
      $('bom-custom-category-group').classList.toggle('hidden', bomCatSelect.value !== 'OTHER');
    };
    bomCatSelect.value = 'CORE MATERIAL';
    $('bom-custom-category-group').classList.add('hidden');
    $('bom-custom-category').value = '';
  }

  $('btn-add-bom').onclick=()=>{
     let cat=$('bom-category').value, brand=$('bom-brand').value, m=$('bom-mat').value, q=$('bom-qty').value, u=$('bom-unit').value, r=$('bom-remark').value;
     if(cat==='OTHER') {
        cat = ($('bom-custom-category').value || '').trim().toUpperCase();
        if(!cat) { showToast('Please enter a custom category'); return; }
     }
     if(m&&q){
        const b=[...(card.bom||[]),{id:'BOM-'+ts(), category:cat, brand:brand, material:m, qty:q, unit:u, remark:r, status:'pending'}];
        DB.saveCard(card.id,{bom:b});
        navigate('jobDetail',{id:card.id});
     }
  };
  if((role==='Production Head' || role==='Admin' || role==='Design Head')&&(card.bom||[]).length>0&&!card.bomSentToPurchase){
    $('btn-send-bom').classList.remove('hidden');
    $('btn-send-bom').onclick=()=>{
      const h=[...(card.stageHistory||[]), {stage:'Material Approval', date:today(), time:new Date().toLocaleTimeString(), by:STATE.currentRole}];
      DB.saveCard(card.id,{bomSentToPurchase:true,stage:'Material Approval',...STAGE_CFG['Material Approval'],stageHistory:h});
      showToast('BOM sent to Purchase Head!');
      navigate('jobDetail',{id:card.id});
    };
  }
  if(card.bomSentToPurchase) { if($('bom-sent-badge')){$('bom-sent-badge').style.display = 'inline-block'; $('bom-sent-badge').classList.remove('hidden');} }
  
  let bomHtml = '<div style="overflow-x:auto;"><table class="ff-table"><thead><tr><th>Brand</th><th>Item / Thickness / Specs</th><th>Qty</th><th>Remark</th><th>Store Status</th><th>Purchase Action</th></tr></thead><tbody>';
  const bomGroups = {'CORE MATERIAL':[], 'SURFACE':[], 'EDGEBAND':[], 'HARDWARE & OTHER MATERIAL':[]};
  (card.bom||[]).forEach(b => {
     let c = b.category || 'HARDWARE & OTHER MATERIAL';
     if(!bomGroups[c]) bomGroups[c] = [];
     bomGroups[c].push(b);
  });
  let hasBom = false;
  Object.keys(bomGroups).forEach(cat => {
     if(bomGroups[cat].length === 0) return;
     hasBom = true;
     bomHtml += `<tr><td colspan="6" style="background:var(--indigo);color:#fff;font-weight:800;text-align:center;padding:6px;font-size:0.75rem">${cat}</td></tr>`;
     bomGroups[cat].forEach(b => {
        const sColor=b.status==='available'?'#4caf78':b.status==='in_purchase'?'#e8a030':b.status==='issued'?'#3db8a0':'#e05555';
        let h='--';
        if((role==='Purchase Head' || role==='Admin')&&b.status==='pending'){
            h=`<button class="btn btn-sm btn-amber mb-1" onclick="updBomStat('${card.id}','${b.id}','in_purchase')">Order</button><br><button class="btn btn-sm btn-teal" onclick="issueBomItem('${card.id}','${b.id}','${b.material}',${b.qty})">Issue from Stock</button>`;
        }
        else if((role==='Purchase Head' || role==='Admin')&&b.status==='in_purchase')h=`<button class="btn btn-sm btn-success" onclick="updBomStat('${card.id}','${b.id}','available')">GRN (Receive)</button>`;
        else if((role==='Store' || role==='Admin')&&b.status==='available')h=`<button class="btn btn-sm btn-teal" onclick="issueBomItem('${card.id}','${b.id}','${b.material}',${b.qty})">Issue to Factory</button>`;
        bomHtml += `<tr><td style="font-weight:600;color:var(--text-light)">${b.brand||'--'}</td><td>${b.material}</td><td>${b.qty} ${b.unit}</td><td style="font-size:0.7rem">${b.remark||'--'}</td><td><span class="badge" style="background:${sColor}">${b.status}</span></td><td>${h}</td></tr>`;
     });
  });
  bomHtml += '</tbody></table></div>';
  if(!hasBom) bomHtml='<div class="empty-state">No BOM items added yet.</div>';
  $('jd-bom-list').innerHTML=bomHtml;
  // Print BOM button (visible to Production Head, Purchase Head, Admin, Design Head, Project Coordinator)
  if(['Production Head','Purchase Head','Admin','Project Coordinator','Design Head'].includes(role) && (card.bom||[]).length>0){
    const pb=document.createElement('button');pb.className='btn btn-ghost btn-block mb-2';pb.textContent='🖨 Print BOM (PDF)';
    pb.onclick=()=>{
      let w=window.open('','_blank');
      let h=`<html><head><title>BOM - ${card.projectName}</title><style>body{font-family:Arial,sans-serif;padding:20px;}h2{color:#0085CA;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:8px;font-size:12px;}th{background:#0085CA;color:#fff;}.info{margin-bottom:16px;font-size:13px;}</style></head><body>`;
      h+=`<h2>BOM – ${card.projectName}</h2><div class="info"><b>Job:</b> ${card.id} &nbsp; <b>PO:</b> ${card.poNo} &nbsp; <b>Dispatch:</b> ${card.dispatchDate||'--'}</div>`;
      h+=`<table><thead><tr><th>Sr</th><th>Category</th><th>Brand</th><th>Material</th><th>Qty</th><th>Unit</th><th>Remark</th><th>Status</th></tr></thead><tbody>`;
      (card.bom||[]).forEach((b,i)=>{h+=`<tr><td>${i+1}</td><td>${b.category||'--'}</td><td>${b.brand||'--'}</td><td>${b.material}</td><td>${b.qty}</td><td>${b.unit}</td><td>${b.remark||'--'}</td><td>${b.status}</td></tr>`;});
      h+=`</tbody></table></body></html>`;w.document.write(h);w.document.close();w.print();
    };
    $('jd-bom-list').after(pb);
    
    const eb=document.createElement('button');eb.className='btn btn-ghost btn-block mb-2';eb.textContent='📥 Download BOM (Excel)';
    eb.onclick=()=>{
      let csv = 'Sr,Category,Brand,Material,Qty,Unit,Remark,Status\n';
      (card.bom||[]).forEach((b,i)=>{
        csv += `${i+1},"${b.category||''}","${b.brand||''}","${b.material||''}",${b.qty},"${b.unit||''}","${b.remark||''}","${b.status||''}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `BOM_${card.poNo}.csv`;
      a.click();
    };
    pb.after(eb);
  }
  window.updBomStat=(jid,bid,st)=>{
    const c2=DB.getCard(jid);const b=c2.bom.find(x=>x.id===bid);
    if(b){
      if(st==='available'){
        let pr=prompt("Enter Unit Price for "+b.material+":", b.price||"0");
        if(pr===null) return;
        b.price=parseFloat(pr)||0;
      }
      b.status=st;
      DB.saveCard(jid,{bom:c2.bom});
      navigate('jobDetail',{id:jid});
    }
  };
  window.issueBomItem=(jid,bid,mName,qty)=>{
     let mm = DB.getMats();
     let match = mm.find(m=>m.material === mName || (m.brand && m.brand + ' ' + m.material === mName));
     if(match){
         if(match.stock < qty) {
             if(!confirm('Insufficient stock for '+mName+' (Stock: '+match.stock+', Required: '+qty+'). Issue anyway? (Will result in negative opening stock)')) return;
         }
         match.stock -= qty;
         DB.setMats(mm);
         showToast(`Issued ${qty} from Live Stock!`);
     } else {
         if(!confirm('Warning: "'+mName+'" not found precisely in Live Stock to auto-deduct. Issue anyway just for Job Card?')) return;
     }
     const c2=DB.getCard(jid);const b=c2.bom.find(x=>x.id===bid);
     if(b){
       b.status='issued';
       if(match) b.price = match.rate || 0;
       DB.saveCard(jid,{bom:c2.bom});
       navigate('jobDetail',{id:jid});
     }
  };
  const ptl=$('jd-panel-timeline'), stl=$('jd-sofa-timeline');
  ptl.innerHTML=''; stl.innerHTML='';
  PANEL_STAGES.forEach(s=>{
    const li=document.createElement('li');
    li.className='tl-item'+(card.stage===s?' active':(PANEL_STAGES.indexOf(card.currentDept)>PANEL_STAGES.indexOf(s) || ['QC Requested','QC Passed','Dispatched'].includes(card.stage))?' done':'');
    li.innerHTML='<div class="tl-label">'+s+'</div>';
    ptl.appendChild(li);
  });
  SOFA_STAGES.forEach(s=>{
    const li=document.createElement('li');
    li.className='tl-item'+(card.stage===s?' active':(SOFA_STAGES.indexOf(card.currentDept)>SOFA_STAGES.indexOf(s) || ['QC Requested','QC Passed','Dispatched'].includes(card.stage))?' done':'');
    const name = s==='SW Carpentry' ? 'Solid Wood Carpentry' : s;
    li.innerHTML='<div class="tl-label">'+name+'</div>';
    stl.appendChild(li);
  });
  if(card.qcStatus==='passed')$('jd-qc-status').innerHTML='<span class="badge" style="background:#4caf78">QC Passed</span>';
  else if(card.qcStatus==='failed')$('jd-qc-status').innerHTML='<span class="badge" style="background:#e05555">QC Failed - Rework</span>';
  $('btn-raise-tkt').onclick=()=>{const n=$('tkt-note').value;if(n){const t=[...(card.tickets||[]),{id:'TKT-'+ts(),note:n,by:role,date:today(),resolved:false}];DB.saveCard(card.id,{tickets:t});navigate('jobDetail',{id:card.id});}};
  $('jd-tickets-list').innerHTML='';
  (card.tickets||[]).forEach(t=>{const e=document.createElement('div');e.className='list-item-card';e.style.borderLeft='3px solid '+(t.resolved?'#4caf78':'#e8a030');let h='<div class="item-title">'+t.note+'</div><div class="item-subtitle">By '+t.by+' - '+t.date+'</div><span class="badge mt-2" style="background:'+(t.resolved?'#4caf78':'#e8a030')+'">'+(t.resolved?'Resolved':'Open')+'</span>';if((role==='Project Coordinator'||role==='Admin')&&!t.resolved)h+='<br><button class="btn btn-sm btn-success mt-2" onclick="resolveTkt(\''+card.id+'\',\''+t.id+'\')">Mark Resolved</button>';e.innerHTML=h;$('jd-tickets-list').appendChild(e);});
  window.resolveTkt=(jid,tid)=>{const c2=DB.getCard(jid);const t=c2.tickets.find(x=>x.id===tid);if(t){t.resolved=true;DB.saveCard(jid,{tickets:c2.tickets});navigate('jobDetail',{id:jid});}};
};

function showProdModal(card){
  let html='<div class="modal-overlay" onclick="this.parentElement.innerHTML=\'\'"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div><h3 style="margin-bottom:8px">Start Production</h3><p style="font-size:.8rem;color:#9e8a6e;margin-bottom:14px">Choose starting department</p>';
  
  html+='<div style="font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-secondary)">PANEL DEPARTMENTS</div>';
  html+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">';
  PANEL_STAGES.forEach(d=>{
    html+='<button class="btn btn-sm btn-ghost" onclick="startProd(\''+card.id+'\',\'Panel\',\''+d+'\')">'+d+'</button>';
  });
  html+='</div>';

  html+='<div style="font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-secondary)">SOFA DEPARTMENTS</div>';
  html+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">';
  SOFA_STAGES.forEach(d=>{
    const name = d==='SW Carpentry' ? 'Solid Wood Carpentry' : d;
    html+='<button class="btn btn-sm btn-ghost" onclick="startProd(\''+card.id+'\',\'Sofa\',\''+d+'\')">'+name+'</button>';
  });
  html+='</div>';

  html+='<button class="btn btn-ghost btn-block" onclick="$(\'modal-container\').innerHTML=\'\'">Cancel</button></div></div>';
  $('modal-container').innerHTML=html;
}
window.startProd=(jid,type,dept)=>{
  const cfg=STAGE_CFG[dept]||{color:'#e07d40',pct:44}, now=new Date();
  const card=DB.getCard(jid);
  const h=[...(card.stageHistory||[]), {stage:dept, date:today(), time:now.toLocaleTimeString(), by:STATE.currentRole}];
  DB.saveCard(jid,{prodType:type,currentDept:dept,stage:dept,stageColor:cfg.color,stagePercent:cfg.pct,deptHistory:[{dept,time:now.toLocaleTimeString()}],stageHistory:h});
  $('modal-container').innerHTML='';showToast('Production started: '+type+' -> '+dept);navigate('jobDetail',{id:jid});
};

SCREENS.myTasks=()=>{
  const role=STATE.currentRole,cards=DB.getCards().sort((a,b)=>b.createdAt-a.createdAt);
  $('tasks-title').textContent='Tasks for '+role;
  const list=$('my-tasks-list');let filtered=[];
  if(role==='Project Coordinator'||role==='Admin')filtered=cards;
  else if(role==='Design Head')filtered=cards.filter(c=>['Handover to Design','Design In Progress'].includes(c.stage));
  else if(role==='Production Head')filtered=cards.filter(c=>!['Job Card Created','Handover to Design','Design In Progress'].includes(c.stage));
  else if(role==='Purchase Head')filtered=cards.filter(c=>c.bomSentToPurchase||c.stage==='Material Approval');
  else if(role==='Store')filtered=cards;
  else if(DEPT_ROLES.includes(role))filtered=cards.filter(c=>c.currentDept===role);
  if(!filtered.length){list.innerHTML='<div class="empty-state">No tasks assigned to you.</div>';return;}
  list.innerHTML='';
  filtered.forEach(c=>{const cfg=STAGE_CFG[c.stage]||{color:'#c9963a'};const e=document.createElement('div');e.className='list-item-card';e.innerHTML='<div class="item-title">'+(c.projectName||'Unnamed')+'</div><div class="item-subtitle">'+c.id + (c.artNo ? ' (Art No: ' + c.artNo + ')' : '') +' - '+c.poNo+'</div><span class="badge mt-2" style="background:'+cfg.color+'">'+c.stage+'</span>';e.onclick=()=>{STATE.prevScreen='myTasks';navigate('jobDetail',{id:c.id});};list.appendChild(e);});
};

SCREENS.materials=()=>{
  const role=STATE.currentRole,cards=DB.getCards();let allBom=[];
  cards.filter(c=>c.bomSentToPurchase).forEach(c=>(c.bom||[]).forEach(b=>allBom.push({...b,jobName:c.projectName,jobId:c.id})));
  
  let mats = DB.getMats();
  if(mats.length < 10){
    const DEFAULT_CATALOG = [
      { cat: "PLYWOOD", unit: "sqft", items: [
        "BLACK 17MM 8x4", "BLACK 17MM 8x6", "BLACK 25MM 8x4", "BLACK 5MM 8x4", "BLACK 9MM 9x6",
        "CANYAN OAK 17MM 8x4", "CANYAN OAK 18MM 9x6", "CANYAN OAK 25MM 8x4", "CANYAN OAK 5MM 8x4",
        "COLOMBIAN WALNUT 17MM 8x4", "COLOMBIAN WALNUT 25MM 8x4", "COLOMBIAN WALNUT 5MM 8x4",
        "FABRIC WOOD 17MM 8x4", "FABRIC WOOD 25MM 8x4", "FABRIC WOOD 5MM 8x4",
        "FROSTY WHITE 17MM 8x6", "FROSTY WHITE 25MM 8x4", "FROSTY WHITE 5MM 8x4"
      ]},
      { cat: "LAMINATE", unit: "sheet", items: [
        "GALAXY 9280 1MM", "HOMEDGE 1702 0.8MM", "MERINO 22089 1MM", "GREENLAM 243 SUD 1MM"
      ]},
      { cat: "HARDWARE", unit: "nos", items: [
        "CHANNEL NORMAL 10\"", "CHANNEL SOFT CLOSE 12\"", "HYDROLIC SET 150 PUM", "KNOB BLACK TT",
        "MINIFIX + DOWEL", "CONFIRMAT SCREWS"
      ]},
      { cat: "FOAM", unit: "nos", items: [
        "HR FOAM 40D 100MM", "HR FOAM 40D 40MM", "HR FOAM 32D 25MM", "HR FOAM 28D 10MM", "HR FOAM 28D 15MM"
      ]},
      { cat: "FABRIC", unit: "mtr", items: [
        "LEATHER", "SAROM MELISA 713", "MB CF KITES 14", "SPARSH MILANO 12", "MB CF SOFT TOUCH 14"
      ]}
    ];
    let idCounter = 1;
    DEFAULT_CATALOG.forEach(c => c.items.forEach(i => mats.push({ id: 'MAT-'+(idCounter++), category: c.cat, material: i, unit: c.unit, stock: 0 })));
    DB.setMats(mats);
  }

  APP.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{APP.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));APP.querySelectorAll('.tab-pane').forEach(x=>x.classList.remove('active'));t.classList.add('active');$('tab-'+t.dataset.tab).classList.add('active');});

  let totalValuation = mats.reduce((sum, m) => sum + ((m.stock||0) * (m.rate||0)), 0);
  let liveHtml = `<div class="stats-row"><div class="stat-card" style="border-color:var(--green)"><div class="stat-value" style="color:var(--green)">₹ ${totalValuation.toLocaleString('en-IN')}</div><div class="stat-label">Total Stock Valuation</div></div></div>`;
  liveHtml += '<div style="margin-bottom:12px;font-size:0.8rem;color:var(--text-secondary)">Master Inventory List. Opening Stock.</div><div style="overflow-x:auto;"><table class="ff-table"><thead><tr><th style="width:40px">Sr No</th><th>Particular (Material)</th><th>Stock</th><th>Min Stock</th><th>Rate (₹)</th><th style="text-align:right">Action</th></tr></thead><tbody>';
  let groupedMats = {};
  mats.forEach(m => {
     let cat = m.category || 'CUSTOM MATERIALS';
     if(!groupedMats[cat]) groupedMats[cat]=[];
     groupedMats[cat].push(m);
  });
  
  Object.keys(groupedMats).sort().forEach(cat => {
     liveHtml += `<tr><td colspan="5" style="background:#e8a030;color:#000;font-weight:800;font-size:0.85rem;text-align:center">${cat}</td></tr>`;
     groupedMats[cat].forEach((m, idx) => {
       const sColor = m.stock>0 ? '#4caf78' : 'var(--border)';
       const qtyColor = m.stock>0 ? '#fff' : '#888';
       const isLow = m.minStock && m.stock < m.minStock;
       const delBtn = (role==='Purchase Head' || role==='Admin') ? `<button class="btn btn-sm btn-ghost" onclick="delMat('${m.id}')" style="color:var(--red);margin-left:8px">🗑</button>` : '';
       liveHtml += `<tr style="${isLow?'background:rgba(220,53,69,0.06)':''}"><td style="text-align:center">${idx+1}</td><td style="color:var(--text-light)">${m.material}${isLow?'<span style="color:var(--red);font-size:0.65rem;margin-left:6px;font-weight:700">⚠ Low Stock</span>':''}</td><td><span class="badge" style="background:${sColor};color:${qtyColor}">${m.stock||0} ${m.unit}</span></td><td style="color:${isLow?'var(--red)':'var(--text-secondary)'}">${m.minStock||'--'}</td><td>₹ ${m.rate||0}</td><td style="text-align:right;white-space:nowrap"><button class="btn btn-sm btn-success" onclick="updStock('${m.id}', 'grn')">+ GRN</button> <button class="btn btn-sm btn-red" onclick="updStock('${m.id}', 'issue')">- Issue</button>${delBtn}</td></tr>`;
     });
  });
  liveHtml += '</tbody></table></div>';
  $('mat-list-live').innerHTML = liveHtml;

  const renderJobsTable=(list, containerId, emptyMsg)=>{
    let html = '<div style="overflow-x:auto;"><table class="ff-table"><thead><tr><th>Job</th><th>Brand / Particular</th><th>Qty</th><th>Status</th><th>Purchase Action</th></tr></thead><tbody>';
    if(list.length===0) html='<div class="empty-state">'+emptyMsg+'</div>';
    else {
      list.forEach(b=>{
        const sColor=b.status==='available'?'#4caf78':b.status==='in_purchase'?'#e8a030':b.status==='issued'?'#3db8a0':'#e05555';
        let h='--';
        const isAuth = ['Purchase Head', 'Store', 'Admin'].includes(role);
        if(isAuth && b.status==='pending') {
            h=`<button class="btn btn-sm btn-amber mb-1" onclick="updMatStat('${b.jobId}','${b.id}','in_purchase')">Order</button><br><button class="btn btn-sm btn-teal" onclick="issueBomItem('${b.jobId}','${b.id}','${b.material}',${b.qty})">Issue from Stock</button>`;
        }
        else if(isAuth && b.status==='in_purchase') h=`<button class="btn btn-sm btn-success" onclick="updMatStat('${b.jobId}','${b.id}','available')">GRN (Receive)</button>`;
        else if(isAuth && b.status==='available') h=`<button class="btn btn-sm btn-teal" onclick="issueBomItem('${b.jobId}','${b.id}','${b.material}',${b.qty})">Issue to Factory</button>`;
        
        const jobLink = `<a href="#" onclick="STATE.prevScreen='materials';navigate('jobBomDetail',{id:'${b.jobId}'});return false;" style="color:var(--indigo);text-decoration:none;font-weight:600" title="Click to view full Job BOM">${b.jobName}</a><br><span style="font-size:0.65rem;color:var(--text-secondary)">${b.jobId}</span>`;

        html+=`<tr><td>${jobLink}</td><td><b>${b.brand||''}</b><br>${b.material}</td><td>${b.qty} ${b.unit}</td><td><span class="badge" style="background:${sColor}">${b.status}</span></td><td>${h}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }
    $(containerId).innerHTML = html;
  };

  renderJobsTable(allBom, 'mat-list-jobs', 'No active job requirements found.');

  // Define updMatStat for materials Job BOMs tab (mirrors updBomStat from jobDetail)
  window.updMatStat=(jid,bid,st)=>{
    const c2=DB.getCard(jid);if(!c2) return;
    const b=c2.bom.find(x=>x.id===bid);
    if(b){
      if(st==='available'){
        let pr=prompt("Enter Unit Price for "+b.material+":", b.price||"0");
        if(pr===null) return;
        b.price=parseFloat(pr)||0;
      }
      b.status=st;
      DB.saveCard(jid,{bom:c2.bom});
      navigate('materials');
    }
  };

  // Global issueBomItem for materials screen
  if(!window.issueBomItem) {
    window.issueBomItem=(jid,bid,mName,qty)=>{
       let mm = DB.getMats();
       let match = mm.find(m=>m.material === mName || (m.brand && m.brand + ' ' + m.material === mName));
       if(match){
           if(match.stock < qty) {
               if(!confirm('Insufficient stock for '+mName+' (Stock: '+match.stock+', Required: '+qty+'). Issue anyway?')) return;
           }
           match.stock -= qty;
           DB.setMats(mm);
           showToast(`Issued ${qty} from Live Stock!`);
       } else {
           if(!confirm('Warning: "'+mName+'" not found in Live Stock. Issue anyway?')) return;
       }
       const c2=DB.getCard(jid);const b=c2.bom.find(x=>x.id===bid);
       if(b){
         b.status='issued';
         if(match) b.price = match.rate || 0;
         DB.saveCard(jid,{bom:c2.bom});
         navigate('materials');
       }
    };
  }

  renderJobsTable(allBom.filter(b=>b.status==='in_purchase'), 'mat-list-grn', 'No items currently ordered/waiting for GRN.');
  renderJobsTable(allBom.filter(b=>b.status==='available'), 'mat-list-issue', 'No items available to issue.');

  window.updStock = (matId, type) => {
    let amt = prompt(type==='grn' ? "Enter Quantity to Receive (GRN):" : "Enter Quantity to Issue:");
    if(!amt || isNaN(amt)) return;
    amt = parseFloat(amt);
    let mm = DB.getMats();
    let m = mm.find(x=>x.id===matId);
    if(m) {
       if(type==='grn') {
         let r = prompt("Update Rate (₹) for " + m.material + ":", m.rate || 0);
         if(r !== null) m.rate = parseFloat(r) || 0;
         m.stock = (m.stock || 0) + amt;
       } else if(type==='issue'){
         m.stock = (m.stock || 0) - amt;
       }
       DB.setMats(mm);
       navigate('materials');
    }
  };

  window.delMat = (id) => {
    if(confirm('Are you sure you want to delete this material from inventory?')){
      let mm = DB.getMats().filter(m=>m.id!==id);
      DB.setMats(mm);
      showToast('Material deleted');
      navigate('materials');
    }
  };

  if(['Purchase Head', 'Admin'].includes(role)){
    $('btn-add-stock').classList.remove('hidden');
    $('btn-add-stock').onclick=()=>{
      let html='<div class="modal-overlay" onclick="this.parentElement.innerHTML=\'\'"><div class="modal-sheet" onclick="event.stopPropagation()"><div class="modal-handle"></div><h3 style="margin-bottom:12px">Add New Material to Inventory</h3>';
      html+='<div class="form-group"><label>Category</label><input type="text" id="add-mat-cat" placeholder="e.g. HARDWARE" list="cat-suggestions"><datalist id="cat-suggestions"><option>PLYWOOD</option><option>LAMINATE</option><option>HARDWARE</option><option>FOAM</option><option>FABRIC</option></datalist></div>';
      html+='<div class="form-group"><label>Material Name</label><input type="text" id="add-mat-name" placeholder="Particular (Material)"></div>';
      html+='<div class="form-row"><div class="form-group"><label>Unit</label><select id="add-mat-unit"><option>nos</option><option>sqft</option><option>sheet</option><option>rft</option><option>kg</option><option>ltr</option><option>set</option><option>mtr</option></select></div>';
      html+='<div class="form-group"><label>Rate (₹)</label><input type="number" id="add-mat-rate" placeholder="0"></div></div>';
      html+='<div class="form-group"><label>Min. Stock Level (Low Stock Alert)</label><input type="number" id="add-mat-min" placeholder="e.g. 5"></div>';
      html+='<button class="btn btn-indigo btn-block mb-2" id="btn-save-stock">Add to Stock List</button><button class="btn btn-ghost btn-block" onclick="$(\'modal-container\').innerHTML=\'\'">Cancel</button></div></div>';
      $('modal-container').innerHTML=html;
      $('btn-save-stock').onclick=()=>{
         const c=$('add-mat-cat').value, n=$('add-mat-name').value, u=$('add-mat-unit').value, r=$('add-mat-rate').value, mn=$('add-mat-min').value;
         if(n && c){
           const newMat={id:'MAT-'+ts(), category: c.toUpperCase(), material:n, unit:u, stock:0, rate: parseFloat(r)||0, minStock: parseFloat(mn)||0};
           DB.setMats([...DB.getMats(), newMat]);
           $('modal-container').innerHTML='';
           showToast('Material added to ' + c);
           navigate('materials');
         } else showToast('Category and Name required');
      };
    };
  } else {
    $('btn-add-stock').classList.add('hidden');
  }
};

SCREENS.profile=()=>{
  const role=STATE.currentRole,info=getRoleInfo(role),cards=DB.getCards();
  $('pf-avatar').textContent=info.abbr;$('pf-avatar').className='profile-avatar '+info.cls;
  $('pf-name').textContent=STATE.currentUser||'User';$('pf-role').textContent=role;
  $('pf-role2').textContent=role;$('pf-username').textContent=STATE.currentUser;$('pf-since').textContent=STATE.loginTime;
  $('pf-total').textContent=cards.length;$('pf-active').textContent=cards.filter(c=>c.stage!=='Dispatched').length;$('pf-done').textContent=cards.filter(c=>c.stage==='Dispatched').length;
};

SCREENS.jobBomDetail=(params={})=>{
  const card=DB.getCard(params.id);if(!card){navigate('materials');return;}
  $('jbd-title').textContent = 'BOM: ' + (card.projectName||card.id);
  
  let html = '';
  const cats = {'CORE MATERIAL':[], 'SURFACE':[], 'EDGEBAND':[], 'HARDWARE & OTHER MATERIAL':[]};
  (card.bom||[]).forEach(b => {
    let c = b.category || 'HARDWARE & OTHER MATERIAL';
    if(!cats[c]) cats[c] = [];
    cats[c].push(b);
  });

  const role = STATE.currentRole;
  const isAuth = ['Purchase Head', 'Store', 'Admin'].includes(role);

  const tDate = new Date().toLocaleDateString('en-GB');

  html = `<style>
    .bom-excel { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 0.75rem; text-align: center; margin-top:10px; background: white;}
    .bom-excel th, .bom-excel td { border: 1.5px solid #000; padding: 4px; }
    .bom-excel .bg-blue { background: #b4c6e7; font-weight: 800; color: #000; font-size: 0.85rem; }
    .bom-excel .bg-green { background: #c6e0b4; font-weight: 800; color: #000; font-size: 0.7rem; }
    .bom-excel td b { font-weight: 800; }
  </style>
  <div style="overflow-x:auto;">
  <table class="bom-excel">
    <tr><td colspan="7" class="bg-blue">B.O.M (BILL OF MATERIAL)</td></tr>
    <tr class="bg-green">
      <td colspan="5">ORDER NAME</td>
      <td>JOB CARD</td>
      <td>JOB CARD RECEIVE</td>
    </tr>
    <tr>
      <td colspan="5"><b>${card.projectName||'--'}</b></td>
      <td><b>${card.id}</b><br><span style="font-size:0.65rem;color:#c9963a;font-weight:600">Art No: ${card.artNo||'--'}</span></td>
      <td><b>${card.createdAt ? new Date(card.createdAt).toLocaleDateString('en-GB') : '--'}</b></td>
    </tr>
    <tr class="bg-green">
      <td colspan="4">BOM GENERATE DATE</td>
      <td><b>${tDate}</b></td>
      <td>PO Date</td>
      <td><b>${card.poDate||'--'}</b></td>
    </tr>`;

  Object.keys(cats).forEach(cat => {
    if(cats[cat].length === 0) return;
    html += `<tr><td colspan="7" class="bg-blue" style="border-top:2px solid #000">${cat}</td></tr>`;
    
    if(cat === 'CORE MATERIAL') {
       html += `<tr class="bg-green"><td colspan="2">BOARD TYPE & SPECS</td><td>QTY</td><td>REMARK</td><td>STORE</td><td colspan="2">PURCHASE ACTION</td></tr>`;
    } else if(cat === 'SURFACE') {
       html += `<tr class="bg-green"><td>BRAND NAME</td><td colspan="2">SURFACE NAME & THICKNESS</td><td>QTY</td><td>REMARK</td><td>STORE CHECKPOINT</td><td>PURCHASE ACTION</td></tr>`;
    } else if(cat === 'EDGEBAND') {
       html += `<tr class="bg-green"><td>BRAND NAME</td><td colspan="2">EDGEBAND NAME & SIZE</td><td>QTY</td><td>REMARK</td><td>STORE</td><td>PURCHASE ACTION</td></tr>`;
    } else {
       html += `<tr class="bg-green"><td>BRAND NAME</td><td colspan="2">ITEMS & PARTICULAR</td><td>QTY</td><td>REMARK</td><td>STORE</td><td>PURCHASE ACTION</td></tr>`;
    }

    cats[cat].forEach(b => {
      const sColor = b.status==='available'?'#4caf78':b.status==='in_purchase'?'#e8a030':b.status==='issued'?'#3db8a0':'#e05555';
      let h='--';
      if(isAuth && b.status==='pending') {
          h=`<button class="btn btn-sm btn-amber mb-1" style="font-size:10px;padding:2px 4px" onclick="updMatStat('${card.id}','${b.id}','in_purchase')">Order</button> <button class="btn btn-sm btn-teal" style="font-size:10px;padding:2px 4px" onclick="issueBomItem('${card.id}','${b.id}','${b.material}',${b.qty})">Issue</button>`;
      }
      else if(isAuth && b.status==='in_purchase') h=`<button class="btn btn-sm btn-success" style="font-size:10px;padding:2px 4px" onclick="updMatStat('${card.id}','${b.id}','available')">GRN</button>`;
      else if(isAuth && b.status==='available') h=`<button class="btn btn-sm btn-teal" style="font-size:10px;padding:2px 4px" onclick="issueBomItem('${card.id}','${b.id}','${b.material}',${b.qty})">Issue</button>`;
      
      const storeBadge = `<span class="badge" style="background:${sColor};font-size:0.6rem">${b.status}</span>`;

      if(cat === 'CORE MATERIAL') {
        html += `<tr><td colspan="2"><b>${b.brand ? b.brand+' ' : ''}</b>${b.material}</td><td><b>${b.qty}</b> ${b.unit}</td><td style="font-size:0.65rem">${b.remark||''}</td><td>${storeBadge}</td><td colspan="2">${h}</td></tr>`;
      } else {
        html += `<tr><td><b>${b.brand||''}</b></td><td colspan="2"><b>${b.material}</b></td><td><b>${b.qty}</b> ${b.unit}</td><td style="font-size:0.65rem">${b.remark||''}</td><td>${storeBadge}</td><td>${h}</td></tr>`;
      }
    });
  });
  html += `</table></div>`;

  if(!card.bom || card.bom.length===0) html = '<div class="empty-state">No BOM items found.</div>';
  $('jbd-content').innerHTML = html;

  $('jbd-btn-pdf').onclick = () => {
      let w=window.open('','_blank');
      let ph=`<html><head><title>BOM - ${card.projectName}</title><style>
        body{font-family:Arial,sans-serif;padding:20px;}
        .bom-excel { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; text-align: center; }
        .bom-excel th, .bom-excel td { border: 1.5px solid #000; padding: 4px; }
        .bom-excel .bg-blue { background: #b4c6e7; font-weight: 800; color: #000; font-size: 13px; }
        .bom-excel .bg-green { background: #c6e0b4; font-weight: 800; color: #000; font-size: 11px; }
        .bom-excel td b { font-weight: 800; }
      </style></head><body>`;
      
      let tableHtml = `<table class="bom-excel">
        <tr><td colspan="7" class="bg-blue">B.O.M (BILL OF MATERIAL)</td></tr>
        <tr class="bg-green"><td colspan="5">ORDER NAME</td><td>JOB CARD</td><td>JOB CARD RECEIVE</td></tr>
        <tr><td colspan="5"><b>${card.projectName||'--'}</b></td><td><b>${card.id}</b><br><span style="font-size:10px;color:#c9963a;font-weight:600">Art No: ${card.artNo||'--'}</span></td><td><b>${card.createdAt ? new Date(card.createdAt).toLocaleDateString('en-GB') : '--'}</b></td></tr>
        <tr class="bg-green"><td colspan="4">BOM GENERATE DATE</td><td><b>${tDate}</b></td><td>PO Date</td><td><b>${card.poDate||'--'}</b></td></tr>`;

      Object.keys(cats).forEach(cat => {
        if(cats[cat].length === 0) return;
        tableHtml += `<tr><td colspan="7" class="bg-blue" style="border-top:2px solid #000">${cat}</td></tr>`;
        
        if(cat === 'CORE MATERIAL') tableHtml += `<tr class="bg-green"><td colspan="2">BOARD TYPE & SPECS</td><td>QTY</td><td>REMARK</td><td>STORE</td><td colspan="2">PURCHASE ACTION</td></tr>`;
        else if(cat === 'SURFACE') tableHtml += `<tr class="bg-green"><td>BRAND NAME</td><td colspan="2">SURFACE NAME & THICKNESS</td><td>QTY</td><td>REMARK</td><td>STORE CHECKPOINT</td><td>PURCHASE ACTION</td></tr>`;
        else if(cat === 'EDGEBAND') tableHtml += `<tr class="bg-green"><td>BRAND NAME</td><td colspan="2">EDGEBAND NAME & SIZE</td><td>QTY</td><td>REMARK</td><td>STORE</td><td>PURCHASE ACTION</td></tr>`;
        else tableHtml += `<tr class="bg-green"><td>BRAND NAME</td><td colspan="2">ITEMS & PARTICULAR</td><td>QTY</td><td>REMARK</td><td>STORE</td><td>PURCHASE ACTION</td></tr>`;

        cats[cat].forEach(b => {
          if(cat === 'CORE MATERIAL') {
            tableHtml += `<tr><td colspan="2"><b>${b.brand ? b.brand+' ' : ''}</b>${b.material}</td><td><b>${b.qty}</b> ${b.unit}</td><td>${b.remark||''}</td><td>${b.status}</td><td colspan="2">--</td></tr>`;
          } else {
            tableHtml += `<tr><td><b>${b.brand||''}</b></td><td colspan="2"><b>${b.material}</b></td><td><b>${b.qty}</b> ${b.unit}</td><td>${b.remark||''}</td><td>${b.status}</td><td>--</td></tr>`;
          }
        });
      });
      tableHtml += `</table>`;
      ph += tableHtml + `</body></html>`;
      w.document.write(ph);w.document.close();w.print();
  };

  $('jbd-btn-excel').onclick = () => {
      let csv = `B.O.M (BILL OF MATERIAL)\n`;
      csv += `ORDER NAME,,,,,JOB CARD,JOB CARD RECEIVE\n`;
      csv += `"${card.projectName||'--'}",,,,,"${card.id}","${card.createdAt ? new Date(card.createdAt).toLocaleDateString('en-GB') : '--'}"\n`;
      csv += `BOM GENERATE DATE,,,,${tDate},PO Date,${card.poDate||'--'}\n\n`;

      Object.keys(cats).forEach(cat => {
        if(cats[cat].length === 0) return;
        csv += `${cat}\n`;
        if(cat === 'CORE MATERIAL') csv += 'BOARD TYPE & SPECS,,QTY,REMARK,STORE,PURCHASE ACTION\n';
        else if(cat === 'SURFACE') csv += 'BRAND NAME,SURFACE NAME & THICKNESS,,QTY,REMARK,STORE CHECKPOINT,PURCHASE ACTION\n';
        else if(cat === 'EDGEBAND') csv += 'BRAND NAME,EDGEBAND NAME & SIZE,,QTY,REMARK,STORE,PURCHASE ACTION\n';
        else csv += 'BRAND NAME,ITEMS & PARTICULAR,,QTY,REMARK,STORE,PURCHASE ACTION\n';
        
        cats[cat].forEach(b => {
          let bName = b.brand ? b.brand : '';
          if(cat === 'CORE MATERIAL') {
             csv += `"${bName} ${b.material}",,"${b.qty} ${b.unit}","${b.remark||''}","${b.status}",""\n`;
          } else {
             csv += `"${bName}","${b.material}",,"${b.qty} ${b.unit}","${b.remark||''}","${b.status}",""\n`;
          }
        });
        csv += '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `BOM_${card.id}.csv`;
      a.click();
  };
};

document.addEventListener('DOMContentLoaded',()=>{
  if(!localStorage.getItem('FF_Cards'))localStorage.setItem('FF_Cards','[]');

  // Initialize active default users with password 1234
  const defaultUsers = [
    { id: "U-1", username: "admin", password: "1234", role: "Admin" },
    { id: "U-2", username: "pc", password: "1234", role: "Project Coordinator" },
    { id: "U-3", username: "design", password: "1234", role: "Design Head" },
    { id: "U-4", username: "production", password: "1234", role: "Production Head" },
    { id: "U-5", username: "purchase", password: "1234", role: "Purchase Head" },
    { id: "U-6", username: "store", password: "1234", role: "Store" },
    { id: "U-13", username: "swcarpentry", password: "1234", role: "SW Carpentry" },
    { id: "U-14", username: "upholstery", password: "1234", role: "Upholstery" }
  ];

  let currentUsers = JSON.parse(localStorage.getItem('FF_Users') || '[]');
  
  // Filter out any users with deprecated roles
  const validRoles = ["Admin", "Project Coordinator", "Design Head", "Production Head", "Purchase Head", "Store", "SW Carpentry", "Upholstery"];
  currentUsers = currentUsers.filter(u => validRoles.includes(u.role));

  defaultUsers.forEach(defUser => {
    let match = currentUsers.find(u => u.username.toLowerCase() === defUser.username.toLowerCase());
    if (match) {
      match.password = "1234";
      match.role = defUser.role;
    } else {
      currentUsers.push(defUser);
    }
  });
  localStorage.setItem('FF_Users', JSON.stringify(currentUsers));
  initGoogleSync();

  $('bottom-nav').addEventListener('click',e=>{const item=e.target.closest('.nav-item');if(item){e.preventDefault();navigate(item.dataset.target);}});
  navigate('login');
});

