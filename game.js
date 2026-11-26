const DB_URL = "https://duoplay-10ad7-default-rtdb.firebaseio.com";
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get('room');
let myRole = roomId ? 'GUEST' : 'HOST';
if (!roomId) roomId = Math.floor(1000 + Math.random() * 9000).toString();
const mySymbol = myRole === 'HOST' ? '❤️' : '⚡';

document.getElementById('roomCode').innerText = '#' + roomId;
document.getElementById('roleTag').innerText = myRole === 'HOST' ? '(❤️ Host)' : '(⚡ Guest)';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(f, t, d) {
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.value = f; g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  } catch(e) {}
}

let coins = 1000;
function updateCoins(amt) {
  coins += amt; document.getElementById('coins').innerText = coins.toLocaleString();
  if (amt > 0) { playTone(660,'sine',0.15); setTimeout(()=>playTone(880,'sine',0.25),120); }
}
function watchAdReward() { alert("🎬 Ad Watched! +500 Gold Coins added."); updateCoins(500); }

function inviteWhatsApp() {
  const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  const msg = encodeURIComponent(`Join my private DuoPlay room (#${roomId}) to chat & play games live together! ❤️🎲\n${link}`);
  window.open(`https://wa.me{msg}`, '_blank');
}
function joinManualRoom() {
  const code = prompt("Enter 4-digit Room Code from your partner:");
  if (code && code.trim()) window.location.href = `${window.location.origin}${window.location.pathname}?room=${code.replace('#','').trim()}`;
}

let lastChatCount = 0;
async function pushChat(txt) {
  await fetch(`${DB_URL}/rooms/${roomId}/chat.json`, { method: 'POST', body: JSON.stringify({ sender: myRole, text: txt, ts: Date.now() }) });
}
function sendMsg() {
  const inp = document.getElementById('chatInput'), txt = inp.value.trim();
  if (!txt) return;
  playTone(440,'sine',0.08); inp.value = ''; pushChat(txt);
}

async function syncRoomState() {
  try {
    const res = await fetch(`${DB_URL}/rooms/${roomId}.json`);
    const data = await res.json();
    if (!data) return;
    if (data.chat) {
      const msgs = Object.values(data.chat);
      if (msgs.length !== lastChatCount) {
        const box = document.getElementById('messages'); box.innerHTML = '';
        msgs.forEach(m => {
          const d = document.createElement('div'); d.className = 'msg ' + (m.sender === myRole ? 'me' : 'partner');
          d.innerText = m.text; box.appendChild(d);
        });
        box.scrollTop = box.scrollHeight;
        if (msgs.length > lastChatCount && msgs[msgs.length-1].sender !== myRole) playTone(540,'sine',0.08);
        lastChatCount = msgs.length;
      }
    }
    if (data.ttt) {
      bState = data.ttt.board || Array(9).fill(''); tttTurn = data.ttt.turn || 'HOST'; gAct = !data.ttt.over;
      renderBoard(); document.getElementById('turn-status').innerText = data.ttt.status || (tttTurn === myRole ? `Your Turn (${mySymbol})` : "Partner's Turn...");
    }
    if (data.ludo) {
      p1 = data.ludo.p1 || 0; p2 = data.ludo.p2 || 0; ludoTurn = data.ludo.turn || 'HOST'; ludoOver = !!data.ludo.over;
      document.getElementById('dice-box').innerText = data.ludo.dice || '🎲';
      document.getElementById('ludo-status').innerText = data.ludo.status || (ludoTurn === myRole ? 'Your Turn! Tap Dice' : "Partner's Turn...");
      renderLudo();
    }
  } catch(e) {}
}
setInterval(syncRoomState, 1200);

function openPanel(id) {
  playTone(500,'triangle',0.07); document.getElementById('lobby-view').style.display = 'none';
  document.querySelectorAll('.game-panel').forEach(p => p.style.display = 'none');
  document.getElementById(id).style.display = 'flex';
}
function showLobby() {
  playTone(380,'triangle',0.07); document.querySelectorAll('.game-panel').forEach(p => p.style.display = 'none');
  document.getElementById('lobby-view').style.display = 'block';
}

let p1 = 0, p2 = 0, ludoTurn = 'HOST', ludoOver = false;
const safeTiles = '4,9,14,19'.split(',').map(Number);
const diceFaces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
function initLudo(push) {
  p1 = 0; p2 = 0; ludoTurn = 'HOST'; ludoOver = false; renderLudo();
  if (push) fetch(`${DB_URL}/rooms/${roomId}/ludo.json`, { method:'PUT', body: JSON.stringify({ p1:0, p2:0, turn:'HOST', dice:'🎲', over:false, status:'Host (❤️) Tap Dice!' }) });
}
function renderLudo() {
  document.getElementById('p1-pos').innerText = p1; document.getElementById('p2-pos').innerText = p2;
  const tr = document.getElementById('ludo-track'); tr.innerHTML = '';
  for (let i = 1; i <= 21; i++) {
    const t = document.createElement('div'); t.className = 'ludo-tile' + (safeTiles.includes(i)?' safe':'') + (i===21?' goal':'');
    t.innerText = i===21?'👑':(p1===i&&p2===i?'❤️⚡':(p1===i?'❤️':(p2===i?'⚡':(safeTiles.includes(i)?'⭐':i))));
    tr.appendChild(t);
  }
}
function rollLudo() {
  if (ludoTurn !== myRole || ludoOver) return;
  const d = document.getElementById('dice-box'); d.classList.add('dice-spin'); playTone(700,'square',0.08);
  setTimeout(() => {
    d.classList.remove('dice-spin'); const r = Math.floor(Math.random()*6)+1, diceChar = diceFaces[r-1];
    if (myRole === 'HOST' && p1 + r <= 21) p1 += r;
    if (myRole === 'GUEST' && p2 + r <= 21) p2 += r;
    if (myRole === 'HOST' && p1 === p2 && p1 < 21 && !safeTiles.includes(p1)) { p2 = 0; pushChat("💥 Captured Guest token! Back to 0 😂"); }
    if (myRole === 'GUEST' && p2 === p1 && p2 < 21 && !safeTiles.includes(p2)) { p1 = 0; pushChat("💥 Captured Host token! Back to 0 ⚡"); }
    let over = false, status = '', nextTurn = r === 6 ? myRole : (myRole === 'HOST' ? 'GUEST' : 'HOST');
    if (p1 === 21 || p2 === 21) { over = true; status = `👑 ${myRole} Won +250 Coins!`; updateCoins(250); pushChat(`👑 ${myRole} won Royal Ludo! +250 🪙`); }
    else status = r === 6 ? `${myRole} rolled 6! Roll again 🎲` : `${nextTurn}'s Turn!`;
    fetch(`${DB_URL}/rooms/${roomId}/ludo.json`, { method:'PUT', body: JSON.stringify({ p1, p2, turn:nextTurn, dice:diceChar, over, status }) });
  }, 260);
}

let bState = Array(9).fill(''), tttTurn = 'HOST', gAct = true;
function resetBoard(push) {
  bState = Array(9).fill(''); tttTurn = 'HOST'; gAct = true;
  const b = document.getElementById('board'); b.innerHTML = '';
  bState.forEach((_, i) => { const c = document.createElement('div'); c.className = 'cell'; c.onclick = () => makeMove(i); b.appendChild(c); });
  if (push) fetch(`${DB_URL}/rooms/${roomId}/ttt.json`, { method:'PUT', body: JSON.stringify({ board:bState, turn:'HOST', over:false, status:'Host (❤️) Turn' }) });
}
function makeMove(i) {
  if (!gAct || tttTurn !== myRole || bState[i] !== '') return;
  playTone(600,'sine',0.07); bState[i] = mySymbol; renderBoard();
  let over = false, status = '', nextT = myRole === 'HOST' ? 'GUEST' : 'HOST';
  if (checkWin(mySymbol)) { over = true; status = `🏆 ${myRole} (${mySymbol}) Won +150 🪙!`; updateCoins(150); pushChat(`🏆 ${myRole} won Heart vs Bolt!`); }
  else if (!bState.includes('')) { over = true; status = "Draw! Tap Restart"; }
  else status = `${nextT}'s Turn!`;
  fetch(`${DB_URL}/rooms/${roomId}/ttt.json`, { method:'PUT', body: JSON.stringify({ board:bState, turn:nextT, over, status }) });
}
function renderBoard() {
  const cells = document.querySelectorAll('.cell'); if (cells.length === 0) resetBoard(false);
  document.querySelectorAll('.cell').forEach((c,i) => c.innerText = bState[i] || '');
}
function checkWin(p) { return ['012','345','678','036','147','258','048','246'].some(s => [...s].every(ch => bState[+ch] === p)); }

const qs = ["Who takes longer to get ready?","Who falls asleep first during movies?","Who says Sorry first?","Who orders more late-night snacks?","Who is the better cook?","Who scrolls on their phone more?","Who plans better surprises?","Who gets jealous faster?","Who cries during emotional movies?","Who is the funnier one?","Who takes better photos?","Who is always 10 minutes late?","Who gives better advice?","Who is more addicted to tea/coffee?","Who controls the playlist?","Who is the bigger overthinker?","Who impulse-buys more online?","Who remembers small details?","Who falls asleep faster?","Who loves the other a tiny bit more? 😉"];
let deck = [], roundCount = 0, roundMatches = 0;
function restartSync() {
  roundCount = 0; roundMatches = 0;
  document.querySelector('.sync-btns').innerHTML = `<button class="sync-opt" style="background:var(--pink);color:#fff;" onclick="answerSync('ME')">🙋‍♂️ Me</button><button class="sync-opt" style="background:var(--cyan);color:#000;" onclick="answerSync('PARTNER')">👉 Partner</button>`;
  nextSyncQ();
}
function nextSyncQ() {
  if (roundCount >= 10) {
    const pct = roundMatches * 10, bonus = pct >= 50 ? 300 : 100;
    updateCoins(bonus); pushChat(`💘 Couple Sync Result: ${pct}% Match! (+${bonus} 🪙)`);
    document.getElementById('sync-question').innerHTML = `<div style="font-size:24px;color:var(--gold);">${pct}% Match!</div><div style="font-size:12px;color:#9aa0b8;margin-top:6px;">Won +${bonus} Gold Coins!</div>`;
    document.querySelector('.sync-btns').innerHTML = `<button class="sync-opt" style="background:linear-gradient(90deg,var(--pink),var(--cyan));color:#000;" onclick="restartSync()">🔄 Play Next 10</button>`;
    return;
  }
  if (!deck.length) deck = [...qs].sort(() => Math.random() - 0.5);
  roundCount++;
  document.getElementById('sync-question').innerHTML = `<div style="font-size:10px;color:var(--cyan);margin-bottom:4px;">QUESTION ${roundCount}/10</div>` + deck.pop();
}
function answerSync(c) {
  const p = Math.random() > 0.35 ? c : (c==='ME'?'PARTNER':'ME');
  if (c === p) { roundMatches++; updateCoins(50); pushChat(`💘 Q${roundCount}: ${myRole} picked ${c} — MATCH! (+50 🪙)`); }
  else pushChat(`😂 Q${roundCount}: ${myRole} picked ${c}`);
  nextSyncQ();
}

let hL = [], vL = [], bxs = [], dTurn = 'ME', sc = {ME:0,AI:0};
function initDAB() {
  hL = Array(4).fill().map(()=>Array(3).fill(false)); vL = Array(3).fill().map(()=>Array(4).fill(false));
  bxs = Array(3).fill().map(()=>Array(3).fill('')); dTurn = 'ME'; sc = {ME:0,AI:0}; renderDAB();
}
function renderDAB() {
  document.getElementById('dab-score').innerText = `❤️ ${sc.ME} — ${sc.AI} ⚡`;
  const g = document.getElementById('dab-grid'); g.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    const hr = document.createElement('div'); hr.className = 'dab-row';
    for (let c = 0; c < 3; c++) {
      const d = document.createElement('div'); d.className = 'dot'; hr.appendChild(d);
      const l = document.createElement('div'); l.className = 'h-line'+(hL[r][c]?' '+hL[r][c]:'');
      l.onclick = () => clickDAB('H',r,c); hr.appendChild(l);
    }
    const ed = document.createElement('div'); ed.className = 'dot'; hr.appendChild(ed); g.appendChild(hr);
    if (r < 3) {
      const vr = document.createElement('div'); vr.className = 'dab-row';
      for (let c = 0; c < 4; c++) {
        const vl = document.createElement('div'); vl.className = 'v-line'+(vL[r][c]?' '+vL[r][c]:'');
        vl.onclick = () => clickDAB('V',r,c); vr.appendChild(vl);
        if (c < 3) { const bx = document.createElement('div'); bx.className = 'dab-box'; bx.innerText = bxs[r][c]; vr.appendChild(bx); }
      }
      g.appendChild(vr);
    }
  }
}
function clickDAB(t, r, c) {
  if (dTurn !== 'ME' || (t==='H'?hL[r][c]:vL[r][c])) return;
  if (t==='H') hL[r][c] = 'taken-me'; else vL[r][c] = 'taken-me';
  if (!chkBox('❤️','ME')) { dTurn = 'AI'; renderDAB(); setTimeout(aiDAB,400); }
  else { renderDAB(); if (sc.ME+sc.AI===9 && sc.ME>sc.AI) updateCoins(200); }
}
function aiDAB() {
  let m = [];
  for (let r=0;r<4;r++) for (let c=0;c<3;c++) if (!hL[r][c]) m.push(['H',r,c]);
  for (let r=0;r<3;r++) for (let c=0;c<4;c++) if (!vL[r][c]) m.push(['V',r,c]);
  if (!m.length) return;
  const [t,r,c] = m[Math.floor(Math.random()*m.length)];
  if (t==='H') hL[r][c] = 'taken-ai'; else vL[r][c] = 'taken-ai';
  if (chkBox('⚡','AI')) { renderDAB(); if (sc.ME+sc.AI<9) setTimeout(aiDAB,400); }
  else { dTurn = 'ME'; renderDAB(); }
}
function chkBox(ic, w) {
  let s = false;
  for (let r=0;r<3;r++) for (let c=0;c<3;c++) if (!bxs[r][c] && hL[r][c] && hL[r+1][c] && vL[r][c] && vL[r][c+1]) { bxs[r][c] = ic; sc[w]++; s = true; }
  return s;
}
syncRoomState();
