let chats = JSON.parse(localStorage.getItem('chats')) || {};
let currentChatId = null;
let settings = JSON.parse(localStorage.getItem('settings')) || {
    apiKey: '',
    isDarkMode: false
};
let selectedImageBase64 = null;

const elements = {
    body: document.body,
    themeToggle: document.getElementById('theme-toggle'),
    sidebar: document.getElementById('sidebar'),
    toggleSidebar: document.getElementById('toggle-sidebar'),
    closeSidebar: document.getElementById('close-sidebar'),
    newChatBtnHeader: document.getElementById('new-chat-btn-top'),
    newChatBtnSidebar: document.getElementById('new-chat-btn'),
    chatHistory: document.getElementById('chat-history'),
    welcomeScreen: document.getElementById('welcome-screen'),
    chatContainer: document.getElementById('chat-container'),
    messageInput: document.getElementById('message-input'),
    dynamicSendBtn: document.getElementById('dynamic-send-btn'),
    imageUpload: document.getElementById('image-upload'),
    imagePreviewContainer: document.getElementById('image-preview-container'),
    imagePreview: document.getElementById('image-preview'),
    removeImageBtn: document.getElementById('remove-image'),
    settingsModal: document.getElementById('settings-modal'),
    userAccountBtn: document.getElementById('user-account-btn'),
    closeModal: document.querySelector('.close-modal'),
    clearDataBtn: document.getElementById('clear-data-btn'),
    searchChats: document.getElementById('search-chats'),
    userPopupMenu: document.getElementById('user-popup-menu'),
    openSettingsBtn: document.getElementById('open-settings-btn'),
    addAccountBtn: document.getElementById('add-account-btn'),
    googleLoginBtn: document.getElementById('google-login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    loggedInUserInfo: document.getElementById('logged-in-user-info'),
    displayUsername: document.getElementById('display-username'),
    mainUsername: document.getElementById('main-username'),
    mainUserAvatar: document.getElementById('main-user-avatar')
};

const getSettingsTabs = () => document.querySelectorAll('.settings-tab');
const getSettingsPanes = () => document.querySelectorAll('.settings-pane');

function init() {
    applySettings();
    updateUserUI();
    renderChatList();
    if (Object.keys(chats).length === 0 || !currentChatId) {
        showWelcomeScreen();
    } else {
        loadChat(currentChatId);
    }
}

let currentUser = JSON.parse(localStorage.getItem('zenarUser')) || null;

function applySettings() {
    if (settings.isDarkMode) {
        elements.body.classList.add('dark-mode');
    } else {
        elements.body.classList.remove('dark-mode');
    }
}

elements.themeToggle.addEventListener('click', () => {
    settings.isDarkMode = !settings.isDarkMode;
    localStorage.setItem('settings', JSON.stringify(settings));
    applySettings();
});

elements.toggleSidebar.addEventListener('click', () => {
    elements.sidebar.classList.toggle('closed');
});

elements.closeSidebar.addEventListener('click', () => {
    elements.sidebar.classList.add('closed');
});

elements.newChatBtnHeader.addEventListener('click', createNewChat);
elements.newChatBtnSidebar.addEventListener('click', createNewChat);

function createNewChat() {
    currentChatId = Date.now().toString();
    chats[currentChatId] = { title: 'دردشة جديدة', messages: [] };
    saveChats();
    renderChatList();
    showWelcomeScreen();
    elements.sidebar.classList.add('closed');
}

function saveChats() { localStorage.setItem('chats', JSON.stringify(chats)); }

function renderChatList(filter = "") {
    elements.chatHistory.innerHTML = '';
    Object.keys(chats).reverse().forEach(id => {
        const chat = chats[id];
        if (chat.title.includes(filter)) {
            const div = document.createElement('div');
            div.className = `chat-item ${id === currentChatId ? 'active' : ''}`;
            div.innerHTML = `
                <div class="chat-item-title" onclick="loadChat('${id}')">
                    <i class="far fa-comment-alt"></i> ${chat.title}
                </div>
                <div class="chat-options">
                    <i class="fas fa-trash" onclick="deleteChat('${id}', event)" title="حذف"></i>
                </div>
            `;
            elements.chatHistory.appendChild(div);
        }
    });
}

elements.searchChats.addEventListener('input', (e) => renderChatList(e.target.value));

window.loadChat = function(id) {
    currentChatId = id;
    renderChatList();
    elements.welcomeScreen.style.display = 'none';
    elements.chatContainer.style.display = 'flex';
    elements.chatContainer.innerHTML = '';
    chats[id].messages.forEach(msg => appendMessageUI(msg.role, msg.content, msg.image));
    scrollToBottom();
    elements.sidebar.classList.add('closed');
}

window.deleteChat = function(id, event) {
    event.stopPropagation();
    if(confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
        delete chats[id];
        if (currentChatId === id) { currentChatId = null; showWelcomeScreen(); }
        saveChats();
        renderChatList();
    }
}

function showWelcomeScreen() {
    elements.welcomeScreen.style.display = 'flex';
    elements.chatContainer.style.display = 'none';
    elements.chatContainer.innerHTML = '';
}

elements.imageUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImageBase64 = e.target.result;
            elements.imagePreview.src = selectedImageBase64;
            elements.imagePreviewContainer.style.display = 'block';
            updateSendButtonMode();
        };
        reader.readAsDataURL(file);
    }
});

elements.removeImageBtn.addEventListener('click', () => {
    selectedImageBase64 = null;
    elements.imagePreviewContainer.style.display = 'none';
    elements.imageUpload.value = '';
    updateSendButtonMode();
});

elements.messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    updateSendButtonMode();
});

function updateSendButtonMode() {
    const text = elements.messageInput.value.trim();
    if (text.length > 0 || selectedImageBase64) {
        elements.dynamicSendBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        elements.dynamicSendBtn.classList.remove('voice-mode');
        elements.dynamicSendBtn.classList.add('send-mode');
    } else {
        elements.dynamicSendBtn.innerHTML = '<i class="fas fa-align-center" style="transform: rotate(90deg);"></i>';
        elements.dynamicSendBtn.classList.add('voice-mode');
        elements.dynamicSendBtn.classList.remove('send-mode');
    }
}

elements.messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAction();
    }
});

elements.dynamicSendBtn.addEventListener('click', handleAction);

function handleAction() {
    if (elements.dynamicSendBtn.classList.contains('send-mode')) {
        sendMessage();
    }
}

function sendMessage() {
    const text = elements.messageInput.value.trim();
    if (!text && !selectedImageBase64) return;

    if (!currentChatId || !chats[currentChatId]) {
        currentChatId = Date.now().toString();
        chats[currentChatId] = { title: text.substring(0, 20) || "صورة مرسلة", messages: [] };
        renderChatList();
    }

    elements.welcomeScreen.style.display = 'none';
    elements.chatContainer.style.display = 'flex';

    const userMsg = { role: 'user', content: text, image: selectedImageBase64 };
    chats[currentChatId].messages.push(userMsg);
    appendMessageUI('user', text, selectedImageBase64);
    
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    if(selectedImageBase64) elements.removeImageBtn.click();
    updateSendButtonMode();
    
    if (chats[currentChatId].messages.length === 1 && text) {
        chats[currentChatId].title = text.substring(0, 20) + "...";
        renderChatList();
    }
    
    saveChats();
    scrollToBottom();
    simulateAPIResponse(text, userMsg.image);
}

function appendMessageUI(role, text, imageBase64) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    let imageHTML = imageBase64 ? `<img src="${imageBase64}" class="msg-image">` : '';
    let textHTML = text ? `<p>${text.replace(/\n/g, '<br>')}</p>` : '';
    let avatarIcon = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    div.innerHTML = `
        <div class="avatar" style="background: var(--bg-sidebar); border: 1px solid var(--border-color); display:flex; align-items:center; justify-content:center; color: var(--text-main);">
            ${avatarIcon}
        </div>
        <div class="msg-bubble">
            ${imageHTML}
            ${textHTML}
        </div>
    `;
    elements.chatContainer.appendChild(div);
}

function scrollToBottom() { elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight; }

function simulateAPIResponse(userText, hasImage) {
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message ai thinking-msg';
    thinkingDiv.innerHTML = `<div class="avatar" style="background: var(--bg-sidebar); border: 1px solid var(--border-color); display:flex; align-items:center; justify-content:center;"><i class="fas fa-robot"></i></div>
        <div class="msg-bubble" style="color: var(--text-muted);"><i class="fas fa-circle-notch fa-spin"></i> جاري التفكير...</div>`;
    elements.chatContainer.appendChild(thinkingDiv);
    scrollToBottom();

    setTimeout(() => {
        elements.chatContainer.removeChild(thinkingDiv);
        let aiResponse = "هذا الرد تم توليده لتجربة الواجهة. الواجهة الآن مطابقة للتطبيق الأصلي!";
        if (hasImage) aiResponse = "تم استلام الصورة بنجاح وتجهيز الواجهة لعرضها.";
        
        const aiMsg = { role: 'ai', content: aiResponse, image: null };
        chats[currentChatId].messages.push(aiMsg);
        saveChats();
        appendMessageUI('ai', aiResponse, null);
        scrollToBottom();
    }, 1200);
}

elements.userAccountBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.userPopupMenu.style.display = elements.userPopupMenu.style.display === 'block' ? 'none' : 'block';
});

if(elements.googleLoginBtn) {
    elements.googleLoginBtn.addEventListener('click', () => {
        elements.userPopupMenu.style.display = 'none';
        // Simulate Google Login
        currentUser = {
            name: 'مستخدم Google',
            email: 'user@gmail.com',
            picture: 'https://ui-avatars.com/api/?name=User&background=random'
        };
        localStorage.setItem('zenarUser', JSON.stringify(currentUser));
        updateUserUI();
    });
}

if(elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
        elements.userPopupMenu.style.display = 'none';
        currentUser = null;
        localStorage.removeItem('zenarUser');
        updateUserUI();
    });
}

function updateUserUI() {
    if (currentUser) {
        if (elements.loggedInUserInfo) elements.loggedInUserInfo.style.display = 'flex';
        if (elements.googleLoginBtn) elements.googleLoginBtn.style.display = 'none';
        if (elements.addAccountBtn) elements.addAccountBtn.style.display = 'flex';
        if (elements.logoutBtn) elements.logoutBtn.style.display = 'flex';
        
        if (elements.displayUsername) elements.displayUsername.textContent = currentUser.name;
        if (elements.mainUsername) elements.mainUsername.textContent = currentUser.name;
        if (elements.mainUserAvatar) elements.mainUserAvatar.src = currentUser.picture;
    } else {
        if (elements.loggedInUserInfo) elements.loggedInUserInfo.style.display = 'none';
        if (elements.googleLoginBtn) elements.googleLoginBtn.style.display = 'flex';
        if (elements.addAccountBtn) elements.addAccountBtn.style.display = 'none';
        if (elements.logoutBtn) elements.logoutBtn.style.display = 'none';
        
        if (elements.mainUsername) elements.mainUsername.textContent = 'تسجيل الدخول';
        if (elements.mainUserAvatar) elements.mainUserAvatar.src = 'https://ui-avatars.com/api/?name=Guest&background=000&color=fff';
    }
}

if(elements.openSettingsBtn) {
    elements.openSettingsBtn.addEventListener('click', () => {
        elements.userPopupMenu.style.display = 'none';
        elements.settingsModal.style.display = 'flex';
    });
}

elements.closeModal.addEventListener('click', () => elements.settingsModal.style.display = 'none');

getSettingsTabs().forEach(tab => {
    tab.addEventListener('click', () => {
        getSettingsTabs().forEach(t => t.classList.remove('active'));
        getSettingsPanes().forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.querySelector(`.settings-pane#${tab.dataset.target}`).classList.add('active');
    });
});

elements.clearDataBtn.addEventListener('click', () => {
    if(confirm('هل أنت متأكد من مسح جميع المحادثات والإعدادات؟')) { localStorage.clear(); location.reload(); }
});

window.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
        elements.settingsModal.style.display = "none";
    }
    if (elements.userPopupMenu && elements.userPopupMenu.style.display === 'block') {
        if (!elements.userAccountBtn.contains(e.target) && !elements.userPopupMenu.contains(e.target)) {
            elements.userPopupMenu.style.display = 'none';
        }
    }
});

init();
