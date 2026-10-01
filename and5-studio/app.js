/* ============================================================
   And5 Studio — логіка сайту: маршрутизація між «вкладками»,
   переходи, фільтри, лічильники, форма заявки.
   ============================================================ */
(() => {
  'use strict';
  document.documentElement.classList.add('js');

  // якщо в data.js чогось немає або масив порожній — сайт не ламається,
  // просто відповідний блок не показується
  ['news', 'works', 'team', 'stats', 'services', 'faq', 'steps', 'formTopics', 'ticker'].forEach((key) => {
    if (!Array.isArray(AND5[key])) AND5[key] = [];
  });
  if (!AND5.studio) AND5.studio = {};

  /* ---------- дрібні хелпери ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const MONTHS_GEN = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const MONTHS_SHORT = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
  const MONTHS_NOM = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

  // Telegram можна задати як @нік, так і повним посиланням
  const isUrl = (v) => /^https?:/i.test(String(v || ''));
  const tgUrl = (v) => (isUrl(v) ? v : `https://t.me/${String(v || '').replace('@', '')}`);
  const tgLabel = (v) => (isUrl(v) ? '@' + String(v).replace(/\/+$/, '').split('/').pop() : v);

  const parseDate = (str) => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); };
  const dateLong = (str) => { const d = parseDate(str); return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`; };
  const dateDay = (str) => parseDate(str).getDate();
  const dateMonth = (str) => MONTHS_SHORT[parseDate(str).getMonth()];

  const ROUTES = ['home', 'news', 'works', 'team', 'contacts'];
  const TITLES = {
    home: 'And5 Studio — студія українського дубляжу',
    news: 'Новини — And5 Studio',
    works: 'Роботи — And5 Studio',
    team: 'Команда — And5 Studio',
    contacts: 'Контакти — And5 Studio'
  };

  const view = $('#view');
  const wipe = $('#wipe');
  const topbar = $('#topbar');
  const nav = $('#nav');
  const navPill = $('#navPill');
  const burger = $('#burger');
  const toast = $('#toast');

  let currentRoute = null;
  let busy = false;
  let observer = null;

  /* ---------- іконки ---------- */
  const icon = {
    arrow: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M21.6 4.3 2.9 11.5c-1 .4-1 1.7 0 2l4.3 1.4 1.6 5c.3.9 1.4 1.1 2 .3l2.4-2.6 4.4 3.2c.7.5 1.8.1 2-.8l2.7-12.9c.2-1-.8-1.8-1.7-1.4ZM9.6 14.5l-.3 3.2-1.1-3.4 8-5.6-6.6 5.8Z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M21.6 7.2c-.2-1.3-.9-2.1-2.1-2.3C17.6 4.6 14.9 4.6 12 4.6s-5.6 0-7.5.3C3.3 5.1 2.6 5.9 2.4 7.2 2.2 8.5 2.2 10 2.2 12s0 3.5.2 4.8c.2 1.3.9 2.1 2.1 2.3 1.9.3 4.6.3 7.5.3s5.6 0 7.5-.3c1.2-.2 1.9-1 2.1-2.3.2-1.3.2-2.8.2-4.8s0-3.5-.2-4.8ZM10.2 15.3V8.7L15.8 12l-5.6 3.3Z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M19.5 5.6A16 16 0 0 0 15.6 4.3l-.3.6c1.3.3 2.4.8 3.4 1.5a13.7 13.7 0 0 0-11.4 0c1-.7 2.1-1.2 3.4-1.5l-.3-.6A16 16 0 0 0 4.5 5.6C1.8 9.6 1 13.6 1.4 17.5a16.4 16.4 0 0 0 5 2.5l.7-1.1c-.6-.2-1.2-.5-1.8-.9l.4-.3a11.8 11.8 0 0 0 10.6 0l.4.3c-.6.4-1.2.7-1.8.9l.7 1.1a16.4 16.4 0 0 0 5-2.5c.5-4.5-.9-8.5-3.1-11.9ZM8.7 15c-.9 0-1.6-.8-1.6-1.8s.7-1.9 1.6-1.9 1.6.9 1.6 1.9S9.6 15 8.7 15Zm6.6 0c-.9 0-1.6-.8-1.6-1.8s.7-1.9 1.6-1.9 1.6.9 1.6 1.9-.7 1.8-1.6 1.8Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m3.5 7.5 8.5 6 8.5-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M16.5 3h-2.8v11.4a2.6 2.6 0 1 1-2.6-2.6c.2 0 .4 0 .6.1V9a5.4 5.4 0 1 0 4.8 5.4V8.7c1 .7 2.1 1.1 3.4 1.2V7.1a4.4 4.4 0 0 1-3.4-2.1 4.6 4.6 0 0 1-.6-2Z"/></svg>',
    soundcloud: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M6.6 19h11.1a4.3 4.3 0 0 0 .4-8.6 6 6 0 0 0-11.3 1.5A3.6 3.6 0 0 0 6.6 19Z"/><path d="M8 9v5.6M10.8 7.4v7.2M13.6 8.6v6M16.4 9.8v4.8" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none"/></svg>',
    donate: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M12 20.5C6.5 16.9 3 13.6 3 9.9 3 7.2 5.1 5.1 7.7 5.1c1.6 0 3.1.8 4.3 2.3 1.2-1.5 2.7-2.3 4.3-2.3 2.6 0 4.7 2.1 4.7 4.8 0 3.7-3.5 7-9 10.6Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
  };

  /* ---------- спільні блоки ---------- */
  function pageHead({ kicker, title, lead, extra = '' }) {
    return `
      <header class="page-head">
        <p class="kicker reveal" style="--i:0">${esc(kicker)}</p>
        <h1 class="page-head__title reveal" style="--i:1">${title}</h1>
        ${lead ? `<p class="page-head__lead reveal" style="--i:2">${esc(lead)}</p>` : ''}
        ${extra}
      </header>`;
  }

  function socialButtons(extraClass = '') {
    const s = AND5.studio;
    const items = [];
    if (s.telegram) items.push(['telegram', tgLabel(s.telegram), tgUrl(s.telegram)]);
    if (s.discord) items.push(['discord', 'Discord', isUrl(s.discord) ? s.discord : '#/contacts']);
    if (s.youtube) items.push(['youtube', 'YouTube', s.youtube]);
    if (s.tiktok) items.push(['tiktok', 'TikTok', s.tiktok]);
    if (s.soundcloud) items.push(['soundcloud', 'SoundCloud', s.soundcloud]);
    if (s.instagram) items.push(['instagram', 'Instagram', s.instagram]);
    if (s.donate) items.push(['donate', 'Donatello', s.donate]);
    if (s.email) items.push(['mail', s.email, `mailto:${s.email}`]);
    return items.map(([ic, label, href]) => `
      <a class="social ${extraClass}" href="${esc(href)}" ${href.startsWith('http') || href.startsWith('mailto') ? 'target="_blank" rel="noopener"' : ''}>
        ${icon[ic]}<span>${esc(label)}</span>
      </a>`).join('');
  }

  function emptyNotice(title, text, cta) {
    return `
      <div class="notice io">
        <h3>${esc(title)}</h3>
        <p>${esc(text)}</p>
        ${cta ? `<a class="btn" href="${esc(cta[1])}">${esc(cta[0])} ${icon.arrow}</a>` : ''}
      </div>`;
  }

  // блок «Про студію» на головній: текст + фото з процесу роботи
  function aboutBlock() {
    const a = AND5.about || {};
    const gallery = (a.gallery || []).filter((g) => g && g.src);
    if (!a.title && !a.text && !gallery.length) return '';
    return `
        <section class="section">
          <div class="shell about">
            <div class="about__text">
              ${a.kicker ? `<p class="kicker reveal" style="--i:0">${esc(a.kicker)}</p>` : ''}
              ${a.title ? `<h2 class="reveal" style="--i:1">${esc(a.title)}</h2>` : ''}
              ${a.text ? `<p class="about__lead reveal" style="--i:2">${esc(a.text)}</p>` : ''}
              ${a.text2 ? `<p class="reveal" style="--i:3">${esc(a.text2)}</p>` : ''}
            </div>
            ${gallery.length ? `
            <div class="gallery">
              ${gallery.map((g, i) => `
                <figure class="io" style="--i:${i}">
                  <img src="${esc(g.src)}" alt="${esc(g.caption || 'Процес роботи')}" loading="lazy" />
                  ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}
                </figure>`).join('')}
            </div>` : ''}
          </div>
        </section>`;
  }

  function workCard(w, i = 0) {
    const inProgress = w.status === 'У роботі' || w.status === 'Готується';
    const badge = w.status === 'Вийшло' ? 'is-done' : (w.status === 'У роботі' ? 'is-wip' : 'is-soon');
    return `
      <article class="work io" style="--i:${i}" data-category="${esc(w.category)}">
        <div class="work__cover${w.cover ? ' is-poster' : ''}" style="--accent:${esc(w.accent)}">
          ${w.cover
            ? `<img class="work__img" src="${esc(w.cover)}" alt="Обкладинка: ${esc(w.title)}" loading="lazy" />`
            : `<span class="work__letter" aria-hidden="true">${esc(w.letter)}</span>`}
          <span class="badge ${badge}">${esc(w.status)}</span>
          <span class="work__year">${esc(String(w.year))}</span>
        </div>
        <div class="work__body">
          <p class="work__cat">${esc(w.category)}</p>
          <h3 class="work__title">${esc(w.title)}</h3>
          <p class="work__role">${esc(w.role)}</p>
          ${w.note ? `<p class="work__note">${esc(w.note)}</p>` : ''}
          ${inProgress && w.progress ? `
            <div class="progress-bar" role="img" aria-label="Готовність ${w.progress}%">
              <span style="--p:${w.progress}%"><i>${esc(String(w.progress))}%</i></span>
            </div>` : ''}
          ${w.link ? `<a class="link-arrow work__link" href="${esc(w.link)}" target="_blank" rel="noopener">Дивитися ${icon.arrow}</a>` : ''}
          <ul class="chips chips--tiny">${(w.tags || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
      </article>`;
  }

  function newsItem(n, i = 0) {
    return `
      <article class="news io${n.featured ? ' news--featured' : ''}" style="--i:${i}" data-tag="${esc(n.tag)}">
        <div class="news__date" aria-hidden="true">
          <strong>${dateDay(n.date)}</strong>
          <span>${dateMonth(n.date)}</span>
        </div>
        <div class="news__body">
          <div class="news__meta">
            <span class="tag">${esc(n.tag)}</span>
            <time datetime="${esc(n.date)}">${dateLong(n.date)}</time>
          </div>
          <h3 class="news__title">${esc(n.title)}</h3>
          <p class="news__text">${esc(n.excerpt)}</p>
          <a class="link-arrow" href="${esc(n.link || '#/news')}"${isUrl(n.link) ? ' target="_blank" rel="noopener"' : ''}>${/youtu/i.test(n.link || '') ? 'Дивитися' : 'Детальніше'} ${icon.arrow}</a>
        </div>
      </article>`;
  }

  function ctaBand(title, text, primary = ['Замовити дубляж', '#/contacts'], secondary = ['Дивитись роботи', '#/works']) {
    return `
      <section class="cta io">
        <div class="cta__inner">
          <div>
            <h2>${esc(title)}</h2>
            <p>${esc(text)}</p>
          </div>
          <div class="cta__actions">
            <a class="btn" href="${esc(primary[1])}">${esc(primary[0])} ${icon.arrow}</a>
            <a class="btn btn--ghost-light" href="${esc(secondary[1])}">${esc(secondary[0])}</a>
          </div>
        </div>
      </section>`;
  }

  /* ---------- сторінки ---------- */
  const pages = {

    /* ===== ГОЛОВНА ===== */
    home() {
      const s = AND5.studio;
      const bars = Array.from({ length: 34 }, (_, i) => {
        const h = 22 + Math.round(70 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.35)));
        return `<span style="--h:${h}%;--d:${(i % 12) * 0.09}s"></span>`;
      }).join('');

      // рядок новин: свої фрази з AND5.ticker, інакше — заголовки останніх новин
      const tickerItems = (AND5.ticker || []).length
        ? AND5.ticker
        : AND5.news.slice(0, 5).map((n) => n.title);
      const tickerRow = tickerItems.map((t) => `<span>${esc(t)}</span><i aria-hidden="true">✱</i>`).join('');

      const featured = AND5.works.filter((w) => w.status === 'Вийшло').slice(0, 3);
      const latest = AND5.news.slice(0, 3);

      return `
        <section class="hero">
          <div class="hero__glow" id="heroGlow" aria-hidden="true"></div>
          <div class="shell hero__grid">
            <div class="hero__col">
              <p class="hero__kicker reveal" style="--i:0">
                <span class="dot" aria-hidden="true"></span>
                Студія українського дубляжу${s.since ? ` · з ${esc(String(s.since))}` : ''}
              </p>
              <h1 class="hero__title">
                <span class="line"><span>Український</span></span>
                <span class="line"><span>дубляж, який</span></span>
                <span class="line"><span><em>звучить</em> як оригінал</span></span>
              </h1>
              ${s.lead ? `<p class="hero__lead reveal" style="--i:3">${esc(s.lead)}</p>` : ''}
              <div class="hero__actions reveal" style="--i:4">
                <a class="btn" href="#/works">Дивитись роботи ${icon.arrow}</a>
                <a class="btn btn--ghost" href="#/contacts">Замовити дубляж</a>
              </div>
            </div>

            <div class="hero__aside reveal" style="--i:2">
              <div class="onair">
                <div class="onair__head">
                  <span class="rec"><i aria-hidden="true"></i> REC</span>
                  <span class="onair__label">and5 · studio live</span>
                </div>
                <div class="wave" aria-hidden="true">${bars}</div>
                <div class="onair__foot">
                  <span>Запис сесії 04</span>
                  <span class="mono">48 kHz · 24 bit</span>
                </div>
              </div>
            </div>
          </div>

          ${AND5.stats.length ? `
          <div class="shell">
            <ul class="stats reveal" style="--i:5">
              ${AND5.stats.map((st) => `
                <li>
                  <strong data-count="${st.value}" data-suffix="${esc(st.suffix || '')}">0</strong>
                  <span>${esc(st.label)}</span>
                </li>`).join('')}
            </ul>
          </div>` : ''}
        </section>

        ${tickerItems.length ? `
        <div class="ticker">
          <div class="ticker__row ticker__row--red">
            <div class="ticker__track">${tickerRow}${tickerRow}</div>
          </div>
        </div>` : ''}

        ${AND5.services.length ? `
        <section class="section">
          <div class="shell">
            <div class="section__head">
              <div>
                <p class="kicker reveal" style="--i:0">Послуги</p>
                <h2 class="reveal" style="--i:1">Що ми робимо</h2>
              </div>
              <p class="section__note reveal" style="--i:2">Від повного дубляжу до окремого голосу в рекламі — збираємо проєкт під ваш формат.</p>
            </div>
            <ul class="services">
              ${AND5.services.map((sv, i) => `
                <li class="service io" style="--i:${i}">
                  <span class="service__icon" aria-hidden="true">${sv.icon}</span>
                  <h3>${esc(sv.title)}</h3>
                  <p>${esc(sv.text)}</p>
                </li>`).join('')}
            </ul>
          </div>
        </section>` : ''}

        ${aboutBlock()}

        ${featured.length ? `
        <section class="section section--tint">
          <div class="shell">
            <div class="section__head">
              <div>
                <p class="kicker reveal" style="--i:0">Портфоліо</p>
                <h2 class="reveal" style="--i:1">Свіжі роботи</h2>
              </div>
              <a class="link-arrow reveal" style="--i:2" href="#/works">Усі роботи ${icon.arrow}</a>
            </div>
            <div class="works-grid works-grid--3">${featured.map((w, i) => workCard(w, i)).join('')}</div>
          </div>
        </section>` : ''}

        ${latest.length ? `
        <section class="section">
          <div class="shell">
            <div class="section__head">
              <div>
                <p class="kicker reveal" style="--i:0">Стрічка</p>
                <h2 class="reveal" style="--i:1">Останні новини</h2>
              </div>
              <a class="link-arrow reveal" style="--i:2" href="#/news">Усі новини ${icon.arrow}</a>
            </div>
            <div class="news-list">${latest.map((n, i) => newsItem(n, i)).join('')}</div>
          </div>
        </section>` : ''}

        <section class="section section--tight">
          <div class="shell">
            ${ctaBand('Маєте матеріал — озвучимо', 'Надішліть обсяг і дедлайн: відповімо з кошторисом того ж дня.')}
          </div>
        </section>`;
    },

    /* ===== НОВИНИ ===== */
    news() {
      const tags = ['Усі', ...new Set(AND5.news.map((n) => n.tag))];
      const list = AND5.news;
      return `
        ${pageHead({
          kicker: 'Новини студії',
          title: 'Що в нас відбувається',
          lead: 'Нові дубляжі, переозвучки та трейлери — усе в одній стрічці.'
        })}
        <div class="shell">
          ${list.length ? `
          <div class="filters reveal" style="--i:3" data-filter-group="news">
            ${tags.map((t, i) => `<button type="button" class="chip ${i === 0 ? 'is-active' : ''}" data-filter="${esc(t)}">${esc(t)}</button>`).join('')}
          </div>
          <div class="news-list news-list--full" data-filter-target>
            ${list.map((n, i) => newsItem(n, i)).join('')}
          </div>
          <p class="empty" data-empty hidden>За цим тегом поки нічого немає.</p>` : emptyNotice('Новин поки немає', 'Перші новини з\'являться зовсім скоро. Хочете дізнатися першими — напишіть нам.', ['Написати нам', '#/contacts'])}
        </div>
        <section class="section">
          <div class="shell">
            ${ctaBand('Хочете, щоб ваша новина була тут?', 'Розкажіть про проєкт — і ми зробимо його українською.', ['Написати нам', '#/contacts'], ['Наші роботи', '#/works'])}
          </div>
        </section>`;
    },

    /* ===== РОБОТИ ===== */
    works() {
      const list = AND5.works;
      const done = list.filter((w) => w.status === 'Вийшло').length;
      const wip = list.length - done;
      // напрями беруться з самих робіт — фільтри завжди відповідають контенту
      const cats = ['Усі', ...new Set(list.map((w) => w.category))];
      return `
        ${pageHead({
          kicker: 'Портфоліо',
          title: 'Роботи команди',
          lead: 'Наші дубляжі та переозвучки. Фільтруйте за напрямом — або дивіться все підряд.',
          extra: list.length ? `
            <div class="head-stats reveal" style="--i:3">
              <span><strong>${done}</strong> у портфоліо</span>
              ${wip ? `<span><strong>${wip}</strong> у роботі</span>` : ''}
            </div>` : ''
        })}
        <div class="shell">
          ${list.length ? `
          <div class="filters reveal" style="--i:4" data-filter-group="works">
            ${cats.map((c, i) => `<button type="button" class="chip ${i === 0 ? 'is-active' : ''}" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}
          </div>
          <div class="works-grid" data-filter-target>
            ${list.map((w, i) => workCard(w, i)).join('')}
          </div>
          <p class="empty" data-empty hidden>У цьому напрямі поки немає опублікованих робіт.</p>` : emptyNotice('Робіт поки немає', 'Щойно перші проєкти вийдуть в ефір — покажемо їх тут. А поки розкажіть про свій проєкт.', ['Замовити дубляж', '#/contacts'])}
        </div>
        <section class="section">
          <div class="shell">
            ${ctaBand('Ваш проєкт — наступний', 'Беремо як повний дубляж, так і окремі етапи: переклад, запис, зведення.')}
          </div>
        </section>`;
    },

    /* ===== КОМАНДА ===== */
    team() {
      return `
        ${pageHead({
          kicker: 'Команда',
          title: 'Хто стоїть за голосами',
          lead: 'Сімнадцять людей: актори, режисери, звукорежисери, перекладачі й монтажери. Ось хто веде проєкти.'
        })}
        <div class="shell">
          ${AND5.team.length ? `
          <ul class="team-grid">
            ${AND5.team.map((m, i) => `
              <li class="member io" style="--i:${i}">
                <span class="member__avatar" aria-hidden="true">${m.photo ? `<img src="${esc(m.photo)}" alt="" />` : esc(m.name.trim().charAt(0))}</span>
                <h3>${esc(m.name)}</h3>
                <p class="member__role">${esc(m.role)}</p>
                ${m.bio ? `<p class="member__bio">${esc(m.bio)}</p>` : ''}
                ${(m.tags || []).length ? `<ul class="chips chips--tiny">${m.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
              </li>`).join('')}
          </ul>` : emptyNotice('Команда ще в процесі', 'Ми збираємо команду голосів. Хочете долучитися — надішліть демо.', ['Надіслати демо', '#/contacts'])}
        </div>

        ${AND5.steps.length ? `
        <section class="section section--tint">
          <div class="shell">
            <div class="section__head">
              <div>
                <p class="kicker reveal" style="--i:0">Процес</p>
                <h2 class="reveal" style="--i:1">Як проходить проєкт</h2>
              </div>
              <p class="section__note reveal" style="--i:2">Прозоро на кожному етапі: ви бачите проби, чернетки та фінальний мікс.</p>
            </div>
            <ol class="steps">
              ${AND5.steps.map((st, i) => `
                <li class="step io" style="--i:${i}">
                  <span class="step__n">${esc(st.n)}</span>
                  <h3>${esc(st.title)}</h3>
                  <p>${esc(st.text)}</p>
                </li>`).join('')}
            </ol>
          </div>
        </section>` : ''}

        <section class="section">
          <div class="shell">
            ${ctaBand('Хочете до нас у команду?', 'Надішліть демо на 2–3 хвилини — відповідаємо кожному.', ['Надіслати демо', '#/contacts'], ['Що ми робимо', '#/works'])}
          </div>
        </section>`;
    },

    /* ===== КОНТАКТИ ===== */
    contacts() {
      const s = AND5.studio;

      // контакти показуємо лише ті, що реально заповнені
      const rows = [];
      if (s.email) rows.push(`
                <li>
                  <span class="contact-list__ic">${icon.mail}</span>
                  <div><a href="mailto:${esc(s.email)}">${esc(s.email)}</a><small>пошта для заявок</small></div>
                  <button class="copy" type="button" data-copy="${esc(s.email)}" aria-label="Скопіювати email">${icon.copy}</button>
                </li>`);
      if (s.telegram) rows.push(`
                <li>
                  <span class="contact-list__ic">${icon.telegram}</span>
                  <div><a href="${esc(tgUrl(s.telegram))}" target="_blank" rel="noopener">${esc(tgLabel(s.telegram))}</a><small>найшвидший канал</small></div>
                  <button class="copy" type="button" data-copy="${esc(tgLabel(s.telegram))}" aria-label="Скопіювати Telegram">${icon.copy}</button>
                </li>`);
      if (s.discord) rows.push(`
                <li>
                  <span class="contact-list__ic">${icon.discord}</span>
                  <div><a href="${esc(isUrl(s.discord) ? s.discord : tgUrl(s.discord))}" target="_blank" rel="noopener">Discord студії</a><small>сервер студії</small></div>
                  <button class="copy" type="button" data-copy="${esc(s.discord)}" aria-label="Скопіювати Discord">${icon.copy}</button>
                </li>`);

      const facts = [];
      if (s.hours) facts.push(['Графік', s.hours]);
      if (s.city) facts.push(['Розташування', s.city]);
      if (s.prep) facts.push(['Підготовка', s.prep]);
      if (s.languages) facts.push(['Мови', s.languages]);

      return `
        ${pageHead({
          kicker: 'Контакти',
          title: 'Напишіть нам',
          lead: 'Опишіть матеріал і обсяг — повернемося з оцінкою, термінами та прикладами схожих робіт.'
        })}
        <div class="shell contact-layout">
          <div class="card card--form reveal" style="--i:3">
            <form id="requestForm" novalidate>
              <div class="field">
                <label for="f-name">Ім'я <span class="req">*</span></label>
                <input id="f-name" name="name" type="text" autocomplete="name" placeholder="Як до вас звертатися" required />
                <p class="field__error" data-error-for="f-name"></p>
              </div>
              <div class="field">
                <label for="f-contact">Email або Telegram <span class="req">*</span></label>
                <input id="f-contact" name="contact" type="text" autocomplete="email" placeholder="you@example.com або @nickname" required />
                <p class="field__error" data-error-for="f-contact"></p>
              </div>
              ${AND5.formTopics.length ? `
              <div class="field">
                <label for="f-topic">Тема</label>
                <select id="f-topic" name="topic">
                  ${AND5.formTopics.map((t) => `<option>${esc(t)}</option>`).join('')}
                </select>
              </div>` : ''}
              <div class="field">
                <label for="f-message">Повідомлення <span class="req">*</span></label>
                <textarea id="f-message" name="message" rows="5" placeholder="Матеріал, кількість хвилин, дедлайн, потрібні голоси" required></textarea>
                <p class="field__error" data-error-for="f-message"></p>
              </div>
              <button class="btn btn--wide" type="submit">Надіслати заявку ${icon.arrow}</button>
              <p class="form__note">Відповідаємо протягом одного робочого дня. Дані використовуємо лише для відповіді на заявку.</p>
            </form>

            <div class="form-success" id="formSuccess" hidden>
              <span class="form-success__mark" aria-hidden="true">✓</span>
              <h3>Заявку зібрано!</h3>
              <p>Ми відкрили вашу пошту з готовим листом — залишилось натиснути «Надіслати».</p>
              <div class="form-success__actions">
                <a class="btn" id="mailtoLink" href="#">Відкрити лист</a>
                ${s.telegram ? `<a class="btn btn--ghost" href="${esc(tgUrl(s.telegram))}" target="_blank" rel="noopener">${icon.telegram} Написати в Telegram</a>` : ''}
                <button class="btn btn--ghost" type="button" id="resetForm">Заповнити ще раз</button>
              </div>
            </div>
          </div>

          <aside class="contact-side">
            <div class="card io" style="--i:0">
              <h3>Прямий зв'язок</h3>
              <ul class="contact-list">${rows.join('')}</ul>
            </div>

            <div class="card io" style="--i:1">
              <h3>Деталі</h3>
              <ul class="facts">
                ${facts.map(([k, v]) => `<li><span>${esc(k)}</span><strong>${esc(v)}</strong></li>`).join('')}
              </ul>
              <div class="socials">${socialButtons()}</div>
            </div>
          </aside>
        </div>

        <section class="section">
          <div class="shell">
            <div class="section__head">
              <div>
                <p class="kicker reveal" style="--i:0">Питання</p>
                <h2 class="reveal" style="--i:1">Коротко про головне</h2>
              </div>
            </div>
            ${AND5.faq.length ? `<div class="faq">
              ${AND5.faq.map((f, i) => `
                <details class="faq__item io" style="--i:${i}">
                  <summary>${esc(f.q)}<span class="faq__mark" aria-hidden="true"></span></summary>
                  <p>${esc(f.a)}</p>
                </details>`).join('')}
            </div>` : ''}
          </div>
        </section>`;
    }
  };

  /* ---------- рендер сторінки ---------- */
  function mount(route) {
    view.innerHTML = pages[route]();

    // індекси для каскадної появи
    $$('.io', view).forEach((el, i) => { if (!el.style.getPropertyValue('--i')) el.style.setProperty('--i', i); });

    currentRoute = route;
    document.title = TITLES[route] || TITLES.home;
    setActiveNav(route);
    observeReveals();
    initCounters();
    initFilters();
    initForm();
    initCopy();
    if (route === 'home') initHeroGlow();
  }

  function observeReveals() {
    if (observer) observer.disconnect();
    const items = $$('.io', view);
    if (!items.length) return;
    if (reduceMotion() || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); observer.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => observer.observe(el));
  }

  function initCounters() {
    const nums = $$('[data-count]', view);
    if (!nums.length) return;
    const run = (el) => {
      const target = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      if (reduceMotion()) { el.textContent = target + suffix; return; }
      const dur = 1100;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.4 });
    nums.forEach((el) => io.observe(el));
  }

  function initFilters() {
    $$('[data-filter-group]', view).forEach((group) => {
      const scope = group.parentElement;
      const target = $('[data-filter-target]', scope);
      const empty = $('[data-empty]', scope);
      if (!target) return;
      const key = group.dataset.filterGroup === 'works' ? 'category' : 'tag';

      group.addEventListener('click', (ev) => {
        const chip = ev.target.closest('.chip');
        if (!chip) return;
        const value = chip.dataset.filter;
        $$('.chip', group).forEach((c) => c.classList.toggle('is-active', c === chip));

        let shown = 0;
        $$('[data-' + (key === 'category' ? 'category' : 'tag') + ']', target).forEach((card) => {
          const match = value === 'Усі' || card.dataset[key] === value;
          card.hidden = !match;
          if (!match) {
            card.classList.remove('is-in');
            return;
          }
          if (reduceMotion()) {
            card.classList.add('is-in');
          } else {
            card.classList.remove('is-in');
            card.style.setProperty('--i', shown);
            void card.offsetWidth;   // перезапуск анімації появи
            card.classList.add('is-in');
          }
          shown++;
        });
        if (empty) empty.hidden = shown !== 0;
      });
    });
  }

  function initForm() {
    const form = $('#requestForm', view);
    if (!form) return;
    const success = $('#formSuccess', view);

    const showError = (input, msg) => {
      const box = $(`[data-error-for="${input.id}"]`, form);
      if (box) box.textContent = msg || '';
      input.classList.toggle('is-invalid', Boolean(msg));
    };

    form.addEventListener('input', (ev) => {
      if (ev.target.matches('input, textarea')) showError(ev.target, '');
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const name = $('#f-name', form);
      const contact = $('#f-contact', form);
      const message = $('#f-message', form);
      const topic = $('#f-topic', form);
      const submitBtn = form.querySelector('button[type="submit"]');
      let ok = true;

      if (name.value.trim().length < 2) { showError(name, 'Вкажіть ім\'я'); ok = false; }
      if (contact.value.trim().length < 5) { showError(contact, 'Залиште email або нік у Telegram'); ok = false; }
      if (message.value.trim().length < 10) { showError(message, 'Опишіть проєкт хоча б у кількох словах'); ok = false; }
      if (!ok) {
        const first = $('.is-invalid', form);
        if (first) first.focus();
        return;
      }

      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Надсилання...';
      }

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            access_key: 'fc540575-b273-48d3-ae37-204c0d7db15b',
            name: name.value.trim(),
            contact: contact.value.trim(),
            topic: topic ? topic.value : 'Заявка з сайту',
            message: message.value.trim()
          })
        });

        const result = await response.json();

        if (result.success) {
          form.reset();
          form.hidden = true;
          if (success) {
            const successTitle = success.querySelector('h3');
            const successDesc = success.querySelector('p');
            const mailtoBtn = $('#mailtoLink', success);
            if (successTitle) successTitle.textContent = 'Дякуємо! Заявку надіслано!';
            if (successDesc) successDesc.textContent = 'Ми отримали ваше повідомлення і відповімо протягом одного робочого дня.';
            if (mailtoBtn) mailtoBtn.hidden = true;

            success.hidden = false;
            success.classList.add('is-shown');
          }
          toastMsg('Заявку успішно надіслано!');
        } else {
          toastMsg('Помилка надсилання. Спробуйте пізніше.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
          }
        }
      } catch (error) {
        console.error('Form submission error:', error);
        toastMsg('Помилка мережі. Спробуйте ще раз.');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });

    const resetBtn = $('#resetForm', view);
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (success) success.hidden = true;
        form.hidden = false;
      });
    }
  }

  function initCopy() {
    $$('[data-copy]', view).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy;
        try {
          await navigator.clipboard.writeText(text);
          toastMsg('Скопійовано: ' + text);
        } catch {
          toastMsg('Не вдалося скопіювати — ' + text);
        }
      });
    });
  }

  function initHeroGlow() {
    const hero = $('.hero', view);
    const glow = $('#heroGlow', view);
    if (!hero || !glow || reduceMotion()) return;
    hero.addEventListener('pointermove', (ev) => {
      const r = hero.getBoundingClientRect();
      glow.style.setProperty('--x', `${((ev.clientX - r.left) / r.width) * 100}%`);
      glow.style.setProperty('--y', `${((ev.clientY - r.top) / r.height) * 100}%`);
    });
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toastMsg(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2600);
  }

  /* ---------- навігація ---------- */
  function routeFromHash() {
    const raw = location.hash.replace(/^#\/?/, '').split(/[?/]/)[0];
    if (!ROUTES.includes(raw)) return 'home';
    // якщо розділ порожній (немає новин / робіт / команди) — ведемо на головну
    const has = { news: AND5.news.length > 0, works: AND5.works.length > 0, team: AND5.team.length > 0 };
    return (raw in has && !has[raw]) ? 'home' : raw;
  }

  // ховаємо пункти меню й посилання у футері для порожніх розділів
  function pruneNav() {
    const has = { home: true, news: AND5.news.length > 0, works: AND5.works.length > 0, team: AND5.team.length > 0, contacts: true };
    $$('#nav a').forEach((a) => { if (!has[a.dataset.route]) a.remove(); });
    $$('.footer__col a').forEach((a) => {
      const m = (a.getAttribute('href') || '').match(/^#\/(\w+)$/);
      if (m && m[1] in has && !has[m[1]]) a.remove();
    });
  }

  function setActiveNav(route) {
    $$('#nav a', document).forEach((a) => a.classList.toggle('is-active', a.dataset.route === route));
    movePill();
  }

  function movePill() {
    if (!navPill) return;
    const active = $('#nav a.is-active', document);
    if (!active || getComputedStyle(nav).position === 'static' || nav.offsetParent === null) return;
    const nr = nav.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    navPill.style.width = `${ar.width}px`;
    navPill.style.transform = `translateX(${ar.left - nr.left}px)`;
    navPill.classList.add('is-on');
  }

  async function navigate(route, { instant = false } = {}) {
    if (busy) return;
    if (route === currentRoute) {
      window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
      return;
    }

    const animated = !instant && !reduceMotion() && currentRoute !== null;
    busy = true;

    if (animated) {
      wipe.classList.add('is-on');
      await wait(340);
    }

    mount(route);
    window.scrollTo({ top: 0, behavior: 'auto' });

    if (animated) {
      await wait(540);
      wipe.classList.remove('is-on');
      await wait(140);
    }
    busy = false;
  }

  function onHashChange() {
    navigate(routeFromHash(), { instant: currentRoute === null });
  }

  window.addEventListener('hashchange', onHashChange);

  /* ---------- хедер, меню, прогрес ---------- */
  function onScroll() {
    const y = window.scrollY;
    topbar.classList.toggle('is-scrolled', y > 10);
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const p = max > 0 ? (y / max) * 100 : 0;
    const bar = $('#progress');
    if (bar) bar.style.transform = `scaleX(${p / 100})`;
    movePill();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', movePill);

  if (burger) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Меню');
      if (!open) movePill();
    });
    nav.addEventListener('click', (ev) => {
      if (ev.target.closest('a')) {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- футер ---------- */
  function buildFooter() {
    const socials = $('#footerSocials');
    if (socials) socials.innerHTML = socialButtons();
    const contacts = $('#footerContacts');
    const s = AND5.studio;
    if (contacts) {
      contacts.innerHTML = `
        <h4>Зв'язок</h4>
        <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>
        <a href="https://t.me/${esc(s.telegram.replace('@', ''))}" target="_blank" rel="noopener">${esc(s.telegram)}</a>
        <span class="footer__muted">${esc(s.hours)}</span>
        <span class="footer__muted">${esc(s.city)}</span>`;
    }
    const copy = $('#footerCopy');
    if (copy) copy.textContent = `© ${new Date().getFullYear()} ${s.name}`;
  }

  /* ---------- старт ---------- */
  pruneNav();
  buildFooter();

  if (!location.hash) {
    history.replaceState(null, '', '#/');
    mount('home');
  } else {
    navigate(routeFromHash(), { instant: true });
  }
  onScroll();
  // після завантаження шрифтів пігулка в навігації може змінити розмір — перерахуємо
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
})();
