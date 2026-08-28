import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// The backend's origin. On web, empty ('') means relative paths — same
/// origin as wherever this Flutter web build is served, mirroring how
/// server.ts serves both the API and the built SPA from one process (see
/// the React app's own fetch('/api/...') calls). Native has no "same
/// origin" to inherit, so it must be supplied at build/run time:
///   flutter run --dart-define=API_BASE_URL=https://your-app.onrender.com
/// Left empty on native, every request fails loudly against a relative
/// path with no server behind it — better than silently pointing
/// somewhere wrong.
class ApiConfig {
  static const String baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');

  static Uri url(String path, [Map<String, String>? query]) {
    final base = kIsWeb ? '' : baseUrl;
    return Uri.parse('$base$path').replace(queryParameters: query);
  }
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);
  @override
  String toString() => message;
}

/// Thin wrapper around package:http mirroring the web app's authedFetch
/// helpers (ProductDetailView.tsx, ChatPanel.tsx): attaches the bearer
/// token when present, decodes JSON, and turns a non-2xx response into an
/// ApiException carrying the server's own {"error": "..."} message so
/// screens can show the same wording the web app would.
class ApiClient {
  final Future<String?> Function() getToken;

  ApiClient(this.getToken);

  Future<Map<String, String>> _headers({bool json = true}) async {
    final token = await getToken();
    return {
      if (json) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  dynamic _decode(http.Response res) {
    Map<String, dynamic> body = {};
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) body = decoded;
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return decoded;
      }
      throw ApiException(body['error']?.toString() ?? 'Erreur ${res.statusCode}', res.statusCode);
    } on FormatException {
      if (res.statusCode >= 200 && res.statusCode < 300) return null;
      throw ApiException('Erreur ${res.statusCode}', res.statusCode);
    }
  }

  Future<dynamic> get(String path, {Map<String, String>? query, bool auth = true}) async {
    final res = await http.get(ApiConfig.url(path, query), headers: auth ? await _headers() : {});
    return _decode(res);
  }

  Future<dynamic> post(String path, {Object? body, bool auth = true}) async {
    final res = await http.post(
      ApiConfig.url(path),
      headers: auth ? await _headers() : {'Content-Type': 'application/json'},
      body: body != null ? jsonEncode(body) : null,
    );
    return _decode(res);
  }

  Future<dynamic> patch(String path, {Object? body}) async {
    final res = await http.patch(
      ApiConfig.url(path),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _decode(res);
  }

  /// For the two multipart endpoints (POST /api/v1/listings,
  /// POST /api/ai/generate). Takes raw bytes rather than a file path —
  /// XFile.readAsBytes() works the same on web and native, whereas a
  /// filesystem path doesn't exist on web at all.
  Future<dynamic> postMultipart(
    String path, {
    required Map<String, String> fields,
    Uint8List? imageBytes,
    String imageFieldName = 'image',
    String imageFileName = 'upload.jpg',
    bool auth = true,
  }) async {
    final request = http.MultipartRequest('POST', ApiConfig.url(path));
    if (auth) {
      final token = await getToken();
      if (token != null) request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields.addAll(fields);
    if (imageBytes != null) {
      request.files.add(http.MultipartFile.fromBytes(imageFieldName, imageBytes, filename: imageFileName));
    }
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    return _decode(res);
  }
}
