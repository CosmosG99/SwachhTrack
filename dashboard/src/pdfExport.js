// PDF Export Utilities for SwachhTrack Dashboard
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND_COLOR = [107, 78, 255]; // Accent purple
const HEADER_BG = [24, 24, 27];     // Dark card bg

/**
 * Shared header for all SwachhTrack PDFs
 */
function addHeader(doc, title, subtitle) {
  // Brand bar
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SwachhTrack', 14, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 22);

  // Date & subtitle line
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text(`${subtitle}  |  Generated: ${new Date().toLocaleString()}`, 14, 36);

  return 42; // Y position after header
}

/**
 * Export Attendance Report as PDF
 */
export function exportAttendancePDF(report, lang) {
  const doc = new jsPDF();
  const isMarathi = lang === 'mr';

  const title = isMarathi ? 'उपस्थिती अहवाल' : 'Attendance Report';
  const subtitle = isMarathi
    ? `तारीख: ${report.date || new Date().toISOString().split('T')[0]}`
    : `Date: ${report.date || new Date().toISOString().split('T')[0]}`;

  let y = addHeader(doc, title, subtitle);

  // Summary box
  if (report.summary) {
    const s = report.summary;
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 22, 3, 3, 'F');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    const summaryItems = [
      `${isMarathi ? 'एकूण' : 'Total'}: ${s.total_workers}`,
      `${isMarathi ? 'उपस्थित' : 'Present'}: ${s.present}`,
      `${isMarathi ? 'अनुपस्थित' : 'Absent'}: ${s.absent}`,
      `${isMarathi ? 'दर' : 'Rate'}: ${s.attendance_rate}`,
      `${isMarathi ? 'जिओफेन्स' : 'Geofence'}: ${s.geofence_compliance}`,
    ];
    doc.text(summaryItems.join('   •   '), 20, y + 13);
    y += 30;
  }

  // Table
  const headers = isMarathi
    ? [['कामगार', 'कर्मचारी आयडी', 'विभाग', 'चेक इन', 'चेक आउट', 'जिओफेन्स', 'तास']]
    : [['Worker', 'Employee ID', 'Department', 'Check In', 'Check Out', 'Geofence', 'Hours']];

  const rows = (report.records || []).map(r => [
    r.name || '--',
    r.employee_id || '--',
    r.department || '--',
    r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString() : (isMarathi ? 'अनुपस्थित' : 'Absent'),
    r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '--',
    r.check_in_within_geofence ? (isMarathi ? 'हो' : 'Yes') : (isMarathi ? 'नाही' : 'No'),
    r.hours_worked ? `${parseFloat(r.hours_worked).toFixed(1)}h` : '--',
  ]);

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`SwachhTrack   •   Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`SwachhTrack_Attendance_${report.date || 'Report'}.pdf`);
}

/**
 * Export Worker Performance as PDF
 */
export function exportPerformancePDF(workers, lang) {
  const doc = new jsPDF('landscape');
  const isMarathi = lang === 'mr';

  const title = isMarathi ? 'कामगार कामगिरी अहवाल' : 'Worker Performance Report';
  const subtitle = isMarathi
    ? `एकूण कामगार: ${workers.length}`
    : `Total Workers: ${workers.length}`;

  let y = addHeader(doc, title, subtitle);

  const headers = isMarathi
    ? [['क्रमांक', 'कामगार', 'कर्मचारी आयडी', 'विभाग', 'उपस्थिती (दिवस)', 'दिलेली कामे', 'पूर्ण कामे', 'पूर्णता %', 'सरासरी तास']]
    : [['Rank', 'Worker', 'Employee ID', 'Department', 'Attendance (Days)', 'Tasks Assigned', 'Tasks Completed', 'Completion %', 'Avg Hours']];

  const rows = workers.map((w, i) => [
    i + 1,
    w.name || '--',
    w.employee_id || '--',
    w.department || '--',
    w.attendance?.days_present || 0,
    w.tasks?.assigned || 0,
    w.tasks?.completed || 0,
    w.tasks?.completion_rate || '0%',
    w.avg_hours_worked ? `${w.avg_hours_worked}h` : '--',
  ]);

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' },
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`SwachhTrack   •   Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  doc.save(`SwachhTrack_Performance_${new Date().toISOString().split('T')[0]}.pdf`);
}
