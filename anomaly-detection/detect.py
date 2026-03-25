"""
PPE Safety Gate — Full-Face Black Helmet Detection (Vega style)
================================================================
Problem with full-face helmets:
  - When helmet is ON, the face is COMPLETELY COVERED
  - Face detector fails → last_face_box must be used as anchor
  - Helmet appears as a LARGE DARK ROUNDED BLOB covering face + above

Strategy:
  1. IDENTIFY the worker WITHOUT helmet (face visible)
  2. Store face position
  3. Ask worker to put on helmet
  4. Detect helmet as a large dark object in the stored face region
     that is BIGGER than the face alone (helmet is wider + taller)

Run:  py -3.11 Main.py
"""

import os
import cv2
import csv
import time
import pickle
import numpy as np
from datetime import datetime
import pyttsx3
import threading

# ─── Config ──────────────────────────────────────────────────────────────────
IMAGES_FOLDER      = "Images"
ENCODE_FILE        = "FaceModel.pkl"
LOG_FILE           = "logs/attendance.csv"
HELMET_PHOTOS_DIR  = "logs/helmet_photos"

RECHECK_SECONDS    = 30
PPE_CONFIRM_FRAMES = 12
PPE_TIMEOUT_FRAMES = 200
RESULT_DISPLAY_SEC = 3
FACE_CONFIDENCE    = 85

# ── Helmet detection tuning ──────────────────────────────────────────────────
# The helmet blob must be this many times LARGER than the stored face box
# Full-face helmets are typically 1.4x–2x wider than the face alone
HELMET_SIZE_RATIO  = 1.3   # blob width must be >= face_width * this value

# Darkness threshold — pixels below this brightness are "dark"
# 60 works well indoors; increase to 80 if room is very bright
DARK_PIXEL_THRESH  = 80

# Minimum % of the search zone that must be dark
MIN_DARK_COVERAGE  = 0.55

# ─── States ──────────────────────────────────────────────────────────────────
STATE_IDLE         = 0
STATE_SHOW_INFO    = 1
STATE_PPE_CHECK    = 2
STATE_GRANTED      = 3
STATE_DENIED       = 4
STATE_ALREADY_DONE = 5

GREEN  = (0, 220, 0)
RED    = (0, 0, 220)
ORANGE = (0, 165, 255)
WHITE  = (255, 255, 255)
YELLOW = (0, 220, 255)
DARK   = (40, 40, 40)

os.makedirs("logs", exist_ok=True)
os.makedirs(HELMET_PHOTOS_DIR, exist_ok=True)

# ─── Voice Engine (Simple Threading) ─────────────────────────────────────────
def speak(text):
    """Speak text in a separate thread"""
    def speak_async():
        try:
            print(f"[VOICE] Speaking: {text}")
            engine = pyttsx3.init()
            engine.setProperty('rate', 150)
            engine.setProperty('volume', 1.0)
            engine.say(text)
            engine.runAndWait()
            time.sleep(0.5)  # Small delay to ensure audio finishes
        except Exception as e:
            print(f"[VOICE ERROR] {e}")
    
    thread = threading.Thread(target=speak_async, daemon=False)
    thread.start()

# ─── Photo Capture ───────────────────────────────────────────────────────────
def save_helmet_photo(frame, worker_id):
    """Save a photo of the worker with helmet on"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{worker_id}_{timestamp}_helmet.jpg"
    filepath = os.path.join(HELMET_PHOTOS_DIR, filename)
    
    try:
        cv2.imwrite(filepath, frame)
        print(f"[PHOTO] Helmet photo saved: {filepath}")
        return filepath
    except Exception as e:
        print(f"[ERROR] Failed to save helmet photo: {e}")
        return None

# ─── CSV Logger ──────────────────────────────────────────────────────────────
def log_event(worker_id, status, photo_path=None):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    file_exists = os.path.isfile(LOG_FILE)
    with open(LOG_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["Timestamp", "WorkerID", "Status", "HelmetPhotoPath"])
        photo_info = photo_path if photo_path else "N/A"
        writer.writerow([now, worker_id, status, photo_info])
    print(f"[LOG] {now}  {worker_id}  →  {status}")

# ─── Face Model ──────────────────────────────────────────────────────────────
def build_face_model():
    print("Building face model from Images/ folder...")
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces, labels, worker_ids = [], [], []
    image_files = [f for f in os.listdir(IMAGES_FOLDER)
                   if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not image_files:
        print(f"[ERROR] No images in {IMAGES_FOLDER}/")
        exit(1)
    for fname in image_files:
        img = cv2.imread(os.path.join(IMAGES_FOLDER, fname))
        if img is None:
            continue
        gray     = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        detected = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
        if len(detected) == 0:
            print(f"  [WARN] No face in {fname}, skipping.")
            continue
        worker_id = os.path.splitext(fname)[0]
        x, y, w, h = max(detected, key=lambda r: r[2]*r[3])
        faces.append(cv2.resize(gray[y:y+h, x:x+w], (200, 200)))
        labels.append(len(worker_ids))
        worker_ids.append(worker_id)
        print(f"  ✓ Registered: {worker_id}")
    if not faces:
        print("[ERROR] No faces found.")
        exit(1)
    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(faces, np.array(labels))
    with open(ENCODE_FILE, 'wb') as f:
        pickle.dump(worker_ids, f)
    recognizer.save("FaceModel_lbph.yml")
    print(f"Done! {len(faces)} workers registered.\n")
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


# ─── Full-Face Black Helmet Detector ─────────────────────────────────────────
def detect_fullface_helmet(frame, face_x, face_y, face_w, face_h):
    annotated = frame.copy()
    h_fr, w_fr = frame.shape[:2]

    # 1. Define the TWO critical zones relative to the face
    # Zone A: The Top Dome (above eyes)
    # Zone B: The Chin Guard (below mouth)
    
    # Coordinates for Chin Guard Zone (Crucial for Full-Face helmets)
    chin_rx1 = max(0, face_x - int(face_w * 0.2))
    chin_rx2 = min(w_fr, face_x + face_w + int(face_w * 0.2))
    chin_ry1 = face_y + int(face_h * 0.7)  # Starts at lower face
    chin_ry2 = min(h_fr, face_y + int(face_h * 1.3)) # Ends below chin

    # Coordinates for Top Dome
    top_ry1 = max(0, face_y - int(face_h * 0.8))
    top_ry2 = face_y + int(face_h * 0.2)

    # 2. Extract and Test the Chin Zone
    chin_roi = frame[chin_ry1:chin_ry2, chin_rx1:chin_rx2]
    if chin_roi.size == 0: return False, annotated, 0.0
    
    chin_gray = cv2.cvtColor(chin_roi, cv2.COLOR_BGR2GRAY)
    # Strict threshold: must be very dark to be plastic
    _, chin_mask = cv2.threshold(chin_gray, 55, 255, cv2.THRESH_BINARY_INV)
    
    chin_coverage = cv2.countNonZero(chin_mask) / (chin_roi.shape[0] * chin_roi.shape[1])

    # 3. Decision Logic
    # If there is a solid dark mass across the CHIN area, it's a helmet.
    # Hair/Bare faces will have skin tones or gaps here, giving low coverage.
    
    has_helmet = chin_coverage > 0.5  # 50% of the chin zone must be black plastic
    
    # --- Visualization ---
    # Draw the Chin Guard search box
    color = GREEN if has_helmet else RED
    cv2.rectangle(annotated, (chin_rx1, chin_ry1), (chin_rx2, chin_ry2), color, 2)
    cv2.putText(annotated, f"Chin Bar: {chin_coverage:.2f}", (chin_rx1, chin_ry1-5), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    print(f"[PPE] Chin Coverage: {chin_coverage:.2f} | Result: {has_helmet}")

    return has_helmet, annotated, chin_coverage
# ─── UI ──────────────────────────────────────────────────────────────────────
def put_text(img, text, pos, scale=0.65, color=WHITE, thickness=2):
    cv2.putText(img, text, pos, cv2.FONT_HERSHEY_DUPLEX, scale, color, thickness)

def draw_panel(frame):
    overlay = frame.copy()
    cv2.rectangle(overlay, (640, 0), (960, 480), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)

def draw_idle(frame):
    draw_panel(frame)
    put_text(frame, "PPE SAFETY GATE",   (655, 100), scale=0.7,  color=YELLOW)
    cv2.line(frame, (650, 115), (950, 115), YELLOW, 1)
    put_text(frame, "Show your face",    (665, 190), scale=0.6,  color=WHITE)
    put_text(frame, "WITHOUT helmet",    (660, 220), scale=0.6,  color=ORANGE)
    put_text(frame, "to sign in first",  (655, 250), scale=0.6,  color=WHITE)
    if int(time.time() * 2) % 2 == 0:
        cv2.circle(frame, (790, 330), 8, GREEN, -1)
    put_text(frame, "Waiting...", (755, 370), scale=0.55, color=(150,150,150))

def draw_worker_card(frame, worker_id, photo=None):
    draw_panel(frame)
    put_text(frame, "WORKER IDENTIFIED", (655, 40),  scale=0.65, color=GREEN)
    cv2.line(frame, (650, 55), (950, 55), GREEN, 1)
    if photo is not None:
        try:
            frame[70:190, 660:780] = cv2.resize(photo, (120, 120))
        except:
            pass
    put_text(frame, f"ID: {worker_id}",     (660, 215), scale=0.6,  color=WHITE)
    put_text(frame, "NOW PUT ON YOUR",      (655, 265), scale=0.55, color=YELLOW)
    put_text(frame, "FULL-FACE HELMET",     (655, 295), scale=0.6,  color=YELLOW)
    put_text(frame, "then face camera",     (660, 325), scale=0.5,  color=(180,180,180))

def draw_ppe_status(frame, has_helmet, streak, max_streak, coverage=0.0):
    draw_panel(frame)
    put_text(frame, "HELMET CHECK",  (660, 40), scale=0.75, color=YELLOW)
    cv2.line(frame, (650, 58), (950, 58), YELLOW, 1)

    h_col  = GREEN if has_helmet else RED
    h_text = "HELMET : DETECTED" if has_helmet else "HELMET : NOT FOUND"
    put_text(frame, h_text, (660, 110), color=h_col, scale=0.7)

    # Coverage bar
    bx, by, bw, bh = 660, 145, 280, 16
    cv2.rectangle(frame, (bx, by), (bx+bw, by+bh), (60,60,60), -1)
    filled = int(bw * min(coverage / 0.50, 1.0))
    if filled > 0:
        cv2.rectangle(frame, (bx, by), (bx+filled, by+bh),
                      GREEN if has_helmet else (80,80,80), -1)
    cv2.rectangle(frame, (bx, by), (bx+bw, by+bh), WHITE, 1)
    put_text(frame, f"Dark coverage: {coverage:.0%}", (660, 182),
             scale=0.45, color=(180,180,180))

    # Streak bar
    by2 = 200
    cv2.rectangle(frame, (bx, by2), (bx+bw, by2+bh), (60,60,60), -1)
    f2 = int(bw * min(streak / max_streak, 1.0))
    if f2 > 0:
        cv2.rectangle(frame, (bx, by2), (bx+f2, by2+bh),
                      GREEN if has_helmet else RED, -1)
    cv2.rectangle(frame, (bx, by2), (bx+bw, by2+bh), WHITE, 1)
    put_text(frame, f"Confirming {streak}/{max_streak}", (660, 237), scale=0.5)

    put_text(frame, "Yellow box = search zone", (660, 265),
             scale=0.44, color=(200,200,0))

    if not has_helmet:
        put_text(frame, "Put on full-face helmet", (660, 292), scale=0.5,  color=ORANGE)
        put_text(frame, "& face the camera",       (660, 315), scale=0.5,  color=ORANGE)
    else:
        put_text(frame, "Helmet on! Hold still...", (660, 292), scale=0.5, color=GREEN)

def draw_result(frame, granted, name):
    draw_panel(frame)
    if granted:
        put_text(frame, "ACCESS GRANTED",  (655, 155), scale=0.9,  color=GREEN, thickness=2)
        put_text(frame, f"Welcome,",       (660, 205), scale=0.65, color=GREEN)
        put_text(frame, f"{name}!",        (660, 238), scale=0.65, color=GREEN)
        put_text(frame, "Helmet Verified", (660, 285), scale=0.6,  color=GREEN)
        put_text(frame, "Proceed to work", (660, 318), scale=0.6,  color=WHITE)
    else:
        put_text(frame, "ACCESS DENIED",   (660, 155), scale=0.9,  color=RED, thickness=2)
        put_text(frame, "No helmet found", (660, 205), scale=0.65, color=RED)
        put_text(frame, "Wear full-face",  (660, 255), scale=0.6,  color=ORANGE)
        put_text(frame, "helmet before",   (660, 285), scale=0.6,  color=ORANGE)
        put_text(frame, "entering.",       (660, 315), scale=0.6,  color=ORANGE)

# ─── Recent check tracker ────────────────────────────────────────────────────
last_check_times = {}
last_voice_prompt = 0  # Track last time we gave voice prompt

def was_checked_recently(wid):
    last = last_check_times.get(wid)
    if last is None: return False
    return (datetime.now() - last).total_seconds() < RECHECK_SECONDS
def mark_checked(wid):
    last_check_times[wid] = datetime.now()

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════
print("=" * 55)
print("  PPE Safety Gate — Full-Face Black Helmet")
print("=" * 55)
print(f"  Size ratio needed : {HELMET_SIZE_RATIO}x face width")
print(f"  Dark pixel thresh : {DARK_PIXEL_THRESH}")
print(f"  Min dark coverage : {MIN_DARK_COVERAGE:.0%}")
print(f"  Helmet photos saved to: {HELMET_PHOTOS_DIR}/")
print("=" * 55)

recognizer, worker_ids = load_face_model()
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

worker_photos = {}
for wid in worker_ids:
    for ext in ('.jpg', '.jpeg', '.png'):
        p = os.path.join(IMAGES_FOLDER, wid + ext)
        if os.path.exists(p):
            worker_photos[wid] = cv2.imread(p)
            break

print("\n[INFO] Step 1: Stand in front of camera WITHOUT helmet to be identified.")
print("[INFO] Step 2: Put on your full-face helmet and face camera.")
print(f"[INFO] Helmet photos will be saved to: {HELMET_PHOTOS_DIR}/")
print("[INFO] Press Q to quit.\n")

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH,  960)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

state         = STATE_IDLE
current_id    = None
current_photo = None
ppe_streak    = 0
ppe_counter   = 0
result_timer  = 0
info_counter  = 0
last_coverage = 0.0
last_face_box = None   # CRITICAL: stores face position for helmet search
helmet_photo_path = None  # Store path to captured helmet photo
last_idle_voice = 0  # Track when we last spoke in idle state

while True:
    ret, frame = cap.read()
    if not ret:
        print("[ERROR] Camera not found.")
        break

    display = frame.copy()
    gray    = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # ── Face detection ────────────────────────────────────────────────────────
    faces_found = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

    detected_id   = None
    detected_face = None

    for (x, y, w, h) in faces_found:
        face_roi          = cv2.resize(gray[y:y+h, x:x+w], (200, 200))
        label, confidence = recognizer.predict(face_roi)

        if confidence < FACE_CONFIDENCE:
            detected_id   = worker_ids[label]
            detected_face = (x, y, w, h)
            box_color     = GREEN if state == STATE_GRANTED else YELLOW
            cv2.rectangle(display, (x, y), (x+w, y+h), box_color, 2)
            cv2.putText(display, f"{detected_id} ({int(confidence)})",
                        (x, y-8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)
        else:
            cv2.rectangle(display, (x, y), (x+w, y+h), RED, 2)
            cv2.putText(display, "Unknown",
                        (x, y-8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, RED, 2)

    # Only update face box when face is actually visible (not when helmet is on)
    if detected_face and state in (STATE_IDLE, STATE_SHOW_INFO):
        last_face_box = detected_face

    # ── State Machine ─────────────────────────────────────────────────────────
    if state == STATE_IDLE:
        draw_idle(display)
        
        # Voice prompt every 5 seconds while waiting
        current_time = time.time()
        if current_time - last_idle_voice > 5:
            speak("Please show your face to the camera without helmet for identification")
            last_idle_voice = current_time
        
        if detected_id:
            current_id    = detected_id
            current_photo = worker_photos.get(detected_id)
            info_counter  = 0
            helmet_photo_path = None
            print(f"\n[IDENTIFIED] Worker: {current_id}  "
                  f"Face stored at: {detected_face}")
            speak(f"Worker detected. {current_id}")
            state = STATE_ALREADY_DONE if was_checked_recently(current_id) \
                    else STATE_SHOW_INFO

    elif state == STATE_SHOW_INFO:
        # Keep updating face box while worker is still visible
        if detected_face:
            last_face_box = detected_face
        draw_worker_card(display, current_id, current_photo)
        info_counter += 1
        if info_counter > 80:   # ~2.5 sec to give time to put helmet on
            if last_face_box is None:
                print("[WARN] No face position stored — cannot check helmet.")
                state = STATE_IDLE
            else:
                state       = STATE_PPE_CHECK
                ppe_streak  = 0
                ppe_counter = 0
                print(f"[PPE] Helmet check started. Using face box: {last_face_box}")

    elif state == STATE_PPE_CHECK:
        has_helmet    = False
        last_coverage = 0.0

        if last_face_box:
            fx, fy, fw, fh = last_face_box
            has_helmet, display, last_coverage = detect_fullface_helmet(
                frame, fx, fy, fw, fh)
        else:
            display = frame.copy()
            print("[WARN] No face box — cannot detect helmet.")

        draw_ppe_status(display, has_helmet, ppe_streak,
                        PPE_CONFIRM_FRAMES, last_coverage)
        ppe_counter += 1
        ppe_streak = (ppe_streak + 1) if has_helmet else max(0, ppe_streak - 1)

        if ppe_counter % 20 == 0:
            print(f" ... Streak: {ppe_streak}/{PPE_CONFIRM_FRAMES}  "
                  f"Coverage: {last_coverage:.1%}")

        if ppe_streak >= PPE_CONFIRM_FRAMES:
            # *** CAPTURE HELMET PHOTO WHEN CONFIRMED ***
            helmet_photo_path = save_helmet_photo(frame, current_id)
            
            log_event(current_id, "GRANTED", helmet_photo_path)
            mark_checked(current_id)
            print(f"[SUCCESS] {current_id} — Helmet verified. GRANTED.")
            speak("Permission granted. Helmet verified. Proceed to work.")
            state        = STATE_GRANTED
            result_timer = time.time()

        elif ppe_counter > PPE_TIMEOUT_FRAMES:
            log_event(current_id, "DENIED", None)
            print(f"[DENIED] {current_id} — No helmet. DENIED.")
            speak("Permission denied. Helmet not detected. Please wear a full face helmet.")
            state        = STATE_DENIED
            result_timer = time.time()

    elif state == STATE_GRANTED:
        draw_result(display, granted=True,  name=current_id)
        if time.time() - result_timer > RESULT_DISPLAY_SEC:
            last_face_box = None
            state = STATE_IDLE

    elif state == STATE_DENIED:
        draw_result(display, granted=False, name=current_id)
        if time.time() - result_timer > RESULT_DISPLAY_SEC:
            last_face_box = None
            state = STATE_IDLE

    elif state == STATE_ALREADY_DONE:
        draw_panel(display)
        put_text(display, "Already checked in!",      (655, 190), scale=0.7,  color=ORANGE)
        put_text(display, f"ID: {current_id}",        (665, 235), scale=0.6,  color=WHITE)
        put_text(display, f"Wait {RECHECK_SECONDS}s", (665, 275), scale=0.55,
                 color=(150,150,150))
        info_counter += 1
        if info_counter > 90:
            state = STATE_IDLE

    # ── Status bar ────────────────────────────────────────────────────────────
    labels_map = {
        STATE_IDLE:"SHOW FACE TO SIGN IN",   STATE_SHOW_INFO:"IDENTIFIED — PUT ON HELMET",
        STATE_PPE_CHECK:"CHECKING HELMET...", STATE_GRANTED:"ACCESS GRANTED",
        STATE_DENIED:"ACCESS DENIED",        STATE_ALREADY_DONE:"ALREADY CHECKED IN"
    }
    colors_map = {
        STATE_IDLE:DARK,             STATE_SHOW_INFO:(0,100,150),
        STATE_PPE_CHECK:(0,120,180), STATE_GRANTED:(0,100,0),
        STATE_DENIED:(0,0,150),      STATE_ALREADY_DONE:(0,100,150)
    }
    cv2.rectangle(display, (0,455), (960,480), colors_map.get(state, DARK), -1)
    put_text(display, labels_map.get(state,""),            (10, 473),  scale=0.5, color=WHITE)
    put_text(display, datetime.now().strftime("%H:%M:%S"), (860, 473), scale=0.5,
             color=(180,180,180))

    cv2.imshow("PPE Safety Gate", display)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("System shut down.")