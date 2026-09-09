// Each route has one dedicated control page. Shared links keep them easy to find.
const pages=[['review-elevator.html','Trip'],['review-train.html','1 · Night Train'],['review-delhi.html','2 · Dirty Delhi'],['review-refund.html','3 · Refund Tower']];
const nav=document.createElement('nav');nav.setAttribute('aria-label','Scene explorers');
Object.assign(nav.style,{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'18px'});
for(const [file,label]of pages){
 const link=document.createElement('a');link.href='./'+file;link.textContent=label;
 const current=location.pathname.endsWith('/'+file);if(current)link.setAttribute('aria-current','page');
 Object.assign(link.style,{color:current?'#ffe3a8':'#b9c7c5',background:current?'#302a24':'#1c1d25',border:'1px solid '+(current?'#a48a57':'#49454b'),borderRadius:'4px',padding:'8px 12px',textDecoration:'none',font:'14px system-ui'});
 nav.append(link);
}
document.body.prepend(nav);
