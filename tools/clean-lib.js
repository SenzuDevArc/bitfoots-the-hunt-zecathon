"use strict";

module.exports = function makeCleaner(acorn, die) {
  const PARSE = { ecmaVersion: "latest", sourceType: "script", allowHashBang: true };
  const stats = { devBlocks: 0, consoleCalls: 0 };

  function walk(node, fn, parent) {
    if (!node || typeof node.type !== "string") return;
    fn(node, parent);
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && walk(c, fn, node));
      else if (v && typeof v.type === "string") walk(v, fn, node);
    }
  }
  function applyEdits(src, edits) {
    edits.sort((a, b) => b.at - a.at);
    for (let i = 1; i < edits.length; i++) if (edits[i].at + edits[i].del > edits[i - 1].at) die("internal: overlapping edits");
    for (const e of edits) src = src.slice(0, e.at) + e.ins + src.slice(e.at + e.del);
    return src;
  }

  const LT = new RegExp("[\\n\\r" + String.fromCharCode(0x2028, 0x2029) + "]");
  function tokens(src) {
    const out = [];
    for (const t of acorn.tokenizer(src, PARSE)) out.push({ type: t.type.label, text: src.slice(t.start, t.end), start: t.start, end: t.end });
    return out;
  }
  function minify(file, src) {
    const toks = tokens(src);
    let out = "", prevEnd = 0, prevText = "";
    for (const t of toks) {
      const gap = src.slice(prevEnd, t.start);
      if (out && LT.test(gap)) out += "\n";
      else if (out && gap.length) {
        const a = prevText[prevText.length - 1], b = t.text[0], w = (c) => /[\w$\\\u0080-￿]/.test(c);
        if ((w(a) && (w(b) || b === ".")) || ("+-".includes(a) && "+-".includes(b)) || a === "/" || b === "/" ||
            (a === "<" && b === "!") || (a === "-" && b === ">")) out += " ";
      }
      out += t.text; prevEnd = t.end; prevText = t.text;
    }
    const again = tokens(out);
    if (again.length !== toks.length) die(`${file}: minifying changed the token count (${toks.length} -> ${again.length})`);
    for (let i = 0; i < toks.length; i++) {
      if (again[i].type !== toks[i].type || again[i].text !== toks[i].text) die(`${file}: minifying changed token ${i} (${toks[i].text} -> ${again[i].text})`);
      if (i && LT.test(src.slice(toks[i - 1].end, toks[i].start)) !== LT.test(out.slice(again[i - 1].end, again[i].start))) die(`${file}: minifying moved a line break at token ${i}`);
    }
    return out + "\n";
  }

  function declaredNames(ast) {
    const out = new Set();
    walk(ast, (n) => {
      if ((n.type === "FunctionDeclaration" || n.type === "FunctionExpression") && n.id) out.add(n.id.name);
      if (n.type === "VariableDeclarator" && n.id.type === "Identifier") out.add(n.id.name);
      if ((n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression")) n.params.forEach((p) => p.type === "Identifier" && out.add(p.name));
      if (n.type === "CatchClause" && n.param && n.param.type === "Identifier") out.add(n.param.name);
    });
    return out;
  }
  function stripDevBlocks(file, src) {
    const marks = [];
    acorn.parse(src, Object.assign({}, PARSE, { onComment: (block, text, start, end) => {
      if (/^\s*@dev-only\b/.test(text)) marks.push({ kind: "start", start, end });
      else if (/^\s*@end-dev-only\b/.test(text)) marks.push({ kind: "end", start, end });
    } }));
    if (!marks.length) return src;
    const cuts = [];
    for (let i = 0; i < marks.length; i += 2) {
      const a = marks[i], b = marks[i + 1];
      if (a.kind !== "start" || !b || b.kind !== "end") die(`${file}: @dev-only markers do not pair up (start, end, start, end …)`);
      let frag;
      try { frag = acorn.parse(src.slice(a.end, b.start), Object.assign({}, PARSE, { allowReturnOutsideFunction: true })); } catch (e) { die(`${file}: a @dev-only block is not whole statements (${e.message})`); }
      const top = new Set();
      for (const s of frag.body) {
        if (s.type === "FunctionDeclaration") top.add(s.id.name);
        if (s.type === "VariableDeclaration") s.declarations.forEach((d) => d.id.type === "Identifier" && top.add(d.id.name));
      }
      cuts.push({ at: a.start, del: b.end - a.start, ins: "", names: [...top] });
    }
    const names = cuts.flatMap((c) => c.names);
    const out = applyEdits(src, cuts.map((c) => ({ at: c.at, del: c.del, ins: c.ins })));
    let ast;
    try { ast = acorn.parse(out, PARSE); } catch (e) { die(`${file}: does not parse once its @dev-only blocks are cut (${e.message})`); }
    const declared = declaredNames(ast), used = new Set();
    walk(ast, (n, p) => { if (n.type === "Identifier" && !(p && p.type === "MemberExpression" && p.property === n && !p.computed) && !(p && p.type === "Property" && p.key === n && !p.computed)) used.add(n.name); });
    const dangling = names.filter((n) => used.has(n) && !declared.has(n));
    if (dangling.length) die(`${file}: code outside a @dev-only block still uses what the block declared: ${dangling.join(", ")}`);
    stats.devBlocks += cuts.length;
    return out;
  }
  function stripConsole(file, src) {
    const edits = [];
    walk(acorn.parse(src, PARSE), (n) => {
      const c = n.type === "ExpressionStatement" && n.expression.type === "CallExpression" ? n.expression.callee : null;
      if (c && c.type === "MemberExpression" && !c.computed && c.object.type === "Identifier" && c.object.name === "console" && c.property.type === "Identifier") {
        edits.push({ at: n.expression.start, del: n.expression.end - n.expression.start, ins: "void 0" });
      }
    });
    stats.consoleCalls += edits.length;
    return edits.length ? applyEdits(src, edits) : src;
  }
  const cleanJs = (file, src) => minify(file, stripConsole(file, stripDevBlocks(file, src)));

  function cleanHtml(file, s) {
    const out = s.replace(/<!--[\s\S]*?-->[ \t]*\n?/g, "");
    if (/<!--|-->/.test(out)) die(`${file}: an HTML comment is left after stripping`);
    return out;
  }
  function cssScan(s, onComment) {
    let out = "", i = 0, braces = 0, semis = 0, left = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '"' || c === "'") {
        let j = i + 1;
        while (j < s.length && s[j] !== c) { if (s[j] === "\\") j++; if (s[j] === "\n") die("a CSS string runs past the end of its line"); j++; }
        out += s.slice(i, j + 1); i = j + 1; continue;
      }
      if (/^url\(/i.test(s.slice(i, i + 4)) && !/^url\(\s*["']/i.test(s.slice(i, i + 12))) {
        const j = s.indexOf(")", i);
        if (j < 0) die("an unclosed url( in CSS");
        out += s.slice(i, j + 1); i = j + 1; continue;
      }
      if (c === "/" && s[i + 1] === "*") {
        const j = s.indexOf("*/", i + 2);
        if (j < 0) die("an unclosed CSS comment");
        left++;
        out += onComment(out, s[j + 2] || ""); i = j + 2; continue;
      }
      if (c === "{" || c === "}") braces++;
      if (c === ";") semis++;
      out += c; i++;
    }
    return { out, braces, semis, comments: left };
  }
  function cleanCss(file, s) {
    const a = cssScan(s, (before, next) => (/[\w-]$/.test(before) && /[\w-]/.test(next) ? " " : ""));
    const out = a.out.replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").replace(/^\n/, "");
    const b = cssScan(out, () => "");
    if (b.comments !== 0 || a.braces !== b.braces || a.semis !== b.semis) die(`${file}: stripping CSS comments changed its structure ({} ${a.braces}->${b.braces}, ; ${a.semis}->${b.semis}, comments left ${b.comments})`);
    return out;
  }

  const NOTE_KEY = /^(?:_?notes?|_?comments?|\/\/|_?todo|_?doc|_?readme|_?why)$/i;
  function cleanJson(file, s) {
    let j;
    try { j = JSON.parse(s); } catch (e) { die(`${file}: does not parse as JSON (${e.message})`); }
    let cut = 0;
    const drop = (v) => {
      if (Array.isArray(v)) return v.map(drop);
      if (!v || typeof v !== "object") return v;
      const o = {};
      for (const k of Object.keys(v)) { if (NOTE_KEY.test(k)) { cut++; continue; } o[k] = drop(v[k]); }
      return o;
    };
    const out = drop(j);
    if (!cut) return s;
    const text = JSON.stringify(out, null, /\n\s/.test(s) ? 2 : 0) + "\n";
    const back = JSON.parse(text);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const before = cut; cut = 0;
    const again = drop(back);
    if (!same(back, out) || cut !== 0 || !same(again, back)) die(`${file}: removing its note keys did not prove out`);
    cut = before;
    stats.jsonNotes = (stats.jsonNotes || 0) + cut;
    return text;
  }

  return { PARSE, stats, walk, applyEdits, tokens, minify, stripDevBlocks, stripConsole, cleanJs, cleanHtml, cleanCss, cleanJson, NOTE_KEY };
};
