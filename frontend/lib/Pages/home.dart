import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:swacchtrack/Pages/qrScan.dart';
import 'package:swacchtrack/services/api_service.dart';
import 'package:swacchtrack/services/location_services.dart';

class Home extends StatefulWidget {
  const Home({super.key});

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  bool _isCheckedIn = false;
  bool _isLoading = false;
  String? _statusMessage;
  String? _checkInTime;
  String? _checkOutTime;

  @override
  void initState() {
    super.initState();
    _fetchTodayStatus();
  }

  /// Fetch today's attendance status from the server
  Future<void> _fetchTodayStatus() async {
    try {
      final data = await ApiService.getAttendanceToday();
      final records = data['records'] as List<dynamic>? ?? [];

      if (records.isNotEmpty) {
        final latest = records[0];
        final status = latest['status'];

        if (mounted) {
          setState(() {
            _isCheckedIn = (status == 'checked_in');
            _checkInTime = latest['check_in_time'];
            _checkOutTime = latest['check_out_time'];
            if (_isCheckedIn) {
              _statusMessage = '✅ Checked in today';
              // Also start GPS tracking if checked in
              LocationService.start();
            } else if (status == 'checked_out') {
              _statusMessage = '✅ Checked out today';
            }
          });
        }
      }
    } catch (e) {
      // Silent fail — user will see the default state
    }
  }

  /// Get current GPS position
  Future<Position> _getCurrentPosition() async {
    bool enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) throw Exception('Location services are disabled');

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw Exception('Location permission denied');
    }

    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
  }

  /// Handle Check-In (GPS only, no QR)
  Future<void> _handleCheckIn({String? qrData}) async {
    if (_isCheckedIn) return;

    setState(() => _isLoading = true);

    try {
      final position = await _getCurrentPosition();

      final result = await ApiService.checkIn(
        latitude: position.latitude,
        longitude: position.longitude,
        qrData: qrData,
      );

      // Start GPS tracking after check-in
      await LocationService.start();

      if (!mounted) return;
      setState(() {
        _isCheckedIn = true;
        _statusMessage = result['message'] ?? '✅ Checked in';
        _checkInTime = result['attendance']?['check_in_time'];
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Checked in!')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Handle Check-Out
  Future<void> _handleCheckOut() async {
    if (!_isCheckedIn) return;

    setState(() => _isLoading = true);

    try {
      final position = await _getCurrentPosition();

      final result = await ApiService.checkOut(
        latitude: position.latitude,
        longitude: position.longitude,
      );

      // Stop GPS tracking
      LocationService.stop();

      if (!mounted) return;
      setState(() {
        _isCheckedIn = false;
        _statusMessage = result['message'] ?? '✅ Checked out';
        _checkOutTime = result['attendance']?['check_out_time'];
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Checked out!')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Open QR Scanner, then check-in with the scanned data
  Future<void> _handleQrCheckIn() async {
    final qrData = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const QrScannerPage()),
    );

    if (qrData != null && qrData.isNotEmpty) {
      await _handleCheckIn(qrData: qrData);
    }
  }

  String _formatTime(String? isoTime) {
    if (isoTime == null) return '--:--';
    try {
      final dt = DateTime.parse(isoTime).toLocal();
      final h = dt.hour.toString().padLeft(2, '0');
      final m = dt.minute.toString().padLeft(2, '0');
      return '$h:$m';
    } catch (_) {
      return '--:--';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
      child: Column(
        children: [
          const SizedBox(height: 10),

          // Status card
          if (_statusMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Color.fromRGBO(51, 45, 152, 0.15),
                borderRadius: BorderRadius.circular(15),
                border: Border.all(color: Color.fromRGBO(37, 30, 163, 0.4)),
              ),
              child: Column(
                children: [
                  Text(
                    _statusMessage!,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Text(
                        'In: ${_formatTime(_checkInTime)}',
                        style: const TextStyle(fontSize: 14),
                      ),
                      Text(
                        'Out: ${_formatTime(_checkOutTime)}',
                        style: const TextStyle(fontSize: 14),
                      ),
                    ],
                  ),
                ],
              ),
            ),

          const SizedBox(height: 20),

          // Loading indicator
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.only(bottom: 20),
              child: CircularProgressIndicator(),
            ),

          /// CHECK IN (GPS only)
          SizedBox(
            height: 70,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (_isLoading || _isCheckedIn) ? null : _handleCheckIn,
              style: ElevatedButton.styleFrom(
                backgroundColor: _isCheckedIn
                    ? const Color.fromRGBO(86, 85, 91, 0.744)
                    : Colors.green,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
              ),
              child: const Text(
                "GPS Check In",
                style: TextStyle(fontSize: 24, color: Colors.black),
              ),
            ),
          ),

          const SizedBox(height: 20),

          /// CHECK OUT
          SizedBox(
            height: 70,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (_isLoading || !_isCheckedIn) ? null : _handleCheckOut,
              style: ElevatedButton.styleFrom(
                backgroundColor: _isCheckedIn
                    ? Colors.red
                    : const Color.fromRGBO(86, 85, 91, 0.744),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
              ),
              child: const Text(
                "Check Out",
                style: TextStyle(fontSize: 24, color: Colors.black),
              ),
            ),
          ),

          const SizedBox(height: 20),

          /// QR SCAN CHECK-IN
          SizedBox(
            height: 70,
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: (_isLoading || _isCheckedIn) ? null : _handleQrCheckIn,
              icon: const Icon(Icons.qr_code_scanner, size: 28),
              label: const Text(
                "Scan QR & Check In",
                style: TextStyle(fontSize: 20),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
