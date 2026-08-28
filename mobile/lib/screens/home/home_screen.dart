import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/listing.dart';
import '../../services/auth_service.dart';
import '../../services/catalog_repository.dart';
import '../../theme/app_theme.dart';
import '../../widgets/listing_image.dart';
import '../product/product_detail_screen.dart';

/// Mirrors HomeView.tsx: header + search (search is decorative here too —
/// the web app's search input has no onChange handler either, so this
/// isn't a gap, it matches), a category rail that filters the feed, an
/// optional featured rail, and a feed that's a single column on a narrow
/// screen and a responsive grid on a wide one.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final CatalogRepository _repo;
  List<Category> _categories = [];
  HomeFeed? _feed;
  String? _activeCategory;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _repo = CatalogRepository(context.read<AuthService>().api);
    _repo.fetchCategories().then((c) => setState(() => _categories = c)).catchError((_) {});
    _loadFeed();
  }

  Future<void> _loadFeed() async {
    setState(() => _loading = true);
    try {
      final feed = await _repo.fetchHome(category: _activeCategory);
      if (mounted) setState(() => _feed = feed);
    } catch (_) {
      // Keep whatever was on screen — a transient failure shouldn't blank
      // an otherwise-populated feed.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _selectCategory(String name) {
    setState(() => _activeCategory = _activeCategory == name ? null : name);
    _loadFeed();
  }

  void _openListing(Listing listing) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(
          listing: listing,
          walletPurchaseEnabled: _feed?.walletPurchaseEnabled ?? true,
          onPurchased: _loadFeed,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _loadFeed,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _buildHeader()),
            SliverToBoxAdapter(child: _buildCategories()),
            if (_loading && _feed == null)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else ...[
              if ((_feed?.home.featuredEnabled ?? false) && (_feed?.featured.isNotEmpty ?? false))
                SliverToBoxAdapter(child: _buildFeaturedRail()),
              _buildFeedSliver(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.gray100)),
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 960),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.location_on, color: AppColors.orange, size: 20),
                      SizedBox(width: 6),
                      Text('Dakar, SN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.orange)),
                    ],
                  ),
                  Container(
                    decoration: const BoxDecoration(color: AppColors.gray50, shape: BoxShape.circle),
                    child: IconButton(
                      icon: const Icon(Icons.notifications_none_rounded, color: AppColors.gray900),
                      onPressed: () {},
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                decoration: InputDecoration(
                  hintText: 'Rechercher sur SeneMarket...',
                  prefixIcon: const Icon(Icons.search, color: AppColors.gray400),
                  fillColor: AppColors.gray100,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategories() {
    if (_categories.isEmpty) return const SizedBox.shrink();
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 960),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text('Catégories', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 88,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 16),
                  itemBuilder: (context, i) {
                    final cat = _categories[i];
                    final isActive = _activeCategory == cat.name;
                    return GestureDetector(
                      onTap: () => _selectCategory(cat.name),
                      child: SizedBox(
                        width: 64,
                        child: Column(
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: isActive ? AppColors.orange : AppColors.orangeLight,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              alignment: Alignment.center,
                              child: Text(cat.icon, style: const TextStyle(fontSize: 24)),
                            ),
                            const SizedBox(height: 6),
                            Text(cat.name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeaturedRail() {
    final feed = _feed!;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 960),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(feed.home.featuredTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 190,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: feed.featured.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, i) {
                    final listing = feed.featured[i];
                    return GestureDetector(
                      onTap: () => _openListing(listing),
                      child: Container(
                        width: 140,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            AspectRatio(
                              aspectRatio: 1,
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  ListingImage(url: listing.image),
                                  Positioned(
                                    top: 6,
                                    left: 6,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(color: const Color(0xFFFACC15), borderRadius: BorderRadius.circular(6)),
                                      child: const Text('VEDETTE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(listing.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  Text('${formatFcfa(listing.price)} ${listing.currency}', style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w900, fontSize: 12)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeedSliver() {
    final listings = _feed?.listings ?? [];
    if (listings.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Center(child: Text('Aucune annonce pour le moment.', style: TextStyle(color: AppColors.gray500))),
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      sliver: SliverLayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.crossAxisExtent;
          final columns = width >= 960 ? 4 : (width >= 720 ? 3 : (width >= 480 ? 2 : 1));
          return SliverGrid(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              mainAxisSpacing: 20,
              crossAxisSpacing: 16,
              childAspectRatio: 0.62,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, i) => _ListingCard(listing: listings[i], onTap: () => _openListing(listings[i])),
              childCount: listings.length,
            ),
          );
        },
      ),
    );
  }
}

class _ListingCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback onTap;
  const _ListingCard({required this.listing, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.gray100),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: AppColors.orangeLight,
                    child: Text(
                      listing.vendorName.isNotEmpty ? listing.vendorName[0].toUpperCase() : 'V',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.orangeDark),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(listing.vendorName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                  if (listing.vendorBadge == 'GOLD')
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFFEF9C3), borderRadius: BorderRadius.circular(6)),
                      child: const Text('GOLD', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ),
            AspectRatio(aspectRatio: 4 / 5, child: ListingImage(url: listing.image)),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(listing.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Text('${formatFcfa(listing.price)} ${listing.currency}', style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 2),
                    Expanded(
                      child: Text(listing.description ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.gray500, fontSize: 12)),
                    ),
                    Row(
                      children: const [
                        Text('Voir plus', style: TextStyle(color: AppColors.orange, fontWeight: FontWeight.bold, fontSize: 12)),
                        Icon(Icons.chevron_right, color: AppColors.orange, size: 16),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

