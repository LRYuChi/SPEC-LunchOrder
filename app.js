import { app, analytics } from './firebaseConfig';

// 登入憑證
const loginCredentials = {
    "admin": "password123",
    "manager": "manager456"
};

// Application data - 使用提供的員工數據，包含交易明細
let employees = [
    {"name": "邱偉育", "balance": 500, "transactions": [
        {"type": "扣款", "amount": -120, "date": "2025-06-04T08:15:30", "lunch": "排骨飯", "lunchPrice": 90, "drink": "金萱無糖微冰", "drinkPrice": 30}
    ]},
    {"name": "劉政源", "balance": 80, "transactions": [
        {"type": "扣款", "amount": -90, "date": "2025-06-04T08:16:00", "lunch": "排骨飯", "lunchPrice": 90, "drink": "", "drinkPrice": 0}
    ]},
    {"name": "劉曉諭", "balance": -50, "transactions": [
        {"type": "扣款", "amount": -120, "date": "2025-06-04T08:17:00", "lunch": "排骨飯", "lunchPrice": 90, "drink": "紅茶鮮奶半糖微冰", "drinkPrice": 30}
    ]},
    {"name": "許慧如", "balance": 300, "transactions": []},
    {"name": "郭志群", "balance": -200, "transactions": []}
];

let orders = [];
let parsedOrders = []; // 存儲解析後的訂單

// 當日店家設定 - 使用提供的數據
let dailyStores = {
    "lunchStore": "美味便當",
    "drinkStore": "茶飲專賣"
};

// 近七天店家歷史記錄
let storeHistory = [
    {"date": "2025-05-28", "lunchStore": "美味便當", "drinkStore": "茶飲專賣"},
    {"date": "2025-05-29", "lunchStore": "健康餐盒", "drinkStore": "果汁吧"},
    {"date": "2025-05-30", "lunchStore": "美味便當", "drinkStore": "茶飲專賣"},
    {"date": "2025-05-31", "lunchStore": "營養午餐", "drinkStore": "咖啡時光"},
    {"date": "2025-06-01", "lunchStore": "美味便當", "drinkStore": "茶飲專賣"},
    {"date": "2025-06-02", "lunchStore": "健康餐盒", "drinkStore": "飲料小舖"},
    {"date": "2025-06-03", "lunchStore": "美味便當", "drinkStore": "茶飲專賣"}
];

// 預設菜單價格
const defaultPrices = {
    lunch: {
        "排骨飯": 90,
        "雞腿便當": 100,
        "B餐": 85,
        "C餐": 85,
        "飯菜": 70,
        "蒜泥白肉便當": 90,
        "小肉燥便當": 75,
        "單點椒麻雞排": 60,
        "全享餐": 95
    },
    drink: {
        "金萱": 30,
        "紅茶鮮奶": 30,
        "梅子冰茶": 25,
        "紅茶": 20,
        "金萱雙Q": 35,
        "綠茶": 20,
        "錫蘭奶茶": 30,
        "奶綠": 25,
        "紅茶拿鐵": 35,
        "多多綠茶": 30
    }
};

// DOM 元素快取
let loginPageElement, mainSystemElement, loginUsernameElement, loginPasswordElement, loginErrorElement;

// 初始化 DOM 元素
function initializeElements() {
    loginPageElement = document.getElementById('loginPage');
    mainSystemElement = document.getElementById('mainSystem');
    loginUsernameElement = document.getElementById('loginUsername');
    loginPasswordElement = document.getElementById('loginPassword');
    loginErrorElement = document.getElementById('loginError');
}

// 登入功能
function login() {
    if (!loginUsernameElement || !loginPasswordElement) {
        console.error('Login elements not found');
        return;
    }

    const username = loginUsernameElement.value.trim();
    const password = loginPasswordElement.value.trim();

    if (!username || !password) {
        showLoginError('請輸入帳號和密碼');
        return;
    }

    if (loginCredentials[username] && loginCredentials[username] === password) {
        // 登入成功
        if (loginPageElement && mainSystemElement) {
            loginPageElement.style.display = 'none';
            mainSystemElement.style.display = 'block';
            mainSystemElement.classList.remove('hidden');
            init();
        }
    } else {
        showLoginError('帳號或密碼錯誤');
    }
}

function showLoginError(message) {
    if (loginErrorElement) {
        loginErrorElement.textContent = message;
        loginErrorElement.classList.remove('hidden');
        setTimeout(() => {
            loginErrorElement.classList.add('hidden');
        }, 3000);
    }
}

function logout() {
    if (confirm('確定要登出嗎？')) {
        if (mainSystemElement && loginPageElement) {
            mainSystemElement.style.display = 'none';
            mainSystemElement.classList.add('hidden');
            loginPageElement.style.display = 'block';
            loginUsernameElement.value = '';
            loginPasswordElement.value = '';
        }
    }
}

// Utility functions
function formatDate(date) {
    return date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
}

function formatCurrency(amount) {
    return `$${amount}`;
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 修改帳戶狀態邏輯：正常(>100)、餘額低(0-100)、警示(<0)
function getAccountStatus(balance) {
    if (balance < 0) return 'warning';  // 負數為警示
    if (balance <= 100) return 'low';   // 100元以下為餘額低
    return 'normal';                    // 超過100元為正常
}

function getStatusText(status) {
    switch(status) {
        case 'warning': return '警示';
        case 'low': return '餘額低';
        default: return '正常';
    }
}

function getStatusClass(status) {
    switch(status) {
        case 'warning': return 'balance-warning';
        case 'low': return 'balance-low';
        default: return 'balance-normal';
    }
}

// Initialize application
function init() {
    updateCurrentDate();
    setupTabs();
    updateOverview();
    updateAccountsGrid();
    updateUserSelects();
    updateDailyStores();
    updateOrdersList();
    updateDailyReport();
}

function updateCurrentDate() {
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        const currentDate = new Date();
        currentDateElement.textContent = formatDate(currentDate);
    }
}

// Tab functionality
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            button.classList.add('active');
            const targetElement = document.getElementById(targetTab);
            if (targetElement) {
                targetElement.classList.add('active');
            }

            // Update specific content when switching tabs
            if (targetTab === 'overview') {
                updateOverview();
            } else if (targetTab === 'accounts') {
                updateAccountsGrid();
                updateUserSelects();
            } else if (targetTab === 'reports') {
                updateDailyReport();
            }
        });
    });
}

// Overview functionality
function updateOverview() {
    // Calculate total balance
    const totalBalance = employees.reduce((sum, emp) => sum + emp.balance, 0);
    const totalBalanceElement = document.getElementById('totalBalance');
    if (totalBalanceElement) {
        totalBalanceElement.textContent = formatCurrency(totalBalance);
    }

    // Count account statuses with new logic
    let normalCount = 0, lowCount = 0, warningCount = 0;
    employees.forEach(emp => {
        const status = getAccountStatus(emp.balance);
        if (status === 'normal') normalCount++;
        else if (status === 'low') lowCount++;
        else warningCount++;
    });

    const normalCountElement = document.getElementById('normalCount');
    const lowCountElement = document.getElementById('lowCount');
    const warningCountElement = document.getElementById('warningCount');

    if (normalCountElement) normalCountElement.textContent = normalCount;
    if (lowCountElement) lowCountElement.textContent = lowCount;
    if (warningCountElement) warningCountElement.textContent = warningCount;

    // Update store statistics
    updateStoreStatistics();
}

function updateStoreStatistics() {
    // Count store occurrences in the last 7 days
    const lunchStats = {};
    const drinkStats = {};

    storeHistory.forEach(entry => {
        if (entry.lunchStore) {
            lunchStats[entry.lunchStore] = lunchStats[entry.lunchStore] || { count: 0, lastDate: entry.date };
            lunchStats[entry.lunchStore].count++;
            if (entry.date > lunchStats[entry.lunchStore].lastDate) {
                lunchStats[entry.lunchStore].lastDate = entry.date;
            }
        }
        if (entry.drinkStore) {
            drinkStats[entry.drinkStore] = drinkStats[entry.drinkStore] || { count: 0, lastDate: entry.date };
            drinkStats[entry.drinkStore].count++;
            if (entry.date > drinkStats[entry.drinkStore].lastDate) {
                drinkStats[entry.drinkStore].lastDate = entry.date;
            }
        }
    });

    // Update lunch store stats table
    const lunchTableBody = document.getElementById('lunchStoreStats');
    if (lunchTableBody) {
        lunchTableBody.innerHTML = '';
        Object.entries(lunchStats).forEach(([store, data]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${store}</td>
                <td>${data.count}次</td>
                <td>${data.lastDate}</td>
            `;
            lunchTableBody.appendChild(row);
        });
    }

    // Update drink store stats table
    const drinkTableBody = document.getElementById('drinkStoreStats');
    if (drinkTableBody) {
        drinkTableBody.innerHTML = '';
        Object.entries(drinkStats).forEach(([store, data]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${store}</td>
                <td>${data.count}次</td>
                <td>${data.lastDate}</td>
            `;
            drinkTableBody.appendChild(row);
        });
    }
}

// 當日店家設定
function setDailyStores() {
    const lunchStoreElement = document.getElementById('dailyLunchStore');
    const drinkStoreElement = document.getElementById('dailyDrinkStore');

    if (!lunchStoreElement || !drinkStoreElement) return;

    const lunchStore = lunchStoreElement.value.trim();
    const drinkStore = drinkStoreElement.value.trim();

    if (!lunchStore || !drinkStore) {
        alert('請輸入午餐店家和飲料店家名稱');
        return;
    }

    dailyStores.lunchStore = lunchStore;
    dailyStores.drinkStore = drinkStore;

    alert('當日店家設定成功！');
    updateDailyStores();
}

function updateDailyStores() {
    const lunchStoreElement = document.getElementById('dailyLunchStore');
    const drinkStoreElement = document.getElementById('dailyDrinkStore');

    if (lunchStoreElement) lunchStoreElement.value = dailyStores.lunchStore;
    if (drinkStoreElement) drinkStoreElement.value = dailyStores.drinkStore;
}

// 增強訊息解析功能 - 生成可編輯表格
function parseMessage() {
    const messageInputElement = document.getElementById('messageInput');
    if (!messageInputElement) return;

    const messageText = messageInputElement.value.trim();
    if (!messageText) {
        alert('請輸入訂購訊息');
        return;
    }

    if (!dailyStores.lunchStore || !dailyStores.drinkStore) {
        alert('請先設定當日店家');
        return;
    }

    try {
        const lines = messageText.split('\n').filter(line => line.trim());
        parsedOrders = []; // 清空之前的解析結果
        let currentOrder = {};

        lines.forEach(line => {
            const trimmedLine = line.trim();
            
            // 跳過「已收回訊息」等無效內容
            if (trimmedLine.includes('已收回訊息') || trimmedLine.includes('訊息已收回') || trimmedLine === '') {
                return;
            }

            // 檢查是否是新的訂單開始（包含時間和日期）
            if (trimmedLine.match(/^\d{2}:\d{2}\s+/) && (trimmedLine.includes('日期') || trimmedLine.includes('星期'))) {
                // 如果之前有未完成的訂單，先處理
                if (currentOrder.name && currentOrder.lunch) {
                    addParsedOrder(currentOrder);
                }
                currentOrder = {};
                return;
            }

            // 解析姓名
            const nameMatch = trimmedLine.match(/^姓名[：:]\s*(.+)$/) || 
                             trimmedLine.match(/^姓名\s*[：:]\s*(.+)$/) ||
                             trimmedLine.match(/^\d{2}:\d{2}\s+(.+?)\s+日期/);
            
            if (nameMatch) {
                let name = nameMatch[1].trim();
                // 清理表情符號和特殊字符
                name = name.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
                name = name.replace(/[🌹\.-]/g, '').trim();
                
                // 檢查是否為已知員工
                const employee = employees.find(emp => emp.name === name || name.includes(emp.name));
                if (employee) {
                    currentOrder.name = employee.name;
                }
                return;
            }

            // 解析午餐
            const lunchMatch = trimmedLine.match(/^午餐[：:]\s*(.+)$/) || 
                              trimmedLine.match(/^午餐\s*[：:]\s*(.+)$/);
            
            if (lunchMatch) {
                let lunch = lunchMatch[1].trim();
                if (lunch && lunch !== '') {
                    currentOrder.lunch = lunch;
                    currentOrder.lunchPrice = defaultPrices.lunch[lunch] || 90;
                }
                return;
            }

            // 解析飲料
            const drinkMatch = trimmedLine.match(/^飲料[：:]\s*(.+)$/) || 
                              trimmedLine.match(/^飲料\s*[：:]\s*(.+)$/);
            
            if (drinkMatch) {
                let drink = drinkMatch[1].trim();
                if (drink && drink !== '' && drink.toLowerCase() !== 'x') {
                    currentOrder.drink = drink;
                    // 根據飲料名稱猜測價格
                    const drinkName = Object.keys(defaultPrices.drink).find(key => drink.includes(key));
                    currentOrder.drinkPrice = drinkName ? defaultPrices.drink[drinkName] : 30;
                } else {
                    currentOrder.drink = '無';
                    currentOrder.drinkPrice = 0;
                }
                
                // 如果有姓名和午餐，這個訂單就完整了
                if (currentOrder.name && currentOrder.lunch) {
                    addParsedOrder(currentOrder);
                    currentOrder = {};
                }
                return;
            }
        });

        // 處理最後一個訂單
        if (currentOrder.name && currentOrder.lunch) {
            addParsedOrder(currentOrder);
        }

        if (parsedOrders.length > 0) {
            showParsedOrdersTable();
            alert(`成功解析 ${parsedOrders.length} 筆訂單，請檢查金額後確認加入`);
        } else {
            alert('未能解析到有效訂單，請檢查格式或確認同仁姓名正確');
        }
    } catch (error) {
        console.error('解析錯誤:', error);
        alert('訊息解析失敗，請檢查格式');
    }
}

function addParsedOrder(orderData) {
    const order = {
        id: Date.now() + Math.random(), // 添加唯一ID
        user: orderData.name,
        lunch: orderData.lunch,
        lunchPrice: orderData.lunchPrice,
        drink: orderData.drink || '無',
        drinkPrice: orderData.drinkPrice || 0,
        lunchStore: dailyStores.lunchStore,
        drinkStore: dailyStores.drinkStore,
        date: new Date().toISOString().split('T')[0]
    };
    parsedOrders.push(order);
}

// 顯示解析結果表格
function showParsedOrdersTable() {
    const section = document.getElementById('parsedOrdersSection');
    const tbody = document.getElementById('parsedOrdersBody');
    
    if (!section || !tbody) return;
    
    section.classList.remove('hidden');
    tbody.innerHTML = '';
    
    parsedOrders.forEach((order, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${order.user}</td>
            <td>${order.lunch}</td>
            <td>
                <input type="number" class="price-input" value="${order.lunchPrice}" 
                       onchange="updateParsedOrderPrice(${index}, 'lunch', this.value)">
            </td>
            <td>${order.drink}</td>
            <td>
                <input type="number" class="price-input" value="${order.drinkPrice}" 
                       onchange="updateParsedOrderPrice(${index}, 'drink', this.value)">
            </td>
            <td class="total-cell">${formatCurrency(order.lunchPrice + order.drinkPrice)}</td>
            <td>
                <button class="btn btn--sm btn--outline" onclick="removeParsedOrder(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 更新解析訂單價格
function updateParsedOrderPrice(index, type, value) {
    if (index >= 0 && index < parsedOrders.length) {
        const price = parseInt(value) || 0;
        if (type === 'lunch') {
            parsedOrders[index].lunchPrice = price;
        } else if (type === 'drink') {
            parsedOrders[index].drinkPrice = price;
        }
        // 重新顯示表格以更新小計
        showParsedOrdersTable();
    }
}

// 移除解析訂單
function removeParsedOrder(index) {
    if (index >= 0 && index < parsedOrders.length) {
        parsedOrders.splice(index, 1);
        showParsedOrdersTable();
        if (parsedOrders.length === 0) {
            document.getElementById('parsedOrdersSection').classList.add('hidden');
        }
    }
}

// 確認解析訂單
function confirmParsedOrders() {
    if (parsedOrders.length === 0) {
        alert('沒有解析的訂單需要確認');
        return;
    }
    
    orders.push(...parsedOrders);
    parsedOrders = [];
    document.getElementById('parsedOrdersSection').classList.add('hidden');
    document.getElementById('messageInput').value = '';
    updateOrdersList();
    alert('解析訂單已加入今日訂單列表');
}

// 清除解析結果
function clearParsedOrders() {
    parsedOrders = [];
    document.getElementById('parsedOrdersSection').classList.add('hidden');
    document.getElementById('messageInput').value = '';
}

// 單筆新增 - 自動使用當日設定店家
function addSingleOrder() {
    const userElement = document.getElementById('orderUser');
    const lunchElement = document.getElementById('orderLunch');
    const lunchPriceElement = document.getElementById('orderLunchPrice');
    const drinkElement = document.getElementById('orderDrink');
    const drinkPriceElement = document.getElementById('orderDrinkPrice');

    if (!userElement || !lunchElement || !lunchPriceElement || !drinkElement || !drinkPriceElement) return;

    const user = userElement.value;
    const lunch = lunchElement.value.trim();
    const lunchPrice = parseInt(lunchPriceElement.value) || 0;
    const drink = drinkElement.value.trim();
    const drinkPrice = parseInt(drinkPriceElement.value) || 0;

    if (!user || !lunch) {
        alert('請填寫完整的訂單資訊');
        return;
    }

    if (!dailyStores.lunchStore || !dailyStores.drinkStore) {
        alert('請先設定當日店家');
        return;
    }

    const order = {
        user: user,
        lunch: lunch,
        lunchPrice: lunchPrice,
        drink: drink || '無',
        drinkPrice: drinkPrice,
        lunchStore: dailyStores.lunchStore,
        drinkStore: dailyStores.drinkStore,
        date: new Date().toISOString().split('T')[0]
    };

    orders.push(order);
    updateOrdersList();

    // Clear form
    userElement.value = '';
    lunchElement.value = '';
    lunchPriceElement.value = '';
    drinkElement.value = '';
    drinkPriceElement.value = '';

    alert('訂單新增成功！');
}

function updateOrdersList() {
    const ordersListElement = document.getElementById('ordersList');
    if (!ordersListElement) return;

    if (orders.length === 0) {
        ordersListElement.innerHTML = '<p>暫無訂單</p>';
        return;
    }

    ordersListElement.innerHTML = orders.map((order, index) => `
        <div class="order-item">
            <div class="order-details">
                <strong><i class="fas fa-user"></i> ${order.user}</strong><br>
                <i class="fas fa-hamburger"></i> 午餐: ${order.lunch} (${formatCurrency(order.lunchPrice)})<br>
                <i class="fas fa-coffee"></i> 飲料: ${order.drink} (${formatCurrency(order.drinkPrice)})
            </div>
            <div class="order-summary">
                <span><strong>總計: ${formatCurrency(order.lunchPrice + order.drinkPrice)}</strong></span>
                <button class="btn btn--sm btn--outline" onclick="removeOrder(${index})">
                    <i class="fas fa-trash"></i> 移除
                </button>
            </div>
        </div>
    `).join('');
}

function removeOrder(index) {
    orders.splice(index, 1);
    updateOrdersList();
}

// 修改扣款邏輯 - 記錄詳細的午餐和飲料費用
function processOrders() {
    if (orders.length === 0) {
        alert('沒有訂單需要處理');
        return;
    }

    // 防重複扣款確認
    if (!confirm('確定要執行扣款嗎？此操作無法復原。')) {
        return;
    }

    let processed = 0;
    orders.forEach(order => {
        const employee = employees.find(emp => emp.name === order.user);
        if (employee) {
            const totalAmount = order.lunchPrice + order.drinkPrice;
            // 強制執行扣款，不檢查餘額
            employee.balance -= totalAmount;
            
            // Add transaction record with detailed lunch/drink breakdown
            employee.transactions.push({
                type: '扣款',
                amount: -totalAmount,
                date: new Date().toISOString(),
                lunch: order.lunch,
                lunchPrice: order.lunchPrice,
                drink: order.drink,
                drinkPrice: order.drinkPrice,
                lunchStore: order.lunchStore,
                drinkStore: order.drinkStore
            });
            
            processed++;
        }
    });

    // Clear orders after processing
    orders = [];
    updateOrdersList();
    updateOverview();
    updateAccountsGrid();
    updateDailyReport();

    alert(`成功處理 ${processed} 筆訂單，已從相關帳戶扣款`);
}

// Account management
function updateUserSelects() {
    const selects = ['orderUser', 'topupUser'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">請選擇同仁</option>';
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.name;
                option.textContent = emp.name;
                select.appendChild(option);
            });
        }
    });
}

function addEmployee() {
    const nameElement = document.getElementById('newEmployeeName');
    const balanceElement = document.getElementById('newEmployeeBalance');

    if (!nameElement || !balanceElement) return;

    const name = nameElement.value.trim();
    const balance = parseInt(balanceElement.value) || 0;

    if (!name) {
        alert('請輸入同仁姓名');
        return;
    }

    if (employees.find(emp => emp.name === name)) {
        alert('同仁已存在');
        return;
    }

    employees.push({
        name: name,
        balance: balance,
        transactions: []
    });

    updateAccountsGrid();
    updateUserSelects();
    updateOverview();

    // Clear form
    nameElement.value = '';
    balanceElement.value = '0';

    alert('同仁新增成功！');
}

// 帳戶加值功能
function topupAccount() {
    const userElement = document.getElementById('topupUser');
    const amountElement = document.getElementById('topupAmount');

    if (!userElement || !amountElement) return;

    const userName = userElement.value;
    const amount = parseInt(amountElement.value);

    if (!userName) {
        alert('請選擇同仁');
        return;
    }

    if (!amount || amount <= 0) {
        alert('請輸入有效的加值金額');
        return;
    }

    const employee = employees.find(emp => emp.name === userName);
    if (employee) {
        employee.balance += amount;
        employee.transactions.push({
            type: '加值',
            amount: amount,
            date: new Date().toISOString(),
            lunch: '',
            lunchPrice: 0,
            drink: '',
            drinkPrice: 0
        });

        updateAccountsGrid();
        updateOverview();

        // Clear form
        userElement.value = '';
        amountElement.value = '';

        alert(`${userName} 加值成功！加值金額: ${formatCurrency(amount)}`);
    }
}

// 新增：帳戶排序功能
function sortAccounts() {
    const sortSelect = document.getElementById('balanceSort');
    if (!sortSelect) return;
    
    const sortValue = sortSelect.value;
    let sortedEmployees = [...employees];
    
    switch(sortValue) {
        case 'high-to-low':
            sortedEmployees.sort((a, b) => b.balance - a.balance);
            break;
        case 'low-to-high':
            sortedEmployees.sort((a, b) => a.balance - b.balance);
            break;
        default:
            // 保持原始順序
            break;
    }
    
    updateAccountsGrid(sortedEmployees);
}

// 新增：更新帳戶網格佈局
function updateAccountsGrid(employeeList = employees) {
    const accountsGridElement = document.getElementById('accountsGrid');
    if (!accountsGridElement) return;

    accountsGridElement.innerHTML = employeeList.map(emp => {
        const status = getAccountStatus(emp.balance);
        const statusText = getStatusText(status);

        return `
            <div class="account-card ${status}">
                <div class="account-header">
                    <div class="account-name">
                        <i class="fas fa-user"></i>
                        ${emp.name}
                    </div>
                    <div class="account-status-badge ${status}">
                        ${statusText}
                    </div>
                </div>
                <div class="account-balance ${getStatusClass(status)}">
                    ${formatCurrency(emp.balance)}
                </div>
                <div class="account-actions">
                    <button class="btn btn--sm btn--outline" onclick="showEmployeeDetails('${emp.name}')">
                        <i class="fas fa-eye"></i> 查看明細
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 顯示員工詳細資料 - 包含餐點飲料個別費用
function showEmployeeDetails(employeeName) {
    const employee = employees.find(emp => emp.name === employeeName);
    if (!employee) return;

    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerHTML = `<i class="fas fa-user"></i> ${employee.name} - 帳戶明細`;

    const transactionsHtml = employee.transactions.length > 0 
        ? employee.transactions.map(transaction => {
            let detailsHtml = '';
            if (transaction.type === '扣款' && transaction.lunch) {
                detailsHtml = `
                    <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
                        <div><i class="fas fa-hamburger" style="color: #4CD964;"></i> ${transaction.lunch} - ${formatCurrency(transaction.lunchPrice)}</div>
                        ${transaction.drink ? `<div><i class="fas fa-coffee" style="color: #5AC8FA;"></i> ${transaction.drink} - ${formatCurrency(transaction.drinkPrice)}</div>` : ''}
                    </div>
                `;
            }
            
            return `
                <tr>
                    <td>${formatDateTime(transaction.date)}</td>
                    <td>
                        <i class="fas ${transaction.type === '加值' ? 'fa-plus-circle' : 'fa-minus-circle'}"></i>
                        ${transaction.type}
                        ${detailsHtml}
                    </td>
                    <td class="${transaction.type === '加值' ? 'balance-normal' : 'balance-warning'}">
                        ${transaction.type === '加值' ? '+' : ''}${formatCurrency(Math.abs(transaction.amount))}
                    </td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="3">暫無交易記錄</td></tr>';

    modalBody.innerHTML = `
        <div class="account-summary" style="margin-bottom: 20px;">
            <h4>目前餘額: <span class="${getStatusClass(getAccountStatus(employee.balance))}">${formatCurrency(employee.balance)}</span></h4>
            <p>帳戶狀態: <span class="status status--${getAccountStatus(employee.balance) === 'normal' ? 'success' : getAccountStatus(employee.balance) === 'low' ? 'warning' : 'error'}">${getStatusText(getAccountStatus(employee.balance))}</span></p>
        </div>
        <h5><i class="fas fa-history"></i> 交易記錄</h5>
        <table class="report-table">
            <thead>
                <tr>
                    <th>日期時間</th>
                    <th>項目詳情</th>
                    <th>金額</th>
                </tr>
            </thead>
            <tbody>
                ${transactionsHtml}
            </tbody>
        </table>
    `;

    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// 報表功能 - 包含餐點和飲料分項統計
function updateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = employees.filter(emp => 
        emp.transactions.some(t => t.date.startsWith(today) && t.type === '扣款')
    ).map(emp => {
        const todayTransactions = emp.transactions.filter(t => t.date.startsWith(today) && t.type === '扣款');
        return {
            name: emp.name,
            transactions: todayTransactions,
            total: todayTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            lunchTotal: todayTransactions.reduce((sum, t) => sum + (t.lunchPrice || 0), 0),
            drinkTotal: todayTransactions.reduce((sum, t) => sum + (t.drinkPrice || 0), 0)
        };
    });

    const reportDiv = document.getElementById('dailyReport');
    if (!reportDiv) return;
    
    if (todayOrders.length === 0) {
        reportDiv.innerHTML = '<p>今日暫無訂單記錄</p>';
        return;
    }

    // 計算分項統計
    const totalLunch = todayOrders.reduce((sum, order) => sum + order.lunchTotal, 0);
    const totalDrink = todayOrders.reduce((sum, order) => sum + order.drinkTotal, 0);
    const totalAmount = totalLunch + totalDrink;

    // 統計卡片
    const statsCards = `
        <div class="stats-summary">
            <div class="stats-summary-card lunch-stats">
                <h5>餐點總額</h5>
                <div class="amount">${formatCurrency(totalLunch)}</div>
            </div>
            <div class="stats-summary-card drink-stats">
                <h5>飲料總額</h5>
                <div class="amount">${formatCurrency(totalDrink)}</div>
            </div>
            <div class="stats-summary-card total-stats">
                <h5>當日總額</h5>
                <div class="amount">${formatCurrency(totalAmount)}</div>
            </div>
        </div>
    `;

    // 店家資訊統一顯示在頂部
    const storeInfo = `
        <div class="print-header">
            <h4>當日報表 - ${formatDate(new Date())}</h4>
            <p><strong>午餐店家:</strong> ${dailyStores.lunchStore}</p>
            <p><strong>飲料店家:</strong> ${dailyStores.drinkStore}</p>
            <hr>
        </div>
    `;

    // 訂單內容表格
    const tableRows = todayOrders.map(order => `
        <tr>
            <td>${order.name}</td>
            <td>${order.transactions.map(t => `${t.lunch}${t.drink ? ` + ${t.drink}` : ''}`).join(', ')}</td>
            <td>${formatCurrency(order.lunchTotal)}</td>
            <td>${formatCurrency(order.drinkTotal)}</td>
            <td><strong>${formatCurrency(order.total)}</strong></td>
        </tr>
    `).join('');

    reportDiv.innerHTML = `
        ${storeInfo}
        ${statsCards}
        <table class="report-table">
            <thead>
                <tr>
                    <th>姓名</th>
                    <th>訂購內容</th>
                    <th>餐點費用</th>
                    <th>飲料費用</th>
                    <th>小計</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
                <tr style="font-weight: bold; background: rgba(255, 149, 0, 0.1);">
                    <td>總計</td>
                    <td></td>
                    <td><strong>${formatCurrency(totalLunch)}</strong></td>
                    <td><strong>${formatCurrency(totalDrink)}</strong></td>
                    <td><strong>${formatCurrency(totalAmount)}</strong></td>
                </tr>
            </tbody>
        </table>
    `;
}

function printReport() {
    window.print();
}

// 歷史查詢 - 包含餐點和飲料分項統計
function queryHistory() {
    const queryDateElement = document.getElementById('queryDate');
    if (!queryDateElement) return;

    const queryDate = queryDateElement.value;
    if (!queryDate) {
        alert('請選擇查詢日期');
        return;
    }

    const historyOrders = employees.filter(emp => 
        emp.transactions.some(t => t.date.startsWith(queryDate) && t.type === '扣款')
    ).map(emp => {
        const dateTransactions = emp.transactions.filter(t => t.date.startsWith(queryDate) && t.type === '扣款');
        return {
            name: emp.name,
            transactions: dateTransactions,
            total: dateTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
            lunchTotal: dateTransactions.reduce((sum, t) => sum + (t.lunchPrice || 0), 0),
            drinkTotal: dateTransactions.reduce((sum, t) => sum + (t.drinkPrice || 0), 0)
        };
    });

    const resultsDiv = document.getElementById('historyResults');
    if (!resultsDiv) return;
    
    if (historyOrders.length === 0) {
        resultsDiv.innerHTML = '<p>該日期無訂單記錄</p>';
        return;
    }

    // 計算分項統計
    const totalLunch = historyOrders.reduce((sum, order) => sum + order.lunchTotal, 0);
    const totalDrink = historyOrders.reduce((sum, order) => sum + order.drinkTotal, 0);
    const totalAmount = totalLunch + totalDrink;

    // 統計卡片
    const statsCards = `
        <div class="stats-summary">
            <div class="stats-summary-card lunch-stats">
                <h5>餐點總額</h5>
                <div class="amount">${formatCurrency(totalLunch)}</div>
            </div>
            <div class="stats-summary-card drink-stats">
                <h5>飲料總額</h5>
                <div class="amount">${formatCurrency(totalDrink)}</div>
            </div>
            <div class="stats-summary-card total-stats">
                <h5>該日總額</h5>
                <div class="amount">${formatCurrency(totalAmount)}</div>
            </div>
        </div>
    `;

    const tableRows = historyOrders.map(order => `
        <tr>
            <td>${order.name}</td>
            <td>${order.transactions.map(t => `${t.lunch}${t.drink ? ` + ${t.drink}` : ''}`).join(', ')}</td>
            <td>${formatCurrency(order.lunchTotal)}</td>
            <td>${formatCurrency(order.drinkTotal)}</td>
            <td><strong>${formatCurrency(order.total)}</strong></td>
        </tr>
    `).join('');

    resultsDiv.innerHTML = `
        <div class="card">
            <div class="card__body">
                <h4><i class="fas fa-calendar"></i> ${queryDate} 訂單記錄</h4>
                ${statsCards}
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>姓名</th>
                            <th>訂購內容</th>
                            <th>餐點費用</th>
                            <th>飲料費用</th>
                            <th>小計</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                        <tr style="font-weight: bold; background: rgba(90, 200, 250, 0.1);">
                            <td>總計</td>
                            <td></td>
                            <td><strong>${formatCurrency(totalLunch)}</strong></td>
                            <td><strong>${formatCurrency(totalDrink)}</strong></td>
                            <td><strong>${formatCurrency(totalAmount)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    
    // 按Enter鍵登入
    if (loginPasswordElement) {
        loginPasswordElement.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
});