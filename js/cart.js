/* ============================================================
   js/cart.js — Корзина (модальное окно) + WhatsApp
   ============================================================ */
'use strict';

const CART_KEY = 'pai_pai_cart';
const WA_PHONE = '77080396799';   // новый номер администратора

/* ── ЗАГРУЗКА / СОХРАНЕНИЕ ─────────────────────────────── */
function cartLoad() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
}
function cartSave(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* ── ОБНОВИТЬ СЧЁТЧИК + BUMP ───────────────────────────── */
function updateBadge() {
    const cart    = cartLoad();
    const countEl = document.getElementById('cart-count');
    if (!countEl) return;
    const total = cart.reduce((s, i) => s + i.qty, 0);
    countEl.textContent = total;
    countEl.style.display = total > 0 ? 'flex' : 'none';

    // Bump иконки корзины
    const navBtn = document.querySelector('.cart-nav-btn');
    if (navBtn && total > 0) {
        navBtn.classList.remove('bumping');
        void navBtn.offsetWidth;           // reflow
        navBtn.classList.add('bumping');
    }
}

/* ── ДОБАВИТЬ В КОРЗИНУ ────────────────────────────────── */
function addToCart(id, btnEl) {
    let cart = cartLoad();
    const products = window.getProducts ? window.getProducts() : [];
    const p = products.find(item => item.id === id);
    if (!p) return;

    const existing = cart.find(item => item.id === id);
    if (existing) { existing.qty++; }
    else { cart.push({ id: p.id, name: p.name, price: parseInt(p.price, 10), img: p.img || '', qty: 1 }); }

    cartSave(cart);
    updateBadge();

    // Кнопка: "ДОБАВЛЕНО! ✨" на 800мс — корзина НЕ открывается
    if (btnEl) {
        const orig = btnEl.innerHTML;
        btnEl.innerHTML = '✨ ДОБАВЛЕНО!';
        btnEl.classList.add('added');
        btnEl.disabled = true;
        setTimeout(() => {
            btnEl.innerHTML = orig;
            btnEl.classList.remove('added');
            btnEl.disabled = false;
        }, 800);
    }
}

/* ── ИЗМЕНИТЬ КОЛИЧЕСТВО ───────────────────────────────── */
function changeQty(index, delta) {
    let cart = cartLoad();
    cart[index].qty += delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    cartSave(cart);
    updateBadge();
    renderOrderCart();   // перерисовываем список в модалке
}

/* ── ОТКРЫТЬ МОДАЛКУ ЗАКАЗА ────────────────────────────── */
function sendOrder() {
    renderOrderCart();
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'flex';
}

/* ── РЕНДЕР КОРЗИНЫ В МОДАЛКЕ ─────────────────────────── */
function renderOrderCart() {
    const cart      = cartLoad();
    const container = document.getElementById('cart-content');
    const footer    = document.getElementById('cart-footer');
    const totalEl   = document.getElementById('order-total-val');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>Корзина пуста</p>
            </div>`;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';

    let total = 0;
    container.innerHTML = cart.map((item, i) => {
        total += item.price * item.qty;
        return `
        <div class="cart-row">
            <img src="${esc(item.img)}" alt="${esc(item.name)}"
                 onerror="this.src='https://placehold.co/100/0d1a10/c48c5d?text=Pai'">
            <div class="cart-row-info">
                <h4>${esc(item.name)}</h4>
                <p>${item.price} ₸</p>
            </div>
            <div class="qty-ctrl">
                <button class="qty-btn" onclick="changeQty(${i}, -1)">−</button>
                <span class="qty-num">${item.qty}</span>
                <button class="qty-btn" onclick="changeQty(${i},  1)">+</button>
            </div>
        </div>`;
    }).join('');

    if (totalEl) totalEl.textContent = total.toLocaleString('ru') + ' ₸';
}

/* ── ПОДТВЕРДИТЬ И ОТПРАВИТЬ В WHATSAPP ────────────────── */
function confirmAndSendOrder() {
    const cart    = cartLoad();
    const address = (document.getElementById('order-address')?.value || '').trim();
    const persons = document.getElementById('order-persons')?.value || '1';

    if (cart.length === 0) { alert('Корзина пуста!'); return; }
    if (!address)           { alert('Укажите адрес доставки!'); document.getElementById('order-address')?.focus(); return; }

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

    let msg = '🌿 *НОВЫЙ ЗАКАЗ — PAI PAI* 🌿\n';
    msg += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    msg += '🍽 *Состав заказа:*\n\n';
    cart.forEach((item, idx) => {
        const sub = item.price * item.qty;
        msg += `  ${idx + 1}. ${item.name}\n`;
        msg += `      ${item.qty} шт × ${item.price.toLocaleString('ru')} ₸ = *${sub.toLocaleString('ru')} ₸*\n\n`;
    });
    msg += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
    msg += `💰 *ИТОГО: ${total.toLocaleString('ru')} ₸*\n`;
    msg += '━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    msg += `📍 *Адрес:* ${address}\n`;
    msg += `🍴 *Приборов:* ${persons} чел.\n\n`;
    msg += '☀️ Спасибо за заказ! Ждём подтверждения!';

    window.open(
        `https://api.whatsapp.com/send?phone=${WA_PHONE}&text=${encodeURIComponent(msg)}`,
        '_blank'
    );
}

/* ── УТИЛИТА ────────────────────────────────────────────── */
function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── ГЛОБАЛЬНЫЕ ХЭЛПЕРЫ ────────────────────────────────── */
window.addToCart           = addToCart;
window.changeQty           = changeQty;
window.sendOrder           = sendOrder;
window.confirmAndSendOrder = confirmAndSendOrder;
window.updateBadge         = updateBadge;
window.cartLoad            = cartLoad;
window.cartSave            = cartSave;
