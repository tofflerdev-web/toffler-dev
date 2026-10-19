/* toffler.dev shared theme. Loaded synchronously in <head> so the saved choice is
   applied before first paint. Choice = localStorage "toffler-theme" (light|dark, set by the
   homepage button or by the footer button this script adds); with nothing saved each page keeps
   its own native look (<html data-native="light"> for the paper pages, dark otherwise). */
(function(){
"use strict";
var KEY="toffler-theme", d=document.documentElement;
var native=d.getAttribute("data-native")==="light"?"light":"dark";
var theme=native;
try{var s=localStorage.getItem(KEY); if(s==="light"||s==="dark") theme=s;}catch(e){}
d.setAttribute("data-theme",theme);

var it=(d.getAttribute("lang")||"")==="it";
var btn=null;

function paint(){
  var bg=getComputedStyle(document.body).backgroundColor;
  var m=document.querySelector('meta[name="theme-color"]');
  if(m&&bg) m.setAttribute("content",bg);
  if(btn){
    var light=theme==="light";
    btn.textContent=it?("Tema: "+(light?"chiaro":"scuro")):("Theme: "+(light?"light":"dark"));
    btn.setAttribute("aria-pressed",light?"true":"false");
  }
}
function set(t){
  theme=t; d.setAttribute("data-theme",t);
  try{localStorage.setItem(KEY,t);}catch(e){}
  paint();
}

document.addEventListener("DOMContentLoaded",function(){
  var host=document.querySelector("footer .wrap")||document.querySelector("footer");
  btn=document.createElement("button");
  btn.type="button";
  btn.setAttribute("aria-label",it?"Cambia tema colore":"Switch colour theme");
  var a=host&&host.querySelector("a");
  if(a){ // dress it like its sibling links so it reads as one of the footer items
    var cs=getComputedStyle(a);
    btn.style.cssText="font:inherit;letter-spacing:"+cs.letterSpacing+";text-transform:"+cs.textTransform+
      ";color:"+cs.color+";text-decoration:"+cs.textDecorationLine+";text-underline-offset:"+cs.textUnderlineOffset+
      ";background:none;border:none;padding:0;cursor:pointer";
    if(!/flex/.test(getComputedStyle(host).display)) host.appendChild(document.createTextNode(" · "));
    host.appendChild(btn);
  } else { // no footer to live in: small fixed pill
    btn.style.cssText="position:fixed;right:14px;bottom:14px;z-index:60;font:11px/1 monospace;letter-spacing:.15em;"+
      "text-transform:uppercase;color:inherit;background:none;border:1px solid currentColor;padding:8px 12px;cursor:pointer;opacity:.7";
    document.body.appendChild(btn);
  }
  btn.addEventListener("click",function(){set(theme==="light"?"dark":"light");});
  paint();
});
})();
