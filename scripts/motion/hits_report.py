"""Per video: concept, behaviors, calls (tokens + cache), AI cost, time to preview, energy map vs measured
hits; then p50 cost/time. Reads out/3c/report.json (Phase 3C) by default.

  .venv/bin/python scripts/motion/hits_report.py [out/3c/report.json]
"""
import json
import statistics
import sys

report = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "out/3c/report.json"))
costs, times = [], []
for slug, r in report.items():
    if "energy_map" not in r:
        print(f"\n## {slug}: {r.get('error', 'no result')}")
        continue
    e = r["energy_map"]
    print(f"\n## {r['brand']} ({slug}) — {r['format']} {r['length_s']}s {r['dialect']} · {e['bpm']} BPM · status {r['status']}")
    print(f"   concept: \"{r['motion_language']}\" — {r['concept']}")
    print(f"   nearest previous concept similarity {r['similarity_to_nearest_previous']} · concept redos {r.get('concept_redos', 0)}")
    print(f"   behaviors ({len(r['behaviors'])}): {', '.join(r['behaviors'])}")
    for c in r.get("calls", []):
        cw = f" (+{c['cache_write']} write)" if c.get("cache_write") else ""
        print(f"   call {c['kind']:<12} {c['model']:<12} in {c['in']:>5} + cached {c['cached']:>5}{cw:<14} out {c['out']:>5}  ${c['usd']:.4f}  {c['s']}s")
    v = r.get("validation", {})
    stages = " | ".join(f"{x['stage']}→{x['issues']}" for x in v.get("rounds", []))
    print(f"   validation: {stages} · remaining {len(v.get('remaining', []))}")
    print(f"   AI cost ${r['cost_usd']:.4f} (with background taste QA ${r['cost_with_taste_usd']:.4f}) · preview in {r['to_preview_s']}s · taste {r['taste']['score'] if r.get('taste') else '–'}/10")
    print("   sections: " + " | ".join(f"{s['kind']} {s['start_s']:.2f}-{s['end_s']:.2f}" for s in e["sections"]))
    measured = r.get("measured_hits") or []
    print(f"   {'kind':<8}{'planned s':>10}{'measured s':>12}{'Δ ms':>8}")
    for h, m in zip(e["hits"], measured + [None] * (len(e["hits"]) - len(measured))):
        mt = m["measured_s"] if m else None
        ms = f"{m['offset_ms']:+.1f}" if m else "—"
        mts = f"{mt:.3f}" if mt is not None else "—"
        print(f"   {h['kind']:<8}{h['t']:>10.3f}{mts:>12}{ms:>8}")
    a = r.get("audio", {})
    print(f"   audio: {a.get('lufs')} LUFS, peak {a.get('peak_dbfs')} dBFS, music {a.get('music_ms')} ms, {a.get('events')} SFX events · export {r.get('export', {}).get('seconds', '–')}s")
    costs.append(r["cost_usd"])
    times.append(r["to_preview_s"])
if costs:
    print(f"\np50 AI cost ${statistics.median(costs):.4f} (max ${max(costs):.4f}) · p50 time to preview {statistics.median(times):.1f}s (max {max(times):.1f}s) · {len(costs)} videos")
