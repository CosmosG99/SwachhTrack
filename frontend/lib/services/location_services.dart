import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service/flutter_background_service.dart'
    show ServiceInstance;
import 'package:flutter_background_service/flutter_background_service.dart'
    show AndroidServiceInstance;
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

class LocationService {
  static final FlutterBackgroundService _service = FlutterBackgroundService();

  /// Initialize once in main()
  static Future<void> initialize() async {
    await _service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: false,
        isForegroundMode: true,
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(),
    );
  }

  /// Start tracking
  static Future<void> start() async {
    await _service.startService();
  }

  /// Stop tracking
  static void stop() {
    _service.invoke("stopService");
  }

  @pragma('vm:entry-point')
  static void onStart(ServiceInstance service) async {
    DartPluginRegistrant.ensureInitialized();

    /// VERY IMPORTANT
    /// Notification must be set immediately
    if (service is AndroidServiceInstance) {
      await service.setForegroundNotificationInfo(
        title: "GPS Tracking Active",
        content: "Sending location every 10 minutes",
      );
    }

    /// Stop listener
    service.on("stopService").listen((event) {
      service.stopSelf();
    });

    /// Run every 10 minutes
    Timer.periodic(const Duration(minutes: 10), (timer) async {
      await sendLocation();
    });
  }

  static Future<void> sendLocation() async {
    bool enabled = await Geolocator.isLocationServiceEnabled();

    if (!enabled) return;

    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever) {
      return;
    }

    final locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 0,
    );

    Position position = await Geolocator.getCurrentPosition(
      locationSettings: locationSettings,
    );

    await sendToApi(position.latitude, position.longitude);
  }

  static Future<void> sendToApi(double lat, double lng) async {
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

      print("Location sent: ${response.statusCode}");
    } catch (e) {
      print("API error: $e");
    }
  }
}
