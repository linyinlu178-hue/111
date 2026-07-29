# ============================================================
#  每日成长 App —— 后端（Python，零依赖，仅用标准库）
#  运行：python server.py   （可选 PORT=3000）
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
    '英语', '口语', '考研', '四六级', '单词', '听力', '语法', '阅读', 'english',
    '剪辑', '剪映', '转场', '调色', '卡点', '特效', 'PR', '摄影', '设计', 'AI', '绘画', 'PS',
    '运营', '跨境', '亚马逊', '选品', '电商', 'tiktok', 'shopify', 'temu', '副业', '自媒体',
    '涨粉', '起号', '脚本', '文案', '短视频', '直播', '自学', '学习', '笔记', '干货',
    '编程', 'python', '理财', '健身',
]


def classify(word):
    w = word.lower()
    if any(k in w for k in ['英语', '口语', '考研', '四六级', '单词', '听力', '语法', '阅读', 'english']):
        return 'english'
    if any(k in w for k in ['剪辑', '剪映', '转场', '调色', '卡点', '特效', 'PR', '摄影', '设计', 'AI', '绘画', 'ps']):
        return 'editing'
    if any(k in w for k in ['运营', '跨境', '亚马逊', '选品', '电商', 'tiktok', 'shopify', 'temu', '副业', '自媒体', '涨粉', '起号', '脚本', '文案', '短视频', '直播']):
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
                'why': '来自抖音实时热榜',
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

    def handle_tts(self, qs):
        text = (qs.get('text', [''])[0]).strip()
        if not text:
            return self._send(400, 'missing text')
        url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=' + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                audio = r.read()
            if len(audio) < 100:
                return self._send(500, 'tts empty')
            self._send(200, audio, 'audio/mpeg')
        except Exception as e:
            self._send(500, 'tts failed: ' + str(e))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        p = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)
        if p == '/api/douyin/hot':
            return self.handle_hot()
        if p == '/api/tts':
            return self.handle_tts(qs)
        if p.startswith('/api/'):
            return self._send(404, 'unknown api')
        return self.serve_static(p)


def main():
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print('每日成长 App 后端（Python）已启动: http://localhost:' + str(PORT))
    print('抖音热门学习视频接口: http://localhost:' + str(PORT) + '/api/douyin/hot （免登录）')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n已停止')
        server.shutdown()


if __name__ == '__main__':
    main()

