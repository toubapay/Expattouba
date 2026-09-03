import 'api_client.dart';
import '../models/listing.dart';

/// GET/POST/DELETE /api/v1/favorites (src/routes/favorites.ts) — all
/// require auth, mirroring FavoritesRepository's role in the web client
/// (there it's plain fetch calls inside AuthContext.tsx/FavoritesView.tsx;
/// here it's one repository both AuthService and FavoritesScreen use).
class FavoritesRepository {
  final ApiClient api;
  FavoritesRepository(this.api);

  /// Just the ids — cheap enough to load on every login so the heart icon
  /// everywhere knows its state without a per-listing lookup.
  Future<Set<String>> fetchIds() async {
    final result = await api.get('/api/v1/favorites/ids');
    return (result as List).map((e) => e.toString()).toSet();
  }

  /// Full listing details, for the "Mes favoris" screen.
  Future<List<Listing>> fetchFavorites() async {
    final result = await api.get('/api/v1/favorites');
    return (result as List).map((e) => Listing.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> add(String listingId) async {
    await api.post('/api/v1/favorites', body: {'listingId': listingId});
  }

  Future<void> remove(String listingId) async {
    await api.delete('/api/v1/favorites/$listingId');
  }
}
