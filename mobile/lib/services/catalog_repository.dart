import 'api_client.dart';
import '../models/listing.dart';

/// GET /api/v1/categories and GET /api/v1/home — both public, no auth
/// header needed (mirrors HomeView.tsx's plain fetch() calls).
class CatalogRepository {
  final ApiClient api;
  CatalogRepository(this.api);

  Future<List<Category>> fetchCategories() async {
    final result = await api.get('/api/v1/categories', auth: false);
    return (result as List).map((e) => Category.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<HomeFeed> fetchHome({
    String? category,
    String? city,
    String? q,
    num? minPrice,
    num? maxPrice,
  }) async {
    final query = <String, String>{
      if (category != null && category.isNotEmpty) 'category': category,
      if (city != null && city.isNotEmpty) 'city': city,
      if (q != null && q.isNotEmpty) 'q': q,
      if (minPrice != null) 'minPrice': minPrice.toString(),
      if (maxPrice != null) 'maxPrice': maxPrice.toString(),
    };
    final result = await api.get(
      '/api/v1/home',
      query: query.isEmpty ? null : query,
      auth: false,
    );
    return HomeFeed.fromJson(result as Map<String, dynamic>);
  }
}
