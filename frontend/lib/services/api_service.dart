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
