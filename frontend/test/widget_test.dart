import 'package:flutter_test/flutter_test.dart';
import 'package:swacchtrack/main.dart';

void main() {
  testWidgets('App renders login page when not logged in', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp(isLoggedIn: false));

    // Should show the login page
    expect(find.text('Login'), findsOneWidget);
  });
}
