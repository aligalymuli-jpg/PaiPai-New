/* ============================================================
   js/app.js — Меню, категории, поиск, модалка товара
   ============================================================ */
'use strict';

let products        = [];
let currentCategory = 'all';
const ADMIN_HASH    = '#paiSecretKey2026';

const TYPE_LABELS = {
    meat:'🥩 Мясо', chicken:'🍗 Курица',
    dough:'🥟 Мучное', steam:'💨 На пару', veg:'🌿 Постное',
};

/* ── ЗАГРУЗКА ──────────────────────────────────────────── */
async function loadData() {
    try {
        const snap = await database.ref('products').once('value');
        const raw  = snap.val();
        products = raw
            ? Object.keys(raw).map(k => {
                const p = { ...raw[k], id: k };
                if (!p.cat && p.category) p.cat = p.category;
                return p;
              })
            : [];

        updateBadge();
        hidePreloader();
        checkWorkStatus();
        startVideo();

    } catch (err) {
        console.error('loadData:', err);
        hidePreloader();
    }
}

function hidePreloader() {
    const el = document.getElementById('preloader');
    if (!el) return;
    el.classList.add('hidden');
    setTimeout(() => { el.style.display = 'none'; }, 700);
}

function startVideo() {
    const v = document.getElementById('bg-video');
    if (!v) return;
    v.load();
    const p = v.play();
    if (p) p.catch(() => {});
}

function checkWorkStatus() {
    const el = document.getElementById('work-status-badge');
    if (!el) return;
    const h = new Date(Date.now() + 5 * 3600000).getUTCHours();
    el.innerHTML = (h >= 8 && h < 22)
        ? `<span style="color:#3dba72"><i class="fas fa-circle" style="font-size:.5rem;vertical-align:middle;margin-right:6px;"></i>МЫ ОТКРЫТЫ</span>`
        : `<span style="color:#e74c3c"><i class="fas fa-clock" style="margin-right:5px;"></i>ЗАКРЫТО · 8:00—22:00</span>`;
}

/* ── КАТЕГОРИИ ─────────────────────────────────────────── */
window.showCategories = function() {
    document.getElementById('categories-screen').style.display = 'flex';
    document.getElementById('menu-screen').style.display = 'none';
    currentCategory = 'all';
};

window.filterCat = function(cat, btn) {
    currentCategory = cat;
    document.getElementById('categories-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';

    const t = document.getElementById('current-category-title');
    if (t) t.textContent = btn.querySelector('span').innerText;

    const s = document.getElementById('menu-search');
    if (s) s.value = '';

    renderTypeFilters(cat);
    renderMenu(cat);

    const sec = document.getElementById('menu-section');
    if (sec) window.scrollTo({ top: sec.offsetTop - 20, behavior: 'smooth' });
};

/* ── ФИЛЬТРЫ ПО ТИПУ ───────────────────────────────────── */
function renderTypeFilters(cat) {
    const wrap = document.getElementById('type-filters');
    if (!wrap) return;
    wrap.innerHTML = '';

    const catProds = products.filter(p => p.cat === cat && p.available !== false);
    const types    = [...new Set(catProds.map(p => p.type).filter(Boolean))];
    if (!types.length) return;

    const mkBtn = (label, active, onClick) => {
        const b = document.createElement('button');
        b.className = 'type-btn' + (active ? ' active' : '');
        b.textContent = label;
        b.onclick = onClick;
        return b;
    };

    const allBtn = mkBtn('Все', true, () => {
        wrap.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        renderMenu(cat);
    });
    wrap.appendChild(allBtn);

    types.forEach(type => {
        const btn = mkBtn(TYPE_LABELS[type] || type, false, () => {
            wrap.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu(null, catProds.filter(p => p.type === type));
        });
        wrap.appendChild(btn);
    });
}

/* ── РЕНДЕР МЕНЮ ───────────────────────────────────────── */
window.renderMenu = function(category = 'all', filtered = null) {
    const container = document.getElementById('menu-container');
    if (!container) return;

    const isAdmin = window.location.hash === ADMIN_HASH;

    let data = filtered
        ? filtered
        : (category === 'all' ? products : products.filter(p => p.cat === category));

    if (!isAdmin) data = data.filter(p => p.available !== false);

    if (!data.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-leaf"></i><p>Пока пусто...</p></div>`;
        return;
    }

    container.innerHTML = data.map((p, i) => buildCard(p, isAdmin, i)).join('');

    // Lazy load картинок
    container.querySelectorAll('[data-src]').forEach(img => lazyLoad(img));
};

/* ── КАРТОЧКА ТОВАРА ────────────────────────────────────── */
function buildCard(p, isAdmin, idx) {
    const countTag = p.count ? `<div class="p-tag-count">${p.count}</div>` : '';
    const badge    = p.badge === 'hit'
        ? `<div class="product-badge badge-hit">ХИТ 🔥</div>`
        : p.badge === 'new'
            ? `<div class="product-badge badge-new">НОВИНКА ✨</div>`
            : '';

    const unavailClass = (p.available === false) ? ' unavail' : '';

    const adminBtns = isAdmin ? `
        <div style="display:flex;gap:5px;margin-bottom:7px;">
            <button class="add-btn" style="background:${p.available===false?'#3dba72':'#e74c3c'};font-size:.68rem;padding:7px 6px;"
                onclick="event.stopPropagation();toggleAvail('${p.id}',${p.available!==false})">
                ${p.available === false ? 'ВЕРНУТЬ' : 'СТОП'}
            </button>
            <button class="add-btn" style="background:#3498db;font-size:.68rem;padding:7px 6px;"
                onclick="event.stopPropagation();quickEdit('${p.id}')">РЕД.</button>
        </div>` : '';

    // delay через inline style чтобы работало внутри innerHTML
    const delay = Math.min(0.04 + idx * 0.04, 0.36);

    return `
    <div class="product-card${unavailClass}" style="animation-delay:${delay}s"
         onclick="openModal('${p.id}')">
        <div class="img-wrapper">
            <div class="img-skeleton" id="sk_${p.id}"></div>
            <img data-src="${esc(p.img)}" alt="${esc(p.name)}" src="">
            ${countTag}${badge}
        </div>
        <div class="product-info">
            <h3>${esc(p.name)}</h3>
            <div class="product-price">${p.price} ₸</div>
            ${adminBtns}
            <button class="add-btn"
                onclick="event.stopPropagation(); addToCart('${p.id}', this)">
                <i class="fas fa-plus"></i> В КОРЗИНУ
            </button>
        </div>
    </div>`;
}

/* ── LAZY LOAD + SKELETON ──────────────────────────────── */
const observer = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            loadImg(e.target);
            obs.unobserve(e.target);
        });
    }, { rootMargin: '200px' })
    : null;

function lazyLoad(img) {
    if (observer) observer.observe(img);
    else loadImg(img);
}

function loadImg(img) {
    const src = img.dataset.src;
    if (!src) return;
    img.src = src;
    img.onload = () => {
        img.classList.add('loaded');
        const sk = img.closest('.img-wrapper')?.querySelector('.img-skeleton');
        if (sk) sk.classList.add('done');
    };
    img.onerror = () => {
        img.src = 'https://placehold.co/400x300/0d1a10/c48c5d?text=Bakery+Aigul';
        img.classList.add('loaded');
        const sk = img.closest('.img-wrapper')?.querySelector('.img-skeleton');
        if (sk) sk.classList.add('done');
    };
}
/* ── МОДАЛКА ТОВАРА ─────────────────────────────────────── */
/* Категории, где кросс-сейл принудительно скрыт */
const UPSELL_SKIP_CATS = new Set(['semi', 'pies', 'sweet_pies', 'sets']);

window.openModal = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;

    const overlay = document.getElementById('productModal');
    if (!overlay) return;

    const mImg = document.getElementById('modalImg');
    mImg.src = p.img || '';
    mImg.onerror = () => { mImg.src = 'https://placehold.co/470x240/0d1a10/c48c5d?text=Bakery+Aigul'; };

    document.getElementById('modalName').textContent  = p.name;
    document.getElementById('modalDesc').textContent  = p.desc  || 'Традиционный рецепт Bakery Aigul.';
    document.getElementById('modalCount').textContent = p.count ? '🍴 ' + p.count : '';
    document.getElementById('modalPrice').textContent = p.price + ' ₸';

    /* ── КРОСС-СЕЙЛ ─────────────────────────────────────────── */
    const uContainer = document.getElementById('upsell-container');
    const canUpsell  = p.showUpsell === true && !UPSELL_SKIP_CATS.has(p.cat);

    if (canUpsell && Array.isArray(p.upsellItems) && p.upsellItems.length) {
        const extras = p.upsellItems
            .map(uid => products.find(x => x.id === uid && x.available !== false))
            .filter(Boolean)
            .slice(0, 4);

        uContainer.innerHTML = extras.length ? `
            <p class="upsell-title">С этим часто берут:</p>
            <div class="upsell-list">
                ${extras.map(x => `
                <div class="upsell-item" onclick="addToCart('${x.id}')">
                    <img src="${esc(x.img)}" alt="${esc(x.name)}"
                         onerror="this.src='https://placehold.co/80/0d1a10/c48c5d?text=P'">
                    <div class="upsell-name">${esc(x.name)}</div>
                    <div class="upsell-price">+${x.price} ₸</div>
                </div>`).join('')}
            </div>` : '';
    } else {
        uContainer.innerHTML = '';
    }

    document.getElementById('modalAddBtn').onclick = () => {
        addToCart(id);
        closeModalOverlay();   // фикс ghost-click из Задачи 3
    };

    overlay.style.display = 'flex';
};

/* ── ЗАКРЫТИЕ МОДАЛКИ (без ghost-click на мобиле) ──────────── */
function closeModalOverlay() {
    const overlay = document.getElementById('productModal');
    if (!overlay) return;
    overlay.style.pointerEvents = 'none';       // мгновенно блокируем тапы
    setTimeout(() => {
        overlay.style.display       = 'none';
        overlay.style.pointerEvents = '';
    }, 60);                                     // 60ms > задержка синтетического click на iOS
}

window.closeModal = (e) => {
    if (e.target.id !== 'productModal') return;
    e.preventDefault();
    e.stopPropagation();
    closeModalOverlay();
};

/* ── ПОИСК ─────────────────────────────────────────────── */
window.searchMenu = function() {
    const q = (document.getElementById('menu-search')?.value || '').toLowerCase().trim();
    if (!q) { renderMenu(currentCategory); return; }
    const res = products.filter(p =>
        p.name.toLowerCase().includes(q) &&
        (currentCategory === 'all' || p.cat === currentCategory) &&
        p.available !== false
    );
    renderMenu(null, res);
};

/* ── ADMIN HELPERS ──────────────────────────────────────── */
window.toggleAvail = async (id, cur) => {
    if (!confirm('Изменить наличие?')) return;
    await database.ref('products/' + id).update({ available: !cur });
    await loadData();
    renderMenu(currentCategory);
};

window.quickEdit = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const n  = prompt('Название:', p.name);
    const pr = prompt('Цена:', p.price);
    if (n && pr && !isNaN(+pr)) {
        database.ref('products/' + id)
            .update({ name: n.trim(), price: +pr })
            .then(() => loadData().then(() => renderMenu(currentCategory)));
    }
};

/* ── УТИЛИТА ────────────────────────────────────────────── */
function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.getProducts = () => products;

/* ── СТАРТ ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', loadData);
