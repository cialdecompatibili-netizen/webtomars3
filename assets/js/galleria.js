/* GUIDA-SVILUPPO: LIGHTBOX + FILTRI DELLA GALLERIA (classi exlb-* e exg-*). Caricato (defer) da _includes/head/custom.html, stili in assets/css/galleria.css.
   LIGHTBOX: si apre cliccando un link <a data-lb="gruppo" href="foto" data-cap="didascalia">; le foto con lo stesso data-lb formano la serie
   (frecce, tasti Esc/frecce, swipe). FILTRI: pulsanti in .exg-f con data-f che mostrano/nascondono gli .exg-i in base al loro data-t.
   Nessuna dipendenza. Se rinomini data-lb / data-cap / exlb-* / exg-* aggiorna anche il CSS e l'HTML che le usa. */
(function(){
  var box,img,cap,items=[],idx=0;
  function build(){
    if(box)return;
    box=document.createElement('div');box.className='exlb';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
    box.innerHTML='<button class="exlb-x" aria-label="Chiudi">&times;</button><button class="exlb-p" aria-label="Precedente">&#8249;</button><img alt=""><button class="exlb-n" aria-label="Successiva">&#8250;</button><div class="exlb-c"></div>';
    document.body.appendChild(box);
    img=box.querySelector('img');cap=box.querySelector('.exlb-c');
    box.addEventListener('click',function(e){if(e.target===box||e.target.className==='exlb-x')close();});
    box.querySelector('.exlb-p').onclick=function(e){e.stopPropagation();go(-1);};
    box.querySelector('.exlb-n').onclick=function(e){e.stopPropagation();go(1);};
    var sx=null;
    box.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
    box.addEventListener('touchend',function(e){if(sx===null)return;var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50)go(d<0?1:-1);sx=null;});
  }
  function show(){var a=items[idx];img.src=a.href;img.alt=a.getAttribute('data-cap')||'';cap.textContent=a.getAttribute('data-cap')||'';}
  function go(n){idx=(idx+n+items.length)%items.length;show();}
  function close(){box.classList.remove('on');document.documentElement.style.overflow='';}
  document.addEventListener('keydown',function(e){
    if(!box||!box.classList.contains('on'))return;
    if(e.key==='Escape')close();else if(e.key==='ArrowLeft')go(-1);else if(e.key==='ArrowRight')go(1);
  });
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[data-lb]');
    if(!a)return;
    e.preventDefault();build();
    var g=a.getAttribute('data-lb');
    items=[].slice.call(document.querySelectorAll('a[data-lb="'+g+'"]')).filter(function(x){return !x.closest('[hidden]');});
    idx=Math.max(0,items.indexOf(a));
    show();box.classList.add('on');document.documentElement.style.overflow='hidden';
  });
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.exg-f button');
    if(!b)return;
    var root=b.closest('.exg'),f=b.getAttribute('data-f');
    [].forEach.call(root.querySelectorAll('.exg-f button'),function(x){x.classList.toggle('on',x===b);});
    [].forEach.call(root.querySelectorAll('.exg-i'),function(i){
      var t=(i.getAttribute('data-t')||'').split(' ');
      i.hidden=!(f==='tutte'||t.indexOf(f)>-1);
    });
  });
})();
