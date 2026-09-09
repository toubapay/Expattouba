import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/listing.dart';
import '../../services/auth_service.dart';
import '../../services/catalog_repository.dart';
import '../../theme/app_theme.dart';
import '../../theme/category_fields.dart';
import '../../theme/format_date.dart';
import '../../widgets/listing_image.dart';
import '../product/product_detail_screen.dart';

/// Mirrors HomeView.tsx: header with a real city filter and working
/// search, a category rail, an optional featured rail, and a feed that's
/// a compact single-column list of horizontal rows on a narrow screen
/// (matching how a real classifieds site reads on mobile) and a grid of
/// vertical cards on a wide one.
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

  final _searchController = TextEditingController();
  Timer? _searchDebounce;
  String _search = '';
  String? _city;
  num? _appliedMinPrice;
  num? _appliedMaxPrice;

  @override
  void initState() {
    super.initState();
    _repo = CatalogRepository(context.read<AuthService>().api);
    _repo.fetchCategories().then((c) => setState(() => _categories = c)).catchError((_) {});
    _loadFeed();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadFeed() async {
    setState(() => _loading = true);
    try {
      final feed = await _repo.fetchHome(
        category: _activeCategory,
        city: _city,
        q: _search,
        minPrice: _appliedMinPrice,
        maxPrice: _appliedMaxPrice,
      );
      if (mounted) setState(() => _feed = feed);
    } catch (_) {
      // Keep whatever was on screen — a transient failure shouldn't blank
      // an otherwise-populated feed.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 400), () {
      setState(() => _search = value.trim());
      _loadFeed();
    });
  }

  void _selectCategory(String name) {
    setState(() => _activeCategory = _activeCategory == name ? null : name);
    _loadFeed();
  }

  void _selectCity(String? city) {
    setState(() => _city = city);
    _loadFeed();
  }

  Future<void> _openFilterSheet() async {
    final minController = TextEditingController(text: _appliedMinPrice?.toString() ?? '');
    final maxController = TextEditingController(text: _appliedMaxPrice?.toString() ?? '');
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheetContext) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Filtrer par prix', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    icon: const Icon(Icons.close_rounded),
                    style: IconButton.styleFrom(backgroundColor: AppColors.gray100),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: minController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Prix min', hintText: '0'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: maxController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Prix max', hintText: 'Aucun maximum'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _appliedMinPrice = null;
                          _appliedMaxPrice = null;
                        });
                        _loadFeed();
                        Navigator.pop(sheetContext);
                      },
                      child: const Text('Réinitialiser'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _appliedMinPrice = num.tryParse(minController.text.trim());
                          _appliedMaxPrice = num.tryParse(maxController.text.trim());
                        });
                        _loadFeed();
                        Navigator.pop(sheetContext);
                      },
                      child: const Text('Appliquer'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
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
    final filtersActive = _appliedMinPrice != null || _appliedMaxPrice != null;
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
                  PopupMenuButton<String?>(
                    onSelected: _selectCity,
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: null, child: Text('Toutes les villes')),
                      ...kSenegalCities.map((c) => PopupMenuItem(value: c, child: Text(c))),
                    ],
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.location_on, color: AppColors.orange, size: 20),
                        const SizedBox(width: 6),
                        Text(_city ?? 'Sénégal', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.orange)),
                        const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.orange, size: 18),
                      ],
                    ),
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
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                      decoration: InputDecoration(
                        hintText: 'Rechercher sur SeneMarket...',
                        prefixIcon: const Icon(Icons.search, color: AppColors.gray400),
                        fillColor: AppColors.gray100,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          color: filtersActive ? AppColors.orange : AppColors.gray100,
                          shape: BoxShape.circle,
                        ),
                        child: IconButton(
                          onPressed: _openFilterSheet,
                          icon: Icon(Icons.tune_rounded, color: filtersActive ? Colors.white : AppColors.gray500),
                        ),
                      ),
                      if (filtersActive)
                        Positioned(
                          top: 2, right: 2,
                          child: Container(width: 10, height: 10, decoration: const BoxDecoration(color: AppColors.orangeDark, shape: BoxShape.circle, border: Border.fromBorderSide(BorderSide(color: Colors.white, width: 2)))),
                        ),
                    ],
                  ),
                ],
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
                height: 210,
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
                                  const Positioned(top: 6, left: 6, child: _VedetteBadge(compact: true)),
                                  Positioned(top: 4, right: 4, child: _FavoriteButton(listingId: listing.id)),
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
                                  if (listing.city != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.location_on, size: 10, color: AppColors.gray400),
                                          const SizedBox(width: 2),
                                          Text(listing.city!, style: const TextStyle(fontSize: 10, color: AppColors.gray400, fontWeight: FontWeight.w600)),
                                        ],
                                      ),
                                    ),
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
          final compact = columns == 1;
          return SliverGrid(
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columns,
              mainAxisSpacing: compact ? 12 : 20,
              crossAxisSpacing: 16,
              childAspectRatio: compact ? 2.9 : 0.62,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, i) => _ListingCard(listing: listings[i], compact: compact, onTap: () => _openListing(listings[i])),
              childCount: listings.length,
            ),
          );
        },
      ),
    );
  }
}

/// Top-left badge on any card whose vendor plan currently makes it
/// featured — not just inside the separate featured rail, so the same
/// signal is visible wherever the listing happens to show up.
class _VedetteBadge extends StatelessWidget {
  final bool compact;
  const _VedetteBadge({this.compact = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: compact ? 6 : 8, vertical: 2),
      decoration: BoxDecoration(color: AppColors.orange, borderRadius: BorderRadius.circular(99), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 2)]),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.star_rounded, color: Colors.white, size: compact ? 10 : 11),
          const SizedBox(width: 2),
          Text('VEDETTE', style: TextStyle(color: Colors.white, fontSize: compact ? 8 : 9, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

/// A small heart button, independent of whatever it's overlaid on (image
/// corner, card) — used on the featured rail and the main feed alike.
class _FavoriteButton extends StatelessWidget {
  final String listingId;
  const _FavoriteButton({required this.listingId});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    if (!auth.isLoggedIn) return const SizedBox.shrink();
    final active = auth.favoriteIds.contains(listingId);
    return Material(
      color: Colors.white.withValues(alpha: 0.9),
      shape: const CircleBorder(),
      child: IconButton(
        iconSize: 16,
        padding: const EdgeInsets.all(6),
        constraints: const BoxConstraints(),
        onPressed: () => auth.toggleFavorite(listingId),
        icon: Icon(
          active ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          color: active ? AppColors.red : AppColors.gray900,
        ),
      ),
    );
  }
}

/// Appeler/WhatsApp, reachable straight from the card. Discuter stays
/// detail-screen-only: it needs a signed-in chat thread, not a one-tap
/// action a card can support on its own.
class _QuickContactButtons extends StatelessWidget {
  final String? whatsapp;
  final String? title;
  const _QuickContactButtons({required this.whatsapp, this.title});

  @override
  Widget build(BuildContext context) {
    final phone = whatsapp;
    if (phone == null) return const SizedBox.shrink();
    final text = Uri.encodeComponent(
      title != null ? 'Bonjour, je suis intéressé(e) par votre annonce "$title".' : 'Bonjour, je suis intéressé(e) par votre produit.',
    );
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _circleIconButton(Icons.call_rounded, AppColors.gray100, AppColors.gray900, () => launchUrl(Uri.parse('tel:$phone'))),
        const SizedBox(width: 8),
        _circleIconButton(
          Icons.chat_bubble_rounded,
          AppColors.whatsapp,
          Colors.white,
          () => launchUrl(
            Uri.parse('https://wa.me/${phone.replaceAll(RegExp(r'[^0-9]'), '')}?text=$text'),
            mode: LaunchMode.externalApplication,
          ),
        ),
      ],
    );
  }

  Widget _circleIconButton(IconData icon, Color bg, Color fg, VoidCallback onTap) {
    return Material(
      color: bg,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(7),
          child: Icon(icon, size: 15, color: fg),
        ),
      ),
    );
  }
}

class _ListingCard extends StatelessWidget {
  final Listing listing;
  final bool compact;
  final VoidCallback onTap;
  const _ListingCard({required this.listing, required this.compact, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return compact ? _buildRow(context) : _buildGridCard(context);
  }

  Widget _locationDateRow() {
    final parts = <Widget>[];
    if (listing.city != null) {
      parts.add(Row(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.location_on, size: 12, color: AppColors.gray400),
        Text(listing.city!, style: const TextStyle(fontSize: 11, color: AppColors.gray400, fontWeight: FontWeight.w600)),
      ]));
    }
    if (listing.createdAt != null) {
      if (parts.isNotEmpty) parts.add(const SizedBox(width: 8));
      parts.add(Row(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.access_time_rounded, size: 12, color: AppColors.gray400),
        const SizedBox(width: 2),
        Text(formatRelativeTime(listing.createdAt!), style: const TextStyle(fontSize: 11, color: AppColors.gray400, fontWeight: FontWeight.w600)),
      ]));
    }
    return Row(children: parts);
  }

  Widget _chip() {
    final summary = summarizeAttributes(listing.attributes, max: 2);
    if (summary.isEmpty) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.only(top: 4, bottom: 4),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: AppColors.gray100, borderRadius: BorderRadius.circular(99)),
      child: Text(summary, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.gray900)),
    );
  }

  /// Compact horizontal row — narrow screens, matches how a real
  /// classifieds list reads: more listings per scroll than a tall card.
  Widget _buildRow(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.gray100)),
        clipBehavior: Clip.antiAlias,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(
              width: 112,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ListingImage(url: listing.image),
                  if (listing.featured) const Positioned(top: 6, left: 6, child: _VedetteBadge(compact: true)),
                  Positioned(top: 4, right: 4, child: _FavoriteButton(listingId: listing.id)),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(listing.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    _chip(),
                    _locationDateRow(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            '${formatFcfa(listing.price)} ${listing.currency}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w900, fontSize: 15),
                          ),
                        ),
                        _QuickContactButtons(whatsapp: listing.whatsapp, title: listing.title),
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

  /// Vertical card — the wide-screen grid, unchanged in spirit from
  /// before, with the same chip/date/quick-contact/VEDETTE additions.
  Widget _buildGridCard(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.gray100)),
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
            Stack(
              children: [
                AspectRatio(aspectRatio: 4 / 5, child: ListingImage(url: listing.image)),
                if (listing.featured) const Positioned(top: 8, left: 8, child: _VedetteBadge()),
                Positioned(top: 8, right: 8, child: _FavoriteButton(listingId: listing.id)),
              ],
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(listing.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    _chip(),
                    _locationDateRow(),
                    const SizedBox(height: 2),
                    Expanded(
                      child: Text(listing.description ?? '', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.gray500, fontSize: 12)),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            '${formatFcfa(listing.price)} ${listing.currency}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w900),
                          ),
                        ),
                        _QuickContactButtons(whatsapp: listing.whatsapp, title: listing.title),
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
