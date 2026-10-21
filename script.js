import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithPopup,GoogleAuthProvider,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,deleteUser} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,deleteDoc,collection,query,where,getDocs,addDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
import {PRESET,BOARDS,CLASSES} from "./data.js";
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id),ST=["Not started","In progress","Done","Revision"],GM=/^[a-z0-9._+-]+@gmail\.com$/i;
const ERR={"auth/invalid-credential":"Incorrect email or password.","auth/email-already-in-use":"This Gmail is already registered. Please sign in instead.","auth/weak-password":"Password must be at least 8 characters.","auth/too-many-requests":"Too many attempts. Please try again later.","auth/popup-closed-by-user":"Sign-in was cancelled.","auth/cancelled-popup-request":"Sign-in was cancelled.","auth/unauthorized-domain":"This website is not authorised in Firebase yet. Add its domain under Authentication > Settings > Authorized domains.","auth/operation-not-allowed":"This sign-in method is not enabled in Firebase yet.","auth/popup-blocked":"Your browser blocked the sign-in pop-up. Allow pop-ups for this site and try again.","auth/network-request-failed":"Network error. Please check your connection.",def:"Something went wrong. Please try again."};
const errMsg=x=>{console.error(x);return ERR[x.code]||ERR.def+" ("+(x.code||"unknown")+")"};
let U=null,D=null,view="load",mode="in",tab="home",cur="Maths",lastSent=0,saveT,pre=null;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pct=a=>a.length?Math.round(a.filter(c=>c.s==2).length/a.length*100):0,left=a=>a.filter(c=>c.s<2).length;
function note(t,ok){const m=$("msg");if(m){m.textContent=t;m.className="msg "+(ok?"okm":"err")}}
function hint(e){const d=(e.split("@")[1]||"").toLowerCase();if(["gmial.com","gamil.com","gmail.co","gmail.con","gmai.com","gmail.in"].includes(d))return `Did you mean ${e.split("@")[0]}@gmail.com?`;return "Please enter a valid Gmail address, for example name@gmail.com."}
function daysTo(d){const t=new Date();t.setHours(0,0,0,0);return Math.round((new Date(d+"T00:00:00")-t)/864e5)}
function safe(u){u=(u||"").trim();if(!u)return"";if(!/^https?:\/\//i.test(u))u="https://"+u;try{const x=new URL(u);return/^https?:$/.test(x.protocol)?x.href:""}catch(e){return""}}
const key=()=>D.board+"-"+D.cls,base=()=>PRESET[key()]||{};
function fresh(name,school,board,cls){const p=PRESET[board+"-"+cls],subs={};if(p){for(const k in p)subs[k]=p[k].map(n=>({n,s:0}))}else(cls>=11?["English"]:["Maths","Science","Social Science","English","Hindi"]).forEach(k=>subs[k]=[]);return{name,school,board,cls,photo:"",tt:{school:{},me:{}},books:[],subs,exams:[],links:{web:"",wa:"",groups:[]}}}
function fromDb(d){const subs={};(d.subjects||[]).forEach(s=>subs[s.n]=s.ch||[]);return{name:d.name||"",school:d.school||"",board:d.board||"CBSE",cls:d.cls||9,photo:d.photo||"",tt:{school:d.tt?.school||{},me:d.tt?.me||{}},books:d.books||[],subs,exams:d.exams||[],links:Object.assign({web:"",wa:"",groups:[]},d.links)}}
function save(){clearTimeout(saveT);saveT=setTimeout(async()=>{try{await setDoc(doc(db,"students",U.uid),{name:D.name,school:D.school,board:D.board,cls:D.cls,photo:D.photo||"",tt:D.tt,books:D.books,subjects:Object.entries(D.subs).map(([n,ch])=>({n,ch})),exams:D.exams,links:D.links,updatedAt:serverTimestamp()})}catch(e){note("Could not save your changes. Please check your connection.")}},700)}
async function enter(u){U=u;
 if(!u){D=null;NC={key:"",list:[],busy:false};lib={v:"notes",c:null,draft:{t:"",x:""},pend:[]};view="auth";return render()}
 if(!/@gmail\.com$/i.test(u.email||"")){await signOut(auth);view="auth";render();return note("Please use a Gmail account.")}
 if(!u.emailVerified){view="verify";return render()}
 view="load";render();
 try{const s=await getDoc(doc(db,"students",u.uid));if(s.exists()){D=fromDb(s.data());view="main";pre=null;tab="home"}else view="setup"}catch(e){view="fail"}
 render()}
onAuthStateChanged(auth,enter);
function shell(inner){return `<div class="auth"><div class="brand"><span class="mark">P</span>Padhai Saathi</div><p class="mute center">Study planner for school students</p>${inner}<div class="foot"><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Use</a></div></div>`}
function render(){const A=$("app");
 if(view=="load")A.innerHTML=`<div class="spin">Loading…</div>`;
 else if(view=="fail")A.innerHTML=shell(`<div class="card"><p>We could not load your data. Check your connection and try again.</p><button class="btn full" onclick="location.reload()">Try again</button><button class="link" onclick="out()">Sign out</button></div>`);
 else if(view=="auth")A.innerHTML=shell(`<div class="card"><button class="gbtn" onclick="google()">Continue with Google</button><div class="or">or use your Gmail and password</div>
 <div class="seg"><button class="${mode=="in"?"on":""}" onclick="setMode('in')">Sign in</button><button class="${mode=="up"?"on":""}" onclick="setMode('up')">Create account</button></div>
 ${pre?`<p class="mute">Signing in as <b>${esc(pre.email)}</b>${pre.g?". Tip: use Continue with Google.":""}</p>`:""}<label for="em">Gmail address</label><input id="em" type="email" autocomplete="email" placeholder="name@gmail.com" maxlength="100" value="${pre?esc(pre.email):""}">
 <label for="pw">Password</label><input id="pw" type="password" autocomplete="${mode=="in"?"current-password":"new-password"}" placeholder="At least 8 characters" maxlength="100">
 ${mode=="up"?`<label class="chk"><input type="checkbox" id="ag"><span>I agree to the <a href="terms.html">Terms</a> and <a href="privacy.html">Privacy Policy</a>. If I am under 18, my parent or guardian knows I am using this site.</span></label>`:""}
 <div id="msg" class="msg" role="alert"></div><button class="btn full" onclick="submitAuth()">${mode=="in"?"Sign in":"Create account"}</button>
 ${mode=="in"?`<button class="link" onclick="forgot()">Forgot password?</button>`:""}</div>${accList()}`);
 else if(view=="verify")A.innerHTML=shell(`<div class="card"><h2 style="margin-top:0">Verify your Gmail</h2><p>We sent a verification link to <b>${esc(U.email)}</b>. Open it, then come back and press the button below. Check your Spam folder if you do not see it.</p><div id="msg" class="msg" role="alert"></div><button class="btn full" onclick="checkV()">I have verified</button><button class="link" onclick="resend()">Resend email</button><button class="link" onclick="out()">Use a different account</button></div>`);
 else if(view=="setup")A.innerHTML=shell(`<div class="card"><h2 style="margin-top:0">Set up your profile</h2><label for="nm">Your name</label><input id="nm" autocomplete="name" maxlength="60"><label for="sc">School name</label><input id="sc" maxlength="100"><label for="bd">Board</label><select id="bd">${BOARDS.map(b=>`<option>${esc(b)}</option>`).join("")}</select><label for="cl">Class</label><select id="cl">${CLASSES.map(c=>`<option ${c==9?"selected":""}>${c}</option>`).join("")}</select><div id="msg" class="msg" role="alert"></div><button class="btn full" onclick="setup()">Start</button></div>`);
 else main()}
const tc=t=>String(t||"").toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());
const AK="ps_accounts";
function accs(){try{return JSON.parse(localStorage.getItem(AK))||[]}catch(e){return[]}}
function saveAcc(a){try{localStorage.setItem(AK,JSON.stringify(a.slice(0,5)))}catch(e){}}
function remember(){if(!U||!D)return;saveAcc([{email:U.email,name:D.name,g:U.providerData.some(p=>p.providerId=="google.com")},...accs().filter(x=>x.email!=U.email)])}
const hasPic=()=>!!(D&&D.photo&&D.photo.startsWith("data:image/jpeg;base64,"));
function avatar(){return hasPic()?`<img src="${D.photo}" alt="">`:esc(tc(D.name).charAt(0)||"S")}
function accList(){const a=accs();return a.length?`<div class="card"><label>Accounts on this device</label>${a.map((x,i)=>`<button class="ghost full" style="margin-top:8px;text-align:left" onclick="pickAcc(${i})">${esc(tc(x.name))} · ${esc(x.email)}</button>`).join("")}</div>`:""}
const openEx=new Set();
document.addEventListener("click",()=>{const m=document.getElementById("menu");if(m)m.classList.remove("open")});
document.addEventListener("keydown",e=>{if(e.key=="Escape"){document.querySelectorAll(".lb").forEach(x=>x.remove());const m=document.getElementById("menu");if(m)m.classList.remove("open")}});
function chList(e,per){const ks=Object.keys(D.subs);return `<details class="sb" style="margin-top:10px" ${openEx.has(e.id)?"open":""} ontoggle="tg('${esc(e.id)}',this.open)"><summary><b>Update chapters</b><span class="mute">${per.reduce((n,p)=>n+p.items.length,0)} chapters</span></summary>${per.map(p=>`<div class="mute" style="padding:8px 14px 0;font-weight:700">${esc(p.s)}</div>${p.items.map(o=>`<div class="ch" style="padding:8px 14px"><span style="font-weight:500">${esc(o.c.n)}</span><select class="s${o.c.s}" aria-label="Status of ${esc(o.c.n)}" onchange="setX(${ks.indexOf(p.s)},${o.i},this.value)">${ST.map((t,j)=>`<option value="${j}" ${j==o.c.s?"selected":""}>${t}</option>`).join("")}</select></div>`).join("")}`).join("")}</details>`}
const DAYS=[["mon","Mon","Monday"],["tue","Tue","Tuesday"],["wed","Wed","Wednesday"],["thu","Thu","Thursday"],["fri","Fri","Friday"],["sat","Sat","Saturday"],["sun","Sun","Sunday"]];
const KINDS={school:["Period","Extra class","Break","Assembly","Other"],me:["Study","Tuition","Exercise","Hobby","Rest","Other"]};
const todayK=()=>["sun","mon","tue","wed","thu","fri","sat"][new Date().getDay()];
let ttV="school",ttD=todayK(),ttE=null;
const ttList=(w,d)=>((D.tt[w]||{})[d]||[]).slice().sort((a,b)=>a.s<b.s?-1:1);
const f12=t=>{const[h,m]=t.split(":").map(Number);return(h%12||12)+":"+String(m).padStart(2,"0")+" "+(h<12?"AM":"PM")};
const uid=()=>Date.now()+Math.random().toString(36).slice(2,7);
function todayCard(){const k=todayK(),td=[...ttList("school",k).map(x=>({...x,w:"School"})),...ttList("me",k).map(x=>({...x,w:"My schedule"}))].sort((a,b)=>a.s<b.s?-1:1);
 return `<h2>Today</h2><div class="card">${td.length?td.map(x=>`<div class="ch"><span><b>${f12(x.s)} – ${f12(x.e)}</b><div class="mute">${esc(x.n)} · ${esc(x.k)}</div></span><span class="mute" style="flex:none">${x.w}</span></div>`).join(""):`<p class="mute" style="margin:0">Nothing planned for today. <button class="link" style="padding:0" onclick="go('tt')">Add your timetable</button></p>`}</div>`}
function timetable(){const L=ttList(ttV,ttD),ed=ttE&&L.find(x=>x.id==ttE),dn=DAYS.find(d=>d[0]==ttD)[2];
 const cps=[["wk","Monday to Friday"],["six","Monday to Saturday"],["all","All 7 days"],...DAYS.filter(d=>d[0]!=ttD).map(d=>[d[0],"Only "+d[2]])];
 let h=`<h2>Timetable</h2><div class="seg"><button class="${ttV=="school"?"on":""}" onclick="ttSet('school')">School timetable</button><button class="${ttV=="me"?"on":""}" onclick="ttSet('me')">My daily schedule</button></div><div class="tabs">${DAYS.map(([k,l])=>`<button class="${k==ttD?"on":""}" onclick="ttDay('${k}')">${l}${k==todayK()?" <small>Today</small>":""}</button>`).join("")}</div>`;
 h+=`<div class="card"><div class="row" style="margin-bottom:6px"><b>${dn}</b><span class="mute">${L.length} ${L.length==1?"entry":"entries"}</span></div>${L.length?L.map(x=>`<div class="ch"><span><b>${f12(x.s)} – ${f12(x.e)}</b><div class="mute">${esc(x.n)} · ${esc(x.k)}</div></span><button class="ghost" onclick="ttEdit('${x.id}')">Edit</button><button class="x" aria-label="Remove entry" onclick="ttDel('${x.id}')">×</button></div>`).join(""):`<p class="mute" style="margin:0">Nothing added for ${dn} yet.</p>`}</div>`;
 h+=`<div class="card"><b>${ed?"Edit entry":"Add an entry"}</b><div class="two" style="margin-top:8px"><div><label for="t1">Start time</label><input type="time" id="t1" value="${ed?ed.s:""}"></div><div><label for="t2">End time</label><input type="time" id="t2" value="${ed?ed.e:""}"></div></div><label for="tn">${ttV=="school"?"Subject or activity":"Activity"}</label><input id="tn" list="tsub" maxlength="60" placeholder="${ttV=="school"?"For example, Maths":"For example, Revise Science"}" value="${ed?esc(ed.n):""}"><datalist id="tsub">${Object.keys(D.subs).map(k=>`<option value="${esc(k)}">`).join("")}</datalist><label for="tk">Type</label><select id="tk">${KINDS[ttV].map(k=>`<option ${ed&&ed.k==k?"selected":""}>${k}</option>`).join("")}</select>${ed?"":dayPicker()}<button class="btn" onclick="ttSave()">${ed?"Save changes":"Add"}</button>${ed?`<button class="ghost" style="margin-left:8px" onclick="ttCancel()">Cancel</button>`:""}</div>`;
 if(L.length)h+=`<div class="card"><b>Copy ${dn} to other days</b><p class="mute" style="margin:2px 0 8px">Saves time if several days are the same. Entries on the chosen days are replaced.</p><div class="row"><select id="tcp" style="margin:0">${cps.map(([v,t])=>`<option value="${v}">${t}</option>`).join("")}</select><button class="ghost" style="flex:none" onclick="ttCopy()">Copy</button></div></div>`;
 h+=`<div class="card"><b>Download as PDF</b><p class="mute" style="margin:2px 0 8px">Choose what to include and the A4 page layout. In the window that opens, set the destination to "Save as PDF".</p><div class="two"><div><label for="pw">Include</label><select id="pw"><option value="school" ${ttV=="school"?"selected":""}>School timetable</option><option value="me" ${ttV=="me"?"selected":""}>My daily schedule</option><option value="both">Both</option></select></div><div><label for="po">Page layout</label><select id="po"><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></div></div><button class="btn" onclick="ttPdf()">Download PDF</button></div>`;
 return h}
let lib={v:"notes",c:null,draft:{t:"",x:""},pend:[]},NC={key:"",list:[],busy:false};
const okImg=d=>typeof d=="string"&&d.startsWith("data:image/jpeg;base64,");
function showImg(src,round){const d=document.createElement("div");d.className="lb";d.setAttribute("role","dialog");d.setAttribute("aria-label","Picture");d.innerHTML=`<div class="lbin"><img class="${round?"":"sq"}" src="${src}" alt="Picture"><button class="btn" id="lbx">Close</button></div>`;d.onclick=e=>{if(e.target.tagName!="IMG")d.remove()};document.body.appendChild(d);document.getElementById("lbx").focus()}
function shrink(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,1000/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.65))};im.onerror=rej;im.src=r.result};r.onerror=rej;r.readAsDataURL(f)})}
async function delNotes(){const sn=await getDocs(collection(db,"students",U.uid,"notes"));await Promise.all(sn.docs.map(d=>deleteDoc(d.ref)))}
async function loadNotes(){const key=cur+"|"+lib.c;NC={key,list:[],busy:true};render();let bad=false;
 try{const sn=await getDocs(query(collection(db,"students",U.uid,"notes"),where("s","==",cur),where("c","==",lib.c)));if(NC.key!=key)return;NC={key,list:sn.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.ts-a.ts),busy:false}}catch(e){console.error(e);NC={key,list:[],busy:false};bad=true}
 render();if(bad)note("Could not load your notes. Check your connection and the Firebase rules.")}
function dayPicker(){return `<label>Days</label><div class="dayp">${DAYS.map(([k,l])=>`<label class="dchip"><input type="checkbox" class="dk" value="${k}" ${k==ttD?"checked":""}><span>${l}</span></label>`).join("")}</div><div class="mute" style="margin:0 0 12px">Quick select: <button class="link" style="padding:0" onclick="ttPick('wk')">Mon–Fri</button> · <button class="link" style="padding:0" onclick="ttPick('six')">Mon–Sat</button> · <button class="link" style="padding:0" onclick="ttPick('all')">All days</button> · <button class="link" style="padding:0" onclick="ttPick('none')">Clear</button></div>`}
function library(){const ks=Object.keys(D.subs);if(!D.subs[cur])cur=ks[0];const a=D.subs[cur]||[],nt=lib.v=="notes";
 let h=`<h2>Notes and Books</h2><div class="seg"><button class="${nt?"on":""}" onclick="libSet('notes')">Notes</button><button class="${nt?"":"on"}" onclick="libSet('books')">Books</button></div><div class="tabs">${ks.map((k,i)=>`<button class="${k==cur?"on":""}" onclick="pickL(${i})">${esc(k)}</button>`).join("")}<button onclick="addSub()">+ Subject</button></div>`;
 if(lib.c===null)return h+`<div class="card"><div class="row"><b>${esc(cur)}</b><span class="mute">Choose a chapter</span></div><button class="subrow" onclick="libOpen('')"><b>General (whole subject)</b></button>${a.map((c,i)=>`<button class="subrow" onclick="libOpen(${i})">${esc(c.n)}</button>`).join("")}<div style="display:flex;gap:8px;margin-top:12px"><input id="lc" placeholder="Add a chapter" maxlength="100" style="margin:0"><button class="btn" onclick="libAddCh()">Add</button></div></div>`;
 h+=`<div class="row" style="margin:8px 0"><button class="ghost" onclick="libBack()">← Chapters</button><b style="text-align:right">${esc(cur)} · ${lib.c===""?"General":esc(lib.c)}</b></div>`;
 return h+(nt?notesPane():booksPane())}
function notesPane(){const key=cur+"|"+lib.c,L=NC.key==key?NC.list:[];
 let h=`<div class="card"><b>Add a note</b><label for="nt">Title</label><input id="nt" maxlength="80" value="${esc(lib.draft.t)}"><label for="nx">Note</label><textarea id="nx" rows="5" maxlength="5000">${esc(lib.draft.x)}</textarea><label>Pictures of your notes (up to 3)</label><div><label class="ghost pbtn">Choose pictures<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onchange="addImgs(this)"></label></div><div class="thumbs">${lib.pend.map((d,i)=>`<span class="th"><img src="${d}" alt="Picture ${i+1}"><button class="x" aria-label="Remove picture" onclick="rmImg(${i})">×</button></span>`).join("")}</div><button class="btn" onclick="noteSave()">Save note</button></div><h2>Saved notes</h2>`;
 if(NC.key!=key||NC.busy)return h+`<p class="mute">Loading…</p>`;
 return h+(L.length?L.map(n=>`<div class="card"><div class="row"><b>${esc(n.t||"Untitled")}</b><button class="x" aria-label="Delete note" onclick="noteDel('${esc(n.id)}')">×</button></div>${n.x?`<p style="white-space:pre-wrap;margin:8px 0">${esc(n.x)}</p>`:""}<div class="thumbs">${(n.im||[]).filter(okImg).map((d,i)=>`<span class="th"><button class="thb" onclick="viewNote('${esc(n.id)}',${i})"><img src="${d}" alt="Note picture ${i+1}"></button></span>`).join("")}</div><div class="mute">${new Date(n.ts).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div></div>`).join(""):`<p class="mute">No notes here yet.</p>`)}
function booksPane(){const L=D.books.filter(b=>b.s==cur&&b.c===lib.c);
 return `<div class="card"><b>Add a book</b><p class="mute" style="margin:2px 0 8px">Paste a link to the book, for example from Google Drive or the NCERT website. We save the link, not the file.</p><label for="bt">Book name</label><input id="bt" maxlength="100"><label for="bu">Link</label><input id="bu" placeholder="https://..." maxlength="300"><button class="btn" onclick="bookAdd()">Add book</button></div>${D.board=="CBSE"?`<a class="lnk" href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener">NCERT textbooks (official site)</a>`:""}<h2>Saved books</h2>`+(L.length?`<div class="card">${L.map(b=>{const u=safe(b.u);return `<div class="ch"><span>${esc(b.t)}</span>${u?`<a class="ghost" style="text-decoration:none" href="${esc(u)}" target="_blank" rel="noopener">Open</a>`:""}<button class="x" aria-label="Remove book" onclick="bookDel('${esc(b.id)}')">×</button></div>`}).join("")}</div>`:`<p class="mute">No books here yet.</p>`)}
function navB(){return [["home","Home"],["syl","Syllabus"],["exam","Exams"],["tt","Timetable"],["lib","Library"],["sch","My School"]].map(([k,t])=>`<button class="${tab==k?"on":""}" onclick="go('${k}')">${t}</button>`).join("")}
function main(){remember();const all=Object.values(D.subs).flat();
 let h=`<header class="appbar"><div class="appin"><div class="logo"><span class="mark">P</span>Padhai Saathi</div><div class="tnav">${navB()}</div><div class="who"><button class="av" onclick="toggleMenu(event)" aria-label="Account menu" aria-haspopup="menu">${avatar()}</button><div class="menu" id="menu" role="menu"><div class="mhead"><b>${esc(tc(D.name))}</b>${esc(U.email)}</div><button role="menuitem" onclick="go('prof')">My Profile</button><button role="menuitem" class="dn" onclick="out()">Sign Out</button></div></div></div></header><main class="wrap"><div id="msg" class="msg" role="alert"></div>`;
 h+=tab=="home"?home(all):tab=="syl"?syl(all):tab=="exam"?exam():tab=="tt"?timetable():tab=="lib"?library():tab=="prof"?prof():school();
 h+=`<div class="foot"><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Use</a></div></main><nav class="bnav">${navB()}</nav>`;
 $("app").innerHTML=h}
function home(all){const p=pct(all),done=all.filter(c=>c.s==2).length,ks=Object.keys(D.subs),up=D.exams.filter(e=>daysTo(e.d)>=0).sort((a,b)=>a.d<b.d?-1:1),nx=up[0],fd=d=>new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
 let h=`<section class="hero"><div class="hello">Hello, ${esc(tc(D.name.split(" ")[0]))}</div><div class="herosub">${esc(tc(D.school))}${D.school?" · ":""}${esc(D.board)} · Class ${D.cls}</div></section><div class="stats"><div class="stat"><span class="k">Overall progress</span><span class="v">${p}%</span><div class="bar"><i style="width:${p}%"></i></div></div><div class="stat"><span class="k">Chapters left</span><span class="v">${all.length-done}</span><span class="sub">${done} of ${all.length} done</span></div><div class="stat"><span class="k">Next exam</span><span class="v">${nx?daysTo(nx.d)+" days":"None yet"}</span><span class="sub">${nx?esc(nx.n||nx.s):"Add one in Exams"}</span></div></div>`;
 h+=todayCard();
 h+=`<h2>Subjects</h2><div class="card">${ks.length?ks.map((k,i)=>{const a=D.subs[k];return `<button class="subrow" onclick="openSub(${i})"><div class="row"><b>${esc(k)}</b><span class="mute">${a.filter(c=>c.s==2).length} of ${a.length} done · ${pct(a)}%</span></div><div class="bar"><i style="width:${pct(a)}%"></i></div></button>`}).join(""):`<p class="mute" style="margin:0">No subjects yet. Add one in the Syllabus tab.</p>`}</div><h2>Upcoming exams</h2>`;
 h+=up.length?`<div class="card">${up.slice(0,3).map(e=>{const n=daysTo(e.d),{a}=exStats(e);return `<button class="subrow" onclick="go('exam')"><div class="row"><div><b>${esc(e.n||e.s||"Exam")}</b><div class="mute">${fd(e.d)}</div></div><div style="text-align:right"><b class="exd ${n<=3?"near":""}">${n==0?"Today":n+" days"}</b><div class="mute">${pct(a)}% done</div></div></div></button>`}).join("")}</div>`:`<div class="card"><p class="mute" style="margin:0">No upcoming exams yet. <button class="link" style="padding:0" onclick="go('exam')">Add an exam</button></p></div>`;
 return h}
function syl(all){const p=pct(all),ks=Object.keys(D.subs);if(!D.subs[cur])cur=ks[0];const a=D.subs[cur]||[];
 let h="";
 if(!PRESET[key()])h+=`<div class="msg okm">Chapters for ${esc(D.board)} Class ${D.cls} are not preloaded yet. Add your own chapters below, subject by subject.</div>`;
 h+=`<div class="tabs">${ks.map((k,i)=>`<button class="${k==cur?"on":""}" onclick="pick(${i})">${esc(k)} <small>${pct(D.subs[k])}%</small></button>`).join("")}<button onclick="addSub()">+ Subject</button></div>`;
 h+=`<div class="card"><div class="row"><b>${esc(cur)}</b><span class="mute">${pct(a)}% done · ${left(a)} left</span></div><div class="bar"><i style="width:${pct(a)}%"></i></div>`;
 h+=a.length?"":`<p class="mute">No chapters yet. Add your first chapter below.</p>`;
 h+=a.map((c,i)=>`<div class="ch"><span>${esc(c.n)}</span><select class="s${c.s}" aria-label="Status of ${esc(c.n)}" onchange="setS(${i},this.value)">${ST.map((t,j)=>`<option value="${j}" ${j==c.s?"selected":""}>${t}</option>`).join("")}</select><button class="x" aria-label="Remove chapter" onclick="delCh(${i})">×</button></div>`).join("");
 h+=`<div style="display:flex;gap:8px;margin-top:10px"><input id="nc" placeholder="Add your own chapter" maxlength="100" style="margin:0"><button class="btn" onclick="addCh()">Add</button></div>`;
 if(!(cur in base()))h+=`<button class="ghost" style="margin-top:10px" onclick="delSub()">Remove this subject</button>`;
 return h+`</div>`}
function exStats(e){const sel=e.sel||[{s:e.s,ch:(D.subs[e.s]||[]).map(c=>c.n)}],a=[],per=[];sel.forEach(x=>{const b=(D.subs[x.s]||[]).filter(c=>x.ch.includes(c.n));a.push(...b);per.push({s:x.s,l:left(b),items:(D.subs[x.s]||[]).map((c,i)=>({c,i})).filter(o=>x.ch.includes(o.c.n))})});return{a,per}}
function prof(){const a=accs();return `<h2>Profile</h2><div class="card"><div class="pf"><button class="av big" ${hasPic()?`onclick="viewPic()" aria-label="View profile picture" title="View profile picture"`:"disabled"}>${avatar()}</button><div><label class="ghost pbtn">Change profile picture<input type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="photo(this)"></label>${hasPic()?`<button class="ghost" onclick="removePhoto()">Remove</button>`:""}<p class="mute" style="margin:6px 0 0">Your profile picture is saved only in your own account.</p></div></div><label for="pn">Name</label><input id="pn" value="${esc(D.name)}" maxlength="60"><label for="ps">School name</label><input id="ps" value="${esc(D.school)}" maxlength="100"><label for="pb">Board</label><select id="pb">${BOARDS.map(b=>`<option ${b==D.board?"selected":""}>${esc(b)}</option>`).join("")}</select><label for="pc">Class</label><select id="pc">${CLASSES.map(c=>`<option ${c==D.cls?"selected":""}>${c}</option>`).join("")}</select><p class="mute">If you change the board or class, you get a fresh syllabus for the new class and your exams are cleared. Your name, school, links and timetable are kept.</p><button class="btn" onclick="saveP()">Save changes</button></div>
<h2>Accounts on this device</h2><div class="card">${a.map((x,i)=>`<div class="ch"><span>${esc(tc(x.name))}<div class="mute">${esc(x.email)}</div></span>${x.email==U.email?`<span class="mute">Current</span>`:`<button class="ghost" onclick="switchTo(${i})">Switch</button>`}<button class="x" aria-label="Forget this account" onclick="forget(${i})">×</button></div>`).join("")}<button class="ghost" style="margin-top:10px" onclick="addAcc()">+ Add another account</button><p class="mute">Switching asks you to sign in again. Passwords are never saved on this device. Use the × to remove an account from this list.</p></div>
<h2>Start over or delete</h2><div class="card"><p class="mute" style="margin-top:0">Start over deletes your syllabus progress, exams, links, timetable and profile picture, and lets you enter all your details again. Your login stays. Delete account removes everything, including your login.</p><button class="ghost" onclick="resetP()">Start over with new details</button> <button class="ghost danger" onclick="delAcc()">Delete my account</button></div>`}
function exam(){let h=`<h2>Add an exam</h2><div class="card"><label for="en">Exam name</label><input id="en" placeholder="For example, Half-yearly" maxlength="60"><label for="ed">Exam date</label><input type="date" id="ed"><label>Syllabus for this exam</label><p class="mute" style="margin:0 0 4px">Open a subject and tick the chapters this exam covers.</p><div class="pick">${Object.entries(D.subs).map(([s,a],i)=>`<details class="sb"><summary><label class="chk" onclick="event.stopPropagation()"><input type="checkbox" data-all="${i}" onchange="selAll(${i},this.checked)"><b>${esc(s)}</b></label><span class="mute" id="cnt${i}">0 / ${a.length}</span></summary>${a.map((c,j)=>`<label class="chk ci"><input type="checkbox" class="cb" data-s="${i}" data-c="${j}" onchange="cnt(${i})">${esc(c.n)}</label>`).join("")}</details>`).join("")}</div><button class="btn" onclick="addEx()">Add exam</button></div><h2>Upcoming exams</h2>`;
 const ex=[...D.exams].sort((a,b)=>a.d<b.d?-1:1);
 if(!ex.length)h+=`<p class="mute">No exams yet. Add the first one from your date sheet above.</p>`;
 ex.forEach(e=>{const n=daysTo(e.d),{a,per}=exStats(e),l=left(a);
  const plan=n<0?"This exam is over.":l==0?"All chapters are done. Use the remaining days to revise.":n==0?`The exam is today. ${l} chapters are left, so go through the key points.`:`${n} days left and ${l} chapters remaining: ${l<=n?`about 1 chapter a day, with ${n-l} spare days for revision`:`about ${Math.ceil(l/n)} chapters a day`}.`;
  h+=`<div class="card"><div class="row"><div><b style="font-size:17px">${esc(e.n||e.s||"Exam")}</b><div class="mute">${new Date(e.d+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div></div><div style="text-align:right"><div class="days ${n>=0&&n<=3?"near":""}">${n<0?"–":n}</div><div class="mute">${n<0?"finished":"days left"}</div></div></div><div class="bar"><i style="width:${pct(a)}%"></i></div><div class="mute">${pct(a)}% done · ${l} of ${a.length} chapters left</div><div class="mute" style="margin-top:4px">${per.map(p=>`${esc(p.s)}: ${p.l} left`).join(" · ")}</div><div class="plan">${plan}</div>${chList(e,per)}<button class="ghost" style="margin-top:10px" onclick="delEx('${esc(e.id)}')">Remove</button></div>`});
 return h}
function school(){const L=D.links,w=safe(L.web),wa=safe(L.wa);
 let h=`<h2>My School</h2><div class="card"><label for="lw">School website</label><input id="lw" value="${esc(L.web)}" placeholder="www.myschool.edu.in" maxlength="200"><label for="lwa">School WhatsApp group link</label><input id="lwa" value="${esc(L.wa)}" placeholder="https://chat.whatsapp.com/..." maxlength="200"><button class="btn" onclick="saveL()">Save</button></div>`;
 if(w)h+=`<a class="lnk" href="${esc(w)}" target="_blank" rel="noopener">Open school website</a>`;
 if(wa)h+=`<a class="lnk" href="${esc(wa)}" target="_blank" rel="noopener">Open school WhatsApp group</a>`;
 h+=`<h2>Study groups</h2><div class="card"><input id="gn" placeholder="Group name" maxlength="60"><input id="gl" placeholder="WhatsApp or other link" maxlength="200"><button class="btn" onclick="addG()">Add group</button></div>`;
 L.groups.forEach((g,i)=>{const u=safe(g.l);h+=`<div class="row">${u?`<a class="lnk" style="flex:1" href="${esc(u)}" target="_blank" rel="noopener">${esc(g.n)}</a>`:`<span>${esc(g.n)}</span>`}<button class="x" aria-label="Remove group" onclick="delG(${i})">×</button></div>`});
 if(D.board!="CBSE")return h+`<h2>Textbooks</h2><p class="mute">Add your textbook or board website link as a study group above.</p>`;return h+`<h2>NCERT books</h2><p class="mute">Books open on NCERT's official website. We do not store them.</p><a class="lnk" href="https://ncert.nic.in/textbook.php" target="_blank" rel="noopener">NCERT textbooks (choose Class ${D.cls})</a><a class="lnk" href="https://epathshala.nic.in" target="_blank" rel="noopener">e-Pathshala</a>`}
const W={
 go(t){tab=t;render();scrollTo(0,0)},
 setMode(m){mode=m;render()},
 async google(){try{const gp=new GoogleAuthProvider();if(pre)gp.setCustomParameters({login_hint:pre.email});await signInWithPopup(auth,gp)}catch(x){note(errMsg(x))}},
 async submitAuth(){const e=$("em").value.trim().toLowerCase(),p=$("pw").value;
  if(!GM.test(e))return note(hint(e));if(p.length<8)return note(ERR["auth/weak-password"]);
  if(mode=="up"&&!$("ag").checked)return note("Please accept the Terms and Privacy Policy to continue.");
  try{if(mode=="up"){const c=await createUserWithEmailAndPassword(auth,e,p);lastSent=Date.now();await sendEmailVerification(c.user)}else await signInWithEmailAndPassword(auth,e,p)}catch(x){note(errMsg(x))}},
 async forgot(){const e=$("em").value.trim().toLowerCase();if(!GM.test(e))return note("Enter your Gmail address above first.");
  try{await sendPasswordResetEmail(auth,e)}catch(x){}note("If this Gmail has an account, a password reset link has been sent.",true)},
 async checkV(){try{await U.reload();if(U.emailVerified){await U.getIdToken(true);enter(U)}else note("Your email is not verified yet. Open the link we sent to your Gmail, then try again.")}catch(x){note(errMsg(x))}},
 async resend(){if(Date.now()-lastSent<60000)return note("Please wait a minute before requesting another email.");
  try{await sendEmailVerification(U);lastSent=Date.now();note("Verification email sent.",true)}catch(x){note(errMsg(x))}},
 out(){signOut(auth)},
 setup(){const n=$("nm").value.trim();if(!n)return note("Please enter your name.");D=fresh(n,$("sc").value.trim(),$("bd").value,+$("cl").value);view="main";save();render()},
 pick(i){cur=Object.keys(D.subs)[i];render()},
 setS(i,v){D.subs[cur][i].s=+v;save();render()},
 delCh(i){D.subs[cur].splice(i,1);save();render()},
 addCh(){const v=$("nc").value.trim();if(!v)return;D.subs[cur].push({n:v,s:0});save();render()},
 addSub(){const v=(prompt("Name of the new subject")||"").trim().slice(0,60);if(!v||D.subs[v]||v.startsWith("__"))return;D.subs[v]=[];cur=v;save();render()},
 delSub(){if(confirm(`Remove ${cur}?`)){delete D.subs[cur];D.books=D.books.filter(b=>b.s!=cur);D.exams=D.exams.map(e=>e.sel?{...e,sel:e.sel.filter(x=>x.s!=cur)}:e).filter(e=>e.sel?e.sel.length:e.s!=cur);cur=Object.keys(D.subs)[0];save();render()}},
 addEx(){const nm=$("en").value.trim();if(!nm)return note("Please enter the exam name.");if(!$("ed").value)return note("Please choose the exam date.");
  const ks=Object.keys(D.subs),sel=[];ks.forEach((k,i)=>{const ch=[...document.querySelectorAll(`.cb[data-s="${i}"]`)].filter(x=>x.checked).map(x=>D.subs[k][+x.dataset.c].n);if(ch.length)sel.push({s:k,ch})});
  if(!sel.length)return note("Please tick at least one chapter for this exam.");
  D.exams.push({id:Date.now()+"",d:$("ed").value,n:nm,sel});save();render()},
 selAll(i,v){document.querySelectorAll(`.cb[data-s="${i}"]`).forEach(x=>x.checked=v);W.cnt(i)},
 cnt(i){const b=[...document.querySelectorAll(`.cb[data-s="${i}"]`)],n=b.filter(x=>x.checked).length,al=document.querySelector(`[data-all="${i}"]`);$("cnt"+i).textContent=n+" / "+b.length;al.checked=n==b.length&&n>0;al.indeterminate=n>0&&n<b.length},
 saveP(){const n=$("pn").value.trim();if(!n)return note("Please enter your name.");const nb=$("pb").value,nc=+$("pc").value;
  if(nb!=D.board||nc!=D.cls){if(!confirm(`Switch to ${nb} Class ${nc}? You will get a fresh syllabus for the new class and your exams will be cleared.`))return;const f=fresh(n,"",nb,nc);D.subs=f.subs;D.exams=[];D.board=nb;D.cls=nc;cur=Object.keys(D.subs)[0]}
  D.name=n;D.school=$("ps").value.trim();save();render();note("Profile updated.",true)},
 photo(inp){const f=inp.files[0];if(!f)return;if(!/^image\/(jpeg|png|webp)$/.test(f.type))return note("Please choose a JPG, PNG or WebP image.");
  const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas");c.width=c.height=320;const m=Math.min(im.width,im.height);c.getContext("2d").drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,320,320);D.photo=c.toDataURL("image/jpeg",.8);save();render();note("Profile picture updated.",true)};im.onerror=()=>note("That image could not be read.");im.src=r.result};r.readAsDataURL(f)},
 removePhoto(){D.photo="";save();render()},
 pickAcc(i){pre=accs()[i];mode="in";render()},
 switchTo(i){pre=accs()[i];mode="in";signOut(auth)},
 addAcc(){pre=null;mode="in";signOut(auth)},
 forget(i){const a=accs();a.splice(i,1);saveAcc(a);render()},
 async resetP(){if(!confirm("Delete all your syllabus progress, exams, links, timetable and profile picture, and start again with new details? Your login stays."))return;try{clearTimeout(saveT);await delNotes();await deleteDoc(doc(db,"students",U.uid));D=null;view="setup";render()}catch(x){note(errMsg(x))}},
 async delAcc(){if(!confirm("Permanently delete your account and all your data? This cannot be undone."))return;const em=U.email;
  try{clearTimeout(saveT);await delNotes();await deleteDoc(doc(db,"students",U.uid));await deleteUser(auth.currentUser);saveAcc(accs().filter(a=>a.email!=em))}
  catch(x){note(x.code=="auth/requires-recent-login"?"Your data is deleted, but for safety the login needs a fresh sign-in. Sign out, sign in again, then press Delete my account once more.":errMsg(x))}},
 toggleMenu(ev){ev.stopPropagation();document.getElementById("menu").classList.toggle("open")},
 tg(id,o){o?openEx.add(id):openEx.delete(id)},
 setX(si,i,v){const k=Object.keys(D.subs)[si];if(!k)return;D.subs[k][i].s=+v;save();render()},
 viewPic(){if(hasPic())showImg(D.photo,true)},
 openSub(i){cur=Object.keys(D.subs)[i];tab="syl";render();scrollTo(0,0)},
 ttSet(v){ttV=v;ttE=null;render()},
 ttDay(d){ttD=d;ttE=null;render()},
 ttEdit(id){ttE=id;render();scrollTo(0,document.body.scrollHeight)},
 ttCancel(){ttE=null;render()},
 ttDel(id){const w=D.tt[ttV]=D.tt[ttV]||{};w[ttD]=(w[ttD]||[]).filter(x=>x.id!=id);ttE=null;save();render()},
 ttSave(){const s=$("t1").value,e=$("t2").value,n=$("tn").value.trim(),k=$("tk").value;
  if(!s||!e)return note("Please choose the start and end time.");if(e<=s)return note("The end time must be after the start time.");if(!n)return note("Please enter the subject or activity.");
  const w=D.tt[ttV]=D.tt[ttV]||{},days=ttE?[ttD]:[...document.querySelectorAll(".dk:checked")].map(x=>x.value);
  if(!days.length)return note("Please choose at least one day.");
  let clash=null;
  days.forEach(d=>{const a=w[d]=w[d]||[];clash=clash||a.find(x=>x.id!=ttE&&s<x.e&&e>x.s);
   if(ttE){const x=a.find(x=>x.id==ttE);if(x)Object.assign(x,{s,e,n,k})}else a.push({id:uid(),s,e,n,k})});
  ttE=null;save();render();note(clash?`Saved. It overlaps with "${clash.n}".`:days.length>1?`Saved for ${days.length} days.`:"Saved.",true)},
 ttPick(w){const n={wk:5,six:6,all:7,none:0}[w];document.querySelectorAll(".dk").forEach((x,i)=>x.checked=i<n)},
 ttCopy(){const v=$("tcp").value,src=ttList(ttV,ttD),all=DAYS.map(d=>d[0]),T={wk:all.slice(0,5),six:all.slice(0,6),all}[v]||[v],to=T.filter(d=>d!=ttD);
  if(!src.length||!to.length)return;if(!confirm(`Copy this day to ${to.length} other day(s)? Their current entries will be replaced.`))return;
  D.tt[ttV]=D.tt[ttV]||{};to.forEach(d=>D.tt[ttV][d]=src.map(x=>({...x,id:uid()})));save();render();note("Copied.",true)},
 libSet(v){lib.v=v;lib.c=null;render()},
 pickL(i){cur=Object.keys(D.subs)[i];lib.c=null;render()},
 libOpen(i){lib.c=i===""?"":D.subs[cur][i].n;lib.draft={t:"",x:""};lib.pend=[];render();if(lib.v=="notes")loadNotes()},
 libBack(){lib.c=null;render()},
 libAddCh(){const v=$("lc").value.trim();if(!v)return;D.subs[cur].push({n:v,s:0});save();render()},
 async addImgs(inp){W.keepDraft();let m="";for(const f of [...inp.files]){if(lib.pend.length>=3){m="You can add up to 3 pictures to a note.";break}
   if(!/^image\/(jpeg|png|webp)$/.test(f.type)){m="Please choose JPG, PNG or WebP pictures.";continue}
   try{lib.pend.push(await shrink(f));if(lib.pend.join("").length>850000){lib.pend.pop();m="The pictures are too large. Use fewer or smaller pictures."}}catch(e){m="One picture could not be read."}}
  render();if(m)note(m)},
 keepDraft(){const t=$("nt"),x=$("nx");if(t&&x)lib.draft={t:t.value,x:x.value}},
 rmImg(i){W.keepDraft();lib.pend.splice(i,1);render()},
 async noteSave(){W.keepDraft();const t=lib.draft.t.trim(),x=lib.draft.x.trim();if(!t&&!x&&!lib.pend.length)return note("Please add a title, a note or a picture.");
  const n={s:cur,c:lib.c,t,x,im:lib.pend,ts:Date.now()};
  try{const r=await addDoc(collection(db,"students",U.uid,"notes"),n);if(NC.key==cur+"|"+lib.c)NC.list.unshift({id:r.id,...n});lib.draft={t:"",x:""};lib.pend=[];render();note("Note saved.",true)}catch(e){console.error(e);note("Could not save the note. Check the Firebase rules and the picture size.")}},
 async noteDel(id){if(!confirm("Delete this note?"))return;try{await deleteDoc(doc(db,"students",U.uid,"notes",id));NC.list=NC.list.filter(n=>n.id!=id);render()}catch(e){note(errMsg(e))}},
 viewNote(id,i){const n=NC.list.find(x=>x.id==id),d=n&&(n.im||[]).filter(okImg)[i];if(d)showImg(d,false)},
 bookAdd(){const t=$("bt").value.trim(),u=$("bu").value.trim();if(!t)return note("Please enter the book name.");if(!safe(u))return note("Please paste a valid link.");D.books.push({id:uid(),s:cur,c:lib.c,t,u});save();render()},
 bookDel(id){D.books=D.books.filter(b=>b.id!=id);save();render()},
 ttPdf(){const which=$("pw").value,ori=$("po").value;
  const page=(w,title)=>{const days=DAYS.filter(d=>ttList(w,d[0]).length||!["sat","sun"].includes(d[0])),any=DAYS.some(d=>ttList(w,d[0]).length);
   const cell=d=>{const L=ttList(w,d[0]);return L.length?L.map(x=>`<div class="pe"><b>${f12(x.s)} – ${f12(x.e)}</b><br>${esc(x.n)} <i>(${esc(x.k)})</i></div>`).join(""):"–"};
   const body=!any?`<p>No entries added yet.</p>`:ori=="landscape"?`<table><tr>${days.map(d=>`<th>${d[2]}</th>`).join("")}</tr><tr>${days.map(d=>`<td>${cell(d)}</td>`).join("")}</tr></table>`:`<table>${days.map(d=>`<tr><th>${d[2]}</th><td>${cell(d)}</td></tr>`).join("")}</table>`;
   return `<section><div class="pt">Padhai Saathi</div><div class="ps">${esc(tc(D.name))}${D.school?" · "+esc(tc(D.school)):""} · ${esc(D.board)} · Class ${D.cls}</div><h2>${title}</h2>${body}</section>`};
  const old=document.getElementById("printarea");if(old)old.remove();const os=document.getElementById("pgsty");if(os)os.remove();
  const st=document.createElement("style");st.id="pgsty";st.textContent=`@page{size:A4 ${ori};margin:12mm}`;document.head.appendChild(st);
  const d=document.createElement("div");d.id="printarea";d.className=ori;
  d.innerHTML=(which!="me"?page("school","School timetable"):"")+(which!="school"?page("me","My daily schedule"):"");
  document.body.appendChild(d);setTimeout(()=>window.print(),150)},
 delEx(id){D.exams=D.exams.filter(e=>e.id!=id);save();render()},
 saveL(){D.links.web=$("lw").value.trim();D.links.wa=$("lwa").value.trim();save();render();note("Saved.",true)},
 addG(){const n=$("gn").value.trim();if(!n)return;D.links.groups.push({n,l:$("gl").value.trim()});save();render()},
 delG(i){D.links.groups.splice(i,1);save();render()}};
Object.assign(window,W);
