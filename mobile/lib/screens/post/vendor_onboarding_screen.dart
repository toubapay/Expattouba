import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/listing_repository.dart';
import '../../theme/app_theme.dart';

/// Mirrors VendorOnboarding.tsx — shown instead of PostListingScreen when
/// a logged-in account has no vendor record yet (see app_shell.dart).
class VendorOnboardingScreen extends StatefulWidget {
  const VendorOnboardingScreen({super.key});

  @override
  State<VendorOnboardingScreen> createState() => _VendorOnboardingScreenState();
}

class _VendorOnboardingScreenState extends State<VendorOnboardingScreen> {
  final _nameController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _addressController = TextEditingController();
  bool _submitting = false;

  Future<void> _submit() async {
    if (_nameController.text.trim().isEmpty ||
        _whatsappController.text.trim().isEmpty ||
        _addressController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tous les champs sont requis.')));
      return;
    }
    setState(() => _submitting = true);
    try {
      final auth = context.read<AuthService>();
      final repo = ListingRepository(auth.api);
      await repo.onboardVendor(
        boutiqueName: _nameController.text.trim(),
        whatsappNumber: _whatsappController.text.trim(),
        address: _addressController.text.trim(),
      );
      await auth.refreshUser();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _whatsappController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 24),
              const Text('Créer votre boutique', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Rejoignez SeneMarket et commencez à vendre.', style: TextStyle(color: AppColors.gray500)),
              const SizedBox(height: 24),
              const _FieldLabel('Nom de la boutique'),
              TextField(controller: _nameController, decoration: const InputDecoration(hintText: 'Ex: Dakar Sneakz')),
              const SizedBox(height: 16),
              const _FieldLabel('Numéro WhatsApp'),
              TextField(
                controller: _whatsappController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(hintText: '+221 77 000 00 00'),
              ),
              const SizedBox(height: 16),
              const _FieldLabel('Adresse'),
              TextField(controller: _addressController, decoration: const InputDecoration(hintText: 'Ex: Médina, Rue 33')),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: Text(_submitting ? 'Création...' : 'Commencer à vendre'),
              ),
            ],
          ),
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
      child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gray500)),
    );
  }
}
