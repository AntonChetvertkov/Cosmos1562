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
        bubble.textContent = msg.content;
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
    bubble.textContent = msg.content;
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
    if (msg.conv_id === activeConvId) {
        appendSingleMessage(msg);
        socket.emit('join_conv', { conv_id: activeConvId });
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
        // Browser notification
        if (document.hidden) {
            fireNotification(msg.sender_name || msg.sender_email, msg.content);
        }
    }

    // Update preview in sidebar
    const item = document.querySelector(`.conv-item[data-conv-id="${msg.conv_id}"]`);
    if (item) {
        const preview = item.querySelector('.conv-preview');
        if (preview) preview.textContent = msg.content.slice(0, 40);
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

/* ── Notifications ──────────────────────────────────────── */
function requestNotifPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function fireNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/static/favicon.svg' });
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

    // Close modals on backdrop click
    document.getElementById('dm-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
    document.getElementById('group-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });

    // Send
    document.getElementById('send-btn').addEventListener('click', sendMessage);
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
