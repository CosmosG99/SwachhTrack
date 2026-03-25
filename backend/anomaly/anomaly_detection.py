"""
Worker behaviour anomaly detection from GPS (and optional check-in / task) data.

Input JSON shape (stdin, POST /analyze, or run_detection):
{
  "tracking_data": [
    { "worker_id": "<id>", "lat": 19.07, "lon": 72.87, "timestamp": "2026-03-24T09:00:00" }
  ],
  "checkin_data": [ { "worker_id": "...", "checkin_time": "2026-03-24T11:30:00" } ],  // optional
  "task_data": [ { "worker_id": "...", "tasks_completed": 0, "distance_travelled": 100 } ]  // optional
}

CLI:
  python anomaly_detection.py              # reads JSON from stdin, writes JSON to stdout
  python anomaly_detection.py --serve      # HTTP server, POST /analyze (port ANOMALY_PORT, default 5055)
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta

import pandas as pd
from geopy.distance import geodesic
from sklearn.cluster import DBSCAN

SHIFT_START = datetime.strptime("09:00:00", "%H:%M:%S").time()


def _normalize_tracking_df(raw: list) -> pd.DataFrame | None:
    if not raw:
        return None
    df = pd.DataFrame(raw)
    if df.empty:
        return None
    if "latitude" in df.columns and "lat" not in df.columns:
        df = df.rename(columns={"latitude": "lat", "longitude": "lon"})
    required = {"worker_id", "lat", "lon", "timestamp"}
    if not required.issubset(set(df.columns)):
        missing = required - set(df.columns)
        raise ValueError(f"tracking_data missing columns: {sorted(missing)}")
    df = df.copy()
    df["worker_id"] = df["worker_id"].astype(str)
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    df = df.dropna(subset=["timestamp", "lat", "lon"])
    return df


def _last_location_map(df: pd.DataFrame) -> dict[str, dict]:
    """Latest lat/lon per worker_id (by timestamp)."""
    if df is None or df.empty:
        return {}
    idx = df.sort_values("timestamp").groupby("worker_id").tail(1)
    out = {}
    for _, row in idx.iterrows():
        wid = str(row["worker_id"])
        out[wid] = {"lat": float(row["lat"]), "lon": float(row["lon"])}
    return out


def _attach_worker_location(alert: dict, loc_map: dict, worker_id: str | None) -> dict:
    if worker_id and worker_id in loc_map:
        alert["location"] = {
            "latitude": loc_map[worker_id]["lat"],
            "longitude": loc_map[worker_id]["lon"],
        }
    return alert


def detect_idle_workers(df: pd.DataFrame, loc_map: dict) -> list:
    alerts = []
    work = df.sort_values("timestamp").copy()
    grouped = work.groupby("worker_id")

    for worker, group in grouped:
        worker = str(worker)
        if len(group) < 2:
            continue
        first = group.iloc[0]
        last = group.iloc[-1]
        loc1 = (first["lat"], first["lon"])
        loc2 = (last["lat"], last["lon"])
        distance = geodesic(loc1, loc2).meters
        time_diff = last["timestamp"] - first["timestamp"]
        if distance < 50 and time_diff > timedelta(hours=3):
            alert = {
                "type": "idle_worker",
                "worker_id": worker,
                "message": "Worker has not moved significantly for over 3 hours",
            }
            _attach_worker_location(alert, loc_map, worker)
            alerts.append(alert)
    return alerts


def detect_proxy_attendance(df: pd.DataFrame, loc_map: dict) -> list:
    alerts = []
    work = df.copy()
    coords = work[["lat", "lon"]].to_numpy()
    if len(coords) < 3:
        return alerts
    model = DBSCAN(eps=0.00005, min_samples=3)
    labels = model.fit_predict(coords)
    work["_cluster"] = labels
    clusters = work[work["_cluster"] != -1].groupby("_cluster")

    for _, group in clusters:
        if len(group) >= 3:
            workers = [str(w) for w in group["worker_id"].unique()]
            alert = {
                "type": "proxy_attendance",
                "workers": workers,
                "message": "Multiple workers reported from the same tight GPS cluster",
                "worker_locations": [
                    {"worker_id": w, "latitude": loc_map[w]["lat"], "longitude": loc_map[w]["lon"]}
                    for w in workers
                    if w in loc_map
                ],
            }
            alerts.append(alert)
    return alerts


def detect_late_checkins(checkin_df: pd.DataFrame, loc_map: dict) -> list:
    alerts = []
    if checkin_df is None or checkin_df.empty:
        return alerts
    for _, row in checkin_df.iterrows():
        wid = str(row["worker_id"])
        checkin_ts = pd.Timestamp(row["checkin_time"])
        if pd.isna(checkin_ts):
            continue
        shift_start = pd.Timestamp.combine(checkin_ts.date(), SHIFT_START)
        if checkin_ts.tz is not None:
            shift_start = shift_start.tz_localize(checkin_ts.tz)
        if checkin_ts > shift_start + pd.Timedelta(hours=2):
            alert = {
                "type": "late_checkin",
                "worker_id": wid,
                "message": "Worker checked in more than 2 hours after shift start",
            }
            _attach_worker_location(alert, loc_map, wid)
            alerts.append(alert)
    return alerts


def detect_no_task_workers(task_df: pd.DataFrame, loc_map: dict) -> list:
    alerts = []
    if task_df is None or task_df.empty:
        return alerts
    for _, row in task_df.iterrows():
        wid = str(row["worker_id"])
        if int(row["tasks_completed"]) == 0 and float(row["distance_travelled"]) > 3000:
            alert = {
                "type": "low_productivity",
                "worker_id": wid,
                "message": "Worker travelled significant distance but completed no tasks",
            }
            _attach_worker_location(alert, loc_map, wid)
            alerts.append(alert)
    return alerts


def detect_worker_clusters(df: pd.DataFrame, loc_map: dict) -> list:
    alerts = []
    work = df.copy()
    coords = work[["lat", "lon"]].to_numpy()
    if len(coords) < 3:
        return alerts
    model = DBSCAN(eps=0.0001, min_samples=3)
    labels = model.fit_predict(coords)
    work["_cluster_group"] = labels
    clusters = work[work["_cluster_group"] != -1].groupby("_cluster_group")

    for _, group in clusters:
        if len(group) >= 3:
            workers = [str(w) for w in group["worker_id"].unique()]
            alert = {
                "type": "worker_cluster",
                "workers": workers,
                "message": "Several workers clustered at the same location during work hours",
                "worker_locations": [
                    {"worker_id": w, "latitude": loc_map[w]["lat"], "longitude": loc_map[w]["lon"]}
                    for w in workers
                    if w in loc_map
                ],
            }
            alerts.append(alert)
    return alerts


def run_detection(payload: dict) -> dict:
    """
    Run all detectors. Returns { "alerts": [...], "error": null | str }.
    """
    try:
        tracking = payload.get("tracking_data") or []
        df = _normalize_tracking_df(tracking)
        if df is None or df.empty:
            return {"alerts": [], "error": None}

        loc_map = _last_location_map(df)

        checkin_df = None
        if payload.get("checkin_data"):
            checkin_df = pd.DataFrame(payload["checkin_data"])
            if not checkin_df.empty:
                checkin_df = checkin_df.copy()
                checkin_df["worker_id"] = checkin_df["worker_id"].astype(str)
                checkin_df["checkin_time"] = pd.to_datetime(
                    checkin_df["checkin_time"], utc=True, errors="coerce"
                )
                checkin_df = checkin_df.dropna(subset=["checkin_time"])

        task_df = None
        if payload.get("task_data"):
            task_df = pd.DataFrame(payload["task_data"])
            if not task_df.empty:
                task_df = task_df.copy()
                task_df["worker_id"] = task_df["worker_id"].astype(str)

        alerts: list = []
        alerts.extend(detect_idle_workers(df, loc_map))
        alerts.extend(detect_proxy_attendance(df, loc_map))
        alerts.extend(detect_late_checkins(checkin_df, loc_map) if checkin_df is not None else [])
        alerts.extend(detect_no_task_workers(task_df, loc_map) if task_df is not None else [])
        alerts.extend(detect_worker_clusters(df, loc_map))

        return {"alerts": alerts, "error": None}
    except Exception as e:
        return {"alerts": [], "error": str(e)}


def _flask_app():
    from flask import Flask, jsonify, request

    app = Flask(__name__)

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"})

    @app.post("/analyze")
    def analyze():
        payload = request.get_json(silent=True) or {}
        result = run_detection(payload)
        status = 400 if result.get("error") else 200
        return jsonify(result), status

    return app


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--serve":
        port = int(os.environ.get("ANOMALY_PORT", "5055"))
        app = _flask_app()
        app.run(host="0.0.0.0", port=port, threaded=True)
        return

    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError as e:
        print(json.dumps({"alerts": [], "error": f"Invalid JSON: {e}"}))
        sys.exit(1)
        return

    out = run_detection(payload)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
