import 'dart:convert';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// server.ts stores listing photos as base64 `data:` URIs (no object
/// storage on the backend host — see PostView's upload path), with an
/// Unsplash https:// URL as the only fallback when no file was
/// attached. Image.network can't load a data: URI at all (it's not an
/// HTTP fetch), so this branches on the scheme rather than assuming
/// every image URL is a real network request.
class ListingImage extends StatelessWidget {
  final String? url;
  final BoxFit fit;
  const ListingImage({super.key, this.url, this.fit = BoxFit.cover});

  @override
  Widget build(BuildContext context) {
    final value = url;
    if (value == null || value.isEmpty) return _placeholder(Icons.image_not_supported_outlined);

    if (value.startsWith('data:')) {
      final commaIndex = value.indexOf(',');
      if (commaIndex == -1) return _placeholder(Icons.broken_image_outlined);
      try {
        final bytes = base64Decode(value.substring(commaIndex + 1));
        return Image.memory(bytes, fit: fit, errorBuilder: (_, __, ___) => _placeholder(Icons.broken_image_outlined));
      } catch (_) {
        return _placeholder(Icons.broken_image_outlined);
      }
    }

    return Image.network(value, fit: fit, errorBuilder: (_, __, ___) => _placeholder(Icons.broken_image_outlined));
  }

  Widget _placeholder(IconData icon) {
    return Container(color: AppColors.gray100, alignment: Alignment.center, child: Icon(icon, color: AppColors.gray400));
  }
}
