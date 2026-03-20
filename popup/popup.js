// Ajax Interceptor Pro - Popup Script
let groups = [], currentGroupId = 'all', globalEnabled = true, editingGroupId = null, editingRuleId = null, importData = null, confirmCallback = null, hitCounts = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  if (typeof chrome === 'undefined') return;
  const hd = await chrome.storage.local.get(['hitCounts']);
  hitCounts = hd.hitCounts || {};
  await loadData();
  renderSidebar();
  renderRules();
  setupEventListeners();
}

async function loadData() {
  try {
    const d = await chrome.storage.local.get(['groups', 'globalEnabled']);
    groups = d.groups || [{ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] }];
    globalEnabled = d.globalEnabled !== false;
    const gt = document.getElementById('globalToggle');
    if (gt) gt.checked = globalEnabled;
  } catch(e) { groups = [{ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] }]; }
}

async function saveData() {
  try { await chrome.storage.local.set({ groups, globalEnabled, hitCounts }); } catch(e) {}
}

function genId() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }

// SVG Icons
const ICONS = {
  folder: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
  folder_open: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>',
  add: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>',
  touch_app: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/></svg>',
  data_object: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 7v2c0 .55-.45 1-1 1s-1 .45-1 1v2c0 .55.45 1 1 1s1 .45 1 1v2c0 1.66 1.34 3 3 3h2c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1-.45-1-1v-2c0-1.3-.84-2.42-2-2.83v-.34C5.16 11.42 6 10.3 6 9V7c0-.55.45-1 1-1h2c.55 0 1-.45 1-1s-.45-1-1-1H7C5.34 4 4 5.34 4 7zm17 3c0-.55-.45-1-1-1s-1 .45-1 1v2c0 1.3.84 2.42 2 2.83v.34c-1.16.41-2 1.52-2 2.83v2c0 .55-.45 1-1 1h-2c-.55 0-1 .45-1 1s.45 1 1 1h2c1.66 0 3-1.34 3-3v-2c0-.55.45-1 1-1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1-.45-1-1V10z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.16 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
};

function icon(name) { return ICONS[name] || ICONS.folder; }

function esc(t) { if(!t)return''; const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }

function renderSidebar() {
  const el = document.getElementById('groupList'); if(!el) return; el.innerHTML = '';
  const total = groups.reduce((s,g)=>s+(g.rules?.length||0),0);
  el.appendChild(createItem('all','folder','全部',total,true,false));
  [...groups].sort((a,b)=>(a.order||0)-(b.order||0)).forEach(g=>{ if(g.id==='default')return; el.appendChild(createItem(g.id,'folder',g.name,g.rules?.length||0,g.enabled,true)); });
  const def = groups.find(g=>g.id==='default'); if(def) el.appendChild(createItem('default','folder_open','未分组',def.rules?.length||0,def.enabled,true));
}

function createItem(id,icn,name,count,en,showToggle) {
  const d = document.createElement('div'); d.className='group-item '+(currentGroupId===id?'active':''); d.dataset.groupId=id; d.draggable=id!=='all';
  d.innerHTML = `<span class="g-icon">${icon(icn)}</span><span class="g-name">${esc(name)}</span><span class="g-count">${count}</span>`+(showToggle?`<label class="toggle-btn ${en?'on':'off'}" onclick="event.stopPropagation()"><input type="checkbox" ${en?'checked':''} data-gid="${id}"><span class="toggle-track"><span class="toggle-knob"></span></span></label>`:'');
  d.onclick = e => { if(!e.target.closest('.toggle-btn')){ currentGroupId=id; renderSidebar(); renderRules(); } };
  const tgl = d.querySelector('input'); if(tgl){ tgl.onchange = async e => { e.stopPropagation(); const g=groups.find(g=>g.id===id); if(g){ g.enabled=e.target.checked; await saveData(); renderRules(); }}; }
  if(id!=='all') d.oncontextmenu = e => { e.preventDefault(); showMenu(e,id); };
  return d;
}

function renderRules() {
  const el = document.getElementById('ruleList'); if(!el) return;
  const srch = document.getElementById('searchInput')?.value.toLowerCase()||'';
  let rules=[], gname='全部规则';
  if(currentGroupId==='all'){ groups.forEach(g=>{ (g.rules||[]).forEach(r=>rules.push({...r,gid:g.id,gname:g.name})); }); }
  else{ const g=groups.find(g=>g.id===currentGroupId); if(g){ gname=g.name; rules=(g.rules||[]).map(r=>({...r,gid:g.id,gname:g.name})); }}
  if(srch) rules = rules.filter(r=>r.urlPattern?.toLowerCase().includes(srch)||r.response?.toLowerCase().includes(srch));
  document.getElementById('currentGroupName').textContent = gname;
  document.getElementById('ruleCount').textContent = rules.length+' 条规则';
  if(rules.length===0){ el.innerHTML = `<div class="empty"><div class="e-ico">${icon('code')}</div><h3>${srch?'未找到匹配规则':'暂无规则'}</h3><p>${srch?'尝试其他关键词':'点击下方添加规则'}</p>${!srch?'<button class="btn pri" id="emptyAdd">'+icon('add')+' 添加规则</button>':''}</div>`; document.getElementById('emptyAdd')?.onclick=()=>openRuleModal(); return; }
  if(currentGroupId==='all'){
    const grp={}; rules.forEach(r=>{ if(!grp[r.gid])grp[r.gid]=[]; grp[r.gid].push(r); });
    el.innerHTML = ''; Object.entries(grp).forEach(([gid,rs])=>{ const g=groups.find(x=>x.id===gid); if(!g)return;
      const card = document.createElement('div'); card.className='rule-card';
      card.innerHTML = `<div class="rc-head"><div class="rc-title">${icon('folder')} ${esc(g.name)}</div><label class="toggle-btn sm ${g.enabled?'on':'off'}"><input type="checkbox" ${g.enabled?'checked':''} data-gid2="${gid}"><span class="toggle-track"><span class="toggle-knob"></span></span></label></div><div class="rc-items" data-gid="${gid}">${rs.map(r=>ruleHTML(r,g)).join('')}</div>`;
      card.querySelector('input[data-gid2]').onchange = async e => { g.enabled=e.target.checked; await saveData(); renderRules(); };
      el.appendChild(card);
    });
  }else{ const g=groups.find(x=>x.id===currentGroupId); el.innerHTML = `<div class="rule-card"><div class="rc-items" data-gid="${currentGroupId}">${rules.map(r=>ruleHTML(r,g)).join('')}</div></div>`; }
  setupRuleListeners();
}

function ruleHTML(r,g) {
  const dis = !g.enabled||!r.enabled;
  const hit = hitCounts[r.id]||0;
  const hasHit = hit>0;
  return `<div class="rule-item ${dis?'disabled':''} ${hasHit?'hit':''}" data-rid="${r.id}" draggable="true">
    <div class="hit-badge" title="命中${hit}次">${hasHit?'<b>'+hit+'</b>'+icon('touch_app'):icon('touch_app')}</div>
    <label class="toggle-btn sm ${r.enabled?'on':'off'}" onclick="event.stopPropagation()"><input type="checkbox" ${r.enabled?'checked':''} data-rid2="${r.id}"><span class="toggle-track"><span class="toggle-knob"></span></span></label>
    <div class="r-content"><div class="r-head"><span class="rmethod ${r.method?.toLowerCase()||'get'}">${r.method||'GET'}</span><span class="rurl">${esc(r.urlPattern)}</span></div><div class="r-meta">${icon('data_object')} ${esc(r.response?.substring(0,50)||'无数据')}</div></div>
    <div class="r-actions"><button class="ab edit" data-rid3="${r.id}">${icon('edit')}</button><button class="ab del" data-rid4="${r.id}">${icon('delete')}</button></div></div>`;
}

function setupRuleListeners() {
  document.querySelectorAll('.rule-item input[data-rid2]').forEach(cb=>{ cb.onchange = async e => { const rg=groups.find(g=>g.rules?.some(r=>r.id===e.target.dataset.rid2)); if(rg){ const rl=rg.rules.find(r=>r.id===e.target.dataset.rid2); if(rl){ rl.enabled=e.target.checked; await saveData(); renderRules(); }}}); });
  document.querySelectorAll('.edit').forEach(b=>{ b.onclick = e => { openRuleModal(e.currentTarget.dataset.rid3); }; });
  document.querySelectorAll('.del').forEach(b=>{ b.onclick = e => { const rid=e.currentTarget.dataset.rid4; showConfirm('删除规则','确定删除?',async()=>{ groups.forEach(g=>{ if(g.rules)g.rules=g.rules.filter(r=>r.id!==rid); }); delete hitCounts[rid]; await saveData(); renderSidebar(); renderRules(); showToast('已删除'); }); }; });
  document.querySelectorAll('.rule-item').forEach(it=>{ it.ondragstart=e=>{ e.dataTransfer.setData('rid',it.dataset.rid); it.style.opacity='0.5'; }; it.ondragend=e=>{ it.style.opacity='1'; }; });
  document.querySelectorAll('.rc-items').forEach(ct=>{ ct.ondragover=e=>e.preventDefault(); ct.ondrop=async e=>{ e.preventDefault(); const rid=e.dataTransfer.getData('rid'), tgt=ct.dataset.gid; if(!rid||!tgt)return; let rl=null; groups.forEach(g=>{ const i=g.rules?.findIndex(r=>r.id===rid); if(i!==undefined&&i>-1){ rl=g.rules[i]; g.rules.splice(i,1); }}); if(rl){ const tg=groups.find(g=>g.id===tgt); if(tg){ if(!tg.rules)tg.rules=[]; tg.rules.push(rl); await saveData(); renderSidebar(); renderRules(); showToast('已移动'); }}}); });
}

function setupEventListeners() {
  document.getElementById('globalToggle').onchange = async e => { globalEnabled=e.target.checked; await saveData(); showToast(globalEnabled?'已启用':'已禁用'); };
  document.getElementById('newGroupBtn').onclick = () => { editingGroupId=null; document.getElementById('groupModalTitle').textContent='新建分组'; document.getElementById('groupNameInput').value=''; openM('groupModal'); };
  document.getElementById('saveGroupBtn').onclick = async () => { const n=document.getElementById('groupNameInput').value.trim(); if(!n){showToast('请输入名称');return;} if(editingGroupId){ const g=groups.find(g=>g.id===editingGroupId); if(g)g.name=n; }else{ groups.push({id:genId(),name:n,enabled:true,order:groups.length,rules:[]}); } await saveData(); renderSidebar(); closeM('groupModal'); showToast(editingGroupId?'已更新':'已创建'); };
  document.getElementById('newRuleBtn').onclick = () => openRuleModal();
  document.getElementById('saveRuleBtn').onclick = async () => { const url=document.getElementById('ruleUrl').value.trim(); if(!url){showToast('请输入URL');return;} const gid=document.getElementById('ruleGroup').value; const g=groups.find(x=>x.id===gid); if(!g){showToast('请选择分组');return;} if(editingRuleId){ groups.forEach(x=>{if(x.rules)x.rules=x.rules.filter(r=>r.id!==editingRuleId);}); } const rule={id:editingRuleId||genId(),method:document.getElementById('ruleMethod').value,urlPattern:url,response:document.getElementById('ruleResponse').value,status:parseInt(document.getElementById('ruleStatus').value)||200,enabled:document.getElementById('ruleEnabled').checked,order:(g.rules?.length||0)}; if(!g.rules)g.rules=[]; g.rules.push(rule); await saveData(); renderSidebar(); renderRules(); closeM('ruleModal'); showToast(editingRuleId?'已更新':'已创建'); };
  document.getElementById('searchInput').oninput = renderRules;
  document.getElementById('exportBtn').onclick = () => { renderExportList(); openM('exportModal'); };
  document.getElementById('confirmExportBtn').onclick = doExport;
  document.querySelectorAll('input[name="exportScope"]').forEach(r=>{ r.onchange = e => { document.getElementById('exportGroupList').style.display=e.target.value==='selected'?'block':'none'; }; });
  document.getElementById('importBtn').onclick = () => { importData=null; document.getElementById('confirmImportBtn').disabled=true; openM('importModal'); };
  document.getElementById('fileDropZone').onclick = () => document.getElementById('importFile').click();
  document.getElementById('importFile').onchange = e => { if(e.target.files[0])handleImport(e.target.files[0]); };
  document.getElementById('confirmImportBtn').onclick = doImport;
  document.querySelectorAll('.modal-overlay').forEach(o=>{ o.onclick = e => { const m=e.target.closest('.modal'); if(m)closeM(m.id); }; });
  document.getElementById('confirmActionBtn').onclick = () => { if(confirmCallback){confirmCallback();confirmCallback=null;} closeM('confirmModal'); };
}

function openRuleModal(rid=null) {
  editingRuleId=rid; document.getElementById('ruleModalTitle').textContent=rid?'编辑规则':'添加规则';
  document.getElementById('ruleGroup').innerHTML = groups.filter(g=>g.id!=='all').map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
  if(rid){ let rl=null,gid=null; groups.forEach(g=>{ const f=g.rules?.find(r=>r.id===rid); if(f){rl=f;gid=g.id;}}); if(rl){ document.getElementById('ruleMethod').value=rl.method||'GET'; document.getElementById('ruleUrl').value=rl.urlPattern||''; document.getElementById('ruleGroup').value=gid||currentGroupId; document.getElementById('ruleResponse').value=rl.response||''; document.getElementById('ruleStatus').value=rl.status||200; document.getElementById('ruleEnabled').checked=rl.enabled!==false; }}else{ document.getElementById('ruleMethod').value='GET'; document.getElementById('ruleUrl').value=''; document.getElementById('ruleGroup').value=currentGroupId==='all'?'default':currentGroupId; document.getElementById('ruleResponse').value=''; document.getElementById('ruleStatus').value=200; document.getElementById('ruleEnabled').checked=true; }
  openM('ruleModal');
}

function showMenu(e,gid) {
  document.querySelectorAll('.ctx-menu').forEach(m=>m.remove());
  const m=document.createElement('div'); m.className='ctx-menu'; m.style.cssText='position:fixed;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:1000;';
  m.innerHTML = `<div class="mi" data-action="rename">${icon('edit')} 重命名</div><div class="mi" data-action="export">${icon('download')} 导出</div><div class="mi" data-action="delete" style="color:#ea4335">${icon('delete')} 删除</div>`;
  m.style.left=e.clientX+'px'; m.style.top=e.clientY+'px'; document.body.appendChild(m);
  m.querySelectorAll('.mi').forEach(i=>{ i.style.cssText='padding:8px 16px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:8px;'; i.onmouseenter=()=>i.style.background='#f5f5f5'; i.onmouseleave=()=>i.style.background='transparent'; i.onclick=async()=>{ m.remove(); const act=i.dataset.action;
    if(act==='rename'){ const g=groups.find(x=>x.id===gid); if(g){editingGroupId=gid;document.getElementById('groupModalTitle').textContent='重命名分组';document.getElementById('groupNameInput').value=g.name;openM('groupModal');}}
    else if(act==='export'){ const g=groups.find(x=>x.id===gid); if(g){const d={version:'2.0',exportTime:new Date().toISOString(),groups:[{id:g.id,name:g.name,enabled:g.enabled,order:g.order,rules:g.rules||[]}]}; const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const u=URL.createObjectURL(b); const a=document.createElement('a');a.href=u;a.download='ajax-interceptor-'+g.name+'.json';a.click();URL.revokeObjectURL(u);showToast('已导出');}}
    else if(act==='delete'){ showConfirm('删除分组','规则将移至未分组',async()=>{ const g=groups.find(x=>x.id===gid); if(g?.rules?.length){ const def=groups.find(x=>x.id==='default'); if(def)def.rules=[...(def.rules||[]),...g.rules]; } groups=groups.filter(x=>x.id!==gid); if(currentGroupId===gid)currentGroupId='all'; await saveData(); renderSidebar(); renderRules(); showToast('已删除'); }); }
  }); setTimeout(()=>document.addEventListener('click',()=>m.remove()),0);
}

function renderExportList(){ document.getElementById('exportGroupList').innerHTML=groups.filter(g=>g.id!=='all').map(g=>`<label><input type="checkbox" value="${g.id}" checked>${esc(g.name)}(${g.rules?.length||0})</label>`).join(''); }

async function doExport() {
  const scope = document.querySelector('input[name="exportScope"]:checked').value;
  let exp=[];
  if(scope==='all')exp=groups.filter(g=>g.id!=='all');
  else if(scope==='current')exp=currentGroupId==='all'?groups.filter(g=>g.id!=='all'):[groups.find(g=>g.id===currentGroupId)].filter(Boolean);
  else{ const sel=[...document.querySelectorAll('#exportGroupList input:checked')].map(i=>i.value); exp=groups.filter(g=>sel.includes(g.id)); }
  const d={version:'2.0',exportTime:new Date().toISOString(),groups:exp.map(g=>({id:g.id,name:g.name,enabled:g.enabled,order:g.order,rules:g.rules||[]}))};
  const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='ajax-interceptor-backup.json';a.click();
  closeM('exportModal'); showToast('导出成功');
}

function handleImport(f){ const r=new FileReader(); r.onload=e=>{ try{importData=JSON.parse(e.target.result);if(!importData.groups)throw new Error();document.getElementById('confirmImportBtn').disabled=false;showToast('已选择: '+f.name);}catch(){showToast('格式错误');importData=null;}}; r.readAsText(f); }

async function doImport(){
  if(!importData)return;
  const st = document.querySelector('input[name="importStrategy"]:checked').value;
  if(st==='overwrite'){ groups=importData.groups; if(!groups.find(g=>g.id==='default'))groups.push({id:'default',name:'未分组',enabled:true,order:999,rules:[]}); }
  else{ importData.groups.forEach(ig=>{ const eg=groups.find(g=>g.name===ig.name); if(eg){ if(st==='merge'){ ig.rules?.forEach(ir=>{ if(!eg.rules?.find(r=>r.urlPattern===ir.urlPattern&&r.method===ir.method)){ if(!eg.rules)eg.rules=[]; eg.rules.push({...ir,id:genId()}); } }); } }else{ groups.push({...ig,id:genId()}); }}); }
  await saveData(); renderSidebar(); renderRules(); closeM('importModal'); showToast('导入成功');
}

function showConfirm(txt,msg,cb){ document.getElementById('confirmTitle').textContent=txt; document.getElementById('confirmMessage').textContent=msg; confirmCallback=cb; openM('confirmModal'); }
function showToast(msg){ const t=document.getElementById('toast'); document.getElementById('toastMessage').textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',2000); }
window.openM = function(id){ document.getElementById(id).style.display='flex'; };
window.closeM = function(id){ document.getElementById(id).style.display='none'; };
