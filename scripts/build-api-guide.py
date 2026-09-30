"""Render the secret-free canonical handoff as static HTML + Markdown for other AIs."""
from pathlib import Path
import html,re
root=Path(__file__).resolve().parent.parent
source=(root/'AI-API-MAINTENANCE.md').read_text()
def inline(text):
    parts=re.split(r'(`[^`]+`)',text)
    def plain(value):
        value=html.escape(value)
        return re.sub(r'(https://[^\s<>，。；）]+)',lambda m:'<a href="'+m[1]+'" rel="noreferrer">'+m[1]+'</a>',value)
    return ''.join('<code>'+html.escape(p[1:-1])+'</code>' if p.startswith('`') and p.endswith('`') else plain(p) for p in parts)
lines=source.splitlines();out=[];i=0
while i<len(lines):
    line=lines[i]
    if not line.strip():i+=1;continue
    if line.startswith('```'):
        code=[];i+=1
        while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
        out.append('<pre><code>'+html.escape('\n'.join(code))+'</code></pre>');i+=1;continue
    if line.startswith('|') and i+1<len(lines) and re.match(r'^\|[\s:|\-]+\|$',lines[i+1]):
        cells=lambda row:[inline(c.strip()) for c in row.strip().strip('|').split('|')]
        heads=cells(line);i+=2;rows=[]
        while i<len(lines) and lines[i].startswith('|'):
            rows.append('<tr>'+''.join('<td>'+c+'</td>' for c in cells(lines[i]))+'</tr>');i+=1
        out.append('<div class="table-wrap"><table><thead><tr>'+''.join('<th>'+c+'</th>' for c in heads)+'</tr></thead><tbody>'+''.join(rows)+'</tbody></table></div>');continue
    match=re.match(r'^(#{1,3}) (.*)',line)
    if match:
        level=len(match[1]);out.append(f'<h{level}>'+inline(match[2])+f'</h{level}>');i+=1;continue
    if line.startswith('> '):out.append('<blockquote>'+inline(line[2:])+'</blockquote>');i+=1;continue
    if re.match(r'^(?:- |\d+\. )',line):
        ordered=not line.startswith('- ');tag='ol' if ordered else 'ul';rows=[]
        while i<len(lines) and re.match(r'^\d+\. ' if ordered else r'^- ',lines[i]):
            rows.append('<li>'+inline(re.sub(r'^(?:- |\d+\. )','',lines[i]))+'</li>');i+=1
        out.append('<'+tag+'>'+''.join(rows)+'</'+tag+'>');continue
    paragraph=[line];i+=1
    while i<len(lines) and lines[i].strip() and not re.match(r'^(#|>|\||```|- |\d+\. )',lines[i]):paragraph.append(lines[i]);i+=1
    out.append('<p>'+inline(' '.join(paragraph))+'</p>')
page='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>金刚工具 · AI API 更换指南</title><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f5f7fa;color:#182234;font:15px/1.8 system-ui,-apple-system,"PingFang SC",sans-serif}main{max-width:1080px;margin:32px auto;padding:32px 40px;background:#fff;border:1px solid #e5eaf2;border-radius:16px}nav{display:flex;gap:20px;flex-wrap:wrap;font-size:14px}a{color:#3158dc;text-underline-offset:3px;overflow-wrap:anywhere}h1{font-size:28px;line-height:1.4}h2{margin-top:36px;padding-top:20px;border-top:1px solid #e5eaf2;font-size:21px}h3{font-size:17px;margin-top:24px}p,li{overflow-wrap:anywhere}li+li{margin-top:9px}code{font-size:.9em;background:#f1f4f8;padding:2px 4px;border-radius:4px}pre{overflow:auto;background:#f1f4f8;padding:18px;border-radius:10px}pre code{padding:0}blockquote{margin:20px 0;padding:18px 22px;background:#f0f4ff;border-left:3px solid #4165ea}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #e5eaf2;padding:10px 12px;text-align:left;vertical-align:top}th{background:#f6f8fb}td code{overflow-wrap:anywhere}footer{font-size:13px;color:#66738a;margin-top:36px}@media(max-width:700px){main{margin:0;border:0;border-radius:0;padding:22px 18px}h1{font-size:24px}}
</style></head><body><main><nav><a href="./">返回金刚工具</a><a href="api-maintenance.md">查看 Markdown 原文（供 AI 阅读）</a></nav>'''+''.join(out)+'''<footer>来源：仓库根目录 AI-API-MAINTENANCE.md。修改原文后运行 python3 scripts/build-api-guide.py，再同步并构建主站。</footer></main></body></html>'''
destination=root/'tools-src/icons/public' if (root/'tools-src/icons').is_dir() else root/'public'
destination.mkdir(parents=True,exist_ok=True)
(destination/'api-maintenance.md').write_text(source)
(destination/'api-maintenance.html').write_text(page)
print('Generated public API handoff HTML and Markdown from the canonical guide.')
