import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageProvider extends ValueNotifier<String> {
  static final LanguageProvider _instance = LanguageProvider._internal();
  factory LanguageProvider() => _instance;
  
  LanguageProvider._internal() : super('en') {
    _loadLanguage();
  }

  Future<void> _loadLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    value = prefs.getString('app_lang') ?? 'en';
  }

  Future<void> setLanguage(String lang) async {
    value = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_lang', lang);
  }
}

final languageProvider = LanguageProvider();

const Map<String, Map<String, String>> _translations = {
  'en': {
    'home': 'Home',
    'tasks': 'Tasks',
    'scan': 'Scan',
    'maps': 'Maps',
    'profile': 'Profile',
    'hello': 'Hello',
    'today_schedule': 'Today\'s Schedule',
    'check_in': 'Check-In',
    'check_out': 'Check-Out',
    'pending_tasks': 'Pending Tasks',
    'completed_tasks': 'Completed Tasks',
    'settings': 'Settings',
    'language': 'Language',
    'logout': 'Logout',
    'english': 'English',
    'marathi': 'मराठी',
    'scan_qr': 'Scan Site QR',
    'tasks_assigned': 'Tasks Assigned to You',
    'open_map': 'Open in Google Maps 📍',
    'status': 'Status:',
    'priority': 'Priority:',
    'due': 'Due:',
    'employee_id': 'Employee ID',
    'phone': 'Phone',
    'email': 'Email',
    'department': 'Department',
    'role_worker': 'Worker',
    'role_supervisor': 'Supervisor',
    'role_admin': 'Admin',
    'gps_check_in': 'GPS Check In',
    'scan_qr_check_in': 'Scan QR & Check In',
    'checked_in_today': '✅ Checked in today',
    'checked_out_today': '✅ Checked out today',
    'in_label': 'In',
    'out_label': 'Out',
    'task_details': 'Task Details',
    'no_tasks': 'No tasks assigned yet',
    'refresh': 'Refresh',
    'retry': 'Retry',
    'unknown': 'Unknown',
    'description': 'Description',
    'type_label': 'Type',
    'assigned_by_label': 'Assigned by',
    'due_date_label': 'Due date',
    'location_label': 'Location',
    'review_label': 'Review',
    'start_task': 'Start Task',
    'restart_task': 'Restart Task',
    'complete_task_proof': 'Complete Task with Proof',
    'take_proof_photo': 'Take Proof Photo',
    'retake_photo': 'Retake Photo',
    'add_notes': 'Add notes (optional)...',
    'complete_task': 'Complete Task',
    'status_not_started': 'Not Started',
    'status_in_progress': 'In Progress',
    'status_completed': 'Completed',
    'status_accepted': 'Accepted ✅',
    'status_rejected': 'Rejected ❌',
    'point_camera': 'Point camera at QR code...',
    'qr_scanned': 'QR Code Scanned',
    'use_qr_checkin': 'Use this QR code to check in?',
    'data_label': 'Data:',
    'scan_again': 'Scan Again',
    'check_in_btn': 'Check In',
    'scan_attendance_qr': 'Scan Attendance QR',
  },
  'mr': {
    'home': 'मुख्यपृष्ठ',
    'tasks': 'कामे',
    'scan': 'स्कॅन',
    'maps': 'नकाशे',
    'profile': 'प्रोफाइल',
    'hello': 'नमस्कार',
    'today_schedule': 'आजचे वेळापत्रक',
    'check_in': 'चेक-इन करा',
    'check_out': 'चेक-आउट करा',
    'pending_tasks': 'उर्वरित कामे',
    'completed_tasks': 'पूर्ण झालेली कामे',
    'settings': 'सेटिंग्ज',
    'language': 'भाषा',
    'logout': 'बाहेर पडा',
    'english': 'English',
    'marathi': 'मराठी',
    'scan_qr': 'साइट QR स्कॅन करा',
    'tasks_assigned': 'तुम्हाला दिलेली कामे',
    'open_map': 'Google Maps वर उघडा 📍',
    'status': 'स्थिती:',
    'priority': 'प्राधान्य:',
    'due': 'अंतिम मुदत:',
    'employee_id': 'कर्मचारी आयडी',
    'phone': 'फोन नंबर',
    'email': 'ईमेल',
    'department': 'विभाग',
    'role_worker': 'कामगार',
    'role_supervisor': 'पर्यवेक्षक',
    'role_admin': 'प्रशासक',
    'gps_check_in': 'GPS चेक-इन',
    'scan_qr_check_in': 'QR स्कॅन आणि चेक-इन',
    'checked_in_today': '✅ आज चेक-इन केले',
    'checked_out_today': '✅ आज चेक-आउट केले',
    'in_label': 'आत',
    'out_label': 'बाहेर',
    'task_details': 'कामाचा तपशील',
    'no_tasks': 'अद्याप कोणतीही कामे दिलेली नाहीत',
    'refresh': 'रिफ्रेश करा',
    'retry': 'पुन्हा प्रयत्न करा',
    'unknown': 'अज्ञात',
    'description': 'वर्णन',
    'type_label': 'प्रकार',
    'assigned_by_label': 'दिलेले',
    'due_date_label': 'अंतिम तारीख',
    'location_label': 'ठिकाण',
    'review_label': 'पुनरावलोकन',
    'start_task': 'काम सुरू करा',
    'restart_task': 'काम पुन्हा सुरू करा',
    'complete_task_proof': 'पुराव्यासह काम पूर्ण करा',
    'take_proof_photo': 'पुराव्याचा फोटो घ्या',
    'retake_photo': 'फोटो पुन्हा घ्या',
    'add_notes': 'नोट्स जोडा (पर्यायी)...',
    'complete_task': 'काम पूर्ण करा',
    'status_not_started': 'सुरू केलेले नाही',
    'status_in_progress': 'प्रगतीपथावर',
    'status_completed': 'पूर्ण झाले',
    'status_accepted': 'स्वीकृत ✅',
    'status_rejected': 'नाकारले ❌',
    'point_camera': 'QR वर कॅमेरा दाखवा...',
    'qr_scanned': 'QR कोड स्कॅन झाला',
    'use_qr_checkin': 'हा QR कोड वापरून चेक-इन करायचे का?',
    'data_label': 'डेटा:',
    'scan_again': 'पुन्हा स्कॅन करा',
    'check_in_btn': 'चेक-इन करा',
    'scan_attendance_qr': 'उपस्थितीसाठी QR स्कॅन करा',
  }
};

String t(String key) {
  final lang = languageProvider.value;
  return _translations[lang]?[key] ?? _translations['en']?[key] ?? key;
}
