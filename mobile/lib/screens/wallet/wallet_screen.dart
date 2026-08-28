import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/wallet.dart';
import '../../services/auth_service.dart';
import '../../services/wallet_repository.dart';
import '../../theme/app_theme.dart';

/// Mirrors WalletView.tsx: real balance and transaction history from the
/// backend; Recharger/Retirer/Wave/Orange Money stay honestly
/// non-functional — no payment gateway is wired up, so pretending they
/// work would be worse than saying so.
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  List<WalletTransaction> _transactions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final repo = WalletRepository(context.read<AuthService>().api);
      final transactions = await repo.fetchTransactions();
      if (mounted) setState(() => _transactions = transactions);
    } catch (_) {
      // Keep whatever was already on screen.
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _notYetAvailable() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        content: const Text(
          'Bientôt disponible. En attendant, contactez un administrateur pour créditer votre compte.',
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final balance = context.watch<AuthService>().dbUser?.walletBalance ?? 0;
    return SafeArea(
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
              decoration: const BoxDecoration(
                color: AppColors.orange,
                borderRadius: BorderRadius.only(bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
              ),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Column(
                    children: [
                      const Text('Mon Portefeuille', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      const Text('Solde Principal', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      Text(
                        '${formatFcfa(balance)} FCFA',
                        style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _notYetAvailable,
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.orange),
                              icon: const Icon(Icons.south_west_rounded, size: 16),
                              label: const Text('Recharger'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _notYetAvailable,
                              style: ElevatedButton.styleFrom(backgroundColor: AppColors.orangeDark),
                              icon: const Icon(Icons.north_east_rounded, size: 16),
                              label: const Text('Retirer'),
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
                      const Text('Méthodes de paiement', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(child: _PaymentMethodTile(label: 'Wave', color: Colors.blue, initials: 'W', onTap: _notYetAvailable)),
                          const SizedBox(width: 12),
                          Expanded(child: _PaymentMethodTile(label: 'Orange Money', color: Colors.orange, initials: 'OM', onTap: _notYetAvailable)),
                        ],
                      ),
                      const SizedBox(height: 24),
                      const Text('Historique', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      if (_loading)
                        const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator()))
                      else if (_transactions.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(child: Text('Aucun mouvement pour le moment.', style: TextStyle(color: AppColors.gray400))),
                        )
                      else
                        ...List.generate(_transactions.length, (i) {
                          final tx = _transactions[i];
                          return _TransactionTile(tx: tx, isLast: i == _transactions.length - 1);
                        }),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentMethodTile extends StatelessWidget {
  final String label;
  final Color color;
  final String initials;
  final VoidCallback onTap;
  const _PaymentMethodTile({required this.label, required this.color, required this.initials, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(border: Border.all(color: AppColors.gray100), borderRadius: BorderRadius.circular(16)),
        child: Column(
          children: [
            CircleAvatar(radius: 20, backgroundColor: color, child: Text(initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
            const SizedBox(height: 8),
            Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final WalletTransaction tx;
  final bool isLast;
  const _TransactionTile({required this.tx, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final credit = tx.isCredit;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(border: isLast ? null : const Border(bottom: BorderSide(color: AppColors.gray100))),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: credit ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
            child: Icon(credit ? Icons.south_west_rounded : Icons.north_east_rounded, size: 16, color: credit ? AppColors.green : AppColors.red),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tx.label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text(
                  '${tx.createdAt.day}/${tx.createdAt.month}/${tx.createdAt.year} ${tx.createdAt.hour.toString().padLeft(2, '0')}:${tx.createdAt.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(color: AppColors.gray400, fontSize: 11),
                ),
              ],
            ),
          ),
          Text(
            '${credit ? '+' : '-'}${formatFcfa(tx.amount)} F',
            style: TextStyle(fontWeight: FontWeight.bold, color: credit ? AppColors.green : AppColors.gray900),
          ),
        ],
      ),
    );
  }
}
