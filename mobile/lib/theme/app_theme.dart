import 'package:flutter/material.dart';

/// Mirrors the web app's Tailwind palette (orange-600 primary, gray-50/100
/// neutrals) so the two clients read as the same product rather than two
/// different apps that happen to share a backend.
class AppColors {
  static const orange = Color(0xFFEA580C); // orange-600
  static const orangeDark = Color(0xFFC2410C); // orange-700
  static const orangeLight = Color(0xFFFFF7ED); // orange-50
  static const gray50 = Color(0xFFF9FAFB);
  static const gray100 = Color(0xFFF3F4F6);
  static const gray400 = Color(0xFF9CA3AF);
  static const gray500 = Color(0xFF6B7280);
  static const gray900 = Color(0xFF111827);
  static const green = Color(0xFF16A34A);
  static const red = Color(0xFFEF4444);
  static const whatsapp = Color(0xFF25D366);
}

class AppTheme {
  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: Colors.white,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.orange,
        primary: AppColors.orange,
        brightness: Brightness.light,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.gray900,
        elevation: 0,
        centerTitle: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.orange,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.gray50,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
      ),
      fontFamily: 'Roboto',
    );
  }
}

/// FCFA formatting matching the web app's `toLocaleString('fr-FR')` — a
/// thin-space thousands separator, no decimals (XOF has none).
String formatFcfa(num amount) {
  final s = amount.round().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(s[i]);
  }
  return buffer.toString();
}
