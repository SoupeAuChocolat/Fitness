"""Convertit la table CIQUAL (ANSES, fichiers XML) en module JavaScript compact.

Source : table de composition nutritionnelle CIQUAL 2020, ANSES
(https://ciqual.anses.fr, copie : https://zenodo.org/records/4770600), licence ouverte.

Usage : python3 scripts/ciqual-to-js.py <dossier_xml> js/data/ciqual.js
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

KCAL, PROT, GLUC, LIP = '328', '25000', '31000', '40000'
KCAL_JONES = '333'  # énergie calculée autrement, utilisée si la valeur réglementaire manque
FIBRES, ALCOOL = '34100', '60000'
EXCLUDED_GROUPS = {'11'}  # aliments infantiles


def load(path):
    # les fichiers sont en windows-1252 et contiennent des « & » et « < » non échappés
    text = Path(path).read_bytes().decode('cp1252')
    text = re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#)', '&amp;', text)
    text = re.sub(r'<(?![A-Za-z/!?])', '&lt;', text)
    text = re.sub(r'<\?xml[^>]*\?>', '', text)
    return ET.fromstring(text)


def value(raw):
    """« 12,5 » → 12.5 ; « traces » ou « < 0,5 » → 0 ; « - » → None."""
    raw = (raw or '').strip()
    if raw in ('', '-'):
        return None
    if raw.lower() == 'traces' or raw.startswith('<'):
        return 0.0
    try:
        return float(raw.replace(',', '.'))
    except ValueError:
        return None


def main(src, out):
    src = Path(src)
    pick = lambda pattern: next(src.glob(pattern))
    groups = {}
    for g in load(pick('alim_grp_*.xml')):
        groups[g.findtext('alim_grp_code').strip()] = g.findtext('alim_grp_nom_fr').strip()

    foods = {}
    for a in load(pick('alim_2*.xml')):
        code = a.findtext('alim_code').strip()
        grp = a.findtext('alim_grp_code').strip()
        if grp in EXCLUDED_GROUPS:
            continue
        foods[code] = {'name': a.findtext('alim_nom_fr').strip(), 'grp': grp}

    for c in load(pick('compo_*.xml')):
        const = c.findtext('const_code').strip()
        if const not in (KCAL, KCAL_JONES, PROT, GLUC, LIP, FIBRES, ALCOOL):
            continue
        food = foods.get(c.findtext('alim_code').strip())
        if food is not None:
            food[const] = value(c.findtext('teneur'))

    group_codes = sorted({f['grp'] for f in foods.values()})
    rows = []
    for code, f in sorted(foods.items(), key=lambda kv: kv[1]['name'].lower()):
        kcal = f.get(KCAL) if f.get(KCAL) is not None else f.get(KCAL_JONES)
        if kcal is None and None not in (f.get(PROT), f.get(GLUC), f.get(LIP)):
            # coefficients du règlement UE 1169/2011
            kcal = 4 * f[PROT] + 4 * f[GLUC] + 9 * f[LIP] + 2 * (f.get(FIBRES) or 0) + 7 * (f.get(ALCOOL) or 0)
        if kcal is None:
            continue
        r = lambda v: None if v is None else round(v, 1)
        rows.append([int(code), f['name'], group_codes.index(f['grp']), round(kcal), r(f.get(PROT)), r(f.get(GLUC)), r(f.get(LIP))])

    names = [(groups.get(g) or 'divers')[0].upper() + (groups.get(g) or 'divers')[1:] for g in group_codes]
    body = ',\n'.join(json.dumps(row, ensure_ascii=False, separators=(',', ':')) for row in rows)
    Path(out).write_text(
        '// Généré par scripts/ciqual-to-js.py — ne pas modifier à la main.\n'
        '// Table CIQUAL 2020 (ANSES), valeurs pour 100 g, licence ouverte.\n'
        '// [code, nom, groupe, kcal, protéines g, glucides g, lipides g] (null = non renseigné)\n'
        f'export const CIQUAL_GROUPS = {json.dumps(names, ensure_ascii=False)};\n'
        f'export const CIQUAL = [\n{body},\n];\n',
        encoding='utf-8',
    )
    print(f'{len(rows)} aliments écrits dans {out}')


if __name__ == '__main__':
    main(*sys.argv[1:3])
