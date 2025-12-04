
from http.server import BaseHTTPRequestHandler
import json

# Delay stored in SECONDS, must be between 5 and 20
MIN_DELAY_SEC = 1
MAX_DELAY_SEC = 7

# Default delay = 7 seconds
current_delay = 3


def clamp_delay(value: int) -> int:
    """Clamp delay in SECONDS to the allowed range."""
    try:
        value = int(value)
    except (TypeError, ValueError):
        return current_delay
    if value < MIN_DELAY_SEC:
        return MIN_DELAY_SEC
    if value > MAX_DELAY_SEC:
        return MAX_DELAY_SEC
    return value


class handler(BaseHTTPRequestHandler):
    def _set_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        # CORS: allow frontend from anywhere
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        """Return current delay in seconds."""
        global current_delay
        self._set_headers(200)
        body = json.dumps({"delay": current_delay}).encode("utf-8")
        self.wfile.write(body)

    def do_POST(self):
        """Update delay in seconds."""
        global current_delay

        # Read JSON body
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

