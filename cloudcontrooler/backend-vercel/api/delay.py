from http.server import BaseHTTPRequestHandler
import json

# Delay range in MILLISECONDS
MIN_DELAY_MS = 500      # 0.5 s
MAX_DELAY_MS = 5000     # 5.0 s

# Default delay (ms)
current_delay = 700     # 0.7 s


def clamp_delay(value: int) -> int:
    """Clamp delay in ms to allowed range."""
    global current_delay
    try:
        value = int(value)
    except (TypeError, ValueError):
        return current_delay

    if value < MIN_DELAY_MS:
        return MIN_DELAY_MS
    if value > MAX_DELAY_MS:
        return MAX_DELAY_MS
    return value


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        # CORS so frontend can call from anywhere
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        """Return current delay (ms)."""
        global current_delay
        self._set_headers(200)
        body = json.dumps({"delay": current_delay}).encode("utf-8")
        self.wfile.write(body)

    def do_POST(self):
        """Update delay (ms)."""
        global current_delay

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {}

        delay_value = data.get("delay", current_delay)
        current_delay = clamp_delay(delay_value)

        self._set_headers(200)
        body = json.dumps({"delay": current_delay}).encode("utf-8")
        self.wfile.write(body)
