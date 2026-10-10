"""Write a single index.html that opens correctly from a downloads folder."""

from pathlib import Path
import urllib.parse

root = Path(__file__).resolve().parent


def data_uri(path):
    svg = path.read_text()
    return "data:image/svg+xml;charset=utf-8," + urllib.parse.quote(svg, safe="")


def main():
    html = (root / "page.html").read_text()
    css = (root / "styles.css").read_text()
    js = (root / "app.js").read_text()
    white = data_uri(root / "assets/v360-white.svg")
    black = data_uri(root / "assets/v360-black.svg")
    html = html.replace('  <link rel="icon" href="assets/v360-black.svg">\n', "")
    html = html.replace(
        '  <link rel="stylesheet" href="styles.css">',
        "  <style>\n" + css + "\n  </style>",
    )
    html = html.replace('src="assets/v360-white.svg"', 'src="' + white + '"')
    html = html.replace('src="assets/v360-black.svg"', 'src="' + black + '"')
    html = html.replace(
        '  <script src="app.js"></script>',
        "  <script>\n" + js + "\n  </script>",
    )
    if "styles.css" in html or 'src="app.js"' in html or "assets/" in html:
        raise SystemExit("page.html still points at a separate file")
    (root / "index.html").write_text(html)


if __name__ == "__main__":
    main()
