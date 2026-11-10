(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = { get: k => { try { return localStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch {} } };

  const DATA = PARTICIPANTES.map((p, id) => ({
    ...p, id,
    faltan: [!p.ci && "C.I.", !p.celular && "celular", !p.ue && "unidad educativa"].filter(Boolean),
    texto: norm([p.nombre, p.ci, p.celular, p.deposito, p.ue, p.curso, p.grupo].join(" "))
  }));
  const CURSOS = [...new Set(DATA.map(p => p.curso))];
  const cls = c => "c" + (CURSOS.indexOf(c) + 1);
  const corto = c => /^Desarrollo/.test(c) ? "Desarrollo de habilidades" : /^Estimulación/.test(c) ? "Estimulación oportuna" : "Dinamizando";
  const fecha = s => { const [d, h] = s.split(" "), [y, m, dd] = d.split("-"); return `${dd}/${m}/${y} ${h}`; };
  const iniciales = n => n.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join("").toUpperCase() || n[0];
  const titulo = s => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase()).replace(/\b(De|Del|La|Las|Los|Y)\b/g, m => m.toLowerCase());
  const porCi = DATA.reduce((m, p) => (p.ci && (m[p.ci] ||= []).push(p), m), {});
  const personas = new Set(DATA.map(p => p.ci || p.nombre)).size;

  const S = { q: "", c: "", g: "", u: "", e: "", k: "nombre", d: 1 };
  let lista = [], ultimoFoco = null, t;

  // ---------- Estado en la URL (compartible) ----------
  const guardar = () => {
    const p = new URLSearchParams(Object.entries(S).filter(([k, v]) => v && !["k", "d"].includes(k)));
    history.replaceState(null, "", p.toString() ? "#" + p : location.pathname + location.search);
  };
  const leer = () => { new URLSearchParams(location.hash.slice(1)).forEach((v, k) => k in S && (S[k] = v)); };

  // ---------- Resaltado tolerante a tildes ----------
  function resaltar(texto, terms) {
    const chars = [...texto || ""], n = chars.map(c => norm(c)[0] || c).join("");
    const r = [];
    terms.forEach(t => { for (let i = n.indexOf(t); t && i > -1; i = n.indexOf(t, i + t.length)) r.push([i, i + t.length]); });
    if (!r.length) return esc(texto);
    r.sort((a, b) => a[0] - b[0]);
    const m = [r[0]];
    r.slice(1).forEach(x => x[0] <= m.at(-1)[1] ? m.at(-1)[1] = Math.max(m.at(-1)[1], x[1]) : m.push(x));
    let out = "", pos = 0;
    m.forEach(([a, b]) => { out += esc(chars.slice(pos, a).join("")) + "<mark>" + esc(chars.slice(a, b).join("")) + "</mark>"; pos = b; });
    return out + esc(chars.slice(pos).join(""));
  }

  // ---------- Render ----------
  function pintarStats() {
    const inc = DATA.filter(p => p.faltan.length).length;
    $("stats").innerHTML = [
      ["Participantes", personas], ["Registros recientes", DATA.filter(p => p.reciente).length], ["Cursos", CURSOS.length],
      ["Unidades educativas", new Set(DATA.map(p => p.ue).filter(Boolean)).size]
    ].map(([l, v]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("") +
      `<button class="stat alerta" id="inc" type="button"><b>${inc}</b><span>Con datos incompletos · ver</span></button>`;
    $("inc").onclick = () => { S.e = S.e ? "" : "sinCel"; if (S.e) { S.c = S.g = S.u = ""; } sincronizar(); filtrar(); };
  }
  function pintarCursos() {
    const base = [["", "Todos", DATA.length], ...CURSOS.map(c => [c, corto(c), DATA.filter(p => p.curso === c).length])];
    $("cursos").innerHTML = base.map(([v, l, n]) => `<button role="tab" type="button" data-v="${esc(v)}" aria-selected="${S.c === v}">${l}<small>${n}</small></button>`).join("");
  }
  function opciones(sel, titulo_, vals) {
    sel.innerHTML = `<option value="">${titulo_}</option>` + vals.map(v => `<option value="${esc(v)}">${esc(titulo(v))}</option>`).join("");
  }
  function sincronizar() {
    $("q").value = S.q; $("g").value = S.g; $("u").value = S.u; $("e").value = S.e; pintarCursos();
    document.querySelectorAll("th").forEach(th => th.setAttribute("aria-sort", th.dataset.k === S.k ? (S.d > 0 ? "ascending" : "descending") : "none"));
  }

  function filtrar() {
    const terms = norm(S.q).split(/\s+/).filter(Boolean);
    lista = DATA.filter(p => terms.every(x => p.texto.includes(x)) && (!S.c || p.curso === S.c) && (!S.g || p.grupo === S.g) && (!S.u || p.ue === S.u) &&
      (S.e !== "sinCel" || !p.celular) && (S.e !== "sinUe" || !p.ue) && (S.e !== "sinCi" || !p.ci) && (S.e !== "reciente" || p.reciente));
    if (S.e === "reciente") { S.k = "reciente"; S.d = -1; }
    lista.sort((a, b) => String(a[S.k] || "￿").localeCompare(String(b[S.k] || "￿"), "es", { numeric: true }) * S.d);
    $("filas").innerHTML = lista.map(p => `<tr data-id="${p.id}" tabindex="0">
      <td><div class="who"><span class="av ${cls(p.curso)}">${esc(iniciales(p.nombre))}</span><div>
        <span class="nm">${resaltar(titulo(p.nombre), terms)}${p.reciente ? '<span class="nuevo">Nuevo</span>' : ""}</span>
        <span class="sub">${p.ci ? "C.I. " + resaltar(p.ci, terms) : '<span class="falta">Sin C.I.</span>'}</span></div></div></td>
      <td><span class="dot ${cls(p.curso)}">${corto(p.curso)}</span></td>
      <td>${p.ue ? resaltar(titulo(p.ue), terms) : '<span class="falta">Sin unidad educativa</span>'}</td>
      <td class="mut">${esc(p.grupo)}</td>
      <td class="num mut">${p.celular ? resaltar(p.celular, terms) : "—"}</td></tr>`).join("");
    $("vacio").hidden = lista.length > 0;
    $("contador").textContent = `${lista.length} de ${DATA.length} inscripciones`;
    guardar();
  }

  // ---------- Detalle ----------
  const toast = m => { const e = $("toast"); e.textContent = m; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 1600); };
  function abrir(p, fila) {
    ultimoFoco = fila;
    const otras = (porCi[p.ci] || []).filter(x => x !== p);
    const comp = p.compartido ? DATA.filter(x => x.deposito === p.deposito).length - 1 : 0;
    const tel = p.celular.replace(/\D/g, ""), wa = tel.length === 8 ? "591" + tel : tel;
    const cp = v => v ? `<button class="mini" type="button" data-copy="${esc(v)}">Copiar</button>` : "";
    const f = (t, v, extra = "") => `<div class="f"><dt>${t}</dt><dd>${v ? v + extra : '<span class="falta">No registrado</span>'}</dd></div>`;
    $("detalle").innerHTML = `<span class="av ${cls(p.curso)}">${esc(iniciales(p.nombre))}</span>
      <h2>${esc(titulo(p.nombre))}</h2><span class="dot ${cls(p.curso)}">${corto(p.curso)}</span><span class="badge">${esc(p.grupo)}</span>
      <dl>${f("Curso", esc(p.curso))}${f("Unidad educativa", esc(titulo(p.ue)))}${f("C.I.", esc(p.ci), cp(p.ci))}
      ${f("Celular", p.celular && `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(p.celular)}</a>`, cp(p.celular))}
      ${p.reciente ? f("Registrado por formulario", esc(fecha(p.reciente))) : ""}${f("Nº de depósito", esc(p.deposito))}${f("Monto", p.monto != null && "Bs " + p.monto)}</dl>
      ${comp ? `<div class="aviso">Depósito compartido con ${comp} participante(s) más (pago grupal).</div>` : ""}
      ${p.faltan.length ? `<div class="aviso">Datos faltantes: ${p.faltan.join(", ")}.</div>` : ""}
      ${otras.map(o => `<div class="otra"><strong>También inscrita/o en</strong><br>${esc(o.curso)}<br><span class="mut">${esc(o.grupo)} · ${esc(titulo(o.ue) || "sin unidad")}</span></div>`).join("")}`;
    $("panel").classList.add("on"); $("panel").setAttribute("aria-hidden", "false"); $("velo").hidden = false; $("cerrar").focus();
  }
  function cerrar() {
    $("panel").classList.remove("on"); $("panel").setAttribute("aria-hidden", "true"); $("velo").hidden = true;
    ultimoFoco && ultimoFoco.focus();
  }

  // ---------- Eventos ----------
  const aplicar = () => { sincronizar(); filtrar(); };
  $("q").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { S.q = e.target.value; filtrar(); }, 90); });
  [["g"], ["u"], ["e"]].forEach(([k]) => $(k).addEventListener("change", e => { S[k] = e.target.value; aplicar(); }));
  $("cursos").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { S.c = b.dataset.v; aplicar(); } });
  $("limpiar").onclick = () => { Object.assign(S, { q: "", c: "", g: "", u: "", e: "" }); aplicar(); $("q").focus(); };
  $("filas").addEventListener("click", e => { const tr = e.target.closest("tr"); tr && abrir(DATA[tr.dataset.id], tr); });
  $("filas").addEventListener("keydown", e => {
    const tr = e.target.closest("tr"); if (!tr) return;
    if (e.key === "Enter") tr.click();
    if (e.key === "ArrowDown") { e.preventDefault(); (tr.nextElementSibling || tr).focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); tr.previousElementSibling ? tr.previousElementSibling.focus() : $("q").focus(); }
  });
  $("q").addEventListener("keydown", e => { if (e.key === "ArrowDown") { e.preventDefault(); $("filas").firstElementChild?.focus(); } });
  $("cerrar").onclick = $("velo").onclick = cerrar;
  $("detalle").addEventListener("click", e => { const b = e.target.closest("[data-copy]"); if (b) navigator.clipboard?.writeText(b.dataset.copy).then(() => toast("Copiado"), () => toast("No se pudo copiar")); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && $("panel").classList.contains("on")) cerrar();
    if (e.key === "/" && !/INPUT|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $("q").focus(); $("q").select(); }
  });
  document.querySelectorAll("th").forEach(th => th.onclick = () => { S.d = S.k === th.dataset.k ? -S.d : 1; S.k = th.dataset.k; aplicar(); });
  $("tema").onclick = () => { const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = n; store.set("tema", n); };
  $("imprimir").onclick = () => print();
  $("csv").onclick = () => {
    const cols = ["nombre", "ci", "curso", "grupo", "ue", "celular", "deposito", "monto"], q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const csv = [cols.join(",")].concat(lista.map(p => cols.map(c => q(p[c])).join(","))).join("\r\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })), download: "participantes.csv" });
    a.click(); URL.revokeObjectURL(a.href);
  };

  // ---------- Inicio ----------
  opciones($("g"), "Todos los grupos", [...new Set(DATA.map(p => p.grupo))].sort());
  opciones($("u"), "Todas las unidades", [...new Set(DATA.map(p => p.ue).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")));
  leer(); pintarStats(); aplicar();
})();
