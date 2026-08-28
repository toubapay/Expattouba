import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/vendor_plan_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/nav_tabs.dart';
import 'auth/auth_screen.dart';
import 'home/home_screen.dart';
import 'post/post_listing_screen.dart';
import 'post/vendor_onboarding_screen.dart';
import 'wallet/wallet_screen.dart';
import 'profile/profile_screen.dart';

/// Mirrors App.tsx/TopNav.tsx/BottomNav.tsx: no fixed phone-frame layout —
/// full width/height at any viewport. Below kDesktopBreakpoint this is a
/// normal single-column mobile screen with bottom tabs; at or above it, a
/// top nav bar replaces the bottom tabs and content gets its own
/// max-width container per screen (handled inside each screen, not here),
/// since a feed wants to get wide and a form doesn't.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  AppTab _activeTab = AppTab.home;
  bool _showAuth = false;

  @override
  void initState() {
    super.initState();
    // Paydunya's hosted checkout redirects back here via a full page
    // navigation on web (return_url/cancel_url set in
    // VendorPlanRepository.startCheckout) — the Flutter app reloads from
    // scratch at that URL, so this has to run at the app root on startup,
    // not inside VendorPlansScreen (which no longer exists by the time
    // the reload happens). Uri.base is plain dart:core, safe to read on
    // every platform — on native it just never happens to contain this
    // query param, so this is a harmless no-op there.
    WidgetsBinding.instance.addPostFrameCallback((_) => _handlePaydunyaReturn());
  }

  Future<void> _handlePaydunyaReturn() async {
    final orderId = Uri.base.queryParameters['vendorPlanOrder'];
    if (orderId == null) return;
    final cancelled = Uri.base.queryParameters['cancelled'] == '1';

    if (cancelled) {
      _showSnack('Paiement annulé.');
      setState(() => _activeTab = AppTab.profile);
      return;
    }

    final auth = context.read<AuthService>();
    if (!auth.isLoggedIn) return;

    try {
      final repo = VendorPlanRepository(auth.api);
      final result = await repo.syncOrder(orderId);
      if (result.status == 'COMPLETED') {
        await auth.refreshUser();
        _showSnack('Paiement confirmé ! Votre offre est maintenant active.');
      } else if (result.status == 'CANCELLED') {
        _showSnack('Paiement annulé.');
      } else {
        _showSnack('Paiement en cours de vérification. Si le débit a eu lieu, l\'offre s\'activera sous peu.');
      }
    } catch (_) {
      // Nothing actionable to show beyond what's already been tried.
    }
    if (mounted) setState(() => _activeTab = AppTab.profile);
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  void _handleTabChange(AppTab tab, bool isLoggedIn) {
    if (tab != AppTab.home && !isLoggedIn) {
      setState(() => _showAuth = true);
      return;
    }
    setState(() => _activeTab = tab);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    if (auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_showAuth && !auth.isLoggedIn) {
      return Scaffold(
        backgroundColor: AppColors.gray50,
        body: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isWide = constraints.maxWidth >= kDesktopBreakpoint;
              final card = ConstrainedBox(
                constraints: BoxConstraints(maxWidth: isWide ? 420 : double.infinity),
                child: Container(
                  decoration: isWide
                      ? BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.gray100),
                        )
                      : const BoxDecoration(color: Colors.white),
                  clipBehavior: Clip.antiAlias,
                  child: AuthScreen(onClose: () => setState(() => _showAuth = false)),
                ),
              );
              return isWide ? Center(child: card) : SizedBox.expand(child: card);
            },
          ),
        ),
      );
    }

    final needsOnboarding = auth.dbUser != null && auth.dbUser!.vendor == null && _activeTab == AppTab.post;

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth >= kDesktopBreakpoint;
          return Column(
            children: [
              if (isWide) _TopNav(activeTab: _activeTab, onChange: (t) => _handleTabChange(t, auth.isLoggedIn)),
              Expanded(
                child: needsOnboarding ? const VendorOnboardingScreen() : _buildTabBody(),
              ),
              if (!isWide)
                _BottomNav(activeTab: _activeTab, onChange: (t) => _handleTabChange(t, auth.isLoggedIn)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildTabBody() {
    switch (_activeTab) {
      case AppTab.home:
        return const HomeScreen();
      case AppTab.post:
        return const PostListingScreen();
      case AppTab.wallet:
        return const WalletScreen();
      case AppTab.profile:
        return const ProfileScreen();
    }
  }
}

class _BottomNav extends StatelessWidget {
  final AppTab activeTab;
  final ValueChanged<AppTab> onChange;
  const _BottomNav({required this.activeTab, required this.onChange});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        height: 64,
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.gray100)),
        ),
        child: Row(
          children: kNavTabs.map((def) {
            final isActive = def.tab == activeTab;
            return Expanded(
              child: InkWell(
                onTap: () => onChange(def.tab),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(def.icon, color: isActive ? AppColors.orange : AppColors.gray400, size: 24),
                    const SizedBox(height: 2),
                    Text(
                      def.label,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isActive ? AppColors.orange : AppColors.gray400,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _TopNav extends StatelessWidget {
  final AppTab activeTab;
  final ValueChanged<AppTab> onChange;
  const _TopNav({required this.activeTab, required this.onChange});

  @override
  Widget build(BuildContext context) {
    final walletBalance = context.watch<AuthService>().dbUser?.walletBalance;
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AppColors.gray100)),
      ),
      child: Row(
        children: [
          const Text(
            'SeneMarket',
            style: TextStyle(color: AppColors.orange, fontWeight: FontWeight.w900, fontSize: 20),
          ),
          const Spacer(),
          Row(
            children: kNavTabs.map((def) {
              final isActive = def.tab == activeTab;
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: TextButton.icon(
                  onPressed: () => onChange(def.tab),
                  style: TextButton.styleFrom(
                    backgroundColor: isActive ? AppColors.orangeLight : Colors.transparent,
                    foregroundColor: isActive ? AppColors.orange : AppColors.gray500,
                  ),
                  icon: Icon(def.icon, size: 18),
                  label: Text(def.label, style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              );
            }).toList(),
          ),
          const Spacer(),
          SizedBox(
            width: 140,
            child: walletBalance != null
                ? Text(
                    '${formatFcfa(walletBalance)} FCFA',
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  )
                : const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }
}
