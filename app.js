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
    worker: ['dashboard', 'convoy-form', 'convoy-archive', 'blacklist', 'activities', 'staff'],
    deputy: ['dashboard', 'convoy-form', 'convoy-archive', 'blacklist', 'add-blacklist', 'activities', 'staff'],
    leader: ['dashboard', 'convoy-form', 'convoy-archive', 'blacklist', 'add-blacklist', 'activities', 'staff'],
    admin: ['dashboard', 'convoy-form', 'convoy-archive', 'blacklist', 'add-blacklist', 'activities', 'staff', 'settings']
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

// Ініціалізація
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkRememberedLogin();
});

function initializeApp() {
    // Слухаємо зміни авторизації
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

    // Налаштовуємо адаптивність
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

                // Оновлюємо активний пункт
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Закриваємо бічну панель на мобільних
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

    // Модальні вікна
    setupModals();
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
}

function setupSettingsTabs() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Оновлюємо активну вкладку
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Показуємо відповідний контент
            document.querySelectorAll('.settings-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-settings`).classList.add('active');
            
            // Завантажуємо дані для вкладки
            loadSettingsTabData(tabName);
        });
    });
}

function setupBlacklistTabs() {
    document.querySelectorAll('.blacklist-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Оновлюємо активну вкладку
            document.querySelectorAll('.blacklist-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Показуємо відповідний контент
            document.querySelectorAll('.blacklist-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-blacklist`).classList.add('active');
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

function setupRealTimeListeners() {
    clearRealTimeListeners();

    // Слухач для статистики
    const statsListener = database.ref('viewers').on('value', updateActiveUsersCount);
    realTimeListeners.push(() => database.ref('viewers').off('value', statsListener));

    // Слухач для конвоїв
    const convoysListener = database.ref('convoys').on('value', updateConvoysData);
    realTimeListeners.push(() => database.ref('convoys').off('value', convoysListener));

    // Слухач для чорного списку
    const blacklistListener = database.ref('blacklist').on('value', updateBlacklistData);
    realTimeListeners.push(() => database.ref('blacklist').off('value', blacklistListener));

    // Слухач для активностей
    const activitiesListener = database.ref('activities').on('value', updateActivitiesData);
    realTimeListeners.push(() => database.ref('activities').off('value', activitiesListener));

    // Слухач для користувачів
    const usersListener = database.ref('users').on('value', updateUsersData);
    realTimeListeners.push(() => database.ref('users').off('value', usersListener));
}

function clearRealTimeListeners() {
    realTimeListeners.forEach(cleanup => cleanup());
    realTimeListeners = [];
}

// Авторизація
function switchAuthTab(tabName) {
    // Оновлюємо вкладки
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Оновлюємо форми
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
        
        // Зберігаємо дані для автовходу
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

        // Очищуємо форму
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

        // Оновлюємо профіль користувача
        await user.updateProfile({
            displayName: name
        });

        // Зберігаємо дані користувача в базі з роллю "worker"
        await database.ref('users').child(user.uid).set({
            name: name,
            email: email,
            role: 'worker', // Завжди встановлюємо роль "worker"
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            approved: true,
            lastLogin: firebase.database.ServerValue.TIMESTAMP
        });

        showNotification('Успіх', 'Реєстрація пройшла успішно! Ви зареєстровані як Працівник.', 'success');

        // Очищуємо форму
        e.target.reset();

        // Переключаємося на вхід
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

        // Очищуємо форму
        e.target.reset();

        // Переключаємося на вхід
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

            // Оновлюємо час останнього входу
            await database.ref('users').child(currentUser.uid).update({
                lastLogin: firebase.database.ServerValue.TIMESTAMP
            });

            // Оновлюємо UI
            updateUserInterface();
            updateNavigation();
        } else {
            // Якщо дані користувача не знайдені, створюємо їх
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

    // Оновлюємо аватар
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

    // Показуємо/приховуємо кнопку додавання до ЧС
    const addBlacklistBtn = document.getElementById('addBlacklistBtn');
    if (addBlacklistBtn) {
        if (['deputy', 'leader', 'admin'].includes(userRole)) {
            addBlacklistBtn.style.display = 'flex';
        } else {
            addBlacklistBtn.style.display = 'none';
        }
    }

    // Показуємо/приховуємо колонки дій в таблицях
    updateTableActionsVisibility();
}

function updateTableActionsVisibility() {
    // Персонал - показуємо дії тільки для заступників, лідерів та адмінів
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

    // Завантажуємо дані
    loadDashboardData();
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
    // Перевіряємо права доступу
    const allowedViews = rolePermissions[userRole] || rolePermissions['worker'];
    if (!allowedViews.includes(viewName)) {
        showNotification('Помилка', 'У вас немає прав для перегляду цієї сторінки', 'error');
        return;
    }

    // Приховуємо всі сторінки
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });

    // Показуємо потрібну сторінку
    const targetPage = document.getElementById(viewName);
    if (targetPage) {
        targetPage.classList.remove('hidden');
        targetPage.classList.add('fade-in');

        // Завантажуємо дані для сторінки
        loadPageData(viewName);
    }
}

// Завантаження даних
async function loadDashboardData() {
    try {
        // Статистика
        const stats = await Promise.all([
            getActiveUsers(),
            getConvoysToday(),
            getBlacklistCount(),
            getTotalConvoys()
        ]);

        document.getElementById('activeUsers').textContent = stats[0];
        document.getElementById('convoysToday').textContent = stats[1];
        document.getElementById('blacklistCount').textContent = stats[2];
        document.getElementById('totalConvoys').textContent = stats[3];

        // Останні події
        loadRecentActivities();
    } catch (error) {
        console.error('Помилка завантаження даних:', error);
        showNotification('Помилка', 'Не вдалося завантажити дані', 'error');
    }
}

async function loadPageData(viewName) {
    switch (viewName) {
        case 'convoy-archive':
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
    }
}

function loadSettingsTabData(tabName) {
    switch (tabName) {
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

// Функції для роботи з даними
async function getActiveUsers() {
    try {
        const snapshot = await database.ref('viewers').once('value');
        const viewers = snapshot.val() || {};
        const activeViewers = Object.values(viewers).filter(viewer => {
            return Date.now() - viewer.lastActive < 5 * 60 * 1000;
        });
        return activeViewers.length;
    } catch (error) {
        return 0;
    }
}

async function getConvoysToday() {
    try {
        const snapshot = await database.ref('convoys').once('value');
        const convoys = snapshot.val() || {};
        const today = new Date().toDateString();

        return Object.values(convoys).filter(convoy => {
            return new Date(convoy.timestamp).toDateString() === today;
        }).length;
    } catch (error) {
        return 0;
    }
}

async function getBlacklistCount() {
    try {
        const snapshot = await database.ref('blacklist').once('value');
        const blacklist = snapshot.val() || {};

        // Фільтруємо тільки активні записи
        const activeCount = Object.values(blacklist).filter(item => {
            return Date.now() < item.expirationTime;
        }).length;

        return activeCount;
    } catch (error) {
        return 0;
    }
}

async function getTotalConvoys() {
    try {
        const snapshot = await database.ref('counter').once('value');
        return snapshot.val() || 0;
    } catch (error) {
        return 0;
    }
}

// Real-time оновлення
function updateActiveUsersCount(snapshot) {
    const viewers = snapshot.val() || {};
    const activeViewers = Object.values(viewers).filter(viewer => {
        return Date.now() - viewer.lastActive < 5 * 60 * 1000;
    });
    
    const activeUsersElement = document.getElementById('activeUsers');
    if (activeUsersElement) {
        activeUsersElement.textContent = activeViewers.length;
    }
}

function updateConvoysData(snapshot) {
    const convoys = snapshot.val() || {};
    const today = new Date().toDateString();
    
    const convoysToday = Object.values(convoys).filter(convoy => {
        return new Date(convoy.timestamp).toDateString() === today;
    }).length;
    
    const convoysTodayElement = document.getElementById('convoysToday');
    if (convoysTodayElement) {
        convoysTodayElement.textContent = convoysToday;
    }
    
    // Оновлюємо архів конвоїв якщо він відкритий
    if (!document.getElementById('convoy-archive').classList.contains('hidden')) {
        loadConvoyArchive();
    }
}

function updateBlacklistData(snapshot) {
    const blacklist = snapshot.val() || {};
    const activeCount = Object.values(blacklist).filter(item => {
        return Date.now() < item.expirationTime;
    }).length;
    
    const blacklistCountElement = document.getElementById('blacklistCount');
    if (blacklistCountElement) {
        blacklistCountElement.textContent = activeCount;
    }
    
    // Оновлюємо чорний список якщо він відкритий
    if (!document.getElementById('blacklist').classList.contains('hidden')) {
        loadBlacklist();
    }
}

function updateActivitiesData(snapshot) {
    // Оновлюємо активності якщо вони відкриті
    if (!document.getElementById('activities').classList.contains('hidden')) {
        loadActivities();
    }
    
    // Оновлюємо останні активності на головній
    if (!document.getElementById('dashboard').classList.contains('hidden')) {
        loadRecentActivities();
    }
}

function updateUsersData(snapshot) {
    // Оновлюємо персонал якщо він відкритий
    if (!document.getElementById('staff').classList.contains('hidden')) {
        loadStaff();
    }
    
    // Оновлюємо налаштування якщо вони відкриті
    if (!document.getElementById('settings').classList.contains('hidden')) {
        const activeTab = document.querySelector('.settings-tab.active');
        if (activeTab) {
            loadSettingsTabData(activeTab.dataset.tab);
        }
    }
}

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

        // Перевіряємо чи увімкнені повідомлення для цього типу
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
                color: 15158332, // Червоний колір для блокувань
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

// Оновлюємо функцію завантаження налаштувань Discord
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

// Додаємо функцію збереження налаштувань Discord
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

// Додаємо функцію тестування webhook
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

        // Додаємо до бази даних
        const convoyRef = database.ref('convoys');
        await convoyRef.push(formData);

        // Оновлюємо лічильник
        const counterRef = database.ref('counter');
        const currentCount = await counterRef.once('value');
        await counterRef.set((currentCount.val() || 0) + 1);

        // Додаємо до журналу
        await addActivity('convoy', `Новий конвой: ${formData.convoy1}`, currentUser.displayName);

        // Відправляємо в Discord
        await sendDiscordWebhook('convoy', formData);

        showNotification('Успіх', 'Конвой успішно зареєстровано!', 'success');

        // Очищуємо форму
        e.target.reset();

        // Переходимо до архіву
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

        // Додаємо до бази даних
        const blacklistRef = database.ref('blacklist');
        await blacklistRef.push(formData);

        // Додаємо до журналу
        await addActivity('blacklist', `Додано до ЧС: ${formData.nickname} (${formData.playerId})`, currentUser.displayName);

        // Відправляємо в Discord
        await sendDiscordWebhook('blacklist', formData);

        showNotification('Успіх', 'Особу додано до чорного списку!', 'success');

        // Очищуємо форму
        e.target.reset();

        // Переходимо до списку
        showView('blacklist');
    } catch (error) {
        console.error('Помилка додавання до чорного списку:', error);
        showNotification('Помилка', 'Не вдалося додати до чорного списку', 'error');
    } finally {
        hideLoadingState(e.target.querySelector('button[type="submit"]'));
    }
}

// Завантаження списків
async function loadConvoyArchive() {
    const tableBody = document.getElementById('convoyTableBody');
    tableBody.innerHTML = '<tr><td colspan="6" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const snapshot = await database.ref('convoys').orderByChild('timestamp').once('value');
        const convoys = [];

        snapshot.forEach(childSnapshot => {
            convoys.unshift({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        tableBody.innerHTML = '';

        convoys.forEach(convoy => {
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

        if (convoys.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Немає даних</td></tr>';
        }
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
        const blacklist = [];

        snapshot.forEach(childSnapshot => {
            const data = childSnapshot.val();
            if (Date.now() < data.expirationTime) {
                blacklist.push({
                    id: childSnapshot.key,
                    ...data
                });
            } else {
                // Видаляємо прострочені записи
                database.ref('blacklist').child(childSnapshot.key).remove();
            }
        });

        tableBody.innerHTML = '';

        blacklist.forEach(item => {
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
                // Для всіх користувачів показуємо кнопку перегляду деталей
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

        if (blacklist.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Немає активних записів</td></tr>';
        }
    } catch (error) {
        console.error('Помилка завантаження чорного списку:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>';
    }
}

async function loadStaff() {
    const tableBody = document.getElementById('staffTableBody');
    const canManageStaff = ['deputy', 'leader', 'admin'].includes(userRole);
    const colSpan = canManageStaff ? 6 : 5;
    
    tableBody.innerHTML = `<tr><td colspan="${colSpan}" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>`;

    try {
        const usersSnapshot = await database.ref('users').once('value');
        const viewersSnapshot = await database.ref('viewers').once('value');
        
        const users = [];
        const viewers = viewersSnapshot.val() || {};

        usersSnapshot.forEach(childSnapshot => {
            users.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        tableBody.innerHTML = '';

        users.forEach(user => {
            const isOnline = viewers[user.id] && (Date.now() - viewers[user.id].lastActive < 5 * 60 * 1000);
            const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString('uk-UA') : 'Ніколи';

            const row = document.createElement('tr');
            let actionsCell = '';
            
            if (canManageStaff && canDeleteUser(user)) {
                actionsCell = `
                    <td>
                        <button class="btn action-btn btn-danger" onclick="confirmDeleteUser('${user.id}')" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            } else if (canManageStaff) {
                actionsCell = '<td>—</td>';
            }

            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge role-${user.role}">${roleNames[user.role] || 'Працівник'}</span></td>
                <td>
                    <span class="status-badge ${isOnline ? 'status-online' : 'status-offline'}">
                        <span class="status-dot"></span>
                        ${isOnline ? 'Онлайн' : 'Офлайн'}
                    </span>
                </td>
                <td>${lastLogin}</td>
                ${actionsCell}
            `;
            tableBody.appendChild(row);
        });

        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: var(--text-muted);">Немає персоналу</td></tr>`;
        }
    } catch (error) {
        console.error('Помилка завантаження персоналу:', error);
        tableBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>`;
    }
}

function canDeleteUser(user) {
    // Адмін може видаляти всіх крім себе
    if (userRole === 'admin' && user.id !== currentUser.uid) {
        return true;
    }
    
    // Лідер та заступник можуть видаляти тільки працівників
    if (['leader', 'deputy'].includes(userRole) && user.role === 'worker') {
        return true;
    }
    
    return false;
}

async function loadRecentActivities() {
    const container = document.getElementById('recentActivities');

    try {
        const snapshot = await database.ref('activities').orderByChild('timestamp').limitToLast(10).once('value');
        const activities = [];

        snapshot.forEach(childSnapshot => {
            activities.unshift(childSnapshot.val());
        });

        container.innerHTML = '';

        activities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';

            const iconClass = activity.type === 'convoy' ? 'fa-truck' : 'fa-user-slash';
            const iconColor = activity.type === 'convoy' ? 'var(--accent-green)' : 'var(--accent-red)';

            activityElement.innerHTML = `
                <div class="activity-icon" style="color: ${iconColor};">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${activity.userName || 'Невідомо'} • ${new Date(activity.timestamp).toLocaleString('uk-UA')}</div>
                </div>
            `;

            container.appendChild(activityElement);
        });

        if (activities.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Немає останніх подій</div>';
        }
    } catch (error) {
        console.error('Помилка завантаження активностей:', error);
        container.innerHTML = '<div style="text-align: center; color: var(--accent-red); padding: 20px;">Помилка завантаження</div>';
    }
}

async function loadActivities() {
    const container = document.getElementById('activitiesList');

    try {
        const snapshot = await database.ref('activities').orderByChild('timestamp').limitToLast(50).once('value');
        const activities = [];

        snapshot.forEach(childSnapshot => {
            activities.unshift(childSnapshot.val());
        });

        container.innerHTML = '';

        activities.forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'activity-item';

            const iconClass = activity.type === 'convoy' ? 'fa-truck' : 
                             activity.type === 'blacklist' ? 'fa-user-slash' : 'fa-cog';
            const iconColor = activity.type === 'convoy' ? 'var(--accent-green)' : 
                             activity.type === 'blacklist' ? 'var(--accent-red)' : 'var(--accent-blue)';

            activityElement.innerHTML = `
                <div class="activity-icon" style="color: ${iconColor};">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activity.description}</div>
                    <div class="activity-time">${activity.userName || 'Невідомо'} • ${new Date(activity.timestamp).toLocaleString('uk-UA')}</div>
                </div>
            `;

            container.appendChild(activityElement);
        });

        if (activities.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Немає записів у журналі</div>';
        }
    } catch (error) {
        console.error('Помилка завантаження журналу:', error);
        container.innerHTML = '<div style="text-align: center; color: var(--accent-red); padding: 40px;">Помилка завантаження</div>';
    }
}

async function loadSettings() {
    if (userRole !== 'admin') {
        showNotification('Помилка', 'У вас немає прав для перегляду налаштувань', 'error');
        return;
    }

    // Завантажуємо налаштування
    try {
        const configSnapshot = await database.ref('config').once('value');
        const config = configSnapshot.val() || {};

        document.getElementById('autoDelete').value = config.autoDelete || '7';
    } catch (error) {
        console.error('Помилка завантаження налаштувань:', error);
    }

    // Завантажуємо дані для активної вкладки
    const activeTab = document.querySelector('.settings-tab.active');
    if (activeTab) {
        loadSettingsTabData(activeTab.dataset.tab);
    }
}

async function loadUsersForSettings() {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" class="loading-cell"><div class="loading"><div class="spinner"></div><span>Завантаження...</span></div></td></tr>';

    try {
        const usersSnapshot = await database.ref('users').once('value');
        const viewersSnapshot = await database.ref('viewers').once('value');
        
        const users = [];
        const viewers = viewersSnapshot.val() || {};

        usersSnapshot.forEach(childSnapshot => {
            users.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        tableBody.innerHTML = '';

        users.forEach(user => {
            const isOnline = viewers[user.id] && (Date.now() - viewers[user.id].lastActive < 5 * 60 * 1000);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge role-${user.role}">${roleNames[user.role] || 'Працівник'}</span></td>
                <td>
                    <span class="status-badge ${isOnline ? 'status-online' : 'status-offline'}">
                        <span class="status-dot"></span>
                        ${isOnline ? 'Онлайн' : 'Офлайн'}
                    </span>
                </td>
                <td>
                    ${user.id !== currentUser.uid ? 
                        `<button class="btn action-btn btn-danger" onclick="confirmDeleteUser('${user.id}')" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>` : '—'
                    }
                </td>
            `;
            tableBody.appendChild(row);
        });

        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Немає користувачів</td></tr>';
        }
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
        const users = [];

        snapshot.forEach(childSnapshot => {
            users.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });

        tableBody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge role-${user.role}">${roleNames[user.role] || 'Працівник'}</span></td>
                <td>
                    <select class="form-input role-select" onchange="updateUserRole('${user.id}', this.value)">
                        <option value="worker" ${user.role === 'worker' ? 'selected' : ''}>Працівник</option>
                        <option value="deputy" ${user.role === 'deputy' ? 'selected' : ''}>Заступник</option>
                        <option value="leader" ${user.role === 'leader' ? 'selected' : ''}>Лідер</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Адмін</option>
                    </select>
                </td>
            `;
            tableBody.appendChild(row);
        });

        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Немає користувачів</td></tr>';
        }
    } catch (error) {
        console.error('Помилка завантаження користувачів:', error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--accent-red);">Помилка завантаження</td></tr>';
    }
}

async function loadSystemInfo() {
    try {
        const usersSnapshot = await database.ref('users').once('value');
        const viewersSnapshot = await database.ref('viewers').once('value');
        
        const totalUsers = Object.keys(usersSnapshot.val() || {}).length;
        const viewers = viewersSnapshot.val() || {};
        const activeSessions = Object.values(viewers).filter(viewer => {
            return Date.now() - viewer.lastActive < 5 * 60 * 1000;
        }).length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('activeSessions').textContent = activeSessions;
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('uk-UA');
    } catch (error) {
        console.error('Помилка завантаження системної інформації:', error);
    }
}

// Допоміжні функції
function formatTimeLeft(timeLeft) {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        if (hours > 0) {
            return `${days} д. ${hours} год.`;
        }
        return `${days} д.`;
    }
    
    if (hours > 0) {
        if (minutes > 0) {
            return `${hours} год. ${minutes} хв.`;
        }
        return `${hours} год.`;
    }
    
    return `${minutes} хв.`;
}

function showLoadingState(button) {
    if (button) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="spinner" style="margin-right: 8px;"></div>Завантаження...';
        button.dataset.originalText = originalText;
    }
}

function hideLoadingState(button) {
    if (button && button.dataset.originalText) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
    }
}

function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    notification.innerHTML = `
        <div class="notification-header">
            <div class="notification-title">${title}</div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-message">${message}</div>
    `;

    container.appendChild(notification);

    // Автоматичне видалення через 5 секунд
    setTimeout(() => {
        notification.remove();
    }, 5000);

    // Видалення по кліку
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

async function addActivity(type, description, userName) {
    try {
        const activityRef = database.ref('activities');
        await activityRef.push({
            type,
            description,
            userName: userName || 'Невідомо',
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Помилка додавання активності:', error);
    }
}

function updateViewerCount() {
    if (!currentUser) return;

    const viewersRef = database.ref('viewers');
    const userId = currentUser.uid;

    // Оновлюємо час активності
    viewersRef.child(userId).set({
        lastActive: firebase.database.ServerValue.TIMESTAMP,
        name: currentUser.displayName
    });

    // Оновлюємо кожну хвилину
    setInterval(() => {
        viewersRef.child(userId).update({
            lastActive: firebase.database.ServerValue.TIMESTAMP
        });
    }, 60000);
}

function handleResize() {
    const isMobile = window.innerWidth <= 768;
    sidebarToggle.style.display = isMobile ? 'block' : 'none';

    if (!isMobile) {
        sidebar.classList.remove('active');
    }
}

function toggleSidebar() {
    sidebar.classList.toggle('active');
}

// Пошук
function handleConvoySearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#convoyTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function handleBlacklistSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#blacklistTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function handleStaffSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#staffTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Кастомні модальні вікна
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
            modalConfirm.removeEventListener('click', handleConfirm);
            modalCancel.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            modal.classList.remove('active');
            modalConfirm.removeEventListener('click', handleConfirm);
            modalCancel.removeEventListener('click', handleCancel);
            resolve(false);
        };

        modalConfirm.addEventListener('click', handleConfirm);
        modalCancel.addEventListener('click', handleCancel);
    });
}

function closeModal() {
    const modal = document.getElementById('modalOverlay');
    modal.classList.remove('active');
}

// Деталі чорного списку - ПРОСТИЙ КОМПАКТНИЙ ДИЗАЙН
async function showBlacklistDetails(itemId) {
    try {
        const snapshot = await database.ref('blacklist').child(itemId).once('value');
        const item = snapshot.val();

        if (!item) {
            showNotification('Помилка', 'Запис не знайдено', 'error');
            return;
        }

        const timeLeft = item.expirationTime - Date.now();
        const timeString = formatTimeLeft(timeLeft);

        const modal = document.getElementById('blacklistDetailsModal');
        const content = document.getElementById('blacklistDetailsContent');

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
                    <div class="detail-label">Додав:</div>
                    <div class="detail-value">${item.addedByName || 'Невідомо'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Дата:</div>
                    <div class="detail-value">${new Date(item.timestamp).toLocaleString('uk-UA')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Докази:</div>
                    <div class="detail-value">
                        <a href="${item.evidenceUrl}" target="_blank" class="evidence-link">
                            Переглянути
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

// Функції для дій з таблицями
async function confirmRemoveFromBlacklist(itemId) {
    if (!['deputy', 'leader', 'admin'].includes(userRole)) {
        showNotification('Помилка', 'У вас немає прав для видалення записів', 'error');
        return;
    }

    const confirmed = await showModal(
        'Підтвердження видалення',
        'Ви впевнені, що хочете видалити цей запис з чорного списку?',
        'Видалити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            await database.ref('blacklist').child(itemId).remove();
            await addActivity('blacklist', 'Видалено запис з чорного списку', currentUser.displayName);
            showNotification('Успіх', 'Запис видалено з чорного списку', 'success');
        } catch (error) {
            console.error('Помилка видалення:', error);
            showNotification('Помилка', 'Не вдалося видалити запис', 'error');
        }
    }
}

async function updateUserRole(userId, newRole) {
    if (userRole !== 'admin') {
        showNotification('Помилка', 'У вас немає прав для зміни ролей', 'error');
        return;
    }

    try {
        await database.ref('users').child(userId).update({
            role: newRole,
            approved: true
        });

        await addActivity('system', `Змінено роль користувача на ${roleNames[newRole]}`, currentUser.displayName);
        showNotification('Успіх', 'Роль користувача оновлено', 'success');
    } catch (error) {
        console.error('Помилка оновлення ролі:', error);
        showNotification('Помилка', 'Не вдалося оновити роль', 'error');
    }
}

async function confirmDeleteUser(userId) {
    if (userId === currentUser.uid) {
        showNotification('Помилка', 'Ви не можете видалити свій власний акаунт', 'error');
        return;
    }

    // Перевіряємо права
    const userSnapshot = await database.ref('users').child(userId).once('value');
    const targetUser = userSnapshot.val();
    
    if (!canDeleteUser(targetUser)) {
        showNotification('Помилка', 'У вас немає прав для видалення цього користувача', 'error');
        return;
    }

    const confirmed = await showModal(
        'Підтвердження видалення',
        'Ви впевнені, що хочете видалити цього користувача?',
        'Видалити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            await database.ref('users').child(userId).remove();
            await addActivity('system', 'Видалено користувача', currentUser.displayName);
            showNotification('Успіх', 'Користувача видалено', 'success');
        } catch (error) {
            console.error('Помилка видалення користувача:', error);
            showNotification('Помилка', 'Не вдалося видалити користувача', 'error');
        }
    }
}

async function saveSettings() {
    if (userRole !== 'admin') {
        showNotification('Помилка', 'У вас немає прав для збереження налаштувань', 'error');
        return;
    }

    const autoDelete = document.getElementById('autoDelete').value;

    try {
        const updates = {};
        updates.autoDelete = autoDelete;

        await database.ref('config').update(updates);
        await addActivity('system', 'Оновлено налаштування системи', currentUser.displayName);
        showNotification('Успіх', 'Налаштування збережено', 'success');
    } catch (error) {
        console.error('Помилка збереження налаштувань:', error);
        showNotification('Помилка', 'Не вдалося зберегти налаштування', 'error');
    }
}

async function exportData() {
    showNotification('Інформація', 'Функція експорту буде доступна в наступній версії', 'info');
}

async function clearOldData() {
    const confirmed = await showModal(
        'Підтвердження очищення',
        'Ви впевнені, що хочете очистити старі дані? Ця дія незворотна!',
        'Очистити',
        'Скасувати'
    );

    if (confirmed) {
        try {
            const configSnapshot = await database.ref('config/autoDelete').once('value');
            const autoDeleteDays = configSnapshot.val() || 7;

            if (autoDeleteDays > 0) {
                const cutoffTime = Date.now() - (autoDeleteDays * 24 * 60 * 60 * 1000);

                // Видаляємо старі активності
                const activitiesSnapshot = await database.ref('activities')
                    .orderByChild('timestamp')
                    .endAt(cutoffTime)
                    .once('value');
                
                const deletePromises = [];
                activitiesSnapshot.forEach(childSnapshot => {
                    deletePromises.push(database.ref('activities').child(childSnapshot.key).remove());
                });

                await Promise.all(deletePromises);
                
                await addActivity('system', 'Очищено старі дані системи', currentUser.displayName);
                showNotification('Успіх', 'Старі дані успішно очищено', 'success');
            } else {
                showNotification('Інформація', 'Автоматичне видалення вимкнено', 'info');
            }
        } catch (error) {
            console.error('Помилка очищення даних:', error);
            showNotification('Помилка', 'Не вдалося очистити дані', 'error');
        }
    }
}

// Автоматичне оновлення часу в чорному списку
setInterval(() => {
    const timeElements = document.querySelectorAll('#blacklistTableBody tr');
    timeElements.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
            // Тут можна оновити час, якщо потрібно
        }
    });
}, 60000);

// Очищення старих записів
setInterval(async () => {
    try {
        const configSnapshot = await database.ref('config/autoDelete').once('value');
        const autoDeleteDays = configSnapshot.val() || 7;

        if (autoDeleteDays > 0) {
            const cutoffTime = Date.now() - (autoDeleteDays * 24 * 60 * 60 * 1000);

            // Видаляємо старі активності
            const activitiesSnapshot = await database.ref('activities')
                .orderByChild('timestamp')
                .endAt(cutoffTime)
                .once('value');
            activitiesSnapshot.forEach(childSnapshot => {
                database.ref('activities').child(childSnapshot.key).remove();
            });
        }
    } catch (error) {
        console.error('Помилка очищення старих записів:', error);
    }
}, 24 * 60 * 60 * 1000); // Раз на день
