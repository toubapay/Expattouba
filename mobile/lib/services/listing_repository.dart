import 'dart:convert';
import 'dart:typed_data';
import 'api_client.dart';

class ListingLimitException extends ApiException {
  ListingLimitException(super.message);
}

/// POST /api/v1/listings, POST /api/ai/generate, POST /api/v1/vendors/onboard.
class ListingRepository {
  final ApiClient api;
  ListingRepository(this.api);

  Future<Map<String, dynamic>> createListing({
    required String title,
    required String description,
    required num price,
    String? category,
    String? city,
    Map<String, dynamic>? attributes,
    Uint8List? imageBytes,
  }) async {
    try {
      final result = await api.postMultipart(
        '/api/v1/listings',
        fields: {
          'title': title,
          'description': description,
          'price': price.toString(),
          if (category != null && category.isNotEmpty) 'category': category,
          if (city != null && city.isNotEmpty) 'city': city,
          if (attributes != null) 'attributes': jsonEncode(attributes),
        },
        imageBytes: imageBytes,
      );
      return result as Map<String, dynamic>;
    } on ApiException catch (e) {
      // 403 here specifically means the vendor's plan listing cap was hit
      // (src/db/listings.ts's ListingLimitError) — surfaced distinctly so
      // the screen can point at "Offres & abonnement" instead of just
      // showing a generic error.
      if (e.statusCode == 403) throw ListingLimitException(e.message);
      rethrow;
    }
  }

  /// Gemini-generated description (server.ts's /api/ai/generate) —
  /// unauthenticated calls are rejected server-side (rate-limited per
  /// signed-in vendor), and a missing GEMINI_API_KEY on the server
  /// produces a clear error rather than a fabricated description.
  Future<String> generateDescription({required String title, Uint8List? imageBytes}) async {
    final result = await api.postMultipart(
      '/api/ai/generate',
      fields: {'title': title},
      imageBytes: imageBytes,
    );
    return (result as Map<String, dynamic>)['description']?.toString() ?? '';
  }

  Future<void> onboardVendor({
    required String boutiqueName,
    required String whatsappNumber,
    required String address,
  }) async {
    await api.post('/api/v1/vendors/onboard', body: {
      'boutiqueName': boutiqueName,
      'whatsappNumber': whatsappNumber,
      'address': address,
    });
  }
}
