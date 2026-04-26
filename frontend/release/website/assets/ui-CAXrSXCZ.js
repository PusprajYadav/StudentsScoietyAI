function wr(t,e){for(var n=0;n<e.length;n++){const s=e[n];if(typeof s!="string"&&!Array.isArray(s)){for(const i in s)if(i!=="default"&&!(i in t)){const r=Object.getOwnPropertyDescriptor(s,i);r&&Object.defineProperty(t,i,r.get?r:{enumerable:!0,get:()=>s[i]})}}}return Object.freeze(Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}))}var z1=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function Tr(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}function F1(t){if(t.__esModule)return t;var e=t.default;if(typeof e=="function"){var n=function s(){return this instanceof s?Reflect.construct(e,arguments,this.constructor):e.apply(this,arguments)};n.prototype=e.prototype}else n={};return Object.defineProperty(n,"__esModule",{value:!0}),Object.keys(t).forEach(function(s){var i=Object.getOwnPropertyDescriptor(t,s);Object.defineProperty(n,s,i.get?i:{enumerable:!0,get:function(){return t[s]}})}),n}var gi={exports:{}},we={},ki={exports:{}},C={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var _t=Symbol.for("react.element"),Sr=Symbol.for("react.portal"),Cr=Symbol.for("react.fragment"),Pr=Symbol.for("react.strict_mode"),Ar=Symbol.for("react.profiler"),Vr=Symbol.for("react.provider"),Dr=Symbol.for("react.context"),Er=Symbol.for("react.forward_ref"),Lr=Symbol.for("react.suspense"),Rr=Symbol.for("react.memo"),jr=Symbol.for("react.lazy"),Qn=Symbol.iterator;function zr(t){return t===null||typeof t!="object"?null:(t=Qn&&t[Qn]||t["@@iterator"],typeof t=="function"?t:null)}var vi={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},xi=Object.assign,Mi={};function Et(t,e,n){this.props=t,this.context=e,this.refs=Mi,this.updater=n||vi}Et.prototype.isReactComponent={};Et.prototype.setState=function(t,e){if(typeof t!="object"&&typeof t!="function"&&t!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,t,e,"setState")};Et.prototype.forceUpdate=function(t){this.updater.enqueueForceUpdate(this,t,"forceUpdate")};function bi(){}bi.prototype=Et.prototype;function Mn(t,e,n){this.props=t,this.context=e,this.refs=Mi,this.updater=n||vi}var bn=Mn.prototype=new bi;bn.constructor=Mn;xi(bn,Et.prototype);bn.isPureReactComponent=!0;var ts=Array.isArray,wi=Object.prototype.hasOwnProperty,wn={current:null},Ti={key:!0,ref:!0,__self:!0,__source:!0};function Si(t,e,n){var s,i={},r=null,a=null;if(e!=null)for(s in e.ref!==void 0&&(a=e.ref),e.key!==void 0&&(r=""+e.key),e)wi.call(e,s)&&!Ti.hasOwnProperty(s)&&(i[s]=e[s]);var o=arguments.length-2;if(o===1)i.children=n;else if(1<o){for(var c=Array(o),h=0;h<o;h++)c[h]=arguments[h+2];i.children=c}if(t&&t.defaultProps)for(s in o=t.defaultProps,o)i[s]===void 0&&(i[s]=o[s]);return{$$typeof:_t,type:t,key:r,ref:a,props:i,_owner:wn.current}}function Fr(t,e){return{$$typeof:_t,type:t.type,key:e,ref:t.ref,props:t.props,_owner:t._owner}}function Tn(t){return typeof t=="object"&&t!==null&&t.$$typeof===_t}function Ir(t){var e={"=":"=0",":":"=2"};return"$"+t.replace(/[=:]/g,function(n){return e[n]})}var es=/\/+/g;function De(t,e){return typeof t=="object"&&t!==null&&t.key!=null?Ir(""+t.key):e.toString(36)}function se(t,e,n,s,i){var r=typeof t;(r==="undefined"||r==="boolean")&&(t=null);var a=!1;if(t===null)a=!0;else switch(r){case"string":case"number":a=!0;break;case"object":switch(t.$$typeof){case _t:case Sr:a=!0}}if(a)return a=t,i=i(a),t=s===""?"."+De(a,0):s,ts(i)?(n="",t!=null&&(n=t.replace(es,"$&/")+"/"),se(i,e,n,"",function(h){return h})):i!=null&&(Tn(i)&&(i=Fr(i,n+(!i.key||a&&a.key===i.key?"":(""+i.key).replace(es,"$&/")+"/")+t)),e.push(i)),1;if(a=0,s=s===""?".":s+":",ts(t))for(var o=0;o<t.length;o++){r=t[o];var c=s+De(r,o);a+=se(r,e,n,c,i)}else if(c=zr(t),typeof c=="function")for(t=c.call(t),o=0;!(r=t.next()).done;)r=r.value,c=s+De(r,o++),a+=se(r,e,n,c,i);else if(r==="object")throw e=String(t),Error("Objects are not valid as a React child (found: "+(e==="[object Object]"?"object with keys {"+Object.keys(t).join(", ")+"}":e)+"). If you meant to render a collection of children, use an array instead.");return a}function Yt(t,e,n){if(t==null)return t;var s=[],i=0;return se(t,s,"","",function(r){return e.call(n,r,i++)}),s}function Br(t){if(t._status===-1){var e=t._result;e=e(),e.then(function(n){(t._status===0||t._status===-1)&&(t._status=1,t._result=n)},function(n){(t._status===0||t._status===-1)&&(t._status=2,t._result=n)}),t._status===-1&&(t._status=0,t._result=e)}if(t._status===1)return t._result.default;throw t._result}var U={current:null},ie={transition:null},Or={ReactCurrentDispatcher:U,ReactCurrentBatchConfig:ie,ReactCurrentOwner:wn};function Ci(){throw Error("act(...) is not supported in production builds of React.")}C.Children={map:Yt,forEach:function(t,e,n){Yt(t,function(){e.apply(this,arguments)},n)},count:function(t){var e=0;return Yt(t,function(){e++}),e},toArray:function(t){return Yt(t,function(e){return e})||[]},only:function(t){if(!Tn(t))throw Error("React.Children.only expected to receive a single React element child.");return t}};C.Component=Et;C.Fragment=Cr;C.Profiler=Ar;C.PureComponent=Mn;C.StrictMode=Pr;C.Suspense=Lr;C.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Or;C.act=Ci;C.cloneElement=function(t,e,n){if(t==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+t+".");var s=xi({},t.props),i=t.key,r=t.ref,a=t._owner;if(e!=null){if(e.ref!==void 0&&(r=e.ref,a=wn.current),e.key!==void 0&&(i=""+e.key),t.type&&t.type.defaultProps)var o=t.type.defaultProps;for(c in e)wi.call(e,c)&&!Ti.hasOwnProperty(c)&&(s[c]=e[c]===void 0&&o!==void 0?o[c]:e[c])}var c=arguments.length-2;if(c===1)s.children=n;else if(1<c){o=Array(c);for(var h=0;h<c;h++)o[h]=arguments[h+2];s.children=o}return{$$typeof:_t,type:t.type,key:i,ref:r,props:s,_owner:a}};C.createContext=function(t){return t={$$typeof:Dr,_currentValue:t,_currentValue2:t,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},t.Provider={$$typeof:Vr,_context:t},t.Consumer=t};C.createElement=Si;C.createFactory=function(t){var e=Si.bind(null,t);return e.type=t,e};C.createRef=function(){return{current:null}};C.forwardRef=function(t){return{$$typeof:Er,render:t}};C.isValidElement=Tn;C.lazy=function(t){return{$$typeof:jr,_payload:{_status:-1,_result:t},_init:Br}};C.memo=function(t,e){return{$$typeof:Rr,type:t,compare:e===void 0?null:e}};C.startTransition=function(t){var e=ie.transition;ie.transition={};try{t()}finally{ie.transition=e}};C.unstable_act=Ci;C.useCallback=function(t,e){return U.current.useCallback(t,e)};C.useContext=function(t){return U.current.useContext(t)};C.useDebugValue=function(){};C.useDeferredValue=function(t){return U.current.useDeferredValue(t)};C.useEffect=function(t,e){return U.current.useEffect(t,e)};C.useId=function(){return U.current.useId()};C.useImperativeHandle=function(t,e,n){return U.current.useImperativeHandle(t,e,n)};C.useInsertionEffect=function(t,e){return U.current.useInsertionEffect(t,e)};C.useLayoutEffect=function(t,e){return U.current.useLayoutEffect(t,e)};C.useMemo=function(t,e){return U.current.useMemo(t,e)};C.useReducer=function(t,e,n){return U.current.useReducer(t,e,n)};C.useRef=function(t){return U.current.useRef(t)};C.useState=function(t){return U.current.useState(t)};C.useSyncExternalStore=function(t,e,n){return U.current.useSyncExternalStore(t,e,n)};C.useTransition=function(){return U.current.useTransition()};C.version="18.3.1";ki.exports=C;var g=ki.exports;const Hr=Tr(g),I1=wr({__proto__:null,default:Hr},[g]);/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var qr=g,Nr=Symbol.for("react.element"),Ur=Symbol.for("react.fragment"),$r=Object.prototype.hasOwnProperty,_r=qr.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Wr={key:!0,ref:!0,__self:!0,__source:!0};function Pi(t,e,n){var s,i={},r=null,a=null;n!==void 0&&(r=""+n),e.key!==void 0&&(r=""+e.key),e.ref!==void 0&&(a=e.ref);for(s in e)$r.call(e,s)&&!Wr.hasOwnProperty(s)&&(i[s]=e[s]);if(t&&t.defaultProps)for(s in e=t.defaultProps,e)i[s]===void 0&&(i[s]=e[s]);return{$$typeof:Nr,type:t,key:r,ref:a,props:i,_owner:_r.current}}we.Fragment=Ur;we.jsx=Pi;we.jsxs=Pi;gi.exports=we;var Ke=gi.exports;let Kr={data:""},Gr=t=>{if(typeof window=="object"){let e=(t?t.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return e.nonce=window.__nonce__,e.parentNode||(t||document.head).appendChild(e),e.firstChild}return t||Kr},Xr=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,Zr=/\/\*[^]*?\*\/|  +/g,ns=/\n+/g,ht=(t,e)=>{let n="",s="",i="";for(let r in t){let a=t[r];r[0]=="@"?r[1]=="i"?n=r+" "+a+";":s+=r[1]=="f"?ht(a,r):r+"{"+ht(a,r[1]=="k"?"":e)+"}":typeof a=="object"?s+=ht(a,e?e.replace(/([^,])+/g,o=>r.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,c=>/&/.test(c)?c.replace(/&/g,o):o?o+" "+c:c)):r):a!=null&&(r=/^--/.test(r)?r:r.replace(/[A-Z]/g,"-$&").toLowerCase(),i+=ht.p?ht.p(r,a):r+":"+a+";")}return n+(e&&i?e+"{"+i+"}":i)+s},rt={},Ai=t=>{if(typeof t=="object"){let e="";for(let n in t)e+=n+Ai(t[n]);return e}return t},Yr=(t,e,n,s,i)=>{let r=Ai(t),a=rt[r]||(rt[r]=(c=>{let h=0,l=11;for(;h<c.length;)l=101*l+c.charCodeAt(h++)>>>0;return"go"+l})(r));if(!rt[a]){let c=r!==t?t:(h=>{let l,u,f=[{}];for(;l=Xr.exec(h.replace(Zr,""));)l[4]?f.shift():l[3]?(u=l[3].replace(ns," ").trim(),f.unshift(f[0][u]=f[0][u]||{})):f[0][l[1]]=l[2].replace(ns," ").trim();return f[0]})(t);rt[a]=ht(i?{["@keyframes "+a]:c}:c,n?"":"."+a)}let o=n&&rt.g?rt.g:null;return n&&(rt.g=rt[a]),((c,h,l,u)=>{u?h.data=h.data.replace(u,c):h.data.indexOf(c)===-1&&(h.data=l?c+h.data:h.data+c)})(rt[a],e,s,o),a},Jr=(t,e,n)=>t.reduce((s,i,r)=>{let a=e[r];if(a&&a.call){let o=a(n),c=o&&o.props&&o.props.className||/^go/.test(o)&&o;a=c?"."+c:o&&typeof o=="object"?o.props?"":ht(o,""):o===!1?"":o}return s+i+(a??"")},"");function Te(t){let e=this||{},n=t.call?t(e.p):t;return Yr(n.unshift?n.raw?Jr(n,[].slice.call(arguments,1),e.p):n.reduce((s,i)=>Object.assign(s,i&&i.call?i(e.p):i),{}):n,Gr(e.target),e.g,e.o,e.k)}let Vi,Ge,Xe;Te.bind({g:1});let ot=Te.bind({k:1});function Qr(t,e,n,s){ht.p=e,Vi=t,Ge=n,Xe=s}function pt(t,e){let n=this||{};return function(){let s=arguments;function i(r,a){let o=Object.assign({},r),c=o.className||i.className;n.p=Object.assign({theme:Ge&&Ge()},o),n.o=/ *go\d+/.test(c),o.className=Te.apply(n,s)+(c?" "+c:"");let h=t;return t[0]&&(h=o.as||t,delete o.as),Xe&&h[0]&&Xe(o),Vi(h,o)}return i}}var to=t=>typeof t=="function",fe=(t,e)=>to(t)?t(e):t,eo=(()=>{let t=0;return()=>(++t).toString()})(),Di=(()=>{let t;return()=>{if(t===void 0&&typeof window<"u"){let e=matchMedia("(prefers-reduced-motion: reduce)");t=!e||e.matches}return t}})(),no=20,Sn="default",Ei=(t,e)=>{let{toastLimit:n}=t.settings;switch(e.type){case 0:return{...t,toasts:[e.toast,...t.toasts].slice(0,n)};case 1:return{...t,toasts:t.toasts.map(a=>a.id===e.toast.id?{...a,...e.toast}:a)};case 2:let{toast:s}=e;return Ei(t,{type:t.toasts.find(a=>a.id===s.id)?1:0,toast:s});case 3:let{toastId:i}=e;return{...t,toasts:t.toasts.map(a=>a.id===i||i===void 0?{...a,dismissed:!0,visible:!1}:a)};case 4:return e.toastId===void 0?{...t,toasts:[]}:{...t,toasts:t.toasts.filter(a=>a.id!==e.toastId)};case 5:return{...t,pausedAt:e.time};case 6:let r=e.time-(t.pausedAt||0);return{...t,pausedAt:void 0,toasts:t.toasts.map(a=>({...a,pauseDuration:a.pauseDuration+r}))}}},ae=[],Li={toasts:[],pausedAt:void 0,settings:{toastLimit:no}},nt={},Ri=(t,e=Sn)=>{nt[e]=Ei(nt[e]||Li,t),ae.forEach(([n,s])=>{n===e&&s(nt[e])})},ji=t=>Object.keys(nt).forEach(e=>Ri(t,e)),so=t=>Object.keys(nt).find(e=>nt[e].toasts.some(n=>n.id===t)),Se=(t=Sn)=>e=>{Ri(e,t)},io={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},ao=(t={},e=Sn)=>{let[n,s]=g.useState(nt[e]||Li),i=g.useRef(nt[e]);g.useEffect(()=>(i.current!==nt[e]&&s(nt[e]),ae.push([e,s]),()=>{let a=ae.findIndex(([o])=>o===e);a>-1&&ae.splice(a,1)}),[e]);let r=n.toasts.map(a=>{var o,c,h;return{...t,...t[a.type],...a,removeDelay:a.removeDelay||((o=t[a.type])==null?void 0:o.removeDelay)||(t==null?void 0:t.removeDelay),duration:a.duration||((c=t[a.type])==null?void 0:c.duration)||(t==null?void 0:t.duration)||io[a.type],style:{...t.style,...(h=t[a.type])==null?void 0:h.style,...a.style}}});return{...n,toasts:r}},ro=(t,e="blank",n)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:e,ariaProps:{role:"status","aria-live":"polite"},message:t,pauseDuration:0,...n,id:(n==null?void 0:n.id)||eo()}),Wt=t=>(e,n)=>{let s=ro(e,t,n);return Se(s.toasterId||so(s.id))({type:2,toast:s}),s.id},z=(t,e)=>Wt("blank")(t,e);z.error=Wt("error");z.success=Wt("success");z.loading=Wt("loading");z.custom=Wt("custom");z.dismiss=(t,e)=>{let n={type:3,toastId:t};e?Se(e)(n):ji(n)};z.dismissAll=t=>z.dismiss(void 0,t);z.remove=(t,e)=>{let n={type:4,toastId:t};e?Se(e)(n):ji(n)};z.removeAll=t=>z.remove(void 0,t);z.promise=(t,e,n)=>{let s=z.loading(e.loading,{...n,...n==null?void 0:n.loading});return typeof t=="function"&&(t=t()),t.then(i=>{let r=e.success?fe(e.success,i):void 0;return r?z.success(r,{id:s,...n,...n==null?void 0:n.success}):z.dismiss(s),i}).catch(i=>{let r=e.error?fe(e.error,i):void 0;r?z.error(r,{id:s,...n,...n==null?void 0:n.error}):z.dismiss(s)}),t};var oo=1e3,co=(t,e="default")=>{let{toasts:n,pausedAt:s}=ao(t,e),i=g.useRef(new Map).current,r=g.useCallback((u,f=oo)=>{if(i.has(u))return;let p=setTimeout(()=>{i.delete(u),a({type:4,toastId:u})},f);i.set(u,p)},[]);g.useEffect(()=>{if(s)return;let u=Date.now(),f=n.map(p=>{if(p.duration===1/0)return;let y=(p.duration||0)+p.pauseDuration-(u-p.createdAt);if(y<0){p.visible&&z.dismiss(p.id);return}return setTimeout(()=>z.dismiss(p.id,e),y)});return()=>{f.forEach(p=>p&&clearTimeout(p))}},[n,s,e]);let a=g.useCallback(Se(e),[e]),o=g.useCallback(()=>{a({type:5,time:Date.now()})},[a]),c=g.useCallback((u,f)=>{a({type:1,toast:{id:u,height:f}})},[a]),h=g.useCallback(()=>{s&&a({type:6,time:Date.now()})},[s,a]),l=g.useCallback((u,f)=>{let{reverseOrder:p=!1,gutter:y=8,defaultPosition:k}=f||{},m=n.filter(v=>(v.position||k)===(u.position||k)&&v.height),x=m.findIndex(v=>v.id===u.id),M=m.filter((v,w)=>w<x&&v.visible).length;return m.filter(v=>v.visible).slice(...p?[M+1]:[0,M]).reduce((v,w)=>v+(w.height||0)+y,0)},[n]);return g.useEffect(()=>{n.forEach(u=>{if(u.dismissed)r(u.id,u.removeDelay);else{let f=i.get(u.id);f&&(clearTimeout(f),i.delete(u.id))}})},[n,r]),{toasts:n,handlers:{updateHeight:c,startPause:o,endPause:h,calculateOffset:l}}},lo=ot`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,ho=ot`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,uo=ot`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,fo=pt("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${t=>t.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${lo} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${ho} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${t=>t.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${uo} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,po=ot`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,yo=pt("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${t=>t.secondary||"#e0e0e0"};
  border-right-color: ${t=>t.primary||"#616161"};
  animation: ${po} 1s linear infinite;
`,mo=ot`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,go=ot`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,ko=pt("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${t=>t.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${mo} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${go} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${t=>t.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,vo=pt("div")`
  position: absolute;
`,xo=pt("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,Mo=ot`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,bo=pt("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${Mo} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,wo=({toast:t})=>{let{icon:e,type:n,iconTheme:s}=t;return e!==void 0?typeof e=="string"?g.createElement(bo,null,e):e:n==="blank"?null:g.createElement(xo,null,g.createElement(yo,{...s}),n!=="loading"&&g.createElement(vo,null,n==="error"?g.createElement(fo,{...s}):g.createElement(ko,{...s})))},To=t=>`
0% {transform: translate3d(0,${t*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,So=t=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${t*-150}%,-1px) scale(.6); opacity:0;}
`,Co="0%{opacity:0;} 100%{opacity:1;}",Po="0%{opacity:1;} 100%{opacity:0;}",Ao=pt("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,Vo=pt("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Do=(t,e)=>{let n=t.includes("top")?1:-1,[s,i]=Di()?[Co,Po]:[To(n),So(n)];return{animation:e?`${ot(s)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${ot(i)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},Eo=g.memo(({toast:t,position:e,style:n,children:s})=>{let i=t.height?Do(t.position||e||"top-center",t.visible):{opacity:0},r=g.createElement(wo,{toast:t}),a=g.createElement(Vo,{...t.ariaProps},fe(t.message,t));return g.createElement(Ao,{className:t.className,style:{...i,...n,...t.style}},typeof s=="function"?s({icon:r,message:a}):g.createElement(g.Fragment,null,r,a))});Qr(g.createElement);var Lo=({id:t,className:e,style:n,onHeightUpdate:s,children:i})=>{let r=g.useCallback(a=>{if(a){let o=()=>{let c=a.getBoundingClientRect().height;s(t,c)};o(),new MutationObserver(o).observe(a,{subtree:!0,childList:!0,characterData:!0})}},[t,s]);return g.createElement("div",{ref:r,className:e,style:n},i)},Ro=(t,e)=>{let n=t.includes("top"),s=n?{top:0}:{bottom:0},i=t.includes("center")?{justifyContent:"center"}:t.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:Di()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${e*(n?1:-1)}px)`,...s,...i}},jo=Te`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,Jt=16,B1=({reverseOrder:t,position:e="top-center",toastOptions:n,gutter:s,children:i,toasterId:r,containerStyle:a,containerClassName:o})=>{let{toasts:c,handlers:h}=co(n,r);return g.createElement("div",{"data-rht-toaster":r||"",style:{position:"fixed",zIndex:9999,top:Jt,left:Jt,right:Jt,bottom:Jt,pointerEvents:"none",...a},className:o,onMouseEnter:h.startPause,onMouseLeave:h.endPause},c.map(l=>{let u=l.position||e,f=h.calculateOffset(l,{reverseOrder:t,gutter:s,defaultPosition:e}),p=Ro(u,f);return g.createElement(Lo,{id:l.id,key:l.id,onHeightUpdate:h.updateHeight,className:l.visible?jo:"",style:p},l.type==="custom"?fe(l.message,l):i?i(l):g.createElement(Eo,{toast:l,position:u}))}))},O1=z;/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zo=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),zi=(...t)=>t.filter((e,n,s)=>!!e&&e.trim()!==""&&s.indexOf(e)===n).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Fo={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Io=g.forwardRef(({color:t="currentColor",size:e=24,strokeWidth:n=2,absoluteStrokeWidth:s,className:i="",children:r,iconNode:a,...o},c)=>g.createElement("svg",{ref:c,...Fo,width:e,height:e,stroke:t,strokeWidth:s?Number(n)*24/Number(e):n,className:zi("lucide",i),...o},[...a.map(([h,l])=>g.createElement(h,l)),...Array.isArray(r)?r:[r]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=(t,e)=>{const n=g.forwardRef(({className:s,...i},r)=>g.createElement(Io,{ref:r,iconNode:e,className:zi(`lucide-${zo(t)}`,s),...i}));return n.displayName=`${t}`,n};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H1=d("Activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q1=d("ArrowDownLeft",[["path",{d:"M17 7 7 17",key:"15tmo1"}],["path",{d:"M17 17H7V7",key:"1org7z"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N1=d("ArrowDown",[["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"m19 12-7 7-7-7",key:"1idqje"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U1=d("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $1=d("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _1=d("ArrowUpRight",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W1=d("ArrowUp",[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K1=d("AtSign",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8",key:"7n84p3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G1=d("BadgeCheck",[["path",{d:"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",key:"3c2336"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X1=d("Ban",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m4.9 4.9 14.2 14.2",key:"1m5liu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=d("Barcode",[["path",{d:"M3 5v14",key:"1nt18q"}],["path",{d:"M8 5v14",key:"1ybrkv"}],["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"M17 5v14",key:"ycjyhj"}],["path",{d:"M21 5v14",key:"nzette"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=d("Bell",[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=d("BookOpenCheck",[["path",{d:"M12 21V7",key:"gj6g52"}],["path",{d:"m16 12 2 2 4-4",key:"mdajum"}],["path",{d:"M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3",key:"8arnkb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q1=d("BookOpenText",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M16 12h2",key:"7q9ll5"}],["path",{d:"M16 8h2",key:"msurwy"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}],["path",{d:"M6 12h2",key:"32wvfc"}],["path",{d:"M6 8h2",key:"30oboj"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const td=d("BookOpen",[["path",{d:"M12 7v14",key:"1akyts"}],["path",{d:"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z",key:"ruj8y"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ed=d("Bot",[["path",{d:"M12 8V4H8",key:"hb8ula"}],["rect",{width:"16",height:"12",x:"4",y:"8",rx:"2",key:"enze0r"}],["path",{d:"M2 14h2",key:"vft8re"}],["path",{d:"M20 14h2",key:"4cs60a"}],["path",{d:"M15 13v2",key:"1xurst"}],["path",{d:"M9 13v2",key:"rq6x2g"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nd=d("Braces",[["path",{d:"M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1",key:"ezmyqa"}],["path",{d:"M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1",key:"e1hn23"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sd=d("BrainCircuit",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M9 13a4.5 4.5 0 0 0 3-4",key:"10igwf"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M12 13h4",key:"1ku699"}],["path",{d:"M12 18h6a2 2 0 0 1 2 2v1",key:"105ag5"}],["path",{d:"M12 8h8",key:"1lhi5i"}],["path",{d:"M16 8V5a2 2 0 0 1 2-2",key:"u6izg6"}],["circle",{cx:"16",cy:"13",r:".5",key:"ry7gng"}],["circle",{cx:"18",cy:"3",r:".5",key:"1aiba7"}],["circle",{cx:"20",cy:"21",r:".5",key:"yhc1fs"}],["circle",{cx:"20",cy:"8",r:".5",key:"1e43v0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const id=d("Brain",[["path",{d:"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z",key:"l5xja"}],["path",{d:"M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z",key:"ep3f8r"}],["path",{d:"M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4",key:"1p4c4q"}],["path",{d:"M17.599 6.5a3 3 0 0 0 .399-1.375",key:"tmeiqw"}],["path",{d:"M6.003 5.125A3 3 0 0 0 6.401 6.5",key:"105sqy"}],["path",{d:"M3.477 10.896a4 4 0 0 1 .585-.396",key:"ql3yin"}],["path",{d:"M19.938 10.5a4 4 0 0 1 .585.396",key:"1qfode"}],["path",{d:"M6 18a4 4 0 0 1-1.967-.516",key:"2e4loj"}],["path",{d:"M19.967 17.484A4 4 0 0 1 18 18",key:"159ez6"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ad=d("Briefcase",[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rd=d("Bug",[["path",{d:"m8 2 1.88 1.88",key:"fmnt4t"}],["path",{d:"M14.12 3.88 16 2",key:"qol33r"}],["path",{d:"M9 7.13v-1a3.003 3.003 0 1 1 6 0v1",key:"d7y7pr"}],["path",{d:"M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6",key:"xs1cw7"}],["path",{d:"M12 20v-9",key:"1qisl0"}],["path",{d:"M6.53 9C4.6 8.8 3 7.1 3 5",key:"32zzws"}],["path",{d:"M6 13H2",key:"82j7cp"}],["path",{d:"M3 21c0-2.1 1.7-3.9 3.8-4",key:"4p0ekp"}],["path",{d:"M20.97 5c0 2.1-1.6 3.8-3.5 4",key:"18gb23"}],["path",{d:"M22 13h-4",key:"1jl80f"}],["path",{d:"M17.2 17c2.1.1 3.8 1.9 3.8 4",key:"k3fwyw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const od=d("CalendarCheck2",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M21 14V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8",key:"bce9hv"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"m16 20 2 2 4-4",key:"13tcca"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cd=d("CalendarDays",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M16 14h.01",key:"1gbofw"}],["path",{d:"M8 18h.01",key:"lrp35t"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M16 18h.01",key:"kzsmim"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ld=d("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hd=d("ChartColumn",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ud=d("CheckCheck",[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dd=d("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fd=d("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pd=d("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yd=d("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const md=d("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gd=d("CircleAlert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kd=d("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vd=d("CirclePlay",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polygon",{points:"10 8 16 12 10 16 10 8",key:"1cimsy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xd=d("CircleUserRound",[["path",{d:"M18 20a6 6 0 0 0-12 0",key:"1qehca"}],["circle",{cx:"12",cy:"10",r:"4",key:"1h16sb"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Md=d("CircleX",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bd=d("Clock3",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polyline",{points:"12 6 12 12 16.5 12",key:"1aq6pp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wd=d("CloudDownload",[["path",{d:"M12 13v8l-4-4",key:"1f5nwf"}],["path",{d:"m12 21 4-4",key:"1lfcce"}],["path",{d:"M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284",key:"ui1hmy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Td=d("CloudUpload",[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"m8 17 4-4 4 4",key:"1quai1"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sd=d("Cloud",[["path",{d:"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z",key:"p7xjir"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cd=d("CodeXml",[["path",{d:"m18 16 4-4-4-4",key:"1inbqp"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}],["path",{d:"m14.5 4-5 16",key:"e7oirm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pd=d("Coins",[["circle",{cx:"8",cy:"8",r:"6",key:"3yglwk"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18",key:"t5s6rm"}],["path",{d:"M7 6h1v4",key:"1obek4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82",key:"1rbuyh"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ad=d("Compass",[["path",{d:"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z",key:"9ktpf1"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vd=d("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dd=d("CornerDownRight",[["polyline",{points:"15 10 20 15 15 20",key:"1q7qjw"}],["path",{d:"M4 4v7a4 4 0 0 0 4 4h12",key:"z08zvw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ed=d("Cpu",[["rect",{width:"16",height:"16",x:"4",y:"4",rx:"2",key:"14l7u7"}],["rect",{width:"6",height:"6",x:"9",y:"9",rx:"1",key:"5aljv4"}],["path",{d:"M15 2v2",key:"13l42r"}],["path",{d:"M15 20v2",key:"15mkzm"}],["path",{d:"M2 15h2",key:"1gxd5l"}],["path",{d:"M2 9h2",key:"1bbxkp"}],["path",{d:"M20 15h2",key:"19e6y8"}],["path",{d:"M20 9h2",key:"19tzq7"}],["path",{d:"M9 2v2",key:"165o2o"}],["path",{d:"M9 20v2",key:"i2bqo8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ld=d("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rd=d("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jd=d("DatabaseZap",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 15 21.84",key:"14ibmq"}],["path",{d:"M21 5V8",key:"1marbg"}],["path",{d:"M21 12L18 17H22L19 22",key:"zafso"}],["path",{d:"M3 12A9 3 0 0 0 14.59 14.87",key:"1y4wr8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zd=d("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fd=d("DoorOpen",[["path",{d:"M13 4h3a2 2 0 0 1 2 2v14",key:"hrm0s9"}],["path",{d:"M2 20h3",key:"1gaodv"}],["path",{d:"M13 20h9",key:"s90cdi"}],["path",{d:"M10 12v.01",key:"vx6srw"}],["path",{d:"M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z",key:"199qr4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Id=d("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bd=d("Earth",[["path",{d:"M21.54 15H17a2 2 0 0 0-2 2v4.54",key:"1djwo0"}],["path",{d:"M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17",key:"1tzkfa"}],["path",{d:"M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05",key:"14pb5j"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Od=d("EllipsisVertical",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"12",cy:"5",r:"1",key:"gxeob9"}],["circle",{cx:"12",cy:"19",r:"1",key:"lyex9k"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hd=d("Ellipsis",[["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["circle",{cx:"19",cy:"12",r:"1",key:"1wjl8i"}],["circle",{cx:"5",cy:"12",r:"1",key:"1pcz8c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qd=d("Eraser",[["path",{d:"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",key:"182aya"}],["path",{d:"M22 21H7",key:"t4ddhn"}],["path",{d:"m5 11 9 9",key:"1mo9qw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nd=d("Expand",[["path",{d:"m21 21-6-6m6 6v-4.8m0 4.8h-4.8",key:"1c15vz"}],["path",{d:"M3 16.2V21m0 0h4.8M3 21l6-6",key:"1fsnz2"}],["path",{d:"M21 7.8V3m0 0h-4.8M21 3l-6 6",key:"hawz9i"}],["path",{d:"M3 7.8V3m0 0h4.8M3 3l6 6",key:"u9ee12"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ud=d("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $d=d("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _d=d("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wd=d("FileImage",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["circle",{cx:"10",cy:"12",r:"2",key:"737tya"}],["path",{d:"m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22",key:"wt3hpn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kd=d("FileJson",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1",key:"1oajmo"}],["path",{d:"M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1",key:"mpwhp6"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gd=d("FilePlus2",[["path",{d:"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4",key:"1pf5j1"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M3 15h6",key:"4e2qda"}],["path",{d:"M6 12v6",key:"1u72j0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xd=d("FileSpreadsheet",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M8 13h2",key:"yr2amv"}],["path",{d:"M14 13h2",key:"un5t4a"}],["path",{d:"M8 17h2",key:"2yhykz"}],["path",{d:"M14 17h2",key:"10kma7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zd=d("FileStack",[["path",{d:"M21 7h-3a2 2 0 0 1-2-2V2",key:"9rb54x"}],["path",{d:"M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z",key:"1059l0"}],["path",{d:"M7 8v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H15",key:"16874u"}],["path",{d:"M3 12v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H11",key:"k2ox98"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yd=d("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jd=d("Film",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M7 3v18",key:"bbkbws"}],["path",{d:"M3 7.5h4",key:"zfgn84"}],["path",{d:"M3 12h18",key:"1i2n21"}],["path",{d:"M3 16.5h4",key:"1230mu"}],["path",{d:"M17 3v18",key:"in4fa5"}],["path",{d:"M17 7.5h4",key:"myr1c1"}],["path",{d:"M17 16.5h4",key:"go4c1d"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qd=d("Flag",[["path",{d:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z",key:"i9b6wo"}],["line",{x1:"4",x2:"4",y1:"22",y2:"15",key:"1cm3nv"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t0=d("FolderClosed",[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}],["path",{d:"M2 10h20",key:"1ir3d8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const e0=d("FolderKanban",[["path",{d:"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z",key:"1fr9dc"}],["path",{d:"M8 10v4",key:"tgpxqk"}],["path",{d:"M12 10v2",key:"hh53o1"}],["path",{d:"M16 10v6",key:"1d6xys"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const n0=d("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const s0=d("FolderPlus",[["path",{d:"M12 10v6",key:"1bos4e"}],["path",{d:"M9 13h6",key:"1uhe8q"}],["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const i0=d("FolderTree",[["path",{d:"M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",key:"hod4my"}],["path",{d:"M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z",key:"w4yl2u"}],["path",{d:"M3 5a2 2 0 0 0 2 2h3",key:"f2jnh7"}],["path",{d:"M3 3v13a2 2 0 0 0 2 2h3",key:"k8epm1"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a0=d("Ghost",[["path",{d:"M9 10h.01",key:"qbtxuw"}],["path",{d:"M15 10h.01",key:"1qmjsl"}],["path",{d:"M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z",key:"uwwb07"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r0=d("Gift",[["rect",{x:"3",y:"8",width:"18",height:"4",rx:"1",key:"bkv52"}],["path",{d:"M12 8v13",key:"1c76mn"}],["path",{d:"M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7",key:"6wjy6b"}],["path",{d:"M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5",key:"1ihvrl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o0=d("GitBranch",[["line",{x1:"6",x2:"6",y1:"3",y2:"15",key:"17qcm7"}],["circle",{cx:"18",cy:"6",r:"3",key:"1h7g24"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M18 9a9 9 0 0 1-9 9",key:"n2h4wq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c0=d("Globe",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",key:"13o1zl"}],["path",{d:"M2 12h20",key:"9i4pu4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l0=d("GraduationCap",[["path",{d:"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",key:"j76jl0"}],["path",{d:"M22 10v6",key:"1lu8f3"}],["path",{d:"M6 12.5V16a6 3 0 0 0 12 0v-3.5",key:"1r8lef"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h0=d("GripVertical",[["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}],["circle",{cx:"9",cy:"5",r:"1",key:"hp0tcf"}],["circle",{cx:"9",cy:"19",r:"1",key:"fkjjf6"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["circle",{cx:"15",cy:"19",r:"1",key:"f4zoj3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u0=d("Hand",[["path",{d:"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",key:"1fvzgz"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",key:"1kc0my"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",key:"10h0bg"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",key:"1s1gnw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d0=d("HardDriveDownload",[["path",{d:"M12 2v8",key:"1q4o3n"}],["path",{d:"m16 6-4 4-4-4",key:"6wukr"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",key:"w68u3i"}],["path",{d:"M6 18h.01",key:"uhywen"}],["path",{d:"M10 18h.01",key:"h775k"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f0=d("HardDrive",[["line",{x1:"22",x2:"2",y1:"12",y2:"12",key:"1y58io"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}],["line",{x1:"6",x2:"6.01",y1:"16",y2:"16",key:"sgf278"}],["line",{x1:"10",x2:"10.01",y1:"16",y2:"16",key:"1l4acy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p0=d("Hash",[["line",{x1:"4",x2:"20",y1:"9",y2:"9",key:"4lhtct"}],["line",{x1:"4",x2:"20",y1:"15",y2:"15",key:"vyu0kd"}],["line",{x1:"10",x2:"8",y1:"3",y2:"21",key:"1ggp8o"}],["line",{x1:"16",x2:"14",y1:"3",y2:"21",key:"weycgp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y0=d("Headphones",[["path",{d:"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3",key:"1xhozi"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m0=d("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g0=d("Highlighter",[["path",{d:"m9 11-6 6v3h9l3-3",key:"1a3l36"}],["path",{d:"m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4",key:"14a9rk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k0=d("ImagePlus",[["path",{d:"M16 5h6",key:"1vod17"}],["path",{d:"M19 2v6",key:"4bpg5p"}],["path",{d:"M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5",key:"1ue2ih"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v0=d("ImageUp",[["path",{d:"M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21",key:"9csbqa"}],["path",{d:"m14 19.5 3-3 3 3",key:"9vmjn0"}],["path",{d:"M17 22v-5.5",key:"1aa6fl"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x0=d("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M0=d("Import",[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m8 11 4 4 4-4",key:"1dohi6"}],["path",{d:"M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4",key:"1ywtjm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b0=d("Inbox",[["polyline",{points:"22 12 16 12 14 15 10 15 8 12 2 12",key:"o97t9d"}],["path",{d:"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",key:"oot6mr"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w0=d("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T0=d("Instagram",[["rect",{width:"20",height:"20",x:"2",y:"2",rx:"5",ry:"5",key:"2e1cvw"}],["path",{d:"M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",key:"9exkf1"}],["line",{x1:"17.5",x2:"17.51",y1:"6.5",y2:"6.5",key:"r4j83e"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S0=d("KeyRound",[["path",{d:"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z",key:"1s6t7t"}],["circle",{cx:"16.5",cy:"7.5",r:".5",fill:"currentColor",key:"w0ekpg"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C0=d("LaptopMinimal",[["rect",{width:"18",height:"12",x:"3",y:"4",rx:"2",ry:"2",key:"1qhy41"}],["line",{x1:"2",x2:"22",y1:"20",y2:"20",key:"ni3hll"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P0=d("Layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A0=d("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V0=d("LayoutGrid",[["rect",{width:"7",height:"7",x:"3",y:"3",rx:"1",key:"1g98yp"}],["rect",{width:"7",height:"7",x:"14",y:"3",rx:"1",key:"6d4xhi"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const D0=d("LayoutPanelTop",[["rect",{width:"18",height:"7",x:"3",y:"3",rx:"1",key:"f1a2em"}],["rect",{width:"7",height:"7",x:"3",y:"14",rx:"1",key:"1bb6yr"}],["rect",{width:"7",height:"7",x:"14",y:"14",rx:"1",key:"nxv5o0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E0=d("LayoutTemplate",[["rect",{width:"18",height:"7",x:"3",y:"3",rx:"1",key:"f1a2em"}],["rect",{width:"9",height:"7",x:"3",y:"14",rx:"1",key:"jqznyg"}],["rect",{width:"5",height:"7",x:"16",y:"14",rx:"1",key:"q5h2i8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L0=d("Lightbulb",[["path",{d:"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",key:"1gvzjb"}],["path",{d:"M9 18h6",key:"x1upvd"}],["path",{d:"M10 22h4",key:"ceow96"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R0=d("Link2",[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j0=d("Linkedin",[["path",{d:"M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z",key:"c2jq9f"}],["rect",{width:"4",height:"12",x:"2",y:"9",key:"mk3on5"}],["circle",{cx:"4",cy:"4",r:"2",key:"bt5ra8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z0=d("ListChecks",[["path",{d:"m3 17 2 2 4-4",key:"1jhpwq"}],["path",{d:"m3 7 2 2 4-4",key:"1obspn"}],["path",{d:"M13 6h8",key:"15sg57"}],["path",{d:"M13 12h8",key:"h98zly"}],["path",{d:"M13 18h8",key:"oe0vm4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const F0=d("List",[["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 18h.01",key:"1tta3j"}],["path",{d:"M3 6h.01",key:"1rqtza"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 18h13",key:"1lx6n3"}],["path",{d:"M8 6h13",key:"ik3vkj"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I0=d("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B0=d("LockKeyhole",[["circle",{cx:"12",cy:"16",r:"1",key:"1au0dj"}],["rect",{x:"3",y:"10",width:"18",height:"12",rx:"2",key:"6s8ecr"}],["path",{d:"M7 10V7a5 5 0 0 1 10 0v3",key:"1pqi11"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O0=d("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H0=d("LogIn",[["path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",key:"u53s6r"}],["polyline",{points:"10 17 15 12 10 7",key:"1ail0h"}],["line",{x1:"15",x2:"3",y1:"12",y2:"12",key:"v6grx8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const q0=d("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N0=d("MailCheck",[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8",key:"12jkf8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}],["path",{d:"m16 19 2 2 4-4",key:"1b14m6"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U0=d("MailPlus",[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8",key:"12jkf8"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}],["path",{d:"M19 16v6",key:"tddt3s"}],["path",{d:"M16 19h6",key:"xwg31i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $0=d("MailX",[["path",{d:"M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9",key:"1j9vog"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}],["path",{d:"m17 17 4 4",key:"1b3523"}],["path",{d:"m21 17-4 4",key:"uinynz"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _0=d("Mail",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",key:"18n3k1"}],["path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",key:"1ocrg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W0=d("MapPin",[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",key:"1r0f0z"}],["circle",{cx:"12",cy:"10",r:"3",key:"ilqhr7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K0=d("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const G0=d("MessageCircleMore",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}],["path",{d:"M8 12h.01",key:"czm47f"}],["path",{d:"M12 12h.01",key:"1mp3jc"}],["path",{d:"M16 12h.01",key:"1l6xoz"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const X0=d("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z0=d("MessageSquareMore",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M16 10h.01",key:"1m94wz"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y0=d("MessageSquareQuote",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}],["path",{d:"M8 12a2 2 0 0 0 2-2V8H8",key:"1jfesj"}],["path",{d:"M14 12a2 2 0 0 0 2-2V8h-2",key:"1dq9mh"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J0=d("MessageSquareText",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}],["path",{d:"M13 8H7",key:"14i4kc"}],["path",{d:"M17 12H7",key:"16if0g"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q0=d("MessageSquare",[["path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",key:"1lielz"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tf=d("MicOff",[["line",{x1:"2",x2:"22",y1:"2",y2:"22",key:"a6p6uj"}],["path",{d:"M18.89 13.23A7.12 7.12 0 0 0 19 12v-2",key:"80xlxr"}],["path",{d:"M5 10v2a7 7 0 0 0 12 5",key:"p2k8kg"}],["path",{d:"M15 9.34V5a3 3 0 0 0-5.68-1.33",key:"1gzdoj"}],["path",{d:"M9 9v3a3 3 0 0 0 5.12 2.12",key:"r2i35w"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ef=d("Mic",[["path",{d:"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z",key:"131961"}],["path",{d:"M19 10v2a7 7 0 0 1-14 0v-2",key:"1vc78b"}],["line",{x1:"12",x2:"12",y1:"19",y2:"22",key:"x3vr5v"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nf=d("Minimize2",[["polyline",{points:"4 14 10 14 10 20",key:"11kfnr"}],["polyline",{points:"20 10 14 10 14 4",key:"rlmsce"}],["line",{x1:"14",x2:"21",y1:"10",y2:"3",key:"o5lafz"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sf=d("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const af=d("Monitor",[["rect",{width:"20",height:"14",x:"2",y:"3",rx:"2",key:"48i651"}],["line",{x1:"8",x2:"16",y1:"21",y2:"21",key:"1svkeh"}],["line",{x1:"12",x2:"12",y1:"17",y2:"21",key:"vw1qmm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rf=d("MoonStar",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9",key:"4ay0iu"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const of=d("Moon",[["path",{d:"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z",key:"a7tn18"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cf=d("MousePointer2",[["path",{d:"M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z",key:"edeuup"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lf=d("MoveHorizontal",[["path",{d:"m18 8 4 4-4 4",key:"1ak13k"}],["path",{d:"M2 12h20",key:"9i4pu4"}],["path",{d:"m6 8-4 4 4 4",key:"15zrgr"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hf=d("Music4",[["path",{d:"M9 18V5l12-2v13",key:"1jmyc2"}],["path",{d:"m9 9 12-2",key:"1e64n2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["circle",{cx:"18",cy:"16",r:"3",key:"1hluhg"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uf=d("NotebookPen",[["path",{d:"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4",key:"re6nr2"}],["path",{d:"M2 6h4",key:"aawbzj"}],["path",{d:"M2 10h4",key:"l0bgd4"}],["path",{d:"M2 14h4",key:"1gsvsf"}],["path",{d:"M2 18h4",key:"1bu2t1"}],["path",{d:"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z",key:"pqwjuv"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const df=d("NotebookText",[["path",{d:"M2 6h4",key:"aawbzj"}],["path",{d:"M2 10h4",key:"l0bgd4"}],["path",{d:"M2 14h4",key:"1gsvsf"}],["path",{d:"M2 18h4",key:"1bu2t1"}],["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["path",{d:"M9.5 8h5",key:"11mslq"}],["path",{d:"M9.5 12H16",key:"ktog6x"}],["path",{d:"M9.5 16H14",key:"p1seyn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ff=d("PaintbrushVertical",[["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M14 2v4",key:"qmzblu"}],["path",{d:"M17 2a1 1 0 0 1 1 1v9H6V3a1 1 0 0 1 1-1z",key:"ycvu00"}],["path",{d:"M6 12a1 1 0 0 0-1 1v1a2 2 0 0 0 2 2h2a1 1 0 0 1 1 1v2.9a2 2 0 1 0 4 0V17a1 1 0 0 1 1-1h2a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1",key:"iw4wnp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pf=d("Paintbrush",[["path",{d:"m14.622 17.897-10.68-2.913",key:"vj2p1u"}],["path",{d:"M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z",key:"18tc5c"}],["path",{d:"M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15",key:"ytzfxy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yf=d("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mf=d("Paperclip",[["path",{d:"M13.234 20.252 21 12.3",key:"1cbrk9"}],["path",{d:"m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486",key:"1pkts6"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gf=d("Pause",[["rect",{x:"14",y:"4",width:"4",height:"16",rx:"1",key:"zuxfzm"}],["rect",{x:"6",y:"4",width:"4",height:"16",rx:"1",key:"1okwgv"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kf=d("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vf=d("PencilLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}],["path",{d:"m15 5 3 3",key:"1w25hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xf=d("Pencil",[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mf=d("PhoneCall",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}],["path",{d:"M14.05 2a9 9 0 0 1 8 7.94",key:"vmijpz"}],["path",{d:"M14.05 6A5 5 0 0 1 18 10",key:"13nbpp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bf=d("Phone",[["path",{d:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",key:"foiqr5"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wf=d("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tf=d("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sf=d("QrCode",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cf=d("Radio",[["path",{d:"M4.9 19.1C1 15.2 1 8.8 4.9 4.9",key:"1vaf9d"}],["path",{d:"M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5",key:"u1ii0m"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}],["path",{d:"M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5",key:"1j5fej"}],["path",{d:"M19.1 4.9C23 8.8 23 15.1 19.1 19",key:"10b0cb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pf=d("Redo2",[["path",{d:"m15 14 5-5-5-5",key:"12vg1m"}],["path",{d:"M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13",key:"6uklza"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Af=d("RefreshCcw",[["path",{d:"M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"14sxne"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}],["path",{d:"M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16",key:"1hlbsb"}],["path",{d:"M16 16h5v5",key:"ccwih5"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vf=d("RefreshCw",[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Df=d("Reply",[["polyline",{points:"9 17 4 12 9 7",key:"hvgpf2"}],["path",{d:"M20 18v-2a4 4 0 0 0-4-4H4",key:"5vmcpk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ef=d("Rocket",[["path",{d:"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",key:"m3kijz"}],["path",{d:"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z",key:"1fmvmk"}],["path",{d:"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0",key:"1f8sc4"}],["path",{d:"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",key:"qeys4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lf=d("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rf=d("Route",[["circle",{cx:"6",cy:"19",r:"3",key:"1kj8tv"}],["path",{d:"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15",key:"1d8sl"}],["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jf=d("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zf=d("ScanLine",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["path",{d:"M7 12h10",key:"b7w52i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ff=d("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const If=d("ScrollText",[["path",{d:"M15 12h-5",key:"r7krc0"}],["path",{d:"M15 8h-5",key:"1khuty"}],["path",{d:"M19 17V5a2 2 0 0 0-2-2H4",key:"zz82l3"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3",key:"1ph1d7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bf=d("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Of=d("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hf=d("ServerCog",[["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}],["path",{d:"M4.5 10H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.5",key:"tn8das"}],["path",{d:"M4.5 14H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-.5",key:"1g2pve"}],["path",{d:"M6 6h.01",key:"1utrut"}],["path",{d:"M6 18h.01",key:"uhywen"}],["path",{d:"m15.7 13.4-.9-.3",key:"1jwmzr"}],["path",{d:"m9.2 10.9-.9-.3",key:"qapnim"}],["path",{d:"m10.6 15.7.3-.9",key:"quwk0k"}],["path",{d:"m13.6 15.7-.4-1",key:"cb9xp7"}],["path",{d:"m10.8 9.3-.4-1",key:"1uaiz5"}],["path",{d:"m8.3 13.6 1-.4",key:"s6srou"}],["path",{d:"m14.7 10.8 1-.4",key:"4d31cq"}],["path",{d:"m13.4 8.3-.3.9",key:"1bm987"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qf=d("Server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Nf=d("Settings2",[["path",{d:"M20 7h-9",key:"3s1dr2"}],["path",{d:"M14 17H5",key:"gfn3mx"}],["circle",{cx:"17",cy:"17",r:"3",key:"18b49y"}],["circle",{cx:"7",cy:"7",r:"3",key:"dfmy0x"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Uf=d("Settings",[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $f=d("Share2",[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _f=d("ShieldAlert",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Wf=d("ShieldCheck",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Kf=d("ShieldOff",[["path",{d:"m2 2 20 20",key:"1ooewy"}],["path",{d:"M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7.67 8.94a1 1 0 0 0 .67.01c2.35-.82 4.48-1.97 5.9-3.71",key:"1jlk70"}],["path",{d:"M9.309 3.652A12.252 12.252 0 0 0 11.24 2.28a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1v7a9.784 9.784 0 0 1-.08 1.264",key:"18rp1v"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Gf=d("Shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Xf=d("SkipForward",[["polygon",{points:"5 4 15 12 5 20 5 4",key:"16p6eg"}],["line",{x1:"19",x2:"19",y1:"5",y2:"19",key:"futhcm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Zf=d("SlidersHorizontal",[["line",{x1:"21",x2:"14",y1:"4",y2:"4",key:"obuewd"}],["line",{x1:"10",x2:"3",y1:"4",y2:"4",key:"1q6298"}],["line",{x1:"21",x2:"12",y1:"12",y2:"12",key:"1iu8h1"}],["line",{x1:"8",x2:"3",y1:"12",y2:"12",key:"ntss68"}],["line",{x1:"21",x2:"16",y1:"20",y2:"20",key:"14d8ph"}],["line",{x1:"12",x2:"3",y1:"20",y2:"20",key:"m0wm8r"}],["line",{x1:"14",x2:"14",y1:"2",y2:"6",key:"14e1ph"}],["line",{x1:"8",x2:"8",y1:"10",y2:"14",key:"1i6ji0"}],["line",{x1:"16",x2:"16",y1:"18",y2:"22",key:"1lctlv"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Yf=d("Smartphone",[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Jf=d("SmilePlus",[["path",{d:"M22 11v1a10 10 0 1 1-9-10",key:"ew0xw9"}],["path",{d:"M8 14s1.5 2 4 2 4-2 4-2",key:"1y1vjs"}],["line",{x1:"9",x2:"9.01",y1:"9",y2:"9",key:"yxxnd0"}],["line",{x1:"15",x2:"15.01",y1:"9",y2:"9",key:"1p4y9e"}],["path",{d:"M16 5h6",key:"1vod17"}],["path",{d:"M19 2v6",key:"4bpg5p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qf=d("Sparkles",[["path",{d:"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",key:"4pj2yx"}],["path",{d:"M20 3v4",key:"1olli1"}],["path",{d:"M22 5h-4",key:"1gvqau"}],["path",{d:"M4 17v2",key:"vumght"}],["path",{d:"M5 18H3",key:"zchphs"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tp=d("SquareCheckBig",[["path",{d:"M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5",key:"1uzm8b"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ep=d("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const np=d("SquareTerminal",[["path",{d:"m7 11 2-2-2-2",key:"1lz0vl"}],["path",{d:"M11 13h4",key:"1p7l4v"}],["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sp=d("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ip=d("StickyNote",[["path",{d:"M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z",key:"qazsjp"}],["path",{d:"M15 3v4a2 2 0 0 0 2 2h4",key:"40519r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ap=d("SunMedium",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 3v1",key:"1asbbs"}],["path",{d:"M12 20v1",key:"1wcdkc"}],["path",{d:"M3 12h1",key:"lp3yf2"}],["path",{d:"M20 12h1",key:"1vloll"}],["path",{d:"m18.364 5.636-.707.707",key:"1hakh0"}],["path",{d:"m6.343 17.657-.707.707",key:"18m9nf"}],["path",{d:"m5.636 5.636.707.707",key:"1xv1c5"}],["path",{d:"m17.657 17.657.707.707",key:"vl76zb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rp=d("Sun",[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const op=d("SwatchBook",[["path",{d:"M11 17a4 4 0 0 1-8 0V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2Z",key:"1ldrpk"}],["path",{d:"M16.7 13H19a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H7",key:"11i5po"}],["path",{d:"M 7 17h.01",key:"1euzgo"}],["path",{d:"m11 8 2.3-2.3a2.4 2.4 0 0 1 3.404.004L18.6 7.6a2.4 2.4 0 0 1 .026 3.434L9.9 19.8",key:"o2gii7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cp=d("Swords",[["polyline",{points:"14.5 17.5 3 6 3 3 6 3 17.5 14.5",key:"1hfsw2"}],["line",{x1:"13",x2:"19",y1:"19",y2:"13",key:"1vrmhu"}],["line",{x1:"16",x2:"20",y1:"16",y2:"20",key:"1bron3"}],["line",{x1:"19",x2:"21",y1:"21",y2:"19",key:"13pww6"}],["polyline",{points:"14.5 6.5 18 3 21 3 21 6 17.5 9.5",key:"hbey2j"}],["line",{x1:"5",x2:"9",y1:"14",y2:"18",key:"1hf58s"}],["line",{x1:"7",x2:"4",y1:"17",y2:"20",key:"pidxm4"}],["line",{x1:"3",x2:"5",y1:"19",y2:"21",key:"1pehsh"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lp=d("Tablet",[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",ry:"2",key:"76otgf"}],["line",{x1:"12",x2:"12.01",y1:"18",y2:"18",key:"1dp563"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hp=d("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const up=d("Target",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["circle",{cx:"12",cy:"12",r:"6",key:"1vlfrh"}],["circle",{cx:"12",cy:"12",r:"2",key:"1c9p78"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dp=d("TestTubeDiagonal",[["path",{d:"M21 7 6.82 21.18a2.83 2.83 0 0 1-3.99-.01a2.83 2.83 0 0 1 0-4L17 3",key:"1ub6xw"}],["path",{d:"m16 2 6 6",key:"1gw87d"}],["path",{d:"M12 16H4",key:"1cjfip"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fp=d("Timer",[["line",{x1:"10",x2:"14",y1:"2",y2:"2",key:"14vaq8"}],["line",{x1:"12",x2:"15",y1:"14",y2:"11",key:"17fdiu"}],["circle",{cx:"12",cy:"14",r:"8",key:"1e1u0o"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pp=d("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yp=d("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mp=d("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gp=d("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const kp=d("Trophy",[["path",{d:"M6 9H4.5a2.5 2.5 0 0 1 0-5H6",key:"17hqa7"}],["path",{d:"M18 9h1.5a2.5 2.5 0 0 0 0-5H18",key:"lmptdp"}],["path",{d:"M4 22h16",key:"57wxv0"}],["path",{d:"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",key:"1nw9bq"}],["path",{d:"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",key:"1np0yb"}],["path",{d:"M18 2H6v7a6 6 0 0 0 12 0V2Z",key:"u46fv3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vp=d("Type",[["polyline",{points:"4 7 4 4 20 4 20 7",key:"1nosan"}],["line",{x1:"9",x2:"15",y1:"20",y2:"20",key:"swin9y"}],["line",{x1:"12",x2:"12",y1:"4",y2:"20",key:"1tx1rr"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xp=d("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mp=d("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const bp=d("UserCheck",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["polyline",{points:"16 11 18 13 22 9",key:"1pwet4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wp=d("UserPlus",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tp=d("UserRoundCheck",[["path",{d:"M2 21a8 8 0 0 1 13.292-6",key:"bjp14o"}],["circle",{cx:"10",cy:"8",r:"5",key:"o932ke"}],["path",{d:"m16 19 2 2 4-4",key:"1b14m6"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sp=d("UserRoundMinus",[["path",{d:"M2 21a8 8 0 0 1 13.292-6",key:"bjp14o"}],["circle",{cx:"10",cy:"8",r:"5",key:"o932ke"}],["path",{d:"M22 19h-6",key:"vcuq98"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cp=d("UserRoundPlus",[["path",{d:"M2 21a8 8 0 0 1 13.292-6",key:"bjp14o"}],["circle",{cx:"10",cy:"8",r:"5",key:"o932ke"}],["path",{d:"M19 16v6",key:"tddt3s"}],["path",{d:"M22 19h-6",key:"vcuq98"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pp=d("UserX",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"17",x2:"22",y1:"8",y2:"13",key:"3nzzx3"}],["line",{x1:"22",x2:"17",y1:"8",y2:"13",key:"1swrse"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ap=d("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vp=d("UsersRound",[["path",{d:"M18 21a8 8 0 0 0-16 0",key:"3ypg7q"}],["circle",{cx:"10",cy:"8",r:"5",key:"o932ke"}],["path",{d:"M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3",key:"10s06x"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Dp=d("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ep=d("VideoOff",[["path",{d:"M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196",key:"w8jjjt"}],["path",{d:"M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2",key:"1xawa7"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lp=d("Video",[["path",{d:"m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5",key:"ftymec"}],["rect",{x:"2",y:"6",width:"14",height:"12",rx:"2",key:"158x01"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rp=d("Volume2",[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["path",{d:"M16 9a5 5 0 0 1 0 6",key:"1q6k2b"}],["path",{d:"M19.364 18.364a9 9 0 0 0 0-12.728",key:"ijwkga"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const jp=d("Vote",[["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}],["path",{d:"M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z",key:"1ezoue"}],["path",{d:"M22 19H2",key:"nuriw5"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zp=d("WalletMinimal",[["path",{d:"M17 14h.01",key:"7oqj8z"}],["path",{d:"M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14",key:"u1rqew"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Fp=d("Wallet",[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ip=d("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bp=d("WifiOff",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}],["path",{d:"M5 12.859a10 10 0 0 1 5.17-2.69",key:"1dl1wf"}],["path",{d:"M19 12.859a10 10 0 0 0-2.007-1.523",key:"4k23kn"}],["path",{d:"M2 8.82a15 15 0 0 1 4.177-2.643",key:"1grhjp"}],["path",{d:"M22 8.82a15 15 0 0 0-11.288-3.764",key:"z3jwby"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Op=d("Wifi",[["path",{d:"M12 20h.01",key:"zekei9"}],["path",{d:"M2 8.82a15 15 0 0 1 20 0",key:"dnpr2z"}],["path",{d:"M5 12.859a10 10 0 0 1 14 0",key:"1x1e6c"}],["path",{d:"M8.5 16.429a5 5 0 0 1 7 0",key:"1bycff"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hp=d("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const qp=d("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Np=d("Youtube",[["path",{d:"M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17",key:"1q2vi4"}],["path",{d:"m10 15 5-3-5-3z",key:"1jp15x"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Up=d("Zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]]),Fi=g.createContext({});function Bo(t){const e=g.useRef(null);return e.current===null&&(e.current=t()),e.current}const Oo=typeof window<"u",Ho=Oo?g.useLayoutEffect:g.useEffect,Cn=g.createContext(null);function Pn(t,e){t.indexOf(e)===-1&&t.push(e)}function pe(t,e){const n=t.indexOf(e);n>-1&&t.splice(n,1)}const it=(t,e,n)=>n>e?e:n<t?t:n;let An=()=>{};const dt={},Ii=t=>/^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(t);function Bi(t){return typeof t=="object"&&t!==null}const Oi=t=>/^0[^.\s]+$/u.test(t);function Hi(t){let e;return()=>(e===void 0&&(e=t()),e)}const G=t=>t,qo=(t,e)=>n=>e(t(n)),Kt=(...t)=>t.reduce(qo),qt=(t,e,n)=>{const s=e-t;return s===0?1:(n-t)/s};class Vn{constructor(){this.subscriptions=[]}add(e){return Pn(this.subscriptions,e),()=>pe(this.subscriptions,e)}notify(e,n,s){const i=this.subscriptions.length;if(i)if(i===1)this.subscriptions[0](e,n,s);else for(let r=0;r<i;r++){const a=this.subscriptions[r];a&&a(e,n,s)}}getSize(){return this.subscriptions.length}clear(){this.subscriptions.length=0}}const _=t=>t*1e3,K=t=>t/1e3;function qi(t,e){return e?t*(1e3/e):0}const Ni=(t,e,n)=>(((1-3*n+3*e)*t+(3*n-6*e))*t+3*e)*t,No=1e-7,Uo=12;function $o(t,e,n,s,i){let r,a,o=0;do a=e+(n-e)/2,r=Ni(a,s,i)-t,r>0?n=a:e=a;while(Math.abs(r)>No&&++o<Uo);return a}function Gt(t,e,n,s){if(t===e&&n===s)return G;const i=r=>$o(r,0,1,t,n);return r=>r===0||r===1?r:Ni(i(r),e,s)}const Ui=t=>e=>e<=.5?t(2*e)/2:(2-t(2*(1-e)))/2,$i=t=>e=>1-t(1-e),_i=Gt(.33,1.53,.69,.99),Dn=$i(_i),Wi=Ui(Dn),Ki=t=>t>=1?1:(t*=2)<1?.5*Dn(t):.5*(2-Math.pow(2,-10*(t-1))),En=t=>1-Math.sin(Math.acos(t)),Gi=$i(En),Xi=Ui(En),_o=Gt(.42,0,1,1),Wo=Gt(0,0,.58,1),Zi=Gt(.42,0,.58,1),Ko=t=>Array.isArray(t)&&typeof t[0]!="number",Yi=t=>Array.isArray(t)&&typeof t[0]=="number",Go={linear:G,easeIn:_o,easeInOut:Zi,easeOut:Wo,circIn:En,circInOut:Xi,circOut:Gi,backIn:Dn,backInOut:Wi,backOut:_i,anticipate:Ki},Xo=t=>typeof t=="string",ss=t=>{if(Yi(t)){An(t.length===4);const[e,n,s,i]=t;return Gt(e,n,s,i)}else if(Xo(t))return Go[t];return t},Qt=["setup","read","resolveKeyframes","preUpdate","update","preRender","render","postRender"];function Zo(t,e){let n=new Set,s=new Set,i=!1,r=!1;const a=new WeakSet;let o={delta:0,timestamp:0,isProcessing:!1};function c(l){a.has(l)&&(h.schedule(l),t()),l(o)}const h={schedule:(l,u=!1,f=!1)=>{const y=f&&i?n:s;return u&&a.add(l),y.add(l),l},cancel:l=>{s.delete(l),a.delete(l)},process:l=>{if(o=l,i){r=!0;return}i=!0;const u=n;n=s,s=u,n.forEach(c),n.clear(),i=!1,r&&(r=!1,h.process(l))}};return h}const Yo=40;function Ji(t,e){let n=!1,s=!0;const i={delta:0,timestamp:0,isProcessing:!1},r=()=>n=!0,a=Qt.reduce((v,w)=>(v[w]=Zo(r),v),{}),{setup:o,read:c,resolveKeyframes:h,preUpdate:l,update:u,preRender:f,render:p,postRender:y}=a,k=()=>{const v=dt.useManualTiming,w=v?i.timestamp:performance.now();n=!1,v||(i.delta=s?1e3/60:Math.max(Math.min(w-i.timestamp,Yo),1)),i.timestamp=w,i.isProcessing=!0,o.process(i),c.process(i),h.process(i),l.process(i),u.process(i),f.process(i),p.process(i),y.process(i),i.isProcessing=!1,n&&e&&(s=!1,t(k))},m=()=>{n=!0,s=!0,i.isProcessing||t(k)};return{schedule:Qt.reduce((v,w)=>{const T=a[w];return v[w]=(R,H=!1,P=!1)=>(n||m(),T.schedule(R,H,P)),v},{}),cancel:v=>{for(let w=0;w<Qt.length;w++)a[Qt[w]].cancel(v)},state:i,steps:a}}const{schedule:A,cancel:ft,state:B,steps:Ee}=Ji(typeof requestAnimationFrame<"u"?requestAnimationFrame:G,!0);let re;function Jo(){re=void 0}const q={now:()=>(re===void 0&&q.set(B.isProcessing||dt.useManualTiming?B.timestamp:performance.now()),re),set:t=>{re=t,queueMicrotask(Jo)}},Qi=t=>e=>typeof e=="string"&&e.startsWith(t),ta=Qi("--"),Qo=Qi("var(--"),Ln=t=>Qo(t)?tc.test(t.split("/*")[0].trim()):!1,tc=/var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;function is(t){return typeof t!="string"?!1:t.split("/*")[0].includes("var(--")}const Lt={test:t=>typeof t=="number",parse:parseFloat,transform:t=>t},Nt={...Lt,transform:t=>it(0,1,t)},te={...Lt,default:1},It=t=>Math.round(t*1e5)/1e5,Rn=/-?(?:\d+(?:\.\d+)?|\.\d+)/gu;function ec(t){return t==null}const nc=/^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu,jn=(t,e)=>n=>!!(typeof n=="string"&&nc.test(n)&&n.startsWith(t)||e&&!ec(n)&&Object.prototype.hasOwnProperty.call(n,e)),ea=(t,e,n)=>s=>{if(typeof s!="string")return s;const[i,r,a,o]=s.match(Rn);return{[t]:parseFloat(i),[e]:parseFloat(r),[n]:parseFloat(a),alpha:o!==void 0?parseFloat(o):1}},sc=t=>it(0,255,t),Le={...Lt,transform:t=>Math.round(sc(t))},xt={test:jn("rgb","red"),parse:ea("red","green","blue"),transform:({red:t,green:e,blue:n,alpha:s=1})=>"rgba("+Le.transform(t)+", "+Le.transform(e)+", "+Le.transform(n)+", "+It(Nt.transform(s))+")"};function ic(t){let e="",n="",s="",i="";return t.length>5?(e=t.substring(1,3),n=t.substring(3,5),s=t.substring(5,7),i=t.substring(7,9)):(e=t.substring(1,2),n=t.substring(2,3),s=t.substring(3,4),i=t.substring(4,5),e+=e,n+=n,s+=s,i+=i),{red:parseInt(e,16),green:parseInt(n,16),blue:parseInt(s,16),alpha:i?parseInt(i,16)/255:1}}const Ze={test:jn("#"),parse:ic,transform:xt.transform},Xt=t=>({test:e=>typeof e=="string"&&e.endsWith(t)&&e.split(" ").length===1,parse:parseFloat,transform:e=>`${e}${t}`}),ct=Xt("deg"),st=Xt("%"),b=Xt("px"),ac=Xt("vh"),rc=Xt("vw"),as={...st,parse:t=>st.parse(t)/100,transform:t=>st.transform(t*100)},Ct={test:jn("hsl","hue"),parse:ea("hue","saturation","lightness"),transform:({hue:t,saturation:e,lightness:n,alpha:s=1})=>"hsla("+Math.round(t)+", "+st.transform(It(e))+", "+st.transform(It(n))+", "+It(Nt.transform(s))+")"},L={test:t=>xt.test(t)||Ze.test(t)||Ct.test(t),parse:t=>xt.test(t)?xt.parse(t):Ct.test(t)?Ct.parse(t):Ze.parse(t),transform:t=>typeof t=="string"?t:t.hasOwnProperty("red")?xt.transform(t):Ct.transform(t),getAnimatableNone:t=>{const e=L.parse(t);return e.alpha=0,L.transform(e)}},oc=/(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;function cc(t){var e,n;return isNaN(t)&&typeof t=="string"&&(((e=t.match(Rn))==null?void 0:e.length)||0)+(((n=t.match(oc))==null?void 0:n.length)||0)>0}const na="number",sa="color",lc="var",hc="var(",rs="${}",uc=/var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;function Vt(t){const e=t.toString(),n=[],s={color:[],number:[],var:[]},i=[];let r=0;const o=e.replace(uc,c=>(L.test(c)?(s.color.push(r),i.push(sa),n.push(L.parse(c))):c.startsWith(hc)?(s.var.push(r),i.push(lc),n.push(c)):(s.number.push(r),i.push(na),n.push(parseFloat(c))),++r,rs)).split(rs);return{values:n,split:o,indexes:s,types:i}}function dc(t){return Vt(t).values}function ia({split:t,types:e}){const n=t.length;return s=>{let i="";for(let r=0;r<n;r++)if(i+=t[r],s[r]!==void 0){const a=e[r];a===na?i+=It(s[r]):a===sa?i+=L.transform(s[r]):i+=s[r]}return i}}function fc(t){return ia(Vt(t))}const pc=t=>typeof t=="number"?0:L.test(t)?L.getAnimatableNone(t):t,yc=(t,e)=>typeof t=="number"?e!=null&&e.trim().endsWith("/")?t:0:pc(t);function mc(t){const e=Vt(t);return ia(e)(e.values.map((s,i)=>yc(s,e.split[i])))}const Y={test:cc,parse:dc,createTransformer:fc,getAnimatableNone:mc};function Re(t,e,n){return n<0&&(n+=1),n>1&&(n-=1),n<1/6?t+(e-t)*6*n:n<1/2?e:n<2/3?t+(e-t)*(2/3-n)*6:t}function gc({hue:t,saturation:e,lightness:n,alpha:s}){t/=360,e/=100,n/=100;let i=0,r=0,a=0;if(!e)i=r=a=n;else{const o=n<.5?n*(1+e):n+e-n*e,c=2*n-o;i=Re(c,o,t+1/3),r=Re(c,o,t),a=Re(c,o,t-1/3)}return{red:Math.round(i*255),green:Math.round(r*255),blue:Math.round(a*255),alpha:s}}function ye(t,e){return n=>n>0?e:t}const V=(t,e,n)=>t+(e-t)*n,je=(t,e,n)=>{const s=t*t,i=n*(e*e-s)+s;return i<0?0:Math.sqrt(i)},kc=[Ze,xt,Ct],vc=t=>kc.find(e=>e.test(t));function os(t){const e=vc(t);if(!e)return!1;let n=e.parse(t);return e===Ct&&(n=gc(n)),n}const cs=(t,e)=>{const n=os(t),s=os(e);if(!n||!s)return ye(t,e);const i={...n};return r=>(i.red=je(n.red,s.red,r),i.green=je(n.green,s.green,r),i.blue=je(n.blue,s.blue,r),i.alpha=V(n.alpha,s.alpha,r),xt.transform(i))},Ye=new Set(["none","hidden"]);function xc(t,e){return Ye.has(t)?n=>n<=0?t:e:n=>n>=1?e:t}function Mc(t,e){return n=>V(t,e,n)}function zn(t){return typeof t=="number"?Mc:typeof t=="string"?Ln(t)?ye:L.test(t)?cs:Tc:Array.isArray(t)?aa:typeof t=="object"?L.test(t)?cs:bc:ye}function aa(t,e){const n=[...t],s=n.length,i=t.map((r,a)=>zn(r)(r,e[a]));return r=>{for(let a=0;a<s;a++)n[a]=i[a](r);return n}}function bc(t,e){const n={...t,...e},s={};for(const i in n)t[i]!==void 0&&e[i]!==void 0&&(s[i]=zn(t[i])(t[i],e[i]));return i=>{for(const r in s)n[r]=s[r](i);return n}}function wc(t,e){const n=[],s={color:0,var:0,number:0};for(let i=0;i<e.values.length;i++){const r=e.types[i],a=t.indexes[r][s[r]],o=t.values[a]??0;n[i]=o,s[r]++}return n}const Tc=(t,e)=>{const n=Y.createTransformer(e),s=Vt(t),i=Vt(e);return s.indexes.var.length===i.indexes.var.length&&s.indexes.color.length===i.indexes.color.length&&s.indexes.number.length>=i.indexes.number.length?Ye.has(t)&&!i.values.length||Ye.has(e)&&!s.values.length?xc(t,e):Kt(aa(wc(s,i),i.values),n):ye(t,e)};function ra(t,e,n){return typeof t=="number"&&typeof e=="number"&&typeof n=="number"?V(t,e,n):zn(t)(t,e)}const Sc=t=>{const e=({timestamp:n})=>t(n);return{start:(n=!0)=>A.update(e,n),stop:()=>ft(e),now:()=>B.isProcessing?B.timestamp:q.now()}},oa=(t,e,n=10)=>{let s="";const i=Math.max(Math.round(e/n),2);for(let r=0;r<i;r++)s+=Math.round(t(r/(i-1))*1e4)/1e4+", ";return`linear(${s.substring(0,s.length-2)})`},me=2e4;function Fn(t){let e=0;const n=50;let s=t.next(e);for(;!s.done&&e<me;)e+=n,s=t.next(e);return e>=me?1/0:e}function Cc(t,e=100,n){const s=n({...t,keyframes:[0,e]}),i=Math.min(Fn(s),me);return{type:"keyframes",ease:r=>s.next(i*r).value/e,duration:K(i)}}const D={stiffness:100,damping:10,mass:1,velocity:0,duration:800,bounce:.3,visualDuration:.3,restSpeed:{granular:.01,default:2},restDelta:{granular:.005,default:.5},minDuration:.01,maxDuration:10,minDamping:.05,maxDamping:1};function Je(t,e){return t*Math.sqrt(1-e*e)}const Pc=12;function Ac(t,e,n){let s=n;for(let i=1;i<Pc;i++)s=s-t(s)/e(s);return s}const ze=.001;function Vc({duration:t=D.duration,bounce:e=D.bounce,velocity:n=D.velocity,mass:s=D.mass}){let i,r,a=1-e;a=it(D.minDamping,D.maxDamping,a),t=it(D.minDuration,D.maxDuration,K(t)),a<1?(i=h=>{const l=h*a,u=l*t,f=l-n,p=Je(h,a),y=Math.exp(-u);return ze-f/p*y},r=h=>{const u=h*a*t,f=u*n+n,p=Math.pow(a,2)*Math.pow(h,2)*t,y=Math.exp(-u),k=Je(Math.pow(h,2),a);return(-i(h)+ze>0?-1:1)*((f-p)*y)/k}):(i=h=>{const l=Math.exp(-h*t),u=(h-n)*t+1;return-ze+l*u},r=h=>{const l=Math.exp(-h*t),u=(n-h)*(t*t);return l*u});const o=5/t,c=Ac(i,r,o);if(t=_(t),isNaN(c))return{stiffness:D.stiffness,damping:D.damping,duration:t};{const h=Math.pow(c,2)*s;return{stiffness:h,damping:a*2*Math.sqrt(s*h),duration:t}}}const Dc=["duration","bounce"],Ec=["stiffness","damping","mass"];function ls(t,e){return e.some(n=>t[n]!==void 0)}function Lc(t){let e={velocity:D.velocity,stiffness:D.stiffness,damping:D.damping,mass:D.mass,isResolvedFromDuration:!1,...t};if(!ls(t,Ec)&&ls(t,Dc))if(e.velocity=0,t.visualDuration){const n=t.visualDuration,s=2*Math.PI/(n*1.2),i=s*s,r=2*it(.05,1,1-(t.bounce||0))*Math.sqrt(i);e={...e,mass:D.mass,stiffness:i,damping:r}}else{const n=Vc({...t,velocity:0});e={...e,...n,mass:D.mass},e.isResolvedFromDuration=!0}return e}function ge(t=D.visualDuration,e=D.bounce){const n=typeof t!="object"?{visualDuration:t,keyframes:[0,1],bounce:e}:t;let{restSpeed:s,restDelta:i}=n;const r=n.keyframes[0],a=n.keyframes[n.keyframes.length-1],o={done:!1,value:r},{stiffness:c,damping:h,mass:l,duration:u,velocity:f,isResolvedFromDuration:p}=Lc({...n,velocity:-K(n.velocity||0)}),y=f||0,k=h/(2*Math.sqrt(c*l)),m=a-r,x=K(Math.sqrt(c/l)),M=Math.abs(m)<5;s||(s=M?D.restSpeed.granular:D.restSpeed.default),i||(i=M?D.restDelta.granular:D.restDelta.default);let v,w,T,R,H,P;if(k<1)T=Je(x,k),R=(y+k*x*m)/T,v=S=>{const E=Math.exp(-k*x*S);return a-E*(R*Math.sin(T*S)+m*Math.cos(T*S))},H=k*x*R+m*T,P=k*x*m-R*T,w=S=>Math.exp(-k*x*S)*(H*Math.sin(T*S)+P*Math.cos(T*S));else if(k===1){v=E=>a-Math.exp(-x*E)*(m+(y+x*m)*E);const S=y+x*m;w=E=>Math.exp(-x*E)*(x*S*E-y)}else{const S=x*Math.sqrt(k*k-1);v=J=>{const at=Math.exp(-k*x*J),Q=Math.min(S*J,300);return a-at*((y+k*x*m)*Math.sinh(Q)+S*m*Math.cosh(Q))/S};const E=(y+k*x*m)/S,$=k*x*E-m*S,mt=k*x*m-E*S;w=J=>{const at=Math.exp(-k*x*J),Q=Math.min(S*J,300);return at*($*Math.sinh(Q)+mt*Math.cosh(Q))}}const F={calculatedDuration:p&&u||null,velocity:S=>_(w(S)),next:S=>{if(!p&&k<1){const $=Math.exp(-k*x*S),mt=Math.sin(T*S),J=Math.cos(T*S),at=a-$*(R*mt+m*J),Q=_($*(H*mt+P*J));return o.done=Math.abs(Q)<=s&&Math.abs(a-at)<=i,o.value=o.done?a:at,o}const E=v(S);if(p)o.done=S>=u;else{const $=_(w(S));o.done=Math.abs($)<=s&&Math.abs(a-E)<=i}return o.value=o.done?a:E,o},toString:()=>{const S=Math.min(Fn(F),me),E=oa($=>F.next(S*$).value,S,30);return S+"ms "+E},toTransition:()=>{}};return F}ge.applyToOptions=t=>{const e=Cc(t,100,ge);return t.ease=e.ease,t.duration=_(e.duration),t.type="keyframes",t};const Rc=5;function ca(t,e,n){const s=Math.max(e-Rc,0);return qi(n-t(s),e-s)}function Qe({keyframes:t,velocity:e=0,power:n=.8,timeConstant:s=325,bounceDamping:i=10,bounceStiffness:r=500,modifyTarget:a,min:o,max:c,restDelta:h=.5,restSpeed:l}){const u=t[0],f={done:!1,value:u},p=P=>o!==void 0&&P<o||c!==void 0&&P>c,y=P=>o===void 0?c:c===void 0||Math.abs(o-P)<Math.abs(c-P)?o:c;let k=n*e;const m=u+k,x=a===void 0?m:a(m);x!==m&&(k=x-u);const M=P=>-k*Math.exp(-P/s),v=P=>x+M(P),w=P=>{const F=M(P),S=v(P);f.done=Math.abs(F)<=h,f.value=f.done?x:S};let T,R;const H=P=>{p(f.value)&&(T=P,R=ge({keyframes:[f.value,y(f.value)],velocity:ca(v,P,f.value),damping:i,stiffness:r,restDelta:h,restSpeed:l}))};return H(0),{calculatedDuration:null,next:P=>{let F=!1;return!R&&T===void 0&&(F=!0,w(P),H(P)),T!==void 0&&P>=T?R.next(P-T):(!F&&w(P),f)}}}function jc(t,e,n){const s=[],i=n||dt.mix||ra,r=t.length-1;for(let a=0;a<r;a++){let o=i(t[a],t[a+1]);if(e){const c=Array.isArray(e)?e[a]||G:e;o=Kt(c,o)}s.push(o)}return s}function zc(t,e,{clamp:n=!0,ease:s,mixer:i}={}){const r=t.length;if(An(r===e.length),r===1)return()=>e[0];if(r===2&&e[0]===e[1])return()=>e[1];const a=t[0]===t[1];t[0]>t[r-1]&&(t=[...t].reverse(),e=[...e].reverse());const o=jc(e,s,i),c=o.length,h=l=>{if(a&&l<t[0])return e[0];let u=0;if(c>1)for(;u<t.length-2&&!(l<t[u+1]);u++);const f=qt(t[u],t[u+1],l);return o[u](f)};return n?l=>h(it(t[0],t[r-1],l)):h}function Fc(t,e){const n=t[t.length-1];for(let s=1;s<=e;s++){const i=qt(0,e,s);t.push(V(n,1,i))}}function Ic(t){const e=[0];return Fc(e,t.length-1),e}function Bc(t,e){return t.map(n=>n*e)}function Oc(t,e){return t.map(()=>e||Zi).splice(0,t.length-1)}function Bt({duration:t=300,keyframes:e,times:n,ease:s="easeInOut"}){const i=Ko(s)?s.map(ss):ss(s),r={done:!1,value:e[0]},a=Bc(n&&n.length===e.length?n:Ic(e),t),o=zc(a,e,{ease:Array.isArray(i)?i:Oc(e,i)});return{calculatedDuration:t,next:c=>(r.value=o(c),r.done=c>=t,r)}}const Hc=t=>t!==null;function Ce(t,{repeat:e,repeatType:n="loop"},s,i=1){const r=t.filter(Hc),o=i<0||e&&n!=="loop"&&e%2===1?0:r.length-1;return!o||s===void 0?r[o]:s}const qc={decay:Qe,inertia:Qe,tween:Bt,keyframes:Bt,spring:ge};function la(t){typeof t.type=="string"&&(t.type=qc[t.type])}class In{constructor(){this.updateFinished()}get finished(){return this._finished}updateFinished(){this._finished=new Promise(e=>{this.resolve=e})}notifyFinished(){this.resolve()}then(e,n){return this.finished.then(e,n)}}const Nc=t=>t/100;class ke extends In{constructor(e){super(),this.state="idle",this.startTime=null,this.isStopped=!1,this.currentTime=0,this.holdTime=null,this.playbackSpeed=1,this.delayState={done:!1,value:void 0},this.stop=()=>{var s,i;const{motionValue:n}=this.options;n&&n.updatedAt!==q.now()&&this.tick(q.now()),this.isStopped=!0,this.state!=="idle"&&(this.teardown(),(i=(s=this.options).onStop)==null||i.call(s))},this.options=e,this.initAnimation(),this.play(),e.autoplay===!1&&this.pause()}initAnimation(){const{options:e}=this;la(e);const{type:n=Bt,repeat:s=0,repeatDelay:i=0,repeatType:r,velocity:a=0}=e;let{keyframes:o}=e;const c=n||Bt;c!==Bt&&typeof o[0]!="number"&&(this.mixKeyframes=Kt(Nc,ra(o[0],o[1])),o=[0,100]);const h=c({...e,keyframes:o});r==="mirror"&&(this.mirroredGenerator=c({...e,keyframes:[...o].reverse(),velocity:-a})),h.calculatedDuration===null&&(h.calculatedDuration=Fn(h));const{calculatedDuration:l}=h;this.calculatedDuration=l,this.resolvedDuration=l+i,this.totalDuration=this.resolvedDuration*(s+1)-i,this.generator=h}updateTime(e){const n=Math.round(e-this.startTime)*this.playbackSpeed;this.holdTime!==null?this.currentTime=this.holdTime:this.currentTime=n}tick(e,n=!1){const{generator:s,totalDuration:i,mixKeyframes:r,mirroredGenerator:a,resolvedDuration:o,calculatedDuration:c}=this;if(this.startTime===null)return s.next(0);const{delay:h=0,keyframes:l,repeat:u,repeatType:f,repeatDelay:p,type:y,onUpdate:k,finalKeyframe:m}=this.options;this.speed>0?this.startTime=Math.min(this.startTime,e):this.speed<0&&(this.startTime=Math.min(e-i/this.speed,this.startTime)),n?this.currentTime=e:this.updateTime(e);const x=this.currentTime-h*(this.playbackSpeed>=0?1:-1),M=this.playbackSpeed>=0?x<0:x>i;this.currentTime=Math.max(x,0),this.state==="finished"&&this.holdTime===null&&(this.currentTime=i);let v=this.currentTime,w=s;if(u){const P=Math.min(this.currentTime,i)/o;let F=Math.floor(P),S=P%1;!S&&P>=1&&(S=1),S===1&&F--,F=Math.min(F,u+1),!!(F%2)&&(f==="reverse"?(S=1-S,p&&(S-=p/o)):f==="mirror"&&(w=a)),v=it(0,1,S)*o}let T;M?(this.delayState.value=l[0],T=this.delayState):T=w.next(v),r&&!M&&(T.value=r(T.value));let{done:R}=T;!M&&c!==null&&(R=this.playbackSpeed>=0?this.currentTime>=i:this.currentTime<=0);const H=this.holdTime===null&&(this.state==="finished"||this.state==="running"&&R);return H&&y!==Qe&&(T.value=Ce(l,this.options,m,this.speed)),k&&k(T.value),H&&this.finish(),T}then(e,n){return this.finished.then(e,n)}get duration(){return K(this.calculatedDuration)}get iterationDuration(){const{delay:e=0}=this.options||{};return this.duration+K(e)}get time(){return K(this.currentTime)}set time(e){e=_(e),this.currentTime=e,this.startTime===null||this.holdTime!==null||this.playbackSpeed===0?this.holdTime=e:this.driver&&(this.startTime=this.driver.now()-e/this.playbackSpeed),this.driver?this.driver.start(!1):(this.startTime=0,this.state="paused",this.holdTime=e,this.tick(e))}getGeneratorVelocity(){const e=this.currentTime;if(e<=0)return this.options.velocity||0;if(this.generator.velocity)return this.generator.velocity(e);const n=this.generator.next(e).value;return ca(s=>this.generator.next(s).value,e,n)}get speed(){return this.playbackSpeed}set speed(e){const n=this.playbackSpeed!==e;n&&this.driver&&this.updateTime(q.now()),this.playbackSpeed=e,n&&this.driver&&(this.time=K(this.currentTime))}play(){var i,r;if(this.isStopped)return;const{driver:e=Sc,startTime:n}=this.options;this.driver||(this.driver=e(a=>this.tick(a))),(r=(i=this.options).onPlay)==null||r.call(i);const s=this.driver.now();this.state==="finished"?(this.updateFinished(),this.startTime=s):this.holdTime!==null?this.startTime=s-this.holdTime:this.startTime||(this.startTime=n??s),this.state==="finished"&&this.speed<0&&(this.startTime+=this.calculatedDuration),this.holdTime=null,this.state="running",this.driver.start()}pause(){this.state="paused",this.updateTime(q.now()),this.holdTime=this.currentTime}complete(){this.state!=="running"&&this.play(),this.state="finished",this.holdTime=null}finish(){var e,n;this.notifyFinished(),this.teardown(),this.state="finished",(n=(e=this.options).onComplete)==null||n.call(e)}cancel(){var e,n;this.holdTime=null,this.startTime=0,this.tick(0),this.teardown(),(n=(e=this.options).onCancel)==null||n.call(e)}teardown(){this.state="idle",this.stopDriver(),this.startTime=this.holdTime=null}stopDriver(){this.driver&&(this.driver.stop(),this.driver=void 0)}sample(e){return this.startTime=0,this.tick(e,!0)}attachTimeline(e){var n;return this.options.allowFlatten&&(this.options.type="keyframes",this.options.ease="linear",this.initAnimation()),(n=this.driver)==null||n.stop(),e.observe(this)}}function Uc(t){for(let e=1;e<t.length;e++)t[e]??(t[e]=t[e-1])}const Mt=t=>t*180/Math.PI,tn=t=>{const e=Mt(Math.atan2(t[1],t[0]));return en(e)},$c={x:4,y:5,translateX:4,translateY:5,scaleX:0,scaleY:3,scale:t=>(Math.abs(t[0])+Math.abs(t[3]))/2,rotate:tn,rotateZ:tn,skewX:t=>Mt(Math.atan(t[1])),skewY:t=>Mt(Math.atan(t[2])),skew:t=>(Math.abs(t[1])+Math.abs(t[2]))/2},en=t=>(t=t%360,t<0&&(t+=360),t),hs=tn,us=t=>Math.sqrt(t[0]*t[0]+t[1]*t[1]),ds=t=>Math.sqrt(t[4]*t[4]+t[5]*t[5]),_c={x:12,y:13,z:14,translateX:12,translateY:13,translateZ:14,scaleX:us,scaleY:ds,scale:t=>(us(t)+ds(t))/2,rotateX:t=>en(Mt(Math.atan2(t[6],t[5]))),rotateY:t=>en(Mt(Math.atan2(-t[2],t[0]))),rotateZ:hs,rotate:hs,skewX:t=>Mt(Math.atan(t[4])),skewY:t=>Mt(Math.atan(t[1])),skew:t=>(Math.abs(t[1])+Math.abs(t[4]))/2};function nn(t){return t.includes("scale")?1:0}function sn(t,e){if(!t||t==="none")return nn(e);const n=t.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);let s,i;if(n)s=_c,i=n;else{const o=t.match(/^matrix\(([-\d.e\s,]+)\)$/u);s=$c,i=o}if(!i)return nn(e);const r=s[e],a=i[1].split(",").map(Kc);return typeof r=="function"?r(a):a[r]}const Wc=(t,e)=>{const{transform:n="none"}=getComputedStyle(t);return sn(n,e)};function Kc(t){return parseFloat(t.trim())}const Rt=["transformPerspective","x","y","z","translateX","translateY","translateZ","scale","scaleX","scaleY","rotate","rotateX","rotateY","rotateZ","skew","skewX","skewY"],jt=new Set(Rt),fs=t=>t===Lt||t===b,Gc=new Set(["x","y","z"]),Xc=Rt.filter(t=>!Gc.has(t));function Zc(t){const e=[];return Xc.forEach(n=>{const s=t.getValue(n);s!==void 0&&(e.push([n,s.get()]),s.set(n.startsWith("scale")?1:0))}),e}const ut={width:({x:t},{paddingLeft:e="0",paddingRight:n="0",boxSizing:s})=>{const i=t.max-t.min;return s==="border-box"?i:i-parseFloat(e)-parseFloat(n)},height:({y:t},{paddingTop:e="0",paddingBottom:n="0",boxSizing:s})=>{const i=t.max-t.min;return s==="border-box"?i:i-parseFloat(e)-parseFloat(n)},top:(t,{top:e})=>parseFloat(e),left:(t,{left:e})=>parseFloat(e),bottom:({y:t},{top:e})=>parseFloat(e)+(t.max-t.min),right:({x:t},{left:e})=>parseFloat(e)+(t.max-t.min),x:(t,{transform:e})=>sn(e,"x"),y:(t,{transform:e})=>sn(e,"y")};ut.translateX=ut.x;ut.translateY=ut.y;const bt=new Set;let an=!1,rn=!1,on=!1;function ha(){if(rn){const t=Array.from(bt).filter(s=>s.needsMeasurement),e=new Set(t.map(s=>s.element)),n=new Map;e.forEach(s=>{const i=Zc(s);i.length&&(n.set(s,i),s.render())}),t.forEach(s=>s.measureInitialState()),e.forEach(s=>{s.render();const i=n.get(s);i&&i.forEach(([r,a])=>{var o;(o=s.getValue(r))==null||o.set(a)})}),t.forEach(s=>s.measureEndState()),t.forEach(s=>{s.suspendedScrollY!==void 0&&window.scrollTo(0,s.suspendedScrollY)})}rn=!1,an=!1,bt.forEach(t=>t.complete(on)),bt.clear()}function ua(){bt.forEach(t=>{t.readKeyframes(),t.needsMeasurement&&(rn=!0)})}function Yc(){on=!0,ua(),ha(),on=!1}class Bn{constructor(e,n,s,i,r,a=!1){this.state="pending",this.isAsync=!1,this.needsMeasurement=!1,this.unresolvedKeyframes=[...e],this.onComplete=n,this.name=s,this.motionValue=i,this.element=r,this.isAsync=a}scheduleResolve(){this.state="scheduled",this.isAsync?(bt.add(this),an||(an=!0,A.read(ua),A.resolveKeyframes(ha))):(this.readKeyframes(),this.complete())}readKeyframes(){const{unresolvedKeyframes:e,name:n,element:s,motionValue:i}=this;if(e[0]===null){const r=i==null?void 0:i.get(),a=e[e.length-1];if(r!==void 0)e[0]=r;else if(s&&n){const o=s.readValue(n,a);o!=null&&(e[0]=o)}e[0]===void 0&&(e[0]=a),i&&r===void 0&&i.set(e[0])}Uc(e)}setFinalKeyframe(){}measureInitialState(){}renderEndStyles(){}measureEndState(){}complete(e=!1){this.state="complete",this.onComplete(this.unresolvedKeyframes,this.finalKeyframe,e),bt.delete(this)}cancel(){this.state==="scheduled"&&(bt.delete(this),this.state="pending")}resume(){this.state==="pending"&&this.scheduleResolve()}}const Jc=t=>t.startsWith("--");function da(t,e,n){Jc(e)?t.style.setProperty(e,n):t.style[e]=n}const Qc={};function fa(t,e){const n=Hi(t);return()=>Qc[e]??n()}const tl=fa(()=>window.ScrollTimeline!==void 0,"scrollTimeline"),pa=fa(()=>{try{document.createElement("div").animate({opacity:0},{easing:"linear(0, 1)"})}catch{return!1}return!0},"linearEasing"),Ft=([t,e,n,s])=>`cubic-bezier(${t}, ${e}, ${n}, ${s})`,ps={linear:"linear",ease:"ease",easeIn:"ease-in",easeOut:"ease-out",easeInOut:"ease-in-out",circIn:Ft([0,.65,.55,1]),circOut:Ft([.55,0,1,.45]),backIn:Ft([.31,.01,.66,-.59]),backOut:Ft([.33,1.53,.69,.99])};function ya(t,e){if(t)return typeof t=="function"?pa()?oa(t,e):"ease-out":Yi(t)?Ft(t):Array.isArray(t)?t.map(n=>ya(n,e)||ps.easeOut):ps[t]}function el(t,e,n,{delay:s=0,duration:i=300,repeat:r=0,repeatType:a="loop",ease:o="easeOut",times:c}={},h=void 0){const l={[e]:n};c&&(l.offset=c);const u=ya(o,i);Array.isArray(u)&&(l.easing=u);const f={delay:s,duration:i,easing:Array.isArray(u)?"linear":u,fill:"both",iterations:r+1,direction:a==="reverse"?"alternate":"normal"};return h&&(f.pseudoElement=h),t.animate(l,f)}function ma(t){return typeof t=="function"&&"applyToOptions"in t}function nl({type:t,...e}){return ma(t)&&pa()?t.applyToOptions(e):(e.duration??(e.duration=300),e.ease??(e.ease="easeOut"),e)}class ga extends In{constructor(e){if(super(),this.finishedTime=null,this.isStopped=!1,this.manualStartTime=null,!e)return;const{element:n,name:s,keyframes:i,pseudoElement:r,allowFlatten:a=!1,finalKeyframe:o,onComplete:c}=e;this.isPseudoElement=!!r,this.allowFlatten=a,this.options=e,An(typeof e.type!="string");const h=nl(e);this.animation=el(n,s,i,h,r),h.autoplay===!1&&this.animation.pause(),this.animation.onfinish=()=>{if(this.finishedTime=this.time,!r){const l=Ce(i,this.options,o,this.speed);this.updateMotionValue&&this.updateMotionValue(l),da(n,s,l),this.animation.cancel()}c==null||c(),this.notifyFinished()}}play(){this.isStopped||(this.manualStartTime=null,this.animation.play(),this.state==="finished"&&this.updateFinished())}pause(){this.animation.pause()}complete(){var e,n;(n=(e=this.animation).finish)==null||n.call(e)}cancel(){try{this.animation.cancel()}catch{}}stop(){if(this.isStopped)return;this.isStopped=!0;const{state:e}=this;e==="idle"||e==="finished"||(this.updateMotionValue?this.updateMotionValue():this.commitStyles(),this.isPseudoElement||this.cancel())}commitStyles(){var n,s,i;const e=(n=this.options)==null?void 0:n.element;!this.isPseudoElement&&(e!=null&&e.isConnected)&&((i=(s=this.animation).commitStyles)==null||i.call(s))}get duration(){var n,s;const e=((s=(n=this.animation.effect)==null?void 0:n.getComputedTiming)==null?void 0:s.call(n).duration)||0;return K(Number(e))}get iterationDuration(){const{delay:e=0}=this.options||{};return this.duration+K(e)}get time(){return K(Number(this.animation.currentTime)||0)}set time(e){const n=this.finishedTime!==null;this.manualStartTime=null,this.finishedTime=null,this.animation.currentTime=_(e),n&&this.animation.pause()}get speed(){return this.animation.playbackRate}set speed(e){e<0&&(this.finishedTime=null),this.animation.playbackRate=e}get state(){return this.finishedTime!==null?"finished":this.animation.playState}get startTime(){return this.manualStartTime??Number(this.animation.startTime)}set startTime(e){this.manualStartTime=this.animation.startTime=e}attachTimeline({timeline:e,rangeStart:n,rangeEnd:s,observe:i}){var r;return this.allowFlatten&&((r=this.animation.effect)==null||r.updateTiming({easing:"linear"})),this.animation.onfinish=null,e&&tl()?(this.animation.timeline=e,n&&(this.animation.rangeStart=n),s&&(this.animation.rangeEnd=s),G):i(this)}}const ka={anticipate:Ki,backInOut:Wi,circInOut:Xi};function sl(t){return t in ka}function il(t){typeof t.ease=="string"&&sl(t.ease)&&(t.ease=ka[t.ease])}const Fe=10;class al extends ga{constructor(e){il(e),la(e),super(e),e.startTime!==void 0&&e.autoplay!==!1&&(this.startTime=e.startTime),this.options=e}updateMotionValue(e){const{motionValue:n,onUpdate:s,onComplete:i,element:r,...a}=this.options;if(!n)return;if(e!==void 0){n.set(e);return}const o=new ke({...a,autoplay:!1}),c=Math.max(Fe,q.now()-this.startTime),h=it(0,Fe,c-Fe),l=o.sample(c).value,{name:u}=this.options;r&&u&&da(r,u,l),n.setWithVelocity(o.sample(Math.max(0,c-h)).value,l,h),o.stop()}}const ys=(t,e)=>e==="zIndex"?!1:!!(typeof t=="number"||Array.isArray(t)||typeof t=="string"&&(Y.test(t)||t==="0")&&!t.startsWith("url("));function rl(t){const e=t[0];if(t.length===1)return!0;for(let n=0;n<t.length;n++)if(t[n]!==e)return!0}function ol(t,e,n,s){const i=t[0];if(i===null)return!1;if(e==="display"||e==="visibility")return!0;const r=t[t.length-1],a=ys(i,e),o=ys(r,e);return!a||!o?!1:rl(t)||(n==="spring"||ma(n))&&s}function cn(t){t.duration=0,t.type="keyframes"}const va=new Set(["opacity","clipPath","filter","transform"]),cl=/^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;function ll(t){for(let e=0;e<t.length;e++)if(typeof t[e]=="string"&&cl.test(t[e]))return!0;return!1}const hl=new Set(["color","backgroundColor","outlineColor","fill","stroke","borderColor","borderTopColor","borderRightColor","borderBottomColor","borderLeftColor"]),ul=Hi(()=>Object.hasOwnProperty.call(Element.prototype,"animate"));function dl(t){var u;const{motionValue:e,name:n,repeatDelay:s,repeatType:i,damping:r,type:a,keyframes:o}=t;if(!(((u=e==null?void 0:e.owner)==null?void 0:u.current)instanceof HTMLElement))return!1;const{onUpdate:h,transformTemplate:l}=e.owner.getProps();return ul()&&n&&(va.has(n)||hl.has(n)&&ll(o))&&(n!=="transform"||!l)&&!h&&!s&&i!=="mirror"&&r!==0&&a!=="inertia"}const fl=40;class pl extends In{constructor({autoplay:e=!0,delay:n=0,type:s="keyframes",repeat:i=0,repeatDelay:r=0,repeatType:a="loop",keyframes:o,name:c,motionValue:h,element:l,...u}){var y;super(),this.stop=()=>{var k,m;this._animation&&(this._animation.stop(),(k=this.stopTimeline)==null||k.call(this)),(m=this.keyframeResolver)==null||m.cancel()},this.createdAt=q.now();const f={autoplay:e,delay:n,type:s,repeat:i,repeatDelay:r,repeatType:a,name:c,motionValue:h,element:l,...u},p=(l==null?void 0:l.KeyframeResolver)||Bn;this.keyframeResolver=new p(o,(k,m,x)=>this.onKeyframesResolved(k,m,f,!x),c,h,l),(y=this.keyframeResolver)==null||y.scheduleResolve()}onKeyframesResolved(e,n,s,i){var x,M;this.keyframeResolver=void 0;const{name:r,type:a,velocity:o,delay:c,isHandoff:h,onUpdate:l}=s;this.resolvedAt=q.now();let u=!0;ol(e,r,a,o)||(u=!1,(dt.instantAnimations||!c)&&(l==null||l(Ce(e,s,n))),e[0]=e[e.length-1],cn(s),s.repeat=0);const p={startTime:i?this.resolvedAt?this.resolvedAt-this.createdAt>fl?this.resolvedAt:this.createdAt:this.createdAt:void 0,finalKeyframe:n,...s,keyframes:e},y=u&&!h&&dl(p),k=(M=(x=p.motionValue)==null?void 0:x.owner)==null?void 0:M.current;let m;if(y)try{m=new al({...p,element:k})}catch{m=new ke(p)}else m=new ke(p);m.finished.then(()=>{this.notifyFinished()}).catch(G),this.pendingTimeline&&(this.stopTimeline=m.attachTimeline(this.pendingTimeline),this.pendingTimeline=void 0),this._animation=m}get finished(){return this._animation?this.animation.finished:this._finished}then(e,n){return this.finished.finally(e).then(()=>{})}get animation(){var e;return this._animation||((e=this.keyframeResolver)==null||e.resume(),Yc()),this._animation}get duration(){return this.animation.duration}get iterationDuration(){return this.animation.iterationDuration}get time(){return this.animation.time}set time(e){this.animation.time=e}get speed(){return this.animation.speed}get state(){return this.animation.state}set speed(e){this.animation.speed=e}get startTime(){return this.animation.startTime}attachTimeline(e){return this._animation?this.stopTimeline=this.animation.attachTimeline(e):this.pendingTimeline=e,()=>this.stop()}play(){this.animation.play()}pause(){this.animation.pause()}complete(){this.animation.complete()}cancel(){var e;this._animation&&this.animation.cancel(),(e=this.keyframeResolver)==null||e.cancel()}}function xa(t,e,n,s=0,i=1){const r=Array.from(t).sort((h,l)=>h.sortNodePosition(l)).indexOf(e),a=t.size,o=(a-1)*s;return typeof n=="function"?n(r,a):i===1?r*s:o-r*s}const yl=/^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;function ml(t){const e=yl.exec(t);if(!e)return[,];const[,n,s,i]=e;return[`--${n??s}`,i]}function Ma(t,e,n=1){const[s,i]=ml(t);if(!s)return;const r=window.getComputedStyle(e).getPropertyValue(s);if(r){const a=r.trim();return Ii(a)?parseFloat(a):a}return Ln(i)?Ma(i,e,n+1):i}const gl={type:"spring",stiffness:500,damping:25,restSpeed:10},kl=t=>({type:"spring",stiffness:550,damping:t===0?2*Math.sqrt(550):30,restSpeed:10}),vl={type:"keyframes",duration:.8},xl={type:"keyframes",ease:[.25,.1,.35,1],duration:.3},Ml=(t,{keyframes:e})=>e.length>2?vl:jt.has(t)?t.startsWith("scale")?kl(e[1]):gl:xl;function ba(t,e){if(t!=null&&t.inherit&&e){const{inherit:n,...s}=t;return{...e,...s}}return t}function On(t,e){const n=(t==null?void 0:t[e])??(t==null?void 0:t.default)??t;return n!==t?ba(n,t):n}const bl=new Set(["when","delay","delayChildren","staggerChildren","staggerDirection","repeat","repeatType","repeatDelay","from","elapsed"]);function wl(t){for(const e in t)if(!bl.has(e))return!0;return!1}const Hn=(t,e,n,s={},i,r)=>a=>{const o=On(s,t)||{},c=o.delay||s.delay||0;let{elapsed:h=0}=s;h=h-_(c);const l={keyframes:Array.isArray(n)?n:[null,n],ease:"easeOut",velocity:e.getVelocity(),...o,delay:-h,onUpdate:f=>{e.set(f),o.onUpdate&&o.onUpdate(f)},onComplete:()=>{a(),o.onComplete&&o.onComplete()},name:t,motionValue:e,element:r?void 0:i};wl(o)||Object.assign(l,Ml(t,l)),l.duration&&(l.duration=_(l.duration)),l.repeatDelay&&(l.repeatDelay=_(l.repeatDelay)),l.from!==void 0&&(l.keyframes[0]=l.from);let u=!1;if((l.type===!1||l.duration===0&&!l.repeatDelay)&&(cn(l),l.delay===0&&(u=!0)),(dt.instantAnimations||dt.skipAnimations||i!=null&&i.shouldSkipAnimations)&&(u=!0,cn(l),l.delay=0),l.allowFlatten=!o.type&&!o.ease,u&&!r&&e.get()!==void 0){const f=Ce(l.keyframes,o);if(f!==void 0){A.update(()=>{l.onUpdate(f),l.onComplete()});return}}return o.isSync?new ke(l):new pl(l)};function ms(t){const e=[{},{}];return t==null||t.values.forEach((n,s)=>{e[0][s]=n.get(),e[1][s]=n.getVelocity()}),e}function qn(t,e,n,s){if(typeof e=="function"){const[i,r]=ms(s);e=e(n!==void 0?n:t.custom,i,r)}if(typeof e=="string"&&(e=t.variants&&t.variants[e]),typeof e=="function"){const[i,r]=ms(s);e=e(n!==void 0?n:t.custom,i,r)}return e}function wt(t,e,n){const s=t.getProps();return qn(s,e,n!==void 0?n:s.custom,t)}const wa=new Set(["width","height","top","left","right","bottom",...Rt]),gs=30,Tl=t=>!isNaN(parseFloat(t));class Sl{constructor(e,n={}){this.canTrackVelocity=null,this.events={},this.updateAndNotify=s=>{var r;const i=q.now();if(this.updatedAt!==i&&this.setPrevFrameValue(),this.prev=this.current,this.setCurrent(s),this.current!==this.prev&&((r=this.events.change)==null||r.notify(this.current),this.dependents))for(const a of this.dependents)a.dirty()},this.hasAnimated=!1,this.setCurrent(e),this.owner=n.owner}setCurrent(e){this.current=e,this.updatedAt=q.now(),this.canTrackVelocity===null&&e!==void 0&&(this.canTrackVelocity=Tl(this.current))}setPrevFrameValue(e=this.current){this.prevFrameValue=e,this.prevUpdatedAt=this.updatedAt}onChange(e){return this.on("change",e)}on(e,n){this.events[e]||(this.events[e]=new Vn);const s=this.events[e].add(n);return e==="change"?()=>{s(),A.read(()=>{this.events.change.getSize()||this.stop()})}:s}clearListeners(){for(const e in this.events)this.events[e].clear()}attach(e,n){this.passiveEffect=e,this.stopPassiveEffect=n}set(e){this.passiveEffect?this.passiveEffect(e,this.updateAndNotify):this.updateAndNotify(e)}setWithVelocity(e,n,s){this.set(n),this.prev=void 0,this.prevFrameValue=e,this.prevUpdatedAt=this.updatedAt-s}jump(e,n=!0){this.updateAndNotify(e),this.prev=e,this.prevUpdatedAt=this.prevFrameValue=void 0,n&&this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}dirty(){var e;(e=this.events.change)==null||e.notify(this.current)}addDependent(e){this.dependents||(this.dependents=new Set),this.dependents.add(e)}removeDependent(e){this.dependents&&this.dependents.delete(e)}get(){return this.current}getPrevious(){return this.prev}getVelocity(){const e=q.now();if(!this.canTrackVelocity||this.prevFrameValue===void 0||e-this.updatedAt>gs)return 0;const n=Math.min(this.updatedAt-this.prevUpdatedAt,gs);return qi(parseFloat(this.current)-parseFloat(this.prevFrameValue),n)}start(e){return this.stop(),new Promise(n=>{this.hasAnimated=!0,this.animation=e(n),this.events.animationStart&&this.events.animationStart.notify()}).then(()=>{this.events.animationComplete&&this.events.animationComplete.notify(),this.clearAnimation()})}stop(){this.animation&&(this.animation.stop(),this.events.animationCancel&&this.events.animationCancel.notify()),this.clearAnimation()}isAnimating(){return!!this.animation}clearAnimation(){delete this.animation}destroy(){var e,n;(e=this.dependents)==null||e.clear(),(n=this.events.destroy)==null||n.notify(),this.clearListeners(),this.stop(),this.stopPassiveEffect&&this.stopPassiveEffect()}}function Dt(t,e){return new Sl(t,e)}const ln=t=>Array.isArray(t);function Cl(t,e,n){t.hasValue(e)?t.getValue(e).set(n):t.addValue(e,Dt(n))}function Pl(t){return ln(t)?t[t.length-1]||0:t}function Al(t,e){const n=wt(t,e);let{transitionEnd:s={},transition:i={},...r}=n||{};r={...r,...s};for(const a in r){const o=Pl(r[a]);Cl(t,a,o)}}const O=t=>!!(t&&t.getVelocity);function Vl(t){return!!(O(t)&&t.add)}function hn(t,e){const n=t.getValue("willChange");if(Vl(n))return n.add(e);if(!n&&dt.WillChange){const s=new dt.WillChange("auto");t.addValue("willChange",s),s.add(e)}}function Nn(t){return t.replace(/([A-Z])/g,e=>`-${e.toLowerCase()}`)}const Dl="framerAppearId",Ta="data-"+Nn(Dl);function Sa(t){return t.props[Ta]}function El({protectedKeys:t,needsAnimating:e},n){const s=t.hasOwnProperty(n)&&e[n]!==!0;return e[n]=!1,s}function Ca(t,e,{delay:n=0,transitionOverride:s,type:i}={}){let{transition:r,transitionEnd:a,...o}=e;const c=t.getDefaultTransition();r=r?ba(r,c):c;const h=r==null?void 0:r.reduceMotion;s&&(r=s);const l=[],u=i&&t.animationState&&t.animationState.getState()[i];for(const f in o){const p=t.getValue(f,t.latestValues[f]??null),y=o[f];if(y===void 0||u&&El(u,f))continue;const k={delay:n,...On(r||{},f)},m=p.get();if(m!==void 0&&!p.isAnimating()&&!Array.isArray(y)&&y===m&&!k.velocity){A.update(()=>p.set(y));continue}let x=!1;if(window.MotionHandoffAnimation){const w=Sa(t);if(w){const T=window.MotionHandoffAnimation(w,f,A);T!==null&&(k.startTime=T,x=!0)}}hn(t,f);const M=h??t.shouldReduceMotion;p.start(Hn(f,p,y,M&&wa.has(f)?{type:!1}:k,t,x));const v=p.animation;v&&l.push(v)}if(a){const f=()=>A.update(()=>{a&&Al(t,a)});l.length?Promise.all(l).then(f):f()}return l}function un(t,e,n={}){var c;const s=wt(t,e,n.type==="exit"?(c=t.presenceContext)==null?void 0:c.custom:void 0);let{transition:i=t.getDefaultTransition()||{}}=s||{};n.transitionOverride&&(i=n.transitionOverride);const r=s?()=>Promise.all(Ca(t,s,n)):()=>Promise.resolve(),a=t.variantChildren&&t.variantChildren.size?(h=0)=>{const{delayChildren:l=0,staggerChildren:u,staggerDirection:f}=i;return Ll(t,e,h,l,u,f,n)}:()=>Promise.resolve(),{when:o}=i;if(o){const[h,l]=o==="beforeChildren"?[r,a]:[a,r];return h().then(()=>l())}else return Promise.all([r(),a(n.delay)])}function Ll(t,e,n=0,s=0,i=0,r=1,a){const o=[];for(const c of t.variantChildren)c.notify("AnimationStart",e),o.push(un(c,e,{...a,delay:n+(typeof s=="function"?0:s)+xa(t.variantChildren,c,s,i,r)}).then(()=>c.notify("AnimationComplete",e)));return Promise.all(o)}function Rl(t,e,n={}){t.notify("AnimationStart",e);let s;if(Array.isArray(e)){const i=e.map(r=>un(t,r,n));s=Promise.all(i)}else if(typeof e=="string")s=un(t,e,n);else{const i=typeof e=="function"?wt(t,e,n.custom):e;s=Promise.all(Ca(t,i,n))}return s.then(()=>{t.notify("AnimationComplete",e)})}const jl={test:t=>t==="auto",parse:t=>t},Pa=t=>e=>e.test(t),Aa=[Lt,b,st,ct,rc,ac,jl],ks=t=>Aa.find(Pa(t));function zl(t){return typeof t=="number"?t===0:t!==null?t==="none"||t==="0"||Oi(t):!0}const Fl=new Set(["brightness","contrast","saturate","opacity"]);function Il(t){const[e,n]=t.slice(0,-1).split("(");if(e==="drop-shadow")return t;const[s]=n.match(Rn)||[];if(!s)return t;const i=n.replace(s,"");let r=Fl.has(e)?1:0;return s!==n&&(r*=100),e+"("+r+i+")"}const Bl=/\b([a-z-]*)\(.*?\)/gu,dn={...Y,getAnimatableNone:t=>{const e=t.match(Bl);return e?e.map(Il).join(" "):t}},fn={...Y,getAnimatableNone:t=>{const e=Y.parse(t);return Y.createTransformer(t)(e.map(s=>typeof s=="number"?0:typeof s=="object"?{...s,alpha:1}:s))}},vs={...Lt,transform:Math.round},Ol={rotate:ct,rotateX:ct,rotateY:ct,rotateZ:ct,scale:te,scaleX:te,scaleY:te,scaleZ:te,skew:ct,skewX:ct,skewY:ct,distance:b,translateX:b,translateY:b,translateZ:b,x:b,y:b,z:b,perspective:b,transformPerspective:b,opacity:Nt,originX:as,originY:as,originZ:b},Un={borderWidth:b,borderTopWidth:b,borderRightWidth:b,borderBottomWidth:b,borderLeftWidth:b,borderRadius:b,borderTopLeftRadius:b,borderTopRightRadius:b,borderBottomRightRadius:b,borderBottomLeftRadius:b,width:b,maxWidth:b,height:b,maxHeight:b,top:b,right:b,bottom:b,left:b,inset:b,insetBlock:b,insetBlockStart:b,insetBlockEnd:b,insetInline:b,insetInlineStart:b,insetInlineEnd:b,padding:b,paddingTop:b,paddingRight:b,paddingBottom:b,paddingLeft:b,paddingBlock:b,paddingBlockStart:b,paddingBlockEnd:b,paddingInline:b,paddingInlineStart:b,paddingInlineEnd:b,margin:b,marginTop:b,marginRight:b,marginBottom:b,marginLeft:b,marginBlock:b,marginBlockStart:b,marginBlockEnd:b,marginInline:b,marginInlineStart:b,marginInlineEnd:b,fontSize:b,backgroundPositionX:b,backgroundPositionY:b,...Ol,zIndex:vs,fillOpacity:Nt,strokeOpacity:Nt,numOctaves:vs},Hl={...Un,color:L,backgroundColor:L,outlineColor:L,fill:L,stroke:L,borderColor:L,borderTopColor:L,borderRightColor:L,borderBottomColor:L,borderLeftColor:L,filter:dn,WebkitFilter:dn,mask:fn,WebkitMask:fn},Va=t=>Hl[t],ql=new Set([dn,fn]);function Da(t,e){let n=Va(t);return ql.has(n)||(n=Y),n.getAnimatableNone?n.getAnimatableNone(e):void 0}const Nl=new Set(["auto","none","0"]);function Ul(t,e,n){let s=0,i;for(;s<t.length&&!i;){const r=t[s];typeof r=="string"&&!Nl.has(r)&&Vt(r).values.length&&(i=t[s]),s++}if(i&&n)for(const r of e)t[r]=Da(n,i)}class $l extends Bn{constructor(e,n,s,i,r){super(e,n,s,i,r,!0)}readKeyframes(){const{unresolvedKeyframes:e,element:n,name:s}=this;if(!n||!n.current)return;super.readKeyframes();for(let l=0;l<e.length;l++){let u=e[l];if(typeof u=="string"&&(u=u.trim(),Ln(u))){const f=Ma(u,n.current);f!==void 0&&(e[l]=f),l===e.length-1&&(this.finalKeyframe=u)}}if(this.resolveNoneKeyframes(),!wa.has(s)||e.length!==2)return;const[i,r]=e,a=ks(i),o=ks(r),c=is(i),h=is(r);if(c!==h&&ut[s]){this.needsMeasurement=!0;return}if(a!==o)if(fs(a)&&fs(o))for(let l=0;l<e.length;l++){const u=e[l];typeof u=="string"&&(e[l]=parseFloat(u))}else ut[s]&&(this.needsMeasurement=!0)}resolveNoneKeyframes(){const{unresolvedKeyframes:e,name:n}=this,s=[];for(let i=0;i<e.length;i++)(e[i]===null||zl(e[i]))&&s.push(i);s.length&&Ul(e,s,n)}measureInitialState(){const{element:e,unresolvedKeyframes:n,name:s}=this;if(!e||!e.current)return;s==="height"&&(this.suspendedScrollY=window.pageYOffset),this.measuredOrigin=ut[s](e.measureViewportBox(),window.getComputedStyle(e.current)),n[0]=this.measuredOrigin;const i=n[n.length-1];i!==void 0&&e.getValue(s,i).jump(i,!1)}measureEndState(){var o;const{element:e,name:n,unresolvedKeyframes:s}=this;if(!e||!e.current)return;const i=e.getValue(n);i&&i.jump(this.measuredOrigin,!1);const r=s.length-1,a=s[r];s[r]=ut[n](e.measureViewportBox(),window.getComputedStyle(e.current)),a!==null&&this.finalKeyframe===void 0&&(this.finalKeyframe=a),(o=this.removedTransforms)!=null&&o.length&&this.removedTransforms.forEach(([c,h])=>{e.getValue(c).set(h)}),this.resolveNoneKeyframes()}}function Ea(t,e,n){if(t==null)return[];if(t instanceof EventTarget)return[t];if(typeof t=="string"){let s=document;const i=(n==null?void 0:n[t])??s.querySelectorAll(t);return i?Array.from(i):[]}return Array.from(t).filter(s=>s!=null)}const La=(t,e)=>e&&typeof t=="number"?e.transform(t):t;function _l(t){return Bi(t)&&"offsetHeight"in t&&!("ownerSVGElement"in t)}const{schedule:$n}=Ji(queueMicrotask,!1),Z={x:!1,y:!1};function Ra(){return Z.x||Z.y}function Wl(t){return t==="x"||t==="y"?Z[t]?null:(Z[t]=!0,()=>{Z[t]=!1}):Z.x||Z.y?null:(Z.x=Z.y=!0,()=>{Z.x=Z.y=!1})}function ja(t,e){const n=Ea(t),s=new AbortController,i={passive:!0,...e,signal:s.signal};return[n,i,()=>s.abort()]}function Kl(t){return!(t.pointerType==="touch"||Ra())}function Gl(t,e,n={}){const[s,i,r]=ja(t,n);return s.forEach(a=>{let o=!1,c=!1,h;const l=()=>{a.removeEventListener("pointerleave",y)},u=m=>{h&&(h(m),h=void 0),l()},f=m=>{o=!1,window.removeEventListener("pointerup",f),window.removeEventListener("pointercancel",f),c&&(c=!1,u(m))},p=()=>{o=!0,window.addEventListener("pointerup",f,i),window.addEventListener("pointercancel",f,i)},y=m=>{if(m.pointerType!=="touch"){if(o){c=!0;return}u(m)}},k=m=>{if(!Kl(m))return;c=!1;const x=e(a,m);typeof x=="function"&&(h=x,a.addEventListener("pointerleave",y,i))};a.addEventListener("pointerenter",k,i),a.addEventListener("pointerdown",p,i)}),r}const za=(t,e)=>e?t===e?!0:za(t,e.parentElement):!1,_n=t=>t.pointerType==="mouse"?typeof t.button!="number"||t.button<=0:t.isPrimary!==!1,Xl=new Set(["BUTTON","INPUT","SELECT","TEXTAREA","A"]);function Zl(t){return Xl.has(t.tagName)||t.isContentEditable===!0}const Yl=new Set(["INPUT","SELECT","TEXTAREA"]);function Jl(t){return Yl.has(t.tagName)||t.isContentEditable===!0}const oe=new WeakSet;function xs(t){return e=>{e.key==="Enter"&&t(e)}}function Ie(t,e){t.dispatchEvent(new PointerEvent("pointer"+e,{isPrimary:!0,bubbles:!0}))}const Ql=(t,e)=>{const n=t.currentTarget;if(!n)return;const s=xs(()=>{if(oe.has(n))return;Ie(n,"down");const i=xs(()=>{Ie(n,"up")}),r=()=>Ie(n,"cancel");n.addEventListener("keyup",i,e),n.addEventListener("blur",r,e)});n.addEventListener("keydown",s,e),n.addEventListener("blur",()=>n.removeEventListener("keydown",s),e)};function Ms(t){return _n(t)&&!Ra()}const bs=new WeakSet;function th(t,e,n={}){const[s,i,r]=ja(t,n),a=o=>{const c=o.currentTarget;if(!Ms(o)||bs.has(o))return;oe.add(c),n.stopPropagation&&bs.add(o);const h=e(c,o),l=(p,y)=>{window.removeEventListener("pointerup",u),window.removeEventListener("pointercancel",f),oe.has(c)&&oe.delete(c),Ms(p)&&typeof h=="function"&&h(p,{success:y})},u=p=>{l(p,c===window||c===document||n.useGlobalTarget||za(c,p.target))},f=p=>{l(p,!1)};window.addEventListener("pointerup",u,i),window.addEventListener("pointercancel",f,i)};return s.forEach(o=>{(n.useGlobalTarget?window:o).addEventListener("pointerdown",a,i),_l(o)&&(o.addEventListener("focus",h=>Ql(h,i)),!Zl(o)&&!o.hasAttribute("tabindex")&&(o.tabIndex=0))}),r}function Wn(t){return Bi(t)&&"ownerSVGElement"in t}const ce=new WeakMap;let lt;const Fa=(t,e,n)=>(s,i)=>i&&i[0]?i[0][t+"Size"]:Wn(s)&&"getBBox"in s?s.getBBox()[e]:s[n],eh=Fa("inline","width","offsetWidth"),nh=Fa("block","height","offsetHeight");function sh({target:t,borderBoxSize:e}){var n;(n=ce.get(t))==null||n.forEach(s=>{s(t,{get width(){return eh(t,e)},get height(){return nh(t,e)}})})}function ih(t){t.forEach(sh)}function ah(){typeof ResizeObserver>"u"||(lt=new ResizeObserver(ih))}function rh(t,e){lt||ah();const n=Ea(t);return n.forEach(s=>{let i=ce.get(s);i||(i=new Set,ce.set(s,i)),i.add(e),lt==null||lt.observe(s)}),()=>{n.forEach(s=>{const i=ce.get(s);i==null||i.delete(e),i!=null&&i.size||lt==null||lt.unobserve(s)})}}const le=new Set;let Pt;function oh(){Pt=()=>{const t={get width(){return window.innerWidth},get height(){return window.innerHeight}};le.forEach(e=>e(t))},window.addEventListener("resize",Pt)}function ch(t){return le.add(t),Pt||oh(),()=>{le.delete(t),!le.size&&typeof Pt=="function"&&(window.removeEventListener("resize",Pt),Pt=void 0)}}function ws(t,e){return typeof t=="function"?ch(t):rh(t,e)}function lh(t){return Wn(t)&&t.tagName==="svg"}const hh=[...Aa,L,Y],uh=t=>hh.find(Pa(t)),Ts=()=>({translate:0,scale:1,origin:0,originPoint:0}),At=()=>({x:Ts(),y:Ts()}),Ss=()=>({min:0,max:0}),j=()=>({x:Ss(),y:Ss()}),dh=new WeakMap;function Pe(t){return t!==null&&typeof t=="object"&&typeof t.start=="function"}function Ut(t){return typeof t=="string"||Array.isArray(t)}const Kn=["animate","whileInView","whileFocus","whileHover","whileTap","whileDrag","exit"],Gn=["initial",...Kn];function Ae(t){return Pe(t.animate)||Gn.some(e=>Ut(t[e]))}function Ia(t){return!!(Ae(t)||t.variants)}function fh(t,e,n){for(const s in e){const i=e[s],r=n[s];if(O(i))t.addValue(s,i);else if(O(r))t.addValue(s,Dt(i,{owner:t}));else if(r!==i)if(t.hasValue(s)){const a=t.getValue(s);a.liveStyle===!0?a.jump(i):a.hasAnimated||a.set(i)}else{const a=t.getStaticValue(s);t.addValue(s,Dt(a!==void 0?a:i,{owner:t}))}}for(const s in n)e[s]===void 0&&t.removeValue(s);return e}const pn={current:null},Ba={current:!1},ph=typeof window<"u";function yh(){if(Ba.current=!0,!!ph)if(window.matchMedia){const t=window.matchMedia("(prefers-reduced-motion)"),e=()=>pn.current=t.matches;t.addEventListener("change",e),e()}else pn.current=!1}const Cs=["AnimationStart","AnimationComplete","Update","BeforeLayoutMeasure","LayoutMeasure","LayoutAnimationStart","LayoutAnimationComplete"];let ve={};function Oa(t){ve=t}function mh(){return ve}class gh{scrapeMotionValuesFromProps(e,n,s){return{}}constructor({parent:e,props:n,presenceContext:s,reducedMotionConfig:i,skipAnimations:r,blockInitialAnimation:a,visualState:o},c={}){this.current=null,this.children=new Set,this.isVariantNode=!1,this.isControllingVariants=!1,this.shouldReduceMotion=null,this.shouldSkipAnimations=!1,this.values=new Map,this.KeyframeResolver=Bn,this.features={},this.valueSubscriptions=new Map,this.prevMotionValues={},this.hasBeenMounted=!1,this.events={},this.propEventSubscriptions={},this.notifyUpdate=()=>this.notify("Update",this.latestValues),this.render=()=>{this.current&&(this.triggerBuild(),this.renderInstance(this.current,this.renderState,this.props.style,this.projection))},this.renderScheduledAt=0,this.scheduleRender=()=>{const p=q.now();this.renderScheduledAt<p&&(this.renderScheduledAt=p,A.render(this.render,!1,!0))};const{latestValues:h,renderState:l}=o;this.latestValues=h,this.baseTarget={...h},this.initialValues=n.initial?{...h}:{},this.renderState=l,this.parent=e,this.props=n,this.presenceContext=s,this.depth=e?e.depth+1:0,this.reducedMotionConfig=i,this.skipAnimationsConfig=r,this.options=c,this.blockInitialAnimation=!!a,this.isControllingVariants=Ae(n),this.isVariantNode=Ia(n),this.isVariantNode&&(this.variantChildren=new Set),this.manuallyAnimateOnMount=!!(e&&e.current);const{willChange:u,...f}=this.scrapeMotionValuesFromProps(n,{},this);for(const p in f){const y=f[p];h[p]!==void 0&&O(y)&&y.set(h[p])}}mount(e){var n,s;if(this.hasBeenMounted)for(const i in this.initialValues)(n=this.values.get(i))==null||n.jump(this.initialValues[i]),this.latestValues[i]=this.initialValues[i];this.current=e,dh.set(e,this),this.projection&&!this.projection.instance&&this.projection.mount(e),this.parent&&this.isVariantNode&&!this.isControllingVariants&&(this.removeFromVariantTree=this.parent.addVariantChild(this)),this.values.forEach((i,r)=>this.bindToMotionValue(r,i)),this.reducedMotionConfig==="never"?this.shouldReduceMotion=!1:this.reducedMotionConfig==="always"?this.shouldReduceMotion=!0:(Ba.current||yh(),this.shouldReduceMotion=pn.current),this.shouldSkipAnimations=this.skipAnimationsConfig??!1,(s=this.parent)==null||s.addChild(this),this.update(this.props,this.presenceContext),this.hasBeenMounted=!0}unmount(){var e;this.projection&&this.projection.unmount(),ft(this.notifyUpdate),ft(this.render),this.valueSubscriptions.forEach(n=>n()),this.valueSubscriptions.clear(),this.removeFromVariantTree&&this.removeFromVariantTree(),(e=this.parent)==null||e.removeChild(this);for(const n in this.events)this.events[n].clear();for(const n in this.features){const s=this.features[n];s&&(s.unmount(),s.isMounted=!1)}this.current=null}addChild(e){this.children.add(e),this.enteringChildren??(this.enteringChildren=new Set),this.enteringChildren.add(e)}removeChild(e){this.children.delete(e),this.enteringChildren&&this.enteringChildren.delete(e)}bindToMotionValue(e,n){if(this.valueSubscriptions.has(e)&&this.valueSubscriptions.get(e)(),n.accelerate&&va.has(e)&&this.current instanceof HTMLElement){const{factory:a,keyframes:o,times:c,ease:h,duration:l}=n.accelerate,u=new ga({element:this.current,name:e,keyframes:o,times:c,ease:h,duration:_(l)}),f=a(u);this.valueSubscriptions.set(e,()=>{f(),u.cancel()});return}const s=jt.has(e);s&&this.onBindTransform&&this.onBindTransform();const i=n.on("change",a=>{this.latestValues[e]=a,this.props.onUpdate&&A.preRender(this.notifyUpdate),s&&this.projection&&(this.projection.isTransformDirty=!0),this.scheduleRender()});let r;typeof window<"u"&&window.MotionCheckAppearSync&&(r=window.MotionCheckAppearSync(this,e,n)),this.valueSubscriptions.set(e,()=>{i(),r&&r(),n.owner&&n.stop()})}sortNodePosition(e){return!this.current||!this.sortInstanceNodePosition||this.type!==e.type?0:this.sortInstanceNodePosition(this.current,e.current)}updateFeatures(){let e="animation";for(e in ve){const n=ve[e];if(!n)continue;const{isEnabled:s,Feature:i}=n;if(!this.features[e]&&i&&s(this.props)&&(this.features[e]=new i(this)),this.features[e]){const r=this.features[e];r.isMounted?r.update():(r.mount(),r.isMounted=!0)}}}triggerBuild(){this.build(this.renderState,this.latestValues,this.props)}measureViewportBox(){return this.current?this.measureInstanceViewportBox(this.current,this.props):j()}getStaticValue(e){return this.latestValues[e]}setStaticValue(e,n){this.latestValues[e]=n}update(e,n){(e.transformTemplate||this.props.transformTemplate)&&this.scheduleRender(),this.prevProps=this.props,this.props=e,this.prevPresenceContext=this.presenceContext,this.presenceContext=n;for(let s=0;s<Cs.length;s++){const i=Cs[s];this.propEventSubscriptions[i]&&(this.propEventSubscriptions[i](),delete this.propEventSubscriptions[i]);const r="on"+i,a=e[r];a&&(this.propEventSubscriptions[i]=this.on(i,a))}this.prevMotionValues=fh(this,this.scrapeMotionValuesFromProps(e,this.prevProps||{},this),this.prevMotionValues),this.handleChildMotionValue&&this.handleChildMotionValue()}getProps(){return this.props}getVariant(e){return this.props.variants?this.props.variants[e]:void 0}getDefaultTransition(){return this.props.transition}getTransformPagePoint(){return this.props.transformPagePoint}getClosestVariantNode(){return this.isVariantNode?this:this.parent?this.parent.getClosestVariantNode():void 0}addVariantChild(e){const n=this.getClosestVariantNode();if(n)return n.variantChildren&&n.variantChildren.add(e),()=>n.variantChildren.delete(e)}addValue(e,n){const s=this.values.get(e);n!==s&&(s&&this.removeValue(e),this.bindToMotionValue(e,n),this.values.set(e,n),this.latestValues[e]=n.get())}removeValue(e){this.values.delete(e);const n=this.valueSubscriptions.get(e);n&&(n(),this.valueSubscriptions.delete(e)),delete this.latestValues[e],this.removeValueFromRenderState(e,this.renderState)}hasValue(e){return this.values.has(e)}getValue(e,n){if(this.props.values&&this.props.values[e])return this.props.values[e];let s=this.values.get(e);return s===void 0&&n!==void 0&&(s=Dt(n===null?void 0:n,{owner:this}),this.addValue(e,s)),s}readValue(e,n){let s=this.latestValues[e]!==void 0||!this.current?this.latestValues[e]:this.getBaseTargetFromProps(this.props,e)??this.readValueFromInstance(this.current,e,this.options);return s!=null&&(typeof s=="string"&&(Ii(s)||Oi(s))?s=parseFloat(s):!uh(s)&&Y.test(n)&&(s=Da(e,n)),this.setBaseTarget(e,O(s)?s.get():s)),O(s)?s.get():s}setBaseTarget(e,n){this.baseTarget[e]=n}getBaseTarget(e){var r;const{initial:n}=this.props;let s;if(typeof n=="string"||typeof n=="object"){const a=qn(this.props,n,(r=this.presenceContext)==null?void 0:r.custom);a&&(s=a[e])}if(n&&s!==void 0)return s;const i=this.getBaseTargetFromProps(this.props,e);return i!==void 0&&!O(i)?i:this.initialValues[e]!==void 0&&s===void 0?void 0:this.baseTarget[e]}on(e,n){return this.events[e]||(this.events[e]=new Vn),this.events[e].add(n)}notify(e,...n){this.events[e]&&this.events[e].notify(...n)}scheduleRenderMicrotask(){$n.render(this.render)}}class Ha extends gh{constructor(){super(...arguments),this.KeyframeResolver=$l}sortInstanceNodePosition(e,n){return e.compareDocumentPosition(n)&2?1:-1}getBaseTargetFromProps(e,n){const s=e.style;return s?s[n]:void 0}removeValueFromRenderState(e,{vars:n,style:s}){delete n[e],delete s[e]}handleChildMotionValue(){this.childSubscription&&(this.childSubscription(),delete this.childSubscription);const{children:e}=this.props;O(e)&&(this.childSubscription=e.on("change",n=>{this.current&&(this.current.textContent=`${n}`)}))}}class yt{constructor(e){this.isMounted=!1,this.node=e}update(){}}function qa({top:t,left:e,right:n,bottom:s}){return{x:{min:e,max:n},y:{min:t,max:s}}}function kh({x:t,y:e}){return{top:e.min,right:t.max,bottom:e.max,left:t.min}}function vh(t,e){if(!e)return t;const n=e({x:t.left,y:t.top}),s=e({x:t.right,y:t.bottom});return{top:n.y,left:n.x,bottom:s.y,right:s.x}}function Be(t){return t===void 0||t===1}function yn({scale:t,scaleX:e,scaleY:n}){return!Be(t)||!Be(e)||!Be(n)}function vt(t){return yn(t)||Na(t)||t.z||t.rotate||t.rotateX||t.rotateY||t.skewX||t.skewY}function Na(t){return Ps(t.x)||Ps(t.y)}function Ps(t){return t&&t!=="0%"}function xe(t,e,n){const s=t-n,i=e*s;return n+i}function As(t,e,n,s,i){return i!==void 0&&(t=xe(t,i,s)),xe(t,n,s)+e}function mn(t,e=0,n=1,s,i){t.min=As(t.min,e,n,s,i),t.max=As(t.max,e,n,s,i)}function Ua(t,{x:e,y:n}){mn(t.x,e.translate,e.scale,e.originPoint),mn(t.y,n.translate,n.scale,n.originPoint)}const Vs=.999999999999,Ds=1.0000000000001;function xh(t,e,n,s=!1){var o;const i=n.length;if(!i)return;e.x=e.y=1;let r,a;for(let c=0;c<i;c++){r=n[c],a=r.projectionDelta;const{visualElement:h}=r.options;h&&h.props.style&&h.props.style.display==="contents"||(s&&r.options.layoutScroll&&r.scroll&&r!==r.root&&(et(t.x,-r.scroll.offset.x),et(t.y,-r.scroll.offset.y)),a&&(e.x*=a.x.scale,e.y*=a.y.scale,Ua(t,a)),s&&vt(r.latestValues)&&he(t,r.latestValues,(o=r.layout)==null?void 0:o.layoutBox))}e.x<Ds&&e.x>Vs&&(e.x=1),e.y<Ds&&e.y>Vs&&(e.y=1)}function et(t,e){t.min+=e,t.max+=e}function Es(t,e,n,s,i=.5){const r=V(t.min,t.max,i);mn(t,e,n,r,s)}function Ls(t,e){return typeof t=="string"?parseFloat(t)/100*(e.max-e.min):t}function he(t,e,n){const s=n??t;Es(t.x,Ls(e.x,s.x),e.scaleX,e.scale,e.originX),Es(t.y,Ls(e.y,s.y),e.scaleY,e.scale,e.originY)}function $a(t,e){return qa(vh(t.getBoundingClientRect(),e))}function Mh(t,e,n){const s=$a(t,n),{scroll:i}=e;return i&&(et(s.x,i.offset.x),et(s.y,i.offset.y)),s}const bh={x:"translateX",y:"translateY",z:"translateZ",transformPerspective:"perspective"},wh=Rt.length;function Th(t,e,n){let s="",i=!0;for(let r=0;r<wh;r++){const a=Rt[r],o=t[a];if(o===void 0)continue;let c=!0;if(typeof o=="number")c=o===(a.startsWith("scale")?1:0);else{const h=parseFloat(o);c=a.startsWith("scale")?h===1:h===0}if(!c||n){const h=La(o,Un[a]);if(!c){i=!1;const l=bh[a]||a;s+=`${l}(${h}) `}n&&(e[a]=h)}}return s=s.trim(),n?s=n(e,i?"":s):i&&(s="none"),s}function Xn(t,e,n){const{style:s,vars:i,transformOrigin:r}=t;let a=!1,o=!1;for(const c in e){const h=e[c];if(jt.has(c)){a=!0;continue}else if(ta(c)){i[c]=h;continue}else{const l=La(h,Un[c]);c.startsWith("origin")?(o=!0,r[c]=l):s[c]=l}}if(e.transform||(a||n?s.transform=Th(e,t.transform,n):s.transform&&(s.transform="none")),o){const{originX:c="50%",originY:h="50%",originZ:l=0}=r;s.transformOrigin=`${c} ${h} ${l}`}}function _a(t,{style:e,vars:n},s,i){const r=t.style;let a;for(a in e)r[a]=e[a];i==null||i.applyProjectionStyles(r,s);for(a in n)r.setProperty(a,n[a])}function Rs(t,e){return e.max===e.min?0:t/(e.max-e.min)*100}const zt={correct:(t,e)=>{if(!e.target)return t;if(typeof t=="string")if(b.test(t))t=parseFloat(t);else return t;const n=Rs(t,e.target.x),s=Rs(t,e.target.y);return`${n}% ${s}%`}},Sh={correct:(t,{treeScale:e,projectionDelta:n})=>{const s=t,i=Y.parse(t);if(i.length>5)return s;const r=Y.createTransformer(t),a=typeof i[0]!="number"?1:0,o=n.x.scale*e.x,c=n.y.scale*e.y;i[0+a]/=o,i[1+a]/=c;const h=V(o,c,.5);return typeof i[2+a]=="number"&&(i[2+a]/=h),typeof i[3+a]=="number"&&(i[3+a]/=h),r(i)}},gn={borderRadius:{...zt,applyTo:["borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius"]},borderTopLeftRadius:zt,borderTopRightRadius:zt,borderBottomLeftRadius:zt,borderBottomRightRadius:zt,boxShadow:Sh};function Wa(t,{layout:e,layoutId:n}){return jt.has(t)||t.startsWith("origin")||(e||n!==void 0)&&(!!gn[t]||t==="opacity")}function Zn(t,e,n){var a;const s=t.style,i=e==null?void 0:e.style,r={};if(!s)return r;for(const o in s)(O(s[o])||i&&O(i[o])||Wa(o,t)||((a=n==null?void 0:n.getValue(o))==null?void 0:a.liveStyle)!==void 0)&&(r[o]=s[o]);return r}function Ch(t){return window.getComputedStyle(t)}class Ph extends Ha{constructor(){super(...arguments),this.type="html",this.renderInstance=_a}readValueFromInstance(e,n){var s;if(jt.has(n))return(s=this.projection)!=null&&s.isProjecting?nn(n):Wc(e,n);{const i=Ch(e),r=(ta(n)?i.getPropertyValue(n):i[n])||0;return typeof r=="string"?r.trim():r}}measureInstanceViewportBox(e,{transformPagePoint:n}){return $a(e,n)}build(e,n,s){Xn(e,n,s.transformTemplate)}scrapeMotionValuesFromProps(e,n,s){return Zn(e,n,s)}}const Ah={offset:"stroke-dashoffset",array:"stroke-dasharray"},Vh={offset:"strokeDashoffset",array:"strokeDasharray"};function Dh(t,e,n=1,s=0,i=!0){t.pathLength=1;const r=i?Ah:Vh;t[r.offset]=`${-s}`,t[r.array]=`${e} ${n}`}const Eh=["offsetDistance","offsetPath","offsetRotate","offsetAnchor"];function Ka(t,{attrX:e,attrY:n,attrScale:s,pathLength:i,pathSpacing:r=1,pathOffset:a=0,...o},c,h,l){if(Xn(t,o,h),c){t.style.viewBox&&(t.attrs.viewBox=t.style.viewBox);return}t.attrs=t.style,t.style={};const{attrs:u,style:f}=t;u.transform&&(f.transform=u.transform,delete u.transform),(f.transform||u.transformOrigin)&&(f.transformOrigin=u.transformOrigin??"50% 50%",delete u.transformOrigin),f.transform&&(f.transformBox=(l==null?void 0:l.transformBox)??"fill-box",delete u.transformBox);for(const p of Eh)u[p]!==void 0&&(f[p]=u[p],delete u[p]);e!==void 0&&(u.x=e),n!==void 0&&(u.y=n),s!==void 0&&(u.scale=s),i!==void 0&&Dh(u,i,r,a,!1)}const Ga=new Set(["baseFrequency","diffuseConstant","kernelMatrix","kernelUnitLength","keySplines","keyTimes","limitingConeAngle","markerHeight","markerWidth","numOctaves","targetX","targetY","surfaceScale","specularConstant","specularExponent","stdDeviation","tableValues","viewBox","gradientTransform","pathLength","startOffset","textLength","lengthAdjust"]),Xa=t=>typeof t=="string"&&t.toLowerCase()==="svg";function Lh(t,e,n,s){_a(t,e,void 0,s);for(const i in e.attrs)t.setAttribute(Ga.has(i)?i:Nn(i),e.attrs[i])}function Za(t,e,n){const s=Zn(t,e,n);for(const i in t)if(O(t[i])||O(e[i])){const r=Rt.indexOf(i)!==-1?"attr"+i.charAt(0).toUpperCase()+i.substring(1):i;s[r]=t[i]}return s}class Rh extends Ha{constructor(){super(...arguments),this.type="svg",this.isSVGTag=!1,this.measureInstanceViewportBox=j}getBaseTargetFromProps(e,n){return e[n]}readValueFromInstance(e,n){if(jt.has(n)){const s=Va(n);return s&&s.default||0}return n=Ga.has(n)?n:Nn(n),e.getAttribute(n)}scrapeMotionValuesFromProps(e,n,s){return Za(e,n,s)}build(e,n,s){Ka(e,n,this.isSVGTag,s.transformTemplate,s.style)}renderInstance(e,n,s,i){Lh(e,n,s,i)}mount(e){this.isSVGTag=Xa(e.tagName),super.mount(e)}}const jh=Gn.length;function Ya(t){if(!t)return;if(!t.isControllingVariants){const n=t.parent?Ya(t.parent)||{}:{};return t.props.initial!==void 0&&(n.initial=t.props.initial),n}const e={};for(let n=0;n<jh;n++){const s=Gn[n],i=t.props[s];(Ut(i)||i===!1)&&(e[s]=i)}return e}function Ja(t,e){if(!Array.isArray(e))return!1;const n=e.length;if(n!==t.length)return!1;for(let s=0;s<n;s++)if(e[s]!==t[s])return!1;return!0}const zh=[...Kn].reverse(),Fh=Kn.length;function Ih(t){return e=>Promise.all(e.map(({animation:n,options:s})=>Rl(t,n,s)))}function Bh(t){let e=Ih(t),n=js(),s=!0,i=!1;const r=h=>(l,u)=>{var p;const f=wt(t,u,h==="exit"?(p=t.presenceContext)==null?void 0:p.custom:void 0);if(f){const{transition:y,transitionEnd:k,...m}=f;l={...l,...m,...k}}return l};function a(h){e=h(t)}function o(h){const{props:l}=t,u=Ya(t.parent)||{},f=[],p=new Set;let y={},k=1/0;for(let x=0;x<Fh;x++){const M=zh[x],v=n[M],w=l[M]!==void 0?l[M]:u[M],T=Ut(w),R=M===h?v.isActive:null;R===!1&&(k=x);let H=w===u[M]&&w!==l[M]&&T;if(H&&(s||i)&&t.manuallyAnimateOnMount&&(H=!1),v.protectedKeys={...y},!v.isActive&&R===null||!w&&!v.prevProp||Pe(w)||typeof w=="boolean")continue;if(M==="exit"&&v.isActive&&R!==!0){v.prevResolvedValues&&(y={...y,...v.prevResolvedValues});continue}const P=Oh(v.prevProp,w);let F=P||M===h&&v.isActive&&!H&&T||x>k&&T,S=!1;const E=Array.isArray(w)?w:[w];let $=E.reduce(r(M),{});R===!1&&($={});const{prevResolvedValues:mt={}}=v,J={...mt,...$},at=I=>{F=!0,p.has(I)&&(S=!0,p.delete(I)),v.needsAnimating[I]=!0;const W=t.getValue(I);W&&(W.liveStyle=!1)};for(const I in J){const W=$[I],gt=mt[I];if(y.hasOwnProperty(I))continue;let Tt=!1;ln(W)&&ln(gt)?Tt=!Ja(W,gt):Tt=W!==gt,Tt?W!=null?at(I):p.add(I):W!==void 0&&p.has(I)?at(I):v.protectedKeys[I]=!0}v.prevProp=w,v.prevResolvedValues=$,v.isActive&&(y={...y,...$}),(s||i)&&t.blockInitialAnimation&&(F=!1);const Q=H&&P;F&&(!Q||S)&&f.push(...E.map(I=>{const W={type:M};if(typeof I=="string"&&(s||i)&&!Q&&t.manuallyAnimateOnMount&&t.parent){const{parent:gt}=t,Tt=wt(gt,I);if(gt.enteringChildren&&Tt){const{delayChildren:br}=Tt.transition||{};W.delay=xa(gt.enteringChildren,t,br)}}return{animation:I,options:W}}))}if(p.size){const x={};if(typeof l.initial!="boolean"){const M=wt(t,Array.isArray(l.initial)?l.initial[0]:l.initial);M&&M.transition&&(x.transition=M.transition)}p.forEach(M=>{const v=t.getBaseTarget(M),w=t.getValue(M);w&&(w.liveStyle=!0),x[M]=v??null}),f.push({animation:x})}let m=!!f.length;return s&&(l.initial===!1||l.initial===l.animate)&&!t.manuallyAnimateOnMount&&(m=!1),s=!1,i=!1,m?e(f):Promise.resolve()}function c(h,l){var f;if(n[h].isActive===l)return Promise.resolve();(f=t.variantChildren)==null||f.forEach(p=>{var y;return(y=p.animationState)==null?void 0:y.setActive(h,l)}),n[h].isActive=l;const u=o(h);for(const p in n)n[p].protectedKeys={};return u}return{animateChanges:o,setActive:c,setAnimateFunction:a,getState:()=>n,reset:()=>{n=js(),i=!0}}}function Oh(t,e){return typeof e=="string"?e!==t:Array.isArray(e)?!Ja(e,t):!1}function kt(t=!1){return{isActive:t,protectedKeys:{},needsAnimating:{},prevResolvedValues:{}}}function js(){return{animate:kt(!0),whileInView:kt(),whileHover:kt(),whileTap:kt(),whileDrag:kt(),whileFocus:kt(),exit:kt()}}function kn(t,e){t.min=e.min,t.max=e.max}function X(t,e){kn(t.x,e.x),kn(t.y,e.y)}function zs(t,e){t.translate=e.translate,t.scale=e.scale,t.originPoint=e.originPoint,t.origin=e.origin}const Qa=1e-4,Hh=1-Qa,qh=1+Qa,tr=.01,Nh=0-tr,Uh=0+tr;function N(t){return t.max-t.min}function $h(t,e,n){return Math.abs(t-e)<=n}function Fs(t,e,n,s=.5){t.origin=s,t.originPoint=V(e.min,e.max,t.origin),t.scale=N(n)/N(e),t.translate=V(n.min,n.max,t.origin)-t.originPoint,(t.scale>=Hh&&t.scale<=qh||isNaN(t.scale))&&(t.scale=1),(t.translate>=Nh&&t.translate<=Uh||isNaN(t.translate))&&(t.translate=0)}function Ot(t,e,n,s){Fs(t.x,e.x,n.x,s?s.originX:void 0),Fs(t.y,e.y,n.y,s?s.originY:void 0)}function Is(t,e,n,s=0){const i=s?V(n.min,n.max,s):n.min;t.min=i+e.min,t.max=t.min+N(e)}function _h(t,e,n,s){Is(t.x,e.x,n.x,s==null?void 0:s.x),Is(t.y,e.y,n.y,s==null?void 0:s.y)}function Bs(t,e,n,s=0){const i=s?V(n.min,n.max,s):n.min;t.min=e.min-i,t.max=t.min+N(e)}function Me(t,e,n,s){Bs(t.x,e.x,n.x,s==null?void 0:s.x),Bs(t.y,e.y,n.y,s==null?void 0:s.y)}function Os(t,e,n,s,i){return t-=e,t=xe(t,1/n,s),i!==void 0&&(t=xe(t,1/i,s)),t}function Wh(t,e=0,n=1,s=.5,i,r=t,a=t){if(st.test(e)&&(e=parseFloat(e),e=V(a.min,a.max,e/100)-a.min),typeof e!="number")return;let o=V(r.min,r.max,s);t===r&&(o-=e),t.min=Os(t.min,e,n,o,i),t.max=Os(t.max,e,n,o,i)}function Hs(t,e,[n,s,i],r,a){Wh(t,e[n],e[s],e[i],e.scale,r,a)}const Kh=["x","scaleX","originX"],Gh=["y","scaleY","originY"];function qs(t,e,n,s){Hs(t.x,e,Kh,n?n.x:void 0,s?s.x:void 0),Hs(t.y,e,Gh,n?n.y:void 0,s?s.y:void 0)}function Ns(t){return t.translate===0&&t.scale===1}function er(t){return Ns(t.x)&&Ns(t.y)}function Us(t,e){return t.min===e.min&&t.max===e.max}function Xh(t,e){return Us(t.x,e.x)&&Us(t.y,e.y)}function $s(t,e){return Math.round(t.min)===Math.round(e.min)&&Math.round(t.max)===Math.round(e.max)}function nr(t,e){return $s(t.x,e.x)&&$s(t.y,e.y)}function _s(t){return N(t.x)/N(t.y)}function Ws(t,e){return t.translate===e.translate&&t.scale===e.scale&&t.originPoint===e.originPoint}function tt(t){return[t("x"),t("y")]}function Zh(t,e,n){let s="";const i=t.x.translate/e.x,r=t.y.translate/e.y,a=(n==null?void 0:n.z)||0;if((i||r||a)&&(s=`translate3d(${i}px, ${r}px, ${a}px) `),(e.x!==1||e.y!==1)&&(s+=`scale(${1/e.x}, ${1/e.y}) `),n){const{transformPerspective:h,rotate:l,rotateX:u,rotateY:f,skewX:p,skewY:y}=n;h&&(s=`perspective(${h}px) ${s}`),l&&(s+=`rotate(${l}deg) `),u&&(s+=`rotateX(${u}deg) `),f&&(s+=`rotateY(${f}deg) `),p&&(s+=`skewX(${p}deg) `),y&&(s+=`skewY(${y}deg) `)}const o=t.x.scale*e.x,c=t.y.scale*e.y;return(o!==1||c!==1)&&(s+=`scale(${o}, ${c})`),s||"none"}const sr=["borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius"],Yh=sr.length,Ks=t=>typeof t=="string"?parseFloat(t):t,Gs=t=>typeof t=="number"||b.test(t);function Jh(t,e,n,s,i,r){i?(t.opacity=V(0,n.opacity??1,Qh(s)),t.opacityExit=V(e.opacity??1,0,tu(s))):r&&(t.opacity=V(e.opacity??1,n.opacity??1,s));for(let a=0;a<Yh;a++){const o=sr[a];let c=Xs(e,o),h=Xs(n,o);if(c===void 0&&h===void 0)continue;c||(c=0),h||(h=0),c===0||h===0||Gs(c)===Gs(h)?(t[o]=Math.max(V(Ks(c),Ks(h),s),0),(st.test(h)||st.test(c))&&(t[o]+="%")):t[o]=h}(e.rotate||n.rotate)&&(t.rotate=V(e.rotate||0,n.rotate||0,s))}function Xs(t,e){return t[e]!==void 0?t[e]:t.borderRadius}const Qh=ir(0,.5,Gi),tu=ir(.5,.95,G);function ir(t,e,n){return s=>s<t?0:s>e?1:n(qt(t,e,s))}function eu(t,e,n){const s=O(t)?t:Dt(t);return s.start(Hn("",s,e,n)),s.animation}function $t(t,e,n,s={passive:!0}){return t.addEventListener(e,n,s),()=>t.removeEventListener(e,n)}const nu=(t,e)=>t.depth-e.depth;class su{constructor(){this.children=[],this.isDirty=!1}add(e){Pn(this.children,e),this.isDirty=!0}remove(e){pe(this.children,e),this.isDirty=!0}forEach(e){this.isDirty&&this.children.sort(nu),this.isDirty=!1,this.children.forEach(e)}}function iu(t,e){const n=q.now(),s=({timestamp:i})=>{const r=i-n;r>=e&&(ft(s),t(r-e))};return A.setup(s,!0),()=>ft(s)}function ue(t){return O(t)?t.get():t}class au{constructor(){this.members=[]}add(e){Pn(this.members,e);for(let n=this.members.length-1;n>=0;n--){const s=this.members[n];if(s===e||s===this.lead||s===this.prevLead)continue;const i=s.instance;(!i||i.isConnected===!1)&&!s.snapshot&&(pe(this.members,s),s.unmount())}e.scheduleRender()}remove(e){if(pe(this.members,e),e===this.prevLead&&(this.prevLead=void 0),e===this.lead){const n=this.members[this.members.length-1];n&&this.promote(n)}}relegate(e){var n;for(let s=this.members.indexOf(e)-1;s>=0;s--){const i=this.members[s];if(i.isPresent!==!1&&((n=i.instance)==null?void 0:n.isConnected)!==!1)return this.promote(i),!0}return!1}promote(e,n){var i;const s=this.lead;if(e!==s&&(this.prevLead=s,this.lead=e,e.show(),s)){s.updateSnapshot(),e.scheduleRender();const{layoutDependency:r}=s.options,{layoutDependency:a}=e.options;(r===void 0||r!==a)&&(e.resumeFrom=s,n&&(s.preserveOpacity=!0),s.snapshot&&(e.snapshot=s.snapshot,e.snapshot.latestValues=s.animationValues||s.latestValues),(i=e.root)!=null&&i.isUpdating&&(e.isLayoutDirty=!0)),e.options.crossfade===!1&&s.hide()}}exitAnimationComplete(){this.members.forEach(e=>{var n,s,i,r,a;(s=(n=e.options).onExitComplete)==null||s.call(n),(a=(i=e.resumingFrom)==null?void 0:(r=i.options).onExitComplete)==null||a.call(r)})}scheduleRender(){this.members.forEach(e=>e.instance&&e.scheduleRender(!1))}removeLeadSnapshot(){var e;(e=this.lead)!=null&&e.snapshot&&(this.lead.snapshot=void 0)}}const de={hasAnimatedSinceResize:!0,hasEverUpdated:!1},Oe=["","X","Y","Z"],ru=1e3;let ou=0;function He(t,e,n,s){const{latestValues:i}=e;i[t]&&(n[t]=i[t],e.setStaticValue(t,0),s&&(s[t]=0))}function ar(t){if(t.hasCheckedOptimisedAppear=!0,t.root===t)return;const{visualElement:e}=t.options;if(!e)return;const n=Sa(e);if(window.MotionHasOptimisedAnimation(n,"transform")){const{layout:i,layoutId:r}=t.options;window.MotionCancelOptimisedAnimation(n,"transform",A,!(i||r))}const{parent:s}=t;s&&!s.hasCheckedOptimisedAppear&&ar(s)}function rr({attachResizeListener:t,defaultParent:e,measureScroll:n,checkIsScrollRoot:s,resetTransform:i}){return class{constructor(a={},o=e==null?void 0:e()){this.id=ou++,this.animationId=0,this.animationCommitId=0,this.children=new Set,this.options={},this.isTreeAnimating=!1,this.isAnimationBlocked=!1,this.isLayoutDirty=!1,this.isProjectionDirty=!1,this.isSharedProjectionDirty=!1,this.isTransformDirty=!1,this.updateManuallyBlocked=!1,this.updateBlockedByResize=!1,this.isUpdating=!1,this.isSVG=!1,this.needsReset=!1,this.shouldResetTransform=!1,this.hasCheckedOptimisedAppear=!1,this.treeScale={x:1,y:1},this.eventHandlers=new Map,this.hasTreeAnimated=!1,this.layoutVersion=0,this.updateScheduled=!1,this.scheduleUpdate=()=>this.update(),this.projectionUpdateScheduled=!1,this.checkUpdateFailed=()=>{this.isUpdating&&(this.isUpdating=!1,this.clearAllSnapshots())},this.updateProjection=()=>{this.projectionUpdateScheduled=!1,this.nodes.forEach(hu),this.nodes.forEach(mu),this.nodes.forEach(gu),this.nodes.forEach(uu)},this.resolvedRelativeTargetAt=0,this.linkedParentVersion=0,this.hasProjected=!1,this.isVisible=!0,this.animationProgress=0,this.sharedNodes=new Map,this.latestValues=a,this.root=o?o.root||o:this,this.path=o?[...o.path,o]:[],this.parent=o,this.depth=o?o.depth+1:0;for(let c=0;c<this.path.length;c++)this.path[c].shouldResetTransform=!0;this.root===this&&(this.nodes=new su)}addEventListener(a,o){return this.eventHandlers.has(a)||this.eventHandlers.set(a,new Vn),this.eventHandlers.get(a).add(o)}notifyListeners(a,...o){const c=this.eventHandlers.get(a);c&&c.notify(...o)}hasListeners(a){return this.eventHandlers.has(a)}mount(a){if(this.instance)return;this.isSVG=Wn(a)&&!lh(a),this.instance=a;const{layoutId:o,layout:c,visualElement:h}=this.options;if(h&&!h.current&&h.mount(a),this.root.nodes.add(this),this.parent&&this.parent.children.add(this),this.root.hasTreeAnimated&&(c||o)&&(this.isLayoutDirty=!0),t){let l,u=0;const f=()=>this.root.updateBlockedByResize=!1;A.read(()=>{u=window.innerWidth}),t(a,()=>{const p=window.innerWidth;p!==u&&(u=p,this.root.updateBlockedByResize=!0,l&&l(),l=iu(f,250),de.hasAnimatedSinceResize&&(de.hasAnimatedSinceResize=!1,this.nodes.forEach(Js)))})}o&&this.root.registerSharedNode(o,this),this.options.animate!==!1&&h&&(o||c)&&this.addEventListener("didUpdate",({delta:l,hasLayoutChanged:u,hasRelativeLayoutChanged:f,layout:p})=>{if(this.isTreeAnimationBlocked()){this.target=void 0,this.relativeTarget=void 0;return}const y=this.options.transition||h.getDefaultTransition()||bu,{onLayoutAnimationStart:k,onLayoutAnimationComplete:m}=h.getProps(),x=!this.targetLayout||!nr(this.targetLayout,p),M=!u&&f;if(this.options.layoutRoot||this.resumeFrom||M||u&&(x||!this.currentAnimation)){this.resumeFrom&&(this.resumingFrom=this.resumeFrom,this.resumingFrom.resumingFrom=void 0);const v={...On(y,"layout"),onPlay:k,onComplete:m};(h.shouldReduceMotion||this.options.layoutRoot)&&(v.delay=0,v.type=!1),this.startAnimation(v),this.setAnimationOrigin(l,M)}else u||Js(this),this.isLead()&&this.options.onExitComplete&&this.options.onExitComplete();this.targetLayout=p})}unmount(){this.options.layoutId&&this.willUpdate(),this.root.nodes.remove(this);const a=this.getStack();a&&a.remove(this),this.parent&&this.parent.children.delete(this),this.instance=void 0,this.eventHandlers.clear(),ft(this.updateProjection)}blockUpdate(){this.updateManuallyBlocked=!0}unblockUpdate(){this.updateManuallyBlocked=!1}isUpdateBlocked(){return this.updateManuallyBlocked||this.updateBlockedByResize}isTreeAnimationBlocked(){return this.isAnimationBlocked||this.parent&&this.parent.isTreeAnimationBlocked()||!1}startUpdate(){this.isUpdateBlocked()||(this.isUpdating=!0,this.nodes&&this.nodes.forEach(ku),this.animationId++)}getTransformTemplate(){const{visualElement:a}=this.options;return a&&a.getProps().transformTemplate}willUpdate(a=!0){if(this.root.hasTreeAnimated=!0,this.root.isUpdateBlocked()){this.options.onExitComplete&&this.options.onExitComplete();return}if(window.MotionCancelOptimisedAnimation&&!this.hasCheckedOptimisedAppear&&ar(this),!this.root.isUpdating&&this.root.startUpdate(),this.isLayoutDirty)return;this.isLayoutDirty=!0;for(let l=0;l<this.path.length;l++){const u=this.path[l];u.shouldResetTransform=!0,(typeof u.latestValues.x=="string"||typeof u.latestValues.y=="string")&&(u.isLayoutDirty=!0),u.updateScroll("snapshot"),u.options.layoutRoot&&u.willUpdate(!1)}const{layoutId:o,layout:c}=this.options;if(o===void 0&&!c)return;const h=this.getTransformTemplate();this.prevTransformTemplateValue=h?h(this.latestValues,""):void 0,this.updateSnapshot(),a&&this.notifyListeners("willUpdate")}update(){if(this.updateScheduled=!1,this.isUpdateBlocked()){const c=this.updateBlockedByResize;this.unblockUpdate(),this.updateBlockedByResize=!1,this.clearAllSnapshots(),c&&this.nodes.forEach(fu),this.nodes.forEach(Zs);return}if(this.animationId<=this.animationCommitId){this.nodes.forEach(Ys);return}this.animationCommitId=this.animationId,this.isUpdating?(this.isUpdating=!1,this.nodes.forEach(pu),this.nodes.forEach(yu),this.nodes.forEach(cu),this.nodes.forEach(lu)):this.nodes.forEach(Ys),this.clearAllSnapshots();const o=q.now();B.delta=it(0,1e3/60,o-B.timestamp),B.timestamp=o,B.isProcessing=!0,Ee.update.process(B),Ee.preRender.process(B),Ee.render.process(B),B.isProcessing=!1}didUpdate(){this.updateScheduled||(this.updateScheduled=!0,$n.read(this.scheduleUpdate))}clearAllSnapshots(){this.nodes.forEach(du),this.sharedNodes.forEach(vu)}scheduleUpdateProjection(){this.projectionUpdateScheduled||(this.projectionUpdateScheduled=!0,A.preRender(this.updateProjection,!1,!0))}scheduleCheckAfterUnmount(){A.postRender(()=>{this.isLayoutDirty?this.root.didUpdate():this.root.checkUpdateFailed()})}updateSnapshot(){this.snapshot||!this.instance||(this.snapshot=this.measure(),this.snapshot&&!N(this.snapshot.measuredBox.x)&&!N(this.snapshot.measuredBox.y)&&(this.snapshot=void 0))}updateLayout(){if(!this.instance||(this.updateScroll(),!(this.options.alwaysMeasureLayout&&this.isLead())&&!this.isLayoutDirty))return;if(this.resumeFrom&&!this.resumeFrom.instance)for(let c=0;c<this.path.length;c++)this.path[c].updateScroll();const a=this.layout;this.layout=this.measure(!1),this.layoutVersion++,this.layoutCorrected||(this.layoutCorrected=j()),this.isLayoutDirty=!1,this.projectionDelta=void 0,this.notifyListeners("measure",this.layout.layoutBox);const{visualElement:o}=this.options;o&&o.notify("LayoutMeasure",this.layout.layoutBox,a?a.layoutBox:void 0)}updateScroll(a="measure"){let o=!!(this.options.layoutScroll&&this.instance);if(this.scroll&&this.scroll.animationId===this.root.animationId&&this.scroll.phase===a&&(o=!1),o&&this.instance){const c=s(this.instance);this.scroll={animationId:this.root.animationId,phase:a,isRoot:c,offset:n(this.instance),wasRoot:this.scroll?this.scroll.isRoot:c}}}resetTransform(){if(!i)return;const a=this.isLayoutDirty||this.shouldResetTransform||this.options.alwaysMeasureLayout,o=this.projectionDelta&&!er(this.projectionDelta),c=this.getTransformTemplate(),h=c?c(this.latestValues,""):void 0,l=h!==this.prevTransformTemplateValue;a&&this.instance&&(o||vt(this.latestValues)||l)&&(i(this.instance,h),this.shouldResetTransform=!1,this.scheduleRender())}measure(a=!0){const o=this.measurePageBox();let c=this.removeElementScroll(o);return a&&(c=this.removeTransform(c)),wu(c),{animationId:this.root.animationId,measuredBox:o,layoutBox:c,latestValues:{},source:this.id}}measurePageBox(){var h;const{visualElement:a}=this.options;if(!a)return j();const o=a.measureViewportBox();if(!(((h=this.scroll)==null?void 0:h.wasRoot)||this.path.some(Tu))){const{scroll:l}=this.root;l&&(et(o.x,l.offset.x),et(o.y,l.offset.y))}return o}removeElementScroll(a){var c;const o=j();if(X(o,a),(c=this.scroll)!=null&&c.wasRoot)return o;for(let h=0;h<this.path.length;h++){const l=this.path[h],{scroll:u,options:f}=l;l!==this.root&&u&&f.layoutScroll&&(u.wasRoot&&X(o,a),et(o.x,u.offset.x),et(o.y,u.offset.y))}return o}applyTransform(a,o=!1,c){var l,u;const h=c||j();X(h,a);for(let f=0;f<this.path.length;f++){const p=this.path[f];!o&&p.options.layoutScroll&&p.scroll&&p!==p.root&&(et(h.x,-p.scroll.offset.x),et(h.y,-p.scroll.offset.y)),vt(p.latestValues)&&he(h,p.latestValues,(l=p.layout)==null?void 0:l.layoutBox)}return vt(this.latestValues)&&he(h,this.latestValues,(u=this.layout)==null?void 0:u.layoutBox),h}removeTransform(a){var c;const o=j();X(o,a);for(let h=0;h<this.path.length;h++){const l=this.path[h];if(!vt(l.latestValues))continue;let u;l.instance&&(yn(l.latestValues)&&l.updateSnapshot(),u=j(),X(u,l.measurePageBox())),qs(o,l.latestValues,(c=l.snapshot)==null?void 0:c.layoutBox,u)}return vt(this.latestValues)&&qs(o,this.latestValues),o}setTargetDelta(a){this.targetDelta=a,this.root.scheduleUpdateProjection(),this.isProjectionDirty=!0}setOptions(a){this.options={...this.options,...a,crossfade:a.crossfade!==void 0?a.crossfade:!0}}clearMeasurements(){this.scroll=void 0,this.layout=void 0,this.snapshot=void 0,this.prevTransformTemplateValue=void 0,this.targetDelta=void 0,this.target=void 0,this.isLayoutDirty=!1}forceRelativeParentToResolveTarget(){this.relativeParent&&this.relativeParent.resolvedRelativeTargetAt!==B.timestamp&&this.relativeParent.resolveTargetDelta(!0)}resolveTargetDelta(a=!1){var p;const o=this.getLead();this.isProjectionDirty||(this.isProjectionDirty=o.isProjectionDirty),this.isTransformDirty||(this.isTransformDirty=o.isTransformDirty),this.isSharedProjectionDirty||(this.isSharedProjectionDirty=o.isSharedProjectionDirty);const c=!!this.resumingFrom||this!==o;if(!(a||c&&this.isSharedProjectionDirty||this.isProjectionDirty||(p=this.parent)!=null&&p.isProjectionDirty||this.attemptToResolveRelativeTarget||this.root.updateBlockedByResize))return;const{layout:l,layoutId:u}=this.options;if(!this.layout||!(l||u))return;this.resolvedRelativeTargetAt=B.timestamp;const f=this.getClosestProjectingParent();f&&this.linkedParentVersion!==f.layoutVersion&&!f.options.layoutRoot&&this.removeRelativeTarget(),!this.targetDelta&&!this.relativeTarget&&(this.options.layoutAnchor!==!1&&f&&f.layout?this.createRelativeTarget(f,this.layout.layoutBox,f.layout.layoutBox):this.removeRelativeTarget()),!(!this.relativeTarget&&!this.targetDelta)&&(this.target||(this.target=j(),this.targetWithTransforms=j()),this.relativeTarget&&this.relativeTargetOrigin&&this.relativeParent&&this.relativeParent.target?(this.forceRelativeParentToResolveTarget(),_h(this.target,this.relativeTarget,this.relativeParent.target,this.options.layoutAnchor||void 0)):this.targetDelta?(this.resumingFrom?this.applyTransform(this.layout.layoutBox,!1,this.target):X(this.target,this.layout.layoutBox),Ua(this.target,this.targetDelta)):X(this.target,this.layout.layoutBox),this.attemptToResolveRelativeTarget&&(this.attemptToResolveRelativeTarget=!1,this.options.layoutAnchor!==!1&&f&&!!f.resumingFrom==!!this.resumingFrom&&!f.options.layoutScroll&&f.target&&this.animationProgress!==1?this.createRelativeTarget(f,this.target,f.target):this.relativeParent=this.relativeTarget=void 0))}getClosestProjectingParent(){if(!(!this.parent||yn(this.parent.latestValues)||Na(this.parent.latestValues)))return this.parent.isProjecting()?this.parent:this.parent.getClosestProjectingParent()}isProjecting(){return!!((this.relativeTarget||this.targetDelta||this.options.layoutRoot)&&this.layout)}createRelativeTarget(a,o,c){this.relativeParent=a,this.linkedParentVersion=a.layoutVersion,this.forceRelativeParentToResolveTarget(),this.relativeTarget=j(),this.relativeTargetOrigin=j(),Me(this.relativeTargetOrigin,o,c,this.options.layoutAnchor||void 0),X(this.relativeTarget,this.relativeTargetOrigin)}removeRelativeTarget(){this.relativeParent=this.relativeTarget=void 0}calcProjection(){var y;const a=this.getLead(),o=!!this.resumingFrom||this!==a;let c=!0;if((this.isProjectionDirty||(y=this.parent)!=null&&y.isProjectionDirty)&&(c=!1),o&&(this.isSharedProjectionDirty||this.isTransformDirty)&&(c=!1),this.resolvedRelativeTargetAt===B.timestamp&&(c=!1),c)return;const{layout:h,layoutId:l}=this.options;if(this.isTreeAnimating=!!(this.parent&&this.parent.isTreeAnimating||this.currentAnimation||this.pendingAnimation),this.isTreeAnimating||(this.targetDelta=this.relativeTarget=void 0),!this.layout||!(h||l))return;X(this.layoutCorrected,this.layout.layoutBox);const u=this.treeScale.x,f=this.treeScale.y;xh(this.layoutCorrected,this.treeScale,this.path,o),a.layout&&!a.target&&(this.treeScale.x!==1||this.treeScale.y!==1)&&(a.target=a.layout.layoutBox,a.targetWithTransforms=j());const{target:p}=a;if(!p){this.prevProjectionDelta&&(this.createProjectionDeltas(),this.scheduleRender());return}!this.projectionDelta||!this.prevProjectionDelta?this.createProjectionDeltas():(zs(this.prevProjectionDelta.x,this.projectionDelta.x),zs(this.prevProjectionDelta.y,this.projectionDelta.y)),Ot(this.projectionDelta,this.layoutCorrected,p,this.latestValues),(this.treeScale.x!==u||this.treeScale.y!==f||!Ws(this.projectionDelta.x,this.prevProjectionDelta.x)||!Ws(this.projectionDelta.y,this.prevProjectionDelta.y))&&(this.hasProjected=!0,this.scheduleRender(),this.notifyListeners("projectionUpdate",p))}hide(){this.isVisible=!1}show(){this.isVisible=!0}scheduleRender(a=!0){var o;if((o=this.options.visualElement)==null||o.scheduleRender(),a){const c=this.getStack();c&&c.scheduleRender()}this.resumingFrom&&!this.resumingFrom.instance&&(this.resumingFrom=void 0)}createProjectionDeltas(){this.prevProjectionDelta=At(),this.projectionDelta=At(),this.projectionDeltaWithTransform=At()}setAnimationOrigin(a,o=!1){const c=this.snapshot,h=c?c.latestValues:{},l={...this.latestValues},u=At();(!this.relativeParent||!this.relativeParent.options.layoutRoot)&&(this.relativeTarget=this.relativeTargetOrigin=void 0),this.attemptToResolveRelativeTarget=!o;const f=j(),p=c?c.source:void 0,y=this.layout?this.layout.source:void 0,k=p!==y,m=this.getStack(),x=!m||m.members.length<=1,M=!!(k&&!x&&this.options.crossfade===!0&&!this.path.some(Mu));this.animationProgress=0;let v;this.mixTargetDelta=w=>{const T=w/1e3;Qs(u.x,a.x,T),Qs(u.y,a.y,T),this.setTargetDelta(u),this.relativeTarget&&this.relativeTargetOrigin&&this.layout&&this.relativeParent&&this.relativeParent.layout&&(Me(f,this.layout.layoutBox,this.relativeParent.layout.layoutBox,this.options.layoutAnchor||void 0),xu(this.relativeTarget,this.relativeTargetOrigin,f,T),v&&Xh(this.relativeTarget,v)&&(this.isProjectionDirty=!1),v||(v=j()),X(v,this.relativeTarget)),k&&(this.animationValues=l,Jh(l,h,this.latestValues,T,M,x)),this.root.scheduleUpdateProjection(),this.scheduleRender(),this.animationProgress=T},this.mixTargetDelta(this.options.layoutRoot?1e3:0)}startAnimation(a){var o,c,h;this.notifyListeners("animationStart"),(o=this.currentAnimation)==null||o.stop(),(h=(c=this.resumingFrom)==null?void 0:c.currentAnimation)==null||h.stop(),this.pendingAnimation&&(ft(this.pendingAnimation),this.pendingAnimation=void 0),this.pendingAnimation=A.update(()=>{de.hasAnimatedSinceResize=!0,this.motionValue||(this.motionValue=Dt(0)),this.motionValue.jump(0,!1),this.currentAnimation=eu(this.motionValue,[0,1e3],{...a,velocity:0,isSync:!0,onUpdate:l=>{this.mixTargetDelta(l),a.onUpdate&&a.onUpdate(l)},onStop:()=>{},onComplete:()=>{a.onComplete&&a.onComplete(),this.completeAnimation()}}),this.resumingFrom&&(this.resumingFrom.currentAnimation=this.currentAnimation),this.pendingAnimation=void 0})}completeAnimation(){this.resumingFrom&&(this.resumingFrom.currentAnimation=void 0,this.resumingFrom.preserveOpacity=void 0);const a=this.getStack();a&&a.exitAnimationComplete(),this.resumingFrom=this.currentAnimation=this.animationValues=void 0,this.notifyListeners("animationComplete")}finishAnimation(){this.currentAnimation&&(this.mixTargetDelta&&this.mixTargetDelta(ru),this.currentAnimation.stop()),this.completeAnimation()}applyTransformsToTarget(){const a=this.getLead();let{targetWithTransforms:o,target:c,layout:h,latestValues:l}=a;if(!(!o||!c||!h)){if(this!==a&&this.layout&&h&&or(this.options.animationType,this.layout.layoutBox,h.layoutBox)){c=this.target||j();const u=N(this.layout.layoutBox.x);c.x.min=a.target.x.min,c.x.max=c.x.min+u;const f=N(this.layout.layoutBox.y);c.y.min=a.target.y.min,c.y.max=c.y.min+f}X(o,c),he(o,l),Ot(this.projectionDeltaWithTransform,this.layoutCorrected,o,l)}}registerSharedNode(a,o){this.sharedNodes.has(a)||this.sharedNodes.set(a,new au),this.sharedNodes.get(a).add(o);const h=o.options.initialPromotionConfig;o.promote({transition:h?h.transition:void 0,preserveFollowOpacity:h&&h.shouldPreserveFollowOpacity?h.shouldPreserveFollowOpacity(o):void 0})}isLead(){const a=this.getStack();return a?a.lead===this:!0}getLead(){var o;const{layoutId:a}=this.options;return a?((o=this.getStack())==null?void 0:o.lead)||this:this}getPrevLead(){var o;const{layoutId:a}=this.options;return a?(o=this.getStack())==null?void 0:o.prevLead:void 0}getStack(){const{layoutId:a}=this.options;if(a)return this.root.sharedNodes.get(a)}promote({needsReset:a,transition:o,preserveFollowOpacity:c}={}){const h=this.getStack();h&&h.promote(this,c),a&&(this.projectionDelta=void 0,this.needsReset=!0),o&&this.setOptions({transition:o})}relegate(){const a=this.getStack();return a?a.relegate(this):!1}resetSkewAndRotation(){const{visualElement:a}=this.options;if(!a)return;let o=!1;const{latestValues:c}=a;if((c.z||c.rotate||c.rotateX||c.rotateY||c.rotateZ||c.skewX||c.skewY)&&(o=!0),!o)return;const h={};c.z&&He("z",a,h,this.animationValues);for(let l=0;l<Oe.length;l++)He(`rotate${Oe[l]}`,a,h,this.animationValues),He(`skew${Oe[l]}`,a,h,this.animationValues);a.render();for(const l in h)a.setStaticValue(l,h[l]),this.animationValues&&(this.animationValues[l]=h[l]);a.scheduleRender()}applyProjectionStyles(a,o){if(!this.instance||this.isSVG)return;if(!this.isVisible){a.visibility="hidden";return}const c=this.getTransformTemplate();if(this.needsReset){this.needsReset=!1,a.visibility="",a.opacity="",a.pointerEvents=ue(o==null?void 0:o.pointerEvents)||"",a.transform=c?c(this.latestValues,""):"none";return}const h=this.getLead();if(!this.projectionDelta||!this.layout||!h.target){this.options.layoutId&&(a.opacity=this.latestValues.opacity!==void 0?this.latestValues.opacity:1,a.pointerEvents=ue(o==null?void 0:o.pointerEvents)||""),this.hasProjected&&!vt(this.latestValues)&&(a.transform=c?c({},""):"none",this.hasProjected=!1);return}a.visibility="";const l=h.animationValues||h.latestValues;this.applyTransformsToTarget();let u=Zh(this.projectionDeltaWithTransform,this.treeScale,l);c&&(u=c(l,u)),a.transform=u;const{x:f,y:p}=this.projectionDelta;a.transformOrigin=`${f.origin*100}% ${p.origin*100}% 0`,h.animationValues?a.opacity=h===this?l.opacity??this.latestValues.opacity??1:this.preserveOpacity?this.latestValues.opacity:l.opacityExit:a.opacity=h===this?l.opacity!==void 0?l.opacity:"":l.opacityExit!==void 0?l.opacityExit:0;for(const y in gn){if(l[y]===void 0)continue;const{correct:k,applyTo:m,isCSSVariable:x}=gn[y],M=u==="none"?l[y]:k(l[y],h);if(m){const v=m.length;for(let w=0;w<v;w++)a[m[w]]=M}else x?this.options.visualElement.renderState.vars[y]=M:a[y]=M}this.options.layoutId&&(a.pointerEvents=h===this?ue(o==null?void 0:o.pointerEvents)||"":"none")}clearSnapshot(){this.resumeFrom=this.snapshot=void 0}resetTree(){this.root.nodes.forEach(a=>{var o;return(o=a.currentAnimation)==null?void 0:o.stop()}),this.root.nodes.forEach(Zs),this.root.sharedNodes.clear()}}}function cu(t){t.updateLayout()}function lu(t){var n;const e=((n=t.resumeFrom)==null?void 0:n.snapshot)||t.snapshot;if(t.isLead()&&t.layout&&e&&t.hasListeners("didUpdate")){const{layoutBox:s,measuredBox:i}=t.layout,{animationType:r}=t.options,a=e.source!==t.layout.source;if(r==="size")tt(u=>{const f=a?e.measuredBox[u]:e.layoutBox[u],p=N(f);f.min=s[u].min,f.max=f.min+p});else if(r==="x"||r==="y"){const u=r==="x"?"y":"x";kn(a?e.measuredBox[u]:e.layoutBox[u],s[u])}else or(r,e.layoutBox,s)&&tt(u=>{const f=a?e.measuredBox[u]:e.layoutBox[u],p=N(s[u]);f.max=f.min+p,t.relativeTarget&&!t.currentAnimation&&(t.isProjectionDirty=!0,t.relativeTarget[u].max=t.relativeTarget[u].min+p)});const o=At();Ot(o,s,e.layoutBox);const c=At();a?Ot(c,t.applyTransform(i,!0),e.measuredBox):Ot(c,s,e.layoutBox);const h=!er(o);let l=!1;if(!t.resumeFrom){const u=t.getClosestProjectingParent();if(u&&!u.resumeFrom){const{snapshot:f,layout:p}=u;if(f&&p){const y=t.options.layoutAnchor||void 0,k=j();Me(k,e.layoutBox,f.layoutBox,y);const m=j();Me(m,s,p.layoutBox,y),nr(k,m)||(l=!0),u.options.layoutRoot&&(t.relativeTarget=m,t.relativeTargetOrigin=k,t.relativeParent=u)}}}t.notifyListeners("didUpdate",{layout:s,snapshot:e,delta:c,layoutDelta:o,hasLayoutChanged:h,hasRelativeLayoutChanged:l})}else if(t.isLead()){const{onExitComplete:s}=t.options;s&&s()}t.options.transition=void 0}function hu(t){t.parent&&(t.isProjecting()||(t.isProjectionDirty=t.parent.isProjectionDirty),t.isSharedProjectionDirty||(t.isSharedProjectionDirty=!!(t.isProjectionDirty||t.parent.isProjectionDirty||t.parent.isSharedProjectionDirty)),t.isTransformDirty||(t.isTransformDirty=t.parent.isTransformDirty))}function uu(t){t.isProjectionDirty=t.isSharedProjectionDirty=t.isTransformDirty=!1}function du(t){t.clearSnapshot()}function Zs(t){t.clearMeasurements()}function fu(t){t.isLayoutDirty=!0,t.updateLayout()}function Ys(t){t.isLayoutDirty=!1}function pu(t){t.isAnimationBlocked&&t.layout&&!t.isLayoutDirty&&(t.snapshot=t.layout,t.isLayoutDirty=!0)}function yu(t){const{visualElement:e}=t.options;e&&e.getProps().onBeforeLayoutMeasure&&e.notify("BeforeLayoutMeasure"),t.resetTransform()}function Js(t){t.finishAnimation(),t.targetDelta=t.relativeTarget=t.target=void 0,t.isProjectionDirty=!0}function mu(t){t.resolveTargetDelta()}function gu(t){t.calcProjection()}function ku(t){t.resetSkewAndRotation()}function vu(t){t.removeLeadSnapshot()}function Qs(t,e,n){t.translate=V(e.translate,0,n),t.scale=V(e.scale,1,n),t.origin=e.origin,t.originPoint=e.originPoint}function ti(t,e,n,s){t.min=V(e.min,n.min,s),t.max=V(e.max,n.max,s)}function xu(t,e,n,s){ti(t.x,e.x,n.x,s),ti(t.y,e.y,n.y,s)}function Mu(t){return t.animationValues&&t.animationValues.opacityExit!==void 0}const bu={duration:.45,ease:[.4,0,.1,1]},ei=t=>typeof navigator<"u"&&navigator.userAgent&&navigator.userAgent.toLowerCase().includes(t),ni=ei("applewebkit/")&&!ei("chrome/")?Math.round:G;function si(t){t.min=ni(t.min),t.max=ni(t.max)}function wu(t){si(t.x),si(t.y)}function or(t,e,n){return t==="position"||t==="preserve-aspect"&&!$h(_s(e),_s(n),.2)}function Tu(t){var e;return t!==t.root&&((e=t.scroll)==null?void 0:e.wasRoot)}const Su=rr({attachResizeListener:(t,e)=>$t(t,"resize",e),measureScroll:()=>{var t,e;return{x:document.documentElement.scrollLeft||((t=document.body)==null?void 0:t.scrollLeft)||0,y:document.documentElement.scrollTop||((e=document.body)==null?void 0:e.scrollTop)||0}},checkIsScrollRoot:()=>!0}),qe={current:void 0},cr=rr({measureScroll:t=>({x:t.scrollLeft,y:t.scrollTop}),defaultParent:()=>{if(!qe.current){const t=new Su({});t.mount(window),t.setOptions({layoutScroll:!0}),qe.current=t}return qe.current},resetTransform:(t,e)=>{t.style.transform=e!==void 0?e:"none"},checkIsScrollRoot:t=>window.getComputedStyle(t).position==="fixed"}),lr=g.createContext({transformPagePoint:t=>t,isStatic:!1,reducedMotion:"never"});function Cu(t=!0){const e=g.useContext(Cn);if(e===null)return[!0,null];const{isPresent:n,onExitComplete:s,register:i}=e,r=g.useId();g.useEffect(()=>{if(t)return i(r)},[t]);const a=g.useCallback(()=>t&&s&&s(r),[r,s,t]);return!n&&s?[!1,a]:[!0]}const hr=g.createContext({strict:!1}),ii={animation:["animate","variants","whileHover","whileTap","exit","whileInView","whileFocus","whileDrag"],exit:["exit"],drag:["drag","dragControls"],focus:["whileFocus"],hover:["whileHover","onHoverStart","onHoverEnd"],tap:["whileTap","onTap","onTapStart","onTapCancel"],pan:["onPan","onPanStart","onPanSessionStart","onPanEnd"],inView:["whileInView","onViewportEnter","onViewportLeave"],layout:["layout","layoutId"]};let ai=!1;function Pu(){if(ai)return;const t={};for(const e in ii)t[e]={isEnabled:n=>ii[e].some(s=>!!n[s])};Oa(t),ai=!0}function ur(){return Pu(),mh()}function Au(t){const e=ur();for(const n in t)e[n]={...e[n],...t[n]};Oa(e)}const Vu=new Set(["animate","exit","variants","initial","style","values","variants","transition","transformTemplate","custom","inherit","onBeforeLayoutMeasure","onAnimationStart","onAnimationComplete","onUpdate","onDragStart","onDrag","onDragEnd","onMeasureDragConstraints","onDirectionLock","onDragTransitionEnd","_dragX","_dragY","onHoverStart","onHoverEnd","onViewportEnter","onViewportLeave","globalTapTarget","propagate","ignoreStrict","viewport"]);function be(t){return t.startsWith("while")||t.startsWith("drag")&&t!=="draggable"||t.startsWith("layout")||t.startsWith("onTap")||t.startsWith("onPan")||t.startsWith("onLayout")||Vu.has(t)}let dr=t=>!be(t);function Du(t){typeof t=="function"&&(dr=e=>e.startsWith("on")?!be(e):t(e))}try{Du(require("@emotion/is-prop-valid").default)}catch{}function Eu(t,e,n){const s={};for(const i in t)i==="values"&&typeof t.values=="object"||O(t[i])||(dr(i)||n===!0&&be(i)||!e&&!be(i)||t.draggable&&i.startsWith("onDrag"))&&(s[i]=t[i]);return s}const Ve=g.createContext({});function Lu(t,e){if(Ae(t)){const{initial:n,animate:s}=t;return{initial:n===!1||Ut(n)?n:void 0,animate:Ut(s)?s:void 0}}return t.inherit!==!1?e:{}}function Ru(t){const{initial:e,animate:n}=Lu(t,g.useContext(Ve));return g.useMemo(()=>({initial:e,animate:n}),[ri(e),ri(n)])}function ri(t){return Array.isArray(t)?t.join(" "):t}const Yn=()=>({style:{},transform:{},transformOrigin:{},vars:{}});function fr(t,e,n){for(const s in e)!O(e[s])&&!Wa(s,n)&&(t[s]=e[s])}function ju({transformTemplate:t},e){return g.useMemo(()=>{const n=Yn();return Xn(n,e,t),Object.assign({},n.vars,n.style)},[e])}function zu(t,e){const n=t.style||{},s={};return fr(s,n,t),Object.assign(s,ju(t,e)),s}function Fu(t,e){const n={},s=zu(t,e);return t.drag&&t.dragListener!==!1&&(n.draggable=!1,s.userSelect=s.WebkitUserSelect=s.WebkitTouchCallout="none",s.touchAction=t.drag===!0?"none":`pan-${t.drag==="x"?"y":"x"}`),t.tabIndex===void 0&&(t.onTap||t.onTapStart||t.whileTap)&&(n.tabIndex=0),n.style=s,n}const pr=()=>({...Yn(),attrs:{}});function Iu(t,e,n,s){const i=g.useMemo(()=>{const r=pr();return Ka(r,e,Xa(s),t.transformTemplate,t.style),{...r.attrs,style:{...r.style}}},[e]);if(t.style){const r={};fr(r,t.style,t),i.style={...r,...i.style}}return i}const Bu=["animate","circle","defs","desc","ellipse","g","image","line","filter","marker","mask","metadata","path","pattern","polygon","polyline","rect","stop","switch","symbol","svg","text","tspan","use","view"];function Jn(t){return typeof t!="string"||t.includes("-")?!1:!!(Bu.indexOf(t)>-1||/[A-Z]/u.test(t))}function Ou(t,e,n,{latestValues:s},i,r=!1,a){const c=(a??Jn(t)?Iu:Fu)(e,s,i,t),h=Eu(e,typeof t=="string",r),l=t!==g.Fragment?{...h,...c,ref:n}:{},{children:u}=e,f=g.useMemo(()=>O(u)?u.get():u,[u]);return g.createElement(t,{...l,children:f})}function Hu({scrapeMotionValuesFromProps:t,createRenderState:e},n,s,i){return{latestValues:qu(n,s,i,t),renderState:e()}}function qu(t,e,n,s){const i={},r=s(t,{});for(const f in r)i[f]=ue(r[f]);let{initial:a,animate:o}=t;const c=Ae(t),h=Ia(t);e&&h&&!c&&t.inherit!==!1&&(a===void 0&&(a=e.initial),o===void 0&&(o=e.animate));let l=n?n.initial===!1:!1;l=l||a===!1;const u=l?o:a;if(u&&typeof u!="boolean"&&!Pe(u)){const f=Array.isArray(u)?u:[u];for(let p=0;p<f.length;p++){const y=qn(t,f[p]);if(y){const{transitionEnd:k,transition:m,...x}=y;for(const M in x){let v=x[M];if(Array.isArray(v)){const w=l?v.length-1:0;v=v[w]}v!==null&&(i[M]=v)}for(const M in k)i[M]=k[M]}}}return i}const yr=t=>(e,n)=>{const s=g.useContext(Ve),i=g.useContext(Cn),r=()=>Hu(t,e,s,i);return n?r():Bo(r)},Nu=yr({scrapeMotionValuesFromProps:Zn,createRenderState:Yn}),Uu=yr({scrapeMotionValuesFromProps:Za,createRenderState:pr}),$u=Symbol.for("motionComponentSymbol");function _u(t,e,n){const s=g.useRef(n);g.useInsertionEffect(()=>{s.current=n});const i=g.useRef(null);return g.useCallback(r=>{var o;r&&((o=t.onMount)==null||o.call(t,r));const a=s.current;if(typeof a=="function")if(r){const c=a(r);typeof c=="function"&&(i.current=c)}else i.current?(i.current(),i.current=null):a(r);else a&&(a.current=r);e&&(r?e.mount(r):e.unmount())},[e])}const mr=g.createContext({});function St(t){return t&&typeof t=="object"&&Object.prototype.hasOwnProperty.call(t,"current")}function Wu(t,e,n,s,i,r){var v,w;const{visualElement:a}=g.useContext(Ve),o=g.useContext(hr),c=g.useContext(Cn),h=g.useContext(lr),l=h.reducedMotion,u=h.skipAnimations,f=g.useRef(null),p=g.useRef(!1);s=s||o.renderer,!f.current&&s&&(f.current=s(t,{visualState:e,parent:a,props:n,presenceContext:c,blockInitialAnimation:c?c.initial===!1:!1,reducedMotionConfig:l,skipAnimations:u,isSVG:r}),p.current&&f.current&&(f.current.manuallyAnimateOnMount=!0));const y=f.current,k=g.useContext(mr);y&&!y.projection&&i&&(y.type==="html"||y.type==="svg")&&Ku(f.current,n,i,k);const m=g.useRef(!1);g.useInsertionEffect(()=>{y&&m.current&&y.update(n,c)});const x=n[Ta],M=g.useRef(!!x&&typeof window<"u"&&!((v=window.MotionHandoffIsComplete)!=null&&v.call(window,x))&&((w=window.MotionHasOptimisedAnimation)==null?void 0:w.call(window,x)));return Ho(()=>{p.current=!0,y&&(m.current=!0,window.MotionIsMounted=!0,y.updateFeatures(),y.scheduleRenderMicrotask(),M.current&&y.animationState&&y.animationState.animateChanges())}),g.useEffect(()=>{y&&(!M.current&&y.animationState&&y.animationState.animateChanges(),M.current&&(queueMicrotask(()=>{var T;(T=window.MotionHandoffMarkAsComplete)==null||T.call(window,x)}),M.current=!1),y.enteringChildren=void 0)}),y}function Ku(t,e,n,s){const{layoutId:i,layout:r,drag:a,dragConstraints:o,layoutScroll:c,layoutRoot:h,layoutAnchor:l,layoutCrossfade:u}=e;t.projection=new n(t.latestValues,e["data-framer-portal-id"]?void 0:gr(t.parent)),t.projection.setOptions({layoutId:i,layout:r,alwaysMeasureLayout:!!a||o&&St(o),visualElement:t,animationType:typeof r=="string"?r:"both",initialPromotionConfig:s,crossfade:u,layoutScroll:c,layoutRoot:h,layoutAnchor:l})}function gr(t){if(t)return t.options.allowProjection!==!1?t.projection:gr(t.parent)}function Ne(t,{forwardMotionProps:e=!1,type:n}={},s,i){s&&Au(s);const r=n?n==="svg":Jn(t),a=r?Uu:Nu;function o(h,l){let u;const f={...g.useContext(lr),...h,layoutId:Gu(h)},{isStatic:p}=f,y=Ru(h),k=a(h,p);if(!p&&typeof window<"u"){Xu();const m=Zu(f);u=m.MeasureLayout,y.visualElement=Wu(t,k,f,i,m.ProjectionNode,r)}return Ke.jsxs(Ve.Provider,{value:y,children:[u&&y.visualElement?Ke.jsx(u,{visualElement:y.visualElement,...f}):null,Ou(t,h,_u(k,y.visualElement,l),k,p,e,r)]})}o.displayName=`motion.${typeof t=="string"?t:`create(${t.displayName??t.name??""})`}`;const c=g.forwardRef(o);return c[$u]=t,c}function Gu({layoutId:t}){const e=g.useContext(Fi).id;return e&&t!==void 0?e+"-"+t:t}function Xu(t,e){g.useContext(hr).strict}function Zu(t){const e=ur(),{drag:n,layout:s}=e;if(!n&&!s)return{};const i={...n,...s};return{MeasureLayout:n!=null&&n.isEnabled(t)||s!=null&&s.isEnabled(t)?i.MeasureLayout:void 0,ProjectionNode:i.ProjectionNode}}function Yu(t,e){if(typeof Proxy>"u")return Ne;const n=new Map,s=(r,a)=>Ne(r,a,t,e),i=(r,a)=>s(r,a);return new Proxy(i,{get:(r,a)=>a==="create"?s:(n.has(a)||n.set(a,Ne(a,void 0,t,e)),n.get(a))})}const Ju=(t,e)=>e.isSVG??Jn(t)?new Rh(e):new Ph(e,{allowProjection:t!==g.Fragment});class Qu extends yt{constructor(e){super(e),e.animationState||(e.animationState=Bh(e))}updateAnimationControlsSubscription(){const{animate:e}=this.node.getProps();Pe(e)&&(this.unmountControls=e.subscribe(this.node))}mount(){this.updateAnimationControlsSubscription()}update(){const{animate:e}=this.node.getProps(),{animate:n}=this.node.prevProps||{};e!==n&&this.updateAnimationControlsSubscription()}unmount(){var e;this.node.animationState.reset(),(e=this.unmountControls)==null||e.call(this)}}let t1=0;class e1 extends yt{constructor(){super(...arguments),this.id=t1++,this.isExitComplete=!1}update(){var r;if(!this.node.presenceContext)return;const{isPresent:e,onExitComplete:n}=this.node.presenceContext,{isPresent:s}=this.node.prevPresenceContext||{};if(!this.node.animationState||e===s)return;if(e&&s===!1){if(this.isExitComplete){const{initial:a,custom:o}=this.node.getProps();if(typeof a=="string"){const c=wt(this.node,a,o);if(c){const{transition:h,transitionEnd:l,...u}=c;for(const f in u)(r=this.node.getValue(f))==null||r.jump(u[f])}}this.node.animationState.reset(),this.node.animationState.animateChanges()}else this.node.animationState.setActive("exit",!1);this.isExitComplete=!1;return}const i=this.node.animationState.setActive("exit",!e);n&&!e&&i.then(()=>{this.isExitComplete=!0,n(this.id)})}mount(){const{register:e,onExitComplete:n}=this.node.presenceContext||{};n&&n(this.id),e&&(this.unmount=e(this.id))}unmount(){}}const n1={animation:{Feature:Qu},exit:{Feature:e1}};function Zt(t){return{point:{x:t.pageX,y:t.pageY}}}const s1=t=>e=>_n(e)&&t(e,Zt(e));function Ht(t,e,n,s){return $t(t,e,s1(n),s)}const kr=({current:t})=>t?t.ownerDocument.defaultView:null,oi=(t,e)=>Math.abs(t-e);function i1(t,e){const n=oi(t.x,e.x),s=oi(t.y,e.y);return Math.sqrt(n**2+s**2)}const ci=new Set(["auto","scroll"]);class vr{constructor(e,n,{transformPagePoint:s,contextWindow:i=window,dragSnapToOrigin:r=!1,distanceThreshold:a=3,element:o}={}){if(this.startEvent=null,this.lastMoveEvent=null,this.lastMoveEventInfo=null,this.lastRawMoveEventInfo=null,this.handlers={},this.contextWindow=window,this.scrollPositions=new Map,this.removeScrollListeners=null,this.onElementScroll=p=>{this.handleScroll(p.target)},this.onWindowScroll=()=>{this.handleScroll(window)},this.updatePoint=()=>{if(!(this.lastMoveEvent&&this.lastMoveEventInfo))return;this.lastRawMoveEventInfo&&(this.lastMoveEventInfo=ee(this.lastRawMoveEventInfo,this.transformPagePoint));const p=Ue(this.lastMoveEventInfo,this.history),y=this.startEvent!==null,k=i1(p.offset,{x:0,y:0})>=this.distanceThreshold;if(!y&&!k)return;const{point:m}=p,{timestamp:x}=B;this.history.push({...m,timestamp:x});const{onStart:M,onMove:v}=this.handlers;y||(M&&M(this.lastMoveEvent,p),this.startEvent=this.lastMoveEvent),v&&v(this.lastMoveEvent,p)},this.handlePointerMove=(p,y)=>{this.lastMoveEvent=p,this.lastRawMoveEventInfo=y,this.lastMoveEventInfo=ee(y,this.transformPagePoint),A.update(this.updatePoint,!0)},this.handlePointerUp=(p,y)=>{this.end();const{onEnd:k,onSessionEnd:m,resumeAnimation:x}=this.handlers;if((this.dragSnapToOrigin||!this.startEvent)&&x&&x(),!(this.lastMoveEvent&&this.lastMoveEventInfo))return;const M=Ue(p.type==="pointercancel"?this.lastMoveEventInfo:ee(y,this.transformPagePoint),this.history);this.startEvent&&k&&k(p,M),m&&m(p,M)},!_n(e))return;this.dragSnapToOrigin=r,this.handlers=n,this.transformPagePoint=s,this.distanceThreshold=a,this.contextWindow=i||window;const c=Zt(e),h=ee(c,this.transformPagePoint),{point:l}=h,{timestamp:u}=B;this.history=[{...l,timestamp:u}];const{onSessionStart:f}=n;f&&f(e,Ue(h,this.history)),this.removeListeners=Kt(Ht(this.contextWindow,"pointermove",this.handlePointerMove),Ht(this.contextWindow,"pointerup",this.handlePointerUp),Ht(this.contextWindow,"pointercancel",this.handlePointerUp)),o&&this.startScrollTracking(o)}startScrollTracking(e){let n=e.parentElement;for(;n;){const s=getComputedStyle(n);(ci.has(s.overflowX)||ci.has(s.overflowY))&&this.scrollPositions.set(n,{x:n.scrollLeft,y:n.scrollTop}),n=n.parentElement}this.scrollPositions.set(window,{x:window.scrollX,y:window.scrollY}),window.addEventListener("scroll",this.onElementScroll,{capture:!0}),window.addEventListener("scroll",this.onWindowScroll),this.removeScrollListeners=()=>{window.removeEventListener("scroll",this.onElementScroll,{capture:!0}),window.removeEventListener("scroll",this.onWindowScroll)}}handleScroll(e){const n=this.scrollPositions.get(e);if(!n)return;const s=e===window,i=s?{x:window.scrollX,y:window.scrollY}:{x:e.scrollLeft,y:e.scrollTop},r={x:i.x-n.x,y:i.y-n.y};r.x===0&&r.y===0||(s?this.lastMoveEventInfo&&(this.lastMoveEventInfo.point.x+=r.x,this.lastMoveEventInfo.point.y+=r.y):this.history.length>0&&(this.history[0].x-=r.x,this.history[0].y-=r.y),this.scrollPositions.set(e,i),A.update(this.updatePoint,!0))}updateHandlers(e){this.handlers=e}end(){this.removeListeners&&this.removeListeners(),this.removeScrollListeners&&this.removeScrollListeners(),this.scrollPositions.clear(),ft(this.updatePoint)}}function ee(t,e){return e?{point:e(t.point)}:t}function li(t,e){return{x:t.x-e.x,y:t.y-e.y}}function Ue({point:t},e){return{point:t,delta:li(t,xr(e)),offset:li(t,a1(e)),velocity:r1(e,.1)}}function a1(t){return t[0]}function xr(t){return t[t.length-1]}function r1(t,e){if(t.length<2)return{x:0,y:0};let n=t.length-1,s=null;const i=xr(t);for(;n>=0&&(s=t[n],!(i.timestamp-s.timestamp>_(e)));)n--;if(!s)return{x:0,y:0};s===t[0]&&t.length>2&&i.timestamp-s.timestamp>_(e)*2&&(s=t[1]);const r=K(i.timestamp-s.timestamp);if(r===0)return{x:0,y:0};const a={x:(i.x-s.x)/r,y:(i.y-s.y)/r};return a.x===1/0&&(a.x=0),a.y===1/0&&(a.y=0),a}function o1(t,{min:e,max:n},s){return e!==void 0&&t<e?t=s?V(e,t,s.min):Math.max(t,e):n!==void 0&&t>n&&(t=s?V(n,t,s.max):Math.min(t,n)),t}function hi(t,e,n){return{min:e!==void 0?t.min+e:void 0,max:n!==void 0?t.max+n-(t.max-t.min):void 0}}function c1(t,{top:e,left:n,bottom:s,right:i}){return{x:hi(t.x,n,i),y:hi(t.y,e,s)}}function ui(t,e){let n=e.min-t.min,s=e.max-t.max;return e.max-e.min<t.max-t.min&&([n,s]=[s,n]),{min:n,max:s}}function l1(t,e){return{x:ui(t.x,e.x),y:ui(t.y,e.y)}}function h1(t,e){let n=.5;const s=N(t),i=N(e);return i>s?n=qt(e.min,e.max-s,t.min):s>i&&(n=qt(t.min,t.max-i,e.min)),it(0,1,n)}function u1(t,e){const n={};return e.min!==void 0&&(n.min=e.min-t.min),e.max!==void 0&&(n.max=e.max-t.min),n}const vn=.35;function d1(t=vn){return t===!1?t=0:t===!0&&(t=vn),{x:di(t,"left","right"),y:di(t,"top","bottom")}}function di(t,e,n){return{min:fi(t,e),max:fi(t,n)}}function fi(t,e){return typeof t=="number"?t:t[e]||0}const f1=new WeakMap;class p1{constructor(e){this.openDragLock=null,this.isDragging=!1,this.currentDirection=null,this.originPoint={x:0,y:0},this.constraints=!1,this.hasMutatedConstraints=!1,this.elastic=j(),this.latestPointerEvent=null,this.latestPanInfo=null,this.visualElement=e}start(e,{snapToCursor:n=!1,distanceThreshold:s}={}){const{presenceContext:i}=this.visualElement;if(i&&i.isPresent===!1)return;const r=u=>{n&&this.snapToCursor(Zt(u).point),this.stopAnimation()},a=(u,f)=>{const{drag:p,dragPropagation:y,onDragStart:k}=this.getProps();if(p&&!y&&(this.openDragLock&&this.openDragLock(),this.openDragLock=Wl(p),!this.openDragLock))return;this.latestPointerEvent=u,this.latestPanInfo=f,this.isDragging=!0,this.currentDirection=null,this.resolveConstraints(),this.visualElement.projection&&(this.visualElement.projection.isAnimationBlocked=!0,this.visualElement.projection.target=void 0),tt(x=>{let M=this.getAxisMotionValue(x).get()||0;if(st.test(M)){const{projection:v}=this.visualElement;if(v&&v.layout){const w=v.layout.layoutBox[x];w&&(M=N(w)*(parseFloat(M)/100))}}this.originPoint[x]=M}),k&&A.update(()=>k(u,f),!1,!0),hn(this.visualElement,"transform");const{animationState:m}=this.visualElement;m&&m.setActive("whileDrag",!0)},o=(u,f)=>{this.latestPointerEvent=u,this.latestPanInfo=f;const{dragPropagation:p,dragDirectionLock:y,onDirectionLock:k,onDrag:m}=this.getProps();if(!p&&!this.openDragLock)return;const{offset:x}=f;if(y&&this.currentDirection===null){this.currentDirection=m1(x),this.currentDirection!==null&&k&&k(this.currentDirection);return}this.updateAxis("x",f.point,x),this.updateAxis("y",f.point,x),this.visualElement.render(),m&&A.update(()=>m(u,f),!1,!0)},c=(u,f)=>{this.latestPointerEvent=u,this.latestPanInfo=f,this.stop(u,f),this.latestPointerEvent=null,this.latestPanInfo=null},h=()=>{const{dragSnapToOrigin:u}=this.getProps();(u||this.constraints)&&this.startAnimation({x:0,y:0})},{dragSnapToOrigin:l}=this.getProps();this.panSession=new vr(e,{onSessionStart:r,onStart:a,onMove:o,onSessionEnd:c,resumeAnimation:h},{transformPagePoint:this.visualElement.getTransformPagePoint(),dragSnapToOrigin:l,distanceThreshold:s,contextWindow:kr(this.visualElement),element:this.visualElement.current})}stop(e,n){const s=e||this.latestPointerEvent,i=n||this.latestPanInfo,r=this.isDragging;if(this.cancel(),!r||!i||!s)return;const{velocity:a}=i;this.startAnimation(a);const{onDragEnd:o}=this.getProps();o&&A.postRender(()=>o(s,i))}cancel(){this.isDragging=!1;const{projection:e,animationState:n}=this.visualElement;e&&(e.isAnimationBlocked=!1),this.endPanSession();const{dragPropagation:s}=this.getProps();!s&&this.openDragLock&&(this.openDragLock(),this.openDragLock=null),n&&n.setActive("whileDrag",!1)}endPanSession(){this.panSession&&this.panSession.end(),this.panSession=void 0}updateAxis(e,n,s){const{drag:i}=this.getProps();if(!s||!ne(e,i,this.currentDirection))return;const r=this.getAxisMotionValue(e);let a=this.originPoint[e]+s[e];this.constraints&&this.constraints[e]&&(a=o1(a,this.constraints[e],this.elastic[e])),r.set(a)}resolveConstraints(){var r;const{dragConstraints:e,dragElastic:n}=this.getProps(),s=this.visualElement.projection&&!this.visualElement.projection.layout?this.visualElement.projection.measure(!1):(r=this.visualElement.projection)==null?void 0:r.layout,i=this.constraints;e&&St(e)?this.constraints||(this.constraints=this.resolveRefConstraints()):e&&s?this.constraints=c1(s.layoutBox,e):this.constraints=!1,this.elastic=d1(n),i!==this.constraints&&!St(e)&&s&&this.constraints&&!this.hasMutatedConstraints&&tt(a=>{this.constraints!==!1&&this.getAxisMotionValue(a)&&(this.constraints[a]=u1(s.layoutBox[a],this.constraints[a]))})}resolveRefConstraints(){const{dragConstraints:e,onMeasureDragConstraints:n}=this.getProps();if(!e||!St(e))return!1;const s=e.current,{projection:i}=this.visualElement;if(!i||!i.layout)return!1;const r=Mh(s,i.root,this.visualElement.getTransformPagePoint());let a=l1(i.layout.layoutBox,r);if(n){const o=n(kh(a));this.hasMutatedConstraints=!!o,o&&(a=qa(o))}return a}startAnimation(e){const{drag:n,dragMomentum:s,dragElastic:i,dragTransition:r,dragSnapToOrigin:a,onDragTransitionEnd:o}=this.getProps(),c=this.constraints||{},h=tt(l=>{if(!ne(l,n,this.currentDirection))return;let u=c&&c[l]||{};(a===!0||a===l)&&(u={min:0,max:0});const f=i?200:1e6,p=i?40:1e7,y={type:"inertia",velocity:s?e[l]:0,bounceStiffness:f,bounceDamping:p,timeConstant:750,restDelta:1,restSpeed:10,...r,...u};return this.startAxisValueAnimation(l,y)});return Promise.all(h).then(o)}startAxisValueAnimation(e,n){const s=this.getAxisMotionValue(e);return hn(this.visualElement,e),s.start(Hn(e,s,0,n,this.visualElement,!1))}stopAnimation(){tt(e=>this.getAxisMotionValue(e).stop())}getAxisMotionValue(e){const n=`_drag${e.toUpperCase()}`,s=this.visualElement.getProps(),i=s[n];return i||this.visualElement.getValue(e,(s.initial?s.initial[e]:void 0)||0)}snapToCursor(e){tt(n=>{const{drag:s}=this.getProps();if(!ne(n,s,this.currentDirection))return;const{projection:i}=this.visualElement,r=this.getAxisMotionValue(n);if(i&&i.layout){const{min:a,max:o}=i.layout.layoutBox[n],c=r.get()||0;r.set(e[n]-V(a,o,.5)+c)}})}scalePositionWithinConstraints(){if(!this.visualElement.current)return;const{drag:e,dragConstraints:n}=this.getProps(),{projection:s}=this.visualElement;if(!St(n)||!s||!this.constraints)return;this.stopAnimation();const i={x:0,y:0};tt(a=>{const o=this.getAxisMotionValue(a);if(o&&this.constraints!==!1){const c=o.get();i[a]=h1({min:c,max:c},this.constraints[a])}});const{transformTemplate:r}=this.visualElement.getProps();this.visualElement.current.style.transform=r?r({},""):"none",s.root&&s.root.updateScroll(),s.updateLayout(),this.constraints=!1,this.resolveConstraints(),tt(a=>{if(!ne(a,e,null))return;const o=this.getAxisMotionValue(a),{min:c,max:h}=this.constraints[a];o.set(V(c,h,i[a]))}),this.visualElement.render()}addListeners(){if(!this.visualElement.current)return;f1.set(this.visualElement,this);const e=this.visualElement.current,n=Ht(e,"pointerdown",h=>{const{drag:l,dragListener:u=!0}=this.getProps(),f=h.target,p=f!==e&&Jl(f);l&&u&&!p&&this.start(h)});let s;const i=()=>{const{dragConstraints:h}=this.getProps();St(h)&&h.current&&(this.constraints=this.resolveRefConstraints(),s||(s=y1(e,h.current,()=>this.scalePositionWithinConstraints())))},{projection:r}=this.visualElement,a=r.addEventListener("measure",i);r&&!r.layout&&(r.root&&r.root.updateScroll(),r.updateLayout()),A.read(i);const o=$t(window,"resize",()=>this.scalePositionWithinConstraints()),c=r.addEventListener("didUpdate",({delta:h,hasLayoutChanged:l})=>{this.isDragging&&l&&(tt(u=>{const f=this.getAxisMotionValue(u);f&&(this.originPoint[u]+=h[u].translate,f.set(f.get()+h[u].translate))}),this.visualElement.render())});return()=>{o(),n(),a(),c&&c(),s&&s()}}getProps(){const e=this.visualElement.getProps(),{drag:n=!1,dragDirectionLock:s=!1,dragPropagation:i=!1,dragConstraints:r=!1,dragElastic:a=vn,dragMomentum:o=!0}=e;return{...e,drag:n,dragDirectionLock:s,dragPropagation:i,dragConstraints:r,dragElastic:a,dragMomentum:o}}}function pi(t){let e=!0;return()=>{if(e){e=!1;return}t()}}function y1(t,e,n){const s=ws(t,pi(n)),i=ws(e,pi(n));return()=>{s(),i()}}function ne(t,e,n){return(e===!0||e===t)&&(n===null||n===t)}function m1(t,e=10){let n=null;return Math.abs(t.y)>e?n="y":Math.abs(t.x)>e&&(n="x"),n}class g1 extends yt{constructor(e){super(e),this.removeGroupControls=G,this.removeListeners=G,this.controls=new p1(e)}mount(){const{dragControls:e}=this.node.getProps();e&&(this.removeGroupControls=e.subscribe(this.controls)),this.removeListeners=this.controls.addListeners()||G}update(){const{dragControls:e}=this.node.getProps(),{dragControls:n}=this.node.prevProps||{};e!==n&&(this.removeGroupControls(),e&&(this.removeGroupControls=e.subscribe(this.controls)))}unmount(){this.removeGroupControls(),this.removeListeners(),this.controls.isDragging||this.controls.endPanSession()}}const $e=t=>(e,n)=>{t&&A.update(()=>t(e,n),!1,!0)};class k1 extends yt{constructor(){super(...arguments),this.removePointerDownListener=G}onPointerDown(e){this.session=new vr(e,this.createPanHandlers(),{transformPagePoint:this.node.getTransformPagePoint(),contextWindow:kr(this.node)})}createPanHandlers(){const{onPanSessionStart:e,onPanStart:n,onPan:s,onPanEnd:i}=this.node.getProps();return{onSessionStart:$e(e),onStart:$e(n),onMove:$e(s),onEnd:(r,a)=>{delete this.session,i&&A.postRender(()=>i(r,a))}}}mount(){this.removePointerDownListener=Ht(this.node.current,"pointerdown",e=>this.onPointerDown(e))}update(){this.session&&this.session.updateHandlers(this.createPanHandlers())}unmount(){this.removePointerDownListener(),this.session&&this.session.end()}}let _e=!1;class v1 extends g.Component{componentDidMount(){const{visualElement:e,layoutGroup:n,switchLayoutGroup:s,layoutId:i}=this.props,{projection:r}=e;r&&(n.group&&n.group.add(r),s&&s.register&&i&&s.register(r),_e&&r.root.didUpdate(),r.addEventListener("animationComplete",()=>{this.safeToRemove()}),r.setOptions({...r.options,layoutDependency:this.props.layoutDependency,onExitComplete:()=>this.safeToRemove()})),de.hasEverUpdated=!0}getSnapshotBeforeUpdate(e){const{layoutDependency:n,visualElement:s,drag:i,isPresent:r}=this.props,{projection:a}=s;return a&&(a.isPresent=r,e.layoutDependency!==n&&a.setOptions({...a.options,layoutDependency:n}),_e=!0,i||e.layoutDependency!==n||n===void 0||e.isPresent!==r?a.willUpdate():this.safeToRemove(),e.isPresent!==r&&(r?a.promote():a.relegate()||A.postRender(()=>{const o=a.getStack();(!o||!o.members.length)&&this.safeToRemove()}))),null}componentDidUpdate(){const{visualElement:e,layoutAnchor:n}=this.props,{projection:s}=e;s&&(s.options.layoutAnchor=n,s.root.didUpdate(),$n.postRender(()=>{!s.currentAnimation&&s.isLead()&&this.safeToRemove()}))}componentWillUnmount(){const{visualElement:e,layoutGroup:n,switchLayoutGroup:s}=this.props,{projection:i}=e;_e=!0,i&&(i.scheduleCheckAfterUnmount(),n&&n.group&&n.group.remove(i),s&&s.deregister&&s.deregister(i))}safeToRemove(){const{safeToRemove:e}=this.props;e&&e()}render(){return null}}function Mr(t){const[e,n]=Cu(),s=g.useContext(Fi);return Ke.jsx(v1,{...t,layoutGroup:s,switchLayoutGroup:g.useContext(mr),isPresent:e,safeToRemove:n})}const x1={pan:{Feature:k1},drag:{Feature:g1,ProjectionNode:cr,MeasureLayout:Mr}};function yi(t,e,n){const{props:s}=t;t.animationState&&s.whileHover&&t.animationState.setActive("whileHover",n==="Start");const i="onHover"+n,r=s[i];r&&A.postRender(()=>r(e,Zt(e)))}class M1 extends yt{mount(){const{current:e}=this.node;e&&(this.unmount=Gl(e,(n,s)=>(yi(this.node,s,"Start"),i=>yi(this.node,i,"End"))))}unmount(){}}class b1 extends yt{constructor(){super(...arguments),this.isActive=!1}onFocus(){let e=!1;try{e=this.node.current.matches(":focus-visible")}catch{e=!0}!e||!this.node.animationState||(this.node.animationState.setActive("whileFocus",!0),this.isActive=!0)}onBlur(){!this.isActive||!this.node.animationState||(this.node.animationState.setActive("whileFocus",!1),this.isActive=!1)}mount(){this.unmount=Kt($t(this.node.current,"focus",()=>this.onFocus()),$t(this.node.current,"blur",()=>this.onBlur()))}unmount(){}}function mi(t,e,n){const{props:s}=t;if(t.current instanceof HTMLButtonElement&&t.current.disabled)return;t.animationState&&s.whileTap&&t.animationState.setActive("whileTap",n==="Start");const i="onTap"+(n==="End"?"":n),r=s[i];r&&A.postRender(()=>r(e,Zt(e)))}class w1 extends yt{mount(){const{current:e}=this.node;if(!e)return;const{globalTapTarget:n,propagate:s}=this.node.props;this.unmount=th(e,(i,r)=>(mi(this.node,r,"Start"),(a,{success:o})=>mi(this.node,a,o?"End":"Cancel")),{useGlobalTarget:n,stopPropagation:(s==null?void 0:s.tap)===!1})}unmount(){}}const xn=new WeakMap,We=new WeakMap,T1=t=>{const e=xn.get(t.target);e&&e(t)},S1=t=>{t.forEach(T1)};function C1({root:t,...e}){const n=t||document;We.has(n)||We.set(n,{});const s=We.get(n),i=JSON.stringify(e);return s[i]||(s[i]=new IntersectionObserver(S1,{root:t,...e})),s[i]}function P1(t,e,n){const s=C1(e);return xn.set(t,n),s.observe(t),()=>{xn.delete(t),s.unobserve(t)}}const A1={some:0,all:1};class V1 extends yt{constructor(){super(...arguments),this.hasEnteredView=!1,this.isInView=!1}startObserver(){var c;(c=this.stopObserver)==null||c.call(this);const{viewport:e={}}=this.node.getProps(),{root:n,margin:s,amount:i="some",once:r}=e,a={root:n?n.current:void 0,rootMargin:s,threshold:typeof i=="number"?i:A1[i]},o=h=>{const{isIntersecting:l}=h;if(this.isInView===l||(this.isInView=l,r&&!l&&this.hasEnteredView))return;l&&(this.hasEnteredView=!0),this.node.animationState&&this.node.animationState.setActive("whileInView",l);const{onViewportEnter:u,onViewportLeave:f}=this.node.getProps(),p=l?u:f;p&&p(h)};this.stopObserver=P1(this.node.current,a,o)}mount(){this.startObserver()}update(){if(typeof IntersectionObserver>"u")return;const{props:e,prevProps:n}=this.node;["amount","margin","root"].some(D1(e,n))&&this.startObserver()}unmount(){var e;(e=this.stopObserver)==null||e.call(this),this.hasEnteredView=!1,this.isInView=!1}}function D1({viewport:t={}},{viewport:e={}}={}){return n=>t[n]!==e[n]}const E1={inView:{Feature:V1},tap:{Feature:w1},focus:{Feature:b1},hover:{Feature:M1}},L1={layout:{ProjectionNode:cr,MeasureLayout:Mr}},R1={...n1,...E1,...x1,...L1},_p=Yu(R1,Ju);export{dd as $,xd as A,nd as B,od as C,U1 as D,Ud as E,Yd as F,gp as G,y0 as H,T0 as I,Vf as J,_p as K,I0 as L,_0 as M,uf as N,B1 as O,N0 as P,Sf as Q,I1 as R,Qf as S,pp as T,Dp as U,Bd as V,Bp as W,qp as X,B0 as Y,af as Z,Vp as _,n0 as a,J0 as a$,_d as a0,O0 as a1,$d as a2,Tf as a3,$1 as a4,vp as a5,pf as a6,p0 as a7,a0 as a8,ad as a9,j0 as aA,bf as aB,Np as aC,c0 as aD,ld as aE,vf as aF,Uf as aG,m0 as aH,K1 as aI,r0 as aJ,H0 as aK,Lf as aL,W1 as aM,N1 as aN,zp as aO,mp as aP,yp as aQ,x0 as aR,Mp as aS,gd as aT,Md as aU,kd as aV,ed as aW,xf as aX,jf as aY,Zf as aZ,D0 as a_,S0 as aa,$f as ab,Od as ac,Vd as ad,q0 as ae,wp as af,_f as ag,Rd as ah,Sp as ai,R0 as aj,k0 as ak,jp as al,bd as am,ep as an,tp as ao,bp as ap,Pp as aq,sp as ar,Df as as,Jf as at,Id as au,tf as av,ef as aw,Of as ax,Z0 as ay,Up as az,df as b,Y0 as b$,b0,jd as b1,Yf as b2,Qd as b3,Af as b4,hd as b5,f0 as b6,Hp as b7,X1 as b8,If as b9,z0 as bA,kp as bB,cp as bC,z as bD,xp as bE,Nd as bF,Dd as bG,Lp as bH,Tp as bI,Cp as bJ,Hd as bK,sf as bL,h0 as bM,Op as bN,V0 as bO,cd as bP,up as bQ,J1 as bR,Kd as bS,E0 as bT,Gd as bU,lp as bV,ap as bW,rf as bX,ff as bY,qd as bZ,W0 as b_,d0 as ba,wd as bb,G1 as bc,G0 as bd,Rf as be,qf as bf,w0 as bg,sd as bh,Ed as bi,Sd as bj,Ip as bk,Hf as bl,i0 as bm,zd as bn,Fp as bo,Zd as bp,_1 as bq,q1 as br,Kf as bs,M0 as bt,vd as bu,t0 as bv,ip as bw,yd as bx,P0 as by,o0 as bz,rd as c,l0 as c0,yf as c1,Mf as c2,e0 as c3,Ad as c4,C0 as c5,cf as c6,g0 as c7,u0 as c8,Ld as c9,fp as cA,Xf as cB,hp as cC,op as cD,A0 as cE,zf as cF,Ep as cG,v0 as cH,F0 as cI,Xd as cJ,U0 as cK,H1 as cL,Pf as ca,Cd as cb,mf as cc,F1 as cd,z1 as ce,$0 as cf,wf as cg,dp as ch,s0 as ci,gf as cj,kf as ck,id as cl,L0 as cm,Ef as cn,fd as co,md as cp,hf as cq,Td as cr,Ff as cs,lf as ct,Jd as cu,Rp as cv,np as cw,Fd as cx,Cf as cy,Q1 as cz,Wd as d,Z1 as e,Q0 as f,td as g,Ap as h,Tr as i,Hr as j,Ke as k,Bf as l,X0 as m,Y1 as n,pd as o,ud as p,Nf as q,g as r,Wf as s,Pd as t,Gf as u,nf as v,K0 as w,rp as x,of as y,O1 as z};
