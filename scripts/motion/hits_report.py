"""Prints each video's energy map next to the hit times measured in the rendered mix, plus cost/time.

  .venv/bin/python scripts/motion/hits_report.py
"""
import json

report = json.load(open("out/five/report.json"))
total_cost = 0.0
for slug, r in report.items():
    if "energy_map" not in r:
        print(f"\n## {slug}: {r.get('error', 'no result')}")
        continue
    e = r["energy_map"]
    print(f"\n## {r['brand']} ({slug}) — {r['format']} {r['length_s']}s {r['dialect']} · {e['bpm']} BPM · status {r['status']}")
    print(f"   motion language: {r['motion_language']} · nearest previous treatment similarity {r['similarity_to_nearest_previous']}")
    print("   sections: " + " | ".join(f"{s['kind']} {s['start_s']:.2f}-{s['end_s']:.2f}" for s in e["sections"]))
    measured = r.get("measured_hits") or []
    print(f"   {'kind':<8}{'planned s':>10}{'measured s':>12}{'Δ ms':>8}")
    # measure_hits.py returns one row per planned hit, in order (onset searched within ±200 ms).
    for h, m in zip(e["hits"], measured + [None] * (len(e["hits"]) - len(measured))):
        mt = m["measured_s"] if m else None
        delta = f"{m['offset_ms']:+.1f}" if m else "—"
        print(f"   {h['kind']:<8}{h['t']:>10.3f}{(f'{mt:.3f}' if mt is not None else '—'):>12}{delta:>8}")
    loud = r.get("loudness") or {}
    print(f"   loudness: {loud.get('mix_lufs')} LUFS, peak {loud.get('mix_peak_dbfs')} dBFS")
    print(f"   QA rounds: " + ", ".join(f"r{q['round']} {'PASS' if q['pass'] else 'fail'} ({q['score']})" for q in r["qa_rounds"]))
    print(f"   cost ${r['cost_usd']:.3f} " + json.dumps(r["cost_by_step"]) + f" · generate {r['generate_seconds']}s · render {r['render_seconds']}s · total {r['total_seconds']}s")
    total_cost += r["cost_usd"]
print(f"\nTotal AI cost: ${total_cost:.3f}")
