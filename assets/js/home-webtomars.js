/* Home webtomars: Marte che ruota (canvas) + rete di punti dietro il titolo. Legge .marte-orbita[data-img] e #rete-box. Se mancano non fa nulla. */

/* ===== MARTE START (js) =====
   COME FUNZIONA (3 pezzi indipendenti):
   1. MOTO nel box: due animazioni CSS (Web Animations API) su assi diversi, con periodi diversi (PX/PY),
      cosi' il percorso non si ripete mai uguale. Solo transform -> leggero, niente reflow.
   2. ROTAZIONE: Marte e' un <canvas> disegnato a mano pixel per pixel. Non e' una foto che scorre:
      ogni pixel del disco viene mappato su una sfera 3D e colorato dalla mappa piatta di Marte (marte.webp).
   3. PERSISTENZA: un solo timestamp (t0) in localStorage. Posizione e rotazione derivano da (adesso - t0),
      quindi dopo un refresh riprendono da dove erano, senza salvare nient'altro.
   Per togliere Marte: vedi le istruzioni nel blocco CSS. */
(function(){
  var o=document.querySelector('.marte-orbita'); if(!o) return;
  var y=o.querySelector('.marte-y'), cv=o.querySelector('.marte'); if(!y||!cv) return;
  var ridotto=false /* ignorato di proposito: animazione lenta e minima, deve partire sempre (era matchMedia prefers-reduced-motion) */;
  /* PARAMETRI DA RITOCCARE (in millisecondi):
     PX = periodo del moto orizzontale (andata+ritorno = 2*PX)   PY = idem verticale (diverso da PX di proposito)
     GIRO = tempo di un giro completo di Marte su se stesso (45000 = 45 s; piu' basso = piu' veloce)
     K = chiave localStorage. ATTENZIONE: piu' sotto, dentro img.onload, c'e' un'altra variabile PX
     (array della sfera) che nel suo scope nasconde questa: e' voluto e funziona, ma non usare PX/PY
     del periodo dentro onload. */
  var PX=173000, PY=131000, GIRO=45000, K='marte_t0';
  /* t0 = istante in cui e' iniziata l'"orbita". Se manca (prima visita) lo creo ora. Il try/catch serve
     perche' in navigazione privata o con storage bloccato setItem lancia errore: in quel caso Marte
     funziona lo stesso, semplicemente riparte da zero a ogni refresh. */
  var t0=parseInt(localStorage.getItem(K),10); if(!t0||isNaN(t0)){ t0=Date.now(); try{localStorage.setItem(K,t0);}catch(e){} }
  /* ampiezza dello spostamento orizzontale in vw: ridotta su telefono per non uscire dal box */
  function amp(){ return matchMedia('(max-width:600px)').matches?26:36; }
  function moto(){
    /* prefers-reduced-motion: chi ha "riduci movimento" attivo nel sistema vede Marte fermo */
    if(ridotto) return; var el=Date.now()-t0, ax=amp()+'vw';
    /* cancello le animazioni precedenti: senza questo, dopo un resize se ne accumulerebbero di sovrapposte */
    /* Sfasamento: currentTime = tempo trascorso modulo l'intero ciclo andata+ritorno (2*periodo).
       E' il trucco che fa riprendere la posizione dopo il refresh. */
    o.getAnimations().concat(y.getAnimations()).forEach(function(a){a.cancel();});
    o.animate([{transform:'translateX(-'+ax+')'},{transform:'translateX('+ax+')'}],{duration:PX,iterations:Infinity,direction:'alternate',easing:'ease-in-out'}).currentTime=el%(PX*2);
    y.animate([{transform:'translateY(-110px)'},{transform:'translateY(110px)'}],{duration:PY,iterations:Infinity,direction:'alternate',easing:'ease-in-out'}).currentTime=el%(PY*2);
  }
  /* al resize riparto dopo 300 ms di quiete (debounce) per non ricalcolare a ogni pixel trascinato */
  moto(); var to; addEventListener('resize',function(){clearTimeout(to);to=setTimeout(moto,300);});
  /* S = raggio in pixel del canvas: il disegno e' a 208x208 (2*S) ed e' ridimensionato via CSS, cosi' resta nitido
     sugli schermi ad alta densita'. Aumentarlo migliora la qualita' ma il costo cresce col quadrato. */
  var S=104, img=new Image(); cv.width=S*2; cv.height=S*2;
  /* Tutto il resto parte solo a immagine caricata. Leggo i pixel della mappa UNA volta in un canvas
     di appoggio (getImageData): rileggerli a ogni frame sarebbe lentissimo. */
  img.onload=function(){
    var tc=document.createElement('canvas'); tc.width=img.width; tc.height=img.height; var tx=tc.getContext('2d'); tx.drawImage(img,0,0);
    var T=tx.getImageData(0,0,tc.width,tc.height).data, TW=tc.width, TH=tc.height;
    var g=cv.getContext('2d'), N=S*2, out=g.createImageData(N,N), D=out.data;
    /* sfera vera: per ogni pixel del disco calcolo il punto 3D, lo riporto nel sistema del pianeta
       (asse polare inclinato di TILT) e da li ricavo longitudine/latitudine sulla mappa. */
    /* TILT: inclinazione dell'asse polare (Marte reale ~25). 0 = poli esattamente in alto/in basso.
       cT/sT = coseno e seno precalcolati, perche' servono per ogni pixel. */
    var TILT=25*Math.PI/180, cT=Math.cos(TILT), sT=Math.sin(TILT);
    /* direzione della luce (vettore normalizzato): da alto-sinistra e leggermente frontale.
       Il lato in ombra non e' mai nero (vedi fattore k in frame): il pianeta resta leggibile. */
    var LX=-.55, LY=.45, LZ=.70, LL=Math.sqrt(LX*LX+LY*LY+LZ*LZ); LX/=LL; LY/=LL; LZ/=LL;   /* luce da alto-sinistra */
    /* PRECALCOLO (una volta sola): per ogni pixel del disco salvo il punto 3D ruotato (PX,PY,PZ) e la luce (SH).
       SH=-1 segna i pixel fuori dal cerchio (trasparenti). Cosi' frame() non rifa' la geometria a ogni giro. */
    var PX=new Float32Array(N*N), PY=new Float32Array(N*N), PZ=new Float32Array(N*N), SH=new Float32Array(N*N);
    for(var yy=0;yy<N;yy++)for(var xx=0;xx<N;xx++){
      var nx=(xx+.5-S)/S, ny=(S-yy-.5)/S, r2=nx*nx+ny*ny, i=yy*N+xx;
      if(r2>1){SH[i]=-1;continue;}
      /* nz = profondita' del punto sulla sfera (equazione della sfera: x^2+y^2+z^2=1) */
      var nz=Math.sqrt(1-r2);
      /* rotazione inversa attorno all'asse X = inclinazione dell'asse polare rispetto alla verticale dello schermo */
      PX[i]=nx; PY[i]=ny*cT+nz*sT; PZ[i]=-ny*sT+nz*cT;
      var d=nx*LX+ny*LY+nz*LZ; SH[i]=Math.max(0,d);
    }
    /* frame(ph): disegna un fotogramma. ph = fase di rotazione in radianti (0..2*PI).
       QUESTO e' il punto piu' critico per le prestazioni: gira ogni ~50 ms su ~34.000 pixel.
       Regole se lo modifichi: niente allocazioni qui dentro, niente Math.* inutili, tutto il resto va nel precalcolo. */
    function frame(ph){
      for(var i=0;i<N*N;i++){ var q=i*4;
        if(SH[i]<0){D[q+3]=0;continue;}
        /* longitudine = angolo attorno all'asse polare. Aggiungere ph e' l'UNICA cosa che fa ruotare il pianeta.
           latitudine = quanto in alto/basso; il clamp evita NaN per errori di arrotondamento oltre +-1. */
        var lon=Math.atan2(PX[i],PZ[i])+ph, lat=Math.asin(Math.max(-1,Math.min(1,PY[i])));
        /* u = coordinata orizzontale nella mappa (0..1), avvolta in modo che la mappa chiuda il ciclo senza cucitura */
        var u=lon/6.283185307; u-=Math.floor(u);
        var v=(.5-lat/Math.PI)*(TH-1);
        /* interpolazione bilineare: media pesata dei 4 pixel della mappa attorno al punto. Senza, il pianeta
           apparirebbe a scatti/pixelato mentre ruota. x1=(x0+1)%TW fa "girare" il bordo destro sul sinistro. */
        var xf=u*(TW-1), x0=xf|0, x1=(x0+1)%TW, fx=xf-x0, y0=v|0, y1=Math.min(TH-1,y0+1), fy=v-y0;
        var a=(y0*TW+x0)*4, b=(y0*TW+x1)*4, c=(y1*TW+x0)*4, e=(y1*TW+x1)*4;
        /* luminosita': minimo 30% (lato in ombra ancora visibile) fino a 100%; l'esponente .75 ammorbidisce il passaggio */
        var k=.30+.70*Math.pow(SH[i],.75);
        for(var ch=0;ch<3;ch++){
          var top=T[a+ch]*(1-fx)+T[b+ch]*fx, bot=T[c+ch]*(1-fx)+T[e+ch]*fx;
          D[q+ch]=(top*(1-fy)+bot*fy)*k;
        }
        D[q+3]=255; }
      g.putImageData(out,0,0);
    }
    /* ANIMAZIONE: requestAnimationFrame, ma ridisegno solo ogni 50 ms (~20 fps): per una rotazione lenta
       basta e dimezza il consumo di CPU/batteria. `last` = istante dell'ultimo disegno. */
    var last=0;
    (function tick(now){
      /* la fase dipende dal TEMPO REALE (Date.now()-t0), non da un contatore: e' cosi' che dopo un refresh o un
         tab in background Marte e' dove deve essere, senza scatti ne' salti */
      var ph=((Date.now()-t0)%GIRO)/GIRO*6.283185307;   /* fase legata al tempo: dopo il refresh riprende da dove era */
      /* con riduci-movimento disegno un solo fotogramma fisso (il ramo else-if) e non richiedo altri frame */
      if(!ridotto&&now-last>50){ frame(ph); last=now; } else if(!last){ frame(ph); last=now; }
      if(!ridotto) requestAnimationFrame(tick);
    })(0);
  };
  img.src=(o.getAttribute('data-img')||'');
})();
/* ===== MARTE END (js) ===== */


(function(){
  var box=document.getElementById('rete-box'), cv=document.getElementById('rete-cv'); if(!box||!cv) return;
  var ctx=cv.getContext('2d'), ridotto=false /* ignorato di proposito: animazione lenta e minima, deve partire sempre (era matchMedia prefers-reduced-motion) */;
  var punti=[], w=0, h=0, mouse={x:0,y:0,on:false}, raf=null, visibile=true;
  var DIST=140, DIST_M=190;
  function colore(){
    return document.documentElement.getAttribute('data-theme')==='dark' ? '105,105,115' : '150,150,160';
  }
  function dim(){
    var dpr=Math.min(devicePixelRatio||1,2); w=box.clientWidth; h=box.clientHeight;
    cv.width=w*dpr; cv.height=h*dpr; cv.getContext('2d').setTransform(dpr,0,0,dpr,0,0);
    var n=Math.round(Math.min(100,Math.max(34,(w*h)/7500))); punti=[];
    for(var i=0;i<n;i++) punti.push({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.5,vy:(Math.random()-.5)*.5,r:1.3+Math.random()*1.5});
  }
  function disegna(){
    ctx.clearRect(0,0,w,h); var c=colore();
    for(var i=0;i<punti.length;i++){
      var a=punti[i];
      if(!ridotto){ a.x+=a.vx; a.y+=a.vy; if(a.x<0||a.x>w)a.vx*=-1; if(a.y<0||a.y>h)a.vy*=-1; }
      for(var j=i+1;j<punti.length;j++){
        var b=punti[j], dx=a.x-b.x, dy=a.y-b.y, d=Math.sqrt(dx*dx+dy*dy);
        if(d<DIST){ ctx.strokeStyle='rgba('+c+','+(0.55*(1-d/DIST)).toFixed(3)+')'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
      }
      if(mouse.on){ var mx=a.x-mouse.x,my=a.y-mouse.y,md=Math.sqrt(mx*mx+my*my);
        if(md<DIST_M){ ctx.strokeStyle='rgba('+c+','+(0.75*(1-md/DIST_M)).toFixed(3)+')'; ctx.lineWidth=1.1;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(mouse.x,mouse.y); ctx.stroke(); } }
      ctx.fillStyle='rgba('+c+',0.7)'; ctx.beginPath(); ctx.arc(a.x,a.y,a.r,0,6.2832); ctx.fill();
    }
  }
  function ciclo(){ disegna(); raf=(visibile&&!ridotto)?requestAnimationFrame(ciclo):null; }
  function avvia(){ if(!raf) raf=requestAnimationFrame(ciclo); }
  box.addEventListener('pointermove',function(e){ if(e.pointerType==='touch')return; var r=box.getBoundingClientRect(); mouse.x=e.clientX-r.left; mouse.y=e.clientY-r.top; mouse.on=true; });
  box.addEventListener('pointerleave',function(){ mouse.on=false; });
  document.addEventListener('visibilitychange',function(){ visibile=!document.hidden; if(visibile)avvia(); });
  if('IntersectionObserver' in window) new IntersectionObserver(function(en){ visibile=en[0].isIntersecting; if(visibile)avvia(); }).observe(box);
  var t; addEventListener('resize',function(){ clearTimeout(t); t=setTimeout(function(){dim();disegna();},120); });
  dim(); disegna(); if(!ridotto) avvia();
})();

