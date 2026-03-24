import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl =
      'https://swachhtrack-4gnt.onrender.com/api/v1';

  // ── Keys for SharedPreferences ──
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'auth_user';

  // ─────────────────────────────────
  //  AUTH
  // ─────────────────────────────────

  /// Login with employee_id + password.
  /// Returns `{ "token": "...", "user": { ... } }` on success.
  static Future<Map<String, dynamic>> login(
    String employeeId,
    String password,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'employee_id': employeeId,
        'password': password,
      }),
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      // Persist token + user
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, body['token']);
      await prefs.setString(_userKey, jsonEncode(body['user']));
      return body;
    } else {
      throw ApiException(
        body['error'] ?? 'Login failed',
        response.statusCode,
      );
    }
  }

  /// Get the currently logged-in user's profile from the server.
  static Future<Map<String, dynamic>> getMe() async {
    final token = await getToken();
    if (token == null) throw ApiException('Not authenticated', 401);

    final response = await http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      return body;
    } else {
      throw ApiException(
        body['error'] ?? 'Failed to fetch profile',
        response.statusCode,
      );
    }
  }

  // ─────────────────────────────────
  //  ATTENDANCE
  // ─────────────────────────────────

  /// Check in with GPS coordinates and optional QR data.
  static Future<Map<String, dynamic>> checkIn({
    required double latitude,
    required double longitude,
    String? qrData,
  }) async {
    final token = await getToken();
    if (token == null) throw ApiException('Not authenticated', 401);

    final bodyMap = <String, dynamic>{
      'latitude': latitude,
      'longitude': longitude,
    };
    if (qrData != null) bodyMap['qr_data'] = qrData;

    final response = await http.post(
      Uri.parse('$baseUrl/attendance/check-in'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(bodyMap),
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 201 || response.statusCode == 200) {
      return body;
    } else {
      throw ApiException(
        body['error'] ?? 'Check-in failed',
        response.statusCode,
      );
    }
  }

  /// Check out with GPS coordinates.
  static Future<Map<String, dynamic>> checkOut({
    required double latitude,
    required double longitude,
  }) async {
    final token = await getToken();
    if (token == null) throw ApiException('Not authenticated', 401);

    final response = await http.post(
      Uri.parse('$baseUrl/attendance/check-out'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'latitude': latitude,
        'longitude': longitude,
      }),
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      return body;
    } else {
      throw ApiException(
        body['error'] ?? 'Check-out failed',
        response.statusCode,
      );
    }
  }

  /// Get today's attendance status for the logged-in user.
  static Future<Map<String, dynamic>> getAttendanceToday() async {
    final token = await getToken();
    if (token == null) throw ApiException('Not authenticated', 401);

    final response = await http.get(
      Uri.parse('$baseUrl/attendance/today'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      return body;
    } else {
      throw ApiException(
        body['error'] ?? 'Failed to fetch attendance',
        response.statusCode,
      );
    }
  }

  // ─────────────────────────────────
  //  TASKS
  // ─────────────────────────────────

  /// List tasks assigned to the logged-in worker.
  static Future<Map<String, dynamic>> getTasks({String? status}) async {
    final token = await getToken();
    if (token == null) throw ApiException('Not authenticated', 401);

    String url = '$baseUrl/tasks';
    if (status != null) url += '?status=$status';

    final response = await http.get(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      return body;
    } else {
      throw ApiException(
        body['error'] ?? 'Failed to fetch tasks',
        response.statusCode,
      );
    }
  }

  /// Get a single task's details.
  static Future<Map<String, dynamic>> getTask(String taskId) async {
    final token = await getToken();
    if (token == null) throw ApiException('Not authenticated', 401);

    final response = await http.get(
      Uri.parse('$baseUrl/tasks/$taskId'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      return body;
    } else {
      throw ApiException(
        body['error'] ?? 'Failed to fetch task',
        response.statusCode,
      );
    }
  }

  /// Worker updates task status.
  /// [status] must be 'in_progress' or 'completed'.
  /// For 'completed', optionally pass [proofImage] (base64), [proofNotes],
  /// [latitude], [longitude].
  static Future<Map<String, dynamic>> updateTaskStatus({
    required String taskId,
    required String status,
    String? proofImage,
    String? proofNotes,
    double? latitude,
    double? longitude,
  }) async {
    final token = await getToken();
    if (token == null) throw ApiException('Not authenticated', 401);

    final bodyMap = <String, dynamic>{'status': status};
    if (proofImage != null) bodyMap['proof_image'] = proofImage;
    if (proofNotes != null) bodyMap['proof_notes'] = proofNotes;
    if (latitude != null) bodyMap['latitude'] = latitude;
    if (longitude != null) bodyMap['longitude'] = longitude;

    final response = await http.put(
      Uri.parse('$baseUrl/tasks/$taskId/status'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(bodyMap),
    );

    final body = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode == 200) {
      return body;
    } else {
      throw ApiException(
        body['error'] ?? 'Failed to update task',
        response.statusCode,
      );
    }
  }

  // ─────────────────────────────────
  //  TOKEN HELPERS
  // ─────────────────────────────────

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString(_userKey);
    if (userStr == null) return null;
    return jsonDecode(userStr) as Map<String, dynamic>;
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}

// ─────────────────────────────────
//  Custom exception
// ─────────────────────────────────

class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, this.statusCode);

  @override
  String toString() => 'ApiException($statusCode): $message';
}
