/**
 * YorStatus India Enterprise — Frontend App v2.0
 * Socket.IO live updates + Auth + Compare + 10 pages
 */

/* ── 3D BG ── */
(function(){
  const c=document.getElementById('bg3d');
  if(!c||!window.THREE)return;
  const R=THREE,scene=new R.Scene(),cam=new R.PerspectiveCamera(60,innerWidth/innerHeight,.1,1000);
  const renderer=new R.WebGLRenderer({canvas:c,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));cam.position.z=50;
  function rsz(){renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();}
  rsz();window.addEventListener('resize',rsz);
  const N=1600,pos=new Float32Array(N*3),col=new Float32Array(N*3);
  for(let i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*160;pos[i*3+1]=(Math.random()-.5)*100;pos[i*3+2]=(Math.random()-.5)*80;const t=Math.random();if(t<.4){col[i*3]=1;col[i*3+1]=.84;col[i*3+2]=0;}else if(t<.7){col[i*3]=0;col[i*3+1]=.78;col[i*3+2]=1;}else{col[i*3]=.08;col[i*3+1]=.1;col[i*3+2]=.18;}}
  const geo=new R.BufferGeometry();geo.setAttribute('position',new R.BufferAttribute(pos,3));geo.setAttribute('color',new R.BufferAttribute(col,3));
  const pts=new R.Points(geo,new R.PointsMaterial({size:.32,vertexColors:true,transparent:true,opacity:.5,blending:R.AdditiveBlending,depthWrite:false}));scene.add(pts);
  const shapes=[];const geos=[new R.OctahedronGeometry(3),new R.TetrahedronGeometry(2.5),new R.IcosahedronGeometry(2)];const mats=[new R.MeshBasicMaterial({color:0xFFD700,wireframe:true,transparent:true,opacity:.05}),new R.MeshBasicMaterial({color:0x00C8FF,wireframe:true,transparent:true,opacity:.04})];
  for(let i=0;i<7;i++){const m=new R.Mesh(geos[i%3],mats[i%2]);m.position.set((Math.random()-.5)*90,(Math.random()-.5)*55,(Math.random()-.5)*30-15);m.userData={rx:(Math.random()-.5)*.004,ry:(Math.random()-.5)*.006};scene.add(m);shapes.push(m);}
  let mx=0,my=0;window.addEventListener('mousemove',e=>{mx=(e.clientX/innerWidth-.5)*.25;my=(e.clientY/innerHeight-.5)*.18;});
  (function tick(){requestAnimationFrame(tick);pts.rotation.y+=.0003;pts.rotation.x+=.0001;shapes.forEach(s=>{s.rotation.x+=s.userData.rx;s.rotation.y+=s.userData.ry;});cam.position.x+=(mx*8-cam.position.x)*.04;cam.position.y+=(-my*5-cam.position.y)*.04;renderer.render(scene,cam);})();
})();

/* ── SOCKET.IO ── */
let socket;
function initSocket(){
  if(!window.io)return;
  socket=io({auth:{token:AUTH_TOKEN||''}});
  socket.on('notification',(n)=>{showToast('🔔 '+n.title,'info');updateNotifBadge();});
  socket.on('rating:update',(d)=>{document.querySelectorAll(`.rating-live-${d.politician_id}`).forEach(el=>{el.textContent=d.avg_stars?`${d.avg_stars}★ (${d.total})`:'—';});});
  socket.on('comment:new',(c)=>{const box=document.getElementById(`comments-live-${c.entity_type}-${c.entity_id}`);if(box){const d=document.createElement('div');d.innerHTML=commentHTML(c,true);box.prepend(d.firstChild);}});
  socket.on('poll:update',(d)=>{renderPollResults(d.id,d.options);});
}

/* ── STATE ── */
let curPage='dashboard',polTab='pm',apprTab='pm',stateSort='gdp',stateParty='';
let polParty='',polSearch='',legalFilters={status:'',category:'',severity:'',search:''};
let chatOpen=false,chatHist=[],searchOpen=false;
let compareList=[]; // [{id,name,twitter,initials,party}]
let _debounces={};function debounce(key,fn,ms=300){clearTimeout(_debounces[key]);_debounces[key]=setTimeout(fn,ms);}

/* ── CLOCK ── */
setInterval(()=>{
  const cl=document.getElementById('navclock');if(cl)cl.textContent=new Date().toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'medium'});
  document.querySelectorAll('.clk-v').forEach(el=>el.textContent=elapsedStr(el.dataset.ts));
  document.querySelectorAll('.mclk').forEach(el=>el.textContent=elapsedStr(el.dataset.ts));
},1000);
function elapsedStr(ts){const d=Math.floor((Date.now()-new Date(ts))/1000);return`${Math.floor(d/86400)}d ${Math.floor((d%86400)/3600)}h ${Math.floor((d%3600)/60)}m ${d%60}s`;}
function pctTerm(ts,te){const n=Date.now(),s=new Date(ts).getTime(),e=new Date(te).getTime();return Math.min(100,Math.max(0,Math.round((n-s)/(e-s)*100)));}
function fmtDate(d){return new Date(d).toLocaleDateString('en-IN',{month:'short',year:'numeric'});}
function fmtFull(d){return new Date(d).toLocaleDateString('en-IN',{dateStyle:'medium'});}
function badgeHTML(s){const m={done:'b-done ✓ Done',prog:'b-prog ⟳ Progress',pend:'b-pend ○ Pending',brok:'b-brok ✗ Broken'};const pts=(m[s]||'b-pend ○ Pending').split(' ');return`<span class="bdg ${pts[0]}">${pts.slice(1).join(' ')}</span>`;}
function impColor(v){return v>=75?'var(--green)':v>=55?'var(--gold)':v>=35?'var(--orange)':'var(--red)';}
function gdpColor(g){return g>=10?'var(--green)':g>=7?'var(--gold)':g>=5?'var(--orange)':'var(--red)';}
function starsStr(n,t=5){return Array.from({length:t},(_,i)=>i<Math.round(n)?'★':'☆').join('');}
function esc(s){if(!s)return'';const d=document.createElement('div');d.textContent=s;return d.innerHTML;}

/* ── TOAST ── */
function showToast(msg,type='success'){
  const t=document.getElementById('toast');
  const styles={success:'rgba(0,255,135,.14)|rgba(0,255,135,.28)|var(--green)',error:'rgba(255,68,102,.14)|rgba(255,68,102,.28)|var(--red)',info:'rgba(0,200,255,.14)|rgba(0,200,255,.28)|var(--blue)'};
  const[bg,br,color]=(styles[type]||styles.success).split('|');
  Object.assign(t.style,{background:bg,borderColor:br,color});
  t.textContent=msg;t.classList.remove('hidden');
  clearTimeout(t._to);t._to=setTimeout(()=>t.classList.add('hidden'),3500);
}

/* ── OVERLAYS ── */
function openOverlay(id){document.getElementById(id).classList.add('open');}
function closeOverlay(id,e){if(!e||e.target===document.getElementById(id))document.getElementById(id).classList.remove('open');}

/* ── NAV ── */
function goPage(pg,el){
  document.querySelectorAll('.pg').forEach(p=>p.classList.add('hidden'));
  const pgEl=document.getElementById('pg-'+pg);if(pgEl)pgEl.classList.remove('hidden');
  document.querySelectorAll('.nl').forEach(n=>n.classList.remove('active'));
  if(el)el.classList.add('active');
  curPage=pg;
  document.getElementById('navlinks')?.classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
  const loaders={dashboard:loadDashboard,politicians:loadPols,parties:loadParties,states:loadStates,approvals:loadApprovals,legal:loadLegalPage,news:loadNews,watchlist:loadWatchlist,compare:()=>renderComparePage(),admin:loadAdmin};
  if(loaders[pg])loaders[pg]();
  AnalyticsAPI.track('/'+pg);
  return false;
}
function toggleNav(){document.getElementById('navlinks')?.classList.toggle('open');}

/* ── USER NAV ── */
function renderUserNav(){
  const wrap=document.getElementById('user-nav-wrap');if(!wrap)return;
  if(isLoggedIn()){
    wrap.innerHTML=`
      <div class="user-menu-wrap">
        <button class="user-btn" onclick="toggleUserMenu()">
          <div class="user-avatar">${(CURRENT_USER.display_name||CURRENT_USER.username||'?')[0].toUpperCase()}</div>
          <span>${CURRENT_USER.display_name||CURRENT_USER.username}</span>
          <span id="notif-badge" class="ud-notif-badge" style="display:none">0</span>
        </button>
        <div class="user-dropdown" id="user-dropdown">
          <div class="ud-header"><div class="ud-name">${esc(CURRENT_USER.display_name||CURRENT_USER.username)}</div><div class="ud-role">${CURRENT_USER.role}</div></div>
          <a class="ud-item" href="#" onclick="openOverlay('notif-panel');toggleUserMenu()">🔔 Notifications</a>
          ${isLoggedIn()?`<a class="ud-item" href="#" onclick="goPage('watchlist',null);toggleUserMenu()">👁 Watchlist</a>`:''}
          ${isMod()?`<a class="ud-item" href="#" onclick="goPage('admin',null);toggleUserMenu()">⚙ Admin Panel</a>`:''}
          <a class="ud-item danger" href="#" onclick="doLogout()">↩ Sign Out</a>
        </div>
      </div>`;
    updateNotifBadge();
  } else {
    wrap.innerHTML=`<button class="user-btn" onclick="openOverlay('auth-overlay')" style="background:rgba(255,215,0,.1)">Sign In / Register</button>`;
  }
}
function toggleUserMenu(){document.getElementById('user-dropdown')?.classList.toggle('open');}
document.addEventListener('click',e=>{if(!e.target.closest('.user-menu-wrap'))document.getElementById('user-dropdown')?.classList.remove('open');});

async function updateNotifBadge(){
  if(!isLoggedIn())return;
  try{const r=await NotifsAPI.list();const n=r?.unread||0;const b=document.getElementById('notif-badge');if(b){b.textContent=n;b.style.display=n>0?'inline':'none';}renderNotifPanel(r?.data||[]);}catch(e){}
}
function renderNotifPanel(notifs){
  const p=document.getElementById('notif-panel-list');if(!p)return;
  if(!notifs.length){p.innerHTML='<div style="padding:1.5rem;text-align:center;color:var(--hin);font-size:.78rem">No notifications</div>';return;}
  p.innerHTML=notifs.map(n=>`<div class="notif-item ${n.is_read?'':'unread'}" onclick="readNotif(${n.id})"><div class="notif-title">${esc(n.title)}</div>${n.body?`<div class="notif-body">${esc(n.body)}</div>`:''}<div class="notif-time">${timeAgo(n.created_at)}</div></div>`).join('');
}
async function readNotif(id){await NotifsAPI.read(id);updateNotifBadge();}
async function markAllRead(){await NotifsAPI.readAll();updateNotifBadge();}

/* ── AUTH ── */
async function doLogin(){
  const email=document.getElementById('login-email').value;
  const pass=document.getElementById('login-pass').value;
  const errEl=document.getElementById('login-err');
  try{const r=await AuthAPI.login({email,password:pass});if(!r)return;setAuth(r.token,r.user);closeOverlay('auth-overlay');renderUserNav();initSocket();showToast(`Welcome back, ${r.user.display_name||r.user.username}!`);}
  catch(e){errEl.textContent=e.message;errEl.style.display='block';}
}
async function doRegister(){
  const username=document.getElementById('reg-username').value;
  const email=document.getElementById('reg-email').value;
  const pass=document.getElementById('reg-pass').value;
  const errEl=document.getElementById('reg-err');
  try{const r=await AuthAPI.register({username,email,password:pass});if(!r)return;setAuth(r.token,r.user);closeOverlay('auth-overlay');renderUserNav();initSocket();showToast(`Welcome to YorStatus, ${r.user.username}!`);}
  catch(e){errEl.textContent=e.message;errEl.style.display='block';}
}
function doLogout(){logout();renderUserNav();showToast('Signed out');socket?.disconnect();}
function switchAuthTab(t){document.querySelectorAll('.auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));document.getElementById('login-form').style.display=t==='login'?'block':'none';document.getElementById('reg-form').style.display=t==='register'?'block':'none';}

/* ── GLOBAL SEARCH ── */
async function openSearch(){searchOpen=true;document.getElementById('gsearch-overlay').classList.add('open');document.getElementById('gsearch-inp').focus();try{const t=await SearchAPI.trending();renderTrending(t);}catch(e){}}
function closeSearch(){searchOpen=false;document.getElementById('gsearch-overlay').classList.remove('open');}
function renderTrending(trends){
  const el=document.getElementById('gsearch-trending');if(!el)return;
  el.innerHTML=`<div class="gsearch-trend-label">Trending Searches</div><div class="trend-chips">${(trends||[]).map(t=>`<span class="trend-chip" onclick="runSearch(${JSON.stringify(t.query)})">${esc(t.query)}</span>`).join('')}</div>`;
}
async function runSearch(q){
  document.getElementById('gsearch-inp').value=q;
  debounce('search',async()=>{
    if(!q||q.length<2){document.getElementById('gsearch-results').innerHTML='';return;}
    const res=await SearchAPI.search(q).catch(()=>null);
    if(!res)return;
    const rEl=document.getElementById('gsearch-results');
    let html='';
    if(res.results.politicians?.length){html+=`<div class="gsearch-section">Politicians</div>`;html+=res.results.politicians.map(p=>`<div class="gsearch-item" onclick="openPolModal(${p.id});closeSearch()"><div class="gsearch-item-photo"><img src="${imgUrl(p.twitter)}" onerror="this.src=''" alt="${p.name}"></div><div><div class="gsearch-item-name">${esc(p.name)}</div><div class="gsearch-item-sub">${esc(p.role)} · ${esc(p.state)}</div></div></div>`).join('');}
    if(res.results.states?.length){html+=`<div class="gsearch-section">States</div>`;html+=res.results.states.map(s=>`<div class="gsearch-item" onclick="openStateModal('${esc(s.name)}');closeSearch()"><div style="width:30px;height:30px;border-radius:50%;background:${pc(s.party)}22;border:1px solid ${pc(s.party)}44;display:flex;align-items:center;justify-content:center;font-size:.6rem;color:${pc(s.party)};flex-shrink:0">#${s.rank_gdp}</div><div><div class="gsearch-item-name">${esc(s.name)}</div><div class="gsearch-item-sub">${esc(s.party)} · ${s.gdp_growth}% GDP</div></div></div>`).join('');}
    if(res.results.news?.length){html+=`<div class="gsearch-section">News</div>`;html+=res.results.news.map(n=>`<a class="gsearch-item" href="${n.source_url||'#'}" target="_blank" rel="noopener" onclick="closeSearch()"><div style="font-size:1.2rem">📰</div><div><div class="gsearch-item-name" style="font-size:.78rem">${esc(n.headline)}</div><div class="gsearch-item-sub">${n.source_name||''} · ${timeAgo(n.published_at)}</div></div></a>`).join('');}
    if(!html)html=`<div class="gsearch-empty">No results for "${esc(q)}"</div>`;
    rEl.innerHTML=html;
  },200);
}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openSearch();}if(e.key==='Escape'){closeSearch();}});

/* ── COMPARE TRAY ── */
function addToCompare(pol){
  if(compareList.find(p=>p.id===pol.id)){showToast('Already in compare list','info');return;}
  if(compareList.length>=4){showToast('Max 4 politicians to compare','error');return;}
  compareList.push(pol);renderCompareTray();showToast(`${pol.name} added to compare`);
}
function removeFromCompare(id){compareList=compareList.filter(p=>p.id!==id);renderCompareTray();}
function clearCompare(){compareList=[];renderCompareTray();}
function renderCompareTray(){
  const tray=document.getElementById('compare-tray');if(!tray)return;
  tray.classList.toggle('open',compareList.length>0);
  const slots=document.getElementById('compare-slots');
  if(!slots)return;
  const shown=compareList.slice(0,4);const empty=4-shown.length;
  slots.innerHTML=shown.map(p=>`<div class="compare-slot filled"><img src="${imgUrl(p.twitter)}" onerror="this.src=''" alt="${p.name}"><button class="remove-btn" onclick="removeFromCompare(${p.id})">✕</button></div>`).join('')+Array(empty).fill('<div class="compare-slot">+</div>').join('');
}
async function goCompare(){
  if(compareList.length<2){showToast('Add at least 2 politicians to compare','error');return;}
  goPage('compare',null);
}
async function renderComparePage(){
  const pgEl=document.getElementById('pg-compare');if(!pgEl)return;
  if(compareList.length<2){pgEl.innerHTML=`<div class="pg-hdr"><h1 class="pg-title">Compare Politicians</h1><p class="pg-sub">Add 2-4 politicians from the Politicians page to compare them side by side.</p></div><div style="padding:4rem;text-align:center;color:var(--hin);font-family:'JetBrains Mono',monospace">No politicians selected. Go to <a href="#" onclick="goPage('politicians',null)" style="color:var(--gold)">Politicians</a> and use the Compare button.</div>`;return;}
  pgEl.innerHTML='<div class="pg-hdr"><h1 class="pg-title">Compare Politicians</h1></div><div style="padding:2rem;color:var(--mut);font-family:\'JetBrains Mono\',monospace">Loading comparison…</div>';
  try{
    const res=await CompareAPI.get(compareList.map(p=>p.id));
    const data=res.data;
    const cols=data.length;
    const gridStyle=`grid-template-columns:200px repeat(${cols},1fr)`;
    const metrics=[
      {label:'Party',fn:p=>`<span style="color:${pc(p.party)};font-weight:600">${p.party}</span>`},
      {label:'Role',fn:p=>esc(p.role)},
      {label:'State/Centre',fn:p=>esc(p.state)},
      {label:'Term Progress',fn:p=>{const pct=pctTerm(p.term_start,p.term_end);return`<div style="height:6px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden;margin:2px 0"><div style="height:100%;width:${pct}%;background:var(--gold);border-radius:3px"></div></div><div style="font-size:.65rem;color:var(--mut);font-family:'JetBrains Mono',monospace;margin-top:2px">${pct}%</div>`;}},
      {label:'Promises Done',fn:p=>`<span style="color:var(--green);font-family:'Bebas Neue',sans-serif;font-size:1.4rem">${p.done_count||0}</span>`},
      {label:'Broken Promises',fn:p=>`<span style="color:var(--red);font-family:'Bebas Neue',sans-serif;font-size:1.4rem">${p.brok_count||0}</span>`},
      {label:'Total Promises',fn:p=>`<span style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem">${p.total_promises||0}</span>`},
      {label:'Delivery Rate',fn:p=>{const pct=p.total_promises?Math.round(p.done_count/p.total_promises*100):0;return`<span style="color:${impColor(pct)};font-family:'JetBrains Mono',monospace;font-size:.9rem;font-weight:600">${pct}%</span>`;}},
      {label:'Public Rating',fn:p=>`<span style="color:var(--gold)">${p.avg_rating?p.avg_rating+'★':'No ratings'}</span>`},
      {label:'Legal Charges',fn:p=>`<span style="color:${p.charge_count>0?'var(--red)':'var(--green)'};">${p.charge_count||0} charges (${p.active_charges||0} active)</span>`},
      {label:'Net Worth (Cr)',fn:p=>p.latestAsset?`<span style="font-family:'JetBrains Mono',monospace">₹${p.latestAsset.net_worth?.toFixed(1)} Cr</span>`:'<span style="color:var(--hin)">N/A</span>'},
    ];
    pgEl.innerHTML=`
      <div class="pg-hdr"><h1 class="pg-title">Compare Politicians</h1><button onclick="clearCompare();goPage('politicians',null)" style="padding:6px 14px;border-radius:8px;background:rgba(255,68,102,.1);border:1px solid rgba(255,68,102,.25);color:var(--red);cursor:pointer;font-size:.7rem;font-family:'JetBrains Mono',monospace">Clear &amp; Reset</button></div>
      <div class="compare-page">
        <div class="compare-header-row" style="display:grid;${gridStyle};gap:1rem;margin-bottom:1.5rem">
          <div></div>
          ${data.map(p=>`<div class="compare-pol-card">
            <div class="compare-pol-photo"><img src="${imgUrl(p.twitter)}" onerror="this.src=''" alt="${p.name}"></div>
            <div style="font-family:'Syne',sans-serif;font-size:.9rem;font-weight:700;color:#F8F4EA">${esc(p.name)}</div>
          </div>`).join('')}
        </div>
        ${metrics.map(m=>`<div class="compare-metric-row" style="display:grid;${gridStyle};gap:1rem;align-items:center">
          <div class="compare-metric-label">${m.label}</div>
          ${data.map(p=>`<div class="compare-metric-val">${m.fn(p)}</div>`).join('')}
        </div>`).join('')}
      </div>`;
  }catch(e){pgEl.innerHTML+='<div class="no-res">Failed to load comparison data</div>';}
}

/* ── PHOTO HTML ── */
function polPhotoHTML(p,size=62){
  const col=pc(p.party);
  const ring=`background:conic-gradient(from 0deg,${col},#060D1E 35%,${col} 65%,#060D1E,${col})`;
  return`<div class="pc-ring" style="${ring};width:${size}px;height:${size}px"><div class="pc-inner"><img src="${imgUrl(p.twitter)}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><div class="pc-fb" style="display:none;background:${col}22;color:${col}">${p.initials}</div></div></div>`;
}

/* ══════════════════════════════
   DASHBOARD
══════════════════════════════ */
async function loadDashboard(){
  try{
    const stats=await StatsAPI.get();
    document.getElementById('hc-pols').textContent=stats.totalPoliticians;
    document.getElementById('hc-pr').textContent=stats.promises.total;
    document.getElementById('hero-stats').innerHTML=`
      <div class="hsc"><div class="hsc-n green">${stats.promises.done}</div><div class="hsc-l">Kept</div></div>
      <div class="hsc"><div class="hsc-n blue">${stats.promises.prog}</div><div class="hsc-l">Progress</div></div>
      <div class="hsc"><div class="hsc-n gold">${stats.promises.pend}</div><div class="hsc-l">Pending</div></div>
      <div class="hsc"><div class="hsc-n red">${stats.promises.brok}</div><div class="hsc-l">Broken</div></div>`;
    // leaderboard
    const lb=await StatesAPI.leaderboard();
    document.getElementById('d-lb').innerHTML=(lb||[]).slice(0,8).map((s,i)=>{const col=pc(s.party);return`<div class="lb-row"><div class="lb-rank ${i<3?'gold-rank':''}">${s.rank_gdp}</div><div class="lb-sn">${esc(s.name)}</div><span class="lb-party-badge" style="background:${col}18;color:${col};border:1px solid ${col}28;font-size:.56rem;padding:1px 5px;border-radius:8px;font-family:'JetBrains Mono',monospace">${s.party}</span><div class="lb-gdp">${s.gdp_growth}%</div><div class="lb-bar-w"><div class="lb-bar-f" style="width:${(s.gdp_growth/14*100).toFixed(0)}%"></div></div></div>`;}).join('');
    buildPartyChart(stats.partyStats);
    document.getElementById('d-top').innerHTML=(stats.topRated||[]).map(p=>`<div class="dash-pol-row"><div class="dash-pol-photo"><img src="${imgUrl(p.twitter)}" onerror="this.src=''" alt="${p.name}"></div><div class="dash-pol-info"><div class="dash-pol-name">${esc(p.name)}</div><div class="dash-pol-role">${esc(p.state)}</div></div><div class="dash-pol-stars">${starsStr(p.avg_stars)} <span style="color:var(--mut);font-size:.6rem">${p.avg_stars||'—'}</span></div></div>`).join('');
    document.getElementById('d-broken').innerHTML=(stats.mostBroken||[]).map(p=>`<div class="lb-row"><div class="dash-pol-photo" style="width:28px;height:28px;flex-shrink:0;border-radius:50%;overflow:hidden"><img src="${imgUrl(p.twitter)}" onerror="this.src=''" alt="${p.name}" style="width:100%;height:100%;object-fit:cover"></div><div style="flex:1;min-width:0"><div style="font-size:.8rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div><div style="font-size:.6rem;color:var(--mut)">${p.party}</div></div><span class="bdg b-brok">${p.broken_count} broken</span></div>`).join('');
    // legal heat
    const lhEl=document.getElementById('d-legal-heat');
    if(lhEl) lhEl.innerHTML=(stats.legalHeat||[]).map(p=>`<div class="lb-row"><div class="dash-pol-photo" style="width:28px;height:28px;flex-shrink:0;border-radius:50%;overflow:hidden"><img src="${imgUrl(p.twitter)}" onerror="this.src=''" alt="${p.name}" style="width:100%;height:100%;object-fit:cover"></div><div style="flex:1;min-width:0"><div style="font-size:.8rem;font-weight:500">${esc(p.name)}</div><div style="font-size:.6rem;color:${pc(p.party)}">${p.party}</div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:.75rem;color:var(--red);font-family:'JetBrains Mono',monospace">${p.active} active</div><div style="font-size:.6rem;color:var(--mut);font-family:'JetBrains Mono',monospace">${p.total_charges} total</div></div></div>`).join('');
  }catch(e){console.error('Dashboard',e);}
}
function buildPartyChart(partyStats){
  const ctx=document.getElementById('party-canvas');if(!ctx||!window.Chart)return;
  const f=(partyStats||[]).filter(p=>p.total>0);
  if(window._pChart)window._pChart.destroy();
  window._pChart=new Chart(ctx,{type:'bar',data:{labels:f.map(p=>p.party),datasets:[{data:f.map(p=>parseFloat((p.done/p.total*100).toFixed(1))),backgroundColor:f.map(p=>pc(p.party)+'BB'),borderColor:f.map(p=>pc(p.party)),borderWidth:1.5,borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>`${v.raw}% fulfilled`}}},scales:{y:{beginAtZero:true,max:100,ticks:{color:'#6B7A8D',font:{size:10},callback:v=>v+'%'},grid:{color:'rgba(255,255,255,.05)'}},x:{ticks:{color:'#A8A4A0',font:{size:11}},grid:{display:false}}}}});
}

/* ══════════════════════════════
   POLITICIANS
══════════════════════════════ */
function setPolTab(tab,btn){polTab=tab;polParty='';polSearch='';document.querySelectorAll('#pol-tabs .st').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');loadPols();}
async function loadPols(){
  const srch=(document.getElementById('pol-srch')||{}).value||'';polSearch=srch;
  const grid=document.getElementById('pol-grid');
  if(grid)grid.innerHTML='<div class="skeleton-grid"><div class="skeleton-block" style="height:340px;border-radius:12px"></div><div class="skeleton-block" style="height:340px;border-radius:12px"></div><div class="skeleton-block" style="height:340px;border-radius:12px"></div></div>';
  try{
    const [res,parties]=await Promise.all([PoliticiansAPI.list({tab:polTab,search:polSearch,party:polParty}),PoliticiansAPI.parties(polTab)]);
    const data=res?.data||[];
    document.getElementById('pol-pfs').innerHTML=`<button class="pf ${polParty===''?'on':''}" onclick="polParty='';loadPols()">All</button>`+(parties||[]).map(p=>`<button class="pf ${polParty===p?'on':''}" onclick="polParty='${p}';loadPols()" style="${polParty===p?`border-color:${pc(p)}44;color:${pc(p)}`:''}">${p}</button>`).join('');
    const dn=data.reduce((a,p)=>a+(p.done_count||0),0);const br=data.reduce((a,p)=>a+(p.brok_count||0),0);
    const rbar=document.getElementById('pol-rbar');if(rbar)rbar.textContent=`${data.length} politicians · ${data.reduce((a,p)=>a+(p.total_promises||0),0)} promises · ${dn} fulfilled · ${br} broken`;
    if(grid)grid.innerHTML=data.length?data.map((p,i)=>polCardHTML(p,i)).join(''):'<div class="no-res">No politicians match your filters.</div>';
  }catch(e){if(grid)grid.innerHTML='<div class="no-res">Failed to load. Is the server running?</div>';showToast(e.message,'error');}
}
function polCardHTML(p,idx){
  const col=pc(p.party);const pct_=pctTerm(p.term_start,p.term_end);const gr=p.avg_rating||0;const apprPct=Math.round(gr/5*100);const delay=idx*.04;
  const ring=`background:conic-gradient(from 0deg,${col},#060D1E 35%,${col} 65%,#060D1E,${col})`;
  return`<div class="pol-card" style="animation-delay:${delay}s">
    <div class="pc-strip" style="background:${col}"></div>
    <div class="pc-head" onclick="openPolModal(${p.id})">
      <div class="pc-ring" style="${ring}"><div class="pc-inner"><img src="${imgUrl(p.twitter)}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><div class="pc-fb" style="display:none;background:${col}22;color:${col}">${p.initials}</div></div></div>
      <div class="pc-meta"><div class="pc-name">${esc(p.name)}</div><div class="pc-role">${esc(p.role)}</div><div class="pc-state">${esc(p.state)}</div><span class="pbadge" style="background:${col}18;color:${col};border:1px solid ${col}28">${p.party}</span></div>
    </div>
    <div class="pc-clock" onclick="openPolModal(${p.id})">
      <div class="clk-lbl">Time in office</div>
      <div class="clk-val clk-v" data-ts="${p.term_start}">${elapsedStr(p.term_start)}</div>
      <div class="tbar"><div class="tbar-f" style="width:${pct_}%"></div></div>
      <div class="tdates"><span>${fmtDate(p.term_start)}</span><span>${pct_}%</span><span>${fmtDate(p.term_end)}</span></div>
    </div>
    <div class="pc-stats" onclick="openPolModal(${p.id})">
      <div class="pcs"><div class="pcs-n" style="color:var(--green)">${p.done_count||0}</div><div class="pcs-l">Done</div></div>
      <div class="pcs"><div class="pcs-n" style="color:var(--blue)">${p.prog_count||0}</div><div class="pcs-l">Progress</div></div>
      <div class="pcs"><div class="pcs-n" style="color:var(--gold)">${p.pend_count||0}</div><div class="pcs-l">Pending</div></div>
      <div class="pcs"><div class="pcs-n" style="color:var(--red)">${p.brok_count||0}</div><div class="pcs-l">Broken</div></div>
    </div>
    <div class="pc-appr" onclick="openPolModal(${p.id})">
      <div class="clk-lbl">Public approval · <span class="rating-live-${p.id}">${gr>0?gr+'/5 ('+p.rating_count+')':'No ratings yet'}</span></div>
      <div class="appr-bar"><div class="appr-fill" style="width:${apprPct}%;background:${apprPct>=70?'var(--green)':apprPct>=50?'var(--gold)':'var(--red)'}"></div></div>
      <div class="appr-meta">${starsStr(gr)}</div>
    </div>
    ${p.charge_count>0?`<div style="padding:0 1.1rem .5rem;display:flex;align-items:center;gap:6px" onclick="openPolModal(${p.id})"><span class="lpg-ct red-ct">⚖ ${p.active_charges||0} active charges</span></div>`:''}
    <div class="pc-foot" onclick="event.stopPropagation()">
      <button class="pc-btn prim" onclick="openPolModal(${p.id})">View Details →</button>
      <button class="pc-btn" onclick="addToCompare({id:${p.id},name:'${p.name.replace(/'/g,"\\'")}',twitter:'${p.twitter||''}',initials:'${p.initials||''}',party:'${p.party}'})">Compare</button>
      <button class="pc-btn rate" onclick="openPolModal(${p.id})">Rate ★</button>
    </div>
  </div>`;
}

/* ── POL MODAL ── */
let _mPol=null,_mPrFilter='all',_mStars={},_mVerdict={};
async function openPolModal(id){
  _mPrFilter='all';
  document.getElementById('pol-mbox').innerHTML='<div class="modal-loading">Loading…</div>';
  openOverlay('pol-modal');
  AnalyticsAPI.track(`/politician/${id}`,'politician',id);
  try{
    const [pol,ratingRes]=await Promise.all([PoliticiansAPI.get(id),RatingsAPI.get(id)]);
    _mPol=pol;_mStars[id]=ratingRes.userRating?.stars||0;_mVerdict[id]=ratingRes.userRating?.verdict||'';
    renderPolModal(pol,ratingRes);
    socket?.emit('join:page',`politician:${id}`);
  }catch(e){document.getElementById('pol-mbox').innerHTML=`<div class="modal-loading" style="color:var(--red)">Error: ${e.message}</div>`;}
}
function renderPolModal(pol,ratingRes){
  const col=pc(pol.party);const pct_=pctTerm(pol.term_start,pol.term_end);
  const agg=ratingRes?.aggregate||{};const ur=ratingRes?.userRating;
  const pr=_mPrFilter==='all'?pol.promises:pol.promises.filter(p=>p.status===_mPrFilter);
  document.getElementById('pol-mbox').innerHTML=`
    <div class="m-hero" style="border-top:3px solid ${col}">
      <div class="m-photo"><img src="${imgUrl(pol.twitter)}" alt="${pol.name}" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><div class="m-fb" style="background:${col}22;color:${col}">${pol.initials}</div></div>
      <div class="m-info">
        <h2>${esc(pol.name)}</h2><div class="m-role">${esc(pol.role)}</div><div class="m-state">${esc(pol.state)}</div>
        <span style="display:inline-block;margin-top:8px;font-size:.6rem;padding:2px 9px;border-radius:11px;font-family:'JetBrains Mono',monospace;background:${col}18;color:${col};border:1px solid ${col}28">${pol.party}</span>
        ${pol.bio?`<p style="font-size:.72rem;color:var(--mut);margin-top:8px;line-height:1.5">${esc(pol.bio)}</p>`:''}
      </div>
      <button class="m-close" onclick="closeOverlay('pol-modal')">✕</button>
    </div>
    <div class="m-clock">
      <div class="clk-lbl">Time in office</div>
      <div class="m-clk-val mclk" data-ts="${pol.term_start}">${elapsedStr(pol.term_start)}</div>
      <div class="tbar" style="margin-top:6px"><div class="tbar-f" style="width:${pct_}%"></div></div>
      <div class="tdates"><span>${fmtDate(pol.term_start)}</span><span>${pct_}% of term</span><span>${fmtDate(pol.term_end)}</span></div>
    </div>
    <div class="m-stats">
      <div class="ms"><div class="ms-n" style="color:var(--green)">${pol.done_count||0}</div><div class="ms-l">Done</div></div>
      <div class="ms"><div class="ms-n" style="color:var(--blue)">${pol.prog_count||0}</div><div class="ms-l">Progress</div></div>
      <div class="ms"><div class="ms-n" style="color:var(--gold)">${pol.pend_count||0}</div><div class="ms-l">Pending</div></div>
      <div class="ms"><div class="ms-n" style="color:var(--red)">${pol.brok_count||0}</div><div class="ms-l">Broken</div></div>
    </div>
    ${pol.latestAsset?`<div style="padding:.75rem 1.75rem;border-bottom:1px solid var(--bdr);display:flex;gap:1rem;flex-wrap:wrap">
      <div><div class="clk-lbl">Net Worth (${pol.latestAsset.election_year})</div><div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--gold)">₹${pol.latestAsset.net_worth?.toFixed(1)} Cr</div></div>
    </div>`:''}
    ${pol.recentNews?.length?`<div style="padding:.75rem 1.75rem;border-bottom:1px solid var(--bdr)">
      <div class="clk-lbl" style="margin-bottom:6px">Recent News</div>
      ${pol.recentNews.map(n=>`<a href="${n.source_url||'#'}" target="_blank" rel="noopener" style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.03);text-decoration:none"><span class="ns-${n.sentiment}" style="flex-shrink:0;font-size:.55rem;padding:2px 6px;border-radius:8px;margin-top:2px">${n.sentiment||'neutral'}</span><span style="font-size:.75rem;color:var(--txt);line-height:1.4">${esc(n.headline)}</span></a>`).join('')}
    </div>`:''}
    ${pol.factchecks?.length?`<div style="padding:.75rem 1.75rem;border-bottom:1px solid var(--bdr)">
      <div class="clk-lbl" style="margin-bottom:6px">Fact Checks</div>
      ${pol.factchecks.map(fc=>`<div style="display:flex;gap:8px;margin-bottom:6px;align-items:flex-start"><span class="fc-badge fc-${fc.verdict}" style="flex-shrink:0">${fc.verdict.replace('_',' ')}</span><span style="font-size:.75rem;color:var(--mut)">${esc(fc.claim_text)}</span></div>`).join('')}
    </div>`:''}
    ${pol.timeline?.length?`<div style="padding:.75rem 1.75rem;border-bottom:1px solid var(--bdr)">
      <div class="clk-lbl" style="margin-bottom:6px">Key Events</div>
      ${pol.timeline.map(e=>`<div style="display:flex;gap:8px;margin-bottom:6px"><div style="font-size:.6rem;color:var(--hin);font-family:'JetBrains Mono',monospace;flex-shrink:0;padding-top:2px">${e.event_date}</div><div><div style="font-size:.75rem;color:var(--txt)">${esc(e.title)}</div></div></div>`).join('')}
    </div>`:''}
    <div class="m-appr">
      <h4>Public Approval · ${agg.total||0} ratings</h4>
      <div style="display:flex;gap:1rem;align-items:center;margin-bottom:.75rem">
        <div style="font-family:'Bebas Neue',sans-serif;font-size:3rem;color:var(--gold);line-height:1">${agg.avg_stars||'—'}</div>
        <div><div style="font-size:1.2rem;color:var(--gold)">${starsStr(agg.avg_stars||0)}</div><div style="font-size:.65rem;color:var(--mut);font-family:'JetBrains Mono',monospace">out of 5.0 from ${agg.total||0} voters</div></div>
      </div>
      ${ratingRes?.recentReviews?.length?`<div style="margin-bottom:.75rem">${ratingRes.recentReviews.slice(0,3).map(r=>`<div style="background:rgba(255,255,255,.03);border-radius:8px;padding:.65rem;margin-bottom:5px"><div style="display:flex;gap:6px;margin-bottom:3px"><span style="color:var(--gold);font-size:.85rem">${starsStr(r.stars)}</span>${r.verdict?`<span style="font-size:.6rem;padding:2px 7px;border-radius:10px;background:rgba(255,215,0,.08);color:var(--gold);font-family:'JetBrains Mono',monospace">${r.verdict}</span>`:''}</div><div style="font-size:.75rem;color:var(--txt)">${esc(r.review_text)}</div><div style="font-size:.6rem;color:var(--hin);font-family:'JetBrains Mono',monospace;margin-top:2px">${r.display_name||r.username||'Anonymous'} · ${timeAgo(r.created_at)}</div></div>`).join('')}</div>`:''}
      <h4 style="margin-top:.75rem">Your Rating</h4>
      <div class="m-stars" id="mstars-${pol.id}">${Array.from({length:5},(_,i)=>`<span class="m-star ${i<(_mStars[pol.id]||0)?'on':''}" onclick="setMStar(${pol.id},${i+1})">★</span>`).join('')}</div>
      <div class="m-verdict-row" id="mverdicts-${pol.id}">${['Excellent','Good','Average','Poor','Corrupt'].map(v=>`<button class="mv-btn ${(_mVerdict[pol.id]||'')=== v?'on':''}" onclick="setMVerdict(${pol.id},'${v}')">${v}</button>`).join('')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <button class="m-save" onclick="saveMRating(${pol.id})">Save My Rating</button>
        ${isLoggedIn()&&!pol.isWatching?`<button class="m-save" onclick="watchPol(${pol.id})" style="background:rgba(0,200,255,.08);border-color:rgba(0,200,255,.25);color:var(--blue)">👁 Watch</button>`:''}
      </div>
    </div>
    <div class="m-pr">
      <h4>Promises (${pol.total_promises||0})</h4>
      <div class="pr-filters" id="pr-filter-${pol.id}">${['all','done','prog','pend','brok'].map(f=>`<button class="prf ${_mPrFilter===f?'on':''}" onclick="setPrFilter(${pol.id},'${f}')">${f==='all'?'All':f==='done'?'Done ✓':f==='prog'?'In Progress':f==='pend'?'Pending':'Broken'}</button>`).join('')}</div>
      <div id="pr-list-${pol.id}">${pr.map(p=>`<div class="pr-item">${badgeHTML(p.status)}<div><div class="pr-txt">${esc(p.title)}</div><div class="pr-cat">${esc(p.category)}</div></div>${isMod()?`<select onchange="updatePromiseStatus(${pol.id},${p.id},this.value)" style="background:var(--s2);border:1px solid var(--bdr);border-radius:6px;color:var(--txt);font-size:.6rem;padding:2px 6px;font-family:'JetBrains Mono',monospace;margin-left:auto"><option ${p.status==='done'?'selected':''} value="done">Done</option><option ${p.status==='prog'?'selected':''} value="prog">Progress</option><option ${p.status==='pend'?'selected':''} value="pend">Pending</option><option ${p.status==='brok'?'selected':''} value="brok">Broken</option></select>`:''}
      </div>`).join('')||'<div style="padding:1rem;color:var(--mut);font-size:.8rem">No promises in this category</div>'}</div>
    </div>
    <div style="padding:0 1.75rem 1.75rem">
      <h4 style="font-size:.75rem;color:var(--mut);text-transform:uppercase;letter-spacing:2px;font-family:'JetBrains Mono',monospace;margin-bottom:.75rem">⚖ Legal Record</h4>
      <div id="pol-legal-${pol.id}"><div style="color:var(--mut);font-size:.72rem;font-family:'JetBrains Mono',monospace">Loading…</div></div>
    </div>
    <div style="padding:0 1.75rem 1.75rem">
      <h4 style="font-size:.75rem;color:var(--mut);text-transform:uppercase;letter-spacing:2px;font-family:'JetBrains Mono',monospace;margin-bottom:.75rem">Public Discussion</h4>
      <div id="comments-live-politician-${pol.id}" class="comments-box"></div>
      <div style="display:flex;gap:8px;margin-top:.75rem">
        <input id="cmt-inp-${pol.id}" class="srch no-icon" placeholder="Add a comment…" style="flex:1">
        <button onclick="postComment('politician',${pol.id})" style="padding:7px 14px;border-radius:8px;background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.28);color:var(--gold);cursor:pointer;font-size:.7rem;font-family:'JetBrains Mono',monospace">Post</button>
      </div>
    </div>`;
  loadPolLegal(pol.id);
  loadComments('politician',pol.id);
}
function setPrFilter(id,f){
  _mPrFilter=f;if(!_mPol)return;
  const pr=f==='all'?_mPol.promises:_mPol.promises.filter(p=>p.status===f);
  const el=document.getElementById(`pr-list-${id}`);if(el)el.innerHTML=pr.map(p=>`<div class="pr-item">${badgeHTML(p.status)}<div><div class="pr-txt">${esc(p.title)}</div><div class="pr-cat">${esc(p.category)}</div></div></div>`).join('')||'<div style="padding:1rem;color:var(--mut);font-size:.8rem">No promises in this category</div>';
  document.querySelectorAll(`#pr-filter-${id} .prf`).forEach((b,i)=>b.classList.toggle('on',['all','done','prog','pend','brok'][i]===f));
}
function setMStar(id,v){_mStars[id]=v;document.querySelectorAll(`#mstars-${id} .m-star`).forEach((s,i)=>s.classList.toggle('on',i<v));}
function setMVerdict(id,v){_mVerdict[id]=v;document.querySelectorAll(`#mverdicts-${id} .mv-btn`).forEach(b=>b.classList.toggle('on',b.textContent===v));}
async function saveMRating(id){
  const s=_mStars[id];if(!s){showToast('Please select a star rating','error');return;}
  try{await RatingsAPI.save({politician_id:id,stars:s,verdict:_mVerdict[id]||''});showToast('Rating saved!');}
  catch(e){showToast(e.message,'error');}
}
async function watchPol(id){
  if(!isLoggedIn()){openOverlay('auth-overlay');return;}
  try{await WatchlistAPI.add(id);showToast('Added to watchlist!');}catch(e){showToast(e.message,'error');}
}
async function updatePromiseStatus(polId,prId,status){
  try{await PoliticiansAPI.updatePromise(polId,prId,status);showToast('Status updated!');}catch(e){showToast(e.message,'error');}
}

/* ── POL LEGAL PANEL ── */
async function loadPolLegal(polId){
  const el=document.getElementById(`pol-legal-${polId}`);if(!el)return;
  try{
    const res=await LegalAPI.byPol(polId);
    if(!res.data.length){el.innerHTML='<div style="font-size:.72rem;color:var(--green);font-family:\'JetBrains Mono\',monospace">✓ No charges on record</div>';return;}
    const active=res.data.filter(c=>c.status==='active').length;const pending=res.data.filter(c=>c.status==='pending').length;
    const cleared=res.data.filter(c=>['false','acquitted'].includes(c.status)).length;const convicted=res.data.filter(c=>c.status==='convicted').length;
    el.innerHTML=`<div class="modal-legal-summary">${active?`<span class="lsum-badge red-ct">${active} Active</span>`:''} ${pending?`<span class="lsum-badge gold-ct">${pending} Pending</span>`:''} ${convicted?`<span class="lsum-badge blk-ct">${convicted} Convicted</span>`:''} ${cleared?`<span class="lsum-badge grn-ct">${cleared} Cleared</span>`:''}<span class="lsum-badge" style="background:rgba(255,255,255,.04);color:var(--mut)">${res.data.length} total</span></div>${res.data.map(c=>chargeCardHTML(c)).join('')}`;
  }catch(e){el.innerHTML='';}
}

/* ── LEGAL CHARGE CARD ── */
const LSTATUS={active:{cls:'ls-active',icon:'🔴'},pending:{cls:'ls-pending',icon:'🟡'},false:{cls:'ls-false',icon:'✅'},acquitted:{cls:'ls-acquitted',icon:'✅'},convicted:{cls:'ls-convicted',icon:'⚫'},settled:{cls:'ls-settled',icon:'🔵'},stayed:{cls:'ls-stayed',icon:'🟠'}};
const LSEV={minor:'var(--mut)',moderate:'var(--gold)',serious:'var(--orange)',severe:'var(--red)'};
function chargeCardHTML(c){
  const st=LSTATUS[c.status]||{cls:'ls-pending',icon:'○'};
  const isCleared=['false','acquitted'].includes(c.status);const isPend=c.status==='pending';
  return`<div class="charge-card ${isCleared?'cleared':isPend?'pending':''}">
    <div class="charge-card-top"><div class="charge-category-tag">${esc(c.category)}</div><div class="charge-status-badges"><span class="charge-status ${st.cls}">${st.icon} ${c.status.replace('_',' ')}</span>${c.severity?`<span class="charge-severity" style="color:${LSEV[c.severity]||'var(--mut)'};border-color:${LSEV[c.severity]||'rgba(255,255,255,.1)'}44">⚡ ${c.severity}</span>`:''}</div></div>
    <h3 class="charge-title">${esc(c.title)}</h3>
    ${c.description?`<p class="charge-desc">${esc(c.description)}</p>`:''}
    <div class="charge-meta-grid">${c.case_number?`<div class="cmeta-item"><div class="cmeta-lbl">Case No.</div><div class="cmeta-val">${esc(c.case_number)}</div></div>`:''} ${c.court?`<div class="cmeta-item"><div class="cmeta-lbl">Court</div><div class="cmeta-val">${esc(c.court)}</div></div>`:''} ${c.filing_agency?`<div class="cmeta-item"><div class="cmeta-lbl">Filed By</div><div class="cmeta-val">${esc(c.filing_agency)}</div></div>`:''} ${c.date_filed?`<div class="cmeta-item"><div class="cmeta-lbl">Date Filed</div><div class="cmeta-val">${c.date_filed}</div></div>`:''} ${c.date_updated?`<div class="cmeta-item"><div class="cmeta-lbl">Last Update</div><div class="cmeta-val">${c.date_updated}</div></div>`:''}</div>
    ${c.outcome?`<div class="charge-outcome"><div class="co-lbl">Outcome / Current Status</div><div class="co-text">${esc(c.outcome)}</div></div>`:''}
    ${c.source_url?`<a href="${c.source_url}" target="_blank" rel="noopener" class="charge-source">View court record ↗</a>`:''}
  </div>`;
}

/* ── COMMENTS ── */
async function loadComments(type,id){
  const box=document.getElementById(`comments-live-${type}-${id}`);if(!box)return;
  try{const res=await CommentsAPI.list(type,id);box.innerHTML=res.data.length?res.data.map(c=>commentHTML(c)).join(''):'<div style="font-size:.72rem;color:var(--hin);font-family:\'JetBrains Mono\',monospace;padding:.5rem 0">No comments yet. Be the first!</div>';}catch(e){box.innerHTML='';}
}
function commentHTML(c,isNew=false){
  return`<div style="padding:8px 0;border-bottom:1px solid var(--bdr)${isNew?';animation:ci .3s ease':''}" id="cmt-${c.id}">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
      <span style="font-size:.65rem;font-weight:600;color:${c.user_role==='admin'?'var(--gold)':c.user_role==='moderator'?'var(--blue)':'var(--mut)'}">${esc(c.display_name||c.username||'Anonymous')}</span>
      ${c.user_role&&c.user_role!=='user'?`<span style="font-size:.5rem;padding:1px 5px;border-radius:6px;background:rgba(255,215,0,.1);color:var(--gold);font-family:'JetBrains Mono',monospace">${c.user_role}</span>`:''}
      <span style="font-size:.58rem;color:var(--hin);font-family:'JetBrains Mono',monospace;margin-left:auto">${timeAgo(c.created_at)}</span>
    </div>
    <div style="font-size:.78rem;color:var(--txt);line-height:1.5;margin-bottom:4px">${esc(c.body)}</div>
    <div style="display:flex;gap:8px">
      <button onclick="voteComment(${c.id},1)" style="font-size:.6rem;background:none;border:none;color:var(--mut);cursor:pointer">👍 ${c.upvotes||0}</button>
      <button onclick="voteComment(${c.id},-1)" style="font-size:.6rem;background:none;border:none;color:var(--mut);cursor:pointer">👎 ${c.downvotes||0}</button>
      <button onclick="flagComment(${c.id})" style="font-size:.6rem;background:none;border:none;color:var(--hin);cursor:pointer">Flag</button>
    </div>
  </div>`;
}
async function postComment(type,id){
  const inp=document.getElementById(`cmt-inp-${id}`);if(!inp||!inp.value.trim())return;
  try{await CommentsAPI.post({entity_type:type,entity_id:id,body:inp.value.trim()});inp.value='';loadComments(type,id);showToast('Comment posted!');}
  catch(e){showToast(e.message,'error');}
}
async function voteComment(id,vote){try{await CommentsAPI.vote(id,vote);}catch(e){showToast(e.message,'error');}}
async function flagComment(id){try{await CommentsAPI.flag(id);showToast('Comment flagged.');}catch(e){}}

/* ══════════════════════════════
   LEGAL PAGE
══════════════════════════════ */
async function loadLegalPage(){
  await Promise.all([loadLegalOverview(),loadLegalFilters(),loadLegalList()]);
}
async function loadLegalOverview(){
  try{
    const stats=await LegalAPI.stats();const el=document.getElementById('legal-overview');if(!el)return;
    const total=stats.total||0;const active=stats.byStatus?.find(s=>s.status==='active')?.count||0;const pending=stats.byStatus?.find(s=>s.status==='pending')?.count||0;const convicted=stats.byStatus?.find(s=>s.status==='convicted')?.count||0;const cleared=stats.byStatus?.filter(s=>['false','acquitted'].includes(s.status)).reduce((a,s)=>a+s.count,0)||0;
    el.innerHTML=`<div class="legal-hero-stats">
      <div class="lhs-card"><div class="lhs-n red">${total}</div><div class="lhs-l">Total Cases</div></div>
      <div class="lhs-card"><div class="lhs-n red">${active}</div><div class="lhs-l">Active in Court</div></div>
      <div class="lhs-card"><div class="lhs-n gold">${pending}</div><div class="lhs-l">Pending Hearing</div></div>
      <div class="lhs-card"><div class="lhs-n green">${cleared}</div><div class="lhs-l">Dismissed / Acquitted</div></div>
      <div class="lhs-card"><div class="lhs-n" style="color:var(--purple)">${convicted}</div><div class="lhs-l">Convicted</div></div>
    </div>
    <div class="legal-charts-row">
      <div class="legal-chart-box"><div class="lc-title">Cases by Category</div>${(stats.byCategory||[]).map(c=>`<div class="lc-bar-row"><div class="lc-bar-label" title="${c.category}">${c.category.split(' ')[0]}…</div><div class="lc-bar-outer"><div class="lc-bar-active" style="width:${total?c.active/total*100:0}%"></div><div class="lc-bar-rest" style="width:${total?(c.total-c.active)/total*100:0}%"></div></div><div class="lc-bar-count">${c.total}</div></div>`).join('')}</div>
      <div class="legal-chart-box"><div class="lc-title">Cases by Party</div>${(stats.byParty||[]).slice(0,8).map(p=>`<div class="lc-bar-row"><div class="lc-bar-label" style="color:${pc(p.party)}">${p.party}</div><div class="lc-bar-outer"><div class="lc-bar-active" style="width:${total?p.active/total*100:0}%;background:${pc(p.party)}BB"></div><div class="lc-bar-rest" style="width:${total?(p.total-p.active)/total*100:0}%;background:${pc(p.party)}44"></div></div><div class="lc-bar-count">${p.total}</div></div>`).join('')}</div>
      <div class="legal-chart-box"><div class="lc-title">Most Charged</div>${(stats.mostCharged||[]).map((p,i)=>`<div class="lc-pol-row"><span style="font-family:'Bebas Neue',sans-serif;color:var(--mut);font-size:.9rem;width:18px">${i+1}</span><div class="lc-pol-photo"><img src="${imgUrl(p.twitter)}" onerror="this.src=''" alt="${p.name}"></div><div class="lc-pol-info" style="flex:1;min-width:0"><div class="lc-pol-name">${esc(p.name)}</div><div class="lc-pol-party" style="color:${pc(p.party)}">${p.party}</div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:.78rem;font-family:'JetBrains Mono',monospace;color:var(--txt)">${p.total_charges}</div><div style="font-size:.58rem;color:var(--red);font-family:'JetBrains Mono',monospace">${p.active_charges} active</div></div></div>`).join('')}</div>
    </div>`;
  }catch(e){console.error('Legal overview',e);}
}
async function loadLegalFilters(){
  try{
    const meta=await LegalAPI.cats();
    const sf=document.getElementById('legal-status-filters');const cf=document.getElementById('legal-cat-filters');const svf=document.getElementById('legal-sev-filters');
    const statuses=['','active','pending','false','acquitted','convicted','settled','stayed'];
    const statusLabels={active:'🔴 Active',pending:'🟡 Pending',false:'✅ Dismissed',acquitted:'✅ Acquitted',convicted:'⚫ Convicted',settled:'🔵 Settled',stayed:'🟠 Stayed'};
    if(sf)sf.innerHTML=statuses.map(s=>`<button class="pf ${legalFilters.status===s?'on':''}" onclick="setLF('status','${s}')">${s?statusLabels[s]||s:'All Status'}</button>`).join('');
    if(cf)cf.innerHTML=`<button class="pf ${!legalFilters.category?'on':''}" onclick="setLF('category','')">All Categories</button>`+(meta.categories||[]).map(c=>`<button class="pf ${legalFilters.category===c?'on':''}" onclick="setLF('category',${JSON.stringify(c)})" title="${c}">${c.split(' ')[0]}…</button>`).join('');
    if(svf)svf.innerHTML=`<button class="pf ${!legalFilters.severity?'on':''}" onclick="setLF('severity','')">All Severity</button>`+['minor','moderate','serious','severe'].map(s=>`<button class="pf ${legalFilters.severity===s?'on':''}" onclick="setLF('severity','${s}')">${s}</button>`).join('');
  }catch(e){}
}
function setLF(k,v){legalFilters[k]=v;loadLegalFilters();loadLegalList();}
async function loadLegalList(){
  const srch=(document.getElementById('legal-srch')||{}).value||'';legalFilters.search=srch;
  const listEl=document.getElementById('legal-list');if(!listEl)return;
  listEl.innerHTML='<div class="skeleton-block" style="height:200px;margin:2rem"></div>';
  try{
    const params={};if(legalFilters.status)params.status=legalFilters.status;if(legalFilters.category)params.category=legalFilters.category;if(legalFilters.severity)params.severity=legalFilters.severity;if(legalFilters.search)params.search=legalFilters.search;
    const res=await LegalAPI.all(params);const data=res.data||[];
    const rbar=document.getElementById('legal-rbar');if(rbar)rbar.textContent=`${data.length} charges · ${res.statusSummary?.active||0} active · ${(res.statusSummary?.false||0)+(res.statusSummary?.acquitted||0)} dismissed`;
    if(!data.length){listEl.innerHTML='<div class="no-res">No charges match your filters.</div>';return;}
    const grouped={};data.forEach(c=>{if(!grouped[c.politician_id])grouped[c.politician_id]={name:c.politician_name,party:c.party,twitter:c.twitter,initials:c.initials,charges:[]};grouped[c.politician_id].charges.push(c);});
    listEl.innerHTML=Object.entries(grouped).map(([polId,g])=>`<div class="legal-pol-group">
      <div class="lpg-header" onclick="toggleLpg(${polId})">
        <div class="lpg-photo"><img src="${imgUrl(g.twitter)}" onerror="this.src=''" alt="${g.name}"></div>
        <div style="flex:1;min-width:0"><div class="lpg-name">${esc(g.name)}</div><span class="pbadge" style="background:${pc(g.party)}18;color:${pc(g.party)};border:1px solid ${pc(g.party)}28;font-size:.56rem">${g.party}</span></div>
        <div class="lpg-counts">
          ${g.charges.filter(c=>c.status==='active').length?`<span class="lpg-ct red-ct">${g.charges.filter(c=>c.status==='active').length} Active</span>`:''} 
          ${g.charges.filter(c=>c.status==='pending').length?`<span class="lpg-ct gold-ct">${g.charges.filter(c=>c.status==='pending').length} Pending</span>`:''}
          ${g.charges.filter(c=>c.status==='convicted').length?`<span class="lpg-ct blk-ct">${g.charges.filter(c=>c.status==='convicted').length} Convicted</span>`:''}
          ${g.charges.filter(c=>['false','acquitted'].includes(c.status)).length?`<span class="lpg-ct grn-ct">${g.charges.filter(c=>['false','acquitted'].includes(c.status)).length} Cleared</span>`:''}
        </div>
        <div class="lpg-total">${g.charges.length} case${g.charges.length!==1?'s':''}</div>
        <div class="lpg-chevron" id="chev-${polId}">▼</div>
      </div>
      <div class="lpg-charges open" id="charges-${polId}">${g.charges.map(c=>chargeCardHTML(c)).join('')}</div>
    </div>`).join('');
  }catch(e){listEl.innerHTML='<div class="no-res">Failed to load legal records.</div>';showToast(e.message,'error');}
}
function toggleLpg(id){const el=document.getElementById(`charges-${id}`);const chv=document.getElementById(`chev-${id}`);if(el){el.classList.toggle('open');if(chv)chv.textContent=el.classList.contains('open')?'▼':'▶';}}

/* ══════════════════════════════
   NEWS PAGE
══════════════════════════════ */
async function loadNews(){
  const grid=document.getElementById('news-grid');if(!grid)return;
  grid.innerHTML='<div class="skeleton-block" style="height:300px;margin:2rem"></div>';
  try{
    const res=await NewsAPI.list({limit:24});
    grid.innerHTML=(res.data||[]).map((n,i)=>`<a class="news-card" href="${n.source_url||'#'}" target="_blank" rel="noopener" style="animation-delay:${i*.04}s">
      <div class="news-img">${n.image_url?`<img src="${n.image_url}" alt="${n.headline}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=news-img-placeholder>📰</div>'">`:'<div class="news-img-placeholder">📰</div>'}</div>
      <div class="news-body">
        <div class="news-meta"><span class="news-source">${esc(n.source_name||'Unknown')}</span><span class="news-date">${timeAgo(n.published_at)}</span>${n.sentiment?`<span class="news-sentiment ns-${n.sentiment}">${n.sentiment}</span>`:''}</div>
        <div class="news-headline">${esc(n.headline)}</div>
        ${n.summary?`<div class="news-summary">${esc(n.summary.slice(0,120))}…</div>`:''}
      </div>
    </a>`).join('')||'<div class="no-res">No news articles yet. Add some via the API.</div>';
  }catch(e){grid.innerHTML='<div class="no-res">Failed to load news.</div>';}
}

/* ══════════════════════════════
   APPROVALS PAGE
══════════════════════════════ */
let _apprStars={},_apprVerdict={};
function setApprTab(tab,btn){apprTab=tab;document.querySelectorAll('.approval-tabs .st').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');loadApprovals();}
async function loadApprovals(){
  const srch=(document.getElementById('appr-srch')||{}).value||'';
  const grid=document.getElementById('appr-grid');if(!grid)return;
  grid.innerHTML='<div class="skeleton-block" style="height:300px;margin:2rem"></div>';
  try{
    const res=await PoliticiansAPI.list({tab:apprTab,search:srch});
    grid.innerHTML=(res?.data||[]).map((p,i)=>apprCardHTML(p,i)).join('')||'<div class="no-res">No results</div>';
  }catch(e){grid.innerHTML='<div class="no-res">Failed to load.</div>';}
}
function apprCardHTML(p,idx){
  const col=pc(p.party);const gr=p.avg_rating||0;const cnt=p.rating_count||0;
  const pt=p.total_promises||1;const pd=Math.round((p.done_count||0)/pt*100);const pp=Math.round((p.prog_count||0)/pt*100);const pb=Math.round((p.brok_count||0)/pt*100);
  return`<div class="appr-card" style="animation-delay:${idx*.04}s">
    <div class="aprc-head"><div class="aprc-photo"><img src="${imgUrl(p.twitter)}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><div class="aprc-fb" style="background:${col}22;color:${col}">${p.initials}</div></div>
      <div><div class="aprc-name">${esc(p.name)}</div><div class="aprc-role">${esc(p.role)}</div><div class="aprc-role">${esc(p.state)}</div><span style="display:inline-block;margin-top:3px;font-size:.56rem;padding:2px 6px;border-radius:9px;font-family:'JetBrains Mono',monospace;background:${col}18;color:${col};border:1px solid ${col}28">${p.party}</span></div>
    </div>
    <div class="aprc-global"><div class="agr-lbl">Public Approval · ${cnt} ratings</div><div class="star-row">${Array.from({length:5},(_,i)=>`<span style="color:${i<Math.round(gr)?'var(--gold)':'var(--hin)'}">${i<Math.round(gr)?'★':'☆'}</span>`).join('')}</div><div class="aprc-meta">${gr>0?gr+'/5':cnt===0?'No ratings':'—'}</div><div class="aprc-gbar"><div class="aprc-gfill" style="width:${gr/5*100}%"></div></div></div>
    <div class="aprc-verdict"><div class="agr-lbl">Promise Fulfillment</div>
      <div class="vrow"><div class="vlbl">Delivered</div><div class="vbar"><div class="vfill" style="width:${pd}%;background:var(--green)"></div></div><div class="vpct">${pd}%</div></div>
      <div class="vrow"><div class="vlbl">In Progress</div><div class="vbar"><div class="vfill" style="width:${pp}%;background:var(--blue)"></div></div><div class="vpct">${pp}%</div></div>
      <div class="vrow"><div class="vlbl">Broken</div><div class="vbar"><div class="vfill" style="width:${pb}%;background:var(--red)"></div></div><div class="vpct">${pb}%</div></div>
    </div>
    <div class="aprc-user"><div class="aprc-ulbl">Your Rating</div>
      <div class="star-inp" id="appr-stars-${p.id}">${Array.from({length:5},(_,i)=>`<span class="si-star" onclick="setApprStar(${p.id},${i+1})">★</span>`).join('')}</div>
      <div class="verdict-btns">${['Excellent','Good','Average','Poor','Corrupt'].map(v=>`<button class="vbtn" onclick="setApprVerdict(${p.id},'${v}')">${v}</button>`).join('')}</div>
      <div id="appr-saved-${p.id}" style="height:4px"></div>
      <button class="save-btn" onclick="saveApprRating(${p.id})">Save My Rating</button>
    </div>
  </div>`;
}
function setApprStar(id,v){_apprStars[id]=v;document.querySelectorAll(`#appr-stars-${id} .si-star`).forEach((s,i)=>s.classList.toggle('on',i<v));}
function setApprVerdict(id,v){_apprVerdict[id]=v;document.querySelectorAll(`.appr-card [onclick*="${id},'${v}'"]`).forEach(b=>b.classList.add('on'));}
async function saveApprRating(id){
  const s=_apprStars[id];if(!s){showToast('Please pick stars','error');return;}
  try{await RatingsAPI.save({politician_id:id,stars:s,verdict:_apprVerdict[id]||''});const el=document.getElementById(`appr-saved-${id}`);if(el){el.className='your-saved';el.textContent=`Saved: ${s}★ · ${_apprVerdict[id]||'—'}`;}showToast('Rating saved!');}
  catch(e){showToast(e.message,'error');}
}

/* ══════════════════════════════
   PARTIES PAGE
══════════════════════════════ */
async function loadParties(){
  const grid=document.getElementById('parties-grid');if(!grid)return;
  grid.innerHTML='<div class="skeleton-block" style="height:400px;margin:2rem"></div>';
  try{const res=await PartiesAPI.list();grid.innerHTML=(res.data||[]).map((par,i)=>partyCardHTML(par,i)).join('')||'<div class="no-res">No party data</div>';}
  catch(e){grid.innerHTML='<div class="no-res">Failed to load parties</div>';}
}
function partyCardHTML(par,idx){
  const p=par.prev.stats,c=par.curr.stats;const total=par.prev.promises.length;const del=total?Math.round(p.done/total*100):0;
  return`<div class="party-card" style="animation-delay:${idx*.06}s" onclick="openPartyModal('${par.slug}')">
    <div class="pcard-top" style="border-top:3px solid ${par.color}"><div class="party-logo-circle" style="background:${par.color}20;color:${par.color};border:2px solid ${par.color}40">${par.name}</div>
      <div><div class="pcard-name" style="color:${par.color}">${par.name}</div><div class="pcard-full">${esc(par.full_name)}</div><div class="pcard-ideo">${esc(par.ideology)}</div></div>
    </div>
    <div class="pcard-body">
      <div class="pcard-scores">
        <div class="pcs-box"><div class="n" style="color:var(--green)">${p.done}</div><div class="l">Kept</div></div>
        <div class="pcs-box"><div class="n" style="color:var(--red)">${p.brok}</div><div class="l">Broken</div></div>
        <div class="pcs-box"><div class="n" style="color:var(--blue)">${c.prog}</div><div class="l">Current</div></div>
        <div class="pcs-box"><div class="n" style="color:var(--gold)">${par.seats_2024}</div><div class="l">Seats '24</div></div>
      </div>
      <div class="pcard-states">States: <b>${(par.states_json||[]).length>0?(par.states_json.slice(0,3).join(', ')+(par.states_json.length>3?' +'+(par.states_json.length-3)+'…':'')):'Opposition'}</b></div>
      <div style="font-size:.68rem;color:var(--mut);margin-bottom:.4rem">Previous term delivery:</div>
      <div style="height:5px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden;margin-bottom:.75rem"><div style="height:100%;width:${del}%;background:${par.color};border-radius:3px"></div></div>
      ${(par.curr.promises||[]).slice(0,2).map(p=>`<div class="promise-mini"><span>📌</span><span style="font-size:.72rem;color:var(--txt)">${esc(p.title.slice(0,55))}…</span></div>`).join('')}
    </div>
    <div style="padding:.5rem 1.1rem 1.1rem"><button class="pcard-open" onclick="event.stopPropagation();openPartyModal('${par.slug}')">View Full Manifesto →</button></div>
  </div>`;
}
async function openPartyModal(slug){
  document.getElementById('party-mbox').innerHTML='<div class="modal-loading">Loading…</div>';openOverlay('party-modal');
  try{
    const par=await PartiesAPI.get(slug);
    window._curParty=par;let _tab='prev';
    function renderPTab(t){
      if(t==='states')return`<div class="pm-section"><h3>States Governing</h3>${(par.states_json||[]).length?(par.states_json.map(s=>`<div class="lb-row"><div class="lb-sn">${s}</div><span class="bdg b-prog">In Power</span></div>`).join('')):'<p style="color:var(--mut);font-size:.8rem">In opposition</p>'}</div>`;
      const d=t==='prev'?par.prev:par.curr;const cnt=d.stats;
      return`<div class="pm-section"><h3>${esc(d.promises[0]?.year||'')} Manifesto<span class="ybadge">${d.promises[0]?.year||''}</span></h3>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:1rem"><div class="pcs-box"><div class="n" style="color:var(--green)">${cnt.done}</div><div class="l">Kept</div></div><div class="pcs-box"><div class="n" style="color:var(--blue)">${cnt.prog}</div><div class="l">Progress</div></div><div class="pcs-box"><div class="n" style="color:var(--gold)">${cnt.pend}</div><div class="l">Pending</div></div><div class="pcs-box"><div class="n" style="color:var(--red)">${cnt.brok}</div><div class="l">Broken</div></div></div>
        ${d.promises.map(p=>`<div class="manif-pr">${badgeHTML(p.status)}<div><div class="manif-txt">${esc(p.title)}</div>${p.impact?`<div class="manif-impact">${esc(p.impact)}</div>`:''}</div></div>`).join('')}
      </div>`;
    }
    document.getElementById('party-mbox').innerHTML=`
      <div class="m-hero" style="border-top:3px solid ${par.color}"><div class="party-logo-circle" style="background:${par.color}20;color:${par.color};border:2px solid ${par.color}40;width:68px;height:68px;font-size:1rem">${par.name}</div>
        <div class="m-info"><h2>${par.name} <span style="font-size:.65rem;color:${par.color};font-family:'JetBrains Mono',monospace">Est. ${par.founded}</span></h2><div class="m-role">${esc(par.full_name)}</div><div class="m-state">${esc(par.ideology)}</div><div style="margin-top:5px;font-size:.65rem;color:var(--mut)">2024 Lok Sabha: <b style="color:var(--txt)">${par.seats_2024} seats</b></div></div>
        <button class="m-close" onclick="closeOverlay('party-modal')">✕</button>
      </div>
      <div class="pm-tabs" id="pm-tabs-${slug}"><button class="pm-tab on" onclick="switchPartyTab('prev','${slug}')">Previous Term</button><button class="pm-tab" onclick="switchPartyTab('curr','${slug}')">Current Manifesto</button><button class="pm-tab" onclick="switchPartyTab('states','${slug}')">States Governed</button></div>
      <div id="pm-content-${slug}">${renderPTab('prev')}</div>`;
    window._partyRenderFns=window._partyRenderFns||{};window._partyRenderFns[slug]=renderPTab;
  }catch(e){document.getElementById('party-mbox').innerHTML=`<div class="modal-loading" style="color:var(--red)">Error: ${e.message}</div>`;}
}
function switchPartyTab(t,slug){document.querySelectorAll(`#pm-tabs-${slug} .pm-tab`).forEach((b,i)=>b.classList.toggle('on',['prev','curr','states'][i]===t));const fn=window._partyRenderFns?.[slug];if(fn)document.getElementById(`pm-content-${slug}`).innerHTML=fn(t);}

/* ══════════════════════════════
   STATES PAGE
══════════════════════════════ */
let _gdpBuilt=false;
function setSortStates(s,btn){stateSort=s;document.querySelectorAll('.states-sort .st').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');loadStates();}
async function loadStates(){
  const srch=(document.getElementById('state-srch')||{}).value||'';
  const grid=document.getElementById('states-grid');if(!grid)return;
  grid.innerHTML='<div class="skeleton-block" style="height:300px;margin:2rem"></div>';
  try{
    const [res,parties]=await Promise.all([StatesAPI.list({search:srch,party:stateParty,sort:stateSort}),StatesAPI.parties()]);
    if(!_gdpBuilt){buildGdpChart(res.data||[]);_gdpBuilt=true;}
    const pfsEl=document.getElementById('state-pfs');if(pfsEl)pfsEl.innerHTML=`<button class="pf ${!stateParty?'on':''}" onclick="stateParty='';loadStates()">All Parties</button>`+(parties||[]).map(p=>`<button class="pf ${stateParty===p?'on':''}" onclick="stateParty='${p}';loadStates()">${p}</button>`).join('');
    grid.innerHTML=(res.data||[]).map((s,i)=>stateCardHTML(s,i)).join('')||'<div class="no-res">No states match filters</div>';
  }catch(e){grid.innerHTML='<div class="no-res">Failed to load states</div>';}
}
function buildGdpChart(states){
  const ctx=document.getElementById('gdp-canvas');if(!ctx||!window.Chart)return;
  const sorted=[...states].sort((a,b)=>b.gdp_growth-a.gdp_growth);
  if(window._gdpChart)window._gdpChart.destroy();
  window._gdpChart=new Chart(ctx,{type:'bar',data:{labels:sorted.map(s=>s.name),datasets:[{data:sorted.map(s=>s.gdp_growth),backgroundColor:sorted.map(s=>pc(s.party)+'BB'),borderColor:sorted.map(s=>pc(s.party)),borderWidth:1.5,borderRadius:5}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:v=>`${v.raw}% GSDP · ${sorted[v.dataIndex].party}`}}},scales:{x:{beginAtZero:true,ticks:{color:'#6B7A8D',font:{size:10},callback:v=>v+'%'},grid:{color:'rgba(255,255,255,.04)'}},y:{ticks:{color:'#A8A4A0',font:{size:11}},grid:{display:false}}}}});
}
function stateCardHTML(s,idx){
  const col=pc(s.party);
  return`<div class="state-card" style="animation-delay:${idx*.04}s" onclick="openStateModal('${esc(s.name)}')">
    <div class="sc-head"><div><div class="sc-state">${esc(s.name)}</div><div class="sc-cm" style="color:${col}">${esc(s.cm_name)} · ${s.party}</div></div><div class="sc-rank">#${s.rank_gdp}</div></div>
    <div class="sc-metrics">
      <div class="sc-m"><div class="sc-mn" style="color:${gdpColor(s.gdp_growth)}">${s.gdp_growth}%</div><div class="sc-ml">GDP Growth</div></div>
      <div class="sc-m"><div class="sc-mn">₹${s.gdp_size}L Cr</div><div class="sc-ml">GDP Size</div></div>
      <div class="sc-m"><div class="sc-mn">${s.unemployment}%</div><div class="sc-ml">Unemploymt</div></div>
    </div>
    <div class="sc-impact"><div class="sc-impact-lbl">Impact Scores</div>
      ${[['Infrastructure',s.score_infra],['Welfare',s.score_welfare],['Economy',s.score_economy],['Governance',s.score_govn],['Environment',s.score_env]].map(([n,v])=>`<div class="sc-imp-row"><div class="sc-imp-name">${n}</div><div class="sc-imp-bar"><div class="sc-imp-fill" style="width:${v||0}%;background:${impColor(v||0)}"></div></div><div class="sc-imp-val">${v||0}</div></div>`).join('')}
    </div>
  </div>`;
}
async function openStateModal(name){
  document.getElementById('state-mbox').innerHTML='<div class="modal-loading">Loading…</div>';openOverlay('state-modal');
  AnalyticsAPI.track(`/state/${name}`,'state',null);
  try{
    const s=await StatesAPI.get(name);const col=pc(s.party);
    const avg=Math.round([s.score_infra,s.score_welfare,s.score_economy,s.score_govn,s.score_env].reduce((a,b)=>a+(b||0),0)/5);
    document.getElementById('state-mbox').innerHTML=`
      <div class="sm-hero" style="position:relative">
        <div><div class="sm-title" style="background:linear-gradient(135deg,#fff,${col});-webkit-background-clip:text;-webkit-text-fill-color:transparent">${esc(s.name)}</div><div class="sm-cm">${esc(s.cm_name)} · <span style="color:${col}">${s.party}</span> · Rank #${s.rank_gdp} by GDP</div></div>
        <div class="sc-rank" style="font-size:2rem">#${s.rank_gdp}</div>
        <button class="m-close" onclick="closeOverlay('state-modal')">✕</button>
      </div>
      <div class="sm-metrics">
        <div class="sm-m"><div class="sm-mn" style="color:${gdpColor(s.gdp_growth)}">${s.gdp_growth}%</div><div class="sm-ml">GDP Growth</div></div>
        <div class="sm-m"><div class="sm-mn">₹${s.gdp_size}L Cr</div><div class="sm-ml">Nominal GDP</div></div>
        <div class="sm-m"><div class="sm-mn">${s.hdi||'N/A'}</div><div class="sm-ml">HDI</div></div>
        <div class="sm-m"><div class="sm-mn">${s.literacy||'N/A'}%</div><div class="sm-ml">Literacy</div></div>
        <div class="sm-m"><div class="sm-mn">${s.unemployment||'N/A'}%</div><div class="sm-ml">Unemploymt</div></div>
        <div class="sm-m"><div class="sm-mn" style="color:${impColor(avg)}">${avg}/100</div><div class="sm-ml">Avg Score</div></div>
      </div>
      <div class="sm-decisions"><h4>Key Policy Decisions</h4>
        ${(s.decisions||[]).map(d=>`<div class="dec-item"><span class="dec-type ${d.type==='pos'?'dt-pos':d.type==='neg'?'dt-neg':'dt-mix'}">${d.type==='pos'?'Positive':d.type==='neg'?'Negative':'Mixed'}</span><div><div class="dec-txt">${esc(d.title)}</div><div class="dec-impact">${esc(d.impact||'')}</div></div></div>`).join('')||'<div style="color:var(--mut);font-size:.78rem">No decisions recorded</div>'}
      </div>
      <div class="sm-lti"><h4>Long-term Impact Scores</h4>
        <div class="lti-grid">${[['Infrastructure',s.score_infra],['Welfare',s.score_welfare],['Economy',s.score_economy],['Governance',s.score_govn],['Environment',s.score_env]].map(([n,v])=>`<div class="lti-item"><div class="lti-lbl">${n}</div><div class="lti-row"><div class="lti-bar"><div class="lti-fill" style="width:${v||0}%;background:${impColor(v||0)}"></div></div><div class="lti-n" style="color:${impColor(v||0)}">${v||0}</div></div></div>`).join('')}</div>
      </div>
      ${s.news?.length?`<div style="padding:1.1rem 1.75rem;border-top:1px solid var(--bdr)"><div class="clk-lbl" style="margin-bottom:6px">Recent News</div>${s.news.map(n=>`<div style="padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)"><a href="${n.source_url||'#'}" target="_blank" rel="noopener" style="font-size:.76rem;color:var(--txt);text-decoration:none">${esc(n.headline)}</a><div style="font-size:.6rem;color:var(--hin);font-family:'JetBrains Mono',monospace;margin-top:1px">${n.source_name||''} · ${timeAgo(n.published_at)}</div></div>`).join('')}</div>`:''}
      <div style="padding:0 1.75rem 1.75rem"><h4 style="font-size:.72rem;color:var(--mut);text-transform:uppercase;letter-spacing:2px;font-family:'JetBrains Mono',monospace;margin-bottom:.75rem;padding-top:1.25rem">State Discussion</h4>
        <div id="comments-live-state-${s.id}" class="comments-box"></div>
        <div style="display:flex;gap:8px;margin-top:.75rem"><input id="cmt-inp-${s.id}" class="srch no-icon" placeholder="Comment about ${esc(s.name)}…" style="flex:1"><button onclick="postComment('state',${s.id})" style="padding:7px 14px;border-radius:8px;background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.28);color:var(--gold);cursor:pointer;font-size:.7rem;font-family:'JetBrains Mono',monospace">Post</button></div>
      </div>`;
    loadComments('state',s.id);
  }catch(e){document.getElementById('state-mbox').innerHTML=`<div class="modal-loading" style="color:var(--red)">Error: ${e.message}</div>`;}
}

/* ══════════════════════════════
   WATCHLIST PAGE
══════════════════════════════ */
async function loadWatchlist(){
  if(!isLoggedIn()){document.getElementById('pg-watchlist').innerHTML=`<div class="pg-hdr"><h1 class="pg-title">Watchlist</h1></div><div style="padding:4rem;text-align:center;color:var(--hin)"><div style="font-size:2rem;margin-bottom:1rem">👁</div><p style="font-family:'JetBrains Mono',monospace;font-size:.85rem">Sign in to use your watchlist</p><button onclick="openOverlay('auth-overlay')" style="margin-top:1rem;padding:10px 24px;border-radius:10px;background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.28);color:var(--gold);cursor:pointer;font-size:.82rem;font-family:'JetBrains Mono',monospace">Sign In / Register</button></div>`;return;}
  try{const res=await WatchlistAPI.list();const grid=document.getElementById('watchlist-grid');if(!grid)return;grid.innerHTML=(res.data||[]).map(w=>`<div class="watchlist-item"><div class="wl-photo"><img src="${imgUrl(w.twitter)}" onerror="this.src=''" alt="${w.name}"></div><div class="wl-info" onclick="openPolModal(${w.politician_id})" style="cursor:pointer"><div class="wl-name">${esc(w.name)}</div><div class="wl-role">${esc(w.role)} · ${esc(w.state)}</div><div style="font-size:.62rem;font-family:'JetBrains Mono',monospace;color:var(--gold)">⭐ ${w.avg_rating||'No rating'}</div></div><button class="wl-unwatch" onclick="unwatchPol(${w.politician_id})">Unwatch</button></div>`).join('')||'<div class="no-res" style="grid-column:1/-1">No politicians on watchlist yet.</div>';}
  catch(e){showToast(e.message,'error');}
}
async function unwatchPol(id){try{await WatchlistAPI.remove(id);loadWatchlist();showToast('Removed from watchlist');}catch(e){showToast(e.message,'error');}}

/* ══════════════════════════════
   ADMIN PAGE
══════════════════════════════ */
async function loadAdmin(){
  if(!isMod()){document.getElementById('pg-admin').innerHTML='<div class="pg-hdr"><h1 class="pg-title">Admin</h1></div><div style="padding:4rem;text-align:center;color:var(--red)">Access denied. Admin / Moderator role required.</div>';return;}
  try{
    const sum=await AdminAPI.summary();const pgEl=document.getElementById('pg-admin');if(!pgEl)return;
    pgEl.innerHTML=`<div class="pg-hdr"><h1 class="pg-title">Admin Panel</h1><p class="pg-sub">Manage content, users, and monitor platform health.</p></div>
    <div class="admin-layout">
      <div class="admin-sidebar">
        <button class="admin-sidebar-item active" onclick="loadAdminSection('overview',this)">📊 Overview</button>
        <button class="admin-sidebar-item" onclick="loadAdminSection('users',this)">👥 Users</button>
        <button class="admin-sidebar-item" onclick="loadAdminSection('flags',this)">🚩 Flagged Comments</button>
        <button class="admin-sidebar-item" onclick="loadAdminSection('audit',this)">📋 Audit Log</button>
      </div>
      <div class="admin-content" id="admin-content">
        <div class="admin-stat-grid">
          ${Object.entries(sum).map(([k,v])=>`<div class="admin-stat"><div class="admin-stat-n">${v}</div><div class="admin-stat-l">${k.replace(/_/g,' ')}</div></div>`).join('')}
        </div>
        <div style="font-size:.78rem;color:var(--mut);font-family:'JetBrains Mono',monospace">Select a section from the sidebar.</div>
      </div>
    </div>`;
  }catch(e){showToast(e.message,'error');}
}
async function loadAdminSection(section,btn){
  document.querySelectorAll('.admin-sidebar-item').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');
  const content=document.getElementById('admin-content');if(!content)return;
  content.innerHTML='<div style="color:var(--mut);font-family:\'JetBrains Mono\',monospace;font-size:.8rem">Loading…</div>';
  try{
    if(section==='users'){const res=await AdminAPI.users();content.innerHTML=`<h3 style="margin-bottom:1rem;font-family:'Syne',sans-serif">Users (${res.total})</h3><table class="admin-table"><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>${(res.data||[]).map(u=>`<tr><td>${esc(u.username)}</td><td>${esc(u.email)}</td><td><span style="color:${u.role==='admin'||u.role==='superadmin'?'var(--gold)':u.role==='moderator'?'var(--blue)':'var(--mut)'}">${u.role}</span></td><td style="font-size:.65rem;color:var(--hin);font-family:'JetBrains Mono',monospace">${fmtFull(u.created_at)}</td><td><button onclick="banUser(${u.id},${u.is_banned?0:1})" style="font-size:.62rem;padding:3px 9px;border-radius:7px;border:1px solid rgba(255,68,102,.3);background:transparent;color:var(--red);cursor:pointer">${u.is_banned?'Unban':'Ban'}</button></td></tr>`).join('')}</tbody></table>`;}
    else if(section==='flags'){const res=await AdminAPI.flags();content.innerHTML=`<h3 style="margin-bottom:1rem;font-family:'Syne',sans-serif">Flagged Comments (${res.data?.length||0})</h3>${(res.data||[]).map(c=>`<div style="background:rgba(255,68,102,.04);border:1px solid rgba(255,68,102,.15);border-radius:10px;padding:.85rem;margin-bottom:.75rem"><div style="font-size:.78rem;color:var(--txt);margin-bottom:6px">${esc(c.body)}</div><div style="font-size:.62rem;color:var(--hin);font-family:'JetBrains Mono',monospace;margin-bottom:8px">${esc(c.username||'Anonymous')} · ${fmtFull(c.created_at)}</div><button onclick="removeComment(${c.id})" style="font-size:.62rem;padding:4px 12px;border-radius:7px;border:1px solid rgba(255,68,102,.3);background:transparent;color:var(--red);cursor:pointer">Remove</button></div>`).join('')||'<div style="color:var(--green);font-size:.8rem">No flagged comments!</div>'}`;}
    else if(section==='audit'){const res=await AdminAPI.audit();content.innerHTML=`<h3 style="margin-bottom:1rem;font-family:'Syne',sans-serif">Audit Log (${res.total})</h3><table class="admin-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th></tr></thead><tbody>${(res.data||[]).map(a=>`<tr><td style="font-size:.65rem;color:var(--hin);font-family:'JetBrains Mono',monospace">${fmtFull(a.created_at)}</td><td>${esc(a.username||'System')}</td><td>${esc(a.action)}</td><td>${esc(a.entity_type||'')} ${a.entity_id||''}</td></tr>`).join('')}</tbody></table>`;}
  }catch(e){content.innerHTML=`<div style="color:var(--red)">${e.message}</div>`;}
}
async function banUser(id,ban){try{await AdminAPI.updateUser(id,{is_banned:ban});loadAdminSection('users',null);showToast(ban?'User banned':'User unbanned');}catch(e){showToast(e.message,'error');}}
async function removeComment(id){try{await AdminAPI.removeComment(id);loadAdminSection('flags',null);showToast('Comment removed');}catch(e){showToast(e.message,'error');}}

/* ══════════════════════════════
   CHAT
══════════════════════════════ */
function toggleChat(){chatOpen=!chatOpen;document.getElementById('chat-panel').classList.toggle('open',chatOpen);}
function addCMsg(role,text){
  const isAI=role==='assistant';const d=document.createElement('div');d.className=`cmsg ${isAI?'ai-cmsg':'usr-cmsg'}`;
  d.innerHTML=`<div class="cmsg-av ${isAI?'ai-av':'usr-av'}">${isAI?'AI':'You'}</div><div><div class="cmsg-nm">${isAI?'YorStatus AI':'You'}</div><div class="cmsg-bub">${esc(text)}</div></div>`;
  const m=document.getElementById('chat-msgs');m.appendChild(d);m.scrollTop=m.scrollHeight;
}
function addThinking(){const d=document.createElement('div');d.id='tbub';d.className='cmsg ai-cmsg';d.innerHTML=`<div class="cmsg-av ai-av">AI</div><div><div class="cmsg-nm">YorStatus AI</div><div class="think-bub"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div>`;document.getElementById('chat-msgs').appendChild(d);}
async function sendChat(){
  const ci=document.getElementById('chat-inp');const sb=document.getElementById('chat-send');const txt=ci.value.trim();if(!txt)return;
  ci.value='';sb.disabled=true;addCMsg('user',txt);chatHist.push({role:'user',content:txt});addThinking();
  try{const res=await ChatAPI.send(chatHist.slice(-12));document.getElementById('tbub')?.remove();addCMsg('assistant',res.reply);chatHist.push({role:'assistant',content:res.reply});}
  catch(e){document.getElementById('tbub')?.remove();addCMsg('assistant','Error: '+e.message);}
  sb.disabled=false;document.getElementById('chat-msgs').scrollTop=9999;
}
document.getElementById('chat-inp').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});

/* ══════════════════════════════
   INIT
══════════════════════════════ */
renderUserNav();
loadDashboard();
if(isLoggedIn())initSocket();
