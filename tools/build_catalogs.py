"""Build the app's catalog data from the 2023 authoring files.

Run from the repo root:  python tools/build_catalogs.py

Inputs (_authoring/):
  proplyds_data(150).ts, jumbo_data(42).ts
      The exact tables the 2023 app plotted. Their RA/Dec already include the
      small offsets applied by datamod.py (see _authoring/README.txt), so the
      markers land where they did in 2023.
  proplyds/heic0917*.tif
      30 HST proplyd cutouts (ESA/Hubble heic0917). Each TIFF's XMP dc:title is
      the proplyd's name and its ImageDescription is ESA's caption.

Outputs:
  src/data/proplyds.json  [{name, ra, dec, dark, cutout?, caption?}]
  src/data/jumbos.json    [{name, ra, dec, masses_mjup: [..], sep_au}]
  public/cutouts/<name>.webp
"""
import csv
import io
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
AUTH = ROOT / "_authoring"
MSUN_TO_MJUP = 1047.57


def csv_rows_from_ts(path: Path):
    text = path.read_text(encoding="utf-8")
    body = text[text.index("`") + 1:text.rindex("`")].strip()
    return list(csv.reader(io.StringIO(body)))


def tiff_meta(path: Path):
    im = Image.open(path)
    title = caption = ""
    for key, value in im.tag_v2.items():
        if key == 270:  # ImageDescription
            caption = str(value)
        if key == 700:  # XMP
            xmp = value.decode("utf-8", "replace") if isinstance(value, bytes) else str(value)
            m = re.search(r"<dc:title>.*?<rdf:li[^>]*>(.*?)</rdf:li>", xmp, re.S)
            if m:
                title = m.group(1).strip()
    # The TIFFs store UTF-8 text in a Latin-1 tag; repair the mojibake.
    try:
        caption = caption.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return im, title, " ".join(caption.split())


def key(name: str) -> str:
    """Normalize a proplyd designation for matching HST titles to the catalog.

    Designations are RA-Dec coordinate names (O'Dell & Wen). Safe variants only:
    - dark proplyds carry a "d" prefix in the catalog but not in HST titles;
    - an E/W suffix marks one component of a pair (177-341E -> 177-341);
    - the Dec field may carry an extra precision digit (132-1832 -> 132-183).
    Near-misses such as 109-246 vs 109-247 are left unmatched on purpose.
    """
    k = name.lower().lstrip("d").rstrip("ew")
    ra, _, dec = k.partition("-")
    return f"{ra}-{dec[:3]}" if dec else ra


def main():
    out_data = ROOT / "src" / "data"
    out_cut = ROOT / "public" / "cutouts"
    out_data.mkdir(parents=True, exist_ok=True)
    out_cut.mkdir(parents=True, exist_ok=True)

    cutouts = {}
    for tif in sorted((AUTH / "proplyds").glob("heic0917*.tif")):
        im, title, caption = tiff_meta(tif)
        if not title:
            continue
        fname = re.sub(r"[^A-Za-z0-9-]", "_", title) + ".webp"
        cutouts[key(title)] = {"cutout": f"cutouts/{fname}", "caption": caption, "hst": title, "image": im}

    rows = csv_rows_from_ts(AUTH / "proplyds_data(150).ts")
    proplyds = []
    matched = 0
    for name, ra, dec in (r[:3] for r in rows[1:]):
        rec = {"name": name, "ra": float(ra), "dec": float(dec), "dark": name.lower().startswith("d")}
        c = cutouts.get(key(name))
        if c:
            # Only cutouts that match a plotted proplyd are written (and shipped).
            c["image"].convert("RGB").save(ROOT / "public" / c["cutout"], "WEBP", quality=88, method=6)
            rec.update(cutout=c["cutout"], caption=c["caption"])
            matched += 1
        proplyds.append(rec)

    rows = csv_rows_from_ts(AUTH / "jumbo_data(42).ts")
    jumbos = []
    for r in rows[1:]:
        # Flattened two-row header; by value the columns after DEC are:
        # primary M (Msun), primary Av, secondary M, secondary Av,
        # projected separation (au), tertiary M, tertiary Av.
        name, ra, dec = r[0], float(r[1]), float(r[2])
        masses = [float(r[3]), float(r[5])]
        if len(r) > 8 and r[8] not in ("", "-"):
            masses.append(float(r[8]))
        jumbos.append({
            "name": name, "ra": ra, "dec": dec,
            "massesMjup": [round(m * MSUN_TO_MJUP, 1) for m in masses],
            "sepAu": float(r[7]),
        })

    (out_data / "proplyds.json").write_text(json.dumps(proplyds, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (out_data / "jumbos.json").write_text(json.dumps(jumbos, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"proplyds: {len(proplyds)} ({matched} with HST cutouts of {len(cutouts)}); jumbos: {len(jumbos)}")


if __name__ == "__main__":
    main()
