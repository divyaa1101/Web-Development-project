










// Global State (Re-initialized here for clarity, but values are managed by runtime)
window.currentView = 'loading';
window.menuItems = [];
window.order = {}; // { itemId: quantity }
// window.currentUserId and window.db are set in index.html

const appContainer = document.getElementById('app');

// --- AUTHENTICATION FUNCTIONS ---

window.handleAuth = async (type) => {
    // Get Firebase services from global scope
    const db = window.getFirestore();
    const auth = window.getAuth();
    const appId = window.appId;

    const email = document.getElementById(type === 'register' ? 'registerEmail' : 'loginEmail').value;
    const password = document.getElementById(type === 'register' ? 'registerPassword' : 'loginPassword').value;
    const authMessage = document.getElementById(type === 'register' ? 'registerMessage' : 'loginMessage');

    authMessage.textContent = ''; // Clear previous messages

    if (!email || !password) {
        authMessage.textContent = 'Please enter both email and password.';
        return;
    }

    try {
        let userCredential;
        if (type === 'register') {
            userCredential = await window.createUserWithEmailAndPassword(auth, email, password);
            await window.setDoc(window.doc(db, "artifacts", appId, "users", userCredential.user.uid, "profile", "data"), {
                email: email,
                joined: new Date().toISOString()
            });
            window.showModal('Success!', 'Registration successful! Welcome to the Aesthetic Bean.', '<p class="text-center text-green-500">You are now logged in.</p>');
        } else {
            userCredential = await window.signInWithEmailAndPassword(auth, email, password);
        }
        // onAuthStateChanged listener handles view switching on successful sign-in
    } catch (error) {
        console.error("Auth error:", error);
        const errorMessage = error.message.replace('Firebase: ', '').split('(')[0].trim() || 'Authentication failed. Check your credentials.';
        authMessage.textContent = errorMessage;
    }
};

// --- FIRESTORE FUNCTIONS (Menu Management) ---

window.fetchMenu = async () => {
    const db = window.getFirestore();
    const appId = window.appId;

    if (!db || !window.isAuthReady) {
        console.warn("Firestore not ready or not authenticated. Cannot fetch menu.");
        return;
    }

    const menuRef = window.collection(db, "artifacts", appId, "public", "data", "menuItems");

    // Initial Seed Data (Run once if collection is empty)
    const snapshot = await window.getDocs(window.query(menuRef));
    if (snapshot.empty) {
        console.log("Seeding initial menu data...");
        const initialMenu = [
            { id: '1', name: 'Coffee: Lavender', price: 5.50, description: 'Earthy, floral, and caffeinated.', category: 'Brewed', emoji: '☕' },
            { id: '2', name: 'Matcha Latte', price: 6.00, description: 'Bright green goodness with oat milk.', category: 'Specialty', emoji: '🍵' },
            { id: '3', name: 'Caramel Macchiato', price: 6.50, description: 'Layers of espresso, milk, and sweet caramel.', category: 'Specialty', emoji: '🍮' },
            { id: '4', name: 'Chai Spiced Donut', price: 3.50, description: 'Soft donut with a spicy glaze.', category: 'Pastry', emoji: '🍩' },
            { id: '5', name: 'Avocado Toast', price: 9.00, description: 'Sourdough, smashed avocado, chili flakes.', category: 'Food', emoji: '🥑' },
            { id: '6', name: 'Chocolate Chip Cookie', price: 2.75, description: 'Classic, chewy, and warm.', category: 'Pastry', emoji: '🍪' },
        ];
        for (const item of initialMenu) {
            await window.setDoc(window.doc(menuRef, item.id), item);
        }
    }

    // Real-time listener for the menu
    const menuQuery = window.query(menuRef);
    window.onSnapshot(menuQuery, (snapshot) => {
        const menuData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        window.menuItems = menuData; // Store globally
        if (window.currentView === 'menu') {
            window.renderMenu(); // Re-render if we are on the menu page
        }
    }, (error) => {
        console.error("Error fetching menu:", error);
    });
};

// --- VIEW RENDERING LOGIC ---

window.renderView = (viewName) => {
    window.currentView = viewName;
    appContainer.innerHTML = ''; // Clear existing content

    if (viewName === 'login') {
        appContainer.innerHTML = renderLogin();
    } else if (viewName === 'register') {
        appContainer.innerHTML = renderRegister();
    } else if (viewName === 'menu') {
        appContainer.classList.remove('max-w-lg');
        appContainer.classList.add('md:max-w-4xl');
        appContainer.innerHTML = renderMenuShell();
        window.renderMenu(); // Fill the shell with data
    } else {
         appContainer.innerHTML = renderLoading();
    }
};

// --- UI TEMPLATES ---

const renderLoading = () => `
    <div class="flex flex-col items-center justify-center h-96">
        <svg class="animate-spin h-10 w-10" style="color: var(--color-primary);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4" style="color: var(--color-text);">Authenticating...</p>
    </div>
`;

const renderLogin = () => `
    <div class="p-6 md:p-10 w-full max-w-md mx-auto">
        <h2 class="text-4xl font-extrabold mb-4 text-center" style="color: var(--color-primary);">Login</h2>
        <p class="text-center text-gray-500 mb-8">Welcome back to your coffee break.</p>
        <form onsubmit="event.preventDefault(); handleAuth('login');" class="space-y-6">
            <div>
                <input type="email" id="loginEmail" placeholder="Email" class="aesthetic-input w-full" required>
            </div>
            <div>
                <input type="password" id="loginPassword" placeholder="Password" class="aesthetic-input w-full" required>
            </div>
            <p id="loginMessage" class="text-red-600 text-center text-sm"></p>
            <button type="submit" class="btn-primary w-full">Sign In</button>
        </form>
        <div class="mt-8 text-center text-gray-600">
            <p>New here? <a href="#" onclick="renderView('register')" class="font-semibold" style="color: var(--color-secondary);">Create an account!</a></p>
            <p class="mt-2 text-xs">User ID: <span style="color: var(--color-primary);">${window.currentUserId || 'N/A'}</span></p>
        </div>
    </div>
`;

const renderRegister = () => `
    <div class="p-6 md:p-10 w-full max-w-md mx-auto">
        <h2 class="text-4xl font-extrabold mb-4 text-center" style="color: var(--color-secondary);">Register</h2>
        <p class="text-center text-gray-500 mb-8">Let's get this aesthetic journey started.</p>
        <form onsubmit="event.preventDefault(); handleAuth('register');" class="space-y-6">
            <div>
                <input type="email" id="registerEmail" placeholder="Email" class="aesthetic-input w-full" required>
            </div>
            <div>
                <input type="password" id="registerPassword" placeholder="Password (min 6 chars)" class="aesthetic-input w-full" required>
            </div>
            <p id="registerMessage" class="text-red-600 text-center text-sm"></p>
            <button type="submit" class="btn-primary w-full">Register Account</button>
        </form>
        <div class="mt-8 text-center text-gray-600">
            <p>Already have an account? <a href="#" onclick="renderView('login')" class="font-semibold" style="color: var(--color-primary);">Sign In!</a></p>
            <p class="mt-2 text-xs">User ID: <span style="color: var(--color-secondary);">${window.currentUserId || 'N/A'}</span></p>
        </div>
    </div>
`;

const renderMenuShell = () => `
    <div class="flex flex-col md:flex-row h-full">
        <!-- Menu Section (Left on Desktop, Top on Mobile) -->
        <div class="md:w-3/5 p-4 md:p-6 overflow-y-auto max-h-[70vh] md:max-h-[90vh]">
            <h1 class="text-3xl font-black mb-1" style="color: var(--color-primary);">The Aesthetic Bean</h1>
            <p class="text-sm text-gray-500 mb-6">Curated drinks and treats. User: ${window.currentUserId}</p>
            
            <div id="menuList" class="space-y-4">
                <!-- Menu items will be injected here by renderMenu() -->
                <p class="text-center text-gray-400">Loading Menu...</p>
            </div>
        </div>

        <!-- Order/Cart Section (Right on Desktop, Bottom on Mobile) -->
        <div class="md:w-2/5 p-4 md:p-6 bg-gray-50 md:rounded-r-2xl border-t md:border-t-0 md:border-l border-gray-200">
            <h2 class="text-2xl font-bold mb-4" style="color: var(--color-secondary);">Your Vibe Check</h2>
            
            <div id="orderList" class="space-y-3 mb-6 overflow-y-auto max-h-48">
                <p class="text-gray-400 text-center mt-6">Your basket is empty. Add some flair!</p>
            </div>

            <div class="space-y-2 py-4 border-t border-gray-200">
                <div class="flex justify-between font-medium text-lg">
                    <span>Subtotal:</span>
                    <span id="subtotalAmount">$0.00</span>
                </div>
                <div class="flex justify-between font-bold text-xl" style="color: var(--color-text);">
                    <span>Total:</span>
                    <span id="totalAmount">$0.00</span>
                </div>
            </div>

            <button id="placeOrderButton" onclick="placeOrder()" class="w-full btn-primary mt-4 py-3 disabled:opacity-50" disabled>
                Place Order & Bill
            </button>
        </div>
    </div>
`;

window.renderMenu = () => {
    const menuList = document.getElementById('menuList');
    if (!menuList) return;

    // Group items by category
    const categories = window.menuItems.reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {});

    let menuHTML = '';
    for (const category in categories) {
        menuHTML += `<h3 class="text-xl font-bold mt-6 mb-3" style="color: var(--color-primary);">${category}</h3>`;
        categories[category].forEach(item => {
            const quantity = window.order[item.id] || 0;
            menuHTML += `
                <div class="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition duration-200">
                    <div class="flex items-center">
                        <span class="text-2xl mr-3">${item.emoji}</span>
                        <div>
                            <p class="font-semibold text-gray-800">${item.name}</p>
                            <p class="text-sm text-gray-500">${item.description}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-base font-bold text-gray-700">$${item.price.toFixed(2)}</span>
                        <button onclick="updateOrder('${item.id}', -1)" class="menu-control-btn menu-remove-btn" ${quantity === 0 ? 'disabled' : ''}>-</button>
                        <span class="w-6 text-center font-semibold">${quantity}</span>
                        <button onclick="updateOrder('${item.id}', 1)" class="menu-control-btn menu-add-btn">+</button>
                    </div>
                </div>
            `;
        });
    }
    menuList.innerHTML = menuHTML || '<p class="text-center text-gray-400">No items available yet.</p>';
    window.renderOrder();
};

window.renderOrder = () => {
    const orderList = document.getElementById('orderList');
    const subtotalAmount = document.getElementById('subtotalAmount');
    const totalAmount = document.getElementById('totalAmount');
    const placeOrderButton = document.getElementById('placeOrderButton');

    let subtotal = 0;
    let orderHTML = '';
    let orderCount = 0;

    const itemsInOrder = Object.keys(window.order).filter(id => window.order[id] > 0);

    if (itemsInOrder.length === 0) {
        orderList.innerHTML = '<p class="text-gray-400 text-center mt-6">Your basket is empty. Add some flair!</p>';
        subtotalAmount.textContent = '$0.00';
        totalAmount.textContent = '$0.00';
        placeOrderButton.disabled = true;
        return;
    }

    itemsInOrder.forEach(itemId => {
        const quantity = window.order[itemId];
        const item = window.menuItems.find(i => i.id === itemId);

        if (item && quantity > 0) {
            const itemTotal = quantity * item.price;
            subtotal += itemTotal;
            orderCount += quantity;

            orderHTML += `
                <div class="flex justify-between items-center p-3 rounded-lg order-item-card shadow-sm">
                    <div class="flex items-center">
                        <span class="text-xl mr-2">${item.emoji}</span>
                        <div>
                            <p class="text-sm font-medium text-gray-800">${item.name}</p>
                            <p class="text-xs text-gray-500">${quantity} x $${item.price.toFixed(2)}</p>
                        </div>
                    </div>
                    <span class="font-bold text-gray-900">$${itemTotal.toFixed(2)}</span>
                </div>
            `;
        }
    });

    orderList.innerHTML = orderHTML;

    // Tax calculation (simulated 8%)
    const taxRate = 0.08;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    subtotalAmount.textContent = `$${subtotal.toFixed(2)}`;
    // Display total with a small tax included (for simplicity)
    totalAmount.textContent = `$${total.toFixed(2)}`;

    placeOrderButton.disabled = orderCount === 0;
};

window.updateOrder = (itemId, change) => {
    let currentQuantity = window.order[itemId] || 0;
    let newQuantity = currentQuantity + change;

    if (newQuantity < 0) newQuantity = 0;

    if (newQuantity === 0) {
        delete window.order[itemId];
    } else {
        window.order[itemId] = newQuantity;
    }

    // Re-render both menu and order to reflect changes
    window.renderMenu();
};

// --- BILLING / MODAL LOGIC ---

window.placeOrder = () => {
    const totalElement = document.getElementById('totalAmount');
    const totalText = totalElement.textContent.replace('$', '');
    const finalTotal = parseFloat(totalText);

    if (Object.keys(window.order).length === 0) {
        window.showModal('Oops!', 'Your order is empty. Add something first!', '<p class="text-center text-red-500">Add an item to your cart.</p>');
        return;
    }

    let orderSummary = '<ul>';
    Object.keys(window.order).forEach(itemId => {
        const quantity = window.order[itemId];
        const item = window.menuItems.find(i => i.id === itemId);
        if (item && quantity > 0) {
            orderSummary += `<li class="text-left py-1 flex justify-between">
                <span class="text-gray-600">${quantity}x ${item.name}</span>
                <span class="font-semibold text-gray-900">$${(quantity * item.price).toFixed(2)}</span>
            </li>`;
        }
    });
    orderSummary += '</ul>';

    const paymentHTML = `
        <p class="text-lg font-bold text-center mb-4 border-b pb-2">Final Total: <span style="color: var(--color-primary);">$${finalTotal.toFixed(2)}</span></p>
        ${orderSummary}
        <div class="mt-4 space-y-2">
            <button class="w-full py-3 rounded-xl bg-green-500 text-white font-bold transition hover:bg-green-600">
                💳 Pay Online (Card/Wallet)
            </button>
            <button class="w-full py-3 rounded-xl bg-yellow-600 text-white font-bold transition hover:bg-yellow-700">
                💵 Pay Cash (In Person)
            </button>
        </div>
        <p class="text-xs text-center text-gray-500 mt-4">Order has been submitted for preparation.</p>
    `;

    // Reset order after simulation
    window.order = {};
    window.renderMenu();

    window.showModal('Order Placed!', `Your total is **$${finalTotal.toFixed(2)}**.`, paymentHTML);
};

window.showModal = (title, bodyText, paymentOptionsHTML) => {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyText;
    document.getElementById('paymentOptions').innerHTML = paymentOptionsHTML;
    document.getElementById('confirmationModal').classList.remove('hidden');
};

window.closeModal = () => {
    document.getElementById('confirmationModal').classList.add('hidden');
};

// Initial view load (This might be superseded by the Firebase listener in index.html, but acts as a fallback)
if (window.currentView === 'loading') {
     appContainer.innerHTML = renderLoading();
}



