import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';

/// Mirrors AuthView.tsx. Google sign-in is web-only — see
/// AuthService.signInWithGoogle — so that button is only shown on web;
/// phone/PIN works everywhere and is always shown.
class AuthScreen extends StatefulWidget {
  final VoidCallback? onClose;
  const AuthScreen({super.key, this.onClose});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();
  String _error = '';
  bool _loading = false;
  bool _googleLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _submitPhone() async {
    setState(() => _error = '');
    final phone = _phoneController.text.trim();
    final pin = _pinController.text.trim();
    if (phone.isEmpty) {
      setState(() => _error = 'Le numéro de téléphone est requis.');
      return;
    }
    if (pin.length != 4) {
      setState(() => _error = 'Le code PIN doit contenir 4 chiffres.');
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthService>().signInWithPhone(phone, pin);
      widget.onClose?.call();
    } catch (_) {
      if (mounted) setState(() => _error = 'Numéro ou code PIN incorrect.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitGoogle() async {
    setState(() {
      _error = '';
      _googleLoading = true;
    });
    try {
      await context.read<AuthService>().signInWithGoogle();
      widget.onClose?.call();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'La connexion Google a échoué.');
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      child: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const SizedBox(height: 40),
                  const Text(
                    'SeneMarket',
                    style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: AppColors.orange),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Connectez-vous pour vendre ou contacter les vendeurs.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.gray500, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 32),
                  if (_error.isNotEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12)),
                      child: Text(
                        _error,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.red, fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                    ),
                  const _FieldLabel('Numéro de téléphone'),
                  TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(hintText: '+221 77 000 00 00'),
                  ),
                  const SizedBox(height: 16),
                  const _FieldLabel('Code PIN (4 chiffres)'),
                  TextField(
                    controller: _pinController,
                    keyboardType: TextInputType.number,
                    obscureText: true,
                    maxLength: 4,
                    decoration: const InputDecoration(hintText: '••••', counterText: ''),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _loading ? null : _submitPhone,
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.gray900),
                      icon: const Icon(Icons.smartphone_rounded, size: 18),
                      label: Text(_loading ? 'Connexion...' : 'Continuer avec Téléphone'),
                    ),
                  ),
                  const SizedBox(height: 32),
                  Row(
                    children: const [
                      Expanded(child: Divider(color: AppColors.gray100)),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Text('OU', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gray400)),
                      ),
                      Expanded(child: Divider(color: AppColors.gray100)),
                    ],
                  ),
                  const SizedBox(height: 32),
                  if (kIsWeb)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _googleLoading ? null : _submitGoogle,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.gray900,
                          side: const BorderSide(color: AppColors.gray100, width: 2),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.g_mobiledata_rounded, size: 24),
                        label: Text(_googleLoading ? 'Connexion...' : 'Continuer avec Google'),
                      ),
                    )
                  else
                    const Text(
                      "Google n'est disponible que sur la version web pour le moment.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.gray400, fontSize: 12),
                    ),
                ],
              ),
            ),
            if (widget.onClose != null)
              Positioned(
                top: 4,
                right: 4,
                child: IconButton(
                  onPressed: widget.onClose,
                  icon: const Icon(Icons.close_rounded),
                  style: IconButton.styleFrom(backgroundColor: AppColors.gray100),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6, left: 2),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gray500)),
      ),
    );
  }
}
