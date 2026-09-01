/* verify.js — renders every page the site can produce, in Node, and fails on
   anything broken: undefined/NaN leaking into copy, unbalanced tags, classes
   with no CSS behind them. Run `node verify.js` before every push.
   No dependencies. It loads the real shipped files, so it cannot drift. */

const vm = require("vm");
const fs = require("fs");
const path = require("path");

const here = __dirname;
const read = f => fs.readFileSync(path.join(here, f), "utf8");

/* ---- minimal DOM shim, just enough for app.js to boot and render ---- */
function el(){
  return {
    innerHTML: "",
    value: "",
    onclick: null,
    addEventListener(){}, querySelectorAll(){ return []; },
    getAttribute(){ return null; }, closest(){ return null; }
  };
}
const appEl = el();
const sandbox = {
  console,
  location: { hash: "#/" },
  document: {
    getElementById(id){ return id === "app" ? appEl : el(); }
  }
};
sandbox.window = sandbox;
sandbox.window.addEventListener = function(){};
sandbox.window.scrollTo = function(){};
vm.createContext(sandbox);

["disc-copy.js","people.js","facts.js","compare.js","app.js"].forEach(f=>{
  vm.runInContext(read(f), sandbox, {filename: f});
});

/* ---- collect every route's rendered HTML ---- */
const pages = {};
function capture(name, code){
  vm.runInContext(code, sandbox, {filename: "driver:"+name});
  pages[name] = appEl.innerHTML;
}
capture("home", "renderHome()");
capture("family", "renderFamily()");
capture("method", "renderMethod()");
const ids = vm.runInContext("FAMILY.map(p=>p.id)", sandbox);
ids.forEach(id => capture("p/"+id, "renderPerson(" + JSON.stringify(id) + ")"));
ids.forEach(a => ids.forEach(b => {
  if (a !== b) capture("vs/"+a+"/"+b, "renderPair(" + JSON.stringify(a) + "," + JSON.stringify(b) + ")");
}));

/* ---- checks ---- */
const css = read("styles.css");
const problems = [];
const warnings = [];

const TAGS = [["<div","</div>"],["<span","</span>"],["<ul>","</ul>"],["<li>","</li>"],
  ["<h1","</h1>"],["<h2","</h2>"],["<h3","</h3>"],["<a ","</a>"],["<table","</table>"],
  ["<details","</details>"],["<button","</button>"],["<select","</select>"]];

function count(hay, needle){
  let c = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1){ c++; i += needle.length; }
  return c;
}

const seenClasses = new Set();
Object.entries(pages).forEach(([name, html])=>{
  if (!html || html.length < 500) problems.push(name + ": suspiciously small render (" + (html||"").length + " chars)");
  if (/\bundefined\b/.test(html)) problems.push(name + ": literal 'undefined' in output");
  if (/\bNaN\b/.test(html)) problems.push(name + ": literal 'NaN' in output");
  if (html.indexOf("[object ") !== -1) problems.push(name + ": '[object' in output");
  if (/\bnull\b(?![a-z])/.test(html.replace(/rel="noopener"/g,""))) {
    if (/>null</.test(html) || /"null"/.test(html)) problems.push(name + ": literal 'null' in output");
  }
  TAGS.forEach(([open, close])=>{
    const o = count(html, open), c = count(html, close);
    if (open === "<p"){ return; }
    if (o !== c) problems.push(name + ": unbalanced " + open + " (" + o + " open, " + c + " close)");
  });
  const po = (html.match(/<p[\s>]/g)||[]).length, pc = count(html, "</p>");
  if (po !== pc) problems.push(name + ": unbalanced <p> (" + po + " vs " + pc + ")");
  (html.match(/class="[^"]*"/g)||[]).forEach(m=>{
    m.slice(7,-1).split(/\s+/).filter(Boolean).forEach(cls=>seenClasses.add(cls));
  });
});

/* every class used must exist in styles.css */
seenClasses.forEach(cls=>{
  if (css.indexOf("." + cls) === -1) problems.push("class '" + cls + "' used but not in styles.css");
});

/* coverage: bespoke reads for everyone currently in the data (warn, not fail) */
const missingPersons = vm.runInContext("FAMILY.filter(p=>!PERSON_READS[p.id]).map(p=>p.id)", sandbox);
const missingPairs = vm.runInContext(
  "(function(){var out=[];for(var i=0;i<FAMILY.length;i++)for(var j=i+1;j<FAMILY.length;j++){var k=[FAMILY[i].id,FAMILY[j].id].sort().join('|');if(!PAIR_READS[k])out.push(k);}return out})()", sandbox);
missingPersons.forEach(id=>warnings.push("no hand-written read for person '" + id + "' (generated fallback in use)"));
missingPairs.forEach(k=>warnings.push("no hand-written read for pair '" + k + "' (generated fallback in use)"));

/* facts sanity */
const factsOk = vm.runInContext(`(function(){
  var errs = [];
  Object.keys(FACTS.persons).forEach(function(id){
    var m = FACTS.persons[id];
    ["D","I","S","C"].forEach(function(d){
      if (m.M[d] + m.L[d] + m.neutral[d] !== 28) errs.push(id + ": M+L+neutral for " + d + " != 28");
    });
  });
  Object.keys(FACTS.pairs).forEach(function(k){
    var e = FACTS.pairs[k];
    if (e.strip.length !== 28) errs.push(k + ": strip length " + e.strip.length);
    if (e.identical > e.sameMost) errs.push(k + ": identical > sameMost");
  });
  return errs;
})()`, sandbox);
factsOk.forEach(e=>problems.push("facts: " + e));

/* ---- report ---- */
const nPages = Object.keys(pages).length;
warnings.forEach(w=>console.log("warn: " + w));
if (problems.length){
  problems.forEach(p=>console.error("FAIL: " + p));
  console.error("\n" + problems.length + " problem(s) across " + nPages + " rendered pages.");
  process.exit(1);
}
console.log("OK — " + nPages + " pages rendered clean (" + ids.length + " people, " +
  (nPages - 3 - ids.length) + " ordered pairs, home, family, method). " +
  (warnings.length ? warnings.length + " coverage warning(s) above." : "Full bespoke coverage."));
