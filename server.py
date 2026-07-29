# ============================================================
#  每日成长 App —— 抖音热门学习视频后端（Python，零依赖，仅用标准库）
#  免登录：代理抖音公开热榜，过滤出与学习相关的话题返回给前端。
#  运行：python3 server.py   （可选 PORT=3000）
# ============================================================
import os
import json
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

WEBROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get('PORT', '3000'))

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.zip': 'application/zip',
    '.webmanifest': 'application/manifest+json',
    '.ico': 'image/x-icon',
}

LEARN_KEYS = [
    '\u82f1\u8bed', '\u53e3\u8bed', '\u8003\u7814', '\u56db\u516d\u7ea7', '\u5355\u8bcd', '\u542c\u529b', '\u8bed\u6cd5', '\u9605\u8bfb', 'english',
    '\u526a\u8f91', '\u526a\u6620', '\u8f6c\u573a', '\u8c03\u8272', '\u5361\u70b9', '\u7279\u6548', 'PR', '\u6444\u5f71', '\u8bbe\u8ba1', 'AI', '\u7ed8\u753b', 'PS',
    '\u8fd0\u8425', '\u8de8\u5883', '\u4e9a\u9a6c\u900a', '\u9009\u54c1', '\u7535\u5546', 'tiktok', 'shopify', 'temu', '\u526f\u4e1a', '\u81ea\u5a92\u4f53',
    '\u6da8\u7c89', '\u8d77\u53f7', '\u811a\u672c', '\u6587\u6848', '\u77ed\u89c6\u9891', '\u76f4\u64ad', '\u81ea\u5b66', '\u5b66\u4e60', '\u7b14\u8bb0', '\u5e72\u8d27',
    '\u7f16\u7a0b', 'python', '\u7406\u8d22', '\u5065\u8eab',
]


def classify(word):
    w = word.lower()
    if any(k in w for k in ['\u82f1\u8bed', '\u53e3\u8bed', '\u8003\u7814', '\u56db\u516d\u7ea7', '\u5355\u8bcd', '\u542c\u529b', '\u8bed\u6cd5', '\u9605\u8bfb', 'english']):
        return 'english'
    if any(k in w for k in ['\u526a\u8f91', '\u526a\u6620', '\u8f6c\u573a', '\u8c03\u8272', '\u5361\u70b9', '\u7279\u6548', 'PR', '\u6444\u5f71', '\u8bbe\u8ba1', 'AI', '\u7ed8\u753b', 'ps']):
        return 'editing'
    if any(k in w for k in ['\u8fd0\u8425', '\u8de8\u5883', '\u4e9a\u9a6c\u900a', '\u9009\u54c1', '\u7535\u5546', 'tiktok', 'shopify', 'temu', '\u526f\u4e1a', '\u81ea\u5a92\u4f53', '\u6da8\u7c89', '\u8d77\u53f7', '\u811a\u672c', '\u6587\u6848', '\u77ed\u89c6\u9891', '\u76f4\u64ad']):
        return 'memes'
    return 'ops'


def fetch_hot():
    url = 'https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode('utf-8'))
    except Exception:
        return []
    items = []
    for it in (data.get('word_list') or []):
        word = (it.get('word') or '').strip()
        if not word:
            continue
        if any(k in word.lower() for k in LEARN_KEYS):
            items.append({
                'id': 'live_' + str(it.get('position', len(items))),
                'title': word,
                'heat': it.get('hot_value') or 0,
                'category': classify(word),
                'tags': '',
                'why': '\u6765\u81ea\u6296\u97f3\u5b9e\u65f6\u70ed\u699c',
                'source': 'live',
            })
    return items


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _send(self, code, body, content_type='text/plain; charset=utf-8'):
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def serve_static(self, pathname):
        rel = '/index.html' if pathname == '/' else pathname
        filepath = os.path.normpath(os.path.join(WEBROOT, rel.lstrip('/')))
        if not filepath.startswith(WEBROOT):
            return self._send(403, 'forbidden')
        try:
            with open(filepath, 'rb') as f:
                data = f.read()
        except OSError:
            return self._send(404, 'not found')
        ctype = MIME.get(os.path.splitext(filepath)[1], 'application/octet-stream')
        self._send(200, data, ctype)

    def handle_hot(self):
        items = fetch_hot()
        out = {'ok': True, 'source': 'live' if items else 'curated', 'count': len(items), 'items': items}
        self._send(200, json.dumps(out, ensure_ascii=False), 'application/json; charset=utf-8')
    
    def do_GET(self):
        qs = urllib.parse.parse_qs(parsed.query)
        p = parsed.path
        if p == '/api/douyin/hot':
        if p == '/api/tts':
            return self.handle_tts(qs)

            return self.handle_hot()
        if p.startswith('/api/'):
            return self._send(404, 'unknown api')
        return self.serve_static(p)


def main():
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print('\u6bcf\u65e5\u6210\u957f App \u540e\u7aef\uff08Python\uff09\u5df2\u542f\u52a8: http://localhost:' + str(PORT))
    print('\u6296\u97f3\u70ed\u95e8\u5b66\u4e60\u89c6\u9891\u63a5\u53e3: http://localhost:' + str(PORT) + '/api/douyin/hot \uff08\u514d\u767b\u5f55\uff09')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n\u5df2\u505c\u6b62')
        server.shutdown()


if __name__ == '__main__':
    main()
