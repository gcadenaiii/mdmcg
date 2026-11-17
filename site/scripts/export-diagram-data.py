"""Write the two small data files the site's diagrams are drawn from.

    src/data/chest.json   one scanned chest (outlines measured on the scan), the wearing rule and the device's footprint
    src/data/field.json   the heart twin's computed field over the front of the chest at one instant, and the size of the beat

Nothing is computed here: every number is copied from the research app's own exported data
(app/public/data/...), which is what the app's pictures are drawn from. Run from the repository root:

    .venv-twin/Scripts/python website/site/scripts/export-diagram-data.py
"""
import array
import json
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
APP = os.path.join(ROOT, "app", "public", "data")
OUT = os.path.join(ROOT, "website", "site", "src", "data")

BODY_KEY = "typical_man"   # the app's default body (app/src/sensors/Explore.tsx)
OPTION_KEY = "a"           # the recommended option, the device drawn in the app's default view
CONDUCTOR = "geselowitz"   # the chest with its lungs and blood pools: the app's default map


def load(*parts):
    with open(os.path.join(APP, *parts), encoding="utf-8") as f:
        return json.load(f)


def chest():
    anatomy = load("design", "anatomy.json")
    design = load("design", "design.json")
    assert anatomy["label"].startswith("MEASURED"), anatomy["label"]
    assert design["label"].startswith("SIMULATED"), design["label"]
    body = next(b for b in anatomy["bodies"] if b["key"] == BODY_KEY)
    who = next(b for b in design["bodies"] if b["key"] == BODY_KEY)
    assert who["id"] == body["id"]
    pl = design["placement"]
    version = next(v for v in design["product"]["versions"] if v["key"] == OPTION_KEY)
    core = version["core"]
    # the position the app draws the device at: the rule, measured from this body's own landmark
    at = body["places"]["rule"]
    lm = body["landmark"]
    assert abs((at["up_mm"] - lm["up_mm"]) - pl["above_cm"] * 10) < 0.05
    assert abs((at["left_mm"] - lm["left_mm"]) - pl["left_cm"] * 10) < 0.05
    assert anatomy["rule"]["above_mm"] == pl["above_cm"] * 10
    # the wings, lobes and top tab: app/src/sensors/viewers.ts wingPlan(), evaluated for this core
    dx = core["w"] / 2 - 16
    zr = 9 + (core["l"] - 60) / 4
    doc = {
        "note": (
            "One scanned chest drawn from the front, upright. Body: '%s' (%s), public CT scan %s of the design study's set, "
            "outlines MEASURED on the scan's segmentation masks; copied unchanged from app/public/data/design/anatomy.json "
            "(made %s by exploration/pocket_card/app_anatomy_export.py). The wearing rule, its tolerance and the device's "
            "footprint are copied from app/public/data/design/design.json (made %s; placement: %s). The rule and the tolerance "
            "are SIMULATED results; the device is a PROPOSAL (option %s, %s). Nothing here is measured on a person wearing a device."
            % (who["label"], who["rule"], body["id"], anatomy["made"], design["made"], pl["source"], version["option"], version["name"])
        ),
        "sources": {
            "anatomy": "app/public/data/design/anatomy.json",
            "design": "app/public/data/design/design.json",
            "device_shape": "app/src/sensors/viewers.ts (wingPlan) and app/src/sensors/PlacementStage.tsx (DeviceFlat)",
        },
        "frame": anatomy["frame"],
        "body": {"key": body["key"], "id": body["id"], "label": who["label"], "chosen_as": who["rule"]},
        "window": body["window"],
        "landmark": {"left_mm": lm["left_mm"], "up_mm": lm["up_mm"], "name": pl["landmark"]["name"], "where": pl["landmark"]["where"]},
        "rule": {
            "above_cm": pl["above_cm"],
            "left_cm": pl["left_cm"],
            "within_cm": pl["within_cm"],
            "text": pl["text"],
            "tolerance_text": pl["tolerance_text"],
        },
        "device_at": {"left_mm": at["left_mm"], "up_mm": at["up_mm"]},
        "device": {
            "option": version["option"],
            "name": version["name"],
            "core": {"w": core["w"], "l": core["l"], "r": core["r"]},
            "wing": {"dx": dx, "zr": zr, "lobe_x": 50 + dx, "lobe_z": zr + 18.3, "lobe_r": 11, "pad_r": 8},
        },
        "front": {k: body["front"][k] for k in ("body", "heart", "ribs", "cartilage", "clavicles", "sternum")},
    }
    return doc


def field():
    base = "zenodo_heart_refit"
    meta = load(base, "meta.json")
    sensor = load(base, "sensor.json")
    assert meta["label"] == "SIMULATED" and sensor["label"] == "SIMULATED"
    cm = sensor["chest_map"]
    name = sensor["files"]["traces"][CONDUCTOR]
    info = meta["files"][name]
    n, n_frames = info["shape"]
    assert n == cm["n"] and n_frames == meta["n_frames"]
    a = array.array("f")
    with open(os.path.join(APP, base, name), "rb") as f:
        a.frombytes(f.read())
    assert len(a) == n * n_frames
    excluded = set(cm["excluded_indices"])
    # the instant: the frame at the model's R peak, which is also where the map is largest
    frame = min(range(n_frames), key=lambda k: abs(meta["frame_times_ms"][k] - meta["r_peak_ms"]))
    peak, peak_frame = 0.0, 0
    for i in range(n):
        if i in excluded:
            continue
        for k in range(n_frames):
            v = abs(a[i * n_frames + k])
            if v > peak:
                peak, peak_frame = v, k
    assert peak_frame == frame, (peak_frame, frame)
    pp = cm["qrs_pp_pT"][CONDUCTOR]
    best = cm["best_index"][CONDUCTOR]
    # the saved beat size must be the traces' own peak to peak
    tr = a[best * n_frames:(best + 1) * n_frames]
    assert abs((max(tr) - min(tr)) - pp[best]) < 1e-2
    mm = lambda v: round(v * 1000, 1)
    doc = {
        "note": (
            "SIMULATED, not measured. The heart twin '%s' (%s): its one computed heartbeat, the magnetic field %s, at %d "
            "positions %g mm apart on a smooth stand-in for the front of the chest, %g mm off it, computed with %s. "
            "'instant' is frame %d of %d of that beat, t = %g ms, the model's R peak (meta.json r_peak_ms) and the frame at which the "
            "map is largest. 'beat_size_pT' is each position's peak-to-peak over the main spike (sensor.json chest_map.qrs_pp_pT). "
            "Positive values are drawn as 'out of the chest', negative as 'into the chest', as the research app's own key does. "
            "Position %s is left out by the study's own rule (%s). Copied from app/public/data/%s/sensor.json, meta.json and %s "
            "(exported %s by %s; study: %s, %s)."
            % (
                meta["case"], meta["case_description"], cm["component"], n, cm["pitch_m"] * 1000, cm["standoff_m"] * 1000,
                sensor["models"][CONDUCTOR], frame, n_frames, meta["frame_times_ms"][frame],
                ", ".join(str(i) for i in sorted(excluded)), cm["exclusion_rule"], base, name, meta["exported"], meta["exporter"],
                sensor["study"]["name"], sensor["study"]["date"],
            )
        ),
        "sources": {
            "map": "app/public/data/%s/sensor.json" % base,
            "traces": "app/public/data/%s/%s" % (base, name),
            "time": "app/public/data/%s/meta.json" % base,
        },
        "frame": "front view, mm: left_mm toward the subject's left, up_mm toward the head",
        "pitch_mm": cm["pitch_m"] * 1000,
        "left_mm": [mm(v) for v in cm["x_m"]],
        "up_mm": [mm(v) for v in cm["z_m"]],
        "excluded": sorted(excluded),
        "instant": {
            "frame": frame,
            "t_ms": round(meta["frame_times_ms"][frame], 3),
            "peak_abs_pT": round(peak, 2),
            "pT": [round(a[i * n_frames + frame], 2) for i in range(n)],
        },
        "beat_size_pT": pp,
        "strongest": best,
        "torso": [[mm(x), mm(z)] for x, z in sensor["outlines_front_xz_m"]["torso"]],
        "heart": [[mm(x), mm(z)] for x, z in sensor["outlines_front_xz_m"]["heart"]],
    }
    return doc


def write(name, doc):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, ensure_ascii=True, separators=(",", ":"))
        f.write("\n")
    print(name, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    write("chest.json", chest())
    write("field.json", field())
