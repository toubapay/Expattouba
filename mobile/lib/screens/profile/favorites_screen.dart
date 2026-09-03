import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/listing.dart';
import '../../services/auth_service.dart';
import '../../services/favorites_repository.dart';
import '../../theme/app_theme.dart';
import '../../theme/category_fields.dart';
import '../../widgets/listing_image.dart';
import '../product/product_detail_screen.dart';

/// Mirrors FavoritesView.tsx: every listing this account has saved, tap
/// one to open the real product detail screen.
class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Listing> _listings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final repo = FavoritesRepository(context.read<AuthService>().api);
      final listings = await repo.fetchFavorites();
      if (mounted) setState(() => _listings = listings);
    } catch (_) {
      // Keep whatever was already on screen.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes favoris')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _listings.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      "Aucune annonce enregistrée. Appuyez sur le cœur d'une annonce pour la retrouver ici.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.gray400),
                    ),
                  ),
                )
              : ListView.separated(
                  itemCount: _listings.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, i) {
                    final listing = _listings[i];
                    final summary = summarizeAttributes(listing.attributes, max: 2);
                    return ListTile(
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: SizedBox(width: 56, height: 56, child: ListingImage(url: listing.image)),
                      ),
                      title: Text(listing.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${formatFcfa(listing.price)} ${listing.currency}', style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w900)),
                          if (listing.city != null || summary.isNotEmpty)
                            Text(
                              [listing.city, summary].where((s) => s != null && s.isNotEmpty).join(' • '),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: AppColors.gray400, fontSize: 11),
                            ),
                        ],
                      ),
                      isThreeLine: listing.city != null || summary.isNotEmpty,
                      onTap: () async {
                        await Navigator.of(context).push(MaterialPageRoute(
                          builder: (_) => ProductDetailScreen(listing: listing, walletPurchaseEnabled: true, onPurchased: _load),
                        ));
                        _load();
                      },
                    );
                  },
                ),
    );
  }
}
