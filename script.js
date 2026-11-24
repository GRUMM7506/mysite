// ========================================
// НАСТРОЙКИ СТАТУСА
// Сам статус (цвет и текст) редактируется в index.html, блок #status.
// Здесь — только то, что подставляется автоматически.
// ========================================
const CONFIG = {
    timeZone: 'Asia/Dushanbe',   // часовой пояс для строки «Время»
    onlineHours: [9, 23],        // с какого по какой час вы обычно на связи
    githubUser: 'GRUMM7506',     // чья активность показывается в строке «GitHub»
};

document.documentElement.classList.add('js');

// ========================================
// СТАТУС: плашка в шапке повторяет табло
// ========================================
const board = document.getElementById('status');
const pill = document.getElementById('statusPill');

if (board && pill) {
    pill.dataset.state = board.dataset.state || 'away';
    document.getElementById('statusPillText').textContent =
        document.getElementById('statusLabel').textContent.trim();
    pill.hidden = false;
}

// ========================================
// СТАТУС: местное время
// ========================================
const timeRow = document.getElementById('timeRow');

function updateLocalTime() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone: CONFIG.timeZone,
    }).formatToParts(now);

    const hour = Number(parts.find(p => p.type === 'hour').value);
    const minute = parts.find(p => p.type === 'minute').value;
    const [from, to] = CONFIG.onlineHours;

    document.getElementById('localTime').textContent =
        `${String(hour).padStart(2, '0')}:${minute}`;
    document.getElementById('timeHint').textContent =
        hour >= from && hour < to ? '· обычно на связи' : '· ночь, отвечу утром';
    timeRow.hidden = false;
}

if (timeRow) {
    try {
        updateLocalTime();
        setInterval(updateLocalTime, 30 * 1000);
    } catch (e) {
        // Браузер не знает часовой пояс — строка просто остаётся скрытой
    }
}

// ========================================
// СТАТУС: последняя активность на GitHub
// Публичный API без ключа (60 запросов в час с одного IP),
// поэтому ответ кэшируется на время сессии. При любой ошибке
// в строке остаётся обычная ссылка на профиль.
// ========================================
function timeAgo(date) {
    const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });
    const minutes = Math.round((date - Date.now()) / 60000);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return rtf.format(days, 'day');
    return rtf.format(Math.round(days / 30), 'month');
}

function showGithubActivity(activity) {
    const link = document.getElementById('ghActivity');
    const date = new Date(activity.at);
    if (!link || !activity.repo || isNaN(date)) return;

    const repoName = activity.repo.split('/').pop();
    const verb = activity.type === 'PushEvent' ? 'пуш в' : 'активность в';
    link.textContent = `${verb} ${repoName} · ${timeAgo(date)}`;
    link.href = `https://github.com/${activity.repo}`;
}

async function loadGithubActivity() {
    const cacheKey = `gh-activity:${CONFIG.githubUser}`;
    try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) return showGithubActivity(JSON.parse(cached));
    } catch (e) {}

    try {
        const res = await fetch(
            `https://api.github.com/users/${CONFIG.githubUser}/events/public?per_page=30`
        );
        if (!res.ok) return;
        const events = await res.json();
        if (!Array.isArray(events) || events.length === 0) return;

        const event = events.find(e => e.type === 'PushEvent') || events[0];
        const activity = { type: event.type, repo: event.repo.name, at: event.created_at };
        showGithubActivity(activity);
        try {
            sessionStorage.setItem(cacheKey, JSON.stringify(activity));
        } catch (e) {}
    } catch (e) {
        // Нет сети или сработал лимит API — оставляем ссылку на профиль
    }
}

loadGithubActivity();

// ========================================
// ТЕМА
// ========================================
const themeToggle = document.getElementById('themeToggle');

themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const current = root.dataset.theme ||
        (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = current === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
        localStorage.setItem('theme', next);
    } catch (e) {}
});

// ========================================
// МОБИЛЬНОЕ МЕНЮ
// ========================================
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

function setMenu(open) {
    nav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
}

menuToggle.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
nav.addEventListener('click', e => {
    if (e.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') setMenu(false);
});

// ========================================
// ПОДСВЕТКА ТЕКУЩЕГО РАЗДЕЛА В МЕНЮ
// ========================================
const navLinks = new Map(
    [...nav.querySelectorAll('a')].map(a => [a.getAttribute('href').slice(1), a])
);

const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.removeAttribute('aria-current'));
        const link = navLinks.get(entry.target.id);
        if (link) link.setAttribute('aria-current', 'true');
    });
}, { rootMargin: '-40% 0px -55% 0px' });

document.querySelectorAll('.stop').forEach(section => spy.observe(section));

// ========================================
// ПОЯВЛЕНИЕ БЛОКОВ ПРИ ПРОКРУТКЕ
// ========================================
const revealTargets = document.querySelectorAll(
    '.stop-head, .project, .repos li, .skills > li, .plan li, .edu, .contacts li, .cta'
);

const revealer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealer.unobserve(entry.target);
    });
}, { rootMargin: '0px 0px -8% 0px' });

revealTargets.forEach(el => {
    el.classList.add('reveal');
    revealer.observe(el);
});

// ========================================
// ГОД В ПОДВАЛЕ
// ========================================
document.getElementById('year').textContent = new Date().getFullYear();
