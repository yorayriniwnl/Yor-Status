/**
 * YorStatus India Enterprise — API Client v2
 */
const API_BASE = '/api';
const SESSION_ID = (() => {
  let id = localStorage.getItem('ys_sid');
  if (!id) { id = 'ys_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('ys_sid', id); }
  return id;
})();
let AUTH_TOKEN = localStorage.getItem('ys_token') || null;
let CURRENT_USER = JSON.parse(localStorage.getItem('ys_user') || 'null');

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'x-session-id': SESSION_ID, ...options.headers };
  if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  try {
    const res = await fetch(API_BASE + path, { ...options, headers });
    if (res.status === 401) { logout(); return null; }
    if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || `HTTP ${res.status}`); }
    return await res.json();
  } catch(e) { console.error('API:', path, e.message); throw e; }
}

function setAuth(token, user) { AUTH_TOKEN = token; CURRENT_USER = user; localStorage.setItem('ys_token', token); localStorage.setItem('ys_user', JSON.stringify(user)); }
function logout() { AUTH_TOKEN = null; CURRENT_USER = null; localStorage.removeItem('ys_token'); localStorage.removeItem('ys_user'); renderUserNav(); }
function isLoggedIn() { return !!AUTH_TOKEN && !!CURRENT_USER; }
function isAdmin() { return ['admin','superadmin'].includes(CURRENT_USER?.role); }
function isMod() { return ['moderator','admin','superadmin'].includes(CURRENT_USER?.role); }

const AuthAPI        = { register: d=>apiFetch('/auth/register',{method:'POST',body:JSON.stringify(d)}), login: d=>apiFetch('/auth/login',{method:'POST',body:JSON.stringify(d)}), me: ()=>apiFetch('/auth/me'), logout: ()=>apiFetch('/auth/logout',{method:'POST'}), updateProfile: d=>apiFetch('/auth/profile',{method:'PATCH',body:JSON.stringify(d)}) };
const PoliticiansAPI = { list:(p={})=>apiFetch('/politicians?'+new URLSearchParams(p)), get:(id)=>apiFetch(`/politicians/${id}`), parties:(tab)=>apiFetch(`/politicians/parties?tab=${tab}`), topRated:()=>apiFetch('/politicians/top-rated'), updatePromise:(polId,prId,status)=>apiFetch(`/politicians/${polId}/promise/${prId}`,{method:'PATCH',body:JSON.stringify({status})}) };
const PartiesAPI     = { list:()=>apiFetch('/parties'), get:(slug)=>apiFetch(`/parties/${slug}`) };
const StatesAPI      = { list:(p={})=>apiFetch('/states?'+new URLSearchParams(p)), get:(name)=>apiFetch(`/states/${encodeURIComponent(name)}`), parties:()=>apiFetch('/states/parties'), leaderboard:()=>apiFetch('/states/leaderboard') };
const LegalAPI       = { all:(p={})=>apiFetch('/legal?'+new URLSearchParams(p)), byPol:(id)=>apiFetch(`/legal/${id}`), stats:()=>apiFetch('/legal/meta/stats'), cats:()=>apiFetch('/legal/meta/categories'), add:(d)=>apiFetch('/legal',{method:'POST',body:JSON.stringify(d)}), update:(id,d)=>apiFetch(`/legal/${id}`,{method:'PATCH',body:JSON.stringify(d)}), del:(id)=>apiFetch(`/legal/${id}`,{method:'DELETE'}) };
const RatingsAPI     = { get:(id)=>apiFetch(`/ratings/${id}`), save:(d)=>apiFetch('/ratings',{method:'POST',body:JSON.stringify(d)}), helpful:(id)=>apiFetch(`/ratings/${id}/helpful`,{method:'POST'}) };
const CommentsAPI    = { list:(type,id,parent)=>apiFetch(`/comments?entity_type=${type}&entity_id=${id}${parent!==undefined?'&parent_id='+parent:''}`), post:(d)=>apiFetch('/comments',{method:'POST',body:JSON.stringify(d)}), vote:(id,vote)=>apiFetch(`/comments/${id}/vote`,{method:'POST',body:JSON.stringify({vote})}), flag:(id)=>apiFetch(`/comments/${id}/flag`,{method:'POST'}) };
const NewsAPI        = { list:(p={})=>apiFetch('/news?'+new URLSearchParams(p)), featured:()=>apiFetch('/news/featured') };
const PollsAPI       = { list:(p={})=>apiFetch('/polls?'+new URLSearchParams(p)), get:(id)=>apiFetch(`/polls/${id}`), vote:(id,opt)=>apiFetch(`/polls/${id}/vote`,{method:'POST',body:JSON.stringify({option_id:opt})}) };
const WatchlistAPI   = { list:()=>apiFetch('/watchlist'), add:(id)=>apiFetch(`/watchlist/${id}`,{method:'POST'}), remove:(id)=>apiFetch(`/watchlist/${id}`,{method:'DELETE'}) };
const AssetsAPI      = { get:(id)=>apiFetch(`/assets/${id}`), richest:()=>apiFetch('/assets') };
const TimelineAPI    = { get:(id)=>apiFetch(`/timeline/${id}`) };
const FactCheckAPI   = { byPol:(id)=>apiFetch(`/factcheck/${id}`), all:(p={})=>apiFetch('/factcheck?'+new URLSearchParams(p)) };
const SearchAPI      = { search:(q,type)=>apiFetch(`/search?q=${encodeURIComponent(q)}&type=${type||'all'}`), trending:()=>apiFetch('/search/trending') };
const StatsAPI       = { get:()=>apiFetch('/stats') };
const CompareAPI     = { get:(ids)=>apiFetch(`/compare?ids=${ids.join(',')}`) };
const ChatAPI        = { send:(msgs)=>apiFetch('/chat',{method:'POST',body:JSON.stringify({messages:msgs})}) };
const NotifsAPI      = { list:()=>apiFetch('/notifications'), readAll:()=>apiFetch('/notifications/read-all',{method:'PATCH'}), read:(id)=>apiFetch(`/notifications/${id}/read`,{method:'PATCH'}) };
const AnalyticsAPI   = { track:(path,et,eid)=>apiFetch('/analytics/pageview',{method:'POST',body:JSON.stringify({path,entity_type:et,entity_id:eid})}).catch(()=>{}), dashboard:()=>apiFetch('/analytics/dashboard') };
const AdminAPI       = { summary:()=>apiFetch('/admin/summary'), users:(p={})=>apiFetch('/admin/users?'+new URLSearchParams(p)), updateUser:(id,d)=>apiFetch(`/admin/users/${id}`,{method:'PATCH',body:JSON.stringify(d)}), flags:()=>apiFetch('/admin/flags'), removeComment:(id)=>apiFetch(`/admin/comments/${id}/remove`,{method:'PATCH'}), audit:(p=1)=>apiFetch(`/admin/audit?page=${p}`) };

/* party colors */
const PC = {BJP:"#FF6B00",INC:"#00C851",AAP:"#3B82F6",TMC:"#06B6D4",DMK:"#EF4444","JD(U)":"#A78BFA","JD(S)":"#FB923C",SP:"#F87171",TDP:"#FBBF24","CPI(M)":"#DC2626","NCP(SP)":"#34D399","SS(UBT)":"#FB923C",RJD:"#C084FC",JMM:"#4ADE80",NC:"#60A5FA",NPP:"#34D399",ZPM:"#38BDF8",NDPP:"#D4D4D4",AINRC:"#FBBF24",SKM:"#4ADE80","LJP(RV)":"#F87171"};
function pc(p){return PC[p]||'#FFD700';}
function imgUrl(th){return th?`https://unavatar.io/twitter/${th}`:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';}
function timeAgo(d){const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
