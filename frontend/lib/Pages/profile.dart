import 'package:flutter/material.dart';
import 'package:swacchtrack/Pages/login_page.dart';
import 'package:swacchtrack/services/api_service.dart';

class Profile extends StatefulWidget {
  const Profile({super.key});

  @override
  State<Profile> createState() => _ProfileState();
}

class _ProfileState extends State<Profile> {
  Map<String, dynamic>? _user;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final savedUser = await ApiService.getSavedUser();
      if (savedUser != null && mounted) {
        setState(() {
          _user = savedUser;
          _isLoading = false;
        });
      }

      final response = await ApiService.getMe();
      if (mounted) {
        setState(() {
          _user = response['user'];
          _isLoading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Failed to load profile')));
      }
    }
  }

  Future<void> _handleLogout() async {
    await ApiService.logout();
    if (!mounted) return;

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const Login()),
      (route) => false,
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Container(
      height: 70,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color.fromRGBO(37, 30, 163, 0.95),
            Color.fromRGBO(51, 45, 152, 0.85),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(0, 0, 0, 0.25),
            blurRadius: 10,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 25),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                color: Colors.white,
                letterSpacing: 0.4,
              ),
            ),
            Flexible(
              child: Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  color: Colors.white70,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(strokeWidth: 3));
    }

    final name = _user?['name'] ?? 'N/A';
    final employeeId = _user?['employee_id'] ?? 'N/A';
    final role = _user?['role'] ?? 'N/A';
    final phone = _user?['phone'] ?? 'N/A';
    final department = _user?['department'] ?? 'N/A';
    final email = _user?['email'] ?? 'N/A';

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0F0F1A), Color(0xFF15153A)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 25),
        child: Column(
          children: [
            /// Avatar
            Container(
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Color.fromRGBO(37, 30, 163, 0.4),
                    blurRadius: 18,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: CircleAvatar(
                radius: 42,
                backgroundColor: const Color.fromRGBO(37, 30, 163, 1),
                child: Text(
                  name.isNotEmpty ? name[0].toUpperCase() : '?',
                  style: const TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 14),

            /// Name
            Text(
              name,
              style: const TextStyle(
                fontSize: 23,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 0.3,
              ),
            ),

            const SizedBox(height: 4),

            /// Role
            Text(
              role.toUpperCase(),
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[400],
                letterSpacing: 1,
                fontWeight: FontWeight.w500,
              ),
            ),

            const SizedBox(height: 28),

            _buildInfoRow("Employee ID", employeeId),
            const SizedBox(height: 16),

            _buildInfoRow("Phone", phone),
            const SizedBox(height: 16),

            _buildInfoRow("Email", email),
            const SizedBox(height: 16),

            _buildInfoRow("Department", department),

            const Spacer(),

            /// Logout button
            SizedBox(
              height: 60,
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _handleLogout,
                icon: const Icon(Icons.logout, color: Colors.white),
                label: const Text(
                  "Logout",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  elevation: 6,
                  backgroundColor: const Color.fromARGB(255, 193, 33, 21),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
