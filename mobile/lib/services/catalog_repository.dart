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

  Future<HomeFeed> fetchHome({String? category}) async {
    final result = await api.get(
      '/api/v1/home',
      query: category != null ? {'category': category} : null,
      auth: false,
    );
    return HomeFeed.fromJson(result as Map<String, dynamic>);
  }
}
