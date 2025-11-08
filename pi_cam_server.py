import io, threading, signal, sys
from flask import Flask, Response, jsonify
from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput

app = Flask(__name__)

class StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        self.frame = None
        self.condition = threading.Condition()
    def write(self, buf):
        with self.condition:
            self.frame = bytes(buf)
            self.condition.notify_all()

picam2 = Picamera2()
video_config = picam2.create_video_configuration(main={"size": (1280, 720)})
picam2.configure(video_config)

output = StreamingOutput()
picam2.start_recording(MJPEGEncoder(quality=85), FileOutput(output))

@app.get("/video")
def video():
    def generate():
        while True:
            with output.condition:
                output.condition.wait()
                frame = output.frame
            yield (b"--frame\r\n"
                   b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")
    return Response(generate(),
                    mimetype="multipart/x-mixed-replace; boundary=frame",
                    headers={"Cache-Control": "no-store"})

@app.get("/snapshot.jpg")
def snapshot():
    with output.condition:
        if output.frame is None:
            output.condition.wait(timeout=1.0)
        frame = output.frame
    if frame is None:
        return Response("No frame yet", status=503, mimetype="text/plain")
    return Response(frame, mimetype="image/jpeg",
                    headers={"Cache-Control": "no-store"})

@app.get("/health")
def health():
    return jsonify(ok=True)

def cleanup(*_):
    try:
        picam2.stop_recording()
    except Exception:
        pass
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3001, threaded=True)
