// =========================================================
// ALBIZNET - ULTIMATE REAL-TIME ENGINE v6.0 (app.js - PART 1)
// Other User Profile 3-Dot Menu | Unlimited Video/Reel Chunk Uploader |
// Inbox Long-Press Menu (Reminder, Read/Unread, Pin, Clear, Delete) |
// Auto-Remove Unread & Request Accept/Reject | Business Marketplace Tab
// =========================================================

let auth = null;
let db = null;
let storage = null;
let currentUserData = null;
let activeProfileUser = null;
let authAccountType = 'people';
let currentCreateMode = 'Post';
let uploadedDataURL = '';
let uploadedRawFile = null;
let uploadedMediaType = 'image';

// फिल्टर आणि टॅब स्टेट्स
let activeExploreFilter = 'Offers';
let activeNearbyFilter = 'All';
let activePeopleTab = 'posts';
let activeBizTab = 'Products';
let activeMsgTab = 'Inbox';
let activeCatalogFilter = 'All';

// चॅट, कमेंट आणि व्हॉइस रेकॉर्डर स्टेट्स
let activeChatDocId = null;
let activeChatPeerName = '';
let activeChatPeerAvatar = '';
let activeChatPeerUid = '';
let activeCommentPostId = null;
let activeCommentCollection = 'posts';

// Inbox Long-Press Menu State
let chatLongPressTimer = null;
let selectedChatForMenu = null;

// IG Action Menu Target & Context ('public_reel' vs 'profile_owner')
let activeMenuTarget = { id: null, col: 'posts', context: 'profile_owner' };
let autoScrollReelsEnabled = false;

// Real Voice Recording State
let mediaRecorder = null;
let audioChunks = [];
let isRecordingVoice = false;

// रिअल-टाईम कॅशे
let cachePosts = [];
let cacheReels = [];
let cacheStories = [];
let cacheNotes = [];
let cacheOffers = [];
let cacheProducts = [];
let cacheAllUsers = [];
let cacheBusinesses = [];
let cacheChats = [];
let cacheNotifications = [];

// =========================================================
// 0. FIREBASE SDK LOADER & GLOBAL SETUP
// =========================================================
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function initRealFirebaseApp() {
  try {
    injectProModalsIntoDOM();
    setupVideoFileInput();
    upgradeBusinessProfileTabs();
    setupGlobalOutsideClickForCreateMenu();

    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js');
    } else if (!firebase.storage) {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js').catch(() => {});
    }

    let config = null;
    const cached = localStorage.getItem('albiznet_fb_config_cache');
    if (cached) {
      try { config = JSON.parse(cached); } catch (e) {}
    }

    if (!config || !config.apiKey) {
      const res = await fetch('/api/config');
      const data = await res.json();
      config = typeof data === 'string' ? JSON.parse(data) : data;
      if (config && config.apiKey) {
        localStorage.setItem('albiznet_fb_config_cache', JSON.stringify(config));
      }
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    auth = firebase.auth();
    db = firebase.firestore();
    if (firebase.storage) {
      try { storage = firebase.storage(); } catch (e) {}
    }

    setupNotificationBell();

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = db.collection('users').doc(user.uid);
        const snap = await docRef.get();
        if (snap.exists) {
          currentUserData = { uid: user.uid, ...snap.data() };
        } else {
          let fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'ALBIZNET User');
          currentUserData = {
            uid: user.uid,
            type: authAccountType || 'people',
            name: fallbackName,
            handle: '@' + fallbackName.toLowerCase().replace(/\s+/g, ''),
            category: authAccountType === 'business' ? 'Shops' : 'Personal Account',
            about: `Hi! I'm ${fallbackName} on ALBIZNET.`,
            location: 'Ardhapur, Maharashtra',
            phone: user.phoneNumber || '',
            email: user.email || '',
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=4f46e5&color=fff&bold=true`,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await docRef.set(currentUserData);
        }
        launchMainApp();
      } else {
        document.getElementById('main-app-shell').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('welcome-screen').style.display = 'flex';
      }
    });
  } catch (err) {
    console.error('Firebase Init Error:', err);
  }
}

document.addEventListener('DOMContentLoaded', initRealFirebaseApp);

function setupGlobalOutsideClickForCreateMenu() {
  const closeMenu = (e) => {
    const menu = document.getElementById('create-dropdown-menu');
    const btn = document.querySelector('.header-create-btn');
    if (!menu || menu.style.display !== 'block') return;
    if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
    menu.style.display = 'none';
  };
  document.addEventListener('click', closeMenu);
  document.addEventListener('touchstart', closeMenu, { passive: true });
}

function showToast(msg) {
  let t = document.getElementById('custom-toast');
  if (!t) return;
  t.innerHTML = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3200);
}

// =========================================================
// DYNAMIC PRO UI INJECTOR (MODALS, PROGRESS BAR, LONG-PRESS MENU)
// =========================================================
function injectProModalsIntoDOM() {
  if (document.getElementById('pro-messenger-modal')) return;

  const styleTag = document.createElement('style');
  styleTag.innerHTML = `
    #pro-scroll-feed-body {
      scroll-snap-type: y mandatory !important;
      overflow-y: scroll !important;
      height: 100dvh !important;
      -webkit-overflow-scrolling: touch !important;
      overscroll-behavior-y: contain !important;
      scrollbar-width: none;
    }
    #pro-scroll-feed-body::-webkit-scrollbar { display: none; }
    .scroll-snap-slide {
      height: 100dvh !important;
      min-height: 100dvh !important;
      max-height: 100dvh !important;
      width: 100% !important;
      scroll-snap-align: start !important;
      scroll-snap-stop: always !important;
      position: relative;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(styleTag);

  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <input type="file" id="chat-camera-input" accept="image/*,video/*" capture="environment" style="display:none;" onchange="handleChatMediaUpload(event)">
    <input type="file" id="chat-gallery-input" accept="image/*,video/*" style="display:none;" onchange="handleChatMediaUpload(event)">

    <!-- 0. LIVE UPLOAD PROGRESS BAR BANNER -->
    <div id="pro-upload-progress-Banner" style="display:none; position:fixed; top:12px; left:14px; right:14px; background:#0f172a; color:#ffffff; padding:12px 16px; border-radius:16px; z-index:9500; box-shadow:0 8px 25px rgba(0,0,0,0.35); font-family:'Poppins', sans-serif; align-items:center; gap:12px;">
      <i class="fa-solid fa-cloud-arrow-up fa-bounce" style="color:#38bdf8; font-size:20px;"></i>
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:6px;">
          <span id="up-prog-title">Uploading...</span>
          <span id="up-prog-pct" style="color:#38bdf8;">10%</span>
        </div>
        <div style="width:100%; height:6px; background:#334155; border-radius:10px; overflow:hidden;">
          <div id="up-prog-bar" style="width:10%; height:100%; background:linear-gradient(90deg, #38bdf8, #6366f1); transition:width 0.25s;"></div>
        </div>
      </div>
    </div>

    <!-- 1. MESSENGER FULLSCREEN CHAT -->
    <div id="pro-messenger-modal" style="display:none; position:fixed; inset:0; background:#ffffff; z-index:6000; flex-direction:column; font-family:'Poppins', sans-serif;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid #f1f5f9; background:#fff; flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <button onclick="closeMessengerChat()" style="background:none; border:none; font-size:20px; color:#2563eb; cursor:pointer; padding:4px;"><i class="fa-solid fa-arrow-left"></i></button>
          <img id="msg-win-top-avatar" src="" style="width:38px; height:38px; border-radius:50%; object-fit:cover; flex-shrink:0;">
          <div style="min-width:0;">
            <div id="msg-win-top-name" style="font-weight:800; font-size:14.5px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">User</div>
            <div style="font-size:11px; color:#16a34a; font-weight:600;">● Active now</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:16px; color:#2563eb; font-size:19px; flex-shrink:0;">
          <i class="fa-solid fa-phone" style="cursor:pointer;" onclick="showToast('📞 व्हॉइस कॉल जोडला जात आहे...')"></i>
          <i class="fa-solid fa-video" style="cursor:pointer;" onclick="showToast('📹 व्हिडिओ कॉल सुरू होत आहे...')"></i>
          <i class="fa-solid fa-trash-can" style="color:#ef4444; cursor:pointer;" title="Delete Chat" onclick="deleteEntireActiveChat()"></i>
        </div>
      </div>

      <div id="msg-win-body" style="flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; background:#ffffff;">
        <div style="text-align:center; padding:16px 10px 12px;">
          <img id="msg-win-center-avatar" src="" style="width:84px; height:84px; border-radius:50%; object-fit:cover; box-shadow:0 4px 14px rgba(0,0,0,0.1);">
          <h2 id="msg-win-center-name" style="margin:8px 0 4px; font-size:19px; font-weight:800; color:#0f172a;">User</h2>
          <button onclick="closeMessengerChat(); openUserProfile(activeChatPeerUid);" style="background:#f1f5f9; color:#0f172a; border:none; padding:6px 16px; border-radius:20px; font-weight:700; font-size:12.5px; cursor:pointer;">View profile</button>
          <div style="font-size:10.5px; color:#94a3b8; margin-top:6px;">(कोणताही मेसेज डिलीट करण्यासाठी त्या मेसेजवर टच करा)</div>
        </div>
        <div id="msg-win-bubbles" style="display:flex; flex-direction:column; gap:10px;"></div>
        <div style="text-align:center; font-size:11px; color:#64748b; padding:14px 10px 4px; line-height:1.4;">
          🔒 New messages and calls are secured with end-to-end encryption. <b style="color:#2563eb;">Learn more</b>
        </div>
      </div>

      <div id="voice-rec-bar" style="display:none; background:#fef2f2; color:#dc2626; padding:8px 16px; font-size:12.5px; font-weight:700; align-items:center; justify-content:space-between; border-top:1px solid #fecaca;">
        <span>🔴 आवाज रेकॉर्ड होत आहे...</span>
        <button onclick="stopAndSendVoiceNote()" style="background:#dc2626; color:#fff; border:none; padding:5px 14px; border-radius:12px; font-weight:700; cursor:pointer;">Send Voice Note</button>
      </div>

      <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-top:1px solid #f1f5f9; background:#fff; flex-shrink:0; width:100%; box-sizing:border-box;">
        <button onclick="document.getElementById('chat-camera-input').click()" style="background:none; border:none; color:#2563eb; font-size:20px; padding:4px; cursor:pointer; flex-shrink:0;"><i class="fa-solid fa-camera"></i></button>
        <button onclick="document.getElementById('chat-gallery-input').click()" style="background:none; border:none; color:#2563eb; font-size:20px; padding:4px; cursor:pointer; flex-shrink:0;"><i class="fa-regular fa-image"></i></button>
        <button id="chat-mic-btn" onclick="toggleRealVoiceRecording()" style="background:none; border:none; color:#2563eb; font-size:20px; padding:4px; cursor:pointer; flex-shrink:0;"><i class="fa-solid fa-microphone"></i></button>
        
        <div style="flex:1; min-width:0; display:flex; align-items:center; background:#f1f5f9; border-radius:24px; padding:7px 12px;">
          <input type="text" id="msg-win-input" placeholder="Message..." style="flex:1; width:100%; min-width:0; border:none; background:transparent; outline:none; font-size:14px; color:#0f172a;" onkeypress="if(event.key==='Enter') sendMessengerText()">
          <i class="fa-regular fa-face-smile" style="color:#2563eb; font-size:18px; cursor:pointer; margin-left:6px; flex-shrink:0;" onclick="const i=document.getElementById('msg-win-input'); i.value+='😊'; i.focus();"></i>
        </div>

        <button onclick="sendMessengerText()" style="background:#2563eb; color:#fff; border:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:15px; cursor:pointer; flex-shrink:0;"><i class="fa-solid fa-paper-plane"></i></button>
        <button onclick="sendMessengerThumb()" style="background:none; border:none; color:#2563eb; font-size:22px; padding:2px 4px; cursor:pointer; flex-shrink:0;"><i class="fa-solid fa-thumbs-up"></i></button>
      </div>
    </div>

    <!-- 1B. INBOX CHAT LONG-PRESS OPTIONS MODAL (Set Reminder, Read/Unread, Pin, Clear, Delete) -->
    <div id="pro-chat-longpress-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:7200; align-items:flex-end; justify-content:center; font-family:'Poppins', sans-serif;" onclick="closeChatLongPressMenu()">
      <div style="background:#ffffff; width:100%; max-width:480px; border-radius:24px 24px 0 0; padding:12px 0 26px; box-shadow:0 -4px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
        <div style="width:42px; height:4px; background:#cbd5e1; border-radius:4px; margin:4px auto 12px;"></div>
        <div id="lp-chat-title" style="padding:4px 24px 12px; font-weight:800; font-size:16px; color:#0f172a; border-bottom:1px solid #f1f5f9;">Chat Options</div>
        
        <div style="display:flex; flex-direction:column; font-size:15px; font-weight:500; color:#0f172a; padding-top:6px;">
          <div onclick="handleChatLongPressAction('reminder')" style="display:flex; align-items:center; gap:16px; padding:13px 24px; cursor:pointer;">
            <i class="fa-regular fa-bell" style="width:22px; font-size:18px; color:#2563eb;"></i> <span>Set Reminder</span>
          </div>
          <div onclick="handleChatLongPressAction('toggle_read')" style="display:flex; align-items:center; gap:16px; padding:13px 24px; cursor:pointer;">
            <i class="fa-regular fa-envelope-open" style="width:22px; font-size:18px; color:#0f172a;"></i> <span>Mark as Read / Unread</span>
          </div>
          <div onclick="handleChatLongPressAction('pin')" style="display:flex; align-items:center; gap:16px; padding:13px 24px; cursor:pointer;">
            <i class="fa-solid fa-thumbtack" style="width:22px; font-size:18px; color:#0f172a;"></i> <span>Pin / Unpin Chat</span>
          </div>
          <div onclick="handleChatLongPressAction('mute')" style="display:flex; align-items:center; gap:16px; padding:13px 24px; cursor:pointer;">
            <i class="fa-regular fa-bell-slash" style="width:22px; font-size:18px; color:#0f172a;"></i> <span>Mute Notifications</span>
          </div>
          <div onclick="handleChatLongPressAction('clear')" style="display:flex; align-items:center; gap:16px; padding:13px 24px; cursor:pointer; color:#f59e0b;">
            <i class="fa-solid fa-broom" style="width:22px; font-size:18px; color:#f59e0b;"></i> <span>Clear All Messages</span>
          </div>
          <div onclick="handleChatLongPressAction('delete')" style="display:flex; align-items:center; gap:16px; padding:13px 24px; cursor:pointer; color:#dc2626; font-weight:700; border-top:1px solid #f1f5f9; margin-top:4px;">
            <i class="fa-regular fa-trash-can" style="width:22px; font-size:18px; color:#dc2626;"></i> <span>Delete Entire Chat</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. INSTAGRAM REELS STYLE FULLSCREEN VERTICAL SCROLL PLAYER -->
    <div id="pro-scroll-feed-modal" style="display:none; position:fixed; inset:0; background:#000000; z-index:6200; flex-direction:column; font-family:'Poppins', sans-serif;">
      <div style="position:fixed; top:0; left:0; right:0; z-index:6210; display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:linear-gradient(rgba(0,0,0,0.75), transparent); color:#fff; pointer-events:none;">
        <div style="display:flex; align-items:center; gap:14px; pointer-events:auto;">
          <button onclick="closeScrollableFeedModal()" style="background:rgba(0,0,0,0.4); border:none; color:#fff; width:38px; height:38px; border-radius:50%; font-size:20px; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
          <span id="scroll-feed-header-title" style="font-weight:800; font-size:18px; text-shadow:0 1px 4px #000;">Reels</span>
        </div>
      </div>
      <div id="pro-scroll-feed-body" style="flex:1; width:100%; display:flex; flex-direction:column;"></div>
    </div>

    <!-- 3A. OTHER USER PROFILE 3-DOT MENU -->
    <div id="pro-other-user-menu-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:6900; align-items:flex-end; justify-content:center; font-family:'Poppins', sans-serif;" onclick="closeAllActionMenus()">
      <div style="background:#ffffff; width:100%; max-width:480px; border-radius:24px 24px 0 0; padding:10px 0 26px; box-shadow:0 -4px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
        <div style="width:42px; height:4px; background:#64748b; border-radius:4px; margin:4px auto 16px;"></div>
        <div style="display:flex; flex-direction:column; font-size:16px; font-weight:400; color:#0f172a;">
          <div onclick="handleOtherProfileMenuAction('restrict')" style="padding:13px 24px; cursor:pointer;">Restrict</div>
          <div onclick="handleOtherProfileMenuAction('block')" style="padding:13px 24px; cursor:pointer;">Block</div>
          <div onclick="handleOtherProfileMenuAction('report')" style="padding:13px 24px; cursor:pointer; color:#dc2626; font-weight:500;">Report</div>
          <div onclick="handleOtherProfileMenuAction('about')" style="padding:13px 24px; cursor:pointer;">About this account</div>
          <div onclick="handleOtherProfileMenuAction('shared')" style="padding:13px 24px; cursor:pointer;">See shared activity</div>
          <div onclick="handleOtherProfileMenuAction('hide_story')" style="padding:13px 24px; cursor:pointer;">Hide your story</div>
          <div onclick="handleOtherProfileMenuAction('copy_url')" style="padding:13px 24px; cursor:pointer;">Copy profile URL</div>
          <div onclick="handleOtherProfileMenuAction('share_profile')" style="padding:13px 24px; cursor:pointer;">Share this profile</div>
          <div onclick="handleOtherProfileMenuAction('qr')" style="padding:13px 24px; cursor:pointer;">QR code</div>
        </div>
      </div>
    </div>

    <!-- 3B. PUBLIC REELS 3-DOT MENU -->
    <div id="pro-reel-public-menu-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:6800; align-items:flex-end; justify-content:center; font-family:'Poppins', sans-serif;" onclick="closeAllActionMenus()">
      <div style="background:#ffffff; width:100%; max-width:480px; border-radius:24px 24px 0 0; padding:10px 0 24px; box-shadow:0 -4px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
        <div style="width:42px; height:4px; background:#cbd5e1; border-radius:4px; margin:4px auto 14px;"></div>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; padding:0 16px 14px; border-bottom:1px solid #f1f5f9;">
          <div onclick="handlePublicReelAction('save')" style="background:#f8fafc; border-radius:14px; padding:14px 8px; text-align:center; cursor:pointer;">
            <i class="fa-regular fa-bookmark" style="font-size:21px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:13px; font-weight:600; color:#0f172a;">Save</span>
          </div>
          <div onclick="handlePublicReelAction('remix')" style="background:#f8fafc; border-radius:14px; padding:14px 8px; text-align:center; cursor:pointer;">
            <i class="fa-solid fa-repeat" style="font-size:21px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:13px; font-weight:600; color:#0f172a;">Remix</span>
          </div>
          <div onclick="handlePublicReelAction('sequence')" style="background:#f8fafc; border-radius:14px; padding:14px 8px; text-align:center; cursor:pointer;">
            <i class="fa-solid fa-clapperboard" style="font-size:21px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:13px; font-weight:600; color:#0f172a;">Sequence</span>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; font-size:15px; font-weight:500; color:#0f172a; padding-top:6px;">
          <div onclick="handlePublicReelAction('fullscreen')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-expand" style="width:22px; font-size:18px;"></i> <span>View fullscreen</span>
          </div>
          <div onclick="toggleReelAutoScroll()" style="display:flex; align-items:center; justify-content:space-between; padding:13px 20px; cursor:pointer;">
            <div style="display:flex; align-items:center; gap:16px;">
              <i class="fa-solid fa-rotate-right" style="width:22px; font-size:18px;"></i> <span>Auto scroll</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="background:#4f46e5; color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px;">New</span>
              <div id="auto-scroll-switch" style="width:44px; height:24px; background:#cbd5e1; border-radius:20px; position:relative; transition:0.2s;">
                <div id="auto-scroll-knob" style="width:20px; height:20px; background:#fff; border-radius:50%; position:absolute; top:2px; left:2px; transition:0.2s;"></div>
              </div>
            </div>
          </div>

          <div style="border-top:1px solid #f1f5f9; margin:4px 0;"></div>

          <div onclick="handlePublicReelAction('why')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-circle-info" style="width:22px; font-size:18px;"></i> <span>Why you're seeing this post</span>
          </div>
          <div onclick="handlePublicReelAction('interested')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-regular fa-eye" style="width:22px; font-size:18px;"></i> <span>Interested</span>
          </div>
          <div onclick="handlePublicReelAction('not_interested')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-regular fa-eye-slash" style="width:22px; font-size:18px;"></i> <span>Not interested</span>
          </div>
          <div onclick="handlePublicReelAction('report')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer; color:#dc2626; font-weight:700;">
            <i class="fa-solid fa-circle-exclamation" style="width:22px; font-size:18px; color:#dc2626;"></i> <span>Report</span>
          </div>

          <div style="border-top:1px solid #f1f5f9; margin:4px 0;"></div>

          <div onclick="handlePublicReelAction('preferences')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-sliders" style="width:22px; font-size:18px;"></i> <span>Manage content preferences</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3C. PROFILE OWNER 3-DOT MENU -->
    <div id="pro-ig-action-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:6800; align-items:flex-end; justify-content:center; font-family:'Poppins', sans-serif;" onclick="closeAllActionMenus()">
      <div style="background:#ffffff; width:100%; max-width:480px; max-height:85vh; border-radius:24px 24px 0 0; overflow-y:auto; padding:10px 0 24px; box-shadow:0 -4px 25px rgba(0,0,0,0.2);" onclick="event.stopPropagation()">
        <div style="width:42px; height:4px; background:#cbd5e1; border-radius:4px; margin:4px auto 14px;"></div>
        
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; padding:0 16px 14px; border-bottom:1px solid #f1f5f9;">
          <div onclick="handleIGMenuAction('save')" style="background:#f8fafc; border-radius:14px; padding:12px 8px; text-align:center; cursor:pointer;">
            <i class="fa-regular fa-bookmark" style="font-size:20px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:12.5px; font-weight:600; color:#0f172a;">Save</span>
          </div>
          <div onclick="handleIGMenuAction('remix')" style="background:#f8fafc; border-radius:14px; padding:12px 8px; text-align:center; cursor:pointer;">
            <i class="fa-solid fa-repeat" style="font-size:20px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:12.5px; font-weight:600; color:#0f172a;">Remix</span>
          </div>
          <div onclick="handleIGMenuAction('qr')" style="background:#f8fafc; border-radius:14px; padding:12px 8px; text-align:center; cursor:pointer;">
            <i class="fa-solid fa-qrcode" style="font-size:20px; color:#0f172a; display:block; margin-bottom:6px;"></i>
            <span style="font-size:12.5px; font-weight:600; color:#0f172a;">QR code</span>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; font-size:15px; font-weight:500; color:#0f172a;">
          <div onclick="handleIGMenuAction('archive')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-clock-rotate-left" style="width:22px; font-size:18px;"></i> <span id="ig-txt-archive">Archive</span>
          </div>
          <div onclick="handleIGMenuAction('hideLikes')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-regular fa-heart" style="width:22px; font-size:18px;"></i> <span id="ig-txt-likes">Hide like count to others</span>
          </div>
          <div onclick="handleIGMenuAction('hideShares')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-regular fa-paper-plane" style="width:22px; font-size:18px;"></i> <span>Hide share count</span>
          </div>
          <div onclick="handleIGMenuAction('turnOffComments')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-regular fa-comment-slash" style="width:22px; font-size:18px;"></i> <span id="ig-txt-comments">Turn off commenting</span>
          </div>
          <div onclick="handleIGMenuAction('edit')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-pen" style="width:22px; font-size:18px;"></i> <span>Edit</span>
          </div>
          <div onclick="handleIGMenuAction('pin')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-thumbtack" style="width:22px; font-size:18px;"></i> <span id="ig-txt-pin">Pin to your main grid</span>
          </div>
          <div onclick="handleIGMenuAction('removeGrid')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-circle-minus" style="width:22px; font-size:18px;"></i> <span>Remove from main grid</span>
          </div>
          <div onclick="handleIGMenuAction('insights')" style="display:flex; align-items:center; gap:16px; padding:13px 20px; cursor:pointer;">
            <i class="fa-solid fa-chart-simple" style="width:22px; font-size:18px;"></i> <span>View insights</span>
          </div>
          <div onclick="handleIGMenuAction('delete')" style="display:flex; align-items:center; gap:16px; padding:14px 20px; cursor:pointer; color:#dc2626; font-weight:700; border-top:1px solid #f1f5f9; margin-top:4px;">
            <i class="fa-regular fa-trash-can" style="width:22px; font-size:19px; color:#dc2626;"></i> <span>Delete</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. INSTAGRAM STYLE FULLSCREEN NOTIFICATIONS VIEW -->
    <div id="pro-notifications-modal" style="display:none; position:fixed; inset:0; background:#ffffff; z-index:5800; flex-direction:column; font-family:'Poppins', sans-serif;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid #f1f5f9;">
        <div style="display:flex; align-items:center; gap:14px;">
          <button onclick="closeProNotifications()" style="background:none; border:none; font-size:20px; color:#0f172a; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
          <h3 style="margin:0; font-size:19px; font-weight:800; color:#0f172a;">Notifications</h3>
        </div>
        <span style="color:#dc2626; font-weight:700; font-size:13px; cursor:pointer;" onclick="clearMyNotifications()">Clear All</span>
      </div>
      <div id="pro-notif-list-body" style="flex:1; overflow-y:auto; padding-bottom:30px;"></div>
    </div>

    <!-- 5. REAL COMMENTS DRAWER MODAL -->
    <div id="pro-comments-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:6500; align-items:flex-end; justify-content:center; font-family:'Poppins', sans-serif;" onclick="closeCommentsModal()">
      <div style="background:#fff; width:100%; max-width:480px; height:72vh; border-radius:22px 22px 0 0; display:flex; flex-direction:column; overflow:hidden;" onclick="event.stopPropagation()">
        <div style="padding:12px 16px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center;">
          <div style="width:30px;"></div>
          <h4 style="margin:0; font-size:15px; font-weight:800; color:#0f172a;">Comments</h4>
          <button onclick="closeCommentsModal()" style="border:none; background:#f1f5f9; width:30px; height:30px; border-radius:50%; font-weight:800; cursor:pointer;">✕</button>
        </div>
        <div id="pro-comments-list" style="flex:1; overflow-y:auto; padding:14px;"></div>
        <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-top:1px solid #f1f5f9; background:#fff;">
          <img id="cmt-my-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" style="width:36px; height:36px; border-radius:50%; object-fit:cover;">
          <input type="text" id="pro-comment-input" placeholder="Add a comment..." style="flex:1; border:1px solid #e2e8f0; border-radius:22px; padding:9px 14px; font-size:13.5px; outline:none;" onkeypress="if(event.key==='Enter') submitRealComment()">
          <button onclick="submitRealComment()" style="background:#2563eb; color:#fff; border:none; padding:9px 16px; border-radius:20px; font-weight:700; font-size:13px; cursor:pointer;">Post</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);
}

function setupVideoFileInput() {
  const fileInp = document.querySelector('#create-content-modal input[type="file"]');
  if (fileInp) {
    fileInp.setAttribute('id', 'cr-file-input');
    fileInp.setAttribute('accept', 'image/*,video/*');
  }
}

function upgradeBusinessProfileTabs() {
  const bizTabs = document.querySelector('#business-profile-box .prof-sub-tabs');
  if (bizTabs) {
    bizTabs.innerHTML = `
      <span onclick="switchBizMediaTab('Posts', this)">Posts</span>
      <span class="active" onclick="switchBizMediaTab('Products', this)">Products</span>
      <span onclick="switchBizMediaTab('Reels', this)">Reels</span>
      <span onclick="switchBizMediaTab('Moments', this)">Moments</span>
      <span id="biz-archived-tab-btn" onclick="switchBizMediaTab('Archived', this)">Archived</span>
    `;
  }
  const peopleTabs = document.getElementById('people-sub-tabs');
  if (peopleTabs && !document.getElementById('people-archived-tab-btn')) {
    const archSpan = document.createElement('span');
    archSpan.id = 'people-archived-tab-btn';
    archSpan.innerText = 'Archived';
    archSpan.onclick = function() { switchPeopleMediaTab('archived', this); };
    peopleTabs.appendChild(archSpan);
  }
}

// =========================================================
// 1. REAL AUTHENTICATION
// =========================================================
function openNeonSignupScreen() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'block';
}
function backToWelcomeScreen() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('welcome-screen').style.display = 'flex';
}
function openLoginModal() { document.getElementById('login-modal').style.display = 'flex'; }
function closeLoginModal() { document.getElementById('login-modal').style.display = 'none'; }

function switchAuthAccount(type) {
  authAccountType = type;
  let isP = (type === 'people');
  document.getElementById('tab-acc-people').classList.toggle('active', isP);
  document.getElementById('tab-acc-business').classList.toggle('active', !isP);
  document.getElementById('auth-people-fields').style.display = isP ? 'block' : 'none';
  document.getElementById('auth-business-fields').style.display = isP ? 'none' : 'block';
  document.getElementById('auth-biz-about-wrap').style.display = isP ? 'none' : 'block';
  document.getElementById('auth-heading').innerHTML = isP ? 'Create <span>People</span> Account' : 'Create <span>Business</span> Account';
  document.getElementById('main-submit-txt').innerText = isP ? 'Create Account' : 'Create Business Account';
}

function switchVerifyTab(method) {
  let isMob = (method === 'mobile');
  document.getElementById('tab-ver-mobile').classList.toggle('active', isMob);
  document.getElementById('tab-ver-email').classList.toggle('active', !isMob);
  document.getElementById('ver-mobile-box').style.display = isMob ? 'flex' : 'none';
  document.getElementById('ver-email-box').style.display = isMob ? 'none' : 'flex';
}

function togglePassVis(inputId, iconEl) {
  let inp = document.getElementById(inputId);
  if (inp.type === 'password') {
    inp.type = 'text';
    iconEl.className = 'fa-regular fa-eye pass-eye';
  } else {
    inp.type = 'password';
    iconEl.className = 'fa-regular fa-eye-slash pass-eye';
  }
}

function triggerAuthOTP() {
  let code = Math.floor(1000 + Math.random() * 9000);
  document.getElementById('reg-otp').value = code;
  showToast(`🔐 तुमचा Verification OTP आहे: <b>${code}</b>`);
}

function sendQuickLoginOTP() {
  let code = Math.floor(100000 + Math.random() * 900000);
  document.getElementById('login-pass-input').value = code;
  showToast(`📱 तुमचा Quick OTP आहे: <b>${code}</b>`);
}

function detectUserGPS(inputId) {
  let inp = document.getElementById(inputId);
  inp.value = '📡 GPS शोधत आहे...';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        let res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        let data = await res.json();
        let city = data.address.city || data.address.town || data.address.village || 'Ardhapur';
        let state = data.address.state || 'Maharashtra';
        inp.value = `${city}, ${state}`;
        showToast('📍 तुमचे खरे GPS लोकेशन जोडले!');
      } catch (e) {
        inp.value = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
      }
    }, () => {
      inp.value = 'Ardhapur, Maharashtra';
    });
  }
}

async function submitRegistration() {
  if (!auth) await initRealFirebaseApp();
  if (!auth) return showToast('⏳ Firebase कनेक्ट होत आहे...');

  let email = document.getElementById('reg-email').value.trim();
  let mob = document.getElementById('reg-mobile').value.trim();
  let pass = document.getElementById('reg-pass').value.trim();
  let loc = document.getElementById('reg-location').value.trim() || 'Ardhapur, Maharashtra';

  let authEmail = email || (mob ? `${mob}@albiznet.com` : '');
  if (!authEmail || pass.length < 6) {
    return showToast('⚠️ कृपया मोबाईल/Gmail आणि किमान ६ अंकी पासवर्ड टाका!');
  }

  try {
    showToast('⏳ अकाउंट तयार होत आहे...');
    let cred;
    try {
      cred = await auth.createUserWithEmailAndPassword(authEmail, pass);
    } catch (signUpErr) {
      if (signUpErr.code === 'auth/email-already-in-use') {
        cred = await auth.signInWithEmailAndPassword(authEmail, pass);
      } else {
        throw signUpErr;
      }
    }

    const uid = cred.user.uid;
    let name = authAccountType === 'people'
      ? document.getElementById('reg-p-name').value.trim()
      : document.getElementById('reg-b-name').value.trim();
    let finalName = name || 'ALBIZNET User';

    let userPayload = {
      uid: uid,
      type: authAccountType,
      name: finalName,
      handle: '@' + finalName.toLowerCase().replace(/\s+/g, ''),
      category: authAccountType === 'business' ? (document.getElementById('reg-b-cat').value.trim() || 'Shops') : 'Personal Account',
      about: authAccountType === 'business'
        ? (document.getElementById('reg-b-about').value.trim() || 'Welcome to our official business store!')
        : `Hi! I'm ${finalName}, connected on ALBIZNET.`,
      location: loc,
      phone: mob,
      email: email || authEmail,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=4f46e5&color=fff&bold=true`,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(uid).set(userPayload, { merge: true });
    currentUserData = userPayload;
    showToast(`🎉 स्वागत आहे ${finalName}! तुमचे अकाउंट तयार झाले.`);
    launchMainApp();
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

async function handleLoginSubmit() {
  if (!auth) await initRealFirebaseApp();
  let idVal = document.getElementById('login-id-input').value.trim();
  let pass = document.getElementById('login-pass-input').value.trim();
  if (!idVal || !pass) return showToast('⚠️ कृपया मोबाईल/Gmail आणि पासवर्ड टाका!');
  let authEmail = idVal.includes('@') ? idVal : `${idVal}@albiznet.com`;

  try {
    await auth.signInWithEmailAndPassword(authEmail, pass);
    closeLoginModal();
    showToast('✅ यशस्वीरित्या लॉगिन झाले!');
  } catch (err) {
    showToast('❌ लॉगिन एरर: ' + err.message);
  }
}

async function openGoogleChooser() {
  if (!auth) await initRealFirebaseApp();
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const res = await auth.signInWithPopup(provider);
    const u = res.user;
    const docRef = db.collection('users').doc(u.uid);
    const snap = await docRef.get();

    if (!snap.exists) {
      let gName = u.displayName || 'User';
      let newData = {
        uid: u.uid,
        type: authAccountType || 'people',
        name: gName,
        handle: '@' + (u.email ? u.email.split('@')[0] : 'user'),
        category: authAccountType === 'business' ? 'Shops' : 'Personal Account',
        about: `Hi! I'm ${gName} on ALBIZNET.`,
        location: 'Ardhapur, Maharashtra',
        phone: u.phoneNumber || '',
        email: u.email || '',
        avatar: u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(gName)}&background=4f46e5&color=fff&bold=true`,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await docRef.set(newData);
      currentUserData = newData;
    } else {
      currentUserData = { uid: u.uid, ...snap.data() };
    }
    showToast('✅ Google लॉगिन यशस्वी!');
    launchMainApp();
  } catch (err) {
    showToast('❌ Google Sign-In Error: ' + err.message);
  }
}

function closeGoogleChooser() {
  let m = document.getElementById('google-chooser-modal');
  if (m) m.style.display = 'none';
}

// =========================================================
// 2. REAL-TIME STREAMS & MULTI-CHUNK VIDEO ASSEMBLER
// =========================================================
function launchMainApp() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('main-app-shell').style.display = 'block';

  if (currentUserData) {
    let locTxt = document.getElementById('nearby-user-loc-txt');
    if (locTxt && currentUserData.location) locTxt.innerText = currentUserData.location;
    let cmtAv = document.getElementById('cmt-my-avatar');
    if (cmtAv && currentUserData.avatar) cmtAv.src = currentUserData.avatar;
    activeProfileUser = currentUserData;
  }

  listenToAllUsersDirectory();
  listenToRealPostsAndReels();
  listenToRealOffers();
  listenToRealMessages();
  listenToRealNotifications();
  switchBottomNav('home');
}

function sortByPinnedAndCreatedDesc(arr) {
  return arr.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    let tA = a.timeMs || (a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0);
    let tB = b.timeMs || (b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0);
    return tB - tA;
  });
}

function getRelativeTime(ms) {
  if (!ms) return 'Just now';
  let diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd';
  return Math.floor(diff / 604800) + 'w';
}

const resolvedChunkMediaCache = {};
async function resolveChunkedMediaItems(items) {
  for (let item of items) {
    if (item.isChunked && item.chunkGroupId) {
      if (resolvedChunkMediaCache[item.chunkGroupId]) {
        item.img = resolvedChunkMediaCache[item.chunkGroupId];
      } else {
        try {
          const snap = await db.collection('media_chunks').where('groupId', '==', item.chunkGroupId).get();
          if (!snap.empty) {
            const sorted = snap.docs.map(d => d.data()).sort((a, b) => a.index - b.index);
            const fullBase64 = sorted.map(s => s.data).join('');
            resolvedChunkMediaCache[item.chunkGroupId] = fullBase64;
            item.img = fullBase64;
          }
        } catch (e) {}
      }
    }
  }
}

function listenToAllUsersDirectory() {
  db.collection('users').onSnapshot(snap => {
    cacheAllUsers = snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
    cacheBusinesses = cacheAllUsers.filter(u => u.type === 'business');
    renderNearbyStores();
    renderMessagesPeopleBar();
    if (activeMsgTab === 'Marketplace') renderMessagesList();
  });
}

function listenToRealPostsAndReels() {
  db.collection('reels').onSnapshot(async snap => {
    let rawReels = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'reels', ...d.data() })));
    await resolveChunkedMediaItems(rawReels);
    cacheReels = rawReels;
    renderReelsBar();
    if (activeExploreFilter === 'Trending Reels') renderExploreOffers();
    renderProfileMediaGrid();
    renderBizMediaSection();
  });

  db.collection('posts').onSnapshot(async snap => {
    let rawPosts = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'posts', ...d.data() })));
    await resolveChunkedMediaItems(rawPosts);
    cachePosts = rawPosts;
    renderHomeFeed();
    renderExploreOffers();
    renderProfileMediaGrid();
    renderBizMediaSection();
    if (activeCommentPostId) renderCommentsList(activeCommentPostId);
  });

  db.collection('stories').onSnapshot(async snap => {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const validStories = [];

    snap.docs.forEach(doc => {
      const data = doc.data();
      const createdTime = data.timeMs || (data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : now);
      const expiryTime = data.expiresAt || (createdTime + twentyFourHours);

      if (now > expiryTime) {
        db.collection('stories').doc(doc.id).delete().catch(() => {});
      } else {
        validStories.push({ id: doc.id, _col: 'stories', ...data });
      }
    });

    let sortedSt = sortByPinnedAndCreatedDesc(validStories);
    await resolveChunkedMediaItems(sortedSt);
    cacheStories = sortedSt;
    renderStoriesMomentsBar();
    renderProfileMediaGrid();
    renderBizMediaSection();
  });

  db.collection('notes').onSnapshot(snap => {
    cacheNotes = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'notes', ...d.data() })));
    renderMessagesPeopleBar();
    renderProfileMediaGrid();
  });

  db.collection('products').onSnapshot(async snap => {
    let rawProds = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'products', ...d.data() })));
    await resolveChunkedMediaItems(rawProds);
    cacheProducts = rawProds;
    renderCatalogGrid();
    renderBizMediaSection();
    if (activeMsgTab === 'Marketplace') renderMessagesList();
  });
}

function renderStoriesMomentsBar() {
  const momentsBar = document.querySelector('#view-home .moments-scroll-bar');
  if (!momentsBar) return;

  const firstYourMoment = momentsBar.querySelector('.your-moment-box').outerHTML;
  const visibleStories = cacheStories.filter(s => !s.archived && !s.hiddenFromGrid);

  const realStoriesHTML = visibleStories.map(st => `
    <div class="story-circle-item" onclick="openScrollableMediaFeed('stories', '${st.id}', 'Moments', null, 'public_reel')">
      <div class="story-grad-ring"><img src="${st.avatar || st.img}"><span class="story-plus">+</span></div>
      <span>${(st.author || 'User').split(' ')[0]}</span>
    </div>
  `).join('');

  momentsBar.innerHTML = firstYourMoment + realStoriesHTML;
}

function renderReelsBar() {
  let rBox = document.getElementById('reels-container');
  if (!rBox) return;
  const visibleReels = cacheReels.filter(r => !r.archived && !r.hiddenFromGrid && r.img);

  if (visibleReels.length === 0) {
    rBox.innerHTML = `<p style="font-size:12px; color:#64748b; padding:10px;">अजून कोणतीही Reel नाही. '+ Create ➔ Reel' वरून व्हिडिओ टाका!</p>`;
    return;
  }

  rBox.innerHTML = visibleReels.map(r => {
    const isVid = r.mediaType === 'video' || (r.img && (r.img.startsWith('data:video') || r.img.includes('.mp4')));
    const titleTxt = r.caption || r.author || 'Reel';
    return `
      <div class="reel-thumb-card" onclick="openScrollableMediaFeed('reels', '${r.id}', 'Reels', null, 'public_reel')" style="min-width:138px; height:215px; background:#0f172a; border-radius:16px; position:relative; overflow:hidden; cursor:pointer; margin-right:10px; flex-shrink:0;">
        ${isVid
          ? `<video src="${r.img}#t=0.1" style="width:100%; height:100%; object-fit:cover;" muted playsinline preload="metadata"></video>`
          : `<img src="${r.img}" style="width:100%; height:100%; object-fit:cover;">`
        }
        <button onclick="event.stopPropagation(); openItemActionMenu('${r.id}', 'reels', 'public_reel')" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:#fff; border:none; width:28px; height:28px; border-radius:50%; font-size:13px; cursor:pointer; z-index:2;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.6); color:#fff; padding:6px 12px; border-radius:20px; font-size:12px; font-weight:700;"><i class="fa-solid fa-play"></i> Play</div>
        <div style="position:absolute; bottom:8px; left:8px; right:8px; color:#fff; font-size:11px; text-shadow:0 1px 3px #000;">
          <div style="font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">${titleTxt}</div>
          <div style="display:flex; justify-content:space-between; opacity:0.9;">
            <span>${r.views || 1} Views 🔥</span>
            <span>${(r.author || 'User').split(' ')[0]}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// =========================================================
// HOME FEED POSTS
// =========================================================
function renderHomeFeed() {
  let pBox = document.getElementById('home-posts-feed');
  if (!pBox) return;

  const visiblePosts = cachePosts.filter(p => !p.archived && !p.hiddenFromGrid);
  if (visiblePosts.length === 0) {
    pBox.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b;">अजून कोणतीही पोस्ट नाही. '+ Create ➔ Post' वर दाबून पहिली पोस्ट करा!</div>`;
    return;
  }

  const myUid = currentUserData ? currentUserData.uid : 'guest';

  pBox.innerHTML = visiblePosts.map(p => {
    let postId = p.id;
    let isMyPost = currentUserData && p.uid === currentUserData.uid;
    let menuCtx = isMyPost ? 'profile_owner' : 'public_reel';
    let likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
    let isLiked = likedBy.includes(myUid);
    let likeCount = typeof p.likes === 'number' ? p.likes : likedBy.length;
    let cmtList = Array.isArray(p.commentsList) ? p.commentsList : [];
    let cmtCount = cmtList.length || p.commentsCount || 0;
    let isVid = p.mediaType === 'video' || (p.img && (p.img.startsWith('data:video') || p.img.includes('.mp4')));

    return `
      <div class="feed-post-card" style="background:#fff; border-radius:18px; padding:14px; margin:12px 14px; box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <div class="fp-top-row" style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <img class="fp-avatar" src="${p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" onclick="openUserProfile('${p.uid}')" style="width:42px; height:42px; border-radius:50%; object-fit:cover; cursor:pointer;">
          <div style="flex:1;">
            <div class="fp-name" onclick="openUserProfile('${p.uid}')" style="font-weight:800; font-size:15px; color:#0f172a; cursor:pointer;">
              ${p.author || 'ALBIZNET User'} ${p.pinned ? '<span style="font-size:11px; color:#2563eb; margin-left:4px;">📌 Pinned</span>' : ''}
            </div>
            <div class="fp-cat-tag" style="font-size:12px; color:#64748b;"><i class="fa-solid fa-location-dot"></i> ${p.location || 'Maharashtra'} &bull; <span style="color:#4f46e5; font-weight:700;">${p.category || 'Post'}</span></div>
          </div>
          <button onclick="openItemActionMenu('${postId}', 'posts', '${menuCtx}')" style="background:#f8fafc; border:none; width:34px; height:34px; border-radius:50%; color:#334155; font-size:16px; cursor:pointer;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        </div>
        <div class="fp-caption" style="font-size:14.5px; color:#1e293b; margin-bottom:10px; line-height:1.45;">${p.caption || ''}</div>
        ${p.img ? (
          isVid
            ? `<video src="${p.img}" controls playsinline style="width:100%; max-height:400px; border-radius:14px; background:#000;"></video>`
            : `<img class="fp-media-img" src="${p.img}" onclick="openScrollableMediaFeed('posts', '${postId}', 'Posts', null, '${menuCtx}')" style="width:100%; max-height:400px; object-fit:cover; border-radius:14px; cursor:pointer;">`
        ) : ''}
        
        <div class="fp-actions-bar" style="display:flex; justify-content:space-around; align-items:center; padding-top:12px; margin-top:12px; border-top:1px solid #f1f5f9; font-size:14px; font-weight:700; color:#334155;">
          <div onclick="toggleLikeDislikeItem('${postId}', 'posts')" style="cursor:pointer; display:flex; align-items:center; gap:6px; color:${isLiked ? '#e11d48' : '#475569'};">
            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="font-size:18px; color:${isLiked ? '#e11d48' : '#475569'};"></i>
            <span>${p.hideLikes ? 'Like' : (likeCount + ' Like')}</span>
          </div>
          <div onclick="openCommentsModal('${postId}', 'posts')" style="cursor:pointer; display:flex; align-items:center; gap:6px; color:#475569;">
            <i class="fa-regular fa-comment" style="font-size:18px;"></i>
            <span>${p.commentsOff ? 'Comments Off' : (cmtCount + ' Comment')}</span>
          </div>
          <div onclick="shareRealPost('${postId}', '${(p.caption || 'ALBIZNET Post').replace(/'/g, '')}')" style="cursor:pointer; display:flex; align-items:center; gap:6px; color:#475569;">
            <i class="fa-solid fa-share-nodes" style="font-size:17px;"></i>
            <span>Share</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getCacheArrayByCol(col) {
  if (col === 'reels') return cacheReels;
  if (col === 'stories') return cacheStories;
  if (col === 'notes') return cacheNotes;
  if (col === 'offers') return cacheOffers;
  if (col === 'products') return cacheProducts;
  return cachePosts;
}

async function toggleLikeDislikeItem(itemId, colName = 'posts') {
  if (!currentUserData) return showToast('⚠️ कृपया आधी लॉगिन करा!');
  const arr = getCacheArrayByCol(colName);
  const item = arr.find(x => x.id === itemId);
  if (!item) return;

  const myUid = currentUserData.uid;
  let likedBy = Array.isArray(item.likedBy) ? [...item.likedBy] : [];
  let currentLikes = typeof item.likes === 'number' ? item.likes : likedBy.length;

  if (likedBy.includes(myUid)) {
    likedBy = likedBy.filter(id => id !== myUid);
    currentLikes = Math.max(0, currentLikes - 1);
    await db.collection(colName).doc(itemId).update({ likedBy, likes: currentLikes });
  } else {
    likedBy.push(myUid);
    currentLikes = currentLikes + 1;
    await db.collection(colName).doc(itemId).update({ likedBy, likes: currentLikes });

    if (item.uid && item.uid !== myUid) {
      await pushRealNotification({
        targetUid: item.uid,
        type: 'like',
        actorUid: currentUserData.uid,
        actorName: currentUserData.name,
        actorHandle: currentUserData.handle || '@' + currentUserData.name.toLowerCase().replace(/\s+/g, ''),
        actorAvatar: currentUserData.avatar,
        text: `liked your ${colName.slice(0, -1)}: "${(item.caption || 'Media').substring(0, 22)}"`
      });
    }
  }
}
// =========================================================
// INSTAGRAM REELS FULLSCREEN VERTICAL PLAYER (PART 2)
// =========================================================
function openScrollableMediaFeed(colName, startId, headerTitle, customList, menuContext = 'public_reel') {
  let raw = customList || getCacheArrayByCol(colName).filter(i => !i.archived && i.img);
  if (!raw || raw.length === 0) return;

  const clickedIndex = raw.findIndex(x => String(x.id) === String(startId));
  let ordered = [...raw];
  if (clickedIndex > 0) {
    ordered = [...raw.slice(clickedIndex), ...raw.slice(0, clickedIndex)];
  }

  if (colName === 'reels' && ordered.length < 5) {
    const extraMedia = cachePosts.filter(p => !p.archived && p.img && !ordered.some(o => o.id === p.id));
    ordered = [...ordered, ...extraMedia];
  }

  document.getElementById('scroll-feed-header-title').innerText = headerTitle || 'Reels';
  const feedBody = document.getElementById('pro-scroll-feed-body');
  const myUid = currentUserData ? currentUserData.uid : 'guest';

  if (ordered[0] && (ordered[0]._col === 'reels' || colName === 'reels')) {
    db.collection('reels').doc(ordered[0].id).update({
      views: firebase.firestore.FieldValue.increment(1)
    }).catch(() => {});
  }

  feedBody.innerHTML = ordered.map((item, index) => {
    const col = item._col || colName || 'reels';
    const isVid = item.mediaType === 'video' || (item.img && (item.img.startsWith('data:video') || item.img.includes('.mp4')));
    const label = item.caption || item.deal || item.title || item.noteText || '';
    const author = item.author || item.bizName || item.sellerName || 'ALBIZNET User';
    const authorAv = item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=4f46e5&color=fff`;
    const likedBy = Array.isArray(item.likedBy) ? item.likedBy : [];
    const isLiked = likedBy.includes(myUid);
    const likesCount = typeof item.likes === 'number' ? item.likes : likedBy.length;
    const cmtCount = (Array.isArray(item.commentsList) ? item.commentsList.length : item.commentsCount) || 0;

    return `
      <div class="scroll-snap-slide" data-index="${index}" data-id="${item.id}" data-col="${col}" style="background:#000; display:flex; align-items:center; justify-content:center; overflow:hidden;">
        ${isVid
          ? `<video src="${item.img}" class="scroll-feed-video" ${index === 0 ? 'autoplay' : ''} loop playsinline style="width:100%; height:100%; object-fit:cover; background:#000;" onclick="this.paused ? this.play() : this.pause()"></video>`
          : `<img src="${item.img}" style="width:100%; height:100%; object-fit:contain; background:#000;">`
        }

        <div style="position:absolute; right:14px; bottom:44px; display:flex; flex-direction:column; align-items:center; gap:20px; z-index:5;">
          <div onclick="toggleLikeDislikeItem('${item.id}', '${col}')" style="text-align:center; color:#fff; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,0.85);">
            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart" style="font-size:28px; color:${isLiked ? '#ef4444' : '#ffffff'};"></i>
            <div style="font-size:12px; font-weight:700; margin-top:2px;">${item.hideLikes ? 'Likes' : likesCount}</div>
          </div>

          <div onclick="openCommentsModal('${item.id}', '${col}')" style="text-align:center; color:#fff; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,0.85);">
            <i class="fa-regular fa-comment" style="font-size:26px;"></i>
            <div style="font-size:12px; font-weight:700; margin-top:2px;">${cmtCount}</div>
          </div>

          <div onclick="openCreateContentModal('Reel')" style="text-align:center; color:#fff; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,0.85);">
            <i class="fa-solid fa-repeat" style="font-size:24px;"></i>
            <div style="font-size:11px; font-weight:700; margin-top:2px;">Remix</div>
          </div>

          <div onclick="shareRealPost('${item.id}', '${label.replace(/'/g, '')}')" style="text-align:center; color:#fff; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,0.85);">
            <i class="fa-regular fa-paper-plane" style="font-size:24px;"></i>
          </div>

          <div onclick="showToast('🔖 Saved!')" style="text-align:center; color:#fff; cursor:pointer; text-shadow:0 2px 6px rgba(0,0,0,0.85);">
            <i class="fa-regular fa-bookmark" style="font-size:24px;"></i>
          </div>

          <div onclick="openItemActionMenu('${item.id}', '${col}', '${menuContext}')" style="text-align:center; color:#fff; cursor:pointer; padding:6px;">
            <i class="fa-solid fa-ellipsis-vertical" style="font-size:22px;"></i>
          </div>
        </div>

        <div style="position:absolute; bottom:28px; left:14px; right:76px; color:#fff; text-shadow:0 1px 4px rgba(0,0,0,0.9); z-index:4; pointer-events:auto;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <img src="${authorAv}" onclick="closeScrollableFeedModal(); openUserProfile('${item.uid}')" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1.5px solid #fff; cursor:pointer;">
            <span onclick="closeScrollableFeedModal(); openUserProfile('${item.uid}')" style="font-weight:800; font-size:15px; cursor:pointer;">${author}</span>
            <button onclick="closeScrollableFeedModal(); openUserProfile('${item.uid}')" style="background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,0.85); padding:3px 12px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Follow</button>
          </div>
          <div style="font-size:14px; opacity:0.95; line-height:1.35;">${label}</div>
          <div style="font-size:12px; opacity:0.8; margin-top:6px;"><i class="fa-solid fa-music"></i> Original Audio &bull; ${author}</div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('pro-scroll-feed-modal').style.display = 'flex';
  feedBody.scrollTop = 0;

  setupScrollVideoAutoPlay();
}

function setupScrollVideoAutoPlay() {
  const slides = document.querySelectorAll('#pro-scroll-feed-body .scroll-snap-slide');
  const feedBody = document.getElementById('pro-scroll-feed-body');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const vid = entry.target.querySelector('video');
      const rId = entry.target.getAttribute('data-id');
      const rCol = entry.target.getAttribute('data-col');

      if (entry.isIntersecting) {
        if (rCol === 'reels' && rId) {
          db.collection('reels').doc(rId).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
        }
        if (vid) {
          vid.currentTime = 0;
          vid.play().catch(() => {});
          vid.onended = () => {
            if (autoScrollReelsEnabled) {
              const nextSlide = entry.target.nextElementSibling;
              if (nextSlide) nextSlide.scrollIntoView({ behavior: 'smooth' });
            } else {
              vid.play().catch(() => {});
            }
          };
        }
      } else {
        if (vid) vid.pause();
      }
    });
  }, { root: feedBody, threshold: 0.6 });

  slides.forEach(s => observer.observe(s));
}

function closeScrollableFeedModal() {
  document.querySelectorAll('#pro-scroll-feed-body video').forEach(v => v.pause());
  document.getElementById('pro-scroll-feed-modal').style.display = 'none';
}

// =========================================================
// SEPARATE 3-DOT MENUS: OTHER PROFILE vs PUBLIC REEL vs OWNER
// =========================================================
function openOtherUserProfileMenu() {
  document.getElementById('pro-other-user-menu-modal').style.display = 'flex';
}

function handleOtherProfileMenuAction(action) {
  closeAllActionMenus();
  const targetName = activeProfileUser ? activeProfileUser.name : 'User';
  const profileUrl = window.location.origin + '/?user=' + (activeProfileUser ? activeProfileUser.uid : '');

  if (action === 'restrict') {
    showToast(`🚫 ${targetName} ला Restrict केले आहे.`);
  } else if (action === 'block') {
    if (confirm(`🚫 तुम्हाला ${targetName} ला Block करायचे आहे का?`)) {
      showToast(`🚫 ${targetName} ला यशस्वीरित्या Block केले!`);
      switchBottomNav('home');
    }
  } else if (action === 'report') {
    showToast(`🚨 ${targetName} विरुद्ध तुमचा Report सबमिट झाला आहे.`);
  } else if (action === 'about') {
    alert(`👤 About this account:\n\nName: ${targetName}\nLocation: ${activeProfileUser?.location || 'Maharashtra'}\nJoined: October 2026\nVerified on ALBIZNET Cloud`);
  } else if (action === 'shared') {
    showToast(`🤝 ${targetName} सोबतची Shared Activity पाहिली जात आहे.`);
  } else if (action === 'hide_story') {
    showToast(`🙈 तुमची Story आता ${targetName} पासून लपवली जाईल.`);
  } else if (action === 'copy_url') {
    navigator.clipboard?.writeText(profileUrl);
    showToast('🔗 Profile URL कॉपी केली!');
  } else if (action === 'share_profile') {
    if (navigator.share) {
      navigator.share({ title: `${targetName} on ALBIZNET`, url: profileUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(profileUrl);
      showToast('🔗 प्रोफाईल लिंक शेअरसाठी कॉपी केली!');
    }
  } else if (action === 'qr') {
    showToast(`📱 ${targetName} चा QR Code तयार केला!`);
  }
}

function openItemActionMenu(itemId, colName, contextType = 'profile_owner') {
  activeMenuTarget = { id: itemId, col: colName || 'posts', context: contextType };

  if (contextType === 'public_reel') {
    document.getElementById('pro-reel-public-menu-modal').style.display = 'flex';
  } else {
    const arr = getCacheArrayByCol(activeMenuTarget.col);
    const item = arr.find(x => x.id === itemId);
    if (item) {
      document.getElementById('ig-txt-archive').innerText = item.archived ? 'Unarchive' : 'Archive';
      document.getElementById('ig-txt-likes').innerText = item.hideLikes ? 'Unhide like count' : 'Hide like count to others';
      document.getElementById('ig-txt-comments').innerText = item.commentsOff ? 'Turn on commenting' : 'Turn off commenting';
      document.getElementById('ig-txt-pin').innerText = item.pinned ? 'Unpin from main grid' : 'Pin to your main grid';
    }
    document.getElementById('pro-ig-action-modal').style.display = 'flex';
  }
}

function closeAllActionMenus() {
  document.getElementById('pro-ig-action-modal').style.display = 'none';
  document.getElementById('pro-reel-public-menu-modal').style.display = 'none';
  document.getElementById('pro-other-user-menu-modal').style.display = 'none';
}

function closeItemActionMenu() {
  closeAllActionMenus();
}

function toggleReelAutoScroll() {
  autoScrollReelsEnabled = !autoScrollReelsEnabled;
  const sw = document.getElementById('auto-scroll-switch');
  const knob = document.getElementById('auto-scroll-knob');
  if (sw && knob) {
    sw.style.background = autoScrollReelsEnabled ? '#2563eb' : '#cbd5e1';
    knob.style.left = autoScrollReelsEnabled ? '22px' : '2px';
  }
  showToast(autoScrollReelsEnabled ? '🔄 Auto Scroll चालू केले!' : '⏸️ Auto Scroll बंद केले.');
}

function handlePublicReelAction(act) {
  closeAllActionMenus();
  if (act === 'save') showToast('🔖 ही रील तुमच्या Saved मध्ये जतन केली!');
  else if (act === 'remix') openCreateContentModal('Reel');
  else if (act === 'sequence') openCreateContentModal('Reel');
  else if (act === 'fullscreen') {
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    showToast('📺 Fullscreen मोड चालू!');
  } else if (act === 'why') alert('ℹ️ तुम्ही ALBIZNET कम्युनिटीमध्ये जोडलेले असल्यामुळे ही लोकप्रिय पोस्ट तुम्हाला दिसत आहे.');
  else if (act === 'interested') showToast('👁️ धन्यवाद! तुम्हाला अशाच अजून रील्स दाखवल्या जातील.');
  else if (act === 'not_interested') {
    closeScrollableFeedModal();
    showToast('🙈 ही रील लपवली गेली.');
  } else if (act === 'report') showToast('🚨 तुमचा रिपोर्ट सबमिट झाला आहे.');
  else if (act === 'preferences') showToast('⚙️ कंटेंट प्रेफरन्सेस अपडेट झाले!');
}

async function handleIGMenuAction(action) {
  const { id, col } = activeMenuTarget;
  if (!id || !col) return;

  const arr = getCacheArrayByCol(col);
  const item = arr.find(x => x.id === id);
  if (!item) return closeAllActionMenus();

  try {
    if (action === 'delete') {
      if (!confirm('🗑️ तुम्हाला खात्री आहे की हे कायमचे डिलीट करायचे आहे?')) return;
      await db.collection(col).doc(id).delete();
      closeAllActionMenus();
      closeScrollableFeedModal();
      showToast('🗑️ यशस्वीरित्या कायमचे Delete केले!');
    } else if (action === 'archive') {
      const newVal = !item.archived;
      await db.collection(col).doc(id).update({ archived: newVal });
      closeAllActionMenus();
      showToast(newVal ? '📦 Archived!' : '✨ Unarchived!');
    } else if (action === 'removeGrid') {
      const newVal = !item.hiddenFromGrid;
      await db.collection(col).doc(id).update({ hiddenFromGrid: newVal });
      closeAllActionMenus();
      showToast(newVal ? '🙈 मुख्य ग्रिडवरून लपवले!' : '👁️ पुन्हा ग्रिडवर दाखवले!');
    } else if (action === 'pin') {
      const newVal = !item.pinned;
      await db.collection(col).doc(id).update({ pinned: newVal });
      closeAllActionMenus();
      showToast(newVal ? '📌 प्रोफाईलवर सर्वात वर Pin केले!' : '📌 Unpinned!');
    } else if (action === 'hideLikes') {
      const newVal = !item.hideLikes;
      await db.collection(col).doc(id).update({ hideLikes: newVal });
      closeAllActionMenus();
      showToast(newVal ? '❤️ Like संख्या इतरांसाठी लपवली!' : '❤️ Like संख्या आता दिसेल!');
    } else if (action === 'turnOffComments') {
      const newVal = !item.commentsOff;
      await db.collection(col).doc(id).update({ commentsOff: newVal });
      closeAllActionMenus();
      showToast(newVal ? '🔇 कमेंट्स बंद केल्या!' : '💬 कमेंट्स पुन्हा चालू केल्या!');
    } else if (action === 'edit') {
      closeAllActionMenus();
      const field = col === 'offers' ? 'deal' : (col === 'products' ? 'title' : (col === 'notes' ? 'noteText' : 'caption'));
      const updated = prompt('✏️ नवीन कॅप्शन / माहिती लिहा:', item[field] || '');
      if (updated !== null) {
        await db.collection(col).doc(id).update({ [field]: updated.trim() });
        showToast('✅ माहिती अपडेट झाली!');
      }
    } else if (action === 'insights') {
      closeAllActionMenus();
      alert(`📊 Post Insights:\n\n👁️ Views: ${item.views || 12}\n❤️ Likes: ${item.likes || 0}\n💬 Comments: ${item.commentsCount || 0}`);
    } else {
      closeAllActionMenus();
      showToast('✅ सेव्ह केले!');
    }
  } catch (err) {
    showToast('❌ Error: ' + err.message);
  }
}

// =========================================================
// REAL COMMENT BOX DRAWER
// =========================================================
function openCommentsModal(itemId, colName = 'posts') {
  const arr = getCacheArrayByCol(colName);
  const item = arr.find(x => x.id === itemId);
  if (item && item.commentsOff) return showToast('🔇 या पोस्टवर कमेंट्स बंद ठेवल्या आहेत.');
  activeCommentPostId = itemId;
  activeCommentCollection = colName;
  document.getElementById('pro-comments-modal').style.display = 'flex';
  renderCommentsList(itemId);
}

function closeCommentsModal() {
  activeCommentPostId = null;
  document.getElementById('pro-comments-modal').style.display = 'none';
}

function renderCommentsList(itemId) {
  const listBox = document.getElementById('pro-comments-list');
  if (!listBox) return;
  const arr = getCacheArrayByCol(activeCommentCollection);
  const item = arr.find(x => x.id === itemId);
  const comments = (item && Array.isArray(item.commentsList)) ? item.commentsList : [];

  if (comments.length === 0) {
    listBox.innerHTML = `<div style="text-align:center; padding:40px 16px; color:#64748b; font-size:13.5px;">अजून कोणतीही कमेंट नाही. पहिली कमेंट तुम्ही करा! 💬</div>`;
    return;
  }

  listBox.innerHTML = comments.map(c => `
    <div style="display:flex; gap:10px; margin-bottom:14px; align-items:flex-start;">
      <img src="${c.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" style="width:34px; height:34px; border-radius:50%; object-fit:cover;">
      <div style="flex:1; background:#f8fafc; padding:9px 12px; border-radius:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="font-size:13px; color:#0f172a;">${c.author || 'User'}</strong>
          <span style="font-size:10.5px; color:#94a3b8;">${getRelativeTime(c.timeMs)}</span>
        </div>
        <div style="font-size:13.5px; color:#1e293b; margin-top:3px;">${c.text}</div>
      </div>
    </div>
  `).join('');
}

async function submitRealComment() {
  if (!currentUserData || !activeCommentPostId) return;
  const inp = document.getElementById('pro-comment-input');
  const txt = inp.value.trim();
  if (!txt) return;

  const arr = getCacheArrayByCol(activeCommentCollection);
  const item = arr.find(x => x.id === activeCommentPostId);
  let currentList = (item && Array.isArray(item.commentsList)) ? [...item.commentsList] : [];

  currentList.push({
    uid: currentUserData.uid,
    author: currentUserData.name,
    avatar: currentUserData.avatar,
    text: txt,
    timeMs: Date.now()
  });

  inp.value = '';

  await db.collection(activeCommentCollection).doc(activeCommentPostId).update({
    commentsList: currentList,
    commentsCount: currentList.length
  });

  if (item && item.uid && item.uid !== currentUserData.uid) {
    await pushRealNotification({
      targetUid: item.uid,
      type: 'comment',
      actorUid: currentUserData.uid,
      actorName: currentUserData.name,
      actorHandle: currentUserData.handle || '@user',
      actorAvatar: currentUserData.avatar,
      text: `commented: "${txt}"`
    });
  }

  renderCommentsList(activeCommentPostId);
}

async function shareRealPost(postId, caption) {
  const shareUrl = window.location.origin;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'ALBIZNET', text: caption, url: shareUrl });
      return;
    } catch (e) {}
  }
  navigator.clipboard?.writeText(shareUrl);
  showToast('🔗 लिंक कॉपी आणि शेअर केली!');
}

// =========================================================
// 3. UNLIMITED VIDEO & PHOTO UPLOADER (PROGRESS BAR + CHUNKS)
// =========================================================
function toggleCreatePopupMenu(e) {
  if (e) e.stopPropagation();
  let menu = document.getElementById('create-dropdown-menu');
  if (!menu) return;
  menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}

function openCreateContentModal(mode) {
  currentCreateMode = mode;
  uploadedDataURL = '';
  uploadedRawFile = null;
  uploadedMediaType = 'image';

  let menu = document.getElementById('create-dropdown-menu');
  if (menu) menu.style.display = 'none';

  document.getElementById('create-modal-title').innerText = `Create New ${mode}`;
  let titleInp = document.getElementById('cr-title-input');
  let subInp = document.getElementById('cr-sub-input');
  let priceInp = document.getElementById('cr-price-input');
  let fileInp = document.querySelector('#create-content-modal input[type="file"]');

  titleInp.value = '';
  subInp.value = '';
  priceInp.value = '';
  if (fileInp) {
    fileInp.value = '';
    fileInp.setAttribute('accept', (mode === 'Reel' || mode === 'Live' || mode === 'Post' || mode === 'Story') ? 'video/*,image/*' : 'image/*');
  }

  subInp.style.display = (mode === 'Offer' || mode === 'Product' || mode === 'Post') ? 'block' : 'none';
  priceInp.style.display = (mode === 'Product') ? 'block' : 'none';
  titleInp.placeholder = `${mode} साठी कॅप्शन / नाव लिहा...`;

  document.getElementById('create-content-modal').style.display = 'flex';
}

function closeCreateContentModal() {
  document.getElementById('create-content-modal').style.display = 'none';
}

function handleFileSelect(e) {
  if (!e.target.files || !e.target.files[0]) return;
  let file = e.target.files[0];
  uploadedRawFile = file;

  if (file.type.startsWith('video/')) {
    uploadedMediaType = 'video';
    let reader = new FileReader();
    reader.onload = function(evt) {
      uploadedDataURL = evt.target.result;
      showToast('🎬 व्हिडिओ निवडला गेला! आता Publish Now वर क्लिक करा.');
    };
    reader.readAsDataURL(file);
  } else {
    uploadedMediaType = 'image';
    let reader = new FileReader();
    reader.onload = function(evt) {
      let img = new Image();
      img.onload = function() {
        let canvas = document.createElement('canvas');
        let maxW = 800;
        let scale = maxW / img.width;
        canvas.width = img.width > maxW ? maxW : img.width;
        canvas.height = img.width > maxW ? img.height * scale : img.height;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        uploadedDataURL = canvas.toDataURL('image/jpeg', 0.78);
        showToast('✅ फोटो निवडला गेला!');
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
}

function updateTopUploadProgress(visible, titleText, pct) {
  const banner = document.getElementById('pro-upload-progress-Banner');
  if (!banner) return;
  if (!visible) {
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'flex';
  document.getElementById('up-prog-title').innerText = titleText || 'Uploading...';
  document.getElementById('up-prog-pct').innerText = `${pct}%`;
  document.getElementById('up-prog-bar').style.width = `${pct}%`;
}

async function uploadLargeMediaSmart(modeLabel, rawFile, dataUrl) {
  if (!dataUrl) return { url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=700&q=80', isChunked: false, chunkGroupId: '' };

  if (dataUrl.length < 650000) {
    updateTopUploadProgress(true, `📤 ${modeLabel} अपलोड होत आहे...`, 65);
    return { url: dataUrl, isChunked: false, chunkGroupId: '' };
  }

  if (storage && rawFile) {
    try {
      const ext = rawFile.name ? rawFile.name.split('.').pop() : 'mp4';
      const ref = storage.ref(`albiznet_media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
      const uploadTask = ref.put(rawFile);

      const downloadUrl = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('storage_timeout')), 8000);
        uploadTask.on('state_changed',
          (snap) => {
            const pct = Math.min(95, Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
            updateTopUploadProgress(true, `📤 ${modeLabel} अपलोड होत आहे...`, pct);
          },
          (err) => { clearTimeout(timer); reject(err); },
          async () => {
            clearTimeout(timer);
            const u = await uploadTask.snapshot.ref.getDownloadURL();
            resolve(u);
          }
        );
      });
      return { url: downloadUrl, isChunked: false, chunkGroupId: '' };
    } catch (storageErr) {}
  }

  const chunkSize = 600000;
  const totalChunks = Math.ceil(dataUrl.length / chunkSize);
  const groupId = 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  for (let i = 0; i < totalChunks; i++) {
    const piece = dataUrl.slice(i * chunkSize, (i + 1) * chunkSize);
    const pct = Math.min(95, Math.round(((i + 1) / totalChunks) * 95));
    updateTopUploadProgress(true, `📤 ${modeLabel} अपलोड होत आहे...`, pct);

    await db.collection('media_chunks').doc(`${groupId}_${i}`).set({
      groupId: groupId,
      index: i,
      total: totalChunks,
      data: piece,
      timeMs: Date.now()
    });
  }

  resolvedChunkMediaCache[groupId] = dataUrl;
  return { url: '', isChunked: true, chunkGroupId: groupId };
}

async function publishCreatedContent() {
  if (!currentUserData) return showToast('⚠️ कृपया आधी लॉगिन करा!');

  const modeToPublish = currentCreateMode;
  const title = document.getElementById('cr-title-input').value.trim();
  const sub = document.getElementById('cr-sub-input').value.trim();
  const price = document.getElementById('cr-price-input').value.trim();
  const localDataUrl = uploadedDataURL;
  const localRawFile = uploadedRawFile;
  const localMediaType = uploadedMediaType;

  if (!title && !localDataUrl) {
    return showToast('⚠️ कृपया माहिती लिहा किंवा फोटो/व्हिडिओ निवडा!');
  }

  closeCreateContentModal();
  updateTopUploadProgress(true, `📤 तुमची ${modeToPublish} अपलोड होत आहे...`, 15);

  const nowTs = firebase.firestore.FieldValue.serverTimestamp();
  const nowMs = Date.now();

  try {
    const mediaResult = await uploadLargeMediaSmart(modeToPublish, localRawFile, localDataUrl);
    const finalImgField = mediaResult.isChunked ? '' : mediaResult.url;

    updateTopUploadProgress(true, `✨ ${modeToPublish} पब्लिश होत आहे...`, 98);

    if (modeToPublish === 'Reel' || modeToPublish === 'Live') {
      await db.collection('reels').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        caption: title || modeToPublish,
        img: finalImgField,
        isChunked: mediaResult.isChunked,
        chunkGroupId: mediaResult.chunkGroupId,
        mediaType: localMediaType,
        views: 1,
        likes: 0,
        likedBy: [],
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else if (modeToPublish === 'Story') {
      await db.collection('stories').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        caption: title || 'My Moment',
        img: finalImgField,
        isChunked: mediaResult.isChunked,
        chunkGroupId: mediaResult.chunkGroupId,
        mediaType: localMediaType,
        timeMs: nowMs,
        expiresAt: nowMs + (24 * 60 * 60 * 1000),
        createdAt: nowTs
      });
    } else if (modeToPublish === 'Note') {
      await db.collection('notes').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        noteText: title || 'Hello Friends! 👋',
        img: finalImgField || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80',
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else if (modeToPublish === 'Offer') {
      await db.collection('offers').add({
        uid: currentUserData.uid,
        bizName: currentUserData.name,
        deal: title || 'Special Offer',
        validity: sub || 'Limited Time Offer',
        location: currentUserData.location || 'Ardhapur, Maharashtra',
        phone: currentUserData.phone || '',
        img: finalImgField,
        isChunked: mediaResult.isChunked,
        chunkGroupId: mediaResult.chunkGroupId,
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else if (modeToPublish === 'Product') {
      await db.collection('products').add({
        uid: currentUserData.uid,
        sellerName: currentUserData.name,
        title: title || 'New Product',
        price: price || '₹999',
        cat: sub || 'Men',
        img: finalImgField,
        isChunked: mediaResult.isChunked,
        chunkGroupId: mediaResult.chunkGroupId,
        desc: `Quality product by ${currentUserData.name}`,
        timeMs: nowMs,
        createdAt: nowTs
      });
    } else {
      await db.collection('posts').add({
        uid: currentUserData.uid,
        author: currentUserData.name,
        avatar: currentUserData.avatar,
        location: currentUserData.location || 'Ardhapur, Maharashtra',
        category: sub || currentUserData.category || 'Post',
        caption: title,
        img: finalImgField,
        isChunked: mediaResult.isChunked,
        chunkGroupId: mediaResult.chunkGroupId,
        mediaType: localMediaType,
        likes: 0,
        likedBy: [],
        commentsCount: 0,
        commentsList: [],
        timeMs: nowMs,
        createdAt: nowTs
      });
    }

    updateTopUploadProgress(true, `✅ ${modeToPublish} १००% अपलोड झाली!`, 100);
    setTimeout(() => updateTopUploadProgress(false), 1200);
    showToast(`🎉 तुमची ${modeToPublish} यशस्वीरित्या अपलोड आणि लाईव्ह झाली!`);
  } catch (err) {
    updateTopUploadProgress(false);
    showToast('❌ अपलोड करताना त्रुटी आली: ' + err.message);
  }
}

// =========================================================
// 4. STRICT REAL USER-TO-USER MESSENGER (LONG-PRESS, UNREAD AUTO-REMOVE, MARKETPLACE BIZ, REQUESTS)
// =========================================================
function renderMessagesPeopleBar() {
  const bar = document.querySelector('#view-messages .moments-scroll-bar');
  if (!bar || !currentUserData) return;
  const firstNote = bar.querySelector('.your-note-card').outerHTML;

  const otherUsers = cacheAllUsers.filter(u => u.uid !== currentUserData.uid);
  const usersHTML = otherUsers.map(u => `
    <div class="story-circle-item" onclick="startRealChat('${u.uid}', '${(u.name || 'User').replace(/'/g, '')}', 'Inbox', '${u.avatar || ''}')">
      <div class="story-grad-ring"><img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`}"></div>
      <span>${(u.name || 'User').split(' ')[0]}</span>
    </div>
  `).join('');

  bar.innerHTML = firstNote + usersHTML;
}

function listenToRealMessages() {
  db.collection('chats').onSnapshot(snap => {
    if (!currentUserData) return;
    const myUid = currentUserData.uid;

    const myChats = [];
    snap.docs.forEach(doc => {
      const data = doc.data();
      const parts = Array.isArray(data.participants) ? data.participants : [];
      if (parts.includes(myUid) || data.senderUid === myUid || data.receiverUid === myUid) {
        if (Array.isArray(data.messages)) {
          data.messages = data.messages.filter(m => m.text !== '🖼️ Gallery Image' && m.text !== '🎤 Voice Note (0:05)' && m.text !== '📷 Photo');
        }
        myChats.push({ id: doc.id, ...data });
      }
    });

    cacheChats = sortByPinnedAndCreatedDesc(myChats);
    renderMessagesList();

    let unreadCount = cacheChats.filter(c => c.unread === true && c.lastSenderUid !== myUid && !c.isRequest && c.chatCategory !== 'Request').length;
    let badge = document.querySelector('.msg-badge-count');
    if (badge) {
      badge.innerText = unreadCount;
      badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (activeChatDocId) {
      const openDoc = cacheChats.find(x => x.id === activeChatDocId);
      if (openDoc) renderMessengerBubbles(openDoc);
    }
  });
}

function switchMsgTab(tabName, el) {
  activeMsgTab = tabName;
  document.querySelectorAll('#view-messages .m-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderMessagesList();
}

// Long-Press (Tap & Hold) फंक्शन्स
function startChatLongPress(chatId, peerName) {
  clearTimeout(chatLongPressTimer);
  chatLongPressTimer = setTimeout(() => {
    openChatLongPressMenu(chatId, peerName);
  }, 550);
}

function cancelChatLongPress() {
  clearTimeout(chatLongPressTimer);
}

function openChatLongPressMenu(chatId, peerName) {
  selectedChatForMenu = { id: chatId, name: peerName };
  const titleEl = document.getElementById('lp-chat-title');
  if (titleEl) titleEl.innerText = peerName || 'Chat Options';
  const modal = document.getElementById('pro-chat-longpress-modal');
  if (modal) modal.style.display = 'flex';
}

function closeChatLongPressMenu() {
  const modal = document.getElementById('pro-chat-longpress-modal');
  if (modal) modal.style.display = 'none';
}

async function handleChatLongPressAction(action) {
  closeChatLongPressMenu();
  if (!selectedChatForMenu || !selectedChatForMenu.id) return;
  const { id, name } = selectedChatForMenu;
  const chatDoc = cacheChats.find(c => c.id === id);

  if (action === 'reminder') {
    const mins = prompt(`⏰ ${name} साठी किती मिनिटांचा Reminder लावायचा आहे? (उदा. 5, 15, 30):`, '10');
    if (mins && !isNaN(mins)) {
      const ms = parseFloat(mins) * 60 * 1000;
      await db.collection('chats').doc(id).update({ reminderText: `⏰ ${mins}m` });
      showToast(`⏰ ${name} च्या चॅटसाठी ${mins} मिनिटांचा Reminder सेट केला!`);
      setTimeout(() => {
        showToast(`🔔 REMINDER: ${name} ला मेसेज करण्याची वेळ झाली आहे!`);
        alert(`🔔 Chat Reminder:\n${name} सोबत संवाद साधण्याची तुमची वेळ झाली आहे!`);
      }, ms);
      renderMessagesList();
    }
  } else if (action === 'toggle_read') {
    if (!chatDoc) return;
    const newUnread = !chatDoc.unread;
    await db.collection('chats').doc(id).update({
      unread: newUnread,
      lastSenderUid: newUnread ? 'other' : (currentUserData ? currentUserData.uid : '')
    });
    showToast(newUnread ? '📩 चॅट Unread म्हणून मार्क केले!' : '✅ चॅट Read म्हणून मार्क केले!');
  } else if (action === 'pin') {
    if (!chatDoc) return;
    const newPin = !chatDoc.pinned;
    await db.collection('chats').doc(id).update({ pinned: newPin });
    showToast(newPin ? '📌 चॅट सर्वात वर Pin केले!' : '📌 चॅट Unpin केले!');
  } else if (action === 'mute') {
    showToast(`🔕 ${name} चे नोटिफिकेशन्स Mute केले!`);
  } else if (action === 'clear') {
    if (!confirm(`🧹 ${name} मधील सर्व मेसेज पुसून टाकायचे (Clear All) का?`)) return;
    await db.collection('chats').doc(id).update({
      messages: [],
      lastMessage: '🧹 Messages cleared',
      unread: false
    });
    showToast('🧹 सर्व मेसेजेस Clear केले गेले!');
  } else if (action === 'delete') {
    await deleteChatFromList(id);
  }
}

// Request Accept आणि Reject केल्यावर ऑटोमॅटिक Remove होणे
async function acceptMessageRequest(chatId, peerName) {
  try {
    const idx = cacheChats.findIndex(c => c.id === chatId);
    if (idx > -1) {
      cacheChats[idx].chatCategory = 'Inbox';
      cacheChats[idx].isRequest = false;
    }
    renderMessagesList();

    await db.collection('chats').doc(chatId).update({
      chatCategory: 'Inbox',
      isRequest: false,
      unread: false
    });
    showToast(`✅ ${peerName} ची रिक्वेस्ट Accept झाली! आता ती Inbox मध्ये दिसेल.`);
  } catch (e) {
    showToast('❌ Error: ' + e.message);
  }
}

async function rejectMessageRequest(chatId, peerName) {
  try {
    cacheChats = cacheChats.filter(c => c.id !== chatId);
    renderMessagesList();

    await db.collection('chats').doc(chatId).delete();
    showToast(`🚫 ${peerName} ची मेसेज रिक्वेस्ट Reject आणि Remove केली!`);
  } catch (e) {
    showToast('❌ Error: ' + e.message);
  }
}

function renderMessagesList() {
  let box = document.getElementById('messages-chat-list');
  if (!box || !currentUserData) return;
  let q = (document.getElementById('msg-search-input')?.value || '').toLowerCase();
  const myUid = currentUserData.uid;

  // १. जर टॅब 'Marketplace' असेल तर चॅट नाही, फक्त BUSINESS STORES & PRODUCTS दाखवा!
  if (activeMsgTab === 'Marketplace') {
    const bizStores = cacheBusinesses.filter(b =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.category || '').toLowerCase().includes(q) ||
      (b.location || '').toLowerCase().includes(q)
    );
    const bizProducts = cacheProducts.filter(p =>
      !p.archived && (
        (p.title || '').toLowerCase().includes(q) ||
        (p.sellerName || '').toLowerCase().includes(q)
      )
    );

    box.innerHTML = `
      <div style="padding:10px 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="margin:0; font-size:15px; font-weight:800; color:#0f172a;">🏪 Verified Business Stores (${bizStores.length})</h4>
          <button onclick="openCreateContentModal('Product')" style="background:#2563eb; color:#fff; border:none; padding:5px 12px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">+ Sell Product</button>
        </div>

        ${bizStores.length === 0 ? `<div style="padding:14px; background:#fff; border-radius:12px; color:#64748b; font-size:13px; text-align:center;">अजून कोणतेही Business Store नाही.</div>` : `
          <div style="display:flex; gap:12px; overflow-x:auto; padding-bottom:8px;">
            ${bizStores.map(b => `
              <div onclick="openUserProfile('${b.uid}')" style="min-width:145px; background:#fff; padding:12px; border-radius:16px; box-shadow:0 2px 8px rgba(0,0,0,0.05); text-align:center; cursor:pointer; flex-shrink:0;">
                <img src="${b.avatar}" style="width:56px; height:56px; border-radius:14px; object-fit:cover; margin-bottom:6px;">
                <div style="font-weight:800; font-size:13.5px; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${b.name}</div>
                <div style="font-size:11px; color:#4f46e5; font-weight:700; margin-bottom:8px;">${b.category || 'Business'}</div>
                <button style="background:#f1f5f9; color:#0f172a; border:none; width:100%; padding:6px 0; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">Visit Store ➔</button>
              </div>
            `).join('')}
          </div>
        `}

        <h4 style="margin:16px 0 10px; font-size:15px; font-weight:800; color:#0f172a;">🛍️ Business Marketplace Catalog (${bizProducts.length})</h4>
        ${bizProducts.length === 0 ? `<div style="padding:24px; background:#fff; border-radius:14px; color:#64748b; font-size:13px; text-align:center;">मार्केटप्लेसमध्ये अजून प्रॉडक्ट्स नाहीत.</div>` : `
          <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">
            ${bizProducts.map(p => `
              <div onclick="openProductDetail('${p.id}')" style="background:#fff; border-radius:14px; padding:10px; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
                <img src="${p.img}" style="width:100%; height:115px; object-fit:cover; border-radius:10px;">
                <div style="font-weight:800; font-size:13.5px; color:#0f172a; margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</div>
                <div style="color:#2563eb; font-weight:900; font-size:14px; margin:2px 0;">${p.price || '₹999'}</div>
                <div style="font-size:11px; color:#64748b;">🏪 ${p.sellerName || 'Business Store'}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
    return;
  }

  // २. INBOX, UNREAD, आणि REQUEST फिल्टरिंग
  let list = cacheChats.filter(m => {
    let matchQ = (m.senderName || '').toLowerCase().includes(q) ||
                 (m.receiverName || '').toLowerCase().includes(q) ||
                 (m.lastMessage || '').toLowerCase().includes(q);
    if (!matchQ) return false;

    const isReq = (m.chatCategory === 'Request' || m.isRequest === true);

    if (activeMsgTab === 'Request') {
      return isReq;
    }
    if (activeMsgTab === 'Unread') {
      return !isReq && m.unread === true && m.lastSenderUid !== myUid;
    }
    return !isReq;
  });

  if (list.length === 0) {
    if (activeMsgTab === 'Unread') {
      box.innerHTML = `<div style="text-align:center; padding:40px 16px; color:#64748b;">🎉 तुमचे सर्व मेसेज वाचून झाले आहेत! <b>Unread</b> मध्ये कोणताही मेसेज शिल्लक नाही.</div>`;
      return;
    }
    if (activeMsgTab === 'Request') {
      box.innerHTML = `<div style="text-align:center; padding:40px 16px; color:#64748b;">📩 सध्या कोणतीही नवीन <b>Message Request</b> नाही.</div>`;
      return;
    }

    const otherUsers = cacheAllUsers.filter(u => u.uid !== myUid);
    box.innerHTML = `
      <div style="text-align:center; padding:20px 16px; color:#64748b;">
        तुमच्या <b>Inbox</b> मध्ये अजून संभाषण नाही.<br>खालील युजर्सवर टॅप करून लगेच चॅट सुरू करा:
      </div>
      <div style="padding:0 12px;">
        ${otherUsers.map(u => `
          <div onclick="startRealChat('${u.uid}', '${(u.name || 'User').replace(/'/g, '')}', 'Inbox', '${u.avatar || ''}')" style="display:flex; align-items:center; gap:12px; padding:10px 14px; margin-bottom:8px; background:#fff; border-radius:14px; box-shadow:0 2px 6px rgba(0,0,0,0.04); cursor:pointer;">
            <img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`}" style="width:44px; height:44px; border-radius:50%; object-fit:cover;">
            <div style="flex:1;">
              <div style="font-weight:800; font-size:14.5px; color:#0f172a;">${u.name}</div>
              <div style="font-size:12px; color:#64748b;">${u.handle || '@user'} &bull; ${u.location || 'Maharashtra'}</div>
            </div>
            <button style="background:#2563eb; color:#fff; border:none; padding:7px 14px; border-radius:10px; font-weight:700; font-size:12px; cursor:pointer;">Message 💬</button>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  // ३. चॅट कार्ड्स रेंडर करणे
  box.innerHTML = list.map(m => {
    let isMeSender = m.senderUid === myUid;
    let peerName = isMeSender ? (m.receiverName || 'Friend') : (m.senderName || 'User');
    let peerUid = isMeSender ? (m.receiverUid || '') : (m.senderUid || '');
    let peerObj = cacheAllUsers.find(u => u.uid === peerUid);
    let peerAvatar = (peerObj && peerObj.avatar) ? peerObj.avatar : (isMeSender ? m.receiverAvatar : m.senderAvatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerName)}&background=2563eb&color=fff`;
    let isUnreadForMe = m.unread === true && m.lastSenderUid !== myUid;
    let safePeerName = peerName.replace(/'/g, '');

    if (activeMsgTab === 'Request') {
      return `
        <div class="chat-item-row" style="display:flex; flex-direction:column; gap:10px; padding:12px 14px; margin:8px 12px; border-radius:16px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="openMessengerWindow('${m.id}', '${safePeerName}', '${peerAvatar}', '${peerUid}')">
            <img src="${peerAvatar}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">
            <div style="flex:1; min-width:0;">
              <div style="font-weight:800; font-size:15px; color:#0f172a;">${peerName} <span style="font-size:11px; background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:10px;">Request</span></div>
              <div style="font-size:13px; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.lastMessage || 'Sent you a message request'}</div>
            </div>
          </div>
          <div style="display:flex; gap:10px; border-top:1px solid #f1f5f9; padding-top:8px;">
            <button onclick="acceptMessageRequest('${m.id}', '${safePeerName}')" style="flex:1; background:#16a34a; color:#fff; border:none; padding:8px 0; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer;">✔ Accept</button>
            <button onclick="rejectMessageRequest('${m.id}', '${safePeerName}')" style="flex:1; background:#fee2e2; color:#dc2626; border:none; padding:8px 0; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer;">✖ Reject</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="chat-item-row"
        ontouchstart="startChatLongPress('${m.id}', '${safePeerName}')"
        ontouchend="cancelChatLongPress()"
        ontouchmove="cancelChatLongPress()"
        onmousedown="startChatLongPress('${m.id}', '${safePeerName}')"
        onmouseup="cancelChatLongPress()"
        onmouseleave="cancelChatLongPress()"
        oncontextmenu="event.preventDefault(); openChatLongPressMenu('${m.id}', '${safePeerName}');"
        onclick="openMessengerWindow('${m.id}', '${safePeerName}', '${peerAvatar}', '${peerUid}')"
        style="display:flex; align-items:center; gap:12px; padding:12px 14px; margin:8px 12px; border-radius:16px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.04); cursor:pointer; user-select:none; -webkit-user-select:none;">
        
        <div style="position:relative;">
          <img src="${peerAvatar}" style="width:48px; height:48px; border-radius:50%; object-fit:cover;">
          ${isUnreadForMe ? `<span style="position:absolute; top:0; right:0; width:12px; height:12px; background:#2563eb; border:2px solid #fff; border-radius:50%;"></span>` : ''}
        </div>
        
        <div style="flex:1; min-width:0;">
          <div style="font-weight:${isUnreadForMe ? '900' : '700'}; font-size:15px; color:#0f172a; display:flex; align-items:center; gap:6px;">
            <span>${peerName}</span>
            ${m.pinned ? `<span style="font-size:11px; color:#2563eb;">📌</span>` : ''}
            ${m.reminderText ? `<span style="font-size:10.5px; background:#eff6ff; color:#2563eb; padding:1px 7px; border-radius:8px; font-weight:700;">${m.reminderText}</span>` : ''}
          </div>
          <div style="font-size:13px; color:${isUnreadForMe ? '#0f172a' : '#64748b'}; font-weight:${isUnreadForMe ? '700' : '400'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${m.lastMessage || 'Tap to chat (Hold for options)'}
          </div>
        </div>

        <button onclick="event.stopPropagation(); openChatLongPressMenu('${m.id}', '${safePeerName}')" style="background:#f8fafc; color:#475569; border:none; width:34px; height:34px; border-radius:50%; cursor:pointer; font-size:15px;">
          <i class="fa-solid fa-ellipsis-vertical"></i>
        </button>
      </div>
    `;
  }).join('');
}

async function deleteChatFromList(chatId) {
  if (!confirm('🗑️ हे संभाषण डिलीट करायचे का?')) return;
  await db.collection('chats').doc(chatId).delete();
  showToast('🗑️ चॅट डिलीट केले गेले!');
}

async function deleteEntireActiveChat() {
  if (!activeChatDocId) return;
  if (!confirm('🗑️ हे संपूर्ण चॅट कायमचे डिलीट करायचे आहे का?')) return;
  const idToDel = activeChatDocId;
  closeMessengerChat();
  await db.collection('chats').doc(idToDel).delete();
  showToast('🗑️ चॅट डिलीट केले!');
}

async function deleteSingleMessageBubble(msgIndex) {
  if (!activeChatDocId) return;
  if (!confirm('🗑️ हा मेसेज डिलीट करायचा का?')) return;
  const chatDoc = cacheChats.find(x => x.id === activeChatDocId);
  if (!chatDoc || !Array.isArray(chatDoc.messages)) return;

  const updated = chatDoc.messages.filter((_, idx) => idx !== msgIndex);
  const lastMsg = updated.length > 0 ? updated[updated.length - 1].text : 'No messages yet';
  await db.collection('chats').doc(activeChatDocId).update({
    messages: updated,
    lastMessage: lastMsg
  });
  showToast('🗑️ मेसेज डिलीट केला!');
}

async function startRealChat(peerUid, peerName, categoryOverride, peerAvOverride) {
  if (!currentUserData) return showToast('⚠️ कृपया आधी लॉगिन करा!');
  if (peerUid === currentUserData.uid) return showToast('ℹ️ तुम्ही स्वतःलाच मेसेज करू शकत नाही!');

  const myUid = currentUserData.uid;
  const chatCat = (categoryOverride === 'Request') ? 'Request' : 'Inbox';

  let existing = cacheChats.find(c => {
    const parts = Array.isArray(c.participants) ? c.participants : [];
    return parts.includes(myUid) && parts.includes(peerUid);
  });

  let peerObj = cacheAllUsers.find(u => u.uid === peerUid);
  let peerAvatar = peerAvOverride || (peerObj && peerObj.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(peerName || 'U')}&background=2563eb&color=fff`;

  if (existing) {
    openMessengerWindow(existing.id, peerName, peerAvatar, peerUid);
  } else {
    const newDoc = await db.collection('chats').add({
      participants: [myUid, peerUid],
      senderUid: myUid,
      receiverUid: peerUid,
      senderName: currentUserData.name,
      senderAvatar: currentUserData.avatar,
      receiverName: peerName || 'Friend',
      receiverAvatar: peerAvatar,
      chatCategory: chatCat,
      isRequest: chatCat === 'Request',
      unread: false,
      lastSenderUid: '',
      lastMessage: 'Start a conversation...',
      messages: [],
      timeMs: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    openMessengerWindow(newDoc.id, peerName, peerAvatar, peerUid);
  }
}

async function openMessengerWindow(chatId, peerName, peerAvatar, peerUid) {
  activeChatDocId = chatId;
  activeChatPeerName = peerName || 'User';
  activeChatPeerAvatar = peerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatPeerName)}&background=2563eb&color=fff`;
  activeChatPeerUid = peerUid || '';

  document.getElementById('msg-win-top-name').innerText = activeChatPeerName;
  document.getElementById('msg-win-center-name').innerText = activeChatPeerName;
  document.getElementById('msg-win-top-avatar').src = activeChatPeerAvatar;
  document.getElementById('msg-win-center-avatar').src = activeChatPeerAvatar;

  document.getElementById('pro-messenger-modal').style.display = 'flex';

  const chatDoc = cacheChats.find(x => x.id === chatId);
  if (chatDoc) {
    renderMessengerBubbles(chatDoc);

    // Unread चॅट उघडून वाचताच ऑटोमॅटिक Unread मधून Remove करा!
    if (chatDoc.unread) {
      chatDoc.unread = false;
      renderMessagesList();

      const myUid = currentUserData ? currentUserData.uid : '';
      let unreadCount = cacheChats.filter(c => c.unread === true && c.lastSenderUid !== myUid && !c.isRequest && c.chatCategory !== 'Request').length;
      let badge = document.querySelector('.msg-badge-count');
      if (badge) {
        badge.innerText = unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
      }

      await db.collection('chats').doc(chatId).update({ unread: false }).catch(() => {});
    }
  }
}

function closeMessengerChat() {
  activeChatDocId = null;
  document.getElementById('pro-messenger-modal').style.display = 'none';
}

function renderMessengerBubbles(chatDoc) {
  const box = document.getElementById('msg-win-bubbles');
  if (!box) return;

  const msgs = Array.isArray(chatDoc.messages) ? chatDoc.messages : [];
  const myUid = currentUserData ? currentUserData.uid : '';

  if (msgs.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:18px; color:#94a3b8; font-size:13px;">खाली मेसेज टाईप करा, किंवा फोटो/व्हॉइस नोट पाठवा 👋</div>`;
    return;
  }

  box.innerHTML = msgs.map((m, idx) => {
    const isMe = m.senderUid === myUid;
    const isThumb = m.type === 'thumb' || m.text === '👍';
    const isImage = m.type === 'image' && m.mediaUrl;
    const isVideo = m.type === 'video' && m.mediaUrl;
    const isAudio = m.type === 'audio' && m.mediaUrl;

    let contentHTML = '';
    if (isThumb) {
      contentHTML = `<div style="font-size:40px; line-height:1; color:#2563eb; cursor:pointer;" onclick="deleteSingleMessageBubble(${idx})"><i class="fa-solid fa-thumbs-up"></i></div>`;
    } else if (isImage) {
      contentHTML = `<img src="${m.mediaUrl}" onclick="deleteSingleMessageBubble(${idx})" style="max-width:210px; border-radius:14px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.12);">`;
    } else if (isVideo) {
      contentHTML = `<video src="${m.mediaUrl}" controls playsinline style="max-width:220px; border-radius:14px; background:#000;"></video>`;
    } else if (isAudio) {
      contentHTML = `
        <div style="background:${isMe ? '#2563eb' : '#f1f5f9'}; padding:8px 12px; border-radius:18px; display:flex; align-items:center; gap:8px;">
          <audio src="${m.mediaUrl}" controls style="height:32px; max-width:190px;"></audio>
          <i class="fa-solid fa-trash-can" onclick="deleteSingleMessageBubble(${idx})" style="color:${isMe ? '#fff' : '#ef4444'}; font-size:13px; cursor:pointer;"></i>
        </div>`;
    } else {
      contentHTML = `
        <div onclick="deleteSingleMessageBubble(${idx})" style="max-width:74%; padding:10px 14px; border-radius:18px; font-size:14px; background:${isMe ? '#2563eb' : '#f1f5f9'}; color:${isMe ? '#fff' : '#0f172a'}; cursor:pointer; word-break:break-word;">
          ${m.text}
        </div>`;
    }

    return `
      <div style="display:flex; align-items:flex-end; gap:8px; justify-content:${isMe ? 'flex-end' : 'flex-start'};">
        ${!isMe ? `<img src="${activeChatPeerAvatar}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">` : ''}
        ${contentHTML}
      </div>
    `;
  }).join('');

  const scrollBody = document.getElementById('msg-win-body');
  if (scrollBody) scrollBody.scrollTop = scrollBody.scrollHeight;
}

async function sendMessengerText() {
  const inp = document.getElementById('msg-win-input');
  const txt = inp.value.trim();
  if (!txt) return showToast('✏️ कृपया आधी मेसेज टाईप करा!');
  if (!activeChatDocId) return;
  inp.value = '';
  await appendMessageToActiveChat(txt, 'text', '');
}

async function sendMessengerThumb() {
  if (!activeChatDocId) return;
  await appendMessageToActiveChat('👍', 'thumb', '');
}

function handleChatMediaUpload(e) {
  if (!e.target.files || !e.target.files[0] || !activeChatDocId) return;
  const file = e.target.files[0];

  if (file.type.startsWith('video/')) {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      showToast('📤 व्हिडिओ पाठवला जात आहे...');
      await appendMessageToActiveChat('🎬 Video', 'video', evt.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxW = 550;
        const scale = maxW / img.width;
        canvas.width = img.width > maxW ? maxW : img.width;
        canvas.height = img.width > maxW ? img.height * scale : img.height;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        showToast('📤 फोटो पाठवला जात आहे...');
        await appendMessageToActiveChat('📷 Photo', 'image', compressed);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
  e.target.value = '';
}

async function toggleRealVoiceRecording() {
  if (!activeChatDocId) return;
  const recBar = document.getElementById('voice-rec-bar');
  const micBtn = document.getElementById('chat-mic-btn');

  if (isRecordingVoice && mediaRecorder) {
    stopAndSendVoiceNote();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        showToast('📤 व्हॉइस नोट पाठवली जात आहे...');
        await appendMessageToActiveChat('🎤 Voice Note', 'audio', reader.result);
      };
      reader.readAsDataURL(audioBlob);
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    isRecordingVoice = true;
    if (recBar) recBar.style.display = 'flex';
    if (micBtn) micBtn.style.color = '#dc2626';
  } catch (err) {
    showToast('⚠️ कृपया ब्राउझरमध्ये Microphone ची परवानगी (Allow) द्या!');
  }
}

function stopAndSendVoiceNote() {
  if (mediaRecorder && isRecordingVoice) {
    mediaRecorder.stop();
    isRecordingVoice = false;
    document.getElementById('voice-rec-bar').style.display = 'none';
    document.getElementById('chat-mic-btn').style.color = '#2563eb';
  }
}

async function appendMessageToActiveChat(textVal, msgType, mediaDataUrl) {
  if (!currentUserData || !activeChatDocId) return;
  const chatDoc = cacheChats.find(x => x.id === activeChatDocId);
  let arr = (chatDoc && Array.isArray(chatDoc.messages)) ? [...chatDoc.messages] : [];

  arr.push({
    senderUid: currentUserData.uid,
    senderName: currentUserData.name,
    text: textVal,
    type: msgType,
    mediaUrl: mediaDataUrl || '',
    timeMs: Date.now()
  });

  await db.collection('chats').doc(activeChatDocId).update({
    messages: arr,
    lastSenderUid: currentUserData.uid,
    lastMessage: `${currentUserData.name}: ${textVal}`,
    unread: true,
    timeMs: Date.now(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  if (activeChatPeerUid && activeChatPeerUid !== currentUserData.uid) {
    await pushRealNotification({
      targetUid: activeChatPeerUid,
      type: 'message',
      actorUid: currentUserData.uid,
      actorName: currentUserData.name,
      actorHandle: currentUserData.handle || '@' + currentUserData.name.toLowerCase().replace(/\s+/g, ''),
      actorAvatar: currentUserData.avatar,
      text: `sent you a message: "${textVal}"`
    });
  }
}

// =========================================================
// 5. STRICT PER-USER NOTIFICATIONS
// =========================================================
async function pushRealNotification(payload) {
  try {
    if (!payload.actorName || !payload.text) return;
    await db.collection('notifications').add({
      targetUid: payload.targetUid || 'all',
      actorUid: payload.actorUid || (currentUserData ? currentUserData.uid : ''),
      actorName: payload.actorName,
      actorHandle: payload.actorHandle || '@' + payload.actorName.toLowerCase().replace(/\s+/g, ''),
      actorAvatar: payload.actorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.actorName)}&background=4f46e5&color=fff`,
      type: payload.type || 'activity',
      text: payload.text,
      postImg: payload.postImg || '',
      timeMs: Date.now(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {}
}

function listenToRealNotifications() {
  db.collection('notifications').onSnapshot(snap => {
    if (!currentUserData) return;
    const myUid = currentUserData.uid;

    const validNotifs = [];
    snap.docs.forEach(doc => {
      const n = doc.data();
      if (!n.actorName || !n.text || String(n.text).includes('undefined')) {
        db.collection('notifications').doc(doc.id).delete().catch(() => {});
        return;
      }
      if (n.targetUid === myUid && n.actorUid !== myUid) {
        validNotifs.push({ id: doc.id, ...n });
      }
    });

    cacheNotifications = sortByPinnedAndCreatedDesc(validNotifs);
    renderProNotificationsList();
  });
}

function setupNotificationBell() {
  let bell = document.querySelector('.header-bell-btn');
  if (bell) {
    bell.onclick = function() {
      document.getElementById('pro-notifications-modal').style.display = 'flex';
      renderProNotificationsList();
    };
  }
}

function closeProNotifications() {
  document.getElementById('pro-notifications-modal').style.display = 'none';
}

async function clearMyNotifications() {
  for (const n of cacheNotifications) {
    await db.collection('notifications').doc(n.id).delete().catch(() => {});
  }
  showToast('🧹 तुमचे सर्व नोटिफिकेशन्स क्लिअर केले!');
}

function renderProNotificationsList() {
  const body = document.getElementById('pro-notif-list-body');
  if (!body) return;

  if (cacheNotifications.length === 0) {
    body.innerHTML = `<div style="text-align:center; padding:45px 20px; color:#64748b; font-size:14px;">🔔 तुमच्या अकाउंटसाठी सध्या कोणतेही नवीन नोटिफिकेशन नाही.</div>`;
    return;
  }

  body.innerHTML = `
    <div style="padding:14px 16px 6px; font-weight:800; font-size:15px;">Featured</div>
    ${cacheNotifications.map(n => `
      <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1px solid #f8fafc;">
        <img src="${n.actorAvatar}" onclick="closeProNotifications(); openUserProfile('${n.actorUid}')" style="width:46px; height:46px; border-radius:50%; object-fit:cover; cursor:pointer;">
        <div style="flex:1; font-size:13.5px; color:#0f172a;">
          <b onclick="closeProNotifications(); openUserProfile('${n.actorUid}')" style="cursor:pointer;">${n.actorHandle || n.actorName}</b> ${n.text}
          <span style="color:#64748b; font-size:12px; margin-left:4px;">${getRelativeTime(n.timeMs)}</span>
        </div>
        ${n.postImg ? `<img src="${n.postImg}" style="width:44px; height:44px; border-radius:8px; object-fit:cover;">` : ''}
      </div>
    `).join('')}
  `;
}

// =========================================================
// EXPLORE & NEARBY
// =========================================================
function listenToRealOffers() {
  db.collection('offers').onSnapshot(async snap => {
    let rawOffers = sortByPinnedAndCreatedDesc(snap.docs.map(d => ({ id: d.id, _col: 'offers', ...d.data() })));
    await resolveChunkedMediaItems(rawOffers);
    cacheOffers = rawOffers;
    renderExploreOffers();
    if (activeNearbyFilter === 'Deals') renderNearbyStores();
    renderProfileMediaGrid();
  });
}

function selectExploreChip(chipName, el) {
  activeExploreFilter = chipName;
  document.querySelectorAll('#view-explore .f-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderExploreOffers();
}

function renderExploreOffers() {
  let box = document.getElementById('explore-offers-list');
  if (!box) return;
  let q = (document.getElementById('explore-search-input')?.value || '').toLowerCase();

  if (activeExploreFilter === 'Trending Reels') {
    let reelsList = cacheReels.filter(r => !r.archived && r.img && ((r.author || '').toLowerCase().includes(q) || (r.caption || '').toLowerCase().includes(q)));
    window.currentExploreReelsList = reelsList;

    box.innerHTML = reelsList.length === 0
      ? `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही Trending Reel नाही.</p>`
      : reelsList.map(r => {
          const isVid = r.mediaType === 'video' || (r.img && (r.img.startsWith('data:video') || r.img.includes('.mp4')));
          return `
            <div onclick="openScrollableMediaFeed('reels', '${r.id}', 'Trending Reels', window.currentExploreReelsList, 'public_reel')" style="background:#fff; border-radius:16px; padding:12px; margin:10px 14px; display:flex; gap:14px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
              <div style="width:74px; height:96px; background:#0f172a; border-radius:12px; overflow:hidden; position:relative; flex-shrink:0;">
                ${isVid
                  ? `<video src="${r.img}#t=0.1" style="width:100%; height:100%; object-fit:cover;" muted playsinline preload="metadata"></video>`
                  : `<img src="${r.img}" style="width:100%; height:100%; object-fit:cover;">`
                }
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3); color:#fff; font-size:18px;">▶</div>
              </div>
              <div style="flex:1;">
                <span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:3px 9px; border-radius:8px;">🎬 Reel &bull; ${r.views || 1} Views</span>
                <h4 style="margin:8px 0 4px; font-size:16px; color:#0f172a;">${r.caption || 'Reel'}</h4>
                <div style="font-size:12.5px; color:#64748b;">By ${r.author}</div>
              </div>
              <button onclick="event.stopPropagation(); openItemActionMenu('${r.id}', 'reels', 'public_reel')" style="background:#f8fafc; border:none; width:34px; height:34px; border-radius:50%; color:#334155; font-size:16px; cursor:pointer;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            </div>
          `;
        }).join('');
    return;
  }

  let filteredOffers = cacheOffers.filter(o => !o.archived && ((o.deal || '').toLowerCase().includes(q) || (o.bizName || '').toLowerCase().includes(q)));
  box.innerHTML = filteredOffers.length === 0
    ? `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही ऑफर नाही. '+ Create ➔ Offer' मधून नवीन ऑफर टाका!</p>`
    : filteredOffers.map(o => `
      <div class="offer-banner-card" style="background:#fff; border-radius:16px; overflow:hidden; margin:12px 14px; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
        <div onclick="openScrollableMediaFeed('offers', '${o.id}', 'Offers', null, 'public_reel')" style="background-image:url('${o.img}'); height:145px; background-size:cover; background-position:center; position:relative; padding:14px; display:flex; align-items:flex-end; color:#fff; cursor:pointer;">
          <div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div>
          <div style="position:relative; z-index:1;">
            <div style="font-size:13px; font-weight:700; color:#38bdf8;">${o.bizName}</div>
            <div style="font-size:18px; font-weight:900;">${o.deal}</div>
          </div>
        </div>
      </div>
    `).join('');
}

function filterNearbyCat(catName, el) {
  activeNearbyFilter = catName;
  document.querySelectorAll('#view-nearby .f-chip').forEach(c => c.classList.remove('active-blue', 'active'));
  if (el) el.classList.add('active-blue');
  renderNearbyStores();
}

function renderNearbyStores() {
  let box = document.getElementById('nearby-stores-list');
  if (!box) return;
  let stores = cacheBusinesses.filter(s => activeNearbyFilter === 'All' || (s.category || '').toLowerCase().includes(activeNearbyFilter.toLowerCase()));
  box.innerHTML = stores.length === 0
    ? `<div style="text-align:center; padding:30px; color:#64748b;">अजून Business अकाउंट नाही.</div>`
    : stores.map(s => `
      <div style="background:#fff; border-radius:16px; padding:14px; margin:12px 14px; display:flex; gap:12px;">
        <img src="${s.avatar}" onclick="openUserProfile('${s.uid}')" style="width:75px; height:75px; border-radius:12px; object-fit:cover; cursor:pointer;">
        <div style="flex:1;">
          <div onclick="openUserProfile('${s.uid}')" style="font-weight:800; font-size:15.5px; cursor:pointer;">${s.name}</div>
          <div style="font-size:12px; color:#4f46e5; font-weight:700;">${s.category || 'Shops'} &bull; 📍 ${s.location}</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button onclick="startRealChat('${s.uid}', '${(s.name || 'Store').replace(/'/g, '')}', 'Inbox', '${s.avatar || ''}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">💬 Message</button>
          </div>
        </div>
      </div>
    `).join('');
}

// =========================================================
// 6. PROFILE VIEW (DYNAMIC GEAR ICON FOR ME vs 3-DOT ICON FOR OTHER USERS!)
// =========================================================
async function openUserProfile(targetUid) {
  if (!targetUid) return;
  const doc = await db.collection('users').doc(targetUid).get();
  if (!doc.exists) return;
  activeProfileUser = { uid: doc.id, ...doc.data() };

  const views = ['home', 'explore', 'nearby', 'messages', 'profile'];
  views.forEach(v => {
    document.getElementById('view-' + v).style.display = (v === 'profile') ? 'block' : 'none';
    document.getElementById('bnav-' + v).classList.toggle('active', v === 'profile');
  });
  document.getElementById('main-top-header').style.display = 'none';
  renderProfileData(activeProfileUser);
}

function loadProfileView() {
  if (!currentUserData) return;
  openUserProfile(currentUserData.uid);
}

async function renderProfileData(u) {
  const isMyOwnProfile = currentUserData && u.uid === currentUserData.uid;

  const rightTopBtns = document.querySelectorAll('#view-profile .prof-top-right-group button');
  rightTopBtns.forEach(btn => {
    if (isMyOwnProfile) {
      btn.innerHTML = '<i class="fa-solid fa-gear"></i>';
      btn.onclick = () => openSettingsScreen();
    } else {
      btn.innerHTML = '<i class="fa-solid fa-ellipsis-vertical"></i>';
      btn.onclick = () => openOtherUserProfileMenu();
    }
  });

  const pArchBtn = document.getElementById('people-archived-tab-btn');
  if (pArchBtn) pArchBtn.style.display = isMyOwnProfile ? 'inline-block' : 'none';
  const bArchBtn = document.getElementById('biz-archived-tab-btn');
  if (bArchBtn) bArchBtn.style.display = isMyOwnProfile ? 'inline-block' : 'none';

  if (!isMyOwnProfile && activePeopleTab === 'archived') {
    activePeopleTab = 'posts';
  }

  const msgBtn = document.querySelector('#people-profile-box .prof-light-btn');
  if (msgBtn) {
    msgBtn.onclick = () => startRealChat(u.uid, u.name, 'Inbox', u.avatar);
  }

  if (u.type === 'business') {
    document.getElementById('people-profile-box').style.display = 'none';
    document.getElementById('business-profile-box').style.display = 'block';
    document.getElementById('b-prof-name').innerText = u.name;
    document.getElementById('b-prof-cat').innerText = u.category || 'Business Store';
    document.getElementById('b-prof-about').innerText = u.about || '';
    document.getElementById('b-prof-loc').innerText = u.location || '';
    document.getElementById('b-prof-phone').innerText = u.phone || '+91 98765 43210';
    document.getElementById('b-stat-followers').innerText = u.followersCount || 0;
    document.getElementById('b-stat-following').innerText = u.followingCount || 0;
    if (u.avatar) document.getElementById('b-prof-logo').src = u.avatar;
    renderBizMediaSection();
  } else {
    document.getElementById('business-profile-box').style.display = 'none';
    document.getElementById('people-profile-box').style.display = 'block';
    document.getElementById('p-prof-name').innerText = u.name;
    document.getElementById('p-prof-loc').innerText = u.location || '';
    document.getElementById('p-prof-about').innerText = u.about || '';
    document.getElementById('p-stat-followers').innerText = u.followersCount || 0;
    document.getElementById('p-stat-following').innerText = u.followingCount || 0;
    if (u.avatar) document.getElementById('p-prof-avatar').src = u.avatar;
    renderProfileMediaGrid();
  }
}

function switchPeopleMediaTab(tabName, el) {
  activePeopleTab = tabName;
  document.querySelectorAll('#people-sub-tabs span').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
  renderProfileMediaGrid();
}

function renderProfileMediaGrid() {
  let grid = document.getElementById('people-media-grid');
  if (!grid) return;
  let targetUid = activeProfileUser ? activeProfileUser.uid : (currentUserData ? currentUserData.uid : '');
  let isMyOwnProfile = currentUserData && targetUid === currentUserData.uid;
  let menuCtx = isMyOwnProfile ? 'profile_owner' : 'public_reel';

  let allUserItems = [
    ...cachePosts.filter(p => p.uid === targetUid),
    ...cacheReels.filter(r => r.uid === targetUid),
    ...cacheStories.filter(s => s.uid === targetUid),
    ...cacheNotes.filter(n => n.uid === targetUid),
    ...cacheOffers.filter(o => o.uid === targetUid)
  ];

  let statPostsEl = document.getElementById('p-stat-posts');
  if (statPostsEl) statPostsEl.innerText = allUserItems.filter(i => !i.archived).length;

  let items = [];
  if (activePeopleTab === 'archived') {
    items = isMyOwnProfile ? allUserItems.filter(i => i.archived === true) : [];
  } else if (activePeopleTab === 'posts') {
    items = cachePosts.filter(p => p.uid === targetUid && !p.archived && !p.hiddenFromGrid);
  } else if (activePeopleTab === 'reels') {
    items = cacheReels.filter(r => r.uid === targetUid && !r.archived && !r.hiddenFromGrid);
  } else if (activePeopleTab === 'moments') {
    items = cacheStories.filter(s => s.uid === targetUid && !s.archived);
  } else if (activePeopleTab === 'highlights') {
    items = [
      ...cacheNotes.filter(n => n.uid === targetUid && !n.archived),
      ...cacheOffers.filter(o => o.uid === targetUid && !o.archived),
      ...cacheStories.filter(s => s.uid === targetUid && !s.archived)
    ];
  }

  if (items.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:#64748b; font-size:13px;">या विभागात अजून माहिती नाही.</div>`;
    return;
  }

  window.currentProfileGridList = items;

  grid.innerHTML = items.map(item => {
    let col = item._col || 'posts';
    let isVid = item.mediaType === 'video' || (item.img && (item.img.startsWith('data:video') || item.img.includes('.mp4')));
    return `
      <div onclick="openScrollableMediaFeed('${col}', '${item.id}', 'Profile ${activePeopleTab.toUpperCase()}', window.currentProfileGridList, '${menuCtx}')" style="position:relative; aspect-ratio:1/1; border-radius:12px; overflow:hidden; cursor:pointer; background:#0f172a;">
        ${isVid
          ? `<video src="${item.img}#t=0.1" style="width:100%; height:100%; object-fit:cover;" muted playsinline preload="metadata"></video>`
          : `<img src="${item.img}" style="width:100%; height:100%; object-fit:cover;">`
        }
        ${item.pinned ? `<span style="position:absolute; top:6px; left:6px; background:rgba(0,0,0,0.65); color:#fff; font-size:11px; padding:2px 6px; border-radius:6px;">📌</span>` : ''}
        <button onclick="event.stopPropagation(); openItemActionMenu('${item.id}', '${col}', '${menuCtx}')" style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.65); color:#fff; border:none; width:28px; height:28px; border-radius:50%; font-size:14px; cursor:pointer; z-index:3;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
      </div>
    `;
  }).join('');
}

function switchBizMediaTab(tabName, el) {
  activeBizTab = tabName;
  document.querySelectorAll('#business-profile-box .prof-sub-tabs span').forEach(s => s.classList.remove('active'));
  if (el) el.classList.add('active');
  renderBizMediaSection();
}

function renderBizMediaSection() {
  let miniBox = document.getElementById('biz-mini-products');
  if (!miniBox) return;
  let targetUid = activeProfileUser ? activeProfileUser.uid : (currentUserData ? currentUserData.uid : '');
  let isMyOwnProfile = currentUserData && targetUid === currentUserData.uid;
  let menuCtx = isMyOwnProfile ? 'profile_owner' : 'public_reel';

  let items = [];
  if (activeBizTab === 'Posts') items = cachePosts.filter(p => p.uid === targetUid && !p.archived);
  else if (activeBizTab === 'Reels') items = cacheReels.filter(r => r.uid === targetUid && !r.archived);
  else if (activeBizTab === 'Moments') items = cacheStories.filter(s => s.uid === targetUid && !s.archived);
  else if (activeBizTab === 'Archived') {
    items = isMyOwnProfile ? [
      ...cacheProducts.filter(p => p.uid === targetUid && p.archived),
      ...cachePosts.filter(p => p.uid === targetUid && p.archived),
      ...cacheReels.filter(r => r.uid === targetUid && r.archived)
    ] : [];
  } else {
    items = cacheProducts.filter(p => p.uid === targetUid && !p.archived);
  }

  window.currentBizGridList = items;

  if (items.length === 0) {
    miniBox.innerHTML = `<div style="padding:16px; color:#64748b; font-size:13px;">या विभागात अजून कोणतीही माहिती नाही.</div>`;
    return;
  }

  miniBox.innerHTML = items.map(item => {
    let col = item._col || 'products';
    let label = item.title || item.caption || item.deal || 'Item';
    return `
      <div onclick="openScrollableMediaFeed('${col}', '${item.id}', 'Business ${activeBizTab}', window.currentBizGridList, '${menuCtx}')" style="position:relative; min-width:130px; background:#f8fafc; padding:8px; border-radius:12px; margin-right:10px; text-align:center; cursor:pointer;">
        <img src="${item.img}" style="width:100%; height:95px; object-fit:cover; border-radius:8px;">
        <button onclick="event.stopPropagation(); openItemActionMenu('${item.id}', '${col}', '${menuCtx}')" style="position:absolute; top:12px; right:12px; background:rgba(0,0,0,0.65); color:#fff; border:none; width:26px; height:26px; border-radius:50%; cursor:pointer;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <div style="font-size:12px; font-weight:700; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${label}</div>
        ${item.price ? `<b style="color:#2563eb; font-size:12px;">${item.price}</b>` : ''}
      </div>
    `;
  }).join('');
}

async function toggleFollowPeopleProfile() { await executeRealFollow(); }
async function toggleFollowActiveBiz() { await executeRealFollow(); }

async function executeRealFollow() {
  if (!currentUserData || !activeProfileUser) return;
  const myUid = currentUserData.uid;
  const targetUid = activeProfileUser.uid;
  if (myUid === targetUid) return showToast('ℹ️ तुम्ही स्वतःलाच Follow करू शकत नाही!');

  const followDocRef = db.collection('users').doc(targetUid).collection('followers').doc(myUid);
  const snap = await followDocRef.get();

  if (!snap.exists) {
    await followDocRef.set({ uid: myUid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('users').doc(targetUid).update({ followersCount: firebase.firestore.FieldValue.increment(1) });
    await db.collection('users').doc(myUid).update({ followingCount: firebase.firestore.FieldValue.increment(1) });

    await pushRealNotification({
      targetUid: targetUid,
      type: 'follow',
      actorUid: currentUserData.uid,
      actorName: currentUserData.name,
      actorHandle: currentUserData.handle || '@user',
      actorAvatar: currentUserData.avatar,
      text: `started following you.`
    });
    showToast(`✅ तुम्ही ${activeProfileUser.name} ला Follow केले!`);
  } else {
    await followDocRef.delete();
    await db.collection('users').doc(targetUid).update({ followersCount: firebase.firestore.FieldValue.increment(-1) });
    await db.collection('users').doc(myUid).update({ followingCount: firebase.firestore.FieldValue.increment(-1) });
    showToast(`Unfollowed ${activeProfileUser.name}`);
  }
  openUserProfile(targetUid);
}

function startChatWithActiveBiz() {
  if (activeProfileUser) startRealChat(activeProfileUser.uid, activeProfileUser.name, 'Inbox', activeProfileUser.avatar);
}
function callActiveBiz() {
  let ph = activeProfileUser && activeProfileUser.phone ? activeProfileUser.phone : '9876543210';
  window.location.href = `tel:${ph}`;
}
function directionsActiveBiz() {
  let loc = activeProfileUser && activeProfileUser.location ? activeProfileUser.location : 'Ardhapur, Maharashtra';
  openGoogleMapLink(loc);
}

function openFullCatalogModal() {
  document.getElementById('catalog-modal').style.display = 'flex';
  renderCatalogGrid();
}
function closeCatalogModal() { document.getElementById('catalog-modal').style.display = 'none'; }
function filterCatalogItems(cat, el) {
  activeCatalogFilter = cat;
  document.querySelectorAll('#catalog-modal .f-chip').forEach(c => c.classList.remove('active-blue'));
  if (el) el.classList.add('active-blue');
  renderCatalogGrid();
}
function searchCatalogItems() { renderCatalogGrid(); }

function renderCatalogGrid() {
  let box = document.getElementById('catalog-grid-box');
  if (!box) return;
  let q = (document.getElementById('catalog-search-q')?.value || '').toLowerCase();
  let list = cacheProducts.filter(p => !p.archived && (p.title || '').toLowerCase().includes(q) && (activeCatalogFilter === 'All' || (p.cat || '').toLowerCase() === activeCatalogFilter.toLowerCase()));
  box.innerHTML = list.length === 0
    ? `<p style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b;">प्रॉडक्ट सापडले नाही.</p>`
    : list.map(p => `
      <div onclick="openProductDetail('${p.id}')" style="position:relative; background:#fff; border-radius:14px; padding:10px; cursor:pointer;">
        <img src="${p.img}" style="width:100%; height:130px; object-fit:cover; border-radius:10px;">
        <button onclick="event.stopPropagation(); openItemActionMenu('${p.id}', 'products', 'profile_owner')" style="position:absolute; top:16px; right:16px; background:rgba(0,0,0,0.6); color:#fff; border:none; width:28px; height:28px; border-radius:50%;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
        <h4 style="margin:8px 0 4px; font-size:14px;">${p.title}</h4>
        <div style="color:#2563eb; font-weight:800;">${p.price}</div>
      </div>
    `).join('');
}

function openProductDetail(prodId) {
  let p = cacheProducts.find(x => x.id === prodId);
  if (!p) return;
  document.getElementById('pd-main-img').src = p.img;
  document.getElementById('pd-title').innerText = p.title;
  document.getElementById('pd-price').innerText = p.price;
  document.getElementById('pd-desc').innerText = p.desc || '';
  document.getElementById('pd-cat').innerText = p.cat || 'Fashion';
  document.getElementById('product-detail-modal').style.display = 'flex';
}
function closeProductDetailModal() { document.getElementById('product-detail-modal').style.display = 'none'; }

// =========================================================
// SETTINGS & NAVIGATION
// =========================================================
async function editUserField(fieldKey, labelName) {
  if (!currentUserData) return;
  let newVal = prompt(`नवीन ${labelName} टाका:`, currentUserData[fieldKey] || '');
  if (!newVal) return;
  await db.collection('users').doc(currentUserData.uid).update({ [fieldKey]: newVal });
  currentUserData[fieldKey] = newVal;
  showToast(`✅ तुमचे ${labelName} सेव्ह झाले!`);
  openUserProfile(currentUserData.uid);
}

async function switchUserRoleTo(newType) {
  if (!currentUserData) return;
  let newCat = currentUserData.category || 'Shops';
  if (newType === 'business') {
    newCat = prompt('व्यवसायाची कॅटेगरी लिहा (Shops, Services किंवा Restaurants):', 'Shops') || 'Shops';
  }
  await db.collection('users').doc(currentUserData.uid).update({ type: newType, category: newCat });
  currentUserData.type = newType;
  currentUserData.category = newCat;
  closeSettingsScreen();
  openUserProfile(currentUserData.uid);
  showToast(`🔄 तुमचे अकाउंट ${newType.toUpperCase()} मध्ये बदलले!`);
}

function openSettingsScreen() {
  if (!currentUserData) return;
  document.getElementById('set-banner-name').innerText = currentUserData.name;
  document.getElementById('set-banner-sub').innerText = currentUserData.handle || '@user';
  document.getElementById('settings-grid-content').innerHTML = `
    <div class="set-card" style="background:#fff; padding:14px; border-radius:14px; margin-bottom:12px;">
      <h5 style="margin:0 0 10px; font-size:14px; color:#4f46e5;">Edit Real Profile</h5>
      <div onclick="editUserField('name', 'नाव')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">✏️ नाव बदला</div>
      <div onclick="editUserField('about', 'माहिती')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">📝 बायो बदला</div>
      <div onclick="editUserField('location', 'लोकेशन')" style="padding:8px 0; cursor:pointer;">📍 लोकेशन बदला</div>
    </div>
    <div class="set-card" style="background:#fff; padding:14px; border-radius:14px;">
      <h5 style="margin:0 0 10px; font-size:14px; color:#4f46e5;">Account Role</h5>
      <div onclick="switchUserRoleTo('business')" style="padding:8px 0; border-bottom:1px solid #f1f5f9; cursor:pointer;">🏪 Switch to Business Store</div>
      <div onclick="switchUserRoleTo('people')" style="padding:8px 0; cursor:pointer;">👤 Switch to Personal Account</div>
    </div>
  `;
  document.getElementById('settings-modal').style.display = 'flex';
}
function closeSettingsScreen() { document.getElementById('settings-modal').style.display = 'none'; }

async function logoutCurrentUser() {
  if (auth) await auth.signOut();
  currentUserData = null;
  activeProfileUser = null;
  closeSettingsScreen();
  showToast('👋 यशस्वीरित्या Log Out झाले!');
}

function switchBottomNav(tab) {
  const menu = document.getElementById('create-dropdown-menu');
  if (menu) menu.style.display = 'none';

  const views = ['home', 'explore', 'nearby', 'messages', 'profile'];
  views.forEach(v => {
    document.getElementById('view-' + v).style.display = (v === tab) ? 'block' : 'none';
    document.getElementById('bnav-' + v).classList.toggle('active', v === tab);
  });
  document.getElementById('main-top-header').style.display = (tab === 'home' || tab === 'explore') ? 'flex' : 'none';
  if (tab === 'profile') loadProfileView();
  window.scrollTo(0, 0);
}

function openImageLightbox(imgUrl, captionText) {
  if (!imgUrl) return;
  document.getElementById('lightbox-img').src = imgUrl;
  document.getElementById('lightbox-caption').innerText = captionText || '';
  document.getElementById('gallery-lightbox-modal').style.display = 'flex';
}

function closeImageLightbox() {
  document.getElementById('gallery-lightbox-modal').style.display = 'none';
}

function openGoogleMapLink(query) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Ardhapur, Maharashtra')}`, '_blank');
}
// =========================================================
// INSTANT AUTO-LOGIN & DIRECT HOME FEED OPENER (INSTAGRAM STYLE)
// =========================================================

const ALBIZNET_SESSION_KEY = 'albiznet_logged_user_v1';

// १. ॲप उघडताच १ सेकंदाच्या आत तपासणे की या मोबाईलमध्ये आधी लॉगिन आहे का?
(function instantBootSavedUser() {
  try {
    const saved = localStorage.getItem(ALBIZNET_SESSION_KEY);
    if (saved) {
      const parsedUser = JSON.parse(saved);
      if (parsedUser && parsedUser.uid) {
        currentUserData = parsedUser;
        activeProfileUser = parsedUser;

        // Welcome किंवा Login स्क्रीन लगेच लपवून थेट Main App उघडणे
        const hideWelcomeAndShowFeed = () => {
          const wScreen = document.getElementById('welcome-screen');
          const aScreen = document.getElementById('auth-screen');
          const mShell = document.getElementById('main-app-shell');

          if (wScreen) wScreen.style.display = 'none';
          if (aScreen) aScreen.style.display = 'none';
          if (mShell) mShell.style.display = 'block';
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', hideWelcomeAndShowFeed);
        } else {
          hideWelcomeAndShowFeed();
        }
      }
    }
  } catch (e) {}
})();

// २. सुधारित Firebase Init (Local Persistence सह + सेशन सेव्ह करणे)
async function initRealFirebaseApp() {
  try {
    injectProModalsIntoDOM();
    setupVideoFileInput();
    upgradeBusinessProfileTabs();
    setupGlobalOutsideClickForCreateMenu();

    // जर युजर आधीच लोकल स्टोरेजमध्ये सेव्ह असेल तर लगेच स्क्रीन उघडा
    const savedLocal = localStorage.getItem(ALBIZNET_SESSION_KEY);
    if (savedLocal) {
      try {
        currentUserData = JSON.parse(savedLocal);
        document.getElementById('welcome-screen').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app-shell').style.display = 'block';
      } catch (e) {}
    }

    if (typeof firebase === 'undefined') {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js');
    }

    let config = null;
    const cached = localStorage.getItem('albiznet_fb_config_cache');
    if (cached) {
      try { config = JSON.parse(cached); } catch (e) {}
    }

    if (!config || !config.apiKey) {
      const res = await fetch('/api/config');
      const data = await res.json();
      config = typeof data === 'string' ? JSON.parse(data) : data;
      if (config && config.apiKey) {
        localStorage.setItem('albiznet_fb_config_cache', JSON.stringify(config));
      }
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    auth = firebase.auth();
    db = firebase.firestore();
    if (firebase.storage) {
      try { storage = firebase.storage(); } catch (e) {}
    }

    // मोबाईल बंद केला किंवा ब्राउझर बंद केला तरी लॉगिन कायम राहण्यासाठी LOCAL Persistence
    if (firebase.auth.Auth && firebase.auth.Auth.Persistence) {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    }

    setupNotificationBell();

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const docRef = db.collection('users').doc(user.uid);
        const snap = await docRef.get();
        if (snap.exists) {
          currentUserData = { uid: user.uid, ...snap.data() };
        } else {
          let fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'ALBIZNET User');
          currentUserData = {
            uid: user.uid,
            type: authAccountType || 'people',
            name: fallbackName,
            handle: '@' + fallbackName.toLowerCase().replace(/\s+/g, ''),
            category: authAccountType === 'business' ? 'Shops' : 'Personal Account',
            about: `Hi! I'm ${fallbackName} on ALBIZNET.`,
            location: 'Ardhapur, Maharashtra',
            phone: user.phoneNumber || '',
            email: user.email || '',
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=4f46e5&color=fff&bold=true`,
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await docRef.set(currentUserData);
        }

        // युजरचा डेटा मोबाईलमध्ये कायमस्वरूपी सेव्ह करणे (पुढच्या वेळी थेट उघडण्यासाठी!)
        localStorage.setItem(ALBIZNET_SESSION_KEY, JSON.stringify(currentUserData));
        launchMainApp();
      } else {
        // जर खरंच लॉगआऊट केले असेल तरच Welcome स्क्रीन दाखवणे
        if (!localStorage.getItem(ALBIZNET_SESSION_KEY)) {
          document.getElementById('main-app-shell').style.display = 'none';
          document.getElementById('auth-screen').style.display = 'none';
          document.getElementById('welcome-screen').style.display = 'flex';
        } else {
          launchMainApp();
        }
      }
    });
  } catch (err) {
    console.error('Firebase Init Error:', err);
  }
}

// ३. जेव्हा युजर स्वतःहून 'Log Out' बटण दाबेल, तेव्हाच मेमरी पुसून Welcome स्क्रीनवर नेणे
async function logoutCurrentUser() {
  localStorage.removeItem(ALBIZNET_SESSION_KEY);
  if (auth) await auth.signOut().catch(() => {});
  currentUserData = null;
  activeProfileUser = null;
  closeSettingsScreen();
  document.getElementById('main-app-shell').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('welcome-screen').style.display = 'flex';
  showToast('👋 यशस्वीरित्या Log Out झाले!');
}
// =========================================================
// UNIVERSAL REAL-TIME SEARCH ENGINE (HOME, EXPLORE, NEARBY, MESSAGES)
// =========================================================

// १. सर्व सर्च बॉक्स आपोआप शोधून त्यांना लाईव्ह टायपिंग (input) इव्हेंट जोडणे
function bindAllSearchInputsLive() {
  // A. HOME TOP HEADER SEARCH BOX (People & Business Search Modal)
  const topSearchEl = document.querySelector('#main-top-header input') ||
                      document.getElementById('top-search-input') ||
                      Array.from(document.querySelectorAll('#main-top-header *')).find(el => el.textContent && el.textContent.trim() === 'Search');

  if (topSearchEl && !topSearchEl.dataset.boundHomeSearch) {
    topSearchEl.dataset.boundHomeSearch = '1';
    if (topSearchEl.tagName === 'INPUT') {
      topSearchEl.setAttribute('placeholder', 'Search People & Business...');
      topSearchEl.addEventListener('focus', () => openHomeAccountSearchModal(topSearchEl.value));
      topSearchEl.addEventListener('input', (e) => openHomeAccountSearchModal(e.target.value));
    } else {
      const clickableParent = topSearchEl.closest('div, button') || topSearchEl;
      clickableParent.style.cursor = 'pointer';
      clickableParent.addEventListener('click', () => openHomeAccountSearchModal(''));
    }
  }

  // B. EXPLORE SEARCH BOX
  const expInp = document.getElementById('explore-search-input') || document.querySelector('#view-explore input[type="text"], #view-explore input[type="search"], #view-explore input');
  if (expInp && !expInp.dataset.boundExp) {
    expInp.id = 'explore-search-input';
    expInp.dataset.boundExp = '1';
    expInp.addEventListener('input', () => renderExploreOffers());
    expInp.addEventListener('keyup', () => renderExploreOffers());
  }

  // C. NEARBY SEARCH BOX
  const nearInp = document.getElementById('nearby-search-input') || document.querySelector('#view-nearby input[type="text"], #view-nearby input[type="search"], #view-nearby input');
  if (nearInp && !nearInp.dataset.boundNear) {
    nearInp.id = 'nearby-search-input';
    nearInp.dataset.boundNear = '1';
    nearInp.addEventListener('input', () => renderNearbyStores());
    nearInp.addEventListener('keyup', () => renderNearbyStores());
  }

  // D. MESSAGES SEARCH BOX
  const msgInp = document.getElementById('msg-search-input') || document.querySelector('#view-messages input[type="text"], #view-messages input[type="search"], #view-messages input');
  if (msgInp && !msgInp.dataset.boundMsg) {
    msgInp.id = 'msg-search-input';
    msgInp.dataset.boundMsg = '1';
    msgInp.addEventListener('input', () => renderMessagesList());
    msgInp.addEventListener('keyup', () => renderMessagesList());
  }
}

setInterval(bindAllSearchInputsLive, 1200);
document.addEventListener('DOMContentLoaded', bindAllSearchInputsLive);

// =========================================================
// २. HOME SEARCH: PEOPLE & BUSINESS ACCOUNT SEARCH MODAL
// =========================================================
let activeHomeAccountFilter = 'all'; // 'all' | 'people' | 'business'

function ensureHomeSearchModal() {
  if (document.getElementById('pro-home-search-modal')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="pro-home-search-modal" style="display:none; position:fixed; inset:0; background:#f8fafc; z-index:7500; flex-direction:column; font-family:'Poppins', sans-serif;">
      <div style="display:flex; align-items:center; gap:10px; padding:12px 14px; background:#fff; border-bottom:1px solid #e2e8f0;">
        <button onclick="closeHomeAccountSearchModal()" style="background:none; border:none; font-size:20px; color:#0f172a; cursor:pointer; padding:4px;"><i class="fa-solid fa-arrow-left"></i></button>
        <div style="flex:1; display:flex; align-items:center; background:#f1f5f9; border-radius:24px; padding:8px 14px;">
          <i class="fa-solid fa-magnifying-glass" style="color:#64748b; margin-right:8px;"></i>
          <input type="text" id="home-acc-search-input" placeholder="Search People or Business accounts..." style="flex:1; border:none; background:transparent; outline:none; font-size:14px; color:#0f172a;" oninput="renderHomeAccountSearchResults()">
          <i class="fa-solid fa-xmark" style="color:#64748b; cursor:pointer; padding:2px 4px;" onclick="document.getElementById('home-acc-search-input').value=''; renderHomeAccountSearchResults();"></i>
        </div>
      </div>

      <div style="display:flex; gap:8px; padding:10px 14px; background:#fff; border-bottom:1px solid #f1f5f9;">
        <button id="h-tab-all" onclick="setHomeSearchTab('all')" style="padding:6px 16px; border-radius:20px; border:none; font-weight:700; font-size:12.5px; background:#4f46e5; color:#fff; cursor:pointer;">All Accounts</button>
        <button id="h-tab-people" onclick="setHomeSearchTab('people')" style="padding:6px 16px; border-radius:20px; border:none; font-weight:700; font-size:12.5px; background:#f1f5f9; color:#334155; cursor:pointer;">👤 People</button>
        <button id="h-tab-business" onclick="setHomeSearchTab('business')" style="padding:6px 16px; border-radius:20px; border:none; font-weight:700; font-size:12.5px; background:#f1f5f9; color:#334155; cursor:pointer;">🏪 Business</button>
      </div>

      <div id="home-acc-search-results" style="flex:1; overflow-y:auto; padding:12px 14px;"></div>
    </div>
  `;
  document.body.appendChild(wrap);
}

function openHomeAccountSearchModal(initialQuery = '') {
  ensureHomeSearchModal();
  const modal = document.getElementById('pro-home-search-modal');
  const inp = document.getElementById('home-acc-search-input');
  modal.style.display = 'flex';
  if (typeof initialQuery === 'string' && initialQuery) inp.value = initialQuery;
  setTimeout(() => inp.focus(), 80);
  renderHomeAccountSearchResults();
}

function closeHomeAccountSearchModal() {
  const modal = document.getElementById('pro-home-search-modal');
  if (modal) modal.style.display = 'none';
}

function setHomeSearchTab(tab) {
  activeHomeAccountFilter = tab;
  ['all', 'people', 'business'].forEach(t => {
    const btn = document.getElementById('h-tab-' + t);
    if (btn) {
      btn.style.background = (t === tab) ? '#4f46e5' : '#f1f5f9';
      btn.style.color = (t === tab) ? '#ffffff' : '#334155';
    }
  });
  renderHomeAccountSearchResults();
}

function renderHomeAccountSearchResults() {
  const box = document.getElementById('home-acc-search-results');
  const q = (document.getElementById('home-acc-search-input')?.value || '').trim().toLowerCase();
  if (!box) return;

  let list = cacheAllUsers.filter(u => {
    if (activeHomeAccountFilter === 'people' && u.type === 'business') return false;
    if (activeHomeAccountFilter === 'business' && u.type !== 'business') return false;
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q) ||
           (u.handle || '').toLowerCase().includes(q) ||
           (u.category || '').toLowerCase().includes(q) ||
           (u.location || '').toLowerCase().includes(q);
  });

  if (list.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:40px 16px; color:#64748b; font-size:14px;">🔍 "<b>${q}</b>" नावाचे कोणतेही People किंवा Business अकाउंट सापडले नाही.</div>`;
    return;
  }

  box.innerHTML = list.map(u => {
    const isBiz = u.type === 'business';
    const badgeHTML = isBiz
      ? `<span style="background:#eff6ff; color:#2563eb; font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:8px;">🏪 ${u.category || 'Business'}</span>`
      : `<span style="background:#f3e8ff; color:#7e22ce; font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:8px;">👤 People</span>`;

    return `
      <div onclick="closeHomeAccountSearchModal(); openUserProfile('${u.uid}')" style="display:flex; align-items:center; gap:12px; background:#fff; padding:12px 14px; border-radius:16px; margin-bottom:10px; box-shadow:0 2px 8px rgba(0,0,0,0.04); cursor:pointer;">
        <img src="${u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}`}" style="width:50px; height:50px; border-radius:${isBiz ? '14px' : '50%'}; object-fit:cover;">
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="font-weight:800; font-size:15px; color:#0f172a;">${u.name || 'User'}</span>
            ${badgeHTML}
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">${u.handle || '@user'} &bull; 📍 ${u.location || 'Maharashtra'}</div>
        </div>
        <button onclick="event.stopPropagation(); closeHomeAccountSearchModal(); startRealChat('${u.uid}', '${(u.name || 'User').replace(/'/g, '')}', 'Inbox', '${u.avatar || ''}')" style="background:#2563eb; color:#fff; border:none; padding:7px 12px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">💬 Chat</button>
      </div>
    `;
  }).join('');
}

// =========================================================
// ३. EXPLORE SUB-POINTS & UNIVERSAL SEARCH (Offers, Jobs, Trending Reels, इ.)
// =========================================================
function renderExploreOffers() {
  let box = document.getElementById('explore-offers-list');
  if (!box) return;
  let inp = document.getElementById('explore-search-input') || document.querySelector('#view-explore input');
  let q = (inp ? inp.value : '').trim().toLowerCase();
  const chip = (activeExploreFilter || 'Offers').trim();

  // १. Trending Reels सब-पॉईंट
  if (chip.toLowerCase().includes('reel')) {
    let reelsList = cacheReels.filter(r => !r.archived && r.img && (
      !q ||
      (r.author || '').toLowerCase().includes(q) ||
      (r.caption || '').toLowerCase().includes(q)
    ));
    window.currentExploreReelsList = reelsList;

    box.innerHTML = reelsList.length === 0
      ? `<p style="text-align:center; padding:30px; color:#64748b;">🔍 "${q || chip}" साठी कोणतीही Reel सापडली नाही.</p>`
      : reelsList.map(r => {
          const isVid = r.mediaType === 'video' || (r.img && (r.img.startsWith('data:video') || r.img.includes('.mp4')));
          return `
            <div onclick="openScrollableMediaFeed('reels', '${r.id}', 'Trending Reels', window.currentExploreReelsList, 'public_reel')" style="background:#fff; border-radius:16px; padding:12px; margin:10px 14px; display:flex; gap:14px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
              <div style="width:74px; height:96px; background:#0f172a; border-radius:12px; overflow:hidden; position:relative; flex-shrink:0;">
                ${isVid
                  ? `<video src="${r.img}#t=0.1" style="width:100%; height:100%; object-fit:cover;" muted playsinline preload="metadata"></video>`
                  : `<img src="${r.img}" style="width:100%; height:100%; object-fit:cover;">`
                }
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3); color:#fff; font-size:18px;">▶</div>
              </div>
              <div style="flex:1;">
                <span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:3px 9px; border-radius:8px;">🎬 Reel &bull; ${r.views || 1} Views</span>
                <h4 style="margin:8px 0 4px; font-size:16px; color:#0f172a;">${r.caption || 'Reel'}</h4>
                <div style="font-size:12.5px; color:#64748b;">By ${r.author}</div>
              </div>
            </div>
          `;
        }).join('');
    return;
  }

  // २. Offers सब-पॉईंट (आणि जर युजरने सर्च बॉक्समध्ये काही टाईप केले तर People/Business/Posts सुद्धा दाखवणे)
  if (chip.toLowerCase() === 'offers') {
    let filteredOffers = cacheOffers.filter(o => !o.archived && (
      !q ||
      (o.deal || '').toLowerCase().includes(q) ||
      (o.bizName || '').toLowerCase().includes(q) ||
      (o.location || '').toLowerCase().includes(q)
    ));

    let extraUsersHTML = '';
    if (q) {
      const matchedUsers = cacheAllUsers.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.handle || '').toLowerCase().includes(q) ||
        (u.category || '').toLowerCase().includes(q)
      );
      if (matchedUsers.length > 0) {
        extraUsersHTML = `
          <div style="margin:8px 14px 14px;">
            <div style="font-weight:800; font-size:13.5px; color:#475569; margin-bottom:8px;">👥 Matching People & Businesses (${matchedUsers.length})</div>
            ${matchedUsers.map(u => `
              <div onclick="openUserProfile('${u.uid}')" style="display:flex; align-items:center; gap:10px; background:#fff; padding:10px 12px; border-radius:14px; margin-bottom:8px; box-shadow:0 2px 6px rgba(0,0,0,0.04); cursor:pointer;">
                <img src="${u.avatar}" style="width:42px; height:42px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                  <div style="font-weight:800; font-size:14px; color:#0f172a;">${u.name}</div>
                  <div style="font-size:11.5px; color:#64748b;">${u.type === 'business' ? '🏪 ' + (u.category || 'Business') : '👤 People'} &bull; 📍 ${u.location || ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    const offersHTML = filteredOffers.length === 0
      ? `<p style="text-align:center; padding:30px; color:#64748b;">सध्या कोणतीही ऑफर नाही. '+ Create ➔ Offer' मधून नवीन ऑफर टाका!</p>`
      : filteredOffers.map(o => `
        <div class="offer-banner-card" style="background:#fff; border-radius:16px; overflow:hidden; margin:12px 14px; box-shadow:0 2px 10px rgba(0,0,0,0.06);">
          <div onclick="openScrollableMediaFeed('offers', '${o.id}', 'Offers', null, 'public_reel')" style="background-image:url('${o.img}'); height:145px; background-size:cover; background-position:center; position:relative; padding:14px; display:flex; align-items:flex-end; color:#fff; cursor:pointer;">
            <div style="position:absolute; inset:0; background:linear-gradient(transparent, rgba(0,0,0,0.8));"></div>
            <div style="position:relative; z-index:1;">
              <div style="font-size:13px; font-weight:700; color:#38bdf8;">${o.bizName}</div>
              <div style="font-size:18px; font-weight:900;">${o.deal}</div>
            </div>
          </div>
        </div>
      `).join('');

    box.innerHTML = extraUsersHTML + offersHTML;
    return;
  }

  // ३. इतर सर्व Explore सब-पॉईंट्स (उदा. Jobs, Events, News, Posts इ.) साठी स्मार्ट फिल्टर
  const chipLower = chip.toLowerCase();
  const subPosts = cachePosts.filter(p => !p.archived && (
    ((p.category || '').toLowerCase().includes(chipLower) || (p.caption || '').toLowerCase().includes(chipLower) || chipLower === 'all') &&
    (!q || (p.caption || '').toLowerCase().includes(q) || (p.author || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q))
  ));

  if (subPosts.length === 0) {
    box.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">सध्या <b>${chip}</b> मध्ये माहिती नाही. '+ Create ➔ Post' मधून Category मध्ये "${chip}" लिहून पोस्ट टाका!</p>`;
    return;
  }

  box.innerHTML = subPosts.map(p => `
    <div onclick="openScrollableMediaFeed('posts', '${p.id}', '${chip}', null, 'public_reel')" style="background:#fff; border-radius:16px; padding:14px; margin:10px 14px; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <img src="${p.avatar}" style="width:38px; height:38px; border-radius:50%; object-fit:cover;">
        <div>
          <div style="font-weight:800; font-size:14.5px; color:#0f172a;">${p.author}</div>
          <div style="font-size:11.5px; color:#4f46e5; font-weight:700;">${p.category || chip} &bull; 📍 ${p.location || ''}</div>
        </div>
      </div>
      <div style="font-size:14px; color:#1e293b; margin-bottom:8px;">${p.caption || ''}</div>
      ${p.img ? `<img src="${p.img}" style="width:100%; max-height:220px; object-fit:cover; border-radius:12px;">` : ''}
    </div>
  `).join('');
}

// =========================================================
// ४. NEARBY SUB-POINTS & LIVE SEARCH (All, Shops, Services, Restaurants, Deals)
// =========================================================
function renderNearbyStores() {
  let box = document.getElementById('nearby-stores-list');
  if (!box) return;
  let inp = document.getElementById('nearby-search-input') || document.querySelector('#view-nearby input');
  let q = (inp ? inp.value : '').trim().toLowerCase();
  const catFilter = (activeNearbyFilter || 'All').trim().toLowerCase();

  // जर Nearby मध्ये 'Deals' सब-पॉईंट निवडला असेल तर ऑफर्स सर्च करा
  if (catFilter === 'deals' || catFilter === 'offers') {
    const deals = cacheOffers.filter(o => !o.archived && (
      !q ||
      (o.deal || '').toLowerCase().includes(q) ||
      (o.bizName || '').toLowerCase().includes(q) ||
      (o.location || '').toLowerCase().includes(q)
    ));
    box.innerHTML = deals.length === 0
      ? `<div style="text-align:center; padding:30px; color:#64748b;">आजूबाजूला कोणतीही Deal किंवा Offer सापडली नाही.</div>`
      : deals.map(o => `
        <div onclick="openScrollableMediaFeed('offers', '${o.id}', 'Nearby Deals', null, 'public_reel')" style="background:#fff; border-radius:16px; padding:12px; margin:12px 14px; display:flex; gap:12px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.05); cursor:pointer;">
          <img src="${o.img}" style="width:72px; height:72px; border-radius:12px; object-fit:cover;">
          <div style="flex:1;">
            <span style="background:#dcfce7; color:#16a34a; font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:6px;">🏷️ Nearby Deal</span>
            <div style="font-weight:800; font-size:15px; color:#0f172a; margin-top:4px;">${o.deal}</div>
            <div style="font-size:12px; color:#64748b;">🏪 ${o.bizName} &bull; 📍 ${o.location || 'Maharashtra'}</div>
          </div>
        </div>
      `).join('');
    return;
  }

  // All, Shops, Services, Restaurants इ. सब-पॉईंट्स आणि सर्च बॉक्स फिल्टर
  const singularCat = catFilter.endsWith('s') ? catFilter.slice(0, -1) : catFilter;

  let stores = cacheBusinesses.filter(s => {
    const sCat = (s.category || 'Shops').toLowerCase();
    const matchSubPoint = (catFilter === 'all') || sCat.includes(catFilter) || sCat.includes(singularCat);
    if (!matchSubPoint) return false;

    if (!q) return true;
    return (s.name || '').toLowerCase().includes(q) ||
           sCat.includes(q) ||
           (s.location || '').toLowerCase().includes(q) ||
           (s.about || '').toLowerCase().includes(q);
  });

  box.innerHTML = stores.length === 0
    ? `<div style="text-align:center; padding:30px; color:#64748b;">${q ? `🔍 "${q}" साठी कोणतेही Business अकाउंट सापडले नाही.` : `अजून <b>${activeNearbyFilter}</b> मध्ये Business अकाउंट नाही.`}</div>`
    : stores.map(s => `
      <div style="background:#fff; border-radius:16px; padding:14px; margin:12px 14px; display:flex; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <img src="${s.avatar}" onclick="openUserProfile('${s.uid}')" style="width:75px; height:75px; border-radius:12px; object-fit:cover; cursor:pointer;">
        <div style="flex:1;">
          <div onclick="openUserProfile('${s.uid}')" style="font-weight:800; font-size:15.5px; color:#0f172a; cursor:pointer;">${s.name}</div>
          <div style="font-size:12px; color:#4f46e5; font-weight:700;">${s.category || 'Shops'} &bull; 📍 ${s.location || 'Maharashtra'}</div>
          <div style="font-size:12px; color:#64748b; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.about || ''}</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button onclick="startRealChat('${s.uid}', '${(s.name || 'Store').replace(/'/g, '')}', 'Inbox', '${s.avatar || ''}')" style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">💬 Message</button>
            <button onclick="openUserProfile('${s.uid}')" style="background:#f1f5f9; color:#0f172a; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Visit Store</button>
          </div>
        </div>
      </div>
    `).join('');
}
