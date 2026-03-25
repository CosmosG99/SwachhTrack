import 'dart:io';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:swacchtrack/services/api_service.dart';
import 'package:swacchtrack/utils/language_provider.dart';

// ─────────────────────────────────────────────
//  MAIN TASKS PAGE — shows list of tasks
// ─────────────────────────────────────────────

class ProofOfWorkPage extends StatefulWidget {
  const ProofOfWorkPage({super.key});

  @override
  State<ProofOfWorkPage> createState() => _ProofOfWorkPageState();
}

class _ProofOfWorkPageState extends State<ProofOfWorkPage>
    with AutomaticKeepAliveClientMixin {
  List<dynamic> _tasks = [];
  bool _isLoading = true;
  String? _error;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _fetchTasks();
  }

  Future<void> _fetchTasks() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await ApiService.getTasks();
      if (mounted) {
        setState(() {
          _tasks = data['tasks'] as List<dynamic>? ?? [];
          _isLoading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load tasks. Check connection.';
          _isLoading = false;
        });
      }
    }
  }

  Color _priorityColor(String? priority) {
    switch (priority) {
      case 'critical':
        return Colors.red;
      case 'high':
        return Colors.orange;
      case 'medium':
        return Colors.blue;
      case 'low':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'not_started':
        return Colors.grey;
      case 'in_progress':
        return Colors.orange;
      case 'completed':
        return Colors.blue;
      case 'accepted':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'not_started':
        return t('status_not_started');
      case 'in_progress':
        return t('status_in_progress');
      case 'completed':
        return t('status_completed');
      case 'accepted':
        return t('status_accepted');
      case 'rejected':
        return t('status_rejected');
      default:
        return status ?? t('unknown');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 10),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _fetchTasks,
                child: const Text("Retry"),
              ),
            ],
          ),
        ),
      );
    }

    if (_tasks.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.task_alt, size: 64, color: Colors.grey),
            const SizedBox(height: 10),
            Text(
              t('no_tasks'),
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _fetchTasks,
              child: Text(t('refresh')),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchTasks,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _tasks.length,
        itemBuilder: (context, index) {
          final task = _tasks[index];
          final priority = task['priority'] as String? ?? 'medium';
          final status = task['status'] as String? ?? 'not_started';

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: _priorityColor(priority).withAlpha(80)),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        TaskDetailPage(taskId: task['id'].toString()),
                  ),
                );
                // Refresh list when coming back
                _fetchTasks();
              },
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title + Priority badge
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            task['title'] ?? 'Untitled',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: _priorityColor(priority).withAlpha(30),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: _priorityColor(priority).withAlpha(120),
                            ),
                          ),
                          child: Text(
                            priority.toUpperCase(),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _priorityColor(priority),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 6),

                    // Type
                    if (task['type'] != null)
                      Text(
                        'Type: ${task['type']}',
                        style: TextStyle(fontSize: 13, color: Colors.grey[600]),
                      ),

                    const SizedBox(height: 8),

                    // Status badge
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: _statusColor(status),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            _statusLabel(status),
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Icon(Icons.chevron_right, color: Colors.grey[400]),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────
//  TASK DETAIL PAGE
// ─────────────────────────────────────────────

class TaskDetailPage extends StatefulWidget {
  final String taskId;
  const TaskDetailPage({super.key, required this.taskId});

  @override
  State<TaskDetailPage> createState() => _TaskDetailPageState();
}

class _TaskDetailPageState extends State<TaskDetailPage> {
  Map<String, dynamic>? _task;
  bool _isLoading = true;
  bool _isUpdating = false;
  String? _error;

  // Proof of work
  final ImagePicker _picker = ImagePicker();
  File? _proofImage;
  final TextEditingController _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchTask();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _fetchTask() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await ApiService.getTask(widget.taskId);
      if (mounted) {
        setState(() {
          _task = data['task'];
          _isLoading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load task details.';
          _isLoading = false;
        });
      }
    }
  }

  /// Start the task: not_started → in_progress
  Future<void> _startTask() async {
    setState(() => _isUpdating = true);

    try {
      final result = await ApiService.updateTaskStatus(
        taskId: widget.taskId,
        status: 'in_progress',
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Task started!')),
      );

      _fetchTask(); // Refresh
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Error starting task')));
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  /// Take proof photo
  Future<void> _takeProofPhoto() async {
    final XFile? photo = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 70,
    );

    if (photo == null) return;
    setState(() {
      _proofImage = File(photo.path);
    });
  }

  /// Complete task with proof
  Future<void> _completeTask() async {
    setState(() => _isUpdating = true);

    try {
      // Convert proof image to base64 if available
      String? base64Image;
      if (_proofImage != null) {
        final bytes = await _proofImage!.readAsBytes();
        base64Image = base64Encode(bytes);
      }

      // Get GPS location for proof
      double? lat, lng;
      try {
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
          ),
        );
        lat = position.latitude;
        lng = position.longitude;
      } catch (_) {
        // GPS is optional for task completion
      }

      final result = await ApiService.updateTaskStatus(
        taskId: widget.taskId,
        status: 'completed',
        proofImage: base64Image,
        proofNotes: _notesController.text.isNotEmpty
            ? _notesController.text
            : null,
        latitude: lat,
        longitude: lng,
      );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Task completed!')),
      );

      _fetchTask(); // Refresh to show updated status
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Error completing task')));
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Color _priorityColor(String? priority) {
    switch (priority) {
      case 'critical':
        return Colors.red;
      case 'high':
        return Colors.orange;
      case 'medium':
        return Colors.blue;
      case 'low':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'not_started':
        return Colors.grey;
      case 'in_progress':
        return Colors.orange;
      case 'completed':
        return Colors.blue;
      case 'accepted':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildInfoTile(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(t('task_details')),
        backgroundColor: const Color.fromRGBO(37, 30, 163, 1),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_error!),
                  const SizedBox(height: 10),
                  ElevatedButton(
                    onPressed: _fetchTask,
                    child: const Text("Retry"),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title
                  Text(
                    _task?['title'] ?? 'Untitled',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Status + Priority row
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: _statusColor(_task?['status']),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          (_task?['status'] ?? 'unknown')
                              .toString()
                              .replaceAll('_', ' ')
                              .toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: _priorityColor(
                            _task?['priority'],
                          ).withAlpha(30),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _priorityColor(_task?['priority']),
                          ),
                        ),
                        child: Text(
                          (_task?['priority'] ?? 'medium').toUpperCase(),
                          style: TextStyle(
                            color: _priorityColor(_task?['priority']),
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Description
                  if (_task?['description'] != null &&
                      _task!['description'].toString().isNotEmpty) ...[
                    const Text(
                      "Description",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(_task!['description']),
                    const SizedBox(height: 16),
                  ],

                  const Divider(),
                  _buildInfoTile(t('type_label'), _task?['type'] ?? 'N/A'),
                  _buildInfoTile(
                    t('assigned_by_label'),
                    _task?['assigned_by_name'] ?? 'N/A',
                  ),
                  if (_task?['due_date'] != null)
                    _buildInfoTile(
                      t('due_date_label'),
                      _task!['due_date'].toString().substring(0, 10),
                    ),
                  
                  // Location Map Link
                  if (_task?['latitude'] != null && _task?['longitude'] != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 100,
                            child: Text(
                              t('location_label'),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[700],
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () async {
                                final url = Uri.parse('https://www.google.com/maps?q=${_task!['latitude']},${_task!['longitude']}');
                                if (await canLaunchUrl(url)) {
                                  await launchUrl(url, mode: LaunchMode.externalApplication);
                                } else {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open map')));
                                  }
                                }
                              },
                              child: Text(
                                t('open_map'),
                                style: const TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  else if (_task?['lat'] != null && _task?['lng'] != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SizedBox(
                            width: 100,
                            child: Text(
                              t('location_label'),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[700],
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () async {
                                final url = Uri.parse('https://www.google.com/maps?q=${_task!['lat']},${_task!['lng']}');
                                if (await canLaunchUrl(url)) {
                                  await launchUrl(url, mode: LaunchMode.externalApplication);
                                } else {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open map')));
                                  }
                                }
                              },
                              child: Text(
                                t('open_map'),
                                style: const TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                  if (_task?['supervisor_comment'] != null)
                    _buildInfoTile(t('review_label'), _task!['supervisor_comment']),
                  const Divider(),

                  const SizedBox(height: 16),

                  // Action section based on status
                  _buildActionSection(),
                ],
              ),
            ),
    );
  }

  Widget _buildActionSection() {
    final status = _task?['status'] as String?;

    // Task can be started
    if (status == 'not_started' || status == 'rejected') {
      return SizedBox(
        width: double.infinity,
        height: 55,
        child: ElevatedButton.icon(
          onPressed: _isUpdating ? null : _startTask,
          icon: _isUpdating
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Icon(Icons.play_arrow, color: Colors.white),
          label: Text(
            status == 'rejected' ? t('restart_task') : t('start_task'),
            style: const TextStyle(fontSize: 18, color: Colors.white),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      );
    }

    // Task is in progress — show proof upload + complete
    if (status == 'in_progress') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t('complete_task_proof'),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          // Proof image preview / take photo
          if (_proofImage != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.file(
                _proofImage!,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _takeProofPhoto,
              icon: const Icon(Icons.camera_alt),
              label: Text(t('retake_photo')),
            ),
          ] else ...[
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: _takeProofPhoto,
                icon: const Icon(Icons.camera_alt),
                label: Text(t('take_proof_photo')),
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Notes
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: t('add_notes'),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Complete button
          SizedBox(
            width: double.infinity,
            height: 55,
            child: ElevatedButton.icon(
              onPressed: _isUpdating ? null : _completeTask,
              icon: _isUpdating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.check_circle, color: Colors.white),
              label: const Text(
                "Mark as Complete",
                style: TextStyle(fontSize: 18, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Color.fromRGBO(37, 30, 163, 1),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      );
    }

    // Task completed / accepted / rejected — show info
    if (status == 'completed') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.blue.withAlpha(20),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.blue.withAlpha(80)),
        ),
        child: const Text(
          "⏳ Task completed. Awaiting supervisor review.",
          style: TextStyle(fontSize: 15),
          textAlign: TextAlign.center,
        ),
      );
    }

    if (status == 'accepted') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.green.withAlpha(20),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.green.withAlpha(80)),
        ),
        child: const Text(
          "✅ Task accepted by supervisor!",
          style: TextStyle(fontSize: 15, color: Colors.green),
          textAlign: TextAlign.center,
        ),
      );
    }

    return const SizedBox.shrink();
  }
}
