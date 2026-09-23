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
 {id:'note-1',name:'Noor',time:'TODAY · 10:42',text:'Found a little poem on the tram. I left it on the shelf for whoever needs it.',tone:'cream',tilt:'-1.2deg'},
 {id:'note-2',name:'Eli',time:'YESTERDAY · 17:09',text:'Thank you for the rain recording. I left a drawing in return.',tone:'blue',tilt:'1deg'},
 {id:'note-3',name:'Tess',time:'YESTERDAY · 08:31',text:'Does anyone know why the Westerkerk bells were ringing this morning?',tone:'peach',tilt:'-.6deg'},
 {id:'note-4',name:'Someone nearby',time:'MONDAY · 19:24',text:'The light was orange when I arrived. It felt like finding a small door.',tone:'sage',tilt:'1.4deg'}
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
   <div class="topbar__right"><span class="connection"><i aria-hidden="true"></i> LOCAL NETWORK</span><span class="topbar__id mono">HOST_01<br>DESIGN PREVIEW</span></div>
  </header>
  <div class="page-head">
   <div><p class="eyebrow mono">HOST_01 <span aria-hidden="true">/</span> OPEN NOW</p><h1 id="view-name">The shelf</h1></div>
   <p id="view-intro">Files and notes left here, for whoever comes next.</p>
  </div>
  <div class="view-toolbar">
   <div class="tabs" role="tablist" aria-label="HOST sections">
    <button class="tab" id="shelf-tab" type="button" role="tab" aria-controls="shelf-view"><span>01</span> Shelf <em id="book-count"></em></button>
    <button class="tab" id="board-tab" type="button" role="tab" aria-controls="board-view"><span>02</span> Message board <em id="note-count"></em></button>
   </div>
   <button class="primary-action" id="primary-action" type="button">Leave a file <span aria-hidden="true">↗</span></button>
  </div>
  <main>
   <section class="view shelf-view" id="shelf-view" role="tabpanel" aria-labelledby="shelf-tab">
    <div class="shelf-stage" id="shelf-dropzone">
     <div class="surface-label mono"><span>THE SHELF <span aria-hidden="true">/</span> <span id="shelf-count"></span></span><span>TAKE ONE · LEAVE ONE</span></div>
     <div class="book-stack" id="book-stack" aria-label="Files on the shelf"></div>
     <div class="shelf-foot mono"><span>EVERY OBJECT HAS A STORY</span><span>HOST_01 / AMSTERDAM</span></div>
     <div class="drop-hint" aria-hidden="true">Leave it here</div>
    </div>
    <aside class="detail-panel" id="detail-panel" aria-label="Selected file">
     <button class="detail-close" id="detail-close" type="button" aria-label="Close file details">×</button>
     <div class="detail-cover" id="detail-cover"><span class="mono">HOST<br>OBJECT</span><span class="detail-cover__mark" aria-hidden="true">✳</span></div>
     <p class="detail-kicker mono" id="detail-kicker"></p>
     <h2 id="detail-title"></h2>
     <p class="detail-description" id="detail-description"></p>
     <dl class="detail-facts mono"><div><dt>LEFT BY</dt><dd id="detail-by"></dd></div><div><dt>FORMAT</dt><dd id="detail-format"></dd></div><div><dt>SIZE</dt><dd id="detail-size"></dd></div></dl>
     <button class="take-button" id="take-button" type="button">Take this file <span aria-hidden="true">↘</span></button>
     <p class="detail-footnote mono">TAKING REMOVES IT FROM THE SHELF</p>
    </aside>
    <div class="detail-scrim" id="detail-scrim"></div>
   </section>
   <section class="view board-view" id="board-view" role="tabpanel" aria-labelledby="board-tab" hidden>
    <div class="board-stage">
     <div class="surface-label mono"><span>THE BOARD <span aria-hidden="true">/</span> <span id="board-count"></span></span><span>NOTES FROM NEARBY</span></div>
     <div class="notes-grid" id="notes-grid"></div>
     <div class="board-foot mono">A SLOWER WAY TO SAY HELLO</div>
    </div>
    <aside class="composer">
     <p class="composer__eyebrow mono">LEAVE A NOTE / 01</p>
     <h2>Something for the next person.</h2>
     <form id="message-form">
      <label for="message-text">YOUR MESSAGE</label>
      <textarea id="message-text" maxlength="280" rows="5" placeholder="Write something here…" required></textarea>
      <label for="message-name">YOUR NAME <span>(OPTIONAL)</span></label>
      <input id="message-name" maxlength="24" autocomplete="nickname" placeholder="Anonymous"/>
      <button class="post-button" type="submit">Pin to the board <span aria-hidden="true">↗</span></button>
     </form>
     <p class="composer__foot mono">NOTES IN THIS PREVIEW STAY IN YOUR BROWSER</p>
    </aside>
   </section>
  </main>
  <footer class="site-foot mono"><span>A SMALL LOCAL INTERNET</span><span>DESIGN PREVIEW · NO DEVICE CONNECTED</span></footer>
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
 for(const element of [qs('#book-count'),qs('#shelf-count')])element.textContent=String(books.length).padStart(2,'0');
}
function renderDetail(){
 const book=books.find(item=>item.id===selectedId);
 if(!book){detail.hidden=true;return;}
 detail.hidden=false;
 qs('#detail-cover').style.setProperty('--cover-color',book.color);
 qs('#detail-cover').style.setProperty('--cover-top',book.top);
 qs('#detail-kicker').textContent=`OBJECT ${String(books.indexOf(book)+1).padStart(2,'0')} / ${book.left}`;
 qs('#detail-title').textContent=book.title;
 qs('#detail-description').textContent=book.description;
 qs('#detail-by').textContent=book.by;
 qs('#detail-format').textContent=book.type;
 qs('#detail-size').textContent=book.size;
}
function makeNote(note,index){
 const article=document.createElement('article');article.className=`note note--${note.tone}`;
 article.style.setProperty('--tilt',note.tilt||'0deg');
 const pin=document.createElement('span');pin.className='note__pin';pin.setAttribute('aria-hidden','true');
 const number=document.createElement('span');number.className='note__number mono';number.textContent=String(index+1).padStart(2,'0');
 const text=document.createElement('p');text.textContent=note.text;
 const meta=document.createElement('div');meta.className='note__meta mono';
 const name=document.createElement('span');name.textContent=note.name;
 const time=document.createElement('time');time.textContent=note.time;
 meta.append(name,time);article.append(pin,number,text,meta);
 return article;
}
function renderMessages(){
 const messages=[...addedMessages,...originalMessages];
 notesGrid.replaceChildren(...(embedded?messages.slice(0,2):messages).map(makeNote));
 for(const element of [qs('#note-count'),qs('#board-count')])element.textContent=String(messages.length).padStart(2,'0');
}
function setView(view){
 currentView=view==='board'?'board':'shelf';
 for(const name of ['shelf','board']){
  const active=name===currentView;
  qs(`#${name}-tab`).setAttribute('aria-selected',String(active));
  qs(`#${name}-tab`).tabIndex=active?0:-1;
  qs(`#${name}-view`).hidden=!active;
 }
 qs('#view-name').textContent=currentView==='shelf'?'The shelf':'Message board';
 qs('#view-intro').textContent=currentView==='shelf'?'Files and notes left here, for whoever comes next.':'A slower way to speak to someone nearby.';
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
 addedMessages.unshift({id:crypto.randomUUID(),name:name.slice(0,24),time:'JUST NOW',text:text.slice(0,280),tone:['cream','blue','peach','sage'][addedMessages.length%4],tilt:'-.5deg'});
 addedMessages=addedMessages.slice(0,12);
 try{localStorage.setItem('host-portal-notes-v1',JSON.stringify(addedMessages));}catch{}
 qs('#message-form').reset();renderMessages();showToast('Your note is on this browser’s preview board.');
});
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.data?.type!=='host-portal:view')return;
 setView(event.data.view);
});

renderBooks();renderDetail();renderMessages();setView(currentView);
