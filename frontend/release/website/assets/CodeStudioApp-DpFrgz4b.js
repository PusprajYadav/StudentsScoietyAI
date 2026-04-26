import{b2 as te,bV as se,Z as re,k as e,B as ne,aL as ae,L as ie,cg as oe,a0 as ce,cw as X,ad as de,r as c,z as y}from"./ui-CAXrSXCZ.js";import{F as le,f as pe,e as ue,a as me}from"./index-C_N2xMGY.js";const F="student-society-code-studio-v4",Y="student-society-code-studio-preview",k="Run your code to see stdout, compile output, and runtime messages here.",C="Run the preview to see console logs, render status, and browser errors here.",xe="#e7efff",Z=["javascript","typescript","python","java","cpp","csharp","c","ruby","php","go","rust"],he=[...Z,"html","css","web"],z=[{key:"mobile",label:"Mobile",description:"390px width",icon:te},{key:"tablet",label:"Tablet",description:"768px width",icon:se},{key:"laptop",label:"Laptop",description:"Full workspace width",icon:re}],w={javascript:"JavaScript",typescript:"TypeScript",python:"Python",java:"Java",cpp:"C++",csharp:"C#",c:"C",ruby:"Ruby",php:"PHP",go:"Go",rust:"Rust",html:"HTML",css:"CSS",web:"Web (HTML + CSS + JS)"},T={javascript:`function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("Student Society"));`,typescript:`type Member = {
  name: string;
  tools: number;
};

const member: Member = { name: "Student Society", tools: 3 };

console.log(\`\${member.name} launched \${member.tools} tools.\`);`,python:`def greet(name: str) -> str:
    return f"Hello, {name}!"


print(greet("Student Society"))`,java:`public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, Student Society!");
  }
}`,cpp:`#include <iostream>

int main() {
  std::cout << "Hello, Student Society!" << std::endl;
  return 0;
}`,csharp:`using System;

public class Program
{
  public static void Main()
  {
    Console.WriteLine("Hello, Student Society!");
  }
}`,c:`#include <stdio.h>

int main(void) {
  printf("Hello, Student Society!\\n");
  return 0;
}`,ruby:`def greet(name)
  "Hello, #{name}!"
end

puts greet("Student Society")`,php:`<?php

function greet(string $name): string
{
    return "Hello, {$name}!";
}

echo greet("Student Society");`,go:`package main

import "fmt"

func main() {
  fmt.Println("Hello, Student Society!")
}`,rust:`fn main() {
    println!("Hello, Student Society!");
}`,html:`<section class="hero-card">
  <span class="eyebrow">Student Society</span>
  <h1>Frontend Practice Space</h1>
  <p>
    Edit this HTML and click Run to preview your structure inside the browser sandbox.
  </p>
  <button>Open Tool Workspace</button>
</section>`,css:`.student-preview-shell {
  display: grid;
  gap: 1.5rem;
  padding: 2rem;
}

.hero-card,
.note-card {
  border-radius: 24px;
  padding: 1.5rem;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid rgba(37, 99, 235, 0.18);
  box-shadow: 0 18px 40px -30px rgba(15, 23, 42, 0.45);
}

.eyebrow {
  display: inline-flex;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.35rem 0.75rem;
}

.hero-card h1 {
  margin: 1rem 0 0.5rem;
  font-size: clamp(1.8rem, 3vw, 2.6rem);
}

.hero-card button {
  margin-top: 1rem;
  border: 0;
  border-radius: 999px;
  background: #2563eb;
  color: white;
  padding: 0.8rem 1.2rem;
  font-weight: 700;
  cursor: pointer;
}

.preview-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}`},L={html:`<main class="web-lab">
  <span class="eyebrow">Student Society</span>
  <h1>Web Lab</h1>
  <p>Edit HTML, CSS, and JavaScript together, then click Run.</p>

  <div class="panel">
    <button id="countButton" type="button">
      Clicked <span id="countValue">0</span> times
    </button>
    <p id="statusText">Ready for interaction.</p>
  </div>
</main>`,css:`body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.28), transparent 28rem),
    linear-gradient(180deg, #f8fafc, #e2e8f0);
  color: #0f172a;
}

.web-lab {
  width: min(680px, calc(100vw - 2rem));
  border-radius: 28px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 22px 48px -32px rgba(15, 23, 42, 0.4);
}

.eyebrow {
  display: inline-flex;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.35rem 0.75rem;
}

.web-lab h1 {
  margin: 1rem 0 0.5rem;
  font-size: clamp(2rem, 3vw, 2.8rem);
}

.panel {
  margin-top: 1.5rem;
  display: grid;
  gap: 1rem;
}

#countButton {
  justify-self: start;
  border: 0;
  border-radius: 999px;
  background: #2563eb;
  color: white;
  padding: 0.9rem 1.35rem;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}`,javascript:`const button = document.getElementById("countButton");
const countValue = document.getElementById("countValue");
const statusText = document.getElementById("statusText");

let count = 0;

button?.addEventListener("click", () => {
  count += 1;
  if (countValue) {
    countValue.textContent = String(count);
  }

  if (statusText) {
    statusText.textContent = \`Button clicked \${count} time(s).\`;
  }

  console.log("Current count:", count);
});`},ge=`<div class="student-preview-shell">
  <section class="hero-card">
    <span class="eyebrow">Student Society</span>
    <h1>CSS Preview Board</h1>
    <p>Style cards, buttons, and spacing here without needing separate HTML.</p>
    <button type="button">Primary Action</button>
  </section>

  <section class="preview-grid">
    <article class="note-card">
      <h2>Lecture Notes</h2>
      <p>Timestamped notes, exports, and quick summaries.</p>
    </article>
    <article class="note-card">
      <h2>BugFix Lab</h2>
      <p>Timed practice with hints, scoring, and admin-managed content.</p>
    </article>
  </section>
</div>`,be=`:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  background: #f8fafc;
  color: #0f172a;
}

button,
input,
textarea,
select {
  font: inherit;
}`;function fe(t){if(!t)return null;try{return JSON.parse(t)}catch{return null}}function we(t){return typeof t=="string"&&he.includes(t)}function P(t){return t==="html"||t==="css"||t==="web"}function ve(t,s){return t==="web"?s:t==="cpp"?"cpp":t==="csharp"?"csharp":t}function ye(t,s){return t==="web"?`code-studio/web/index.${s==="javascript"?"js":s}`:t==="cpp"?"code-studio/main.cpp":t==="csharp"?"code-studio/Program.cs":t==="python"?"code-studio/main.py":t==="php"?"code-studio/index.php":t==="java"?"code-studio/Main.java":t==="javascript"?"code-studio/main.js":t==="typescript"?"code-studio/main.ts":`code-studio/main.${t}`}function G(t){return t.replace(/<\/script/gi,"<\\/script")}function je(t){return t.replace(/<\/style/gi,"<\\/style")}function S(t,s,n){return t==="html"?{id:crypto.randomUUID(),mode:t,html:s.html,css:"",javascript:""}:t==="css"?{id:crypto.randomUUID(),mode:t,html:ge,css:s.css,javascript:""}:{id:crypto.randomUUID(),mode:t,html:n.html,css:n.css,javascript:n.javascript}}function Se(t){const s=`
    (() => {
      const source = ${JSON.stringify(Y)};
      const previewId = ${JSON.stringify(t.id)};
      const send = (kind, payload) => {
        try {
          window.parent.postMessage({ source, previewId, kind, payload }, "*");
        } catch {}
      };

      const stringify = (value) => {
        if (typeof value === "string") {
          return value;
        }

        if (value instanceof Error) {
          return value.stack || value.message || String(value);
        }

        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      };

      ["log", "info", "warn", "error"].forEach((level) => {
        const original = console[level];

        console[level] = (...args) => {
          send("console", { level, message: args.map(stringify).join(" ") });
          original.apply(console, args);
        };
      });

      window.addEventListener("error", (event) => {
        send("error", {
          message: event.message || "Runtime error",
          sourceUrl: event.filename || "",
          line: event.lineno || 0,
          column: event.colno || 0,
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason instanceof Error
          ? event.reason.stack || event.reason.message
          : String(event.reason || "Unhandled promise rejection");

        send("error", { message: reason });
      });

      window.addEventListener("DOMContentLoaded", () => {
        send("ready", { message: "Preview rendered." });
      });
    })();
  `;return`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${je(`${be}
${t.css}`)}</style>
    <script>${G(s)}<\/script>
  </head>
  <body>
    ${t.html}
    ${t.javascript.trim()?`<script>${G(t.javascript)}<\/script>`:""}
  </body>
</html>`}function Ne(t,s){if(t==="web")return"Three editable files with a live browser preview.";if(t==="html")return"HTML preview mode running inside your browser sandbox.";if(t==="css")return"CSS preview mode with a built-in starter layout.";const n=s.get(t);return n?`${w[t]} via ${n.versionName}`:`${w[t]} runtime`}function Ee(t){var n,m,l,x,f,a,i,d;const s=(m=(n=t.payload)==null?void 0:n.message)==null?void 0:m.trim();if(t.kind==="ready")return s||"Preview rendered.";if(t.kind==="console"){const u=(((l=t.payload)==null?void 0:l.level)||"log").toUpperCase();return s?`[${u}] ${s}`:`[${u}]`}if(t.kind==="error"){const u=[(f=(x=t.payload)==null?void 0:x.message)==null?void 0:f.trim()].filter(Boolean),h=[(a=t.payload)==null?void 0:a.sourceUrl,(i=t.payload)==null?void 0:i.line,(d=t.payload)==null?void 0:d.column].filter(b=>b!=null&&b!==""&&b!==0).join(":");return h&&u.push(`at ${h}`),`[ERROR] ${u.join(" ")||"Browser error"}`}return""}async function Ce(t){await navigator.clipboard.writeText(t)}function Le(t){return t==="mobile"?{width:390,minWidth:390,height:720}:t==="tablet"?{width:768,minWidth:768,height:860}:{width:"100%",maxWidth:1180,height:760}}function Re({showTitleBlock:t=!0}){return t?e.jsx("section",{className:"surface-card rounded-[30px] p-5 sm:p-6",children:e.jsxs("div",{className:"flex flex-wrap items-start justify-between gap-4",children:[e.jsxs("div",{className:"max-w-2xl",children:[e.jsx("p",{className:"text-[11px] font-semibold uppercase tracking-[0.2em] text-brand",children:"Tool workspace"}),e.jsx("h1",{className:"mt-2 font-display text-[1.55rem] font-semibold tracking-tight text-app-text sm:text-[1.8rem]",children:"Code Studio"}),e.jsx("p",{className:"mt-2 text-sm leading-6 text-app-muted",children:"Run programming languages through Judge0, preview HTML and CSS instantly, or edit HTML, CSS, and JavaScript together in one browser sandbox."})]}),e.jsxs("div",{className:"rounded-[26px] border border-app-border bg-app-secondary/60 px-4 py-3 text-sm text-app-muted",children:[e.jsx("p",{className:"font-semibold text-app-text",children:"Runtime + preview workspace"}),e.jsx("p",{className:"mt-1",children:"Frontend modes run locally in the browser, code runtimes use Judge0."})]})]})}):null}function q({activeWebTab:t,currentEditorValue:s,editorLanguage:n,editorPath:m,isPreviewWorkspace:l,modeDescription:x,running:f,selectedMode:a,onChangeMode:i,onChangeTab:d,onReset:u,onRun:h,onUpdateEditorValue:b}){return e.jsxs("article",{className:"surface-card rounded-[30px] p-4 sm:p-5",children:[e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"rounded-2xl bg-brand/10 p-3 text-brand",children:e.jsx(ne,{className:"h-5 w-5"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold text-app-text",children:"Editor"}),e.jsx("p",{className:"text-xs text-app-muted",children:x})]})]}),e.jsxs("div",{className:"grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:w-auto sm:grid-cols-[minmax(180px,1fr)_auto_auto]",children:[e.jsx("label",{className:"sr-only",htmlFor:"code-studio-mode",children:"Language"}),e.jsxs("select",{id:"code-studio-mode",value:a,onChange:o=>i(o.target.value),className:"min-w-0 rounded-[18px] border border-app-border bg-app-secondary/70 px-3 py-2.5 text-[13px] font-semibold text-app-text outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/10 sm:px-3.5 sm:text-sm",children:[e.jsx("optgroup",{label:"Code runtimes",children:Z.map(o=>e.jsx("option",{value:o,children:w[o]},o))}),e.jsxs("optgroup",{label:"Web preview",children:[e.jsx("option",{value:"html",children:w.html}),e.jsx("option",{value:"css",children:w.css}),e.jsx("option",{value:"web",children:w.web})]})]}),e.jsxs("button",{type:"button",onClick:u,className:"btn-secondary gap-2 whitespace-nowrap !px-3 !py-2.5 text-xs sm:!px-4 sm:text-sm",children:[e.jsx(ae,{className:"h-4 w-4"}),"Reset"]}),e.jsxs("button",{type:"button",onClick:h,className:"btn-primary gap-2 whitespace-nowrap !px-3 !py-2.5 text-xs sm:!px-4 sm:text-sm",children:[f?e.jsx(ie,{className:"h-4 w-4 animate-spin"}):e.jsx(oe,{className:"h-4 w-4"}),e.jsx("span",{className:"sm:hidden",children:"Run"}),e.jsx("span",{className:"hidden sm:inline",children:l?"Run preview":"Run"})]})]})]}),a==="web"?e.jsx("div",{className:"mt-4 flex flex-wrap items-center gap-2 rounded-[22px] border border-app-border bg-app-secondary/35 p-2",children:["html","css","javascript"].map(o=>e.jsx("button",{type:"button",onClick:()=>d(o),className:`rounded-[16px] px-4 py-2 text-sm font-semibold transition ${t===o?"bg-brand text-white shadow-[0_14px_32px_-24px_rgba(37,99,235,0.9)]":"text-app-muted hover:bg-brand/8 hover:text-brand"}`,children:o==="javascript"?"JavaScript":o.toUpperCase()},o))}):null,e.jsx("div",{className:"mt-4 overflow-hidden rounded-[24px] border border-app-border bg-[#111827] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.7)]",children:e.jsx(le,{path:m,height:"560px",theme:"vs-dark",language:n,value:s,onChange:o=>b(o||""),options:{automaticLayout:!0,fontSize:14,minimap:{enabled:!1},padding:{top:18},scrollBeyondLastLine:!1,wordWrap:"on"}})})]})}function _e({drafts:t,previewDevice:s,previewSnapshot:n,previewViewportStyle:m,selectedMode:l,webDrafts:x,onChangePreviewDevice:f}){var a;return e.jsxs("article",{className:"surface-card rounded-[30px] p-4 sm:p-5",children:[e.jsxs("div",{className:"flex flex-wrap items-start justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"rounded-2xl bg-brand/10 p-3 text-brand",children:e.jsx(ce,{className:"h-5 w-5"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold text-app-text",children:"Responsive preview"}),e.jsx("p",{className:"text-xs text-app-muted",children:l==="web"?"Switch between mobile, tablet, and laptop widths for the full HTML, CSS, and JavaScript preview.":l==="css"?"Preview your CSS on a built-in demo layout with device-sized viewports.":"Render HTML inside device-sized browser frames."})]})]}),e.jsx("span",{className:"rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand",children:"Browser sandbox"})]}),e.jsx("div",{className:"mt-4 flex flex-wrap items-center gap-2 rounded-[22px] border border-app-border bg-app-secondary/35 p-2",children:z.map(i=>{const d=i.icon,u=s===i.key;return e.jsxs("button",{type:"button",onClick:()=>f(i.key),className:`inline-flex items-center gap-2 rounded-[16px] px-4 py-2 text-sm font-semibold transition ${u?"bg-brand text-white shadow-[0_14px_32px_-24px_rgba(37,99,235,0.9)]":"text-app-muted hover:bg-brand/8 hover:text-brand"}`,children:[e.jsx(d,{className:"h-4 w-4"}),i.label]},i.key)})}),e.jsx("p",{className:"mt-3 text-xs text-app-muted",children:(a=z.find(i=>i.key===s))==null?void 0:a.description}),e.jsx("div",{className:"mt-4 overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/95 p-3 sm:p-4",children:e.jsx("div",{className:"overflow-x-auto pb-1",children:e.jsx("div",{className:"mx-auto flex min-w-fit justify-center",children:e.jsxs("div",{style:m,className:"flex flex-col overflow-hidden rounded-[28px] border border-slate-700 bg-white shadow-[0_24px_56px_-34px_rgba(15,23,42,0.95)] transition-all duration-300",children:[e.jsxs("div",{className:"flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3",children:[e.jsx("span",{className:"h-2.5 w-2.5 rounded-full bg-rose-400"}),e.jsx("span",{className:"h-2.5 w-2.5 rounded-full bg-amber-400"}),e.jsx("span",{className:"h-2.5 w-2.5 rounded-full bg-emerald-400"}),e.jsxs("span",{className:"ml-3 truncate text-xs font-semibold text-slate-500",children:[w[l]," preview"]})]}),e.jsx("iframe",{title:`${w[l]} preview`,sandbox:"allow-scripts",srcDoc:Se(n||S(l,t,x)),className:"min-h-0 w-full flex-1 bg-white"},(n==null?void 0:n.id)||`${l}-preview`)]})})})})]})}function ke({stdin:t,onChangeStdin:s}){return e.jsxs("article",{className:"surface-card rounded-[30px] p-4 sm:p-5",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"rounded-2xl bg-brand/10 p-3 text-brand",children:e.jsx(X,{className:"h-5 w-5"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold text-app-text",children:"Runtime input"}),e.jsx("p",{className:"text-xs text-app-muted",children:"Send stdin for interactive programs."})]})]}),e.jsx("textarea",{value:t,onChange:n=>s(n.target.value),placeholder:"Optional stdin...",className:"mt-4 h-[112px] w-full rounded-[22px] border border-app-border bg-app-secondary/35 px-4 py-3 text-sm text-app-text outline-none transition placeholder:text-app-muted focus:border-brand/40 focus:ring-2 focus:ring-brand/10 sm:h-[148px]"})]})}function K({isPreviewWorkspace:t,output:s,onCopyOutput:n}){return e.jsxs("article",{className:"surface-card rounded-[30px] p-4 sm:p-5",children:[e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"rounded-2xl bg-brand/10 p-3 text-brand",children:e.jsx(X,{className:"h-5 w-5"})}),e.jsxs("div",{children:[e.jsx("p",{className:"text-sm font-semibold text-app-text",children:t?"Preview logs":"Output"}),e.jsx("p",{className:"text-xs text-app-muted",children:t?"Console logs, render messages, and browser errors appear here.":"Compile output, stdout, stderr, and Judge0 execution status appear here."})]})]}),e.jsxs("button",{type:"button",onClick:n,className:"btn-secondary gap-2 !px-3.5 !py-2.5 text-xs",children:[e.jsx(de,{className:"h-4 w-4"}),"Copy"]})]}),e.jsx("div",{className:"mt-4 overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",children:e.jsx("pre",{className:"min-h-[300px] overflow-auto px-4 py-4 font-mono text-[12.5px] font-medium leading-6 whitespace-pre-wrap",style:{color:xe},children:s})})]})}function Me({showTitleBlock:t=!0}){const[s,n]=c.useState("javascript"),[m,l]=c.useState("laptop"),[x,f]=c.useState(""),[a,i]=c.useState(T),[d,u]=c.useState(L),[h,b]=c.useState("html"),[o,Q]=c.useState([]),[M,O]=c.useState(!1),[R,g]=c.useState(k),[N,E]=c.useState(null),$=c.useMemo(()=>new Map(o.map(r=>[r.key,r])),[o]);c.useEffect(()=>{const r=fe(localStorage.getItem(F));r&&(n(we(r.selectedMode)?r.selectedMode:"javascript"),l(r.previewDevice||"laptop"),f(typeof r.stdin=="string"?r.stdin:""),i({...T,...r.drafts}),u({...L,...r.webDrafts}))},[]),c.useEffect(()=>{localStorage.setItem(F,JSON.stringify({selectedMode:s,previewDevice:m,stdin:x,drafts:a,webDrafts:d}))},[a,m,s,x,d]),c.useEffect(()=>{let r=!1;return pe().then(p=>{r||Q(p)}).catch(p=>{r||console.warn("Judge0 language catalog could not be loaded for Code Studio.",p)}),()=>{r=!0}},[]),c.useEffect(()=>{if(!P(s)){g(k);return}E(r=>r&&r.mode===s?r:S(s,a,d)),g(C)},[a,s,d]),c.useEffect(()=>{function r(p){const v=p.data;if(!v||v.source!==Y||!N||v.previewId!==N.id)return;const _=Ee(v);_&&g(A=>A===C?_:`${A}
${_}`)}return window.addEventListener("message",r),()=>{window.removeEventListener("message",r)}},[N]);const I=s==="web"?d[h]:a[s],D=ve(s,h),H=ye(s,h),J=Ne(s,$),ee=Le(m),j=P(s);async function U(){if(P(s)){E(S(s,a,d)),g("Refreshing preview...");return}const r=$.get(s);if(!r){g("This runtime is not available right now. Check Judge0 settings or try again in a moment."),y.error("Runtime unavailable.");return}O(!0),g("Submitting code...");try{const p=await ue({languageId:r.languageId,sourceCode:a[s],stdin:x});g(me(p))}catch(p){const v=p instanceof Error?p.message:"Execution failed.";g(v),y.error(v)}finally{O(!1)}}function B(){if(s==="web"){u({...L}),b("html"),E(S("web",a,L)),g(C),y.success("Web editor reset.");return}const r={...a,[s]:T[s]};i(r),s==="html"||s==="css"?(E(S(s,r,d)),g(C)):g(k),y.success(`${w[s]} editor reset.`)}function W(r){if(s==="web"){u(p=>({...p,[h]:r}));return}i(p=>({...p,[s]:r}))}async function V(){try{await Ce(R),y.success("Output copied.")}catch{y.error("Could not copy output.")}}return e.jsxs("div",{className:"space-y-4",children:[e.jsx(Re,{showTitleBlock:t}),j?e.jsxs("section",{className:"space-y-4",children:[e.jsx(q,{activeWebTab:h,currentEditorValue:I,editorLanguage:D,editorPath:H,isPreviewWorkspace:j,modeDescription:J,running:M,selectedMode:s,onChangeMode:n,onChangeTab:b,onReset:B,onRun:()=>void U(),onUpdateEditorValue:W}),e.jsx(_e,{drafts:a,previewDevice:m,previewSnapshot:N,previewViewportStyle:ee,selectedMode:s,webDrafts:d,onChangePreviewDevice:l}),e.jsx(K,{isPreviewWorkspace:j,output:R,onCopyOutput:()=>void V()})]}):e.jsxs("section",{className:"grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]",children:[e.jsx(q,{activeWebTab:h,currentEditorValue:I,editorLanguage:D,editorPath:H,isPreviewWorkspace:j,modeDescription:J,running:M,selectedMode:s,onChangeMode:n,onChangeTab:b,onReset:B,onRun:()=>void U(),onUpdateEditorValue:W}),e.jsxs("div",{className:"space-y-4",children:[e.jsx(ke,{stdin:x,onChangeStdin:f}),e.jsx(K,{isPreviewWorkspace:j,output:R,onCopyOutput:()=>void V()})]})]})]})}export{Me as CodeStudioApp};
