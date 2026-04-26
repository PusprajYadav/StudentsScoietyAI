import{E as v}from"./jspdf.es.min-DeNWRN33.js";import{h as z}from"./html2canvas.esm-B4goYG9Y.js";import{s as P,e as M}from"./share-CFXsJ0YU.js";function N(e,n,d){const r=document.createElement("p");return r.textContent=n,d&&(r.className=d),e.appendChild(r),r}function T(e){const n=document.createElement("section");n.className="playarea-pdf-section";const d=document.createElement("p");d.className="playarea-pdf-kicker",d.textContent=e.kicker||e.type.replace(/_/g," "),n.appendChild(d);const r=document.createElement("h2");if(r.className="playarea-pdf-section-title",r.textContent=e.title||"Untitled section",n.appendChild(r),e.type==="paragraph"){const t=document.createElement("div");t.className="playarea-pdf-note";const p=document.createElement("div");p.className="playarea-pdf-note-body",p.textContent=e.text,t.appendChild(p),n.appendChild(t)}else if(e.type==="bullet_list"||e.type==="steps"){const t=document.createElement("div");t.className="playarea-pdf-stack",e.items.forEach((p,i)=>{const a=document.createElement("div");a.className="playarea-pdf-row";const l=document.createElement("div");l.className="playarea-pdf-badge",l.textContent=e.type==="steps"?String(i+1):"•",l.style.backgroundColor=p.highlightColor||e.highlightColor||"#3b82f6",a.appendChild(l);const o=document.createElement("div");if(o.className="playarea-pdf-row-content",p.title.trim()){const f=document.createElement("h3");f.className="playarea-pdf-row-title",f.textContent=p.title,o.appendChild(f)}const s=document.createElement("p");s.className="playarea-pdf-row-text",s.textContent=p.text,o.appendChild(s),a.appendChild(o),t.appendChild(a)}),n.appendChild(t)}else if(e.type==="flashcards"){const t=document.createElement("div");t.className="playarea-pdf-flashcards",e.cards.forEach((p,i)=>{const a=document.createElement("article");a.className="playarea-pdf-flashcard",a.style.setProperty("--card-accent",p.accentColor||"#2563eb"),a.style.setProperty("--card-highlight",p.highlightColor||"#fef08a");const l=document.createElement("div");l.className="playarea-pdf-flashcard-accent",a.appendChild(l);const o=document.createElement("span");o.className="playarea-pdf-chip",o.textContent=`Card ${i+1}`,a.appendChild(o);const s=document.createElement("div");s.className="playarea-pdf-flashcard-side";const f=document.createElement("p");f.className="playarea-pdf-label",f.textContent="Front of Card",s.appendChild(f);const c=document.createElement("p");c.className="playarea-pdf-flashcard-front",c.textContent=p.front||"Untitled front",s.appendChild(c),a.appendChild(s);const x=document.createElement("div");x.className="playarea-pdf-divider",a.appendChild(x);const m=document.createElement("div");m.className="playarea-pdf-flashcard-side";const g=document.createElement("p");g.className="playarea-pdf-label",g.textContent="Back of Card",m.appendChild(g);const h=document.createElement("p");h.className="playarea-pdf-flashcard-back",h.textContent=p.back||"Untitled back",m.appendChild(h),a.appendChild(m),t.appendChild(a)}),n.appendChild(t)}else if(e.type==="quiz"){const t=document.createElement("div");t.className="playarea-pdf-stack",e.questions.forEach((p,i)=>{const a=document.createElement("article");a.className="playarea-pdf-question";const l=document.createElement("div");l.className="playarea-pdf-question-header";const o=document.createElement("span");o.className="playarea-pdf-question-badge",o.textContent=`Question ${i+1}`,o.style.backgroundColor=p.highlightColor||e.highlightColor||"#10b981",l.appendChild(o),a.appendChild(l);const s=document.createElement("h3");s.className="playarea-pdf-question-title",s.textContent=p.question||"Untitled question",a.appendChild(s);const f=document.createElement("div");f.className="playarea-pdf-option-grid",p.options.forEach((k,E)=>{const b=document.createElement("div");b.className="playarea-pdf-option";const C=document.createElement("span");C.className="playarea-pdf-option-tag",C.textContent=`Option ${String.fromCharCode(65+E)}`,b.appendChild(C);const w=document.createElement("p");w.className="playarea-pdf-option-text",w.textContent=k||`Option ${E+1}`,b.appendChild(w),f.appendChild(b)}),a.appendChild(f);const c=document.createElement("div");c.className="playarea-pdf-answer-grid";const x=document.createElement("div");x.className="playarea-pdf-answer-card";const m=document.createElement("p");m.className="playarea-pdf-label",m.textContent="Correct answer",x.appendChild(m);const g=document.createElement("p");g.className="playarea-pdf-answer",g.textContent=p.answer||"Not set",x.appendChild(g),c.appendChild(x);const h=document.createElement("div");h.className="playarea-pdf-answer-card";const y=document.createElement("p");y.className="playarea-pdf-label",y.textContent="Explanation",h.appendChild(y);const u=document.createElement("p");u.className="playarea-pdf-row-text",u.textContent=p.explanation||"No explanation added.",h.appendChild(u),c.appendChild(h),a.appendChild(c),t.appendChild(a)}),n.appendChild(t)}else if(e.type==="mindmap"){const t=document.createElement("div");t.className="playarea-pdf-stack";const p=M(e.nodes);e.nodes.forEach(i=>{const a=document.createElement("div");a.className="playarea-pdf-mindmap-row",a.style.marginLeft=`${(p.get(i.id)||0)*22}px`;const l=document.createElement("span");l.className="playarea-pdf-mindmap-dot",l.style.backgroundColor=i.highlightColor||e.highlightColor||"#3b82f6",a.appendChild(l);const o=document.createElement("span");o.textContent=i.label,a.appendChild(o),t.appendChild(a)}),n.appendChild(t)}else if(e.type==="graph"){if(e.graphUrl){const t=document.createElement("img");t.src=e.graphUrl,t.alt=e.title,t.className="playarea-pdf-graph",t.crossOrigin="anonymous",n.appendChild(t)}if(e.graphCaption.trim()){const t=document.createElement("p");t.className="playarea-pdf-row-text",t.textContent=e.graphCaption,n.appendChild(t)}}return n}function $(e){const n=e.appearance.fontScale==="compact"?.93:e.appearance.fontScale==="large"?1.12:1,d=e.appearance.paperStyle==="plain"?"linear-gradient(90deg, transparent 0 2.7rem, rgba(244,63,94,0.16) 2.7rem 2.78rem, transparent 2.78rem 100%), #fffdf8":"linear-gradient(90deg, transparent 0 2.7rem, rgba(244,63,94,0.16) 2.7rem 2.78rem, transparent 2.78rem 100%), repeating-linear-gradient(180deg, transparent 0 31px, rgba(59,130,246,0.1) 31px 32px), #fffdf8",r=document.createElement("div");r.id="playarea-pdf-export-wrapper",r.style.position="fixed",r.style.top="0",r.style.left="-99999px",r.style.width="794px",r.style.padding="40px",r.style.background="#fffdf8",r.style.color="#0f172a",r.style.visibility="visible",r.style.opacity="1",r.style.zIndex="99999",r.style.pointerEvents="none",r.style.fontFamily="'Manrope', 'Inter', system-ui, -apple-system, sans-serif";const t=document.createElement("style");t.textContent=`
    :root {
      --playarea-note-size: ${18*n}px;
      --playarea-card-front-size: ${18*n}px;
      --playarea-card-back-size: ${14*n}px;
      --playarea-row-size: ${14*n}px;
    }
    .playarea-pdf-cover {
      padding: 32px;
      border: 1px solid #e2e8f0;
      border-radius: 32px;
      background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f1f5f9 100%);
      box-shadow: 0 20px 50px -30px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
    }
    .playarea-pdf-title {
      margin: 0;
      font-size: 36px;
      line-height: 1.2;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .playarea-pdf-subtitle {
      margin: 10px 0 0;
      font-size: 16px;
      color: #475569;
      font-weight: 500;
    }
    .playarea-pdf-summary {
      margin: 16px 0 0;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
    }
    .playarea-pdf-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .playarea-pdf-tag {
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      background: #f8fafc;
    }
    .playarea-pdf-section {
      margin-top: 24px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 28px;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
      box-shadow: 0 10px 30px -15px rgba(0, 0, 0, 0.05);
    }
    .playarea-pdf-kicker {
      margin: 0;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #0ea5e9;
    }
    .playarea-pdf-section-title {
      margin: 6px 0 0;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .playarea-pdf-note {
      margin-top: 20px;
      padding: 24px 24px 24px 50px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      background: ${d};
      min-height: 151px;
    }
    .playarea-pdf-note-body {
      margin: 0;
      white-space: pre-wrap;
      font-size: var(--playarea-note-size);
      line-height: 1.8;
      font-family: "Patrick Hand", "Kalam", cursive;
      color: #1e293b;
    }
    .playarea-pdf-stack {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .playarea-pdf-row {
      display: flex;
      gap: 16px;
      padding: 16px;
      border: 1px solid #f1f5f9;
      border-radius: 20px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .playarea-pdf-badge {
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
      box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.2);
    }
    .playarea-pdf-row-content {
      flex: 1;
    }
    .playarea-pdf-row-title, .playarea-pdf-question-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .playarea-pdf-row-text, .playarea-pdf-answer {
      margin: 4px 0 0;
      font-size: var(--playarea-row-size);
      line-height: 1.6;
      color: #475569;
    }
    .playarea-pdf-flashcards {
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .playarea-pdf-flashcard {
      position: relative;
      padding: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      background: #ffffff;
      break-inside: avoid;
      box-shadow: 0 4px 20px -10px rgba(0, 0, 0, 0.1);
    }
    .playarea-pdf-flashcard-accent {
      position: absolute;
      left: 0;
      top: 20px;
      bottom: 20px;
      width: 6px;
      border-radius: 0 4px 4px 0;
      background: var(--card-accent);
    }
    .playarea-pdf-chip {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #f1f5f9;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 12px;
    }
    .playarea-pdf-flashcard-side {
      margin-bottom: 12px;
    }
    .playarea-pdf-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin: 0 0 4px 0;
    }
    .playarea-pdf-flashcard-front {
      font-size: var(--playarea-card-front-size);
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .playarea-pdf-flashcard-back {
      font-size: var(--playarea-card-back-size);
      color: #475569;
      margin: 0;
    }
    .playarea-pdf-divider {
      height: 1px;
      background: #f1f5f9;
      margin: 12px 0;
    }
    .playarea-pdf-question {
      padding: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .playarea-pdf-question-header {
      margin-bottom: 16px;
    }
    .playarea-pdf-question-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      color: #ffffff;
    }
    .playarea-pdf-option-grid {
      margin: 16px 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .playarea-pdf-option {
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #ffffff;
    }
    .playarea-pdf-option-tag {
      font-size: 9px;
      font-weight: 800;
      color: #94a3b8;
      display: block;
      margin-bottom: 2px;
    }
    .playarea-pdf-option-text {
      font-size: 13px;
      color: #334155;
      margin: 0;
    }
    .playarea-pdf-answer-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 12px;
      margin-top: 16px;
    }
    .playarea-pdf-answer-card {
      padding: 12px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .playarea-pdf-answer {
      font-weight: 700;
      color: #10b981;
      margin: 0;
    }
    .playarea-pdf-mindmap-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    .playarea-pdf-mindmap-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .playarea-pdf-graph {
      width: 100%;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      margin-top: 16px;
    }
  `,r.appendChild(t);const p=document.createElement("div");p.className="playarea-pdf-cover",r.appendChild(p);const i=document.createElement("h1");if(i.className="playarea-pdf-title",i.textContent=e.title,p.appendChild(i),e.subtitle.trim()&&N(p,e.subtitle,"playarea-pdf-subtitle"),e.summary.trim()&&N(p,e.summary,"playarea-pdf-summary"),e.tags.length){const a=document.createElement("div");a.className="playarea-pdf-tags",e.tags.forEach(l=>{const o=document.createElement("span");o.className="playarea-pdf-tag",o.textContent=l,a.appendChild(o)}),p.appendChild(a)}return e.sections.forEach(a=>{r.appendChild(T(a))}),r}async function q(e){const n=Array.from(e.querySelectorAll("img"));await Promise.all(n.map(d=>new Promise(r=>{if(d.complete){r();return}d.addEventListener("load",()=>r(),{once:!0}),d.addEventListener("error",()=>r(),{once:!0})})));try{await document.fonts.ready}catch(d){console.warn("Font loading failed, proceeding with system fonts",d)}}async function U(e){const n=$(e);document.body.appendChild(n);try{await q(n),await new Promise(c=>setTimeout(c,300));const d=await z(n,{scale:2,useCORS:!0,backgroundColor:"#fffdf8",logging:!1,allowTaint:!1,scrollX:0,scrollY:0,windowWidth:874,width:n.scrollWidth,height:n.scrollHeight}),r=210,t=297,p=10,i=r-p*2,a=t-p*2,l=d.width/i,o=a*l,s=new v({orientation:"portrait",unit:"mm",format:"a4"}),f=Math.ceil(d.height/o);for(let c=0;c<f;c++){c>0&&s.addPage();const x=c*o,m=Math.min(o,d.height-x),g=document.createElement("canvas");g.width=d.width,g.height=m;const h=g.getContext("2d");h&&h.drawImage(d,0,x,d.width,m,0,0,d.width,m);const y=g.toDataURL("image/jpeg",.97),u=m/l;s.addImage(y,"JPEG",p,p,i,u)}s.save(`${P(e.title)}.pdf`)}catch(d){throw console.error("PDF Export failed:",d),d}finally{n.remove()}}export{U as e};
