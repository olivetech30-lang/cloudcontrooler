from http.server import BaseHTTPRequestHandler
import json

current_delay = 700  # ms

def clamp_delay(value: int) -> int:
    value = int(value)
    if value < 50:
        return 50
    if value > 2000:
        return 2000
    return value


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        global current_delay
        self._set_headers(200)
        body = json.dumps({"delay": current_delay}).encode("utf-8")
        self.wfile.write(body)

    def do_POST(self):
        global current_delay

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"

        try:
            data = json.loads(raw_body)
        except json.JSONDecodeError:
            data = {}

        delay_value = data.get("delay")
        if isinstance(delay_value, (int, float)):
            current_delay = clamp_delay(delay_value)

        self._set_headers(200)
        body = json.dumps({"delay": current_delay}).encode("utf-8")
        self.wfile.write(body)