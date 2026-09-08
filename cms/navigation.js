document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 const open=[...document.querySelectorAll('.hc-nav details[open]')].reverse();
 if(open.length){const detail=open[0];detail.open=false;detail.querySelector('summary').focus();}
});
document.addEventListener('click',event=>{
 document.querySelectorAll('.hc-nav details[open]').forEach(detail=>{if(!detail.contains(event.target))detail.open=false;});
});
