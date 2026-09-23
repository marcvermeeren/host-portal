import './style.css';
import { CAPACITY_BYTES, makeRoom, usedBytes } from './library-state.js';

const params = new URLSearchParams(location.search);
const embedded = params.get('embed') === '1';
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
  ] }
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
let toastTimer;

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="portal-shell">
    <header class="topbar">
      <a class="brand" href="./" aria-label="HOST, return to the library">HOST</a>
      <span class="connection mono"><i aria-hidden="true"></i> LOCAL</span>
    </header>
    <main>
      <div class="page-head">
        <h1>Library</h1>
        <button class="primary-action" id="primary-action" type="button">Leave a file <span aria-hidden="true">↗</span></button>
      </div>
      <div class="capacity mono">
        <span>SPACE</span>
        <span id="capacity-label"></span>
        <div class="capacity__track" role="progressbar" aria-label="Library space used" aria-valuemin="0" aria-valuemax="500" id="capacity-progress"><span id="capacity-fill"></span></div>
      </div>
      <div class="library-layout">
        <section class="shelf-stage" id="shelf-dropzone" aria-label="Books in the library">
          <div class="book-stack" id="book-stack"></div>
          <div class="embed-conversation" id="embed-conversation"><p class="mono" id="embed-title"></p><p id="embed-note"></p><span class="mono" id="embed-by"></span></div>
          <div class="drop-hint" aria-hidden="true">Leave it here</div>
        </section>
        <aside class="detail-panel" id="detail-panel" aria-label="Selected book">
          <button class="detail-close" id="detail-close" type="button" aria-label="Close book details">×</button>
          <p class="detail-kicker mono">SELECTED BOOK</p>
          <h2 id="detail-title"></h2>
          <dl class="detail-facts mono">
            <div><dt>BY</dt><dd id="detail-by"></dd></div>
            <div><dt>TYPE</dt><dd id="detail-format"></dd></div>
            <div><dt>SIZE</dt><dd id="detail-size"></dd></div>
            <div><dt>DOWNLOADS</dt><dd id="detail-downloads"></dd></div>
          </dl>
          <button class="download-button" id="download-button" type="button">Download file <span aria-hidden="true">↘</span></button>
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
        <div class="detail-scrim" id="detail-scrim"></div>
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

function showToast(message) {
  const toast = qs('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3800);
}
function closeDetail() {
  detail.classList.remove('open');
  document.body.classList.remove('detail-open');
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
  for (const [key, value] of Object.entries({ color:book.color, top:book.top, ink:book.ink, height:`${book.height}px`, offset:`${book.offset}px` })) {
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
    render();
    if (matchMedia('(max-width: 760px)').matches && !embedded) {
      detail.classList.add('open'); document.body.classList.add('detail-open');
    }
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
function render() {
  if (!selectedBook()) selectedId = books[0]?.id;
  const shown = embedded ? books.slice(0, document.documentElement.classList.contains('embedded-discussion') ? 2 : 3) : books;
  if (shown.length) stack.replaceChildren(...shown.map(makeBook));
  else {
    const empty = document.createElement('p'); empty.className = 'empty-shelf'; empty.textContent = 'The library is empty. Leave the first file.';
    stack.replaceChildren(empty);
  }
  const used = usedBytes(books);
  qs('#capacity-label').textContent = `${(used / MB).toFixed(1)} / 500 MB`;
  qs('#capacity-fill').style.width = `${used / CAPACITY_BYTES * 100}%`;
  qs('#capacity-progress').setAttribute('aria-valuenow', (used / MB).toFixed(1));
  const book = selectedBook();
  detail.hidden = !book;
  if (!book) return;
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
  render(); closeDetail();
  if (added) showToast(`${added === 1 ? 'File' : 'Files'} added${retired ? ` · ${retired} less-used ${retired === 1 ? 'book' : 'books'} made room` : ''}.`);
  else if (oversized) showToast('A file must be smaller than 500 MB.');
}

qs('#primary-action').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { if (fileInput.files?.length) addFiles([...fileInput.files]); fileInput.value = ''; });
dropzone.addEventListener('dragenter', event => { event.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragover', event => event.preventDefault());
dropzone.addEventListener('dragleave', event => { if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('drag-over'); });
dropzone.addEventListener('drop', event => { event.preventDefault(); dropzone.classList.remove('drag-over'); if (event.dataTransfer?.files.length) addFiles([...event.dataTransfer.files]); });
qs('#detail-close').addEventListener('click', closeDetail);
qs('#detail-scrim').addEventListener('click', closeDetail);
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
if (embedded) setEmbeddedView(params.get('view'));
else render();
