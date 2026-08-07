#!/usr/bin/env python3
"""Dev server that never caches, so an edited module is picked up on reload.

Also accepts POST /save-anchors and POST /save-crowd, which let the asset lab write
per-frame sprite nudges and background-actor placements straight to disk instead of
making you copy JSON around by hand. Placement in particular can only be judged
against the art behind it, so it is edited in the lab and saved from there.
"""
import http.server
import json
import os
import socketserver
import sys

SAVES = {
    "/save-anchors": "assets/frames/anchors.json",
    "/save-crowd": "assets/frames/crowd.json",
}


class Dev(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def do_POST(self):
        dest = SAVES.get(self.path.split("?")[0])
        if not dest:
            self.send_error(404)
            return
        try:
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n) or b"{}")
            if not isinstance(data, dict):
                raise ValueError("expected an object")
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w") as f:
                json.dump(data, f, indent=2, sort_keys=True)
        except Exception as e:
            self.send_error(400, str(e))
            return
        body = json.dumps({"saved": len(data)}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), Dev) as httpd:
    print(f"serving on http://localhost:{port}  (POST {', '.join(SAVES)} enabled)")
    httpd.serve_forever()
