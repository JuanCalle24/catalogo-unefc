# Cruza las respuestas del formulario (Excel) con datos.js (por C.I.) y marca "reciente".
# Uso: python actualizar.py <archivo.xlsx> [--datos datos.js] [--escribir]
import openpyxl, re, json, unicodedata, sys
args = sys.argv[1:]
F = next((a for a in args if not a.startswith("-")), None)
D = args[args.index("--datos") + 1] if "--datos" in args else "datos.js"
if not F:
    sys.exit("uso: python actualizar.py <archivo.xlsx> [--datos datos.js] [--escribir]")
cl = lambda v: re.sub(r"\s+", " ", str(v)).strip() if v not in (None, "") else ""
def ci(v):
    m = re.match(r"\s*(\d{5,9})", cl(v).replace(".0", "") if isinstance(v, float) else cl(v)); return m.group(1) if m else ""
def num(v): return str(int(v)) if isinstance(v, (int, float)) else re.sub(r"\D", "", cl(v))
def base(s): return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")
def ue(v):
    s = cl(v).strip(" \"'/")
    s = re.sub(r"^(UNIDAD EDUCATIVA|U\.\s*E\.?)\s*", "", s, flags=re.I).strip(" \"")
    return s.upper()
src = open(D, encoding="utf-8").read()
datos = json.loads(src[src.index("["):src.rindex("]") + 1])
for p in datos: p.pop("reciente", None)
conocidas = {p["ue"] for p in datos if p["ue"]}
def unidad(u):
    b = base(u)
    for k in conocidas:
        kb = base(k).replace('"', "")
        if kb == b or kb.startswith(b) or b.startswith(kb): return k
    return u
ws = openpyxl.load_workbook(F, data_only=True).worksheets[0]
log = []
for r in list(ws.iter_rows(min_row=2, values_only=True)):
    if not r[0]: continue
    c = ci(r[4]); cel = num(r[5]); u = unidad(ue(r[6])); ts = r[0].strftime("%Y-%m-%d %H:%M")
    nombre = cl(" ".join([cl(r[1]), cl(r[2]), cl(r[3])])).upper()
    hits = [p for p in datos if c and p["ci"] == c]
    if hits:
        for p in hits:
            p["celular"] = cel or p["celular"]; p["ue"] = u or p["ue"]; p["reciente"] = ts
        log.append(("ACTUALIZADO", c, nombre, len(hits), u))
    else:
        datos.append(dict(nombre=nombre, ci=c, deposito="", monto=None, curso="", ue=u, celular=cel, grupo="Sin grupo", compartido=False, reciente=ts))
        log.append(("NUEVO (revisar)", c, nombre, 0, u))
for l in log: print(*l, sep=" | ")
if "--escribir" in args:
    open(D, "w", encoding="utf-8").write("const PARTICIPANTES = " + json.dumps(datos, ensure_ascii=False, indent=0) + ";\n")
    print("escrito", len(datos), "en", D)
