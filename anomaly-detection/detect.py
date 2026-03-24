"""
PPE Safety Gate System - No dlib / No face_recognition
=======================================================
Uses OpenCV built-in LBPH Face Recognizer instead.

Dependencies (already installed):
    pip install opencv-python ultralytics numpy

Folder setup:
    Images/
        Ram.jpg       ← one clear face photo per worker
        Priya.jpg
    yolov8n.pt        ← your YOLOv8 model
    Main.py           ← this file

Run:
    py -3.11 Main.py
"""

import os
import cv2
import csv
import time
import pickle
import numpy as np
from datetime import datetime
from ultralytics import YOLO

# ─── Config ──────────────────────────────────────────────────────────────────
IMAGES_FOLDER      = "Images"
MODEL_PATH         = "yolov8n.pt"
ENCODE_FILE        = "FaceModel.pkl"
LOG_FILE           = "logs/attendance.csv"

RECHECK_SECONDS    = 30
PPE_CONFIRM_FRAMES = 10
PPE_TIMEOUT_FRAMES = 150
RESULT_DISPLAY_SEC = 3
FACE_CONFIDENCE    = 50 # lower = stricter (LBPH confidence, not %)

# Update these to match YOUR model's class names
# Run check_model_classes.py to see what your model detects
HELMET_CLASSES = {'helmet', 'hard hat', 'hardhat', 'safety helmet', 'hard-hat'}
GLOVE_CLASSES  = {'glove', 'gloves', 'safety glove'}

# ─── States ──────────────────────────────────────────────────────────────────
STATE_IDLE         = 0
STATE_SHOW_INFO    = 1
STATE_PPE_CHECK    = 2
STATE_GRANTED      = 3
STATE_DENIED       = 4
STATE_ALREADY_DONE = 5

# ─── Colors BGR ──────────────────────────────────────────────────────────────
GREEN  = (0, 220, 0)
RED    = (0, 0, 220)
ORANGE = (0, 165, 255)
WHITE  = (255, 255, 255)
YELLOW = (0, 220, 255)
DARK   = (40, 40, 40)

os.makedirs("logs", exist_ok=True)

# ─── CSV Logger ──────────────────────────────────────────────────────────────
def log_event(worker_id, status):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    file_exists = os.path.isfile(LOG_FILE)
    with open(LOG_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["Timestamp", "WorkerID", "Status"])
        writer.writerow([now, worker_id, status])
    print(f"[LOG] {now}  {worker_id}  →  {status}")

# ─── Face Model (OpenCV LBPH) ─────────────────────────────────────────────────
def build_face_model():
    print("Building face model from Images/ folder...")

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    faces       = []
    labels      = []
    worker_ids  = []

    image_files = [f for f in os.listdir(IMAGES_FOLDER)
                   if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

    if not image_files:
        print(f"[ERROR] No images found in {IMAGES_FOLDER}/")
        print("  Add photos like:  Images/Ram.jpg")
        exit(1)

    for fname in image_files:
        path = os.path.join(IMAGES_FOLDER, fname)
        img  = cv2.imread(path)
        if img is None:
            print(f"  [WARN] Could not read {fname}, skipping.")
            continue

        gray      = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        detected  = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(60,60))

        if len(detected) == 0:
            print(f"  [WARN] No face found in {fname}, skipping.")
            continue

        worker_id = os.path.splitext(fname)[0]
        label     = len(worker_ids)

        # Use the largest detected face
        x, y, w, h = max(detected, key=lambda r: r[2]*r[3])
        face_gray   = cv2.resize(gray[y:y+h, x:x+w], (200, 200))

        faces.append(face_gray)
        labels.append(label)
        worker_ids.append(worker_id)
        print(f"  ✓ Registered: {worker_id}")

    if not faces:
        print("[ERROR] No valid faces found. Check your Images/ folder.")
        exit(1)

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(faces, np.array(labels))

    with open(ENCODE_FILE, 'wb') as f:
        pickle.dump(worker_ids, f)
    recognizer.save("FaceModel_lbph.yml")

    print(f"\nDone! {len(faces)} workers registered.\n")
    return recognizer, worker_ids


def load_face_model():
    if not os.path.exists(ENCODE_FILE) or not os.path.exists("FaceModel_lbph.yml"):
        return build_face_model()

    with open(ENCODE_FILE, 'rb') as f:
        worker_ids = pickle.load(f)

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read("FaceModel_lbph.yml")
    print(f"Loaded face model — {len(worker_ids)} workers.")
    return recognizer, worker_ids


# ─── PPE Detection ───────────────────────────────────────────────────────────
# ─── Improved PPE Detection with Spatial Logic ──────────────────────────────
def check_ppe(frame, model):
    results = model(frame, verbose=False)[0]
    has_helmet = False
    has_gloves = False
    annotated = frame.copy()

    # Separate detections into categories
    persons = []
    helmets = []
    
    for box in results.boxes:
        cls_id = int(box.cls)
        cls_name = model.names[cls_id].lower()
        conf = float(box.conf)
        if conf < 0.45: continue
        
        coords = map(int, box.xyxy[0])
        x1, y1, x2, y2 = coords

        # 1. Store Persons and Helmets for spatial comparison
        if "person" in cls_name:
            persons.append((x1, y1, x2, y2))
        elif any(c in cls_name for c in HELMET_CLASSES):
            helmets.append((x1, y1, x2, y2))
            cv2.rectangle(annotated, (x1,y1), (x2,y2), GREEN, 2)
        elif any(c in cls_name for c in GLOVE_CLASSES):
            has_gloves = True # Gloves can be anywhere near the body
            cv2.rectangle(annotated, (x1,y1), (x2,y2), (0,200,255), 2)

    # 2. Check if a helmet is specifically ON a person's head
    for (px1, py1, px2, py2) in persons:
        head_limit = py1 + int((py2 - py1) * 0.3) # Top 30% of body
        
        for (hx1, hy1, hx2, hy2) in helmets:
            # Check if helmet center is within person's horizontal width 
            # and vertically near the head area
            h_center_x = (hx1 + hx2) / 2
            if px1 < h_center_x < px2 and hy1 < head_limit:
                has_helmet = True
                cv2.rectangle(annotated, (px1, py1), (px2, py2), GREEN, 2)
                break
        
        if not has_helmet:
            cv2.rectangle(annotated, (px1, py1), (px2, py2), RED, 3)

    return has_helmet, has_gloves, annotated
# ─── UI Helpers ──────────────────────────────────────────────────────────────
def put_text(img, text, pos, scale=0.65, color=WHITE, thickness=2):
    cv2.putText(img, text, pos, cv2.FONT_HERSHEY_DUPLEX, scale, color, thickness)


def draw_panel(frame):
    overlay = frame.copy()
    cv2.rectangle(overlay, (640, 0), (960, 480), (20,20,20), -1)
    cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)


def draw_idle(frame):
    draw_panel(frame)
    put_text(frame, "PPE SAFETY GATE",   (655, 100), scale=0.7, color=YELLOW)
    cv2.line(frame, (650,115), (950,115), YELLOW, 1)
    put_text(frame, "Please face the",   (665, 200), scale=0.6, color=WHITE)
    put_text(frame, "camera to sign in", (655, 230), scale=0.6, color=WHITE)
    if int(time.time() * 2) % 2 == 0:
        cv2.circle(frame, (790, 320), 8, GREEN, -1)
    put_text(frame, "Waiting...", (760, 360), scale=0.55, color=(150,150,150))


def draw_worker_card(frame, worker_id, photo=None):
    draw_panel(frame)
    h, w, _ = frame.shape # Get actual frame dimensions
    
    put_text(frame, "WORKER IDENTIFIED", (655, 40), scale=0.65, color=GREEN)
    cv2.line(frame, (650,55), (w-10,55), GREEN, 1) # Use w instead of 950
    
    if photo is not None:
        thumb = cv2.resize(photo, (120, 120))
        # Check if we have enough width to place the photo
        if w > 780:
            frame[70:190, 660:780] = thumb
        else:
            # Place it further left if the window is narrow
            frame[70:190, w-130:w-10] = thumb
            
    put_text(frame, f"ID: {worker_id}", (660, 215), scale=0.6, color=WHITE)
    put_text(frame, "Now put on your PPE", (655, 270), scale=0.55, color=YELLOW)

def draw_ppe_status(frame, has_helmet, has_gloves, streak, max_streak):
    draw_panel(frame)
    put_text(frame, "PPE SAFETY CHECK", (660, 40), scale=0.7, color=YELLOW)
    cv2.line(frame, (650,55), (950,55), YELLOW, 1)

    h_col  = GREEN if has_helmet else RED
    g_col  = GREEN if has_gloves else RED
    put_text(frame, f"[{'OK' if has_helmet else '--'}] HELMET", (660,110), color=h_col, scale=0.75)
    put_text(frame, f"[{'OK' if has_gloves else '--'}] GLOVES", (660,160), color=g_col, scale=0.75)

    bx, by, bw, bh = 660, 200, 280, 18
    cv2.rectangle(frame, (bx,by), (bx+bw, by+bh), (60,60,60), -1)
    filled = int(bw * min(streak/max_streak, 1.0))
    if filled > 0:
        cv2.rectangle(frame, (bx,by), (bx+filled, by+bh),
                      GREEN if (has_helmet and has_gloves) else RED, -1)
    cv2.rectangle(frame, (bx,by), (bx+bw, by+bh), WHITE, 1)
    put_text(frame, f"Confirming {streak}/{max_streak}", (660,240), scale=0.5)
    put_text(frame, "Wear ALL required PPE",  (660,290), scale=0.5, color=ORANGE)


def draw_result(frame, granted, name):
    draw_panel(frame)
    if granted:
        put_text(frame, "ACCESS GRANTED",  (655,180), scale=0.9, color=GREEN, thickness=2)
        put_text(frame, f"Welcome, {name}!",(660,230), scale=0.65, color=GREEN)
        put_text(frame, "PPE Verified OK",  (660,265), scale=0.6,  color=GREEN)
        put_text(frame, "Proceed to work",  (660,300), scale=0.6,  color=WHITE)
    else:
        put_text(frame, "ACCESS DENIED",   (660,180), scale=0.9, color=RED, thickness=2)
        put_text(frame, "PPE not detected", (660,230), scale=0.65, color=RED)
        put_text(frame, "Wear helmet &",    (660,265), scale=0.6,  color=ORANGE)
        put_text(frame, "gloves before",    (660,295), scale=0.6,  color=ORANGE)
        put_text(frame, "entering.",        (660,325), scale=0.6,  color=ORANGE)


# ─── Recent check tracker ────────────────────────────────────────────────────
last_check_times = {}

def was_checked_recently(wid):
    last = last_check_times.get(wid)
    if last is None:
        return False
    return (datetime.now() - last).total_seconds() < RECHECK_SECONDS

def mark_checked(wid):
    last_check_times[wid] = datetime.now()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 50)
print("  PPE Safety Gate — Loading...")
print("=" * 50)

recognizer, worker_ids = load_face_model()
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

ppe_model = YOLO(MODEL_PATH)
print(f"YOLOv8 loaded. Classes: {list(ppe_model.names.values())}")
print("\n[INFO] Press Q to quit.")
print("[INFO] Delete FaceModel.pkl + FaceModel_lbph.yml to re-register workers.\n")

# Pre-load worker photos
worker_photos = {}
for wid in worker_ids:
    for ext in ('.jpg', '.jpeg', '.png'):
        p = os.path.join(IMAGES_FOLDER, wid + ext)
        if os.path.exists(p):
            worker_photos[wid] = cv2.imread(p)
            break

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

state         = STATE_IDLE
current_id    = None
current_photo = None
ppe_streak    = 0
ppe_counter   = 0
result_timer  = 0
info_counter  = 0

while True:
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Camera not found. Check connection.")
        break

    display = frame.copy()
    gray    = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # ── Face detection every frame ────────────────────────────────────────────
    faces_detected = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60,60))

    detected_id = None
    for (x, y, w, h) in faces_detected:
        face_roi  = cv2.resize(gray[y:y+h, x:x+w], (200, 200))
        label, confidence = recognizer.predict(face_roi)

        if confidence < FACE_CONFIDENCE:          # recognised
            detected_id = worker_ids[label]
            box_color   = GREEN if state == STATE_GRANTED else YELLOW
            cv2.rectangle(display, (x,y), (x+w, y+h), box_color, 2)
            cv2.putText(display, f"{detected_id} ({int(confidence)})",
                        (x, y-8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)
        else:                                      # unknown
            cv2.rectangle(display, (x,y), (x+w, y+h), RED, 2)
            cv2.putText(display, "Unknown", (x, y-8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, RED, 2)

    # ── State Machine ─────────────────────────────────────────────────────────
    if state == STATE_IDLE:
        draw_idle(display)
        if detected_id:
            current_id    = detected_id
            current_photo = worker_photos.get(detected_id)
            info_counter  = 0
            state = STATE_ALREADY_DONE if was_checked_recently(current_id) \
                    else STATE_SHOW_INFO

    elif state == STATE_SHOW_INFO:
        draw_worker_card(display, current_id, current_photo)
        info_counter += 1
        if info_counter > 60:
            state       = STATE_PPE_CHECK
            ppe_streak  = 0
            ppe_counter = 0

    elif state == STATE_PPE_CHECK:
        has_helmet, has_gloves, annotated = check_ppe(frame, ppe_model)
        display = annotated.copy()
        draw_ppe_status(display, has_helmet, has_gloves, ppe_streak, PPE_CONFIRM_FRAMES)
        ppe_counter += 1

        ppe_streak = (ppe_streak + 1) if (has_helmet and has_gloves) \
                     else max(0, ppe_streak - 1)

        if ppe_streak >= PPE_CONFIRM_FRAMES:
            log_event(current_id, "GRANTED")
            mark_checked(current_id)
            state        = STATE_GRANTED
            result_timer = time.time()

        elif ppe_counter > PPE_TIMEOUT_FRAMES:
            log_event(current_id, "DENIED")
            state        = STATE_DENIED
            result_timer = time.time()

    elif state == STATE_GRANTED:
        draw_result(display, granted=True,  name=current_id)
        if time.time() - result_timer > RESULT_DISPLAY_SEC:
            state = STATE_IDLE

    elif state == STATE_DENIED:
        draw_result(display, granted=False, name=current_id)
        if time.time() - result_timer > RESULT_DISPLAY_SEC:
            state = STATE_IDLE

    elif state == STATE_ALREADY_DONE:
        draw_panel(display)
        put_text(display, "Already checked in!",          (655, 190), scale=0.7,  color=ORANGE)
        put_text(display, f"ID: {current_id}",            (665, 235), scale=0.6,  color=WHITE)
        put_text(display, f"Wait {RECHECK_SECONDS}s",     (665, 275), scale=0.55, color=(150,150,150))
        info_counter += 1
        if info_counter > 90:
            state = STATE_IDLE

    # ── Status bar ────────────────────────────────────────────────────────────
    labels_map = {
        STATE_IDLE:"WAITING FOR WORKER", STATE_SHOW_INFO:"WORKER IDENTIFIED",
        STATE_PPE_CHECK:"CHECKING PPE...", STATE_GRANTED:"ACCESS GRANTED",
        STATE_DENIED:"ACCESS DENIED", STATE_ALREADY_DONE:"ALREADY CHECKED IN"
    }
    colors_map = {
        STATE_IDLE:DARK, STATE_SHOW_INFO:(0,100,150), STATE_PPE_CHECK:(0,120,180),
        STATE_GRANTED:(0,100,0), STATE_DENIED:(0,0,150), STATE_ALREADY_DONE:(0,100,150)
    }
    cv2.rectangle(display, (0,455), (960,480), colors_map.get(state, DARK), -1)
    put_text(display, labels_map.get(state,""), (10,473),  scale=0.5, color=WHITE)
    put_text(display, datetime.now().strftime("%H:%M:%S"), (860,473), scale=0.5, color=(180,180,180))

    cv2.imshow("PPE Safety Gate", display)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("System shut down.")