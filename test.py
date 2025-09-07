import socketio
import time

room_id = None  # shared variable

# --- First client: Alice ---
sio_alice = socketio.Client()

@sio_alice.on("room_created")
def on_room_created(data):
    global room_id
    room_id = data["data"]["room_id"]
    print("Alice received room_created:", data)

@sio_alice.on("joined")
def on_alice_joined(data):
    print("Alice received joined:", data)

@sio_alice.on("left")
def on_alice_left(data):
    print("Alice received left:", data)

# --- Second client: Bob ---
sio_bob = socketio.Client()

@sio_bob.on("joined")
def on_bob_joined(data):
    print("Bob received joined:", data)

@sio_bob.on("left")
def on_bob_left(data):
    print("Bob received left:", data)

# Connect both clients
sio_alice.connect("http://localhost:5000")
sio_bob.connect("http://localhost:5000")

# Step 1: Alice creates a room
sio_alice.emit("create_room", {"username": "Alice"})
time.sleep(1)  # give time for server to respond

# Step 2: Bob joins Alice's room
if room_id:
    sio_bob.emit("join_room", {"room_id": room_id, "username": "Bob"})
    time.sleep(1)

# Step 3: Bob leaves the room
if room_id:
    sio_bob.emit("leave_room", {"room_id": room_id, "username": "Bob"})
    time.sleep(1)

print("Test finished. Press Ctrl+C to exit.")
sio_alice.wait()
sio_bob.wait()

