import './style.css';

const params=new URLSearchParams(location.search);
const embedded=params.get('embed')==='1';
document.documentElement.classList.toggle('embedded',embedded);

const originalBooks=[
 {id:'field-notes',title:'Notes from the water',by:'Mara van Dijk',type:'PDF',size:'2.4 MB',left:'TODAY',color:'#637568',top:'#87978a',ink:'#f4eee0',height:65,offset:0,pattern:'lines',description:'A small field guide to the edges of the city: bridges, reflections, and the things people leave behind.'},
 {id:'after-the-rain',title:'After the rain',by:'Joost',type:'WAV',size:'18.6 MB',left:'YESTERDAY',color:'#5379b8',top:'#7c9dd0',ink:'#f5f5ea',height:76,offset:12,pattern:'wave',description:'Two quiet minutes recorded beside the Amstel after a summer storm.'},
 {id:'somewhere-to-begin',title:'Somewhere to begin',by:'Inez',type:'TXT',size:'8 KB',left:'YESTERDAY',color:'#dcad48',top:'#efc66e',ink:'#302d25',height:60,offset:5,pattern:'sun',description:'A list of places to start when you have an afternoon to spend and nowhere to be.'},
 {id:'ordinary-things',title:'Ordinary things',by:'Anonymous',type:'JPG',size:'3.1 MB',left:'MONDAY',color:'#d8dcd5',top:'#f1f2ec',ink:'#343934',height:69,offset:19,pattern:'hatch',description:'A photograph of a tiny library, a bicycle, and the first light on a quiet street.'},
 {id:'city-at-six',title:'The city at six',by:'Raf',type:'MP3',size:'6.8 MB',left:'MONDAY',color:'#6d7196',top:'#959abc',ink:'#f1ede9',height:64,offset:7,pattern:'wave',description:'An audio postcard from the streets before the shops open.'},
 {id:'open-letter',title:'An open letter',by:'Noor',type:'MD',size:'12 KB',left:'SUNDAY',color:'#ab6654',top:'#cf8b73',ink:'#fff3e7',height:72,offset:15,pattern:'lines',description:'A letter to the next person who finds this small network.'}
];
const originalMessages=[
 {id:'note-1',name:'Noor',time:'TODAY · 10:42',text:'Found a little poem on the tram. I left it on the shelf for whoever needs it.'},
 {id:'note-2',name:'Eli',time:'YESTERDAY · 17:09',text:'Thank you for the rain recording. I left a drawing in return.'},
 {id:'note-3',name:'Tess',time:'YESTERDAY · 08:31',text:'Does anyone know why the Westerkerk bells were ringing this morning?'},
 {id:'note-4',name:'Someone nearby',time:'MONDAY · 19:24',text:'The light was orange when I arrived. It felt like finding a small door.'}
];

let books=originalBooks.map(book=>({...book}));
let addedMessages=[];
if(!embedded){
 try{
  const saved=JSON.parse(localStorage.getItem('host-portal-notes-v1')||'[]');
  if(Array.isArray(saved))addedMessages=saved.filter(item=>item&&typeof item.text==='string'&&typeof item.name==='string').slice(0,12);
 }catch{}
}
let currentView=params.get('view')==='board'?'board':'shelf';
let selectedId=books[0].id;
let toastTimer;

document.querySelector('#app').innerHTML=`
 <div class="portal-shell">
  <header class="topbar">
   <a class="brand" href="./" aria-label="HOST, return to the shelf">HOST</a>
   <span class="connection mono"><i aria-hidden="true"></i> LOCAL</span>
  </header>
  <div class="view-toolbar">
   <div class="tabs" role="tablist" aria-label="HOST sections">
    <button class="tab" id="shelf-tab" type="button" role="tab" aria-controls="shelf-view">Shelf</button>
    <button class="tab" id="board-tab" type="button" role="tab" aria-controls="board-view">Message board</button>
   </div>
  </div>
  <main>
   <div class="page-head"><h1 id="view-name">Shelf</h1><button class="primary-action" id="primary-action" type="button">Leave a file <span aria-hidden="true">↗</span></button></div>
   <section class="view shelf-view" id="shelf-view" role="tabpanel" aria-labelledby="shelf-tab">
    <div class="shelf-stage" id="shelf-dropzone">
     <div class="book-stack" id="book-stack" aria-label="Files on the shelf"></div>
     <div class="drop-hint" aria-hidden="true">Leave it here</div>
    </div>
    <aside class="detail-panel" id="detail-panel" aria-label="Selected file">
     <button class="detail-close" id="detail-close" type="button" aria-label="Close file details">×</button>
     <p class="detail-kicker mono">SELECTED FILE</p>
     <h2 id="detail-title"></h2>
     <dl class="detail-facts mono"><div><dt>BY</dt><dd id="detail-by"></dd></div><div><dt>TYPE</dt><dd id="detail-format"></dd></div><div><dt>SIZE</dt><dd id="detail-size"></dd></div></dl>
     <button class="take-button" id="take-button" type="button">Take file <span aria-hidden="true">↘</span></button>
    </aside>
    <div class="detail-scrim" id="detail-scrim"></div>
   </section>
   <section class="view board-view" id="board-view" role="tabpanel" aria-labelledby="board-tab" hidden>
    <div class="board-stage">
     <div class="notes-grid" id="notes-grid"></div>
    </div>
    <aside class="composer">
     <h2>Leave a note</h2>
     <form id="message-form">
      <label class="visually-hidden" for="message-text">Message</label>
      <textarea id="message-text" maxlength="280" rows="5" placeholder="Your message" required></textarea>
      <label class="visually-hidden" for="message-name">Name (optional)</label>
      <input id="message-name" maxlength="24" autocomplete="nickname" placeholder="Name (optional)"/>
      <button class="post-button" type="submit">Post note <span aria-hidden="true">↗</span></button>
     </form>
    </aside>
   </section>
  </main>
  <footer class="site-foot mono">DESIGN PREVIEW · BROWSER LOCAL</footer>
 </div>
 <input id="file-input" type="file" multiple hidden/>
 <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const qs=selector=>document.querySelector(selector);
const stack=qs('#book-stack');
const notesGrid=qs('#notes-grid');
const detail=qs('#detail-panel');
const fileInput=qs('#file-input');
const dropzone=qs('#shelf-dropzone');

function showToast(message){
 const toast=qs('#toast');
 toast.textContent=message;
 toast.classList.add('visible');
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>toast.classList.remove('visible'),3800);
}
function closeDetail(){detail.classList.remove('open');document.body.classList.remove('detail-open');}
function formatSize(bytes){
 if(bytes<1024)return `${bytes} B`;
 if(bytes<1024*1024)return `${Math.round(bytes/1024)} KB`;
 return `${(bytes/1024/1024).toFixed(1)} MB`;
}
function makeBook(book){
 const button=document.createElement('button');
 button.type='button';button.className='book';
 if(book.id===selectedId)button.classList.add('selected');
 button.setAttribute('aria-pressed',String(book.id===selectedId));
 button.setAttribute('aria-label',`${book.title}, ${book.type}, left by ${book.by}. View file details.`);
 for(const [key,value] of Object.entries({color:book.color,top:book.top,ink:book.ink,height:`${book.height}px`,offset:`${book.offset}px`}))button.style.setProperty(`--book-${key}`,value);
 button.dataset.pattern=book.pattern;
 const top=document.createElement('span');top.className='book__top';top.setAttribute('aria-hidden','true');
 const spine=document.createElement('span');spine.className='book__spine';
 const by=document.createElement('span');by.className='book__by';by.textContent=book.by;
 const title=document.createElement('span');title.className='book__title';title.textContent=book.title;
 const type=document.createElement('span');type.className='book__type mono';type.textContent=book.type;
 spine.append(by,title,type);button.append(top,spine);
 button.addEventListener('click',()=>{selectedId=book.id;renderBooks();renderDetail();if(matchMedia('(max-width: 760px)').matches&&!embedded){detail.classList.add('open');document.body.classList.add('detail-open');}});
 return button;
}
function renderBooks(){
 stack.replaceChildren(...(embedded?books.slice(0,3):books).map(makeBook));
}
function renderDetail(){
 const book=books.find(item=>item.id===selectedId);
 if(!book){detail.hidden=true;return;}
 detail.hidden=false;
 qs('#detail-title').textContent=book.title;
 qs('#detail-by').textContent=book.by;
 qs('#detail-format').textContent=book.type;
 qs('#detail-size').textContent=book.size;
}
function makeNote(note){
 const article=document.createElement('article');article.className='note';
 const text=document.createElement('p');text.textContent=note.text;
 const meta=document.createElement('div');meta.className='note__meta mono';
 const name=document.createElement('span');name.textContent=note.name;
 const time=document.createElement('time');time.textContent=note.time;
 meta.append(name,time);article.append(text,meta);
 return article;
}
function renderMessages(){
 const messages=[...addedMessages,...originalMessages];
 notesGrid.replaceChildren(...(embedded?messages.slice(0,2):messages).map(makeNote));
}
function setView(view){
 currentView=view==='board'?'board':'shelf';
 for(const name of ['shelf','board']){
  const active=name===currentView;
  qs(`#${name}-tab`).setAttribute('aria-selected',String(active));
  qs(`#${name}-tab`).tabIndex=active?0:-1;
  qs(`#${name}-view`).hidden=!active;
 }
 qs('#view-name').textContent=currentView==='shelf'?'Shelf':'Message board';
 qs('#primary-action').innerHTML=currentView==='shelf'?'Leave a file <span aria-hidden="true">↗</span>':'Leave a note <span aria-hidden="true">↗</span>';
 closeDetail();
}
function addFiles(files){
 const palette=[['#637568','#87978a','#f4eee0'],['#5379b8','#7c9dd0','#f5f5ea'],['#dcad48','#efc66e','#302d25'],['#ab6654','#cf8b73','#fff3e7']];
 for(const file of files){
  const [color,top,ink]=palette[books.length%palette.length];
  const extension=file.name.split('.').pop()?.toUpperCase().slice(0,6)||'FILE';
  books.unshift({id:crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')||file.name,by:'You',type:extension,size:formatSize(file.size),left:'JUST NOW',color,top,ink,height:68,offset:8,pattern:'lines',description:'A file you added to this browser preview. It is available here until you reload the page.',file});
 }
 selectedId=books[0].id;renderBooks();renderDetail();setView('shelf');
 showToast(files.length===1?'Added to your preview shelf.':'Files added to your preview shelf.');
}

qs('#shelf-tab').addEventListener('click',()=>setView('shelf'));
qs('#board-tab').addEventListener('click',()=>setView('board'));
qs('.tabs').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
 event.preventDefault();setView(currentView==='shelf'?'board':'shelf');qs(`#${currentView}-tab`).focus();
});
qs('#primary-action').addEventListener('click',()=>{
 if(currentView==='shelf')fileInput.click();
 else{qs('#message-text').focus();qs('.composer').scrollIntoView({behavior:'smooth',block:'center'});}
});
fileInput.addEventListener('change',()=>{if(fileInput.files?.length)addFiles([...fileInput.files]);fileInput.value='';});
dropzone.addEventListener('dragenter',event=>{event.preventDefault();dropzone.classList.add('drag-over');});
dropzone.addEventListener('dragover',event=>event.preventDefault());
dropzone.addEventListener('dragleave',event=>{if(!dropzone.contains(event.relatedTarget))dropzone.classList.remove('drag-over');});
dropzone.addEventListener('drop',event=>{event.preventDefault();dropzone.classList.remove('drag-over');if(event.dataTransfer?.files.length)addFiles([...event.dataTransfer.files]);});
qs('#detail-close').addEventListener('click',closeDetail);
qs('#detail-scrim').addEventListener('click',closeDetail);
qs('#take-button').addEventListener('click',()=>{
 const book=books.find(item=>item.id===selectedId);
 if(!book)return;
 if(!book.file){showToast('Design preview: this file is available on a HOST device.');return;}
 const url=URL.createObjectURL(book.file),link=document.createElement('a');link.href=url;link.download=book.file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 books=books.filter(item=>item.id!==book.id);selectedId=books[0]?.id;renderBooks();renderDetail();closeDetail();showToast('Taken. The shelf has one less file.');
});
qs('#message-form').addEventListener('submit',event=>{
 event.preventDefault();
 const text=qs('#message-text').value.trim(),name=qs('#message-name').value.trim()||'Anonymous';
 if(!text)return;
 addedMessages.unshift({id:crypto.randomUUID(),name:name.slice(0,24),time:'JUST NOW',text:text.slice(0,280)});
 addedMessages=addedMessages.slice(0,12);
 try{localStorage.setItem('host-portal-notes-v1',JSON.stringify(addedMessages));}catch{}
 qs('#message-form').reset();renderMessages();showToast('Your note is on this browser’s preview board.');
});
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='host-portal:view')return;
 setView(event.data.view);
});

renderBooks();renderDetail();renderMessages();setView(currentView);
