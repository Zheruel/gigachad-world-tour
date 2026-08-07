#!/usr/bin/env python3
"""Dev server that never caches, so an edited module is picked up on reload.

Also accepts POST /save-anchors and POST /save-crowd, which let the asset lab write
per-frame sprite nudges and background-actor placements straight to disk instead of
making you copy JSON around by hand. Placement in particular can only be judged
against the art behind it, so it is edited in the lab and saved from there.

It serves byte ranges, which SimpleHTTPRequestHandler does not. An <audio> element
will not even load metadata off a server that answers a Range request with the whole
file, so without this the lair's mp3 hangs forever with no error to see.
"""
import http.server
import json
import os
import re
import socketserver
import sys

SAVES = {
    "/save-anchors": "assets/frames/anchors.json",
    "/save-crowd": "assets/frames/crowd.json",
}


class Dev(http.server.SimpleHTTPRequestHandler):
    # media needs keep-alive and 206s; the default here is HTTP/1.0, which has neither
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        # no-store everywhere except media: Chromium's media stack will not buffer a
        # no-store response, so an <audio> src sits at readyState 0 forever with no
        # error raised. no-cache still revalidates on every load, so an edited track is
        # picked up the same way an edited module is.
        media = self.guess_type(self.translate_path(self.path)).startswith(("audio/", "video/"))
        self.send_header("Cache-Control", "no-cache" if media else "no-store, must-revalidate")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_GET(self):
        served = self.range_response()
        if served is None:
            super().do_GET()

    def do_HEAD(self):
        if self.headers.get("Range"):
            self.range_response(body=False)
            return
        super().do_HEAD()

    def range_response(self, body=True):
        """Answer a single `Range: bytes=a-b` with a 206. Returns None if this request
        is not a range request and the base handler should take it."""
        rng = self.headers.get("Range")
        m = rng and re.fullmatch(r"bytes=(\d*)-(\d*)", rng.strip())
        if not m:
            return None
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return None
        size = os.path.getsize(path)
        start, end = m.group(1), m.group(2)
        if start == "":                       # bytes=-N -> the last N bytes
            if end == "":
                return None
            start, end = max(0, size - int(end)), size - 1
        else:
            start = int(start)
            end = int(end) if end else size - 1
        end = min(end, size - 1)
        if start > end or start >= size:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return True
        length = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(length))
        self.end_headers()
        if body:
            with open(path, "rb") as f:
                f.seek(start)
                remaining = length
                try:
                    while remaining > 0:
                        chunk = f.read(min(64 * 1024, remaining))
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        remaining -= len(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    # a media element asks for a range, decides it has enough and hangs
                    # up mid-body constantly; that is not an error worth a traceback
                    self.close_connection = True
        return True

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
# Threaded because HTTP/1.1 keeps connections open: on the single-threaded TCPServer the
# browser's idle keep-alive sockets block every other request and the page never loads.
socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer.daemon_threads = True
with socketserver.ThreadingTCPServer(("", port), Dev) as httpd:
    print(f"serving on http://localhost:{port}  (POST {', '.join(SAVES)} enabled)")
    httpd.serve_forever()
