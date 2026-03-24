import 'dart:async';
import 'dart:convert';

import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

class LocationService {
  static Timer? _timer;
  static bool _isRunning = false;

  /// No-op initializer (keeps main.dart compatible)
  static Future<void> initialize() async {
    // Nothing to configure — we use a simple foreground Timer now
    print('[GPS] LocationService initialized');
  }

  /// Start tracking: requests permission, fetches first location, starts timer
  static Future<void> start() async {
    if (_isRunning) {
      print('[GPS] Already running');
      return;
    }

    try {
      // 1. Check if location services are enabled
      bool enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        print('[GPS] Location services are DISABLED');
        return;
      }

      // 2. Request permission (safe — we are in the foreground)
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        print('[GPS] Permission denied: $permission');
        return;
      }

      // 3. Fetch first location immediately
      await _fetchAndLogLocation();

      // 4. Set up periodic timer (every 10 minutes)
      _timer = Timer.periodic(const Duration(minutes: 10), (timer) async {
        await _fetchAndLogLocation();
      });

      _isRunning = true;
      print('[GPS] Tracking started');
    } catch (e) {
      print('[GPS] Error starting tracking: $e');
    }
  }

  /// Stop tracking
  static void stop() {
    _timer?.cancel();
    _timer = null;
    _isRunning = false;
    print('[GPS] Tracking stopped');
  }

  /// Check if currently tracking
  static bool get isRunning => _isRunning;

  /// Fetch current position and log it
  static Future<void> _fetchAndLogLocation() async {
    try {
      final locationSettings = LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
      );

      Position position = await Geolocator.getCurrentPosition(
        locationSettings: locationSettings,
      );

      print('[GPS] Latitude: ${position.latitude}, Longitude: ${position.longitude}');

      await _sendToApi(position.latitude, position.longitude);
    } catch (e) {
      print('[GPS] Error fetching location: $e');
    }
  }

  static Future<void> _sendToApi(double lat, double lng) async {
    const url = "https://your-api.com/location";

    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "latitude": lat,
          "longitude": lng,
          "timestamp": DateTime.now().toIso8601String(),
        }),
      );

      print("[GPS] Location sent to API: ${response.statusCode}");
    } catch (e) {
      print("[GPS] API error (non-fatal): $e");
    }
  }
}
