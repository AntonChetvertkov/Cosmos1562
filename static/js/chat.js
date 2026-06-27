/* ── State ──────────────────────────────────────────────── */
const ME = window.MY_EMAIL;
let socket = null;
let activeConvId = null;
let conversations = {};          // id → conv object
let typingTimers = {};           // conv_id → timer
let oldestMsgId = null;
let hasMoreMsgs = false;

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    requestNotifPermission();
    connectSocket();
    loadConversations();
    bindUI();
});

function connectSocket() {
    socket = io({ transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
        if (activeConvId) socket.emit('join_conv', { conv_id: activeConvId });
    });

    socket.on('new_message', onNewMessage);
    socket.on('typing', onTyping);
}

/* ── Conversations ──────────────────────────────────────── */
async function loadConversations() {
    const res = await fetch('/chat/conversations');
    if (!res.ok) return;
    const list = await res.json();
    conversations = {};
    for (const c of list) conversations[c.id] = c;
    renderSidebar(list);
}

function renderSidebar(list) {
    const el = document.getElementById('conv-list');
    el.innerHTML = '';
    for (const c of list) {
        el.appendChild(makeConvItem(c));
    }
}

function makeConvItem(c) {
    const item = document.createElement('div');
    item.className = 'conv-item' + (c.id === activeConvId ? ' active' : '');
    item.dataset.convId = c.id;

    const initial = (c.display_name || '?')[0].toUpperCase();
    const badge = c.unread > 0 ? `<span class="conv-badge">${c.unread}</span>` : '';
    const preview = c.last_msg ? escHtml(c.last_msg).slice(0, 40) : '<em>No messages yet</em>';
    const isGroup = c.is_group ? '&#x25a6; ' : '';

    item.innerHTML = `
        <div class="conv-avatar">${initial}</div>
        <div class="conv-info">
            <div class="conv-name">${isGroup}${escHtml(c.display_name)}</div>
            <div class="conv-preview">${preview}</div>
        </div>
        ${badge}
    `;
    item.addEventListener('click', () => openConversation(c.id));
    return item;
}

/* ── Open conversation ──────────────────────────────────── */
async function openConversation(convId) {
    activeConvId = convId;
    oldestMsgId = null;
    hasMoreMsgs = false;

    // Update sidebar active state
    document.querySelectorAll('.conv-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.convId) === convId);
        if (parseInt(el.dataset.convId) === convId) {
            const badge = el.querySelector('.conv-badge');
            if (badge) badge.remove();
        }
    });

    socket.emit('join_conv', { conv_id: convId });

    const conv = conversations[convId];
    if (conv) {
        document.getElementById('panel-header-name').textContent = conv.display_name;
        document.getElementById('panel-header-sub').textContent = conv.is_group ? 'Group chat' : conv.other_email || '';
        document.getElementById('group-settings-btn').style.display = conv.is_group ? 'block' : 'none';
    }

    document.getElementById('panel-empty').style.display = 'none';
    document.getElementById('panel-active').style.display = 'flex';

    // Mobile: close the drawer once a chat is picked
    closeDrawer();
    document.getElementById('typing-indicator').style.display = 'none';

    const msgList = document.getElementById('messages-list');
    msgList.innerHTML = '';

    const msgs = await fetchMessages(convId, null);
    if (msgs) renderMessages(msgs, false);

    document.getElementById('msg-input').focus();
}

async function fetchMessages(convId, beforeId) {
    const url = `/chat/${convId}/messages` + (beforeId ? `?before_id=${beforeId}` : '');
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
}

function renderMessages(msgs, prepend) {
    const msgList = document.getElementById('messages-list');
    if (!msgs.length) return;

    if (prepend) {
        // Render older messages at the top
        const frag = document.createDocumentFragment();
        appendMsgGroups(msgs, frag);
        msgList.insertBefore(frag, msgList.firstChild);
        hasMoreMsgs = msgs.length >= 50;
    } else {
        appendMsgGroups(msgs, msgList);
        oldestMsgId = msgs[0]?.id;
        hasMoreMsgs = msgs.length >= 50;
        scrollToBottom();
    }

    document.getElementById('load-more-wrap').style.display = hasMoreMsgs ? 'block' : 'none';
    if (msgs.length) oldestMsgId = msgs[0].id;
}

function appendMsgGroups(msgs, container) {
    let lastDate = null;
    let lastSender = null;
    let lastGroup = null;

    for (const msg of msgs) {
        const d = new Date(msg.sent_at);
        const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        if (dateStr !== lastDate) {
            const div = document.createElement('div');
            div.className = 'date-divider';
            div.textContent = dateStr;
            container.appendChild(div);
            lastDate = dateStr;
            lastSender = null;
        }

        const isMe = msg.sender_email === ME;
        if (msg.sender_email !== lastSender) {
            lastGroup = document.createElement('div');
            lastGroup.className = 'msg-group ' + (isMe ? 'me' : 'them');
            if (!isMe) {
                const senderEl = document.createElement('div');
                senderEl.className = 'msg-sender';
                senderEl.textContent = msg.sender_name || msg.sender_email;
                lastGroup.appendChild(senderEl);
            }
            container.appendChild(lastGroup);
            lastSender = msg.sender_email;
        }

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        fillBubble(bubble, msg);
        lastGroup.appendChild(bubble);

        const timeEl = document.createElement('div');
        timeEl.className = 'msg-time';
        timeEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lastGroup.appendChild(timeEl);
    }
}

function appendSingleMessage(msg) {
    const isMe = msg.sender_email === ME;
    const msgList = document.getElementById('messages-list');
    const lastGroup = msgList.lastElementChild;

    let group;
    if (lastGroup && lastGroup.classList.contains('msg-group') &&
        lastGroup.classList.contains(isMe ? 'me' : 'them') &&
        lastGroup.dataset.sender === msg.sender_email) {
        group = lastGroup;
    } else {
        group = document.createElement('div');
        group.className = 'msg-group ' + (isMe ? 'me' : 'them');
        group.dataset.sender = msg.sender_email;
        if (!isMe) {
            const senderEl = document.createElement('div');
            senderEl.className = 'msg-sender';
            senderEl.textContent = msg.sender_name || msg.sender_email;
            group.appendChild(senderEl);
        }
        msgList.appendChild(group);
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    fillBubble(bubble, msg);
    group.appendChild(bubble);

    const timeEl = document.createElement('div');
    timeEl.className = 'msg-time';
    const d = new Date(msg.sent_at || Date.now());
    timeEl.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    group.appendChild(timeEl);

    scrollToBottom();
}

/* ── Send message ───────────────────────────────────────── */
function sendMessage() {
    if (!activeConvId || !socket) return;
    const input = document.getElementById('msg-input');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';
    autoResizeInput(input);

    socket.emit('send_message', { conv_id: activeConvId, content });
}

/* ── Socket events ──────────────────────────────────────── */
function onNewMessage(msg) {
    const fromOther = msg.sender_email !== ME;
    const previewText = msg.has_file ? `📎 ${msg.file_name || 'File'}` : msg.content;

    if (msg.conv_id === activeConvId) {
        appendSingleMessage(msg);
        socket.emit('join_conv', { conv_id: activeConvId });
        // Ping even when looking at the chat, if the window isn't focused
        // (visual notification, if any, is handled by the service worker push)
        if (fromOther && document.hidden) {
            playPing();
        }
    } else {
        // Update unread badge on sidebar
        const item = document.querySelector(`.conv-item[data-conv-id="${msg.conv_id}"]`);
        if (item) {
            let badge = item.querySelector('.conv-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'conv-badge';
                badge.textContent = '1';
                item.appendChild(badge);
            } else {
                badge.textContent = parseInt(badge.textContent || 0) + 1;
            }
            // Move to top of sidebar
            const list = document.getElementById('conv-list');
            list.insertBefore(item, list.firstChild);
        }
        // Ping for messages in other conversations (notification via SW push)
        if (fromOther) {
            playPing();
        }
    }

    // Update preview in sidebar
    const item = document.querySelector(`.conv-item[data-conv-id="${msg.conv_id}"]`);
    if (item) {
        const preview = item.querySelector('.conv-preview');
        if (preview) preview.textContent = (previewText || '').slice(0, 40);
    }
}

function onTyping(data) {
    if (data.conv_id !== activeConvId) return;
    const indicator = document.getElementById('typing-indicator');
    const text = document.getElementById('typing-text');
    text.textContent = (data.sender_name || data.sender_email) + ' is typing...';
    indicator.style.display = 'block';

    clearTimeout(typingTimers[data.conv_id]);
    typingTimers[data.conv_id] = setTimeout(() => {
        indicator.style.display = 'none';
    }, 2000);
}

/* ── Typing emit ────────────────────────────────────────── */
let typingTimeout = null;
function onInputTyping() {
    if (!activeConvId || !socket) return;
    clearTimeout(typingTimeout);
    socket.emit('typing', { conv_id: activeConvId });
    typingTimeout = setTimeout(() => {}, 2000);
}

/* ── DM modal ───────────────────────────────────────────── */
async function openDM() {
    const email = document.getElementById('dm-email').value.trim();
    const errEl = document.getElementById('dm-error');
    if (!email) { errEl.textContent = 'Enter an email.'; return; }

    const res = await fetch('/chat/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Error'; return; }

    document.getElementById('dm-modal').style.display = 'none';
    document.getElementById('dm-email').value = '';
    errEl.textContent = '';

    await loadConversations();
    openConversation(data.conv_id);
}

/* ── Group modal ────────────────────────────────────────── */
async function createGroup() {
    const name = document.getElementById('group-name').value.trim();
    const emailsRaw = document.getElementById('group-emails').value.trim();
    const errEl = document.getElementById('group-error');

    if (!name) { errEl.textContent = 'Enter a group name.'; return; }
    if (!emailsRaw) { errEl.textContent = 'Enter at least one email.'; return; }

    const emails = emailsRaw.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);

    const res = await fetch('/chat/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emails }),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Error'; return; }

    document.getElementById('group-modal').style.display = 'none';
    document.getElementById('group-name').value = '';
    document.getElementById('group-emails').value = '';
    errEl.textContent = '';

    await loadConversations();
    openConversation(data.conv_id);
}

/* ── Group settings ─────────────────────────────────────── */
let gsetOwner = false;

async function openGroupSettings() {
    if (!activeConvId) return;
    const errEl = document.getElementById('gset-error');
    errEl.textContent = '';
    const res = await fetch(`/chat/group/${activeConvId}/members`);
    if (!res.ok) { return; }
    const data = await res.json();
    gsetOwner = data.is_owner;

    document.getElementById('gset-name').value = data.name || '';
    document.getElementById('gset-rename-row').style.display = gsetOwner ? 'block' : 'none';
    document.getElementById('gset-add-row').style.display = gsetOwner ? 'block' : 'none';
    document.getElementById('gset-delete').style.display = gsetOwner ? 'block' : 'none';

    renderMembers(data.members, data.created_by);
    document.getElementById('gset-modal').style.display = 'flex';
}

function renderMembers(members, ownerEmail) {
    const el = document.getElementById('gset-members');
    el.innerHTML = '';
    for (const m of members) {
        const row = document.createElement('div');
        row.className = 'gset-member';
        const isOwner = m.email === ownerEmail;
        let html = `<span class="gset-member-name">${escHtml(m.name)}</span>`;
        if (isOwner) html += `<span class="gset-owner-tag">Owner</span>`;
        row.innerHTML = html;
        if (gsetOwner && !isOwner) {
            const btn = document.createElement('button');
            btn.className = 'gset-remove';
            btn.textContent = '✕';
            btn.title = 'Remove';
            btn.addEventListener('click', () => removeMember(m.email));
            row.appendChild(btn);
        }
        el.appendChild(row);
    }
}

async function removeMember(email) {
    const res = await fetch(`/chat/group/${activeConvId}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) { document.getElementById('gset-error').textContent = data.error || 'Error'; return; }
    openGroupSettings();
}

async function addMember() {
    const email = document.getElementById('gset-add-email').value.trim();
    const errEl = document.getElementById('gset-error');
    if (!email) { errEl.textContent = 'Enter an email.'; return; }
    const res = await fetch(`/chat/group/${activeConvId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Error'; return; }
    document.getElementById('gset-add-email').value = '';
    openGroupSettings();
}

async function renameGroup() {
    const name = document.getElementById('gset-name').value.trim();
    const errEl = document.getElementById('gset-error');
    if (!name) { errEl.textContent = 'Enter a name.'; return; }
    const res = await fetch(`/chat/group/${activeConvId}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Error'; return; }
    document.getElementById('panel-header-name').textContent = name;
    await loadConversations();
}

async function deleteGroup() {
    if (!confirm('Delete this group for everyone? This cannot be undone.')) return;
    const res = await fetch(`/chat/group/${activeConvId}/delete`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { document.getElementById('gset-error').textContent = data.error || 'Error'; return; }
    document.getElementById('gset-modal').style.display = 'none';
    document.getElementById('panel-active').style.display = 'none';
    document.getElementById('panel-empty').style.display = 'flex';
    activeConvId = null;
    await loadConversations();
}

/* ── Notifications + ping ────────────────────────────────── */
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { /* no audio */ }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function playPing() {
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, t);
    o.frequency.setValueAtTime(1175, t + 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.start(t);
    o.stop(t + 0.4);
}

let swRegistration = null;

// Register the service worker (needed for push on both desktop & mobile).
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
        swRegistration = await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
        console.warn('SW registration failed', e);
    }
}

// Permission + audio unlock + push subscription must happen inside a user gesture.
function requestNotifPermission() {
    const unlock = async () => {
        document.removeEventListener('click', unlock);
        document.removeEventListener('keydown', unlock);
        document.removeEventListener('touchstart', unlock);
        initAudio();
        if (!('Notification' in window)) return;
        let perm = Notification.permission;
        if (perm === 'default') perm = await Notification.requestPermission();
        if (perm === 'granted') subscribeToPush();
    };
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock);
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

async function subscribeToPush() {
    if (!swRegistration || !('PushManager' in window)) return;
    try {
        const res = await fetch('/chat/vapid-public-key');
        const { key, enabled } = await res.json();
        if (!enabled || !key) return;

        let sub = await swRegistration.pushManager.getSubscription();
        if (!sub) {
            sub = await swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(key),
            });
        }
        await fetch('/chat/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
        });
    } catch (e) {
        console.warn('Push subscribe failed', e);
    }
}

/* ── UI bindings ────────────────────────────────────────── */
function bindUI() {
    // New DM
    document.getElementById('new-dm-btn').addEventListener('click', () => {
        document.getElementById('dm-modal').style.display = 'flex';
        setTimeout(() => document.getElementById('dm-email').focus(), 50);
    });
    document.getElementById('dm-cancel').addEventListener('click', () => {
        document.getElementById('dm-modal').style.display = 'none';
        document.getElementById('dm-error').textContent = '';
    });
    document.getElementById('dm-ok').addEventListener('click', openDM);
    document.getElementById('dm-email').addEventListener('keydown', e => {
        if (e.key === 'Enter') openDM();
    });

    // New Group
    document.getElementById('new-group-btn').addEventListener('click', () => {
        document.getElementById('group-modal').style.display = 'flex';
        setTimeout(() => document.getElementById('group-name').focus(), 50);
    });
    document.getElementById('group-cancel').addEventListener('click', () => {
        document.getElementById('group-modal').style.display = 'none';
        document.getElementById('group-error').textContent = '';
    });
    document.getElementById('group-ok').addEventListener('click', createGroup);

    // Group settings
    document.getElementById('group-settings-btn').addEventListener('click', openGroupSettings);
    document.getElementById('gset-close').addEventListener('click', () => {
        document.getElementById('gset-modal').style.display = 'none';
    });
    document.getElementById('gset-rename').addEventListener('click', renameGroup);
    document.getElementById('gset-add').addEventListener('click', addMember);
    document.getElementById('gset-add-email').addEventListener('keydown', e => {
        if (e.key === 'Enter') addMember();
    });
    document.getElementById('gset-delete').addEventListener('click', deleteGroup);
    document.getElementById('gset-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });

    // Close modals on backdrop click
    document.getElementById('dm-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
    document.getElementById('group-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });

    // Send
    document.getElementById('send-btn').addEventListener('click', sendMessage);

    // File attach
    document.getElementById('attach-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });
    document.getElementById('file-input').addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) uploadFile(file);
        e.target.value = '';  // allow re-selecting the same file
    });

    const input = document.getElementById('msg-input');
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', () => {
        autoResizeInput(input);
        onInputTyping();
    });

    // Mobile drawer (burger menu)
    document.getElementById('burger').addEventListener('click', toggleDrawer);
    document.getElementById('sidebar-backdrop').addEventListener('click', closeDrawer);

    // Open the drawer on first load if nothing is selected (mobile)
    if (window.innerWidth <= 700) openDrawer();

    // Load more
    document.getElementById('load-more-btn').addEventListener('click', async () => {
        if (!activeConvId || !oldestMsgId) return;
        const msgs = await fetchMessages(activeConvId, oldestMsgId);
        if (msgs) renderMessages(msgs, true);
    });
}

/* ── Bubble rendering (text + files) ────────────────────── */
function fillBubble(bubble, msg) {
    if (msg.has_file) {
        if (msg.file_expired) {
            const exp = document.createElement('div');
            exp.className = 'msg-file-expired';
            exp.textContent = `📎 ${msg.file_name} (expired)`;
            bubble.appendChild(exp);
        } else if ((msg.file_mime || '').startsWith('image/')) {
            const img = document.createElement('img');
            img.className = 'msg-image';
            img.src = `/chat/file/${msg.id}`;
            img.alt = msg.file_name;
            img.addEventListener('click', () => window.open(`/chat/file/${msg.id}`, '_blank'));
            bubble.appendChild(img);
        } else {
            const a = document.createElement('a');
            a.className = 'msg-file';
            a.href = `/chat/file/${msg.id}`;
            a.innerHTML = `
                <span class="msg-file-icon">📄</span>
                <span class="msg-file-info">
                    <span class="msg-file-name">${escHtml(msg.file_name)}</span>
                    <span class="msg-file-size">${formatBytes(msg.file_size)}</span>
                </span>`;
            bubble.appendChild(a);
        }
        if (msg.content) {
            const cap = document.createElement('div');
            cap.className = 'msg-caption';
            cap.textContent = msg.content;
            bubble.appendChild(cap);
        }
    } else {
        bubble.textContent = msg.content;
    }
}

function formatBytes(n) {
    if (!n) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
}

/* ── File upload ────────────────────────────────────────── */
async function uploadFile(file) {
    if (!activeConvId || !file) return;
    if (file.size > 50 * 1024 * 1024) {
        alert('File too large (max 50MB).');
        return;
    }
    const sendBtn = document.getElementById('send-btn');
    const attachBtn = document.getElementById('attach-btn');
    attachBtn.disabled = true;
    const oldLabel = sendBtn.textContent;
    sendBtn.textContent = '...';

    const fd = new FormData();
    fd.append('file', file);
    fd.append('content', document.getElementById('msg-input').value.trim());

    try {
        const res = await fetch(`/chat/${activeConvId}/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) { alert(data.error || 'Upload failed'); return; }
        document.getElementById('msg-input').value = '';
        autoResizeInput(document.getElementById('msg-input'));
        // message arrives via socket new_message
    } catch (e) {
        alert('Upload failed');
    } finally {
        attachBtn.disabled = false;
        sendBtn.textContent = oldLabel;
    }
}

/* ── Mobile drawer ──────────────────────────────────────── */
function openDrawer() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-backdrop').classList.add('open');
}
function closeDrawer() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('open');
}
function toggleDrawer() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-backdrop').classList.toggle('open');
}

/* ── Helpers ────────────────────────────────────────────── */
function scrollToBottom() {
    const el = document.getElementById('messages-scroll');
    el.scrollTop = el.scrollHeight;
}

function autoResizeInput(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
