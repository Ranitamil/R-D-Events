// App State
let appState = {
    friends: [],
    loans: [],
    payments: []
};

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const pageTitle = document.getElementById('page-title');

// Modals
const modalOverlay = document.getElementById('modalOverlay');
const friendModal = document.getElementById('friendModal');
const loanModal = document.getElementById('loanModal');
const paymentModal = document.getElementById('paymentModal');

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupNavigation();
    setupModals();
    setupForms();
    renderApp();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('loanDate').value = today;
    document.getElementById('paymentDate').value = today;
});

// Navigation
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class
            navItems.forEach(n => n.classList.remove('active'));
            tabPanes.forEach(t => t.classList.remove('active'));
            
            // Add active class
            item.classList.add('active');
            const targetId = `tab-${item.dataset.tab}`;
            document.getElementById(targetId).classList.add('active');
            
            // Update Title
            pageTitle.textContent = item.querySelector('span').textContent;
            
            // Refresh render just in case
            renderApp();
        });
    });
}

// Data Management
function loadData() {
    const data = localStorage.getItem('syncLoanData');
    if (data) {
        appState = JSON.parse(data);
    }
}

function saveData() {
    localStorage.setItem('syncLoanData', JSON.stringify(appState));
    renderApp();
}

// Core Logic Helpers
function getFriendName(friendId) {
    const friend = appState.friends.find(f => f.id === friendId);
    return friend ? friend.name : 'Unknown';
}

function getLoanPayments(loanId) {
    return appState.payments.filter(p => p.loanId === loanId);
}

function getLoanBalance(loan) {
    const payments = getLoanPayments(loan.id);
    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    return loan.amount - paid;
}

function updateLoanStatus(loanId) {
    const loan = appState.loans.find(l => l.id === loanId);
    const balance = getLoanBalance(loan);
    if (balance <= 0) {
        loan.status = 'paid';
    } else {
        loan.status = 'active';
    }
    saveData();
}

// Rendering
function renderApp() {
    renderDashboardStats();
    renderRecentLoans();
    renderAllLoans();
    renderFriends();
    populateFriendSelect();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function renderDashboardStats() {
    let totalLoaned = 0;
    let totalRepaid = 0;

    appState.loans.forEach(loan => {
        totalLoaned += loan.amount;
        const payments = getLoanPayments(loan.id);
        totalRepaid += payments.reduce((sum, p) => sum + p.amount, 0);
    });

    const outstanding = totalLoaned - totalRepaid;

    document.getElementById('stat-total-loaned').textContent = formatCurrency(totalLoaned);
    document.getElementById('stat-total-repaid').textContent = formatCurrency(totalRepaid);
    document.getElementById('stat-balance').textContent = formatCurrency(outstanding);
}

function renderRecentLoans() {
    const tbody = document.getElementById('recent-loans-body');
    const emptyState = document.getElementById('empty-dashboard');
    tbody.innerHTML = '';

    if (appState.loans.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    // Get last 5 loans
    const recent = [...appState.loans].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    recent.forEach(loan => {
        const balance = getLoanBalance(loan);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(loan.date).toLocaleDateString()}</td>
            <td><strong>${getFriendName(loan.friendId)}</strong></td>
            <td>${loan.description}</td>
            <td>${formatCurrency(loan.amount)}</td>
            <td><strong>${formatCurrency(balance)}</strong></td>
            <td><span class="badge ${loan.status === 'paid' ? 'badge-paid' : 'badge-active'}">${loan.status.toUpperCase()}</span></td>
            <td>
                ${loan.status === 'active' ? `<button class="btn btn-sm btn-outline" onclick="openPaymentModal('${loan.id}')">Pay</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAllLoans() {
    const tbody = document.getElementById('all-loans-body');
    const emptyState = document.getElementById('empty-loans');
    tbody.innerHTML = '';

    if (appState.loans.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    const sortedLoans = [...appState.loans].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedLoans.forEach(loan => {
        const balance = getLoanBalance(loan);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(loan.date).toLocaleDateString()}</td>
            <td><strong>${getFriendName(loan.friendId)}</strong></td>
            <td>${loan.description}</td>
            <td>${formatCurrency(loan.amount)}</td>
            <td><strong>${formatCurrency(balance)}</strong></td>
            <td><span class="badge ${loan.status === 'paid' ? 'badge-paid' : 'badge-active'}">${loan.status.toUpperCase()}</span></td>
            <td>
                ${loan.status === 'active' ? `<button class="btn btn-sm btn-outline" onclick="openPaymentModal('${loan.id}')">Add Payment</button>` : '-'}
                <button class="btn btn-sm btn-outline" style="margin-left:5px; color:#ef4444; border-color: rgba(239,68,68,0.3)" onclick="deleteLoan('${loan.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderFriends() {
    const grid = document.getElementById('friends-grid');
    const emptyState = document.getElementById('empty-friends');
    grid.innerHTML = '';

    if (appState.friends.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    appState.friends.forEach(friend => {
        const friendLoans = appState.loans.filter(l => l.friendId === friend.id);
        const activeLoansCount = friendLoans.filter(l => l.status === 'active').length;
        
        let totalOwed = 0;
        friendLoans.forEach(l => {
            totalOwed += getLoanBalance(l);
        });

        const initial = friend.name.charAt(0).toUpperCase();

        const card = document.createElement('div');
        card.className = 'friend-card glass-panel';
        card.innerHTML = `
            <div class="friend-avatar">${initial}</div>
            <div class="friend-info">
                <h4>${friend.name}</h4>
                <div class="friend-stats">
                    ${activeLoansCount} active loans • ${formatCurrency(totalOwed)} owed
                </div>
            </div>
            <button class="btn btn-sm btn-outline" style="color:#ef4444; border-color: rgba(239,68,68,0.3); padding:8px;" onclick="deleteFriend('${friend.id}')"><i class="fa-solid fa-trash"></i></button>
        `;
        grid.appendChild(card);
    });
}

function populateFriendSelect() {
    const select = document.getElementById('loanFriend');
    select.innerHTML = '<option value="" disabled selected>Choose a friend...</option>';
    appState.friends.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        select.appendChild(opt);
    });
}

// Modals Setup
function setupModals() {
    const openModal = (modal) => {
        modalOverlay.style.display = 'block';
        modal.style.display = 'block';
        // Trigger reflow
        void modal.offsetWidth;
        modalOverlay.classList.add('show');
        modal.classList.add('show');
    };

    const closeModal = () => {
        const modals = [friendModal, loanModal, paymentModal];
        modalOverlay.classList.remove('show');
        modals.forEach(m => m.classList.remove('show'));
        
        setTimeout(() => {
            modalOverlay.style.display = 'none';
            modals.forEach(m => m.style.display = 'none');
        }, 300);
    };

    document.getElementById('addFriendBtn').addEventListener('click', () => {
        document.getElementById('friendForm').reset();
        openModal(friendModal);
    });

    document.getElementById('addLoanBtn').addEventListener('click', () => {
        if (appState.friends.length === 0) {
            alert("Please add a friend first!");
            return;
        }
        document.getElementById('loanForm').reset();
        document.getElementById('loanDate').value = new Date().toISOString().split('T')[0];
        openModal(loanModal);
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    modalOverlay.addEventListener('click', closeModal);

    // Expose openPaymentModal for dynamic buttons
    window.openPaymentModal = (loanId) => {
        const loan = appState.loans.find(l => l.id === loanId);
        if (!loan) return;
        
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
        
        document.getElementById('paymentLoanId').value = loanId;
        const balance = getLoanBalance(loan);
        document.getElementById('paymentOutstanding').textContent = formatCurrency(balance);
        document.getElementById('paymentAmount').max = balance;
        document.getElementById('paymentAmount').value = balance; // Default to full payment
        
        openModal(paymentModal);
    };
    
    window.closeModal = closeModal;
}

// Forms Submission
function setupForms() {
    // Add Friend
    document.getElementById('friendForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('friendName').value.trim();
        if (name) {
            appState.friends.push({
                id: 'f_' + Date.now(),
                name: name,
                createdAt: new Date().toISOString()
            });
            saveData();
            window.closeModal();
        }
    });

    // Add Loan
    document.getElementById('loanForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const friendId = document.getElementById('loanFriend').value;
        const amount = parseFloat(document.getElementById('loanAmount').value);
        const desc = document.getElementById('loanDesc').value.trim();
        const date = document.getElementById('loanDate').value;

        if (friendId && amount > 0 && desc && date) {
            appState.loans.push({
                id: 'l_' + Date.now(),
                friendId,
                amount,
                description: desc,
                date,
                status: 'active',
                createdAt: new Date().toISOString()
            });
            saveData();
            window.closeModal();
        }
    });

    // Add Payment
    document.getElementById('paymentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const loanId = document.getElementById('paymentLoanId').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const date = document.getElementById('paymentDate').value;
        
        const loan = appState.loans.find(l => l.id === loanId);
        const balance = getLoanBalance(loan);

        if (loanId && amount > 0 && amount <= balance && date) {
            appState.payments.push({
                id: 'p_' + Date.now(),
                loanId,
                amount,
                date,
                createdAt: new Date().toISOString()
            });
            // Update status if fully paid
            updateLoanStatus(loanId);
            window.closeModal();
        } else {
            alert('Invalid payment amount. Cannot exceed outstanding balance.');
        }
    });

    // Excel Export
    document.getElementById('downloadExcelBtn').addEventListener('click', generateExcelReport);
}

// Deletion
window.deleteLoan = (loanId) => {
    if(confirm('Are you sure you want to delete this loan? All associated payments will be deleted too.')) {
        appState.loans = appState.loans.filter(l => l.id !== loanId);
        appState.payments = appState.payments.filter(p => p.loanId !== loanId);
        saveData();
    }
}

window.deleteFriend = (friendId) => {
    const friendLoans = appState.loans.filter(l => l.friendId === friendId);
    if(friendLoans.length > 0) {
        if(!confirm('This friend has associated loans. Deleting the friend will delete ALL their loans and payments. Continue?')) {
            return;
        }
    }
    
    // Delete associated payments
    friendLoans.forEach(l => {
        appState.payments = appState.payments.filter(p => p.loanId !== l.id);
    });
    // Delete loans
    appState.loans = appState.loans.filter(l => l.friendId !== friendId);
    // Delete friend
    appState.friends = appState.friends.filter(f => f.id !== friendId);
    
    saveData();
}

// Reports Generation
function generateExcelReport() {
    if (appState.loans.length === 0) {
        alert("No data available to generate report.");
        return;
    }

    // Prepare Summary Sheet
    let totalLoaned = 0;
    let totalPaid = 0;
    appState.loans.forEach(l => totalLoaned += l.amount);
    appState.payments.forEach(p => totalPaid += p.amount);
    
    const summaryData = [
        ["Report Generated At", new Date().toLocaleString()],
        ["Total Loans Amount", totalLoaned],
        ["Total Payments Received", totalPaid],
        ["Total Outstanding", totalLoaned - totalPaid]
    ];

    // Prepare Loans Data
    const loansData = [
        ["Loan ID", "Date", "Friend", "Description", "Total Amount", "Paid Amount", "Remaining Balance", "Status"]
    ];

    appState.loans.forEach(loan => {
        const friendName = getFriendName(loan.friendId);
        const balance = getLoanBalance(loan);
        const paidAmount = loan.amount - balance;
        
        loansData.push([
            loan.id,
            loan.date,
            friendName,
            loan.description,
            loan.amount,
            paidAmount,
            balance,
            loan.status.toUpperCase()
        ]);
    });

    // Prepare Payments Data
    const paymentsData = [
        ["Payment ID", "Date", "Friend", "Loan Description", "Amount Paid"]
    ];

    appState.payments.forEach(payment => {
        const loan = appState.loans.find(l => l.id === payment.loanId);
        if (loan) {
            const friendName = getFriendName(loan.friendId);
            paymentsData.push([
                payment.id,
                payment.date,
                friendName,
                loan.description,
                payment.amount
            ]);
        }
    });

    // Create Workbook
    const wb = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const wsLoans = XLSX.utils.aoa_to_sheet(loansData);
    XLSX.utils.book_append_sheet(wb, wsLoans, "All Loans");

    const wsPayments = XLSX.utils.aoa_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(wb, wsPayments, "Payment History");

    // Download
    XLSX.writeFile(wb, "SyncLoan_Report.xlsx");
}
