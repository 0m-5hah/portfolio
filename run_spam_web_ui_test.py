"""
Drive project-demos.html in a real Chromium window (Playwright), same as a user clicking Analyze.
Reads spam-web-test-corpus.txt, writes spam-ui-test-report.html, screenshots, optional session video.
"""
from __future__ import annotations

import html as html_lib
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, expect


ROOT = Path(__file__).resolve().parent
CORPUS = ROOT / "spam-web-test-corpus.txt"
DEMO_HTML = ROOT / "project-demos.html"
OUT_DIR = ROOT / "spam-ui-test-output"
SCREENSHOT_DIR = OUT_DIR / "screenshots"
VIDEO_DIR = OUT_DIR / "videos"
REPORT_HTML = OUT_DIR / "spam-ui-test-report.html"
LOG_TXT = OUT_DIR / "spam-ui-test-interactions.log"


def parse_corpus(path: Path) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    raw = path.read_text(encoding="utf-8")
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        parts = s.split("\t", 1)
        if len(parts) != 2:
            raise ValueError(f"Bad corpus line (need LABEL<TAB>message): {line[:80]!r}")
        label, msg = parts[0].strip().upper(), parts[1]
        if label not in ("HAM", "SPAM"):
            raise ValueError(f"Label must be HAM or SPAM, got {label!r}")
        rows.append((label, msg))
    return rows


def truth_matches_ui(truth: str, ui_label: str) -> bool:
    ui_spam = ui_label.strip() == "Spam"
    return (truth == "SPAM" and ui_spam) or (truth == "HAM" and not ui_spam)


def main() -> int:
    if not DEMO_HTML.is_file():
        print(f"Missing {DEMO_HTML}", file=sys.stderr)
        return 1
    rows = parse_corpus(CORPUS)
    if not rows:
        print("Corpus is empty.", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)

    demo_url = DEMO_HTML.as_uri()
    log_lines: list[str] = [
        f"Demo URL: {demo_url}",
        f"Cases: {len(rows)}",
        "",
    ]

    table_rows_html: list[str] = []
    correct = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=100)
        context = browser.new_context(
            viewport={"width": 1400, "height": 900},
            record_video_dir=str(VIDEO_DIR),
            record_video_size={"width": 1400, "height": 900},
        )
        page = context.new_page()

        page.goto(demo_url, wait_until="domcontentloaded")

        for i, (truth, message) in enumerate(rows, start=1):
            page.locator("#clear-btn").click()
            page.locator("#spam-input").fill(message)
            page.locator("#analyze-btn").click()

            pred = page.locator("#prediction-text")
            expect(pred).to_have_text(re.compile(r"^(Spam|Not spam)$"), timeout=8000)
            verdict = pred.inner_text().strip()
            conf = page.locator("#confidence-text").inner_text().strip()

            ok = truth_matches_ui(truth, verdict)
            if ok:
                correct += 1

            shot = SCREENSHOT_DIR / f"{i:03d}.png"
            page.screenshot(path=str(shot), full_page=True)

            rel_shot = shot.relative_to(OUT_DIR).as_posix()
            safe_msg = html_lib.escape(message[:500] + ("…" if len(message) > 500 else ""))
            status = "match" if ok else "mismatch"
            log_lines.append(f"--- #{i} ({status}) ground_truth={truth} ---")
            log_lines.append(f"message: {message}")
            log_lines.append(f"UI: {verdict}  likelihood: {conf}")
            log_lines.append("")

            row_cls = "ok" if ok else "bad"
            table_rows_html.append(
                f'<tr class="{row_cls}">'
                f"<td>{i}</td>"
                f"<td><code>{html_lib.escape(truth)}</code></td>"
                f"<td class=\"msg\">{safe_msg}</td>"
                f"<td>{html_lib.escape(verdict)}</td>"
                f"<td>{html_lib.escape(conf)}</td>"
                f"<td>{'Yes' if ok else 'No'}</td>"
                f'<td><a href="{html_lib.escape(rel_shot)}">screenshot</a></td>'
                f"</tr>"
            )

        context.close()
        browser.close()

    LOG_TXT.write_text("\n".join(log_lines), encoding="utf-8")

    pct = 100.0 * correct / len(rows) if rows else 0.0
    report = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Spam web UI test — ground truth vs rules demo</title>
<style>
body {{ font-family: system-ui, sans-serif; margin: 24px; background: #0f1419; color: #e6edf3; }}
h1 {{ font-size: 1.25rem; }}
.meta {{ color: #8b949e; margin-bottom: 1rem; }}
table {{ border-collapse: collapse; width: 100%; font-size: 0.9rem; }}
th, td {{ border: 1px solid #30363d; padding: 8px 10px; vertical-align: top; }}
th {{ background: #161b22; text-align: left; }}
tr.ok td {{ background: rgba(46, 160, 67, 0.12); }}
tr.bad td {{ background: rgba(248, 81, 73, 0.15); }}
td.msg {{ max-width: 420px; word-break: break-word; }}
a {{ color: #58a6ff; }}
code {{ font-size: 0.85em; }}
</style>
</head>
<body>
<h1>Spam rules demo — automated UI run</h1>
<p class="meta">Page: <code>project-demos.html</code> (browser rules, not the CNN).<br>
Correct vs labeled corpus: <strong>{correct} / {len(rows)}</strong> ({pct:.1f}%).<br>
Session video folder: <code>spam-ui-test-output/videos/</code> (WebM after run).<br>
Text log: <code>spam-ui-test-interactions.log</code></p>
<table>
<thead><tr><th>#</th><th>Ground truth</th><th>Message</th><th>UI verdict</th><th>Likelihood</th><th>Matches truth?</th><th>Shot</th></tr></thead>
<tbody>
{chr(10).join(table_rows_html)}
</tbody>
</table>
</body>
</html>
"""
    REPORT_HTML.write_text(report, encoding="utf-8")

    print(f"Done. Report: {REPORT_HTML}")
    print(f"Log: {LOG_TXT}")
    print(f"Video dir: {VIDEO_DIR}")
    print(f"Accuracy vs labels: {correct}/{len(rows)} ({pct:.1f}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
