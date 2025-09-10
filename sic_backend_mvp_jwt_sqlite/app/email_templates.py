from __future__ import annotations

import os
import re
from typing import Tuple, Dict
from jinja2 import Environment, BaseLoader, StrictUndefined
import markdown as md
import bleach


TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates', 'email')


def _parse_frontmatter(text: str) -> tuple[Dict[str, str], str]:
    # Minimal frontmatter parser supporting simple key: value and folded scalars (">-" or "|")
    if not text.startswith('---'):
        return {}, text
    parts = text.split('\n', 1)[1]
    fm, rest = parts.split('\n---', 1)
    lines = fm.splitlines()
    meta: Dict[str, str] = {}
    i = 0
    while i < len(lines):
        raw = lines[i]
        ln = raw.rstrip('\n')
        if not ln.strip():
            i += 1
            continue
        if ':' in ln:
            k, v = ln.split(':', 1)
            key = k.strip()
            val = v.strip()
            # Handle folded scalar values (subject: >- ; next indented lines contain the value)
            if val in ('>-', '>', '|', '|-'):
                i += 1
                buf: list[str] = []
                while i < len(lines) and (lines[i].startswith(' ') or lines[i].startswith('\t')):
                    buf.append(lines[i].lstrip())
                    i += 1
                # Join with spaces to emulate YAML folded style
                meta[key] = ' '.join(buf).strip()
                continue
            else:
                # Simple inline value
                meta[key] = val.strip()
        i += 1
    # Trim leading newlines from the remainder for cleaner markdown body
    while rest and rest.startswith('\n'):
        rest = rest[1:]
    return meta, rest


def load_markdown_template(name: str) -> tuple[str, str]:
    path = os.path.join(TEMPLATES_DIR, f"{name}.md")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Template not found: {name}")
    with open(path, 'r', encoding='utf-8') as f:
        raw = f.read()
    meta, body_md = _parse_frontmatter(raw)
    subject_tpl = meta.get('subject', '{{ subject }}')
    return subject_tpl, body_md


def discover_missing_vars(subject_tpl: str, body_md_tpl: str, provided: dict) -> list[str]:
    names = set(re.findall(r"\{\{\s*([a-zA-Z_][\w]*)\s*\}\}", subject_tpl + "\n" + body_md_tpl))
    return sorted([n for n in names if n not in provided])


def render_markdown_template(subject_tpl: str, body_md_tpl: str, vars: dict) -> tuple[str, str, str]:
    env = Environment(loader=BaseLoader(), undefined=StrictUndefined, autoescape=False)
    subj = env.from_string(subject_tpl).render(**vars)
    body_md = env.from_string(body_md_tpl).render(**vars)
    body_html = md.markdown(body_md, extensions=["extra", "sane_lists", "smarty"])  # type: ignore
    # sanitize and wrap
    safe_html = sanitize_html(body_html)
    wrapped_html = wrap_html(safe_html)
    text = bleach.clean(wrapped_html, tags=[], strip=True)
    return subj, text, wrapped_html


def sanitize_html(html: str) -> str:
    allowed_tags = [
        'a', 'p', 'strong', 'em', 'b', 'i', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'
    ]
    allowed_attrs = {
        'a': ['href', 'title', 'target', 'rel']
    }
    return bleach.clean(html, tags=allowed_tags, attributes=allowed_attrs, strip=True)


def wrap_html(inner: str) -> str:
    css = (
        "body{background:#f7f7f9;margin:0;padding:16px;font-family:system-ui,'-apple-system',Segoe UI,Roboto,sans-serif;}"
        ".container{max-width:600px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:8px;padding:16px;}"
        ".footer{color:#888;font-size:12px;margin-top:16px;text-align:center;}"
        "a{color:#2b6cb0;text-decoration:none;}"
    )
    return f"""
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>{css}</style>
  </head>
  <body>
    <div class="container">
      {inner}
      <div class="footer">Sent via DueSpark</div>
    </div>
  </body>
</html>
"""
