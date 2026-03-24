import 'dart:async';
import 'dart:convert';

import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:swacchtrack/services/api_service.dart';

class LocationService {
  static Timer? _timer;
  static bool _isRunning = false;

  /// Tracking interval
  static const Duration _interval = Duration(minutes: 5);

  /// No-op initializer (keeps main.dart compatible)
  static Future<void> initialize() async {
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

      // 2. Request permission
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
      await _fetchAndSendLocation();

      // 4. Set up periodic timer (every 5 minutes)
      _timer = Timer.periodic(_interval, (timer) async {
        print('[GPS] ⏱️ Timer tick #${timer.tick} — sending location...');
        await _fetchAndSendLocation();
      });

      _isRunning = true;
      print('[GPS] Tracking started (every ${_interval.inMinutes} min)');
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

  /// Fetch current position and send to backend
  static Future<void> _fetchAndSendLocation() async {
    try {
      final locationSettings = LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 0,
      );

      Position position = await Geolocator.getCurrentPosition(
        locationSettings: locationSettings,
      );

      print('[GPS] Lat: ${position.latitude}, Lng: ${position.longitude}, '
          'Accuracy: ${position.accuracy}m, Speed: ${position.speed}');

      await _sendToBackend(position);
    } catch (e) {
      print('[GPS] Error fetching location: $e');
    }
  }

  /// Send location to the real backend endpoint
  static Future<void> _sendToBackend(Position position) async {
    try {
      final token = await ApiService.getToken();
      if (token == null) {
        print('[GPS] No auth token — skipping API send');
        return;
      }

      final response = await http.post(
        Uri.parse('${ApiService.baseUrl}/tracking/location'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'speed': position.speed,
          'recorded_at': DateTime.now().toUtc().toIso8601String(),
        }),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        print('[GPS] ✅ Location sent to backend');
      } else {
        print('[GPS] ⚠️ Backend responded: ${response.statusCode}');
      }
    } catch (e) {
      print('[GPS] API error (non-fatal): $e');
    }
  }
}
