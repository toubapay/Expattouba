import 'api_client.dart';
import '../models/wallet.dart';

class WalletRepository {
  final ApiClient api;
  WalletRepository(this.api);

  Future<List<WalletTransaction>> fetchTransactions() async {
    final result = await api.get('/api/v1/wallet/transactions');
    return (result as List).map((e) => WalletTransaction.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// The atomic purchase route (src/db/wallet.ts's purchaseListing) —
  /// throws ApiException with the server's own message on insufficient
  /// funds (400), the listing being unavailable/already sold (409), or
  /// trying to buy your own listing (400).
  Future<Map<String, dynamic>> purchaseListing(String listingId) async {
    final result = await api.post('/api/v1/wallet/purchase', body: {'listingId': listingId});
    return result as Map<String, dynamic>;
  }
}
