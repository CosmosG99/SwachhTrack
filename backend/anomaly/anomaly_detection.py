import pandas as pd
from geopy.distance import geodesic
from sklearn.cluster import DBSCAN
import numpy as np
from datetime import datetime, timedelta

# -----------------------------
# DUMMY GPS TRACKING DATA
# -----------------------------

tracking_data = [
    {"worker_id": "W101", "lat": 19.0760, "lon": 72.8777, "timestamp": "2026-03-24 09:00:00"},
    {"worker_id": "W101", "lat": 19.0760, "lon": 72.8777, "timestamp": "2026-03-24 12:10:00"},

    {"worker_id": "W102", "lat": 19.0760, "lon": 72.8777, "timestamp": "2026-03-24 09:00:00"},
    {"worker_id": "W102", "lat": 19.0850, "lon": 72.8800, "timestamp": "2026-03-24 11:00:00"},

    {"worker_id": "W201", "lat": 19.0900, "lon": 72.9000, "timestamp": "2026-03-24 10:00:00"},
    {"worker_id": "W202", "lat": 19.09001, "lon": 72.90001, "timestamp": "2026-03-24 10:02:00"},
    {"worker_id": "W203", "lat": 19.09002, "lon": 72.90002, "timestamp": "2026-03-24 10:04:00"},
]

df = pd.DataFrame(tracking_data)
df["timestamp"] = pd.to_datetime(df["timestamp"])


# -----------------------------
# DUMMY TASK DATA
# -----------------------------

task_data = [
    {"worker_id": "W101", "tasks_completed": 0, "distance_travelled": 100},
    {"worker_id": "W102", "tasks_completed": 3, "distance_travelled": 5000},
    {"worker_id": "W201", "tasks_completed": 0, "distance_travelled": 4000},
]

task_df = pd.DataFrame(task_data)


# -----------------------------
# DUMMY CHECK-IN DATA
# -----------------------------

checkin_data = [
    {"worker_id": "W101", "checkin_time": "2026-03-24 11:30:00"},
    {"worker_id": "W102", "checkin_time": "2026-03-24 09:05:00"},
]

checkin_df = pd.DataFrame(checkin_data)
checkin_df["checkin_time"] = pd.to_datetime(checkin_df["checkin_time"])

SHIFT_START = datetime.strptime("09:00:00", "%H:%M:%S").time()


# -----------------------------
# 1️⃣ IDLE WORKER DETECTION
# -----------------------------

def detect_idle_workers(df):

    alerts = []

    grouped = df.sort_values("timestamp").groupby("worker_id")

    for worker, group in grouped:

        if len(group) < 2:
            continue

        first = group.iloc[0]
        last = group.iloc[-1]

        loc1 = (first["lat"], first["lon"])
        loc2 = (last["lat"], last["lon"])

        distance = geodesic(loc1, loc2).meters
        time_diff = last["timestamp"] - first["timestamp"]

        if distance < 50 and time_diff > timedelta(hours=3):

            alerts.append({
                "type": "idle_worker",
                "worker_id": worker,
                "message": "Worker has not moved for 3 hours"
            })

    return alerts


# -----------------------------
# 2️⃣ PROXY ATTENDANCE DETECTION
# -----------------------------

def detect_proxy_attendance(df):

    alerts = []

    coords = df[["lat", "lon"]].to_numpy()

    model = DBSCAN(eps=0.00005, min_samples=3)
    labels = model.fit_predict(coords)

    df["cluster"] = labels

    clusters = df[df["cluster"] != -1].groupby("cluster")

    for cluster_id, group in clusters:

        if len(group) >= 3:

            alerts.append({
                "type": "proxy_attendance",
                "workers": list(group["worker_id"]),
                "message": "Multiple workers checked in from same location"
            })

    return alerts


# -----------------------------
# 3️⃣ SUSPICIOUS CHECK-IN TIME
# -----------------------------

def detect_late_checkins(checkin_df):

    alerts = []

    for _, row in checkin_df.iterrows():

        checkin_time = row["checkin_time"].time()

        shift_datetime = datetime.combine(row["checkin_time"].date(), SHIFT_START)

        if row["checkin_time"] > shift_datetime + timedelta(hours=2):

            alerts.append({
                "type": "late_checkin",
                "worker_id": row["worker_id"],
                "message": "Worker checked in very late"
            })

    return alerts


# -----------------------------
# 4️⃣ WORKER NOT COMPLETING TASKS
# -----------------------------

def detect_no_task_workers(task_df):

    alerts = []

    for _, row in task_df.iterrows():

        if row["tasks_completed"] == 0 and row["distance_travelled"] > 3000:

            alerts.append({
                "type": "low_productivity",
                "worker_id": row["worker_id"],
                "message": "Worker travelled but completed no tasks"
            })

    return alerts


# -----------------------------
# 5️⃣ CLUSTERED WORKERS DURING WORK
# -----------------------------

def detect_worker_clusters(df):

    alerts = []

    coords = df[["lat", "lon"]].to_numpy()

    model = DBSCAN(eps=0.0001, min_samples=3)
    labels = model.fit_predict(coords)

    df["cluster_group"] = labels

    clusters = df[df["cluster_group"] != -1].groupby("cluster_group")

    for cluster_id, group in clusters:

        if len(group) >= 3:

            alerts.append({
                "type": "worker_cluster",
                "workers": list(group["worker_id"]),
                "message": "Workers staying together during work hours"
            })

    return alerts


# -----------------------------
# RUN ALL DETECTIONS
# -----------------------------

alerts = []

alerts.extend(detect_idle_workers(df))
alerts.extend(detect_proxy_attendance(df))
alerts.extend(detect_late_checkins(checkin_df))
alerts.extend(detect_no_task_workers(task_df))
alerts.extend(detect_worker_clusters(df))


print("\n🚨 ANOMALY ALERTS\n")

for alert in alerts:
    print(alert)