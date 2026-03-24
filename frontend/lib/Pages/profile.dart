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
      // First try cached user from SharedPreferences
      final savedUser = await ApiService.getSavedUser();
      if (savedUser != null && mounted) {
        setState(() {
          _user = savedUser;
          _isLoading = false;
        });
      }

      // Then refresh from server
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load profile')),
        );
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
        color: Color.fromRGBO(51, 45, 152, 0.715),
        borderRadius: BorderRadius.circular(30),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 25),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            Flexible(
              child: Text(
                value,
                style: TextStyle(fontSize: 16, color: Colors.white70),
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
      return const Center(child: CircularProgressIndicator());
    }

    final name = _user?['name'] ?? 'N/A';
    final employeeId = _user?['employee_id'] ?? 'N/A';
    final role = _user?['role'] ?? 'N/A';
    final phone = _user?['phone'] ?? 'N/A';
    final department = _user?['department'] ?? 'N/A';
    final email = _user?['email'] ?? 'N/A';

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          // Avatar + Name header
          CircleAvatar(
            radius: 40,
            backgroundColor: Color.fromRGBO(37, 30, 163, 1),
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: TextStyle(fontSize: 36, color: Colors.white),
            ),
          ),

          SizedBox(height: 10),

          Text(
            name,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),

          Text(
            role.toUpperCase(),
            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
          ),

          SizedBox(height: 25),

          _buildInfoRow("Employee ID", employeeId),
          SizedBox(height: 15),
          _buildInfoRow("Phone", phone),
          SizedBox(height: 15),
          _buildInfoRow("Email", email),
          SizedBox(height: 15),
          _buildInfoRow("Department", department),

          const Spacer(),

          // Logout button
          SizedBox(
            height: 60,
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout, color: Colors.white),
              label: Text(
                "Logout",
                style: TextStyle(color: Colors.white, fontSize: 20),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color.fromARGB(255, 193, 33, 21),
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
