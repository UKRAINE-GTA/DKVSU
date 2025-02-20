 // Initialize Firebase
        const firebaseConfig = {
                apiKey: "AIzaSyBzefxFDTHQqXFHg9t08JTiL5EaH8si1oY",
    authDomain: "dkvs-1ec88.firebaseapp.com",
    databaseURL: "https://dkvs-1ec88-default-rtdb.firebaseio.com",
    projectId: "dkvs-1ec88",
    storageBucket: "dkvs-1ec88.appspot.com",
    messagingSenderId: "167430647129",
    appId: "1:167430647129:web:ab209fec7735f20b597048",
    measurementId: "G-H6LKMLYD10"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        const authScreen = document.getElementById('authScreen');
        const mainInterface = document.getElementById('mainInterface');
        const fingerprintAuth = document.getElementById('fingerprintAuth');
        const loginModal = document.getElementById('loginModal');
        const modalOverlay = document.getElementById('modalOverlay');
        const loginForm = document.getElementById('loginForm');
        const addToBlacklistForm = document.getElementById('addToBlacklistForm');
        const convoyForm = document.getElementById('convoyForm');
        const blacklistTableBody = document.getElementById('blacklistTable').getElementsByTagName('tbody')[0];
        const convoyArchiveTableBody = document.getElementById('convoyArchiveTable').getElementsByTagName('tbody')[0];
        const blacklistSearchInput = document.getElementById('blacklistSearchInput');
        const convoySearchInput = document.getElementById('convoySearchInput');
        const navItems = document.querySelectorAll('.nav-item');
        const logoutBtn = document.getElementById('logoutBtn');
        const closeLoginModal = document.getElementById('closeLoginModal');
        const sidebar = document.getElementById('sidebar');
        const activitiesList = document.getElementById('activitiesList');
        const menuToggle = document.getElementById('menuToggle');
        const adminForm = document.getElementById('adminForm');
        const logTypeFilter = document.getElementById('logTypeFilter');
        const logDateFilter = document.getElementById('logDateFilter');

        function showSmsNotification(title, message, actions = []) {
            const smsContainer = document.querySelector('.sms-container');
            if (!smsContainer) {
                const container = document.createElement('div');
                container.className = 'sms-container';
                document.querySelector('.tablet').appendChild(container);
            }

            const notification = document.createElement('div');
            notification.className = 'sms-notification';
            notification.innerHTML = `
                <div class="sms-header">
                    <span class="sms-title">${title}</span>
                    <span class="sms-close">&times;</span>
                </div>
                <div class="sms-content">${message}</div>
                <div class="sms-actions"></div>
            `;

            const actionsContainer = notification.querySelector('.sms-actions');
            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = 'sms-action';
                button.textContent = action.text;
                button.onclick = action.onClick;
                actionsContainer.appendChild(button);
            });

            smsContainer.appendChild(notification);
            setTimeout(() => notification.classList.add('show'), 100);

            const closeBtn = notification.querySelector('.sms-close');
            closeBtn.onclick = () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            };

            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 5000);

            // Видаляємо старі повідомлення, якщо їх більше 3
            const notifications = smsContainer.querySelectorAll('.sms-notification');
            if (notifications.length > 3) {
                notifications[0].remove();
            }
        }

        function showView(viewName) {
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            document.getElementById(viewName).classList.add('active');

            // Оновлюємо активну вкладку в навігації
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.view === viewName);
            });

            if ((viewName === 'add-blacklist' || viewName === 'admin-panel' || viewName === 'logs') && !isAuthenticated()) {
                showLoginModal(viewName);
            } else if (viewName === 'logs') {
                fetchLogs();
            }
        }

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                showView(item.dataset.view);
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
            });
        });

        fingerprintAuth.addEventListener('click', () => {
            authScreen.style.display = 'none';
            mainInterface.style.display = 'grid';
            fetchBlacklistData();
            fetchConvoyData();
            updateStats();
            fetchRecentActivities();
            updateViewerCount();
        });

        function showLoginModal(targetView) {
            loginModal.style.display = 'block';
            modalOverlay.style.display = 'block';
            loginForm.dataset.targetView = targetView;
        }

        function hideLoginModal() {
            loginModal.style.display = 'none';
            modalOverlay.style.display = 'none';
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            const targetView = e.target.dataset.targetView;

            if (username === 'dkvs' && password === 'DKVS33') {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('authExpiration', Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                localStorage.setItem('userRole', 'admin');
                hideLoginModal();
                showView(targetView || 'main');
                updateUIForRole('admin');
                showSmsNotification('Успіх', 'Ви успішно увійшли в систему!');
                await addLog('auth', 'Успішна авторизація адміністратора');
            } else {
                showSmsNotification('Помилка', 'Невірний логін або пароль', [
                    {
                        text: 'Спробувати ще раз',
                        onClick: () => {
                            document.getElementById('loginUsername').value = '';
                            document.getElementById('loginPassword').value = '';
                            document.getElementById('loginUsername').focus();
                        }
                    }
                ]);
                await addLog('auth', 'Невдала спроба авторизації');
            }
        });

        closeLoginModal.addEventListener('click', () => {
            hideLoginModal();
            showView('main');
        });

        logoutBtn.addEventListener('click', async () => {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('authExpiration');
            localStorage.removeItem('userRole');
            authScreen.style.display = 'flex';
            mainInterface.style.display = 'none';
            showSmsNotification('Вихід', 'Ви вийшли з системи');
            removeUserFromViewerCount();
            await addLog('auth', 'Вихід з системи');
        });

        addToBlacklistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const playerId = document.getElementById('playerId').value;
            const nickname = document.getElementById('nickname').value;
            const clan = document.getElementById('clan').value;
            const reason = document.getElementById('reason').value;
            const days = document.getElementById('days').value;
            const addedBy = document.getElementById('addedBy').value;
            const urlblack = document.getElementById('urlblack').value;

            await addToBlacklist(playerId, nickname, clan, reason, days, addedBy, urlblack);
            addToBlacklistForm.reset();
            showSmsNotification('Успіх', 'Запис успішно додано до чорного списку!');
        });

        convoyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const convoy1 = document.getElementById('convoy1').value;
            const convoy2 = document.getElementById('convoy2').value;
            const prisoner1 = document.getElementById('prisoner1').value;
            const prisoner2 = document.getElementById('prisoner2').value;

            await addConvoy(convoy1, convoy2, prisoner1, prisoner2);
            convoyForm.reset();
            showSmsNotification('Успіх', 'Конвой успішно зареєстровано!');
        });

        async function addToBlacklist(playerId, nickname, clan, reason, days, addedBy, urlblack) {
            const blacklistRef = database.ref("blacklist");
            const newBlacklistRef = blacklistRef.push();

            const expirationTime = Date.now() + days * 24 * 60 * 60 * 1000;

            await newBlacklistRef.set({
                playerId,
                nickname,
                clan,
                reason,
                days,
                addedBy,
                urlblack,
                createdAt: Date.now(),
                expirationTime,
            });

          await addActivity('blacklist', `Додано до ЧС: ${nickname} ${playerId} : ${reason}`);
await addLog(
    'blacklist',
    `${addedBy} додав ${nickname} : ${playerId} до ЧС на ${days} днів. Причина: ${reason} <br><br> Докази: <span style="display:block;color:blue;"> <a href="${urlblack}" target="_blank" style="color:blue;text-decoration:underline;">${urlblack}</a></span>`
);
fetchBlacklistData();

        }

        async function addConvoy(convoy1, convoy2, prisoner1, prisoner2) {
            const convoyRef = database.ref("convoys");
            const newConvoyRef = convoyRef.push();

            await newConvoyRef.set({
                convoy1,
                convoy2,
                prisoner1,
                prisoner2,
                timestamp: Date.now()
            });

            const counterRef = database.ref('counter');
            const currentCount = (await counterRef.once('value')).val() || 0;
            await counterRef.set(currentCount + 1);

            await sendToDiscord({ convoy1, convoy2, prisoner1, prisoner2 });

            await addActivity('convoy', `Новий конвой: ${convoy1}`);
            await addLog('convoy', `Зареєстровано новий конвой. Конвоїр 1: ${convoy1}, Конвоїр 2: ${convoy2 || 'Відсутній'}, В'язень 1: ${prisoner1}, В'язень 2: ${prisoner2 || 'Відсутній'}`);
            fetchConvoyData();
            updateStats();
        }

        async function addActivity(type, description) {
            const activityRef = database.ref("activities");
            const newActivityRef = activityRef.push();
            await newActivityRef.set({
                type,
                description,
                timestamp: Date.now()
            });
        }

        async function addLog(type, description) {
            const logsRef = database.ref("logs");
            const newLogRef = logsRef.push();
            await newLogRef.set({
                type,
                description,
                timestamp: Date.now()
            });
        }

        async function fetchRecentActivities() {
            const activitiesRef = database.ref("activities").orderByChild("timestamp").limitToLast(10);
            activitiesRef.on('value', (snapshot) => {
                const activities = [];
                snapshot.forEach((childSnapshot) => {
                    activities.unshift({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                renderActivities(activities);
            });
        }

        function renderActivities(activities) {
            activitiesList.innerHTML = '';
            activities.forEach(activity => {
                const li = document.createElement('li');
                li.className = `activity-item ${activity.type}`;
                li.innerHTML = `
                    <span class="activity-icon">
                        <i class="fas fa-${activity.type === 'convoy' ? 'truck' : 'user-slash'}"></i>
                    </span>
                    <div class="activity-details">
                        <p>${activity.description}</p>
                        <p class="activity-time">${new Date(activity.timestamp).toLocaleString('uk-UA')}</p>
                    </div>
                `;
                activitiesList.appendChild(li);
            });
        }

       async function getWebhookUrl() {
    const webhookRef = database.ref("config1/webhookUrl");
    const snapshot = await webhookRef.once("value");
    return snapshot.val();
}

async function sendToDiscord(data) {
    try {
        const webhookUrl = await getWebhookUrl();
        if (!webhookUrl) {
            console.error("Помилка: URL вебхука не знайдено у базі даних.");
            return;
        }

        const embed = {
            "username": "UKRAINE GTA | 02",  // Назва бота
            "avatar_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/KVS_logo.svg/1200px-KVS_logo.svg.png",  // Аватар бота
            "embeds": [
                {
                    "title": "🔔 **Новий конвой створено!**",
                    "color": 3447003, // Синій колір для заголовку
                    "fields": [
                        {
                            "name": "🚔 **Конвоїри**",
                            "value": `**Конвоїр #1**: ${data.convoy1}\n**Конвоїр #2**: ${data.convoy2 || "none"}`,
                            "inline": true
                        },
                        {
                            "name": "🔗 **В'язні**",
                            "value": `**В'язень #1**: ${data.prisoner1}\n**В'язень #2**: ${data.prisoner2 || "none"}`,
                            "inline": true
                        },
                        {
                            "name": "📅 **Дата конвою**",
                            "value": `**${new Date().toLocaleString('uk-UA', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit'
                            })}**`, // Форматоване дата для кращого вигляду
                            "inline": false
                        }
                    ]
                }
            ]
        };

        // Відправка повідомлення через webhook
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(embed)
        });

        if (!response.ok) {
            console.error("Помилка при відправці повідомлення у Discord:", response.statusText);
        }
    } catch (error) {
        console.error("Помилка при відправці даних до Discord:", error);
    }
}

        async function fetchBlacklistData() {
            const blacklistRef = database.ref("blacklist");
            blacklistTableBody.innerHTML = '<tr><td colspan="5" class="loading">Завантаження...</td></tr>';

            try {
                const snapshot = await blacklistRef.once('value');

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const keys = Object.keys(data);

                    blacklistTableBody.innerHTML = "";

                    keys.forEach(key => {
                        const item = data[key];
                        const row = createBlacklistTableRow(item, key);
                        blacklistTableBody.appendChild(row);
                    });

                    checkAndRemoveExpiredEntries();
                    filterBlacklistTable();
                } else {
                    blacklistTableBody.innerHTML = '<tr><td colspan="5">Немає даних</td></tr>';
                }
            } catch (error) {
                console.error("Помилка при отриманні даних чорного списку:", error);
                blacklistTableBody.innerHTML = '<tr><td colspan="5">Помилка завантаження даних</td></tr>';
            }
        }

        async function fetchConvoyData() {
            const convoyRef = database.ref("convoys");
            convoyArchiveTableBody.innerHTML = '<tr><td colspan="5" class="loading">Завантаження...</td></tr>';

            try {
                const snapshot = await convoyRef.once('value');

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const keys = Object.keys(data);

                    convoyArchiveTableBody.innerHTML = "";

                    keys.sort((a, b) => data[b].timestamp - data[a].timestamp).forEach(key => {
                        const item = data[key];
                        const row = createConvoyTableRow(item);
                        convoyArchiveTableBody.appendChild(row);
                    });

                    filterConvoyTable();
                } else {
                    convoyArchiveTableBody.innerHTML = '<tr><td colspan="5">Немає даних</td></tr>';
                }
            } catch (error) {
                console.error("Помилка при отриманні даних конвоїв:", error);
                convoyArchiveTableBody.innerHTML = '<tr><td colspan="5">Помилка завантаження даних</td></tr>';
            }
        }

        function createBlacklistTableRow(item, key) {
            const row = document.createElement("tr");
            const currentTime = Date.now();
            const timeLeft = item.expirationTime - currentTime;

            let timeString = "Час вичерпано";
            if (timeLeft > 0) {
                timeString = formatTimeLeft(timeLeft);
            }

            const nicknameHtml = item.nickname
    ? (() => {
        const nicknameParts = item.nickname.split(' ');
        return `
            <div class="nickname-cell">
                <span class="nickname-first">${nicknameParts[0] || ''}</span>
                <span class="nickname-second">${nicknameParts.slice(1).join(' ')}</span>
            </div>
        `;
    })()
    : `<div class="nickname-error">Помилка NICKNAME</div>`;

row.innerHTML = `
    <td>${item.playerId || "Помилка ID"}</td>
    <td>${nicknameHtml}</td>
    <td>${item.clan || "Помилка CLAN"}</td>
    <td>${item.reason}</td>
    <td class="time-left" data-key="${key}">${timeString}</td>
`;

return row;

        }

        function createConvoyTableRow(item) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${new Date(item.timestamp).toLocaleString('uk-UA')}</td>
                <td>${formatNickname(item.convoy1)}</td>
                <td>${formatNickname(item.convoy2 || "—")}</td>
                <td>${item.prisoner1}</td>
                <td>${item.prisoner2 || "—"}</td>
            `;
            return row;
        }

        function formatNickname(nickname) {
            const parts = nickname.split(' ');
            return `
                <div class="nickname-cell">
                    <span class="nickname-first">${parts[0] || ''}</span>
                    <span class="nickname-second">${parts.slice(1).join(' ')}</span>
                </div>
            `;
        }

        function formatTimeLeft(timeLeft) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

            let timeString = "";
            if (days > 0) {
                timeString += `${days} ${days === 1 ? 'день' : days < 5 ? 'дні' : 'днів'}`;
            }
            if (hours > 0 || days > 0) timeString += ` ${hours} год.`;
            timeString += ` ${minutes} хв.`;

            return timeString.trim();
        }

        async function checkAndRemoveExpiredEntries() {
            const blacklistRef = database.ref("blacklist");

            try {
                const snapshot = await blacklistRef.once('value');
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const keys = Object.keys(data);

                    keys.forEach(key => {
                        const item = data[key];
                        if (Date.now() >= item.expirationTime) {
                            blacklistRef.child(key).remove();
                        }
                    });
                }
            } catch (error) {
                console.error("Помилка при видаленні записів:", error);
            }
        }

        function filterBlacklistTable() {
            const filter = blacklistSearchInput.value.toLowerCase();
            const rows = blacklistTableBody.getElementsByTagName("tr");

            for (let row of rows) {
                const cells = row.getElementsByTagName("td");
                let shouldShow = false;

                for (let cell of cells) {
                    const text = cell.textContent || cell.innerText;
                    if (text.toLowerCase().includes(filter)) {
                        shouldShow = true;
                        highlightText(cell, filter);
                    } else {
                        removeHighlight(cell);
                    }
                }

                row.style.display = shouldShow ? "" : "none";
            }
        }

        function filterConvoyTable() {
            const filter = convoySearchInput.value.toLowerCase();
            const rows = convoyArchiveTableBody.getElementsByTagName("tr");

            for (let row of rows) {
                const cells = row.getElementsByTagName("td");
                let shouldShow = false;

                for (let cell of cells) {
                    const text = cell.textContent || cell.innerText;
                    if (text.toLowerCase().includes(filter)) {
                        shouldShow = true;
                        highlightText(cell, filter);
                    } else {
                        removeHighlight(cell);
                    }
                }

                row.style.display = shouldShow ? "" : "none";
            }
        }

        function highlightText(element, filter) {
            const text = element.textContent;
            const regex = new RegExp(`(${filter})`, 'gi');
            element.innerHTML = text.replace(regex, '<span class="highlight">$1</span>');
        }

        function removeHighlight(element) {
            element.innerHTML = element.textContent;
        }

        function isAuthenticated() {
            const isAuth = localStorage.getItem('isAuthenticated');
            const authExpiration = localStorage.getItem('authExpiration');
            return isAuth && authExpiration && Date.now() < parseInt(authExpiration);
        }

        function updateUIForRole(role) {
            const adminElements = document.querySelectorAll('.admin-only');
            adminElements.forEach(el => {
                el.style.display = role === 'admin' ? 'block' : 'none';
            });
        }

        blacklistSearchInput.addEventListener('input', filterBlacklistTable);
        convoySearchInput.addEventListener('input', filterConvoyTable);

        setInterval(() => {
            const timeElements = document.querySelectorAll('.time-left');
            timeElements.forEach(element => {
                const key = element.dataset.key;
                database.ref(`blacklist/${key}`).once('value').then(snapshot => {
                    if (snapshot.exists()) {
                        const item = snapshot.val();
                        const timeLeft = item.expirationTime - Date.now();
                        if (timeLeft > 0) {
                            element.textContent = formatTimeLeft(timeLeft);
                        } else {
                            element.textContent = "Час вичерпано";
                        }
                    }
                });
            });
        }, 60000);

        async function updateStats() {
            const convoyRef = database.ref("convoys");
            const blacklistRef = database.ref("blacklist");
            const counterRef = database.ref("counter");

            try {
                const [convoySnapshot, blacklistSnapshot, counterSnapshot] = await Promise.all([
                    convoyRef.once('value'),
                    blacklistRef.once('value'),
                    counterRef.once('value')
                ]);

                const convoys = convoySnapshot.val() || {};
                const blacklist = blacklistSnapshot.val() || {};
                const totalConvoys = counterSnapshot.val() || 0;

                const now = Date.now();
                const oneDayAgo = now - 24 * 60 * 60 * 1000;
                const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

                const convoysToday = Object.values(convoys).filter(convoy => convoy.timestamp > oneDayAgo).length;
                const convoysThisWeek = Object.values(convoys).filter(convoy => convoy.timestamp > sevenDaysAgo).length;

                const blacklistCount = Object.keys(blacklist).length;

                document.getElementById('convoyCountTotal').textContent = totalConvoys;
                document.getElementById('convoyCountWeek').textContent = convoysThisWeek;
                document.getElementById('convoyCountToday').textContent = convoysToday;
                document.getElementById('blacklistCount').textContent = blacklistCount;

                updateConvoyChart(convoys);
            } catch (error) {
                console.error("Помилка при оновленні статистики:", error);
            }
        }

        function updateConvoyChart(convoys) {
            const chartData = [['День', 'Кількість конвоїв']];
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            for (let i = 0; i < 7; i++) {
                const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
                const dateString = date.toLocaleDateString('uk-UA', { weekday: 'short' });
                const count = Object.values(convoys).filter(convoy => {
                    const convoyDate = new Date(convoy.timestamp);
                    return convoyDate.toDateString() === date.toDateString();
                }).length;
                chartData.push([dateString, count]);
            }

            google.charts.load('current', {'packages':['corechart']});
            google.charts.setOnLoadCallback(() => {
                const data = google.visualization.arrayToDataTable(chartData);
                const options = {
                    title: 'Кількість конвоїв за останні 7 днів',
                    curveType: 'function',
                    legend: { position: 'bottom' },
                    backgroundColor: '#1A1A23',
                    titleTextStyle: { color: '#fff' },
                    hAxis: { textStyle: { color: '#fff' } },
                    vAxis: { textStyle: { color: '#fff' } },
                    legend: { textStyle: { color: '#fff' } },
                    colors: ['#007BFF']
                };
                const container = document.getElementById('convoyChart');
                if (container) {
                    const chart = new google.visualization.LineChart(container);
                    chart.draw(data, options);
                } else {
                    console.error('Container for convoy chart not found');
                }
            });
        }

        function updateViewerCount() {
            const viewersRef = database.ref('viewers');
            const userId = localStorage.getItem('userId') || generateUserId();
            localStorage.setItem('userId', userId);

            viewersRef.child(userId).set({
                lastActive: firebase.database.ServerValue.TIMESTAMP
            });

            viewersRef.on('value', (snapshot) => {
                const viewers = snapshot.val();
                const activeViewers = Object.values(viewers || {}).filter(viewer => {
                    return Date.now() - viewer.lastActive < 5 * 60 * 1000; // 5 minutes
                });
                document.getElementById('viewerCount').textContent = activeViewers.length;
            });

            setInterval(() => {
                viewersRef.child(userId).update({
                    lastActive: firebase.database.ServerValue.TIMESTAMP
                });
            }, 60000); // Update every minute
        }

        function removeUserFromViewerCount() {
            const userId = localStorage.getItem('userId');
            if (userId) {
                const viewersRef = database.ref('viewers');
                viewersRef.child(userId).remove();
            }
        }

        function generateUserId() {
            return 'user-' + Math.random().toString(36).substr(2, 9);
        }

        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });

        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('infoTitle').value;
            const content = document.getElementById('infoContent').innerHTML;

            await addAdminInfo(title, content);
            adminForm.reset();
            document.getElementById('infoContent').innerHTML = '';
            showSmsNotification('Успіх', 'Інформацію успішно додано/оновлено!');
        });

        async function addAdminInfo(title, content) {
            const adminInfoRef = database.ref("adminInfo");
            const newInfoRef = adminInfoRef.push();

            await newInfoRef.set({
                title,
                content,
                timestamp: Date.now()
            });

            await addActivity('admin', `Додано нову інформацію: ${title}`);
            await addLog('admin', `Адміністратор додав нову інформацію: ${title}`);
            fetchAdminInfo();
        }

        async function fetchAdminInfo() {
            const adminInfoRef = database.ref("adminInfo").orderByChild("timestamp");
            const snapshot = await adminInfoRef.once('value');
            const adminInfoList = document.getElementById('adminInfoList');
            adminInfoList.innerHTML = '';

            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const info = childSnapshot.val();
                    const infoCard = createInfoCard(info, childSnapshot.key);
                    adminInfoList.appendChild(infoCard);
                });
            } else {
                adminInfoList.innerHTML = '<p>Немає доступної інформації</p>';
            }
        }

        function createInfoCard(info, key) {
            const card = document.createElement('div');
            card.className = 'info-card';
            card.innerHTML = `
                <h3>${info.title}</h3>
                <div>${info.content}</div>
                <div class="info-actions">
                    <button class="btn edit-info" data-key="${key}">Редагувати</button>
                    <button class="btn delete-info" data-key="${key}">Видалити</button>
                </div>
            `;

            card.querySelector('.edit-info').addEventListener('click', () => editInfo(key, info));
            card.querySelector('.delete-info').addEventListener('click', () => deleteInfo(key));

            return card;
        }

        function editInfo(key, info) {
            document.getElementById('infoTitle').value = info.title;
            document.getElementById('infoContent').innerHTML = info.content;
            adminForm.dataset.editKey = key;
        }

        async function deleteInfo(key) {
            if (confirm('Ви впевнені, що хочете видалити цю інформацію?')) {
                const adminInfoRef = database.ref("adminInfo");
                await adminInfoRef.child(key).remove();
                await addActivity('admin', 'Видалено інформацію');
                await addLog('admin', `Адміністратор видалив інформацію`);
                fetchAdminInfo();
                showSmsNotification('Успіх', 'Інформацію успішно видалено!');
            }
        }

        document.querySelectorAll('.editor-toolbar button').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const command = this.dataset.command;
                if (command === 'createLink') {
                    const url = prompt('Введіть URL посилання:');
                    if (url) document.execCommand(command, false, url);
                } else if (command === 'insertImage') {
                    const url = prompt('Введіть URL зображення:');
                    if (url) document.execCommand(command, false, url);
                } else if (command === 'foreColor') {
                    showColorPicker(this);
                } else {
                    document.execCommand(command, false, null);
                }
            });
        });

        function showColorPicker(button) {
            const colorPicker = document.createElement('div');
            colorPicker.className = 'color-picker-popup';
            colorPicker.innerHTML = `
                <div class="color-grid"></div>
                <div class="color-input">
                    <input type="text" placeholder="#000000">
                    <button>OK</button>
                </div>
            `;

            const colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff',
                            '#c0c0c0', '#808080', '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'];

            const colorGrid = colorPicker.querySelector('.color-grid');
            colors.forEach(color => {
                const colorCell = document.createElement('div');
                colorCell.className = 'color-cell';
                colorCell.style.backgroundColor = color;
                colorCell.addEventListener('click', () => {
                    document.execCommand('foreColor', false, color);
                    colorPicker.remove();
                });
                colorGrid.appendChild(colorCell);
            });

            const colorInput = colorPicker.querySelector('input');
            const okButton = colorPicker.querySelector('button');
            okButton.addEventListener('click', () => {
                const color = colorInput.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    document.execCommand('foreColor', false, color);
                    colorPicker.remove();
                } else {
                    alert('Будь ласка, введіть правильний колір у форматі #RRGGBB');
                }
            });

            document.body.appendChild(colorPicker);
            const buttonRect = button.getBoundingClientRect();
            colorPicker.style.top = `${buttonRect.bottom + window.scrollY}px`;
            colorPicker.style.left = `${buttonRect.left + window.scrollX}px`;

            document.addEventListener('click', function closeColorPicker(e) {
                if (!colorPicker.contains(e.target) && e.target !== button) {
                    colorPicker.remove();
                    document.removeEventListener('click', closeColorPicker);
                }
            });
        }

        async function fetchLogs() {
            const logsRef = database.ref("logs").orderByChild("timestamp").limitToLast(100);
            const snapshot = await logsRef.once('value');
            const logsContent = document.getElementById('logsContent');
            logsContent.innerHTML = '';

            if (snapshot.exists()) {
                const logs = [];
                snapshot.forEach((childSnapshot) => {
                    logs.unshift({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });

                renderLogs(logs);
            } else {
                logsContent.innerHTML = '<p>Немає доступних логів</p>';
            }
        }

        function renderLogs(logs) {
            const logsContent = document.getElementById('logsContent');
            logsContent.innerHTML = '';

            const filteredLogs = filterLogs(logs);

            filteredLogs.forEach((log) => {
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry log-type-${log.type}`;
                logEntry.innerHTML = `
                    <div class="log-entry-header">
                        <span class="log-type">${getLogTypeText(log.type)}</span>
                        <span class="log-time">${new Date(log.timestamp).toLocaleString('uk-UA')}</span>
                    </div>
                    <div class="log-description">${log.description}</div>
                `;
                logsContent.appendChild(logEntry);
            });
        }

        function getLogTypeText(type) {
            const types = {
                'convoy': 'Конвой',
                'blacklist': 'Чорний список',
                'auth': 'Авторизація'
            };
            return types[type] || 'Інше';
        }

        function filterLogs(logs) {
            const typeFilter = logTypeFilter.value;
            const dateFilter = logDateFilter.value;

            return logs.filter(log => {
                const typeMatch = typeFilter === 'all' || log.type === typeFilter;
                const dateMatch = checkDateFilter(log.timestamp, dateFilter);
                return typeMatch && dateMatch;
            });
        }

        function checkDateFilter(timestamp, filter) {
            const logDate = new Date(timestamp);
            const now = new Date();

            switch (filter) {
                case 'today':
                    return logDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                    return logDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    return logDate >= monthAgo;
                default:
                    return true;
            }
        }

        logTypeFilter.addEventListener('change', () => fetchLogs());
        logDateFilter.addEventListener('change', () => fetchLogs());

        async function deleteOldLogs() {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const logsRef = database.ref("logs");
            const oldLogsSnapshot = await logsRef.orderByChild("timestamp").endAt(sevenDaysAgo).once('value');
            
            if (oldLogsSnapshot.exists()) {
                oldLogsSnapshot.forEach((childSnapshot) => {
                    logsRef.child(childSnapshot.key).remove();
                });
            }
        }
      
      
      
      
              async function updateMainPageContent() {
            const infoRef = database.ref('info').orderByChild('timestamp').limitToLast(1);
            const snapshot = await infoRef.once('value');
            const mainPageContent = document.getElementById('mainPageContent');

            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const info = childSnapshot.val();
                    mainPageContent.innerHTML = `
                        <h3>${info.title}</h3>
                        <div>${info.content}</div>
                    `;
                });
            } else {
                mainPageContent.innerHTML = '<p>Немає доступної інформації</p>';
            }
        }
      
      

        setInterval(deleteOldLogs, 24 * 60 * 60 * 1000);

        fetchBlacklistData();
        fetchConvoyData();
        updateStats();
        fetchRecentActivities();
        updateViewerCount();
        fetchAdminInfo();

        if (isAuthenticated()) {
            const userRole = localStorage.getItem('userRole');
            updateUIForRole(userRole);
        }

        window.addEventListener('beforeunload', removeUserFromViewerCount);
