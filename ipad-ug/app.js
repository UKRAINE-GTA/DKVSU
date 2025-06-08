// Firebase конфігурація
const firebaseConfig = {
    apiKey: "AIzaSyBzefxFDTHQqXFHg9t08JTiL5EaH8si1oY",
    authDomain: "dkvs-1ec88.firebaseapp.com",
    databaseURL: "https://dkvs-1ec88-default-rtdb.firebaseio.com",
    projectId: "dkvs-1ec88",
    storageBucket: "dkvs-1ec88.appspot.com",
    messagingSenderId: "167430647129",
    appId: "1:167430647129:web:ab209fec7735f20b597048"
};

// Imgur API клієнт ID
const IMGUR_CLIENT_ID = 'cc7bda6e0fd7c98';

// Ініціалізація Firebase
const firebase = window.firebase;
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Глобальні змінні
let currentUser = null;
let userRole = null;
let realTimeListeners = [];

// Ролі та їх права
const rolePermissions = {
    worker: ['dashboard', 'convoy-form', 'convoy-archive', 'blacklist', 'activities', 'staff', 'otz-register', 'otz-registered'],
    deputy: ['dashboard', 'convoy-form', 'convoy-archive', 'blacklist', 'activities', 'staff', 'otz-register', 'otz-management', 'otz-registered'],
    leader: ['dashboard', 'convoy-form', 'convoy-archive', 'blacklist', 'add-blacklist', 'activities', 'staff', 'otz-register', 'otz-management', 'otz-registered'],
    admin: ['dashboard', 'convoy-form', 'convoy-archive', 'blacklist', 'add-blacklist', 'activities', 'staff', 'otz-register', 'otz-management', 'otz-registered', 'settings']
};

const roleNames = {
    worker: 'Працівник',
    deputy: 'Заступник',
    leader: 'Лідер',
    admin: 'Адміністратор'
};

// Елементи DOM
const authScreen = document.getElementById('authScreen');
const mainInterface = document.getElementById('mainInterface');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const logoutBtn = document.getElementById('logoutBtn');

// Функція для форматування email для відображення з переносом
function formatEmailForDisplay(email) {
    const parts = email.split('@');
    if (parts.length === 2) {
        return `${parts[0]}@\n${parts[1]}`;
    }
    return email;
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkRememberedLogin();
});

function initializeApp() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            showMainInterface();
            setupRealTimeListeners();
        } else {
            currentUser = null;
            userRole = null;
            clearRealTimeListeners();
            showAuthScreen();
        }
    });

    handleResize();
    window.addEventListener('resize', handleResize);
}

function checkRememberedLogin() {
    const rememberMe = localStorage.getItem('rememberMe');
    const savedEmail = localStorage.getItem('savedEmail');
    const savedPassword = localStorage.getItem('savedPassword');

    if (rememberMe === 'true' && savedEmail && savedPassword) {
        document.getElementById('loginEmail').value = savedEmail;
        document.getElementById('loginPassword').value = savedPassword;
        document.getElementById('rememberMe').checked = true;
    }
}

function setupEventListeners() {
    // Вкладки авторизації
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });

    // Форми авторизації
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('resetForm').addEventListener('submit', handlePasswordReset);

    // Бічна панель
    sidebarToggle.addEventListener('click', toggleSidebar);

    // Навігація
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;

            if (!item.classList.contains('disabled')) {
                showView(view);

                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            }
        });
    });

    // Вихід
    logoutBtn.addEventListener('click', handleLogout);

    // Форми
    setupForms();

    // Вкладки налаштувань
    setupSettingsTabs();

    // Вкладки чорного списку
    setupBlacklistTabs();

    // Вкладки ОТЗ
    setupOtzTabs();

    // Модальні вікна
    setupModals();

    // Завантаження файлів
    setupFileUploads();
}

function setupForms() {
    // Форма конвою
    const convoyForm = document.getElementById('convoyForm');
    if (convoyForm) {
        convoyForm.addEventListener('submit', handleConvoySubmit);
    }

    // Форма чорного списку
    const blacklistForm = document.getElementById('blacklistForm');
    if (blacklistForm) {
        blacklistForm.addEventListener('submit', handleBlacklistSubmit);
    }

    // Форма ОТЗ
    const otzForm = document.getElementById('otzForm');
    if (otzForm) {
        otzForm.addEventListener('submit', handleOtzSubmit);
    }

    // Пошук
    const convoySearch = document.getElementById('convoySearch');
    if (convoySearch) {
        convoySearch.addEventListener('input', handleConvoySearch);
    }

    const blacklistSearch = document.getElementById('blacklistSearch');
    if (blacklistSearch) {
        blacklistSearch.addEventListener('input', handleBlacklistSearch);
    }

    const staffSearch = document.getElementById('staffSearch');
    if (staffSearch) {
        staffSearch.addEventListener('input', handleStaffSearch);
    }

    // Пошук для зареєстрованих ОТЗ
    const registeredOtzSearch = document.getElementById('registeredOtzSearch');
    if (registeredOtzSearch) {
        registeredOtzSearch.addEventListener('input', handleRegisteredOtzSearch);
    }
}

function setupSettingsTabs() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.settings-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-settings`).classList.add('active');
            
            loadSettingsTabData(tabName);
        });
    });
}

function setupBlacklistTabs() {
    document.querySelectorAll('.blacklist-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            document.querySelectorAll('.blacklist-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.blacklist-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-blacklist`).classList.add('active');
        });
    });
}

function setupOtzTabs() {
    document.querySelectorAll('.otz-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            document.querySelectorAll('.otz-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.otz-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-otz`).classList.add('active');
            
            // Завантажуємо дані для активної вкладки
            if (tabName === 'pending') {
                loadPendingOtz();
            } else if (tabName === 'approved') {
                loadApprovedOtz();
            }
        });
    });
}

function setupModals() {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const modalCancel = document.getElementById('modalCancel');

    modalClose.addEventListener('click', closeModal);
    modalCancel.addEventListener('click', closeModal);
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
}

function setupFileUploads() {
    // Налаштування завантаження файлів для ОТЗ
    setupFileUpload('otzTechPassport', 'techPassportPreview', false);
    setupFileUpload('otzDriverLicense', 'driverLicensePreview', false);
    setupFileUpload('otzStaffId', 'staffIdPreview', false);
    setupFileUpload('otzCarPhotos', 'carPhotosPreview', true);
}

function setupFileUpload(inputId, previewId, multiple = false) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!input || !preview) return;

    input.addEventListener('change', (e) => {
        const files = e.target.files;
        preview.innerHTML = '';

        if (files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'file-preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Preview">
                        <button type="button" class="file-preview-remove" onclick="removeFilePreview(this, '${inputId}', ${i})">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    preview.appendChild(previewItem);
                };
                reader.readAsDataURL(file);
            }
        }
    });
}

function removeFilePreview(button, inputId, index) {
    const input = document.getElementById(inputId);
    const preview = button.closest('.file-preview');
    
    button.closest('.file-preview-item').remove();
    
    // Для одиночних файлів очищуємо input
    if (!input.multiple) {
        input.value = '';
    }
}

// ПОВНІСТЮ ОНОВЛЕНА СИСТЕМА REAL-TIME СЛУХАЧІВ
function setupRealTimeListeners() {
    clearRealTimeListeners();

    // 1. Слухач для активних користувачів (viewers)
    const viewersListener = database.ref('viewers').on('value', (snapshot) => {
        const viewers = snapshot.val() || {};
        const activeViewers = Object.values(viewers).filter(viewer => {
            return Date.now() - viewer.lastActive < 5 * 60 * 1000;
        });
        
        const activeUsersElement = document.getElementById('activeUsers');
        if (activeUsersElement) {
            animateNumberChange(activeUsersElement, activeViewers.length);
        }
    });
    realTimeListeners.push(() => database.ref('viewers').off('value', viewersListener));

    // 2. Слухач для конвоїв - ПОВНЕ ОНОВЛЕННЯ
    const convoysListener = database.ref('convoys').on('value', (snapshot) => {
        const convoys = snapshot.val() || {};
        const today = new Date().toDateString();
        
        // Конвої за сьогодні
        const convoysToday = Object.values(convoys).filter(convoy => {
            return new Date(convoy.timestamp).toDateString() === today;
        }).length;
        
        // Загальна кількість конвоїв
        const totalConvoys = Object.keys(convoys).length;
        
        // Оновлюємо елементи з анімацією
        const convoysTodayElement = document.getElementById('convoysToday');
        if (convoysTodayElement) {
            animateNumberChange(convoysTodayElement, convoysToday);
        }
        
        const totalConvoysElement = document.getElementById('totalConvoys');
        if (totalConvoysElement) {
            animateNumberChange(totalConvoysElement, totalConvoys);
        }
        
        // Оновлюємо архів конвоїв якщо він відкритий
        if (!document.getElementById('convoy-archive').classList.contains('hidden')) {
            updateConvoyArchiveRealTime(convoys);
        }
    });
    realTimeListeners.push(() => database.ref('convoys').off('value', convoysListener));

    // 3. Слухач для чорного списку - ПОВНЕ ОНОВЛЕННЯ
    const blacklistListener = database.ref('blacklist').on('value', (snapshot) => {
        const blacklist = snapshot.val() || {};
        
        // Підраховуємо активні записи
        const activeItems = Object.entries(blacklist).filter(([key, item]) => {
            if (Date.now() >= item.expirationTime) {
                // Видаляємо прострочені записи
                database.ref('blacklist').child(key).remove();
                return false;
            }
            return true;
        });
        
        const activeCount = activeItems.length;
        
        // Оновлюємо лічильник
        const blacklistCountElement = document.getElementById('blacklistCount');
        if (blacklistCountElement) {
            animateNumberChange(blacklistCountElement, activeCount);
        }
        
        // Оновлюємо таблицю чорного списку якщо вона відкрита
        if (!document.getElementById('blacklist').classList.contains('hidden')) {
            updateBlacklistTableRealTime(blacklist);
        }
    });
    realTimeListeners.push(() => database.ref('blacklist').off('value', blacklistListener));

    // 4. Слухач для користувачів - ПОВНЕ ОНОВЛЕННЯ
    const usersListener = database.ref('users').on('value', (snapshot) => {
        const users = snapshot.val() || {};
        
        // Підраховуємо працівників
        const totalWorkers = Object.values(users).filter(user => 
            user.role === 'worker' || user.role === 'leader' || user.role === 'deputy'
        ).length;
        
        // Оновлюємо лічильник працівників
        const totalWorkersElement = document.getElementById('totalWorkers');
        if (totalWorkersElement) {
            animateNumberChange(totalWorkersElement, totalWorkers);
        }
        
        // Оновлюємо таблицю персоналу якщо вона відкрита
        if (!document.getElementById('staff').classList.contains('hidden')) {
            updateStaffTableRealTime(users);
        }
        
        // Оновлюємо налаштування якщо вони відкриті
        if (!document.getElementById('settings').classList.contains('hidden')) {
            const activeTab = document.querySelector('.settings-tab.active');
            if (activeTab) {
                updateSettingsRealTime(activeTab.dataset.tab, users);
            }
        }
    });
    realTimeListeners.push(() => database.ref('users').off('value', usersListener));

    // 5. Слухач для ОТЗ - ПОВНЕ ОНОВЛЕННЯ
    const otzListener = database.ref('otz').on('value', (snapshot) => {
        const otz = snapshot.val() || {};
        
        // Підраховуємо схвалені ОТЗ
        const approvedCount = Object.values(otz).filter(item => item.status === 'approved').length;
        const pendingCount = Object.values(otz).filter(item => item.status === 'pending').length;
        
        // Оновлюємо основний лічильник
        const otzCountElement = document.getElementById('otzCount');
        if (otzCountElement) {
            animateNumberChange(otzCountElement, approvedCount);
        }
        
        // Оновлюємо лічильники в вкладках керування ОТЗ
        const pendingCountElement = document.getElementById('pendingCount');
        if (pendingCountElement) {
            pendingCountElement.textContent = pendingCount;
        }
        
        const approvedCountElement = document.getElementById('approvedCount');
        if (approvedCountElement) {
            approvedCountElement.textContent = approvedCount;
        }
        
        // Оновлюємо сторінки ОТЗ якщо вони відкриті
        if (!document.getElementById('otz-management').classList.contains('hidden')) {
            const activeTab = document.querySelector('.otz-tab.active');
            if (activeTab) {
                updateOtzManagementRealTime(activeTab.dataset.tab, otz);
            }
        }
        
        if (!document.getElementById('otz-registered').classList.contains('hidden')) {
            updateRegisteredOtzRealTime(otz);
        }
    });
    realTimeListeners.push(() => database.ref('otz').off('value', otzListener));

    // 6. Слухач для активностей - ПОВНЕ ОНОВЛЕННЯ
    const activitiesListener = database.ref('activities').on('value', (snapshot) => {
        // Оновлюємо журнал подій якщо він відкритий
        if (!document.getElementById('activities').classList.contains('hidden')) {
            updateActivitiesRealTime(snapshot);
        }
        
        // Оновлюємо останні активності на дашборді
        if (!document.getElementById('dashboard').classList.contains('hidden')) {
            updateRecentActivitiesRealTime(snapshot);
        }
    });
    realTimeListeners.push(() => database.ref('activities').off('value', activitiesListener));
}

// ФУНКЦІЇ ДЛЯ АНІМАЦІЇ ЧИСЕЛ
function animateNumberChange(element, newValue) {
    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === newValue) return;
    
    const duration = 800; // 0.8 секунди
    const startTime = performance.now();
    
    function updateNumber(timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Використовуємо easing функцію для плавності
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const value = Math.floor(currentValue + (newValue - currentValue) * easeProgress);
        
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        } else {
            element.textContent = newValue; // Гарантуємо точне значення
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// REAL-TIME ОНОВЛЕННЯ ТАБЛИЦЬ ТА СПИСКІВ

// Оновлення архіву конвоїв в реальному часі
function updateConvoyArchiveRealTime(convoys) {
    const tableBody = document.getElementById('convoyTableBody');
    if (!tableBody) return;
    
    const convoysArray = Object.entries(convoys).map(([id, convoy]) => ({
        id,
        ...convoy
    })).sort((a, b) => b.timestamp - a.timestamp);
    
    tableBody.innerHTML = '';
    
    convoysArray.forEach(convoy => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(convoy.timestamp).toLocaleString('uk-UA')}</td>
            <td>${convoy.convoy1}</td>
            <td>${convoy.convoy2 || '—'}</td>
            <td>${convoy.prisoner1}</td>
            <td>${convoy.prisoner2 || '—'}</td>
            <td><span class="badge success">Завершено</span></td>
        `;
        tableBody.appendChild(row);
    });
    
    if (convoysArray.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Немає даних</td></tr>';
    }
}

// Оновлення таблиці чорного списку в реальному часі
function updateBlacklistTableRealTime(blacklist) {
    const tableBody = document.getElementById('blacklistTableBody');
    if (!tableBody) return;
    
    const activeItems = Object.entries(blacklist).filter(([key, item]) => {
        return Date.now() < item.expirationTime;
    }).map(([id, item]) => ({ id, ...item }));
    
    tableBody.innerHTML = '';
    
    activeItems.forEach(item => {
        const timeLeft = item.expirationTime - Date.now();
        const timeString = formatTimeLeft(timeLeft);
        const canManageBlacklist = ['deputy', 'leader', 'admin'].includes(userRole);
        
        const row = document.createElement('tr');
        let actionsCell = '';
        
        if (canManageBlacklist) {
            actionsCell = `
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn action-btn btn-secondary" onclick="showBlacklistDetails('${item.id}')" title="Переглянути деталі">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn action-btn btn-danger" onclick="confirmRemoveFromBlacklist('${item.id}')" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
        } else {
            actionsCell = `
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn action-btn btn-secondary" onclick="showBlacklistDetails('${item.id}')" title="Переглянути деталі">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            `;
        }
        
        row.innerHTML = `
            <td>${item.playerId}</td>
            <td>${item.nickname}</td>
            <td>${item.reason}</td>
            <td>${timeString}</td>
            ${actionsCell}
        `;
        tableBody.appendChild(row);
    });
    
    if (activeItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Немає активних записів</td></tr>';
    }
}

// Оновлення таблиці персоналу в реальному часі
function updateStaffTableRealTime(users) {
    const tableBody = document.getElementById('staffTableBody');
    const actionsHeader = document.getElementById('staffActionsHeader');
    if (!tableBody) return;
    
    // Приховуємо колонку дій для працівників
    if (userRole === 'worker') {
        if (actionsHeader) actionsHeader.style.display = 'none';
    } else {
        if (actionsHeader) actionsHeader.style.display = 'table-cell';
    }
    
    const usersArray = Object.entries(users).map(([id, user]) => ({ id, ...user }));
    
    tableBody.innerHTML = '';
    
    usersArray.forEach(user => {
        const isOnline = user.lastLogin && (Date.now() - user.lastLogin < 5 * 60 * 1000);
        const canDeleteUser = ['deputy', 'leader', 'admin'].includes(userRole);
        
        const row = document.createElement('tr');
        let actionsCell = '';
        
        if (userRole === 'worker') {
            actionsCell = '';
        } else if (canDeleteUser && user.id !== currentUser.uid) {
            actionsCell = `
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn action-btn btn-danger" onclick="confirmDeleteUser('${user.id}')" title="Видалити користувача">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
        } else {
            actionsCell = '<td>—</td>';
        }
        
        row.innerHTML = `
            <td>${user.name}</td>
            <td class="email-cell">${user.email}</td>
            <td><span class="badge role-${user.role}">${roleNames[user.role] || 'Працівник'}</span></td>
            <td>
                <span class="status-badge ${isOnline ? 'status-online' : 'status-offline'}">
                    <span class="status-dot"></span>
                    ${isOnline ? 'Онлайн' : 'Офлайн'}
                </span>
            </td>
            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleString('uk-UA') : 'Ніколи'}</td>
            ${actionsCell}
        `;
        tableBody.appendChild(row);
    });
    
    if (usersArray.length === 0) {
        const colspan = userRole === 'worker' ? '5' : '6';
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; color: var(--text-muted);">Немає даних</td></tr>`;
    }
}

// Оновлення керування ОТЗ в реальному часі
function updateOtzManagementRealTime(tabName, otz) {
    if (tabName === 'pending') {
        updatePendingOtzRealTime(otz);
    } else if (tabName === 'approved') {
        updateApprovedOtzRealTime(otz);
    }
}

function updatePendingOtzRealTime(otz) {
    const tableBody = document.getElementById('pendingOtzTableBody');
    if (!tableBody) return;
    
    const pendingOtz = Object.entries(otz).filter(([id, item]) => item.status === 'pending')
        .map(([id, item]) => ({ id, ...item }));
    
    tableBody.innerHTML = '';
    
    pendingOtz.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(item.submittedAt).toLocaleString('uk-UA')}</td>
            <td>${item.nickname}</td>
            <td>${item.color}</td>
            <td>${item.plates}</td>
            <td>${item.tinted ? 'Так' : 'Ні'}</td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button class="btn action-btn btn-secondary" onclick="showOtzDetails('${item.id}')" title="Переглянути деталі">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn action-btn btn-success" onclick="approveOtz('${item.id}')" title="Схвалити">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn action-btn btn-danger" onclick="rejectOtz('${item.id}')" title="Відхилити">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    if (pendingOtz.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Немає заявок на розгляді</td></tr>';
    }
}

function updateApprovedOtzRealTime(otz) {
    const tableBody = document.getElementById('approvedOtzTableBody');
    if (!tableBody) return;
    
    const approvedOtz = Object.entries(otz).filter(([id, item]) => item.status === 'approved')
        .map(([id, item]) => ({ id, ...item }));
    
    tableBody.innerHTML = '';
    
    approvedOtz.forEach(item => {
        const canManageOtz = ['deputy', 'leader', 'admin'].includes(userRole);
        
        const row = document.createElement('tr');
        let actionsCell = '';
        
        if (canManageOtz) {
            actionsCell = `
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn action-btn btn-secondary" onclick="showOtzDetails('${item.id}')" title="Переглянути деталі">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn action-btn btn-danger" onclick="deleteOtz('${item.id}')" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
        } else {
            actionsCell = `
                <td>
                    <button class="btn action-btn btn-secondary" onclick="showOtzDetails('${item.id}')" title="Переглянути деталі">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
        }
        
        row.innerHTML = `
            <td>${new Date(item.approvedAt || item.submittedAt).toLocaleString('uk-UA')}</td>
            <td>${item.nickname}</td>
            <td>${item.color}</td>
            <td>${item.plates}</td>
            <td>${item.tinted ? 'Так' : 'Ні'}</td>
            ${actionsCell}
        `;
        tableBody.appendChild(row);
    });
    
    if (approvedOtz.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Немає схвалених ОТЗ</td></tr>';
    }
}

// Оновлення зареєстрованих ОТЗ в реальному часі
function updateRegisteredOtzRealTime(otz) {
    const container = document.getElementById('otzGrid');
    if (!container) return;
    
    const registeredOtz = Object.entries(otz).filter(([id, item]) => item.status === 'approved')
        .map(([id, item]) => ({ id, ...item }));
    
    container.innerHTML = '';
    
    registeredOtz.forEach(item => {
        const otzCard = document.createElement('div');
        otzCard.className = 'otz-card';
        otzCard.dataset.nickname = item.nickname.toLowerCase();
        otzCard.dataset.plates = item.plates.toLowerCase();
        
        otzCard.innerHTML = `
            <div class="otz-card-header">
                <div class="otz-card-title">
                    <i class="fas fa-car"></i>
                    ${item.nickname}
                </div>
                <div class="otz-card-subtitle">${item.plates}</div>
            </div>
            <div class="otz-card-body">
                <div class="otz-status-badge otz-status-approved">
                    <i class="fas fa-check-circle"></i>
                    Зареєстровано
                </div>
                
                <div class="otz-info-grid">
                    <div class="otz-info-item">
                        <div class="otz-info-label">Колір</div>
                        <div class="otz-info-value">${item.color}</div>
                    </div>
                    <div class="otz-info-item">
                        <div class="otz-info-label">Тонування</div>
                        <div class="otz-info-value">${item.tinted ? 'Так' : 'Ні'}</div>
                    </div>
                    <div class="otz-info-item">
                        <div class="otz-info-label">Власник</div>
                        <div class="otz-info-value">${item.submittedByName}</div>
                    </div>
                    <div class="otz-info-item">
                        <div class="otz-info-label">Дата реєстрації</div>
                        <div class="otz-info-value">${new Date(item.approvedAt || item.submittedAt).toLocaleDateString('uk-UA')}</div>
                    </div>
                </div>

                <div class="otz-photos-preview">
                    ${item.carPhotos ? item.carPhotos.slice(0, 3).map(photo => `
                        <div class="otz-photo-thumb">
                            <img src="${photo}" alt="Фото авто" onerror="this.src='/placeholder.svg?height=50&width=50'">
                        </div>
                    `).join('') : ''}
                    ${item.carPhotos && item.carPhotos.length > 3 ? `
                        <div class="otz-photo-thumb" style="background: var(--accent-bg); display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 12px;">
                            +${item.carPhotos.length - 3}
                        </div>
                    ` : ''}
                </div>

                <div class="otz-card-actions">
                    <button class="btn btn-secondary" onclick="showOtzDetails('${item.id}')">
                        <i class="fas fa-eye"></i>
                        Деталі
                    </button>
                </div>
            </div>
        `;
        container.appendChild(otzCard);
    });
    
    if (registeredOtz.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px; grid-column: 1 / -1;">Немає зареєстрованих ОТЗ</div>';
    }
}

// Оновлення активностей в реальному часі
function updateActivitiesRealTime(snapshot) {
    const container = document.getElementById('activitiesList');
    if (!container) return;
    
    const activities = [];
    snapshot.forEach(childSnapshot => {
        activities.unshift(childSnapshot.val());
    });
    
    // Обмежуємо до останніх 50 активностей
    const limitedActivities = activities.slice(0, 50);
    
    container.innerHTML = '';
    
    limitedActivities.forEach(activity => {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        
        const iconData = getActivityIconAndColor(activity.type);
        const timeAgo = getTimeAgo(activity.timestamp);
        
        activityElement.innerHTML = `
            <div class="activity-icon ${iconData.class}">
                <i class="${iconData.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.description}</div>
                <div class="activity-time">${timeAgo} • ${activity.user}</div>
            </div>
        `;
        
        container.appendChild(activityElement);
    });
    
    if (limitedActivities.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Немає активностей</div>';
    }
}

// Оновлення останніх активностей на дашборді в реальному часі
function updateRecentActivitiesRealTime(snapshot) {
    const container = document.getElementById('recentActivities');
    if (!container) return;
    
    const activities = [];
    snapshot.forEach(childSnapshot => {
        activities.unshift(childSnapshot.val());
    });
    
    // Обмежуємо до останніх 10 активностей
    const recentActivities = activities.slice(0, 10);
    
    container.innerHTML = '';
    
    recentActivities.forEach(activity => {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        
        const iconData = getActivityIconAndColor(activity.type);
        const timeAgo = getTimeAgo(activity.timestamp);
        
        activityElement.innerHTML = `
            <div class="activity-icon ${iconData.class}">
                <i class="${iconData.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.description}</div>
                <div class="activity-time">${timeAgo} • ${activity.user}</div>
            </div>
        `;
        
        container.appendChild(activityElement);
    });
    
    if (recentActivities.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Немає активностей</div>';
    }
}

// Оновлення налаштувань в реальному часі
function updateSettingsRealTime(tabName, users) {
    switch (tabName) {
        case 'users':
            updateUsersSettingsRealTime(users);
            break;
        case 'roles':
            updateRolesSettingsRealTime(users);
            break;
        case 'system':
            updateSystemInfoRealTime(users);
            break;
    }
}

function updateUsersSettingsRealTime(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    const usersArray = Object.entries(users).map(([id, user]) => ({ id, ...user }));
    
    tableBody.innerHTML = '';
    
    usersArray.forEach(user => {
        const isOnline = user.lastLogin && (Date.now() - user.lastLogin < 5 * 60 * 1000);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td class="email-cell">${user.email}</td>
            <td><span class="badge role-${user.role}">${roleNames[user.role] || 'Працівник'}</span></td>
            <td>
                <span class="status-badge ${isOnline ? 'status-online' : 'status-offline'}">
                    <span class="status-dot"></span>
                    ${isOnline ? 'Онлайн' : 'Офлайн'}
                </span>
            </td>
            <td>
                ${user.id !== currentUser.uid ? `
                    <button class="btn btn-danger action-btn" onclick="deleteUser('${user.id}')" title="Видалити користувача">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : '—'}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateRolesSettingsRealTime(users) {
    const tableBody = document.getElementById('rolesTableBody');
    if (!tableBody) return;
    
    const usersArray = Object.entries(users).map(([id, user]) => ({ id, ...user }));
    
    tableBody.innerHTML = '';
    
    usersArray.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td class="email-cell">${user.email}</td>
            <td><span class="badge role-${user.role}">${roleNames[user.role] || 'Працівник'}</span></td>
            <td>
                <select class="role-select" onchange="changeUserRole('${user.id}', this.value)">
                    <option value="worker" ${user.role === 'worker' ? 'selected' : ''}>Працівник</option>
                    <option value="deputy" ${user.role === 'deputy' ? 'selected' : ''}>Заступник</option>
                    <option value="leader" ${user.role === 'leader' ? 'selected' : ''}>Лідер</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Адміністратор</option>
                </select>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateSystemInfoRealTime(users) {
    const totalUsers = Object.keys(users).length;
    
    // Оновлюємо системну інформацію
    const totalUsersElement = document.getElementById('totalUsers');
    if (totalUsersElement) {
        totalUsersElement.textContent = totalUsers;
    }
    
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleString('uk-UA');
    }
}

function clearRealTimeListeners() {
    realTimeListeners.forEach(cleanup => cleanup());
    realTimeListeners = [];
}

// Решта коду залишається без змін...
// [Тут йде весь інший код з попереднього файлу - авторизація, форми, модальні вікна тощо]

// Imgur API функції
async function uploadImageToImgur(file) {
    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': `Client-ID ${IMGUR_CLIENT_ID}`
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            return data.data.link;
        } else {
            throw new Error(data.data.error || 'Помилка завантаження на Imgur');
        }
    } catch (error) {
        console.error('Помилка завантаження на Imgur:', error);
        throw error;
    }
}

async function uploadMultipleImagesToImgur(files) {
    const uploadPromises = [];
    
    for (let i = 0; i < files.length; i++) {
        uploadPromises.push(uploadImageToImgur(files[i]));
    }

    try {
        const urls = await Promise.all(uploadPromises);
        return urls;
    } catch (error) {
        console.error('Помилка завантаження декількох зображень:', error);
        throw error;
    }
}

// Авторизація
function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${tabName}Form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!email || !password) {
        showNotification('Помилка', 'Заповніть всі поля', 'error');
        return;
    }

    try {
        showLoadingState(e.target.querySelector('button[type="submit"]'));

        await auth.signInWithEmailAndPassword(email, password);
        
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('savedEmail', email);
            localStorage.setItem('savedPassword', password);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('savedEmail');
            localStorage.removeItem('savedPassword');
        }

        showNotification('Успіх', 'Ви успішно увійшли в систему!', 'success');

        if (!rememberMe) {
            e.target.reset();
        }
    } catch (error) {
        console.error('Помилка входу:', error);
        let errorMessage = 'Помилка входу в систему';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Користувача з таким email не знайдено';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Невірний пароль';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Невірний формат email';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Забагато спроб входу. Спробуйте пізніше';
                break;
        }

        showNotification('Помилка', errorMessage, 'error');
    } finally {
        hideLoadingState(e.target.querySelector('button[type="submit"]'));
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
        showNotification('Помилка', 'Заповніть всі поля', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Помилка', 'Паролі не співпадають', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Помилка', 'Пароль повинен містити мінімум 6 символів', 'error');
        return;
    }

    try {
        showLoadingState(e.target.querySelector('button[type="submit"]'));

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await user.updateProfile({
            displayName: name
        });

        await database.ref('users').child(user.uid).set({
            name: name,
            email: email,
            role: 'worker',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            approved: true,
            lastLogin: firebase.database.ServerValue.TIMESTAMP
        });

        showNotification('Успіх', 'Реєстрація пройшла успішно! Ви зареєстровані як Працівник.', 'success');

        e.target.reset();
        switchAuthTab('login');
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        let errorMessage = 'Помилка реєстрації';

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Користувач з таким email вже існує';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Невірний формат email';
                break;
            case 'auth/weak-password':
                errorMessage = 'Пароль занадто слабкий';
                break;
        }

        showNotification('Помилка', errorMessage, 'error');
    } finally {
        hideLoadingState(e.target.querySelector('button[type="submit"]'));
    }
}

async function handlePasswordReset(e) {
    e.preventDefault();

    const email = document.getElementById('resetEmail').value;

    if (!email) {
        showNotification('Помилка', 'Введіть email адресу', 'error');
        return;
    }

    try {
        showLoadingState(e.target.querySelector('button[type="submit"]'));

        await auth.sendPasswordResetEmail(email);
        showNotification('Успіх', 'Лист для скидання пароля відправлено на ваш email', 'success');

        e.target.reset();
        switchAuthTab('login');
    } catch (error) {
        console.error('Помилка скидання пароля:', error);
        let errorMessage = 'Помилка скидання пароля';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Користувача з таким email не знайдено';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Невірний формат email';
                break;
        }

        showNotification('Помилка', errorMessage, 'error');
    } finally {
        hideLoadingState(e.target.querySelector('button[type="submit"]'));
    }
}

async function loadUserData() {
    try {
        const snapshot = await database.ref('users').child(currentUser.uid).once('value');
        const userData = snapshot.val();

        if (userData) {
            userRole = userData.role || 'worker';

            await database.ref('users').child(currentUser.uid).update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });

            updateUserInterface();
            updateNavigation();
        } else {
            await database.ref('users').child(currentUser.uid).set({
                name: currentUser.displayName || 'Користувач',
                email: currentUser.email,
                role: 'worker',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                approved: true,
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });

            userRole = 'worker';
            updateUserInterface();
            updateNavigation();
        }
    } catch (error) {
        console.error('Помилка завантаження даних користувача:', error);
        userRole = 'worker';
        updateUserInterface();
        updateNavigation();
    }
}

function updateUserInterface() {
    const userName = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');

    userName.textContent = currentUser.displayName || 'Користувач';
    userRoleElement.textContent = roleNames[userRole] || 'Працівник';
    userRoleElement.className = `user-role role-${userRole}`;

    const initials = (currentUser.displayName || 'У').charAt(0).toUpperCase();
    userAvatar.textContent = initials;
}

function updateNavigation() {
    const allowedViews = rolePermissions[userRole] || rolePermissions['worker'];

    document.querySelectorAll('.nav-item').forEach(item => {
        const view = item.dataset.view;
        const roles = item.dataset.roles ? item.dataset.roles.split(',') : [];

        if (roles.includes(userRole) || allowedViews.includes(view)) {
            item.classList.remove('disabled');
        } else {
            item.classList.add('disabled');
        }
    });

    const addBlacklistBtn = document.getElementById('addBlacklistBtn');
    if (addBlacklistBtn) {
        if (['deputy', 'leader', 'admin'].includes(userRole)) {
            addBlacklistBtn.style.display = 'flex';
        } else {
            addBlacklistBtn.style.display = 'none';
        }
    }

    updateTableActionsVisibility();
}

function updateTableActionsVisibility() {
    const staffActionsHeader = document.getElementById('staffActionsHeader');
    const canManageStaff = ['deputy', 'leader', 'admin'].includes(userRole);
    
    if (staffActionsHeader) {
        if (canManageStaff) {
            staffActionsHeader.style.display = 'table-cell';
        } else {
            staffActionsHeader.style.display = 'none';
        }
    }
}

function showAuthScreen() {
    authScreen.style.display = 'flex';
    mainInterface.style.display = 'none';
}

function showMainInterface() {
    authScreen.style.display = 'none';
    mainInterface.style.display = 'flex';

    // Початкове завантаження даних - тепер все буде оновлюватись автоматично через real-time listeners
    updateViewerCount();
}

async function handleLogout() {
    try {
        await auth.signOut();
        showNotification('Інформація', 'Ви вийшли з системи', 'info');
    } catch (error) {
        console.error('Помилка виходу:', error);
        showNotification('Помилка', 'Помилка виходу з системи', 'error');
    }
}

// Навігація
function showView(viewName) {
    const allowedViews = rolePermissions[userRole] || rolePermissions['worker'];
    if (!allowedViews.includes(viewName)) {
        showNotification('Помилка', 'У вас немає прав для перегляду цієї сторінки', 'error');
        return;
    }

    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });

    const targetPage = document.getElementById(viewName);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('fade-in');

        loadPageData(viewName);
    }
}

// Завантаження даних для сторінок (тепер тільки для початкового завантаження)
async function loadPageData(viewName) {
    switch (viewName) {
        case 'convoy-archive':
            // Real-time listener вже налаштований, просто завантажуємо початкові дані
            loadConvoyArchive();
            break;
        case 'blacklist':
            loadBlacklist();
            break;
        case 'activities':
            loadActivities();
            break;
        case 'staff':
            loadStaff();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'otz-management':
            loadOtzManagement();
            break;
        case 'otz-registered':
            loadRegisteredOtz();
            break;
    }
}

function loadSettingsTabData(tabName) {
    switch (tabName) {
        case 'general':
            loadGeneralSettings();
            break;
        case 'discord':
            loadDiscordSettings();
            break;
        case 'users':
            loadUsersForSettings();
            break;
        case 'roles':
            loadRolesForSettings();
            break;
        case 'system':
            loadSystemInfo();
            break;
    }
}

async function addActivity(type, description, user) {
    try {
        await database.ref('activities').push({
            type: type,
            description: description,
            user: user,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Помилка додавання активності:', error);
    }
}

// Решта функцій залишається без змін...
// [Тут йде весь інший код - Discord, форми, модальні вікна, утиліти тощо]

// Discord Webhook функції
async function getDiscordConfig() {
    try {
        const snapshot = await database.ref('config/discord').once('value');
        return snapshot.val() || {
            webhookUrl: '',
            botName: 'ДКВС Система',
            botAvatar: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/KVS_logo.svg',
            color: 3447003,
            notifyConvoys: true,
            notifyBlacklist: true
        };
    } catch (error) {
        console.error('Помилка завантаження Discord конфігурації:', error);
        return {};
    }
}

async function sendDiscordWebhook(type, data) {
    try {
        const config = await getDiscordConfig();
        
        if (!config.webhookUrl) {
            console.log('Discord webhook URL не налаштований');
            return;
        }

        if (type === 'convoy' && !config.notifyConvoys) return;
        if (type === 'blacklist' && !config.notifyBlacklist) return;

        let embed;
        
        if (type === 'convoy') {
            embed = {
                title: "🚨 Новий конвой зареєстровано",
                description: "🔐 В системі **ДКВС** зафіксовано нове переміщення засуджених.",
                color: parseInt(config.color) || 0x2F3136,
                thumbnail: {
                    url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/KVS_logo.svg"
                },
                fields: [
                    {
                        name: "👮‍♂️ Конвоїр №1",
                        value: `> \`${data.convoy1}\``,
                        inline: true
                    },
                    {
                        name: "👮‍♂️ Конвоїр №2",
                        value: data.convoy2 ? `> \`${data.convoy2}\`` : "> ❌ *Не вказано*",
                        inline: true
                    },
                    {
                        name: "🔒 В'язень №1",
                        value: `> \`${data.prisoner1}\``,
                        inline: true
                    },
                    {
                        name: "🔒 В'язень №2",
                        value: data.prisoner2 ? `> \`${data.prisoner2}\`` : "> ❌ *Не вказано*",
                        inline: true
                    },
                    {
                        name: "📆 Дата та час",
                        value: `> <t:${Math.floor(data.timestamp / 1000)}:F>`,
                        inline: false
                    },
                ],
                footer: {
                    text: "ДКВС • Система управління конвоями",
                    icon_url: config.botAvatar
                },
                timestamp: new Date(data.timestamp).toISOString()
            };
        } else if (type === 'blacklist') {
            embed = {
                title: "🚫 Додано до чорного списку",
                description: "Нову особу додано до чорного списку ДКВС",
                color: 15158332,
                fields: [
                    {
                        name: "📌 ID гравця",
                        value: `\`${data.playerId}\``,
                        inline: true
                    },
                    {
                        name: "👤 Нікнейм",
                        value: `\`${data.nickname}\``,
                        inline: true
                    },
                    {
                        name: "🏷️ Клан",
                        value: data.clan ? `\`${data.clan}\`` : "*Не вказано*",
                        inline: true
                    },
                    {
                        name: "⚠️ Причина",
                        value: `\`${data.reason}\``,
                        inline: false
                    },
                    {
                        name: "⏰ Термін",
                        value: `**${data.days} days**`,
                        inline: true
                    },
                    {
                        name: "📅 Date",
                        value: `<t:${Math.floor(data.timestamp / 1000)}:F>`,
                        inline: true
                    },
                    {
                        name: "🔗 Докази",
                        value: `[Переглянути докази](${data.evidenceUrl})`,
                        inline: false
                    },
                ],
                footer: {
                    text: "ДКВС - Система чорного списку",
                    icon_url: config.botAvatar
                },
                timestamp: new Date(data.timestamp).toISOString(),
                thumbnail: {
                    url: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png"
                }
            };
        } else if (type === 'test') {
            embed = {
                title: "✅ Тестове повідомлення",
                description: "Це тестове повідомлення для перевірки налаштувань Discord webhook",
                color: parseInt(config.color) || 3447003,
                fields: [
                    {
                        name: "🔧 Статус",
                        value: "Webhook працює коректно!",
                        inline: false
                    },
                    {
                        name: "⏰ Час тестування",
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    },
                    {
                        name: "👤 Тестував",
                        value: `**${currentUser.displayName || "Невідомо"}**`,
                        inline: true
                    }
                ],
                footer: {
                    text: "ДКВС - Тестування системи",
                    icon_url: config.botAvatar
                },
                timestamp: new Date().toISOString(),
                thumbnail: {
                    url: "https://upload.wikimedia.org/wikipedia/commons/e/e0/KVS_logo.svg"
                }
            };
        }

        const payload = {
            username: config.botName || 'ДКВС Система',
            avatar_url: config.botAvatar,
            embeds: [embed]
        };

        const response = await fetch(config.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('Discord повідомлення відправлено успішно');
            return true;
        } else {
            console.error('Помилка відправки Discord повідомлення:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Помилка відправки Discord webhook:', error);
        return false;
    }
}

async function loadDiscordSettings() {
    try {
        const config = await getDiscordConfig();
        
        document.getElementById('webhookUrl').value = config.webhookUrl || '';
        document.getElementById('webhookBotName').value = config.botName || 'ДКВС Система';
        document.getElementById('webhookBotAvatar').value = config.botAvatar || 'https://upload.wikimedia.org/wikipedia/commons/e/e0/KVS_logo.svg';
        document.getElementById('webhookColor').value = config.color || '3447003';
        document.getElementById('notifyConvoys').checked = config.notifyConvoys !== false;
        document.getElementById('notifyBlacklist').checked = config.notifyBlacklist !== false;
    } catch (error) {
        console.error('Помилка завантаження Discord налаштувань:', error);
    }
}

async function saveDiscordSettings() {
    if (userRole !== 'admin') {
        showNotification('Помилка', 'У вас немає прав для збереження налаштувань', 'error');
        return;
    }

    const webhookUrl = document.getElementById('webhookUrl').value;
    const botName = document.getElementById('webhookBotName').value;
    const botAvatar = document.getElementById('webhookBotAvatar').value;
    const color = document.getElementById('webhookColor').value;
    const notifyConvoys = document.getElementById('notifyConvoys').checked;
    const notifyBlacklist = document.getElementById('notifyBlacklist').checked;

    try {
        const discordConfig = {
            webhookUrl,
            botName,
            botAvatar,
            color: parseInt(color),
            notifyConvoys,
            notifyBlacklist
        };

        await database.ref('config/discord').set(discordConfig);
        await addActivity('system', 'Оновлено налаштування Discord webhook', currentUser.displayName);
        showNotification('Успіх', 'Налаштування Discord збережено', 'success');
    } catch (error) {
        console.error('Помилка збереження Discord налаштувань:', error);
        showNotification('Помилка', 'Не вдалося зберегти налаштування Discord', 'error');
    }
}

async function testWebhook() {
    if (userRole !== 'admin') {
        showNotification('Помилка', 'У вас немає прав для тестування webhook', 'error');
        return;
    }

    try {
        const success = await sendDiscordWebhook('test', {});
        
        if (success) {
            showNotification('Успіх', 'Тестове повідомлення відправлено успішно!', 'success');
        } else {
            showNotification('Помилка', 'Не вдалося відправити тестове повідомлення', 'error');
        }
    } catch (error) {
        console.error('Помилка тестування webhook:', error);
        showNotification('Помилка', 'Помилка тестування webhook', 'error');
    }
}

// Обробка форм
async function handleConvoySubmit(e) {
    e.preventDefault();

    const formData = {
        convoy1: document.getElementById('convoy1').value,
        convoy2: document.getElementById('convoy2').value,
        prisoner1: document.getElementById('prisoner1').value,
        prisoner2: document.getElementById('prisoner2').value,
        timestamp: Date.now(),
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName
    };

    if (!formData.convoy1 || !formData.prisoner1) {
        showNotification('Помилка', 'Заповніть обов\'язкові поля', 'error');
        return;
    }

    try {
        showLoadingState(e.target.querySelector('button[type="submit"]'));

        const convoyRef = database.ref('convoys');
        await convoyRef.push(formData);

        const counterRef = database.ref('counter');
        const currentCount = await counterRef.once('value');
        await counterRef.set((currentCount.val() || 0) + 1);

        await addActivity('convoy', `Новий конвой: ${formData.convoy1}`, currentUser.displayName);

        await sendDiscordWebhook('convoy', formData);

        showNotification('Успіх', 'Конвой успішно зареєстровано!', 'success');

        e.target.reset();
        showView('convoy-archive');
    } catch (error) {
        console.error('Помилка реєстрації конвою:', error);
        showNotification('Помилка', 'Не вдалося зареєструвати конвой', 'error');
    } finally {
        hideLoadingState(e.target.querySelector('button[type="submit"]'));
    }
}

async function handleBlacklistSubmit(e) {
    e.preventDefault();

    const formData = {
        playerId: document.getElementById('playerId').value,
        nickname: document.getElementById('nickname').value,
        clan: document.getElementById('clan').value,
        reason: document.getElementById('reason').value,
        days: parseInt(document.getElementById('days').value),
        evidenceUrl: document.getElementById('evidenceUrl').value,
        timestamp: Date.now(),
        expirationTime: Date.now() + (parseInt(document.getElementById('days').value) * 24 * 60 * 60 * 1000),
        addedBy: currentUser.uid,
        addedByName: currentUser.displayName
    };

    if (!formData.playerId || !formData.nickname || !formData.reason || !formData.days || !formData.evidenceUrl) {
        showNotification('Помилка', 'Заповніть всі обов\'язкові поля', 'error');
        return;
    }

    try {
        showLoadingState(e.target.querySelector('button[type="submit"]'));

        const blacklistRef = database.ref('blacklist');
        await blacklistRef.push(formData);

        await addActivity('blacklist', `Додано до ЧС: ${formData.nickname} (${formData.playerId})`, currentUser.displayName);

        await sendDiscordWebhook('blacklist', formData);

        showNotification('Успіх', 'Особу додано до чорного списку!', 'success');

        e.target.reset();
        showView('blacklist');
    } catch (error) {
        console.error('Помилка додавання до чорного списку:', error);
        showNotification('Помилка', 'Не вдалося додати до чорного списку', 'error');
    } finally {
        hideLoadingState(e.target.querySelector('button[type="submit"]'));
    }
}

// Обробка форми ОТЗ з Imgur API
async function handleOtzSubmit(e) {
    e.preventDefault();

    const nickname = document.getElementById('otzNickname').value;
    const color = document.getElementById('otzColor').value;
    const tinted = document.getElementById('otzTinted').value;
    const plates = document.getElementById('otzPlates').value;

    const techPassportFile = document.getElementById('otzTechPassport').files[0];
    const driverLicenseFile = document.getElementById('otzDriverLicense').files[0];
    const staffIdFile = document.getElementById('otzStaffId').files[0];
    const carPhotosFiles = document.getElementById('otzCarPhotos').files;

    if (!nickname || !color || !tinted || !plates || !techPassportFile || !driverLicenseFile || !staffIdFile || carPhotosFiles.length === 0) {
        showNotification('Помилка', 'Заповніть всі обов\'язкові поля та завантажте всі фото', 'error');
        return;
    }

    try {
        showLoadingState(e.target.querySelector('button[type="submit"]'));
        
        // Показуємо прогрес завантаження
        showNotification('Інформація', 'Завантаження фото на Imgur...', 'info');

        // Завантажуємо файли на Imgur
        const techPassportUrl = await uploadImageToImgur(techPassportFile);
        const driverLicenseUrl = await uploadImageToImgur(driverLicenseFile);
        const staffIdUrl = await uploadImageToImgur(staffIdFile);
        
        // Завантажуємо фото автомобіля
        const carPhotoUrls = await uploadMultipleImagesToImgur(carPhotosFiles);

        // Зберігаємо дані ОТЗ в базу
        const otzData = {
            nickname,
            color,
            tinted: tinted === 'yes',
            plates,
            techPassport: techPassportUrl,
            driverLicense: driverLicenseUrl,
            staffId: staffIdUrl,
            carPhotos: carPhotoUrls,
            status: 'pending',
            submittedBy: currentUser.uid,
            submittedByName: currentUser.displayName,
            submittedAt: Date.now()
        };

        const otzRef = database.ref('otz');
        await otzRef.push(otzData);

        await addActivity('otz', `Подано заявку на реєстрацію ОТЗ: ${nickname}`, currentUser.displayName);

        showNotification('Успіх', 'Заявку на реєстрацію ОТЗ подано успішно!', 'success');

        e.target.reset();
        // Очищуємо превью
        document.getElementById('techPassportPreview').innerHTML = '';
        document.getElementById('driverLicensePreview').innerHTML = '';
        document.getElementById('staffIdPreview').innerHTML = '';
        document.getElementById('carPhotosPreview').innerHTML = '';

        showView('dashboard');
    } catch (error) {
        console.error('Помилка подачі заявки ОТЗ:', error);
        showNotification('Помилка', 'Не вдалося подати заявку на реєстрацію ОТЗ: ' + error.message, 'error');
    } finally {
        hideLoadingState(e.target.querySelector('button[type="submit"]'));
    }
}

// Завантаження списків (тепер тільки для початкового завантаження)
async function loadConvoyArchive() {
    const tableBody = document.getElementById('convoyTableBody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const snapshot = await database.ref('convoys').orderByChild('timestamp').once('value');
        updateConvoyArchiveRealTime(snapshot.val() || {});
    } catch (error) {
        console.error('Помилка завантаження архіву:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>';
    }
}

async function loadBlacklist() {
    const tableBody = document.getElementById('blacklistTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const snapshot = await database.ref('blacklist').once('value');
        updateBlacklistTableRealTime(snapshot.val() || {});
    } catch (error) {
        console.error('Помилка завантаження чорного списку:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>';
    }
}

// Функції для ОТЗ
async function loadOtzManagement() {
    // Завантажуємо дані для активної вкладки
    const activeTab = document.querySelector('.otz-tab.active');
    if (activeTab) {
        const tabName = activeTab.dataset.tab;
        if (tabName === 'pending') {
            loadPendingOtz();
        } else if (tabName === 'approved') {
            loadApprovedOtz();
        }
    } else {
        // За замовчуванням завантажуємо очікуючі
        loadPendingOtz();
    }
}

async function loadPendingOtz() {
    const tableBody = document.getElementById('pendingOtzTableBody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const snapshot = await database.ref('otz').once('value');
        updatePendingOtzRealTime(snapshot.val() || {});
    } catch (error) {
        console.error('Помилка завантаження заявок ОТЗ:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>';
    }
}

async function loadApprovedOtz() {
    const tableBody = document.getElementById('approvedOtzTableBody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const snapshot = await database.ref('otz').once('value');
        updateApprovedOtzRealTime(snapshot.val() || {});
    } catch (error) {
        console.error('Помилка завантаження схвалених ОТЗ:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>';
    }
}

async function loadRegisteredOtz() {
    const container = document.getElementById('otzGrid');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><span>Завантаження зареєстрованих ОТЗ...</span></div>';

    try {
        const snapshot = await database.ref('otz').once('value');
        updateRegisteredOtzRealTime(snapshot.val() || {});
    } catch (error) {
        console.error('Помилка завантаження зареєстрованих ОТЗ:', error);
        container.innerHTML = '<div style="text-align: center; color: var(--accent-red); padding: 40px; grid-column: 1 / -1;">Помилка завантаження</div>';
    }
}

// Функції керування ОТЗ
async function approveOtz(otzId) {
    if (!['deputy', 'leader', 'admin'].includes(userRole)) {
        showNotification('Помилка', 'У вас немає прав для схвалення ОТЗ', 'error');
        return;
    }

    const confirmed = await showModal(
        'Підтвердження схвалення',
        'Ви впевнені, що хочете схвалити цю заявку на реєстрацію ОТЗ?',
        'Схвалити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            await database.ref('otz').child(otzId).update({
                status: 'approved',
                approvedAt: Date.now(),
                approvedBy: currentUser.uid,
                approvedByName: currentUser.displayName
            });

            await addActivity('otz', 'Схвалено заявку на реєстрацію ОТЗ', currentUser.displayName);
            showNotification('Успіх', 'Заявку на ОТЗ схвалено', 'success');
        } catch (error) {
            console.error('Помилка схвалення ОТЗ:', error);
            showNotification('Помилка', 'Не вдалося схвалити заявку', 'error');
        }
    }
}

async function rejectOtz(otzId) {
    if (!['deputy', 'leader', 'admin'].includes(userRole)) {
        showNotification('Помилка', 'У вас немає прав для відхилення ОТЗ', 'error');
        return;
    }

    const confirmed = await showModal(
        'Підтвердження відхилення',
        'Ви впевнені, що хочете відхилити цю заявку на реєстрацію ОТЗ?',
        'Відхилити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            await database.ref('otz').child(otzId).remove();
            await addActivity('otz', 'Відхилено заявку на реєстрацію ОТЗ', currentUser.displayName);
            showNotification('Успіх', 'Заявку на ОТЗ відхилено', 'success');
        } catch (error) {
            console.error('Помилка відхилення ОТЗ:', error);
            showNotification('Помилка', 'Не вдалося відхилити заявку', 'error');
        }
    }
}

async function deleteOtz(otzId) {
    if (!['deputy', 'leader', 'admin'].includes(userRole)) {
        showNotification('Помилка', 'У вас немає прав для видалення ОТЗ', 'error');
        return;
    }

    const confirmed = await showModal(
        'Підтвердження видалення',
        'Ви впевнені, що хочете видалити цей зареєстрований ОТЗ?',
        'Видалити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            await database.ref('otz').child(otzId).remove();
            await addActivity('otz', 'Видалено зареєстрований ОТЗ', currentUser.displayName);
            showNotification('Успіх', 'ОТЗ видалено', 'success');
        } catch (error) {
            console.error('Помилка видалення ОТЗ:', error);
            showNotification('Помилка', 'Не вдалося видалити ОТЗ', 'error');
        }
    }
}

// Показ деталей ОТЗ
async function showOtzDetails(otzId) {
    try {
        const snapshot = await database.ref('otz').child(otzId).once('value');
        const item = snapshot.val();

        if (!item) {
            showNotification('Помилка', 'ОТЗ не знайдено', 'error');
            return;
        }

        const modal = document.getElementById('otzDetailsModal');
        const content = document.getElementById('otzDetailsContent');
        const actions = document.getElementById('otzDetailsActions');

        content.innerHTML = `
            <div class="otz-details">
                <div class="otz-details-section">
                    <div class="otz-details-title">
                        <i class="fas fa-info-circle"></i>
                        Основна інформація
                    </div>
                    <div class="otz-details-grid">
                        <div class="otz-detail-item">
                            <div class="otz-detail-label">Нікнейм</div>
                            <div class="otz-detail-value">${item.nickname}</div>
                        </div>
                        <div class="otz-detail-item">
                            <div class="otz-detail-label">Колір автомобіля</div>
                            <div class="otz-detail-value">${item.color}</div>
                        </div>
                        <div class="otz-detail-item">
                            <div class="otz-detail-label">Номерні знаки</div>
                            <div class="otz-detail-value">${item.plates}</div>
                        </div>
                        <div class="otz-detail-item">
                            <div class="otz-detail-label">Тонування</div>
                            <div class="otz-detail-value">${item.tinted ? 'Так' : 'Ні'}</div>
                        </div>
                        <div class="otz-detail-item">
                            <div class="otz-detail-label">Статус</div>
                            <div class="otz-detail-value">
                                <span class="otz-status-badge otz-status-${item.status}">
                                    ${item.status === 'pending' ? 'Очікує розгляду' : 
                                      item.status === 'approved' ? 'Схвалено' : 'Відхилено'}
                                </span>
                            </div>
                        </div>
                        <div class="otz-detail-item">
                            <div class="otz-detail-label">Подано</div>
                            <div class="otz-detail-value">${new Date(item.submittedAt).toLocaleString('uk-UA')}</div>
                        </div>
                    </div>
                </div>

                <div class="otz-details-section">
                    <div class="otz-details-title">
                        <i class="fas fa-images"></i>
                        Документи та фото
                    </div>
                    <div class="otz-photos-grid">
                        <div class="otz-photo-item" onclick="openImageInNewTab('${item.techPassport}')">
                            <img src="${item.techPassport}" alt="Технічний паспорт" onerror="this.src='/placeholder.svg?height=150&width=150'">
                            <div class="otz-photo-label">Технічний паспорт</div>
                        </div>
                        <div class="otz-photo-item" onclick="openImageInNewTab('${item.driverLicense}')">
                            <img src="${item.driverLicense}" alt="Водійське посвідчення" onerror="this.src='/placeholder.svg?height=150&width=150'">
                            <div class="otz-photo-label">Водійське посвідчення</div>
                        </div>
                        <div class="otz-photo-item" onclick="openImageInNewTab('${item.staffId}')">
                            <img src="${item.staffId}" alt="Посвідчення ДКВС" onerror="this.src='/placeholder.svg?height=150&width=150'">
                            <div class="otz-photo-label">Посвідчення ДКВС</div>
                        </div>
                        ${item.carPhotos ? item.carPhotos.map((photo, index) => `
                            <div class="otz-photo-item" onclick="openImageInNewTab('${photo}')">
                                <img src="${photo}" alt="Фото автомобіля ${index + 1}" onerror="this.src='/placeholder.svg?height=150&width=150'">
                                <div class="otz-photo-label">Фото автомобіля ${index + 1}</div>
                            </div>
                        `).join('') : ''}
                    </div>
                </div>
            </div>
        `;

        // Додаємо кнопки дій залежно від статусу та ролі
        let actionButtons = `
            <button class="btn btn-secondary" onclick="closeOtzDetails()">
                <i class="fas fa-times"></i>
                Закрити
            </button>
        `;

        if (item.status === 'pending' && ['deputy', 'leader', 'admin'].includes(userRole)) {
            actionButtons = `
                <button class="btn btn-danger" onclick="rejectOtz('${otzId}'); closeOtzDetails();">
                    <i class="fas fa-times"></i>
                    Відхилити
                </button>
                <button class="btn btn-success" onclick="approveOtz('${otzId}'); closeOtzDetails();">
                    <i class="fas fa-check"></i>
                    Схвалити
                </button>
                <button class="btn btn-secondary" onclick="closeOtzDetails()">
                    <i class="fas fa-arrow-left"></i>
                    Назад
                </button>
            `;
        } else if (item.status === 'approved' && ['deputy', 'leader', 'admin'].includes(userRole)) {
            actionButtons = `
                <button class="btn btn-danger" onclick="deleteOtz('${otzId}'); closeOtzDetails();">
                    <i class="fas fa-trash"></i>
                    Видалити
                </button>
                <button class="btn btn-secondary" onclick="closeOtzDetails()">
                    <i class="fas fa-arrow-left"></i>
                    Назад
                </button>
            `;
        }

        actions.innerHTML = actionButtons;
        modal.classList.add('active');
    } catch (error) {
        console.error('Помилка завантаження деталей ОТЗ:', error);
        showNotification('Помилка', 'Не вдалося завантажити деталі ОТЗ', 'error');
    }
}

function closeOtzDetails() {
    const modal = document.getElementById('otzDetailsModal');
    modal.classList.remove('active');
}

function openImageInNewTab(imageUrl) {
    window.open(imageUrl, '_blank');
}

async function loadStaff() {
    const tableBody = document.getElementById('staffTableBody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const snapshot = await database.ref('users').once('value');
        updateStaffTableRealTime(snapshot.val() || {});
    } catch (error) {
        console.error('Помилка завантаження персоналу:', error);
        const colspan = userRole === 'worker' ? '5' : '6';
        tableBody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>`;
    }
}

async function loadActivities() {
    const container = document.getElementById('activitiesList');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><span>Завантаження...</span></div>';

    try {
        const snapshot = await database.ref('activities').orderByChild('timestamp').limitToLast(50).once('value');
        updateActivitiesRealTime(snapshot);
    } catch (error) {
        console.error('Помилка завантаження активностей:', error);
        container.innerHTML = '<div style="text-align: center; color: var(--accent-red); padding: 40px;">Помилка завантаження</div>';
    }
}

// Пошук
function handleConvoySearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#convoyTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function handleBlacklistSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#blacklistTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function handleStaffSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#staffTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function handleRegisteredOtzSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('.otz-card');

    cards.forEach(card => {
        const nickname = card.dataset.nickname || '';
        const plates = card.dataset.plates || '';
        
        if (nickname.includes(searchTerm) || plates.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Утилітарні функції
function formatTimeLeft(milliseconds) {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days}д ${hours}г`;
    } else if (hours > 0) {
        return `${hours}г ${minutes}хв`;
    } else {
        return `${minutes}хв`;
    }
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
        return `${days} дн. тому`;
    } else if (hours > 0) {
        return `${hours} год. тому`;
    } else if (minutes > 0) {
        return `${minutes} хв. тому`;
    } else {
        return 'Щойно';
    }
}

function getActivityIconAndColor(type) {
    const iconMap = {
        convoy: {
            icon: 'fas fa-truck',
            class: 'convoy'
        },
        blacklist: {
            icon: 'fas fa-user-slash',
            class: 'blacklist'
        },
        otz: {
            icon: 'fas fa-car',
            class: 'otz'
        },
        system: {
            icon: 'fas fa-cogs',
            class: 'system'
        },
        user: {
            icon: 'fas fa-user-cog',
            class: 'user'
        }
    };
    
    return iconMap[type] || {
        icon: 'fas fa-info-circle',
        class: 'default'
    };
}

// Модальні вікна
function showModal(title, message, confirmText = 'Підтвердити', cancelText = 'Скасувати') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalOverlay');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalConfirm.innerHTML = `<i class="fas fa-check"></i> ${confirmText}`;
        modalCancel.innerHTML = `<i class="fas fa-times"></i> ${cancelText}`;

        modal.classList.add('active');

        const handleConfirm = () => {
            modal.classList.remove('active');
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('active');
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modalConfirm.removeEventListener('click', handleConfirm);
            modalCancel.removeEventListener('click', handleCancel);
        };

        modalConfirm.addEventListener('click', handleConfirm);
        modalCancel.addEventListener('click', handleCancel);
    });
}

function closeModal() {
    const modal = document.getElementById('modalOverlay');
    modal.classList.remove('active');
}

// Деталі чорного списку
async function showBlacklistDetails(itemId) {
    try {
        const snapshot = await database.ref('blacklist').child(itemId).once('value');
        const item = snapshot.val();

        if (!item) {
            showNotification('Помилка', 'Запис не знайдено', 'error');
            return;
        }

        const modal = document.getElementById('blacklistDetailsModal');
        const content = document.getElementById('blacklistDetailsContent');

        const timeLeft = item.expirationTime - Date.now();
        const timeString = formatTimeLeft(timeLeft);

        content.innerHTML = `
            <div class="blacklist-details">
                <div class="detail-item">
                    <div class="detail-label">ID гравця:</div>
                    <div class="detail-value">${item.playerId}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Нікнейм:</div>
                    <div class="detail-value">${item.nickname}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Клан:</div>
                    <div class="detail-value">${item.clan || 'Не вказано'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Причина:</div>
                    <div class="detail-value">${item.reason}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Термін:</div>
                    <div class="detail-value">${item.days} днів</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Залишилось:</div>
                    <div class="detail-value">${timeString}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Дата додавання:</div>
                    <div class="detail-value">${new Date(item.timestamp).toLocaleString('uk-UA')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Додав:</div>
                    <div class="detail-value">${item.addedByName}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Докази:</div>
                    <div class="detail-value">
                        <a href="${item.evidenceUrl}" target="_blank" class="evidence-link">
                            Переглянути докази
                        </a>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');
    } catch (error) {
        console.error('Помилка завантаження деталей:', error);
        showNotification('Помилка', 'Не вдалося завантажити деталі', 'error');
    }
}

function closeBlacklistDetails() {
    const modal = document.getElementById('blacklistDetailsModal');
    modal.classList.remove('active');
}

// Видалення з чорного списку
async function confirmRemoveFromBlacklist(itemId) {
    const confirmed = await showModal(
        'Підтвердження видалення',
        'Ви впевнені, що хочете видалити цю особу з чорного списку?',
        'Видалити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            await database.ref('blacklist').child(itemId).remove();
            await addActivity('blacklist', 'Видалено з чорного списку', currentUser.displayName);
            showNotification('Успіх', 'Особу видалено з чорного списку', 'success');
        } catch (error) {
            console.error('Помилка видалення з чорного списку:', error);
            showNotification('Помилка', 'Не вдалося видалити з чорного списку', 'error');
        }
    }
}

// Функція підтвердження видалення користувача
async function confirmDeleteUser(userId) {
    const confirmed = await showModal(
        'Підтвердження видалення',
        'Ви впевнені, що хочете видалити цього користувача? Ця дія незворотна.',
        'Видалити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            await database.ref('users').child(userId).remove();
            await addActivity('user', 'Видалено користувача', currentUser.displayName);
            showNotification('Успіх', 'Користувача видалено', 'success');
        } catch (error) {
            console.error('Помилка видалення користувача:', error);
            showNotification('Помилка', 'Не вдалося видалити користувача', 'error');
        }
    }
}

// Зміна ролі користувача (залишається тільки в налаштуваннях)
async function changeUserRole(userId, newRole) {
    if (!['deputy', 'leader', 'admin'].includes(userRole)) {
        showNotification('Помилка', 'У вас немає прав для зміни ролей', 'error');
        return;
    }

    if (userRole !== 'admin' && newRole === 'admin') {
        showNotification('Помилка', 'Тільки адміністратор може призначати адміністраторів', 'error');
        return;
    }

    try {
        await database.ref('users').child(userId).update({ role: newRole });
        await addActivity('user', `Змінено роль користувача на ${roleNames[newRole]}`, currentUser.displayName);
        showNotification('Успіх', 'Роль користувача змінено', 'success');
    } catch (error) {
        console.error('Помилка зміни ролі:', error);
        showNotification('Помилка', 'Не вдалося змінити роль користувача', 'error');
    }
}

async function loadGeneralSettings() {
    try {
        const snapshot = await database.ref('config/general').once('value');
        const config = snapshot.val() || {};
        
        // Встановлюємо значення з бази даних або за замовчуванням
        const autoDeleteValue = config.autoDelete !== undefined ? config.autoDelete : 7;
        document.getElementById('autoDelete').value = autoDeleteValue;
    } catch (error) {
        console.error('Помилка завантаження загальних налаштувань:', error);
        // Встановлюємо значення за замовчуванням при помилці
        document.getElementById('autoDelete').value = 7;
    }
}

// Налаштування
async function loadSettings() {
    if (userRole !== 'admin') {
        showNotification('Помилка', 'У вас немає прав для перегляду налаштувань', 'error');
        showView('dashboard');
        return;
    }
    await loadGeneralSettings();
    loadDiscordSettings();
}

async function loadUsersForSettings() {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const snapshot = await database.ref('users').once('value');
        updateUsersSettingsRealTime(snapshot.val() || {});
    } catch (error) {
        console.error('Помилка завантаження користувачів:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>';
    }
}

async function loadRolesForSettings() {
    const tableBody = document.getElementById('rolesTableBody');
    tableBody.innerHTML = '<tr><td colspan="4" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const snapshot = await database.ref('users').once('value');
        updateRolesSettingsRealTime(snapshot.val() || {});
    } catch (error) {
        console.error('Помилка завантаження ролей:', error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>';
    }
}

async function loadSystemInfo() {
    try {
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        updateSystemInfoRealTime(users);
        
        const viewersSnapshot = await database.ref('viewers').once('value');
        const viewers = viewersSnapshot.val() || {};
        const activeSessions = Object.values(viewers).filter(viewer => {
            return Date.now() - viewer.lastActive < 5 * 60 * 1000;
        }).length;

        document.getElementById('activeSessions').textContent = activeSessions;
    } catch (error) {
        console.error('Помилка завантаження системної інформації:', error);
    }
}

async function deleteUser(userId) {
    const confirmed = await showModal(
        'Підтвердження видалення',
        'Ви впевнені, що хочете видалити цього користувача? Ця дія незворотна.',
        'Видалити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            await database.ref('users').child(userId).remove();
            await addActivity('user', 'Видалено користувача', currentUser.displayName);
            showNotification('Успіх', 'Користувача видалено', 'success');
        } catch (error) {
            console.error('Помилка видалення користувача:', error);
            showNotification('Помилка', 'Не вдалося видалити користувача', 'error');
        }
    }
}

async function saveSettings() {
    const autoDelete = document.getElementById('autoDelete').value;

    try {
        await database.ref('config/general').set({
            autoDelete: parseInt(autoDelete)
        });

        await addActivity('system', `Оновлено загальні налаштування системи (автовидалення: ${autoDelete} днів)`, currentUser.displayName);
        
        showNotification('Успіх', 'Налаштування збережено', 'success');
    } catch (error) {
        console.error('Помилка збереження налаштувань:', error);
        showNotification('Помилка', 'Не вдалося зберегти налаштування', 'error');
    }
}

async function exportData() {
    try {
        const data = {
            convoys: (await database.ref('convoys').once('value')).val() || {},
            blacklist: (await database.ref('blacklist').once('value')).val() || {},
            activities: (await database.ref('activities').once('value')).val() || {},
            otz: (await database.ref('otz').once('value')).val() || {}
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dkvs-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('Успіх', 'Дані експортовано', 'success');
    } catch (error) {
        console.error('Помилка експорту:', error);
        showNotification('Помилка', 'Не вдалося експортувати дані', 'error');
    }
}

async function clearOldData() {
    const confirmed = await showModal(
        'Підтвердження очищення',
        'Ви впевнені, що хочете очистити старі дані? Ця дія незворотна.',
        'Очистити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

            const activitiesSnapshot = await database.ref('activities').once('value');
            const activitiesRef = database.ref('activities');

            activitiesSnapshot.forEach(childSnapshot => {
                const activity = childSnapshot.val();
                if (activity.timestamp < thirtyDaysAgo) {
                    activitiesRef.child(childSnapshot.key).remove();
                }
            });

            await addActivity('system', 'Очищено старі дані', currentUser.displayName);
            showNotification('Успіх', 'Старі дані очищено', 'success');
        } catch (error) {
            console.error('Помилка очищення даних:', error);
            showNotification('Помилка', 'Не вдалося очистити дані', 'error');
        }
    }
}

// Сповіщення
function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">${title}</div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-message">${message}</div>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Стани завантаження
function showLoadingState(button) {
    if (button) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.dataset.originalText = originalText;
        button.innerHTML = '<div class="spinner"></div> Завантаження...';
    }
}

function hideLoadingState(button) {
    if (button && button.dataset.originalText) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
    }
}

// Адаптивність
function handleResize() {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

function toggleSidebar() {
    sidebar.classList.toggle('active');
}

// Оновлення лічильника переглядачів
async function updateViewerCount() {
    if (currentUser) {
        try {
            await database.ref('viewers').child(currentUser.uid).set({
                name: currentUser.displayName || 'Користувач',
                lastActive: Date.now()
            });

            setInterval(async () => {
                if (currentUser) {
                    await database.ref('viewers').child(currentUser.uid).update({
                        lastActive: Date.now()
                    });
                }
            }, 30000);
        } catch (error) {
            console.error('Помилка оновлення лічильника:', error);
        }
    }
}

// Очищення неактивних переглядачів
setInterval(async () => {
    try {
        const snapshot = await database.ref('viewers').once('value');
        const viewers = snapshot.val() || {};
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

        Object.keys(viewers).forEach(viewerId => {
            if (viewers[viewerId].lastActive < fiveMinutesAgo) {
                database.ref('viewers').child(viewerId).remove();
            }
        });
    } catch (error) {
        console.error('Помилка очищення переглядачів:', error);
    }
}, 60000);
