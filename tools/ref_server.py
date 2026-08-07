#!/usr/bin/env python3
"""Tiny CORS upload endpoint so the browser can hand reference photos to disk.

Some sources sit behind a bot check that curl cannot pass, but the browser is
already logged through it. The page fetches the image (same-origin) and POSTs
the bytes here.

  python3 tools/ref_server.py [port]      # default 8010
  POST /save?name=billy_1.jpg             # body = raw image bytes
"""
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "ref")


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        # Chrome's private-network-access preflight needs this to reach localhost
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        name = (parse_qs(url.query).get("name") or ["ref.bin"])[0]
        name = os.path.basename(name).replace("..", "")
        length = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(length)
        os.makedirs(OUT, exist_ok=True)
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(data)
        self.send_response(200)
        self._cors()
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(f"saved {name} ({len(data)} bytes)".encode())

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8010
    print(f"ref server on http://localhost:{port} -> {OUT}")
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
