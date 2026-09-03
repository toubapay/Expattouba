import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/listing.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/chat_repository.dart';
import '../../services/wallet_repository.dart';
import '../../theme/app_theme.dart';
import '../../theme/category_fields.dart';
import '../../theme/format_date.dart';
import '../../widgets/listing_image.dart';
import '../chat/chat_screen.dart';

/// Mirrors ProductDetailView.tsx: Appeler/WhatsApp/Discuter are always
/// available (this is a classifieds app first — the deal happens over
/// contact, not necessarily in-app), "Acheter (Wallet)" is the optional
/// extra gated by the admin's walletPurchaseEnabled setting.
class ProductDetailScreen extends StatefulWidget {
  final Listing listing;
  final bool walletPurchaseEnabled;
  final VoidCallback? onPurchased;

  const ProductDetailScreen({
    super.key,
    required this.listing,
    required this.walletPurchaseEnabled,
    this.onPurchased,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  bool _buying = false;
  bool _openingChat = false;

  Future<void> _call() async {
    final phone = widget.listing.whatsapp;
    if (phone == null) return;
    await launchUrl(Uri.parse('tel:$phone'));
  }

  Future<void> _whatsapp() async {
    final phone = widget.listing.whatsapp?.replaceAll(RegExp(r'[^0-9]'), '');
    if (phone == null) return;
    await launchUrl(Uri.parse('https://wa.me/$phone'), mode: LaunchMode.externalApplication);
  }

  Future<void> _openChat() async {
    final auth = context.read<AuthService>();
    if (!auth.isLoggedIn) {
      _showMessage('Connectez-vous pour discuter avec le vendeur.');
      return;
    }
    setState(() => _openingChat = true);
    try {
      final repo = ChatRepository(auth.api);
      final threadId = await repo.openThread(widget.listing.id);
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => ChatScreen(threadId: threadId, vendorName: widget.listing.vendorName),
      ));
    } on ApiException catch (e) {
      _showMessage(e.message);
    } finally {
      if (mounted) setState(() => _openingChat = false);
    }
  }

  Future<void> _buy() async {
    final auth = context.read<AuthService>();
    if (!auth.isLoggedIn) {
      _showMessage('Connectez-vous pour acheter cette annonce.');
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Confirmer l\'achat'),
        content: Text(
          'Acheter "${widget.listing.title}" pour ${formatFcfa(widget.listing.price)} ${widget.listing.currency} via votre portefeuille ?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirmer')),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _buying = true);
    try {
      final repo = WalletRepository(auth.api);
      await repo.purchaseListing(widget.listing.id);
      await auth.refreshUser();
      widget.onPurchased?.call();
      if (!mounted) return;
      _showMessage('Achat effectué avec succès !');
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      _showMessage(e.message);
    } finally {
      if (mounted) setState(() => _buying = false);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final listing = widget.listing;
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth >= 768;
            final content = Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Stack(
                          children: [
                            AspectRatio(aspectRatio: 1, child: ListingImage(url: listing.image)),
                            Positioned(
                              top: 12,
                              left: 12,
                              child: _RoundIconButton(icon: Icons.arrow_back, onTap: () => Navigator.of(context).pop()),
                            ),
                            Positioned(
                              top: 12,
                              right: 12,
                              child: _FavoriteToggle(listingId: listing.id),
                            ),
                          ],
                        ),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(listing.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text(
                                '${formatFcfa(listing.price)} ${listing.currency}',
                                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900, color: AppColors.orange),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  const Icon(Icons.location_on_outlined, size: 16, color: AppColors.gray500),
                                  const SizedBox(width: 4),
                                  Text(listing.city != null ? '${listing.city}, Sénégal' : 'Sénégal', style: const TextStyle(color: AppColors.gray500, fontSize: 13)),
                                  if (listing.createdAt != null) ...[
                                    const Text(' • ', style: TextStyle(color: AppColors.gray500, fontSize: 13)),
                                    Text('Publié ${formatRelativeTime(listing.createdAt!)}', style: const TextStyle(color: AppColors.gray500, fontSize: 13)),
                                  ],
                                ],
                              ),
                              if (attributeRows(listing.attributes).isNotEmpty) ...[
                                const Divider(height: 32),
                                const Text('Détails', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 10),
                                // LayoutBuilder rather than MediaQuery.size.width: this
                                // content sits inside a 640px-capped container on a wide
                                // screen (see the isWide branch below), so the *screen*
                                // width would badly oversize each box there — the local
                                // constraint is whatever's actually available here.
                                LayoutBuilder(
                                  builder: (context, constraints) {
                                    final boxWidth = (constraints.maxWidth - 10) / 2;
                                    return Wrap(
                                      spacing: 10,
                                      runSpacing: 10,
                                      children: attributeRows(listing.attributes).map((row) {
                                        return Container(
                                          width: boxWidth,
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                          decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(12)),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(row.label.toUpperCase(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.gray400)),
                                              Text(row.value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.gray900)),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                    );
                                  },
                                ),
                              ],
                              const Divider(height: 32),
                              const Text('Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              const SizedBox(height: 8),
                              Text(listing.description ?? '', style: const TextStyle(color: AppColors.gray500, height: 1.4)),
                              const Divider(height: 32),
                              _VendorCard(listing: listing),
                              if (listing.whatsapp != null) ...[
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(child: _ContactButton(icon: Icons.call_outlined, label: 'Appeler', onTap: _call)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _ContactButton(
                                        icon: Icons.chat_bubble_outline,
                                        label: 'WhatsApp',
                                        color: AppColors.whatsapp,
                                        filled: true,
                                        onTap: _whatsapp,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: _ContactButton(
                                        icon: Icons.forum_outlined,
                                        label: 'Discuter',
                                        busy: _openingChat,
                                        onTap: _openChat,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                              const SizedBox(height: 24),
                              Center(
                                child: TextButton.icon(
                                  onPressed: () {},
                                  icon: const Icon(Icons.flag_outlined, color: AppColors.red, size: 16),
                                  label: const Text('Signaler cette annonce', style: TextStyle(color: AppColors.red)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                _buildBottomBar(),
              ],
            );

            if (!isWide) return content;
            return Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 640),
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 24),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.gray100)),
                  clipBehavior: Clip.antiAlias,
                  child: content,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: AppColors.gray100))),
      child: Row(
        children: [
          if (widget.walletPurchaseEnabled) ...[
            Expanded(
              child: ElevatedButton(
                onPressed: _buying ? null : _buy,
                child: Text(_buying ? '...' : 'Acheter (Wallet)'),
              ),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _openingChat ? null : _openChat,
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.gray900),
              icon: const Icon(Icons.forum_outlined, size: 18),
              label: const Text('Discuter'),
            ),
          ),
        ],
      ),
    );
  }
}

class _VendorCard extends StatelessWidget {
  final Listing listing;
  const _VendorCard({required this.listing});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.gray50, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.orangeLight,
            child: Text(
              listing.vendorName.isNotEmpty ? listing.vendorName[0].toUpperCase() : 'V',
              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.orangeDark),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(listing.vendorName, style: const TextStyle(fontWeight: FontWeight.bold)),
                const Row(
                  children: [
                    Icon(Icons.verified, size: 12, color: AppColors.green),
                    SizedBox(width: 4),
                    Text('Membre vérifié', style: TextStyle(color: AppColors.green, fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
          ),
          if (listing.vendorBadge == 'GOLD')
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: const Color(0xFFFEF9C3), borderRadius: BorderRadius.circular(8)),
              child: const Text('Vendeur GOLD', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
            ),
        ],
      ),
    );
  }
}

class _ContactButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  final bool filled;
  final bool busy;
  const _ContactButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
    this.filled = false,
    this.busy = false,
  });

  @override
  Widget build(BuildContext context) {
    final fg = filled ? Colors.white : (color ?? AppColors.gray900);
    return InkWell(
      onTap: busy ? null : onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: filled ? (color ?? AppColors.orangeLight) : Colors.white,
          border: filled ? null : Border.all(color: AppColors.gray100),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            busy
                ? SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: fg))
                : Icon(icon, size: 18, color: fg),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: fg)),
          ],
        ),
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _RoundIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.85),
      shape: const CircleBorder(),
      child: IconButton(icon: Icon(icon, color: AppColors.gray900), onPressed: onTap),
    );
  }
}

class _FavoriteToggle extends StatelessWidget {
  final String listingId;
  const _FavoriteToggle({required this.listingId});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    if (!auth.isLoggedIn) return const SizedBox.shrink();
    final active = auth.favoriteIds.contains(listingId);
    return Material(
      color: Colors.white.withValues(alpha: 0.85),
      shape: const CircleBorder(),
      child: IconButton(
        icon: Icon(
          active ? Icons.favorite_rounded : Icons.favorite_border_rounded,
          color: active ? AppColors.red : AppColors.gray900,
        ),
        onPressed: () => auth.toggleFavorite(listingId),
      ),
    );
  }
}
