import './style.css';
import { CAPACITY_BYTES, makeRoom, usedBytes } from './library-state.js';

const params = new URLSearchParams(location.search);
const embedded = params.get('embed') === '1';
const isBookRoute = () => /\/book(?:\.html)?\/?$/.test(location.pathname);
document.documentElement.classList.toggle('embedded', embedded);

const MB = 1_000_000;
const originalBooks = [
  { id:'field-notes', title:'Notes from the water', by:'Mara van Dijk', type:'PDF', bytes:2.4*MB, downloads:4, color:'#637568', top:'#87978a', ink:'#f4eee0', height:65, offset:0, pattern:'lines', comments:[
    { name:'Noor', time:'TODAY · 10:42', text:'I walked past the same bridge this morning. It looks different after rain.' },
    { name:'Eli', time:'YESTERDAY · 17:09', text:'The little map at the end is lovely.' }
  ] },
  { id:'after-the-rain', title:'After the rain', by:'Joost', type:'WAV', bytes:18.6*MB, downloads:3, color:'#5379b8', top:'#7c9dd0', ink:'#f5f5ea', height:76, offset:12, pattern:'wave', comments:[
    { name:'Eli', time:'YESTERDAY · 17:09', text:'Thank you for the rain recording. I left a drawing in return.' },
    { name:'Noor', time:'MONDAY · 19:24', text:'That quiet last second is beautiful.' }
  ] },
  { id:'somewhere-to-begin', title:'Somewhere to begin', by:'Inez', type:'TXT', bytes:8*1024, downloads:1, color:'#dcad48', top:'#efc66e', ink:'#302d25', height:60, offset:5, pattern:'sun', comments:[
    { name:'Tess', time:'YESTERDAY · 08:31', text:'I took the route through the gardens. Thank you.' }
  ] },
  { id:'ordinary-things', title:'Ordinary things', by:'Anonymous', type:'JPG', bytes:3.1*MB, downloads:1, color:'#d8dcd5', top:'#f1f2ec', ink:'#343934', height:69, offset:19, pattern:'hatch', comments:[] },
  { id:'city-at-six', title:'The city at six', by:'Raf', type:'MP3', bytes:6.8*MB, downloads:0, color:'#6d7196', top:'#959abc', ink:'#f1ede9', height:64, offset:7, pattern:'wave', comments:[] },
  { id:'open-letter', title:'An open letter', by:'Noor', type:'MD', bytes:12*1024, downloads:2, color:'#ab6654', top:'#cf8b73', ink:'#fff3e7', height:72, offset:15, pattern:'lines', comments:[
    { name:'Someone nearby', time:'MONDAY · 19:24', text:'The light was orange when I arrived. It felt like finding a small door.' }
  ] },
  { id:'window-at-noon', title:'A window at noon', by:'Lena', type:'JPG', bytes:4.4*MB, downloads:2, color:'#b8ad8d', top:'#d8cfb4', ink:'#2e3029', height:68, offset:6, pattern:'hatch', comments:[
    { name:'Mara', time:'SUNDAY · 12:13', text:'I know this window. The light only lands there in autumn.' }
  ] },
  { id:'canal-frequencies', title:'Canal frequencies', by:'Amir', type:'WAV', bytes:22.3*MB, downloads:5, color:'#334f57', top:'#5f7980', ink:'#e8eee9', height:73, offset:17, pattern:'wave', comments:[] },
  { id:'borrowed-garden', title:'The borrowed garden', by:'Rosa', type:'PDF', bytes:1.8*MB, downloads:3, color:'#7f8f65', top:'#a6b48d', ink:'#faf5e8', height:63, offset:2, pattern:'lines', comments:[
    { name:'Inez', time:'SATURDAY · 15:18', text:'The last page made me plant something on my balcony.' }
  ] },
  { id:'next-visitor', title:'For the next visitor', by:'Unknown', type:'TXT', bytes:5*1000, downloads:0, color:'#d8d3c7', top:'#f0ede5', ink:'#363a35', height:59, offset:12, pattern:'grid', comments:[] },
  { id:'blue-hour', title:'Blue hour, 18:42', by:'Jules', type:'PNG', bytes:6.2*MB, downloads:4, color:'#476a96', top:'#7392b8', ink:'#f6f5eb', height:70, offset:4, pattern:'wave', comments:[
    { name:'Tess', time:'FRIDAY · 18:52', text:'I was there ten minutes later.' }
  ] },
  { id:'ring-rain', title:'Rain on the Ring', by:'Sefa', type:'MP3', bytes:9.8*MB, downloads:1, color:'#806681', top:'#a990a8', ink:'#f8efe8', height:75, offset:20, pattern:'hatch', comments:[] },
  { id:'small-departures', title:'Small departures', by:'Pim', type:'EPUB', bytes:1.2*MB, downloads:6, color:'#bd724e', top:'#da9977', ink:'#fff1df', height:66, offset:7, pattern:'sun', comments:[
    { name:'Joost', time:'THURSDAY · 09:20', text:'I read this while waiting for the ferry.' }
  ] },
  { id:'october-index', title:'October index', by:'Ada', type:'CSV', bytes:42*1000, downloads:0, color:'#9d9f92', top:'#c3c5ba', ink:'#26302b', height:61, offset:14, pattern:'grid', comments:[] },
  { id:'night-ferry', title:'Night ferry', by:'Bo', type:'MP4', bytes:58*MB, downloads:2, color:'#353b56', top:'#616882', ink:'#e9e9ed', height:78, offset:1, pattern:'wave', comments:[
    { name:'Raf', time:'WEDNESDAY · 22:14', text:'The reflection at 00:18 is unreal.' }
  ] },
  { id:'empty-square', title:'The empty square', by:'Fleur', type:'JPG', bytes:3.8*MB, downloads:1, color:'#ba9b8c', top:'#d6b9a8', ink:'#342e2b', height:67, offset:10, pattern:'lines', comments:[] }
];
let books = originalBooks.map((book, index) => ({ ...book, order:index, comments:[...book.comments] }));
let nextOrder = books.length;
if (!embedded) {
  try {
    const saved = JSON.parse(localStorage.getItem('host-portal-book-activity-v1') || '{}');
    for (const book of books) {
      const activity = saved[book.id];
      if (!activity) continue;
      if (Number.isSafeInteger(activity.downloads) && activity.downloads >= book.downloads) book.downloads = activity.downloads;
      if (Array.isArray(activity.comments)) {
        book.comments.push(...activity.comments.filter(note => note && typeof note.text === 'string' && typeof note.name === 'string').slice(0, 20));
      }
    }
  } catch { /* Storage may be unavailable on a local portal. */ }
}
let selectedId = params.get('view') === 'board' ? 'after-the-rain' : books[0].id;
if (!embedded && isBookRoute()) selectedId = params.get('id') || selectedId;
let toastTimer;

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="portal-shell">
    <header class="topbar">
      <a class="header-link mono" id="header-link" href="./about.html">ABOUT</a>
      <a class="brand" href="./" aria-label="HOST, return to the library">HOST</a>
      <span class="connection mono"><i aria-hidden="true"></i> LOCAL</span>
    </header>
    <main>
      <div class="page-head">
        <h1>Library</h1>
        <div class="capacity mono">
          <span>SPACE</span>
          <span id="capacity-label"></span>
          <div class="capacity__track" role="progressbar" aria-label="Library space used" aria-valuemin="0" aria-valuemax="500" id="capacity-progress"><span id="capacity-fill"></span></div>
        </div>
        <button class="primary-action pill-action" id="primary-action" type="button">Leave a file <span aria-hidden="true">↗</span></button>
      </div>
      <div class="library-layout">
        <section class="shelf-stage" id="shelf-dropzone" aria-label="Books in the library">
          <div class="book-stack" id="book-stack"></div>
          <div class="shelf-controls mono"><span>DRAG OR SCROLL TO EXPLORE</span><span id="shelf-count"></span></div>
          <div class="embed-conversation" id="embed-conversation"><p class="mono" id="embed-title"></p><p id="embed-note"></p><span class="mono" id="embed-by"></span></div>
          <div class="drop-hint" aria-hidden="true">Leave it here</div>
        </section>
        <aside class="detail-panel" id="detail-panel" aria-label="Selected book">
          <div class="detail-intro">
            <div class="book-cover" id="detail-cover" aria-hidden="true"><span class="book-cover__by mono" id="cover-by"></span><strong class="book-cover__title" id="cover-title"></strong></div>
            <div class="detail-intro__copy"><p class="detail-kicker mono">SELECTED BOOK</p><h2 id="detail-title"></h2></div>
          </div>
          <dl class="detail-facts mono">
            <div><dt>BY</dt><dd id="detail-by"></dd></div>
            <div><dt>TYPE</dt><dd id="detail-format"></dd></div>
            <div><dt>SIZE</dt><dd id="detail-size"></dd></div>
            <div><dt>DOWNLOADS</dt><dd id="detail-downloads"></dd></div>
          </dl>
          <button class="download-button pill-action" id="download-button" type="button">Download file <span aria-hidden="true">↘</span></button>
          <div class="conversation-head"><h3>Conversation</h3><span class="mono" id="comment-count"></span></div>
          <div class="comments" id="comments"></div>
          <form id="comment-form">
            <label class="visually-hidden" for="comment-text">Comment on this book</label>
            <textarea id="comment-text" maxlength="280" rows="2" placeholder="Leave a comment" required></textarea>
            <div class="comment-form__bottom">
              <label class="visually-hidden" for="comment-name">Name (optional)</label>
              <input id="comment-name" maxlength="24" autocomplete="nickname" placeholder="Name (optional)"/>
              <button class="post-button" type="submit" aria-label="Post comment">↗</button>
            </div>
          </form>
        </aside>
      </div>
    </main>
    <footer class="site-foot mono">DESIGN PREVIEW · BROWSER LOCAL</footer>
  </div>
  <input id="file-input" type="file" multiple hidden/>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const qs = selector => document.querySelector(selector);
const stack = qs('#book-stack');
const comments = qs('#comments');
const detail = qs('#detail-panel');
const fileInput = qs('#file-input');
const dropzone = qs('#shelf-dropzone');
const selectedBook = () => books.find(book => book.id === selectedId);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let shelfFrame = 0;

function showRoute() {
  const detailRoute = !embedded && isBookRoute();
  document.documentElement.classList.toggle('detail-page', detailRoute);
  document.title = detailRoute && selectedBook() ? `${selectedBook().title} — HOST` : 'HOST — Local library';
  const headerLink = qs('#header-link');
  headerLink.textContent = detailRoute ? '← LIBRARY' : 'ABOUT';
  headerLink.href = detailRoute ? './' : './about.html';
  if (detailRoute) window.scrollTo(0, 0);
}

function goHome(event) {
  if (event) event.preventDefault();
  history.pushState({}, '', './');
  showRoute();
  render();
}

function updateShelfMotion() {
  shelfFrame = 0;
  if (embedded || document.documentElement.classList.contains('detail-page')) return;
  const bounds = stack.getBoundingClientRect();
  const center = bounds.left + bounds.width / 2;
  const positions = [...stack.querySelectorAll('.book')].map(book => {
    const rect = book.getBoundingClientRect();
    return { book, center:rect.left + rect.width / 2 };
  });
  if (reduceMotion.matches) {
    for (const { book } of positions) {
      for (const property of ['--motion-x', '--motion-tilt', '--motion-scale', '--motion-brightness']) book.style.removeProperty(property);
    }
    return;
  }
  for (const { book, center:bookCenter } of positions) {
    const distance = Math.max(-1, Math.min(1, (bookCenter - center) / (bounds.width * .55)));
    const focus = 1 - Math.abs(distance);
    book.style.setProperty('--motion-x', `${(focus * 2).toFixed(1)}px`);
    book.style.setProperty('--motion-tilt', `${(-distance * 2.5).toFixed(1)}deg`);
    book.style.setProperty('--motion-scale', (1 + focus * .025).toFixed(3));
    book.style.setProperty('--motion-brightness', (.92 + focus * .08).toFixed(3));
  }
}
function scheduleShelfMotion() {
  if (!shelfFrame) shelfFrame = requestAnimationFrame(updateShelfMotion);
}

function showToast(message) {
  const toast = qs('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3800);
}
function formatSize(bytes) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}
function persistActivity() {
  if (embedded) return;
  const activity = {};
  for (const book of books) {
    if (!originalBooks.some(original => original.id === book.id)) continue;
    const original = originalBooks.find(item => item.id === book.id);
    activity[book.id] = { downloads:book.downloads, comments:book.comments.slice(original.comments.length) };
  }
  try { localStorage.setItem('host-portal-book-activity-v1', JSON.stringify(activity)); } catch { /* Browser storage is optional. */ }
}
function makeBook(book) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'book';
  if (book.id === selectedId) button.classList.add('selected');
  button.setAttribute('aria-pressed', String(book.id === selectedId));
  button.setAttribute('aria-label', `${book.title}, ${book.type}, by ${book.by}. Open book and conversation.`);
  for (const [key, value] of Object.entries({ color:book.color, top:book.top, ink:book.ink, height:`${book.height}px`, offset:`${book.offset}px`, lean:`${[-.35,.22,-.18,.34,-.12,.15][book.order % 6]}deg` })) {
    button.style.setProperty(`--book-${key}`, value);
  }
  button.dataset.pattern = book.pattern;
  const top = document.createElement('span'); top.className = 'book__top'; top.setAttribute('aria-hidden', 'true');
  const spine = document.createElement('span'); spine.className = 'book__spine';
  const by = document.createElement('span'); by.className = 'book__by'; by.textContent = book.by;
  const title = document.createElement('span'); title.className = 'book__title'; title.textContent = book.title;
  const type = document.createElement('span'); type.className = 'book__type mono'; type.textContent = book.type;
  spine.append(by, title, type); button.append(top, spine);
  button.addEventListener('click', () => {
    selectedId = book.id;
    if (!embedded) {
      history.pushState({}, '', `./book.html?id=${encodeURIComponent(book.id)}`);
      showRoute();
    }
    render();
  });
  return button;
}
function makeComment(note) {
  const article = document.createElement('article'); article.className = 'comment';
  const text = document.createElement('p'); text.textContent = note.text;
  const meta = document.createElement('div'); meta.className = 'comment__meta mono';
  const name = document.createElement('span'); name.textContent = note.name;
  const time = document.createElement('time'); time.textContent = note.time;
  meta.append(name, time); article.append(text, meta);
  return article;
}
function render({ resetScroll = false } = {}) {
  if (!selectedBook()) {
    selectedId = books[0]?.id;
    if (!embedded && isBookRoute()) {
      history.replaceState({}, '', './');
      showRoute();
      showToast('That book is no longer in this browser session.');
    }
  }
  const previousScroll = stack.scrollLeft;
  const shown = embedded ? books.slice(0, document.documentElement.classList.contains('embedded-discussion') ? 2 : 3) : books;
  if (shown.length) stack.replaceChildren(...shown.map(makeBook));
  else {
    const empty = document.createElement('p'); empty.className = 'empty-shelf'; empty.textContent = 'The library is empty. Leave the first file.';
    stack.replaceChildren(empty);
  }
  stack.scrollLeft = resetScroll ? 0 : previousScroll;
  scheduleShelfMotion();
  const used = usedBytes(books);
  qs('#capacity-label').textContent = `${(used / MB).toFixed(1)} / 500 MB`;
  qs('#capacity-fill').style.width = `${used / CAPACITY_BYTES * 100}%`;
  qs('#capacity-progress').setAttribute('aria-valuenow', (used / MB).toFixed(1));
  qs('#shelf-count').textContent = `${String(books.length).padStart(2, '0')} BOOKS`;
  const book = selectedBook();
  detail.hidden = !book;
  if (!book) return;
  const cover = qs('#detail-cover');
  cover.style.setProperty('--cover-color', book.color);
  cover.style.setProperty('--cover-top', book.top);
  cover.style.setProperty('--cover-ink', book.ink);
  cover.dataset.pattern = book.pattern;
  qs('#cover-title').textContent = book.title;
  qs('#cover-by').textContent = book.by;
  qs('#detail-title').textContent = book.title;
  qs('#detail-by').textContent = book.by;
  qs('#detail-format').textContent = book.type;
  qs('#detail-size').textContent = formatSize(book.bytes);
  qs('#detail-downloads').textContent = String(book.downloads);
  qs('#comment-count').textContent = String(book.comments.length).padStart(2, '0');
  if (book.comments.length) comments.replaceChildren(...book.comments.map(makeComment));
  else {
    const empty = document.createElement('p'); empty.className = 'empty-comments'; empty.textContent = 'No comments yet.';
    comments.replaceChildren(empty);
  }
  qs('#embed-title').textContent = book.title;
  qs('#embed-note').textContent = book.comments[0]?.text || 'No comments yet.';
  qs('#embed-by').textContent = book.comments[0]?.name || '';
}
function setEmbeddedView(view) {
  if (!embedded) return;
  const discussion = view === 'board' || view === 'discussion';
  document.documentElement.classList.toggle('embedded-discussion', discussion);
  selectedId = discussion ? 'after-the-rain' : books[0]?.id;
  render();
}
function addFiles(files) {
  const palette = [['#637568','#87978a','#f4eee0'],['#5379b8','#7c9dd0','#f5f5ea'],['#dcad48','#efc66e','#302d25'],['#ab6654','#cf8b73','#fff3e7']];
  let added = 0, retired = 0, oversized = 0;
  for (const file of files) {
    const plan = makeRoom(books, file.size);
    if (!plan.accepted) { oversized++; continue; }
    books = plan.books; retired += plan.removed.length;
    const [color, top, ink] = palette[nextOrder % palette.length];
    const extension = file.name.split('.').pop()?.toUpperCase().slice(0, 6) || 'FILE';
    const book = { id:crypto.randomUUID(), title:file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || file.name, by:'You', type:extension, bytes:file.size, downloads:0, comments:[], order:nextOrder++, color, top, ink, height:68, offset:8, pattern:'lines', file };
    books.unshift(book); selectedId = book.id; added++;
  }
  render({ resetScroll:true });
  if (added) showToast(`${added === 1 ? 'File' : 'Files'} added${retired ? ` · ${retired} less-used ${retired === 1 ? 'book' : 'books'} made room` : ''}.`);
  else if (oversized) showToast('A file must be smaller than 500 MB.');
}

qs('#primary-action').addEventListener('click', () => fileInput.click());
qs('#header-link').addEventListener('click', event => {
  if (document.documentElement.classList.contains('detail-page')) goHome(event);
});
qs('.brand').addEventListener('click', event => {
  if (document.documentElement.classList.contains('detail-page')) goHome(event);
});
fileInput.addEventListener('change', () => { if (fileInput.files?.length) addFiles([...fileInput.files]); fileInput.value = ''; });
dropzone.addEventListener('dragenter', event => { event.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragover', event => event.preventDefault());
dropzone.addEventListener('dragleave', event => { if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('drag-over'); });
dropzone.addEventListener('drop', event => { event.preventDefault(); dropzone.classList.remove('drag-over'); if (event.dataTransfer?.files.length) addFiles([...event.dataTransfer.files]); });
qs('#download-button').addEventListener('click', () => {
  const book = selectedBook();
  if (!book) return;
  if (!book.file) { showToast('Sample book · no file attached in this preview.'); return; }
  const url = URL.createObjectURL(book.file);
  const link = document.createElement('a'); link.href = url; link.download = book.file.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  book.downloads++;
  persistActivity();
  render();
  showToast('Downloaded. This book stays in the library.');
});
qs('#comment-form').addEventListener('submit', event => {
  event.preventDefault();
  const book = selectedBook();
  const text = qs('#comment-text').value.trim();
  const name = qs('#comment-name').value.trim() || 'Anonymous';
  if (!book || !text) return;
  book.comments.push({ name:name.slice(0, 24), time:'JUST NOW', text:text.slice(0, 280) });
  qs('#comment-form').reset();
  persistActivity(); render();
  showToast('Comment added to this book.');
});
addEventListener('message', event => {
  if (event.origin !== location.origin || event.data?.type !== 'host-portal:view') return;
  setEmbeddedView(event.data.view);
});
stack.addEventListener('scroll', scheduleShelfMotion, { passive:true });
if (!embedded) {
  let drag;
  let ignoreClick = false;
  stack.addEventListener('wheel', event => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && stack.scrollWidth > stack.clientWidth) {
      event.preventDefault();
      stack.scrollLeft += event.deltaY;
    }
  }, { passive:false });
  stack.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') return;
    drag = { x:event.clientX, scroll:stack.scrollLeft, moved:false };
  });
  stack.addEventListener('pointermove', event => {
    if (!drag) return;
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) > 5 && !drag.moved) {
      drag.moved = true;
      stack.setPointerCapture(event.pointerId);
      stack.classList.add('is-dragging');
    }
    if (drag.moved) stack.scrollLeft = drag.scroll - distance;
  });
  const endDrag = () => {
    if (!drag) return;
    ignoreClick = drag.moved;
    if (ignoreClick) setTimeout(() => { ignoreClick = false; }, 0);
    drag = null;
    stack.classList.remove('is-dragging');
  };
  stack.addEventListener('pointerup', endDrag);
  stack.addEventListener('pointercancel', endDrag);
  stack.addEventListener('click', event => {
    if (ignoreClick) { event.preventDefault(); event.stopPropagation(); ignoreClick = false; }
  }, true);
}
addEventListener('resize', scheduleShelfMotion, { passive:true });
reduceMotion.addEventListener('change', scheduleShelfMotion);
addEventListener('popstate', () => {
  const routeId = new URLSearchParams(location.search).get('id');
  if (isBookRoute() && routeId) selectedId = routeId;
  showRoute(); render();
});
if (embedded) setEmbeddedView(params.get('view'));
else { showRoute(); render(); }
