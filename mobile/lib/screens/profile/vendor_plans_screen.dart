import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/vendor_plan.dart';
import '../../services/auth_service.dart';
import '../../services/vendor_plan_repository.dart';
import '../../theme/app_theme.dart';

/// Mirrors VendorPlansView.tsx. Checkout is a hosted Paydunya page, so
/// "come back" works differently per platform:
///   - Web: a full-page redirect (webOnlyWindowName: '_self') — the app
///     reloads at Paydunya's return_url, and app_shell.dart's
///     _handlePaydunyaReturn() (run at the app root, since this screen no
///     longer exists after the reload) does the sync check.
///   - Native: an external browser tab, which never comes "back" into
///     this app on its own (no deep link is registered — see
///     MOBILE_README.md). This screen instead watches for the app
///     resuming (the user switching back after paying or cancelling) and
///     syncs then.
class VendorPlansScreen extends StatefulWidget {
  const VendorPlansScreen({super.key});

  @override
  State<VendorPlansScreen> createState() => _VendorPlansScreenState();
}

class _VendorPlansScreenState extends State<VendorPlansScreen> with WidgetsBindingObserver {
  late final VendorPlanRepository _repo;
  List<VendorPlan> _plans = [];
  bool _paydunyaEnabled = false;
  bool _loading = true;
  String? _buyingPlanId;
  String? _pendingOrderId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _repo = VendorPlanRepository(context.read<AuthService>().api);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Native only in practice — on web, returning from a redirect is a
    // fresh page load, not a lifecycle resume, and app_shell.dart already
    // owns that path.
    if (state == AppLifecycleState.resumed && _pendingOrderId != null && !kIsWeb) {
      final orderId = _pendingOrderId!;
      _pendingOrderId = null;
      _syncOrder(orderId);
    }
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([_repo.fetchPlans(), _repo.isPaydunyaEnabled()]);
      if (mounted) {
        setState(() {
          _plans = results[0] as List<VendorPlan>;
          _paydunyaEnabled = results[1] as bool;
        });
      }
    } catch (_) {
      // Leave whatever loaded.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _buy(VendorPlan plan) async {
    setState(() => _buyingPlanId = plan.id);
    try {
      final checkout = await _repo.startCheckout(plan.id);
      _pendingOrderId = checkout.orderId;
      final uri = Uri.parse(checkout.checkoutUrl);
      if (kIsWeb) {
        await launchUrl(uri, webOnlyWindowName: '_self');
      } else {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _buyingPlanId = null);
    }
  }

  Future<void> _syncOrder(String orderId) async {
    try {
      final result = await _repo.syncOrder(orderId);
      if (!mounted) return;
      if (result.status == 'COMPLETED') {
        await context.read<AuthService>().refreshUser();
        _showMessage('Paiement confirmé ! Votre offre est maintenant active.');
      } else if (result.status == 'CANCELLED') {
        _showMessage('Paiement annulé.');
      } else {
        _showMessage('Paiement en attente de confirmation.');
      }
    } catch (_) {
      // Nothing more to try here — the user can reopen this screen later.
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Offres vendeur')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (!_paydunyaEnabled)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(color: const Color(0xFFFEF9C3), borderRadius: BorderRadius.circular(12)),
                        child: const Text(
                          "Le paiement en ligne n'est pas encore activé. Contactez un administrateur pour activer une offre.",
                          style: TextStyle(fontSize: 12, color: Color(0xFF854D0E)),
                        ),
                      ),
                    ..._plans.map((plan) => _PlanCard(
                          plan: plan,
                          paydunyaEnabled: _paydunyaEnabled,
                          busy: _buyingPlanId == plan.id,
                          onBuy: () => _buy(plan),
                        )),
                  ],
                ),
              ),
            ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final VendorPlan plan;
  final bool paydunyaEnabled;
  final bool busy;
  final VoidCallback onBuy;
  const _PlanCard({required this.plan, required this.paydunyaEnabled, required this.busy, required this.onBuy});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: AppColors.gray100)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(plan.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              if (plan.featuredHome) ...[
                const SizedBox(width: 6),
                const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
              ],
            ],
          ),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: plan.priceFcfa > 0 ? '${formatFcfa(plan.priceFcfa)} FCFA' : 'Gratuit',
                  style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w900, fontSize: 16),
                ),
                TextSpan(text: ' / ${plan.durationDays}j', style: const TextStyle(color: AppColors.gray400)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Text('Annonces actives : ${plan.maxListings?.toString() ?? 'Illimité'}', style: const TextStyle(fontSize: 13, color: AppColors.gray500)),
          if (plan.featuredHome)
            const Text('Mise en avant sur la page d\'accueil', style: TextStyle(fontSize: 13, color: AppColors.gray500)),
          const SizedBox(height: 14),
          if (plan.priceFcfa > 0)
            ElevatedButton.icon(
              onPressed: paydunyaEnabled && !busy ? onBuy : null,
              icon: const Icon(Icons.credit_card, size: 18),
              label: Text(busy ? 'Redirection...' : 'Payer avec Paydunya'),
            )
          else
            const Text('Attribuée par un administrateur', style: TextStyle(fontSize: 11, color: AppColors.gray400), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
