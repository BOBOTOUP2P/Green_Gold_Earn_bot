import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const GOOGLE_SHEET_API = "https://script.google.com/macros/s/AKfycbx7i3XFhXpMxl5ps9aIosFpBly-ih0y9e87yIJ5lMQejUcRhygF6rpBDavbaXnrDzX8/exec";

const firebaseConfig = {
  apiKey: "AIzaSyCjyPTgZrs_lYXXIVn0hZz3H64U47jEvjo",
  authDomain: "kbk-wallet-app.firebaseapp.com",
  databaseURL: "https://kbk-wallet-app-default-rtdb.firebaseio.com",
  projectId: "kbk-wallet-app",
  storageBucket: "kbk-wallet-app.firebasestorage.app",
  messagingSenderId: "298749872136",
  appId: "1:298749872136:web:0630e7b1efea1308c329bd",
  measurementId: "G-S35PQT4V2J"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let savedConfig = JSON.parse(localStorage.getItem("cached_admin_config") || "{}");

let CONFIG = {
  telegramLink: savedConfig.telegramLink || "https://t.me/",
  companyLogo: savedConfig.companyLogo || "https://i.ibb.co/Rkt5HqTQ/IMG-2370.jpg",
  companyName: savedConfig.companyName || "មាសបៃតង",
  qrMerchantName: savedConfig.qrMerchantName || "BOBOTOU TOPUP",
  userBotToken: savedConfig.userBotToken || "8619333638:AAHMdVIKg-1yo1sK_44Fd9vrNyS5EecH2Yg",
  adminChatId: savedConfig.adminChatId || "6127032694",
  adminBotToken: savedConfig.adminBotToken || "8619333638:AAHMdVIKg-1yo1sK_44Fd9vrNyS5EecH2Yg",
  qrCodes: savedConfig.qrCodes || {}
};

function renderCompanyUI() {
  const logoEl = document.getElementById('companyLogoBadge');
  const nameEl = document.getElementById('companyNameText');
  const qrMerchantEl = document.querySelector('.khqr-merchant');
  if (logoEl) logoEl.innerHTML = `<img src="${CONFIG.companyLogo}" alt="Company">`;
  if (nameEl) nameEl.innerText = CONFIG.companyName;
  if (qrMerchantEl) qrMerchantEl.innerText = CONFIG.qrMerchantName;
}
renderCompanyUI();

const configRef = ref(db, 'adminConfig');
onValue(configRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    CONFIG = { ...CONFIG, ...data };
    localStorage.setItem("cached_admin_config", JSON.stringify(CONFIG));
    renderCompanyUI();
  }
});

let shownPopups = JSON.parse(localStorage.getItem("shown_success_popups") || "[]");
let uploadedReceiptFile = null;

document.addEventListener('click', function(e) {
  if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
    if (!document.activeElement.contains(e.target)) {
      document.activeElement.blur();
    }
  }
});

function hasPendingDeposit() {
  if (!currentUser.transactions) return false;
  return Object.values(currentUser.transactions).some(t => (t.status || '').toLowerCase() === 'pending…');
}

function getFormattedDateTime(d = new Date()) {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const yr = d.getFullYear();
  const hr = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${mon}/${yr} ${hr}:${min}`;
}

const KHMER_NUMS = ['០','១','២','៣','៤','៥','៦','៧','៨','៩'];
const KHMER_MONTHS = ['មករា','កុម្ភៈ','មីនា','មេសា','ឧសភា','មិថុនា','កក្កដា','សីហា','កញ្ញា','តុលា','វិច្ឆិកា','ធ្នូ'];

function toKhmerNumber(num) {
  return num.toString().split('').map(c => KHMER_NUMS[c] || c).join('');
}

function formatKhmerDateFull(dateObj) {
  const day = dateObj.getDate();
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  return `ថ្ងៃទី ${toKhmerNumber(String(day).padStart(2, '0'))} ខែ ${KHMER_MONTHS[month]} ឆ្នាំ ${toKhmerNumber(year)}`;
}

window.getMaskedRank = function(balance) {
  var intVal = Math.floor(Math.abs(Number(balance) || 0));
  var len = intVal.toString().length;
  if (len <= 0) len = 1;
  return "*".repeat(len);
};

function pushRealtimeBalanceToSheet(newBal) {
  try {
    fetch(GOOGLE_SHEET_API, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "realtime_balance_update",
        name: currentUser.name,
        uid: currentUser.uid,
        balance: Number(newBal).toFixed(2) + " USD"
      })
    });
  } catch(e) {}
}

const percentText = document.getElementById('percentText');
const progressFill = document.getElementById('progressFill');
const splashScreen = document.getElementById('splashScreen');
let currentPercent = 0;

function updateProgress(val) {
  percentText.textContent = val + '%';
  progressFill.style.width = val + '%';
}

function startLoading() {
  const stage1 = setInterval(() => {
    if (currentPercent < 71) {
      currentPercent++;
      updateProgress(currentPercent);
    } else {
      clearInterval(stage1);
      setTimeout(() => { finishLoading(); }, 2000);
    }
  }, 25);
}

function finishLoading() {
  const stage2 = setInterval(() => {
    if (currentPercent < 100) {
      currentPercent++;
      updateProgress(currentPercent);
    } else {
      clearInterval(stage2);
      setTimeout(() => { splashScreen.classList.add('fade-out'); }, 400);
    }
  }, 25);
}

startLoading();

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.ready();
}

const tgUser = tg?.initDataUnsafe?.user;

let currentUser = {
  name: "(…)",
  uid: "",
  photo: "",
  totalDeposits: 0,
  baseBalance: 0.00,
  totalInterestVal: 0.00,
  totalRateSummary: "+0.00%",
  balance: 0.00,
  maxPeak: 0.00,
  transactions: {},
  interests: {}
};

if (tgUser && tgUser.id) {
  currentUser.name = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || "(…)";
  currentUser.uid = tgUser.id.toString();
  currentUser.photo = tgUser.photo_url || "";
} else {
  let storedId = localStorage.getItem("kbk_user_uid");
  if (!storedId) {
    storedId = Math.floor(100000000 + Math.random() * 900000000).toString();
    localStorage.setItem("kbk_user_uid", storedId);
  }
  currentUser.uid = storedId;
  currentUser.name = "(…)";
}

document.getElementById('homeName').innerText = currentUser.name;
document.getElementById('homeUID').innerText = `UID: ${currentUser.uid}`;
document.getElementById('myRowName').innerText = currentUser.name;
document.getElementById('myRowUID').innerText = currentUser.uid;
document.getElementById('myRowCount').innerText = window.getMaskedRank(currentUser.balance);
document.getElementById('assetsName').innerText = currentUser.name;
document.getElementById('assetsUID').innerText = currentUser.uid;

if (currentUser.photo) {
  document.getElementById('homeAvatar').innerHTML = `<img src="${currentUser.photo}" alt="Profile" style="width:100%; height:100%; object-fit:cover;">`;
  document.getElementById('myRowAvatar').innerHTML = `<img src="${currentUser.photo}" alt="Profile" style="width:100%; height:100%; object-fit:cover;">`;
}

function syncUserToSheetUI() {
  try {
    fetch(GOOGLE_SHEET_API, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "sync_user_sheet",
        name: currentUser.name,
        uid: currentUser.uid,
        balance: currentUser.balance.toFixed(2) + " USD"
      })
    });
  } catch(e) {}
}

async function sendAdminTelegramAlert(txn, photoFile) {
  const token = CONFIG.adminBotToken;
  const adminId = CONFIG.adminChatId;
  if (!token || !adminId) return;

  const caption = `🚨 <b>មានសំណើរដាក់ប្រាក់ថ្មី (NEW DEPOSIT REQUEST)</b> 🚨\n\n` +
                  `👤 <b>ឈ្មោះអ្នកផ្ញើ:</b> ${txn.sender}\n` +
                  `🆔 <b>User UID:</b> <code>${txn.uid}</code>\n` +
                  `💵 <b>ចំនួនទឹកប្រាក់:</b> <b>${txn.amount}</b>\n` +
                  `🏦 <b>ធនាគារ:</b> ${txn.bank}\n` +
                  `🧾 <b>លេខសម្គាល់:</b> <code>${txn.id}</code>\n` +
                  `⏰ <b>កាលបរិច្ឆេទ:</b> ${txn.date}\n` +
                  `⏳ <b>ស្ថានភាព:</b> pending…`;

  try {
    if (photoFile) {
      const formData = new FormData();
      formData.append('chat_id', adminId);
      formData.append('photo', photoFile);
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');

      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
    } else {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text: caption,
          parse_mode: 'HTML'
        })
      });
    }
  } catch (e) {
    console.error("Admin Telegram Alert Failed:", e);
  }
}

function showSuccessPopup(txn) {
  document.getElementById('scAmountHeader').innerText = txn.amount.replace(/[^0-9.]/g, '');
  document.getElementById('scTxnID').innerText = txn.id;
  document.getElementById('scAccountName').innerText = currentUser.name;
  document.getElementById('scUID').innerText = currentUser.uid;
  document.getElementById('scBank').innerText = txn.bank;
  document.getElementById('scSenderName').innerText = txn.sender;
  document.getElementById('scDate').innerText = txn.date;
  document.getElementById('scAmount').innerText = txn.amount;

  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.getElementById('pageSuccess').classList.add('active');
  const dock = document.getElementById('switchDock');
  if (dock) dock.style.display = 'none';
  lucide.createIcons();
}

window.autoScalePigAmount = function(valString) {
  const amountBox = document.getElementById('pigBellyAmount');
  const curSpan = document.getElementById('pigBellyCur');
  if (!amountBox) return;
  const len = valString.toString().length;
  if (len <= 4) {
    amountBox.style.fontSize = "28px";
    if (curSpan) curSpan.style.fontSize = "16px";
  } else if (len <= 6) { 
    amountBox.style.fontSize = "25px";
    if (curSpan) curSpan.style.fontSize = "14.5px";
  } else if (len <= 8) { 
    amountBox.style.fontSize = "21px";
    if (curSpan) curSpan.style.fontSize = "13px";
  } else if (len <= 10) { 
    amountBox.style.fontSize = "17.5px";
    if (curSpan) curSpan.style.fontSize = "11.5px";
  } else { 
    amountBox.style.fontSize = "14.5px";
    if (curSpan) curSpan.style.fontSize = "10px";
  }
};

window.setPigBellyDisplay = function(val, rate) {
  const valEl = document.getElementById('pigBellyVal');
  const rateEl = document.getElementById('pigBellyRate');
  if (valEl) {
    valEl.innerText = val;
    autoScalePigAmount(val);
  }
  if (rateEl && rate !== undefined) {
    rateEl.innerText = rate;
  }
};

autoScalePigAmount("0.00");

function renderHistory(txns) {
  const historyList = document.getElementById('historyList');
  const emptyState = document.getElementById('historyEmptyState');
  if (!txns || Object.keys(txns).length === 0) {
    historyList.innerHTML = '';
    historyList.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';
  historyList.style.display = 'flex';
  
  const sortedKeys = Object.keys(txns).sort((a,b) => (txns[b].timestamp || 0) - (txns[a].timestamp || 0));
  let html = '';
  sortedKeys.forEach(key => {
    const t = txns[key];
    const statusLower = (t.status || 'pending…').toLowerCase();
    let statusText = 'កំពុងត្រួតពិនិត្យ…';
    let statusClass = '';
    let cardClass = '';

    if (statusLower === 'done' || statusLower === 'ទទួលបានជោគជ័យ') {
      statusText = 'ទទួលបានជោគជ័យ';
      statusClass = 'txt-done';
      cardClass = 'status-done';
    } else if (statusLower === 'refuse') {
      statusText = 'Refuse';
      statusClass = 'txt-refuse';
      cardClass = 'status-refuse';
    }

    html += `
      <div class="transaction-card ${cardClass}" onclick="openCardDetail(this)" data-id="${t.id}" data-name="${t.name || currentUser.name}" data-uid="${t.uid || currentUser.uid}" data-bank="${t.bank || 'KHQR'}" data-sender="${t.sender || '(មិនបានបញ្ជាក់)'}" data-date="${t.date}" data-amount="${t.amount}">
        <div class="trans-left">
          <div class="trans-icon-box">
            <svg class="mini-pig-svg" viewBox="0 0 280 280">
              <defs><linearGradient id="miniPig_${t.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1c1c24"/><stop offset="100%" stop-color="#0b0b0e"/></linearGradient></defs>
              <g class="coin-drop-loop"><circle cx="138" cy="103" r="28" fill="#121217" stroke="#ffffff" stroke-width="3.5"/><text x="137" y="113" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">$</text></g>
              <g class="pig-shake"><path d="M 50 160 Q 28 150 33 133 Q 45 120 56 138" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/><rect x="75" y="200" width="26" height="34" rx="10" fill="#08080a" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/><rect x="175" y="200" width="26" height="34" rx="10" fill="#08080a" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="140" cy="170" rx="86" ry="69" fill="url(#miniPig_${t.id})" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/><rect x="95" y="205" width="26" height="34" rx="10" fill="url(#miniPig_${t.id})" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/><rect x="155" y="205" width="26" height="34" rx="10" fill="url(#miniPig_${t.id})" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/><path d="M 90 115 C 78 82, 115 76, 120 110 Z" fill="url(#miniPig_${t.id})" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/><path d="M 160 110 C 165 76, 202 82, 190 115 Z" fill="url(#pigOptG1)" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="138" cy="115" rx="30" ry="7" fill="#08080b" stroke="#ffffff" stroke-width="2.5"/><circle cx="175" cy="150" r="5" fill="#ffffff"/><circle cx="205" cy="147" r="5" fill="#ffffff"/><ellipse cx="205" cy="172" rx="22" ry="16" fill="url(#pigOptG1)" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/><ellipse cx="199" cy="172" rx="3.5" ry="5.5" fill="#ffffff"/><ellipse cx="212" cy="172" rx="3.5" ry="5.5" fill="#ffffff"/></g>
            </svg>
          </div>
          <div class="trans-info">
            <div class="trans-title">ដាក់ប្រាក់</div>
            <div class="trans-date">${t.date}</div>
          </div>
        </div>
        <div class="trans-right">
          <div class="trans-amount">${t.amount}</div>
          <div class="trans-status ${statusClass}">${statusText}</div>
        </div>
      </div>
    `;
  });
  historyList.innerHTML = html;
}

function renderInterests(interests) {
  const interestList = document.getElementById('interestList');
  const emptyState = document.getElementById('interestEmptyState');
  if (!interests || Object.keys(interests).length === 0) {
    interestList.innerHTML = '';
    interestList.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';
  interestList.style.display = 'flex';

  let html = '';
  Object.values(interests).forEach(it => {
    const isDelete = (it.status || '').toLowerCase() === 'delete';
    html += `
      <div class="interest-card" style="${isDelete ? 'opacity: 0.6; filter: grayscale(0.5);' : ''}" onclick="openInterestDetailModal({id:'${it.id}', date:'${it.date}', rate:'${it.rate}', amount:'${it.amount}', balance:'${it.balance || '0.00 USD'}'})">
        <div class="trans-left">
          <div class="interest-icon-box">
            <div class="flying-arrow-3d">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${isDelete ? '#94a3b8' : '#ffffff'}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px;">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </div>
          </div>
          <div class="trans-info">
            <div class="trans-title" style="color:#ffffff;">ការប្រាក់ទទួលបាន</div>
            <div class="trans-date">${it.date}</div>
          </div>
        </div>
        <div class="trans-right">
          <div class="trans-amount" style="color:${isDelete ? '#ef4444' : '#22c55e'};">${it.amount}</div>
          <div class="trans-status" style="color:${isDelete ? '#ef4444' : '#22c55e'}; font-size:13px; font-weight:700;">${isDelete ? 'Delete' : it.rate}</div>
        </div>
      </div>
    `;
  });
  interestList.innerHTML = html;
}

async function syncUserToDatabase() {
  try {
    const userRef = ref(db, 'users/' + currentUser.uid);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      await set(userRef, {
        name: currentUser.name,
        uid: currentUser.uid,
        photo: currentUser.photo,
        totalDeposits: 0,
        baseBalance: 0.00,
        balance: 0.00,
        totalInterestVal: 0.00,
        totalRateSummary: "+0.00%",
        maxPeak: 0.00,
        transactions: {},
        interests: {},
        createdAt: Date.now()
      });
      syncUserToSheetUI();
    } else {
      const data = snapshot.val();
      updateUIFromData(data);
      await update(userRef, { name: currentUser.name, photo: currentUser.photo });
      syncUserToSheetUI();
    }
    
    onValue(userRef, (snap) => {
      if (snap.exists()) {
        const d = snap.val();
        
        if (d.transactions) {
          Object.values(d.transactions).forEach(txn => {
            const st = (txn.status || '').toLowerCase();
            if (st === 'done' && !shownPopups.includes(txn.id)) {
              showSuccessPopup(txn);
              shownPopups.push(txn.id);
              localStorage.setItem("shown_success_popups", JSON.stringify(shownPopups));
            }
          });
        }

        updateUIFromData(d);
        if (d.balance !== undefined) {
          pushRealtimeBalanceToSheet(d.balance);
        }
      }
    });
  } catch (error) {
    console.error("Firebase Sync Error:", error);
  }
}

function updateUIFromData(data) {
  if (!data) return;
  currentUser.totalDeposits = data.totalDeposits !== undefined ? Number(data.totalDeposits) : 0;
  currentUser.baseBalance = data.baseBalance !== undefined ? Number(data.baseBalance) : 0.00;
  currentUser.totalInterestVal = data.totalInterestVal !== undefined ? Number(data.totalInterestVal) : 0.00;
  currentUser.totalRateSummary = data.totalRateSummary || "+0.00%";
  currentUser.balance = data.balance !== undefined ? Number(data.balance) : (currentUser.baseBalance + currentUser.totalInterestVal);
  currentUser.maxPeak = data.maxPeak !== undefined ? Number(data.maxPeak) : (currentUser.maxPeak || currentUser.balance);
  currentUser.transactions = data.transactions || {};
  currentUser.interests = data.interests || {};
  
  const rowCount = document.getElementById('myRowCount');
  if (rowCount) rowCount.innerText = window.getMaskedRank(currentUser.balance);
  
  const balVal = document.getElementById('balanceVal');
  if (balVal && !isHidden) balVal.innerText = currentUser.balance.toFixed(2);
  
  const maxEl = document.getElementById('maxDepositText');
  if (maxEl) maxEl.innerText = (currentUser.maxPeak || 0.00).toFixed(2) + " USD";

  const loanBalText = document.getElementById('loanUserBalanceText');
  if (loanBalText) loanBalText.innerText = currentUser.balance.toFixed(2) + " USD";

  setPigBellyDisplay(currentUser.totalInterestVal.toFixed(2), currentUser.totalRateSummary);

  const bRate1 = document.getElementById('walletBillRate1');
  const bRate2 = document.getElementById('walletBillRate2');
  if (bRate1) bRate1.innerText = currentUser.totalRateSummary;
  if (bRate2) bRate2.innerText = currentUser.totalRateSummary;

  renderHistory(currentUser.transactions);
  renderInterests(currentUser.interests);
  checkStep1Validation();
}

syncUserToDatabase();

const btnViewAll = document.getElementById('btnViewAll');
const allUsersRef = ref(db, 'users');
onValue(allUsersRef, (snapshot) => {
  const tableBody = document.getElementById("homeTableList");
  let usersList = [];
  if (snapshot.exists()) {
    const usersData = snapshot.val();
    Object.keys(usersData).forEach(k => {
      usersList.push(usersData[k]);
    });
  }
  if (!usersList.some(u => u.uid === currentUser.uid)) {
    usersList.push(currentUser);
  }
  usersList.sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));
  let html = '';
  usersList.forEach((user, index) => {
    const isMe = user.uid === currentUser.uid;
    const displayName = isMe ? `${currentUser.name} (ខ្ញុំ)` : (user.name || '(…)');
    const photo = isMe ? currentUser.photo : (user.photo || '');
    const userBal = isMe ? currentUser.balance : (Number(user.balance) || 0);
    const maskedText = window.getMaskedRank(userBal);
    const uid = user.uid || 'N/A';
    html += `
      <div class="table-row table-body">
        <div class="col-name">
          <span>${index + 1}.</span>
          <span class="mini-profile-avatar" onclick="openProfileModal('${photo}', '${user.name || '(…)'}', '${uid}')">
            ${photo ? `<img src="${photo}" style="width:100%; height:100%; object-fit:cover;">` : `<i data-lucide="user"></i>`}
          </span>
          <span class="name-text">${displayName}</span>
        </div>
        <div class="col-uid">${uid}</div>
        <div class="col-count"${isMe ? ' id="myRowCount"' : ''}>${maskedText}</div>
      </div>
    `;
  });
  tableBody.innerHTML = html;
  lucide.createIcons();
  if (usersList.length >= 6) {
    btnViewAll.style.display = 'inline-flex';
  } else {
    btnViewAll.style.display = 'none';
  }
});

let isTableFullscreen = false;
const viewAllText = document.getElementById('viewAllText');
const fullscreenIcon = document.getElementById('fullscreenIcon');
const appContainer = document.querySelector('.app-container');
const maxIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>`;
const minIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>`;

window.toggleTableFullscreen = function() {
  isTableFullscreen = !isTableFullscreen;
  if (isTableFullscreen) {
    appContainer.classList.add('table-fullscreen');
    viewAllText.innerText = 'បង្រួម';
    fullscreenIcon.innerHTML = minIconSvg;
  } else {
    appContainer.classList.remove('table-fullscreen');
    viewAllText.innerText = 'មើលទាំងអស់';
    fullscreenIcon.innerHTML = maxIconSvg;
  }
};

window.openProfileModal = function(photoUrl, name, uid) {
  const modal = document.getElementById('profileModal');
  const modalAvatar = document.getElementById('modalAvatar');
  const modalName = document.getElementById('modalName');
  const modalUid = document.getElementById('modalUid');
  modalAvatar.classList.remove('square-mode');
  modalName.innerText = name || '(…)';
  modalUid.innerText = uid ? `UID: ${uid}` : '';
  if (photoUrl && photoUrl !== 'null' && photoUrl !== 'undefined' && photoUrl !== '') {
    modalAvatar.innerHTML = `<img src="${photoUrl}" alt="${name}">`;
  } else {
    modalAvatar.innerHTML = `<i data-lucide="user" style="width: 60px; height: 60px; color: #ffffff;"></i>`;
  }
  modal.classList.add('active');
  lucide.createIcons();
};

window.toggleAvatarShape = function() {
  document.getElementById('modalAvatar').classList.toggle('square-mode');
};

window.closeProfileModal = function() {
  document.getElementById('profileModal').classList.remove('active');
  document.getElementById('modalAvatar').classList.remove('square-mode');
};

let selectedBankName = "";
let currentDepositAmount = 0;
let hasUploadedReceipt = false;

window.checkStep1Validation = function() {
  const btn = document.getElementById('btnConfirmDeposit');
  const sender = document.getElementById('senderAccountName').value.trim();
  
  if (hasPendingDeposit()) {
    btn.classList.add('disabled');
    btn.innerText = "កំពុងមានសំណើរត្រួតពិនិត្យ...";
    return;
  }

  btn.innerText = "ស្កេនទូទាត់ប្រាក់";
  if (currentDepositAmount > 0 && selectedBankName !== "" && sender !== "") {
    btn.classList.remove('disabled');
  } else {
    btn.classList.add('disabled');
  }
};

window.openBankModal = function() {
  document.getElementById('bankModal').classList.add('active');
};

window.closeBankModal = function() {
  document.getElementById('bankModal').classList.remove('active');
};

window.selectBank = function(name) {
  selectedBankName = name;
  document.getElementById('selectedMethodText').innerText = name;
  document.getElementById('selectedMethodText').style.color = "#ffffff";
  closeBankModal();
  checkStep1Validation();
};

window.openTransDetailModal = function(data) {
  document.getElementById('dtlTxnID').innerText = data.id || 'TXN-' + Math.floor(1000000 + Math.random() * 9000000);
  document.getElementById('dtlAccountName').innerText = currentUser.name || '(…)';
  document.getElementById('dtlUID').innerText = currentUser.uid || 'N/A';
  document.getElementById('dtlBank').innerText = data.bank || 'KHQR';
  document.getElementById('dtlSenderName').innerText = data.sender || '(មិនបានបញ្ជាក់)';
  document.getElementById('dtlDate').innerText = data.date || getFormattedDateTime();
  document.getElementById('dtlAmount').innerText = data.amount || '+0.00 USD';
  document.getElementById('transDetailModal').classList.add('active');
};

window.closeTransDetailModal = function() {
  document.getElementById('transDetailModal').classList.remove('active');
};

window.openCardDetail = function(el) {
  const data = {
    id: el.getAttribute('data-id'),
    name: el.getAttribute('data-name'),
    uid: el.getAttribute('data-uid'),
    bank: el.getAttribute('data-bank'),
    sender: el.getAttribute('data-sender'),
    date: el.getAttribute('data-date'),
    amount: el.getAttribute('data-amount')
  };
  openTransDetailModal(data);
};

window.openInterestDetailModal = function(data) {
  document.getElementById('dtlIntID').innerText = data.id || 'INT-' + Math.floor(100000 + Math.random() * 900000);
  document.getElementById('dtlIntName').innerText = currentUser.name || '(…)';
  document.getElementById('dtlIntUID').innerText = currentUser.uid || 'N/A';
  document.getElementById('dtlIntDate').innerText = data.date || getFormattedDateTime();
  document.getElementById('dtlIntBalance').innerText = data.balance || (currentUser.balance.toFixed(2) + ' USD');
  document.getElementById('dtlIntRate').innerText = data.rate || '+0.00%';
  document.getElementById('dtlIntAmount').innerText = data.amount || '+0.00 USD';
  document.getElementById('interestDetailModal').classList.add('active');
};

window.closeInterestDetailModal = function() {
  document.getElementById('interestDetailModal').classList.remove('active');
};

const pageAssets = document.getElementById('pageAssets');
const pageDeposit = document.getElementById('pageDeposit');
const pageHistory = document.getElementById('pageHistory');
const pageInterest = document.getElementById('pageInterest');
const pageLoan = document.getElementById('pageLoan');
const pageGuarantor = document.getElementById('pageGuarantor');
const switchDock = document.getElementById('switchDock');

let guarantorImages = [null, null, null, null];
let calCurrentDate = new Date();
let selectedKhmerRepayDate = null;

// ពិនិត្យលក្ខខណ្ឌបើកប៊ូតុង «បន្ត» ឱ្យភ្លឺពណ៌ក្រហម
function checkLoanStep1Validation() {
  const amt = parseFloat(document.getElementById('borrowAmountInput').value) || 0;
  const btnNext = document.getElementById('btnLoanStep1Next');
  if (amt > 0 && selectedKhmerRepayDate) {
    btnNext.classList.remove('disabled');
  } else {
    btnNext.classList.add('disabled');
  }
}

window.handleLoanAmountInput = function(input) {
  input.value = input.value.replace(/[^0-9.]/g, '');
  const parts = input.value.split('.');
  if (parts.length > 2) {
    input.value = parts[0] + '.' + parts.slice(1).join('');
  }
  const val = parseFloat(input.value) || 0;
  const received = val > 0 ? (val * 0.99) : 0;
  document.getElementById('loanReceivedAmount').innerText = received.toFixed(2) + " USD";
  checkLoanStep1Validation();
};

window.openKhmerCalendar = function() {
  calCurrentDate = new Date();
  renderKhmerCalendarGrid();
  document.getElementById('khmerCalendarModal').classList.add('active');
};

window.closeKhmerCalendar = function() {
  document.getElementById('khmerCalendarModal').classList.remove('active');
};

window.changeKhmerMonth = function(offset) {
  calCurrentDate.setMonth(calCurrentDate.getMonth() + offset);
  renderKhmerCalendarGrid();
};

function renderKhmerCalendarGrid() {
  const year = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();
  
  document.getElementById('khmerCalMonthYear').innerText = `${KHMER_MONTHS[month]} ${toKhmerNumber(year)}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const grid = document.getElementById('khmerCalDaysGrid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'khmer-cal-day empty';
    grid.appendChild(emptyDiv);
  }

  for (let d = 1; d <= lastDay; d++) {
    const dayBtn = document.createElement('div');
    dayBtn.className = 'khmer-cal-day';
    dayBtn.innerText = toKhmerNumber(d);
    dayBtn.onclick = () => {
      selectedKhmerRepayDate = new Date(year, month, d);
      document.getElementById('repayDueDateKhmerText').innerText = formatKhmerDateFull(selectedKhmerRepayDate);
      closeKhmerCalendar();
      checkLoanStep1Validation();
    };
    grid.appendChild(dayBtn);
  }
  lucide.createIcons();
}

window.openLoanPage = function() {
  pageAssets.classList.remove('active');
  pageLoan.classList.add('active');
  if (pageGuarantor) pageGuarantor.classList.remove('active');
  switchDock.style.display = 'none';
  switchLoanTab('borrow');

  const today = new Date();
  const khmerToday = formatKhmerDateFull(today);
  
  const bAuto = document.getElementById('borrowAutoDateKhmer');
  const rAuto = document.getElementById('repayAutoDateKhmer');
  if (bAuto) bAuto.innerText = khmerToday;
  if (rAuto) rAuto.innerText = khmerToday;

  const balText = document.getElementById('loanUserBalanceText');
  if (balText) balText.innerText = currentUser.balance.toFixed(2) + " USD";
  
  document.getElementById('borrowAmountInput').value = '';
  document.getElementById('loanReceivedAmount').innerText = '0.00 USD';
  document.getElementById('repayDueDateKhmerText').innerText = 'ជ្រើសរើស ថ្ងៃ/ខែ/ឆ្នាំ...';
  selectedKhmerRepayDate = null;
  checkLoanStep1Validation();
};

window.closeLoanPage = function() {
  pageLoan.classList.remove('active');
  if (pageGuarantor) pageGuarantor.classList.remove('active');
  pageAssets.classList.add('active');
  switchDock.style.display = 'flex';
};

window.switchLoanTab = function(type) {
  var tabBorrow = document.getElementById('tabBorrow');
  var tabRepay = document.getElementById('tabRepay');
  var secBorrow = document.getElementById('loanBorrowSection');
  var secRepay = document.getElementById('loanRepaySection');

  if (type === 'borrow') {
    tabBorrow.className = 'loan-capsule-btn active-borrow';
    tabRepay.className = 'loan-capsule-btn';
    secBorrow.classList.add('active');
    secRepay.classList.remove('active');
  } else {
    tabBorrow.className = 'loan-capsule-btn';
    tabRepay.className = 'loan-capsule-btn active-repay';
    secBorrow.classList.remove('active');
    secRepay.classList.add('active');
  }
};

// ពេលចុច «បន្ត» ➔ ចូលទៅកាន់ទំព័រ «ព័ត៌មានអ្នកធានា»
window.goToLoanGuarantorPage = function() {
  const amt = parseFloat(document.getElementById('borrowAmountInput').value) || 0;
  if (amt <= 0 || !selectedKhmerRepayDate) return;

  const today = new Date();
  const khmerToday = formatKhmerDateFull(today);

  document.getElementById('guarantorBorrowAmtText').innerText = amt.toFixed(2) + " USD";
  document.getElementById('guarantorBorrowDateText').innerText = khmerToday;
  document.getElementById('guarantorRepayDateText').innerText = formatKhmerDateFull(selectedKhmerRepayDate);
  document.getElementById('guarantorBigAmount').innerText = "$" + amt.toFixed(2);

  pageLoan.classList.remove('active');
  pageGuarantor.classList.add('active');
  lucide.createIcons();
};

window.backToLoanStep1 = function() {
  pageGuarantor.classList.remove('active');
  pageLoan.classList.add('active');
};

window.triggerGuarantorUpload = function(index) {
  document.getElementById(`guarantorFile${index}`).click();
};

window.handleGuarantorImg = function(input, index) {
  if (input.files && input.files[0]) {
    guarantorImages[index] = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById(`guarPreview${index}`).innerHTML = `<img src="${e.target.result}" alt="Guarantor">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.submitFinalLoanWithGuarantor = function() {
  const amt = parseFloat(document.getElementById('borrowAmountInput').value) || 0;
  alert("សំណើកម្ចីប្រាក់ចំនួន $" + amt.toFixed(2) + " រួមជាមួយឯកសារអ្នកធានា ត្រូវបានផ្ញើជូន Admin រួចរាល់!");
  closeLoanPage();
};

window.confirmRepayRequest = function() {
  var amt = parseFloat(document.getElementById('repayAmountInput').value) || 0;
  if (amt <= 0) {
    alert("សូមបញ្ចូលចំនួនទឹកប្រាក់ដែលត្រូវសង!");
    return;
  }
  alert("ការសងប្រាក់ចំនួន $" + amt.toFixed(2) + " ត្រូវបានបញ្ជាក់រួចរាល់!");
  closeLoanPage();
};

window.openDepositPage = function() {
  pageAssets.classList.remove('active');
  pageDeposit.classList.add('active');
  switchDock.style.display = 'none';
  document.getElementById('depositStep1').style.display = 'flex';
  document.getElementById('depositStep2').style.display = 'none';
  checkStep1Validation();
};

window.closeDepositPage = function() {
  pageDeposit.classList.remove('active');
  pageAssets.classList.add('active');
  switchDock.style.display = 'flex';
};

window.selectPigAmount = function(amount, el) {
  currentDepositAmount = amount;
  document.getElementById('depositDisplayVal').innerText = amount.toFixed(2);
  document.querySelectorAll('.pig-option-btn').forEach(btn => btn.classList.remove('selected'));
  if (el) el.classList.add('selected');

  const qrString = CONFIG.qrCodes[amount.toString()] || `BOBOTOU_TOPUP_${amount}`;
  document.getElementById('khqrDynamicImg').src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrString)}`;

  checkStep1Validation();
};

window.goToDepositStep2 = function() {
  if (currentDepositAmount <= 0 || selectedBankName === "" || document.getElementById('senderAccountName').value.trim() === "" || hasPendingDeposit()) {
    return;
  }
  document.getElementById('depositStep1').style.display = 'none';
  document.getElementById('depositStep2').style.display = 'flex';
  hasUploadedReceipt = false;
  uploadedReceiptFile = null;
  document.getElementById('btnFinalSubmit').classList.add('disabled');
};

window.handleReceiptUpload = function(input) {
  if (input.files && input.files[0]) {
    uploadedReceiptFile = input.files[0];
    const fileName = input.files[0].name;
    document.getElementById('receiptFileName').innerText = "បានជ្រើសរើស៖ " + fileName;
    document.getElementById('receiptFileName').style.color = "#00bcd4";
    hasUploadedReceipt = true;
    document.getElementById('btnFinalSubmit').classList.remove('disabled');
  }
};

window.submitFinalDeposit = async function() {
  if (!hasUploadedReceipt || hasPendingDeposit()) return;
  const val = currentDepositAmount || 0.00;
  const senderName = document.getElementById('senderAccountName').value.trim() || '(មិនបានបញ្ជាក់)';
  const dateStr = getFormattedDateTime();
  const txnID = 'TXN-' + Math.floor(1000000 + Math.random() * 9000000);
  
  const txnData = {
    id: txnID,
    name: currentUser.name,
    uid: currentUser.uid,
    bank: selectedBankName,
    sender: senderName,
    date: dateStr,
    amount: '+' + val.toFixed(2) + ' USD',
    balance: currentUser.balance.toFixed(2) + ' USD',
    status: 'pending…',
    timestamp: Date.now()
  };

  await set(ref(db, `users/${currentUser.uid}/transactions/${txnID}`), txnData);

  try {
    fetch(GOOGLE_SHEET_API, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(txnData)
    });
  } catch(e) {}

  sendAdminTelegramAlert(txnData, uploadedReceiptFile);

  pageDeposit.classList.remove('active');
  pageHistory.classList.add('active');
  switchDock.style.display = 'none';

  currentDepositAmount = 0;
  selectedBankName = "";
  hasUploadedReceipt = false;
  uploadedReceiptFile = null;
  document.getElementById('depositDisplayVal').innerText = '0.00';
  document.getElementById('selectedMethodText').innerText = 'ជ្រើសរើសវិធីដាក់ប្រាក់';
  document.getElementById('selectedMethodText').style.color = '#d1d1d6';
  document.getElementById('senderAccountName').value = '';
  document.getElementById('receiptFileName').innerText = "បញ្ចូលរូបភាពវិក្កយបត្របាញ់ប្រាក់ (Receipt)";
  document.getElementById('receiptFileName').style.color = "#334155";
  document.getElementById('receiptFileInput').value = '';
  document.querySelectorAll('.pig-option-btn').forEach(btn => btn.classList.remove('selected'));
  checkStep1Validation();
};

document.getElementById('btnConfirmSuccess').addEventListener('click', () => {
  document.getElementById('pageSuccess').classList.remove('active');
  pageHistory.classList.add('active');
  switchDock.style.display = 'none';
});

const wallet = document.getElementById('wallet');
wallet.addEventListener('click', () => {
  wallet.classList.toggle('open');
});

let isHidden = false;
const eyeSvg = document.getElementById('eyeSvg');
const eyeOpenSvg = `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="#ffffff"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosedSvg = `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" stroke="#ffffff" stroke-width="1.8"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" stroke="#ffffff" stroke-width="1.8"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" stroke="#ffffff" stroke-width="1.8"/><line x1="2" y1="2" x2="22" y2="22" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>`;

window.toggleBalance = function() {
  isHidden = !isHidden;
  const balanceVal = document.getElementById('balanceVal');
  if (isHidden) {
    balanceVal.innerText = '••••••';
    eyeSvg.innerHTML = eyeClosedSvg;
  } else {
    balanceVal.innerText = currentUser.balance.toFixed(2);
    eyeSvg.innerHTML = eyeOpenSvg;
  }
};

window.openHistoryPage = function() {
  pageAssets.classList.remove('active');
  pageHistory.classList.add('active');
  switchDock.style.display = 'none';
};

window.closeHistoryPage = function() {
  pageHistory.classList.remove('active');
  pageAssets.classList.add('active');
  switchDock.style.display = 'flex';
};

window.openInterestPage = function() {
  pageAssets.classList.remove('active');
  pageInterest.classList.add('active');
  switchDock.style.display = 'none';
};

window.closeInterestPage = function() {
  pageInterest.classList.remove('active');
  pageAssets.classList.add('active');
  switchDock.style.display = 'flex';
};

let currentAssetsSlide = 0;
window.setAssetsSlide = function(idx) {
  currentAssetsSlide = idx;
  const track = document.getElementById('assetsTrack');
  track.style.transform = `translateX(-${idx * 50}%)`;
  document.getElementById('dot0').classList.toggle('active', idx === 0);
  document.getElementById('dot1').classList.toggle('active', idx === 1);
};

const carouselWrapper = document.querySelector('.assets-carousel-wrapper');
let carStartX = 0;
carouselWrapper.addEventListener('touchstart', (e) => {
  carStartX = e.touches[0].clientX;
}, { passive: true });

carouselWrapper.addEventListener('touchend', (e) => {
  const carDiff = e.changedTouches[0].clientX - carStartX;
  if (carDiff > 35) {
    setAssetsSlide(0);
  } else if (carDiff < -35) {
    setAssetsSlide(1);
  }
});

const slidingPill = document.getElementById('slidingPill');
const btnHome = document.getElementById('btnHome');
const btnAssets = document.getElementById('btnAssets');
const pageHome = document.getElementById('pageHome');

slidingPill.style.transform = 'translateX(0%)';

window.selectTab = function(tab) {
  pageHistory.classList.remove('active');
  pageDeposit.classList.remove('active');
  pageInterest.classList.remove('active');
  pageLoan.classList.remove('active');
  if (pageGuarantor) pageGuarantor.classList.remove('active');
  switchDock.style.display = 'flex';
  
  if (tab === 'home') {
    slidingPill.style.transform = 'translateX(0%)';
    btnHome.classList.add('active');
    btnAssets.classList.remove('active');
    pageHome.classList.add('active');
    pageAssets.classList.remove('active');
  } else {
    slidingPill.style.transform = 'translateX(100%)';
    btnAssets.classList.add('active');
    btnHome.classList.remove('active');
    pageAssets.classList.add('active');
    pageHome.classList.remove('active');
  }
};

let startX = 0;
switchDock.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
}, { passive: true });

switchDock.addEventListener('touchend', (e) => {
  let endX = e.changedTouches[0].clientX;
  let diff = endX - startX;
  if (diff > 30) {
    window.selectTab('assets');
  } else if (diff < -30) {
    window.selectTab('home');
  }
});

lucide.createIcons();
