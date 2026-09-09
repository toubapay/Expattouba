import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import '../chat/chat_inbox_screen.dart';
import 'favorites_screen.dart';
import 'vendor_plans_screen.dart';

/// Mirrors ProfileView.tsx.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final dbUser = auth.dbUser;
    final vendor = dbUser?.vendor;
    final initials = vendor?.boutiqueName.substring(0, vendor.boutiqueName.length >= 2 ? 2 : 1).toUpperCase() ?? 'US';

    return SafeArea(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: const BoxDecoration(color: Colors.white, border: Border(bottom: BorderSide(color: AppColors.gray100))),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Center(child: Text('Mon Profil', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 32,
                          backgroundColor: AppColors.orangeLight,
                          child: Text(initials, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.orangeDark)),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(vendor?.boutiqueName ?? 'Utilisateur', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              Text(vendor?.whatsappNumber ?? dbUser?.email ?? dbUser?.phoneNumber ?? '', style: const TextStyle(color: AppColors.gray500, fontSize: 13)),
                              if (vendor != null) ...[
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(color: const Color(0xFFFEF9C3), borderRadius: BorderRadius.circular(8)),
                                  child: Text('Vendeur ${vendor.badgeStatus}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (vendor != null) ...[
                      const _SectionLabel('Boutique'),
                      _Card(children: [
                        _Row(
                          icon: Icons.shield_outlined,
                          iconColor: Colors.blue,
                          label: 'Vérification identité (KYC)',
                          trailing: _Badge(text: vendor.isVerified ? 'Vérifié' : 'Non vérifié', color: vendor.isVerified ? AppColors.green : AppColors.gray400),
                        ),
                        _Row(
                          icon: Icons.workspace_premium_outlined,
                          iconColor: AppColors.orange,
                          label: 'Offres & abonnement',
                          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const VendorPlansScreen())),
                        ),
                      ]),
                      const SizedBox(height: 20),
                    ],
                    const _SectionLabel('Messages'),
                    _Card(children: [
                      _Row(
                        icon: Icons.forum_outlined,
                        iconColor: AppColors.orange,
                        label: 'Mes messages',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ChatInboxScreen())),
                      ),
                      _Row(
                        icon: Icons.favorite_outline_rounded,
                        iconColor: AppColors.red,
                        label: 'Mes favoris',
                        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const FavoritesScreen())),
                      ),
                    ]),
                    const SizedBox(height: 20),
                    const _SectionLabel('Paramètres'),
                    _Card(children: [
                      const _Row(icon: Icons.settings_outlined, iconColor: AppColors.gray500, label: 'Préférences'),
                      _Row(
                        icon: Icons.logout_rounded,
                        iconColor: AppColors.red,
                        label: 'Déconnexion',
                        labelColor: AppColors.red,
                        onTap: auth.logOut,
                      ),
                    ]),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gray400)),
    );
  }
}

class _Card extends StatelessWidget {
  final List<Widget> children;
  const _Card({required this.children});
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.gray100)),
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }
}

class _Row extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final Color? labelColor;
  final Widget? trailing;
  final VoidCallback? onTap;
  const _Row({required this.icon, required this.iconColor, required this.label, this.labelColor, this.trailing, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(color: iconColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
              alignment: Alignment.center,
              child: Icon(icon, size: 16, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: labelColor))),
            trailing ?? (onTap != null ? const Icon(Icons.chevron_right, color: AppColors.gray400) : const SizedBox.shrink()),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  const _Badge({required this.text, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
    );
  }
}
