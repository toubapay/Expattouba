import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/catalog_repository.dart';
import '../../services/listing_repository.dart';
import '../../theme/app_theme.dart';
import '../../models/listing.dart';

/// Mirrors PostView.tsx: title/category/price/description, an
/// AI-generated description via the same Gemini endpoint, an image, and a
/// confirmation step before the actual POST.
class PostListingScreen extends StatefulWidget {
  const PostListingScreen({super.key});

  @override
  State<PostListingScreen> createState() => _PostListingScreenState();
}

class _PostListingScreenState extends State<PostListingScreen> {
  final _titleController = TextEditingController();
  final _priceController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _category;
  List<Category> _categories = [];
  Uint8List? _imageBytes;
  bool _generating = false;
  bool _submitting = false;

  late final ListingRepository _listingRepo;
  late final CatalogRepository _catalogRepo;

  @override
  void initState() {
    super.initState();
    final api = context.read<AuthService>().api;
    _listingRepo = ListingRepository(api);
    _catalogRepo = CatalogRepository(api);
    _catalogRepo.fetchCategories().then((c) {
      if (mounted) setState(() => _categories = c);
    }).catchError((_) {});
  }

  @override
  void dispose() {
    _titleController.dispose();
    _priceController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    setState(() => _imageBytes = bytes);
  }

  Future<void> _generateDescription() async {
    if (_titleController.text.trim().isEmpty) {
      _showMessage("Veuillez entrer un titre d'abord.");
      return;
    }
    setState(() => _generating = true);
    try {
      final description = await _listingRepo.generateDescription(
        title: _titleController.text.trim(),
        imageBytes: _imageBytes,
      );
      if (description.isNotEmpty) _descriptionController.text = description;
    } on ApiException catch (e) {
      _showMessage(e.message);
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    final price = num.tryParse(_priceController.text.trim());
    if (title.isEmpty || price == null || price <= 0) {
      _showMessage('Titre et prix (nombre positif) requis.');
      return;
    }

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      builder: (_) => _ConfirmSheet(
        title: title,
        price: price,
        description: _descriptionController.text.trim(),
        imageBytes: _imageBytes,
      ),
    );
    if (confirmed != true) return;

    setState(() => _submitting = true);
    try {
      await _listingRepo.createListing(
        title: title,
        description: _descriptionController.text.trim(),
        price: price,
        category: _category,
        imageBytes: _imageBytes,
      );
      if (!mounted) return;
      _showMessage('Annonce publiée avec succès !');
      setState(() {
        _titleController.clear();
        _priceController.clear();
        _descriptionController.clear();
        _category = null;
        _imageBytes = null;
      });
    } on ListingLimitException catch (e) {
      _showMessage('${e.message} — voir Profil > Offres & abonnement.');
    } on ApiException catch (e) {
      _showMessage(e.message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Nouvelle annonce', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
              const SizedBox(height: 20),
              GestureDetector(
                onTap: _pickImage,
                child: AspectRatio(
                  aspectRatio: 1,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.gray100, width: 2, style: BorderStyle.solid),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: _imageBytes != null
                        ? Stack(
                            fit: StackFit.expand,
                            children: [
                              Image.memory(_imageBytes!, fit: BoxFit.cover),
                              Positioned(
                                top: 8,
                                right: 8,
                                child: IconButton.filled(
                                  onPressed: () => setState(() => _imageBytes = null),
                                  icon: const Icon(Icons.close, size: 16),
                                  style: IconButton.styleFrom(backgroundColor: Colors.black45),
                                ),
                              ),
                            ],
                          )
                        : const Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.add_a_photo_outlined, color: AppColors.gray400, size: 32),
                                SizedBox(height: 8),
                                Text('Ajouter une photo', style: TextStyle(color: AppColors.gray500)),
                              ],
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              const _Label('Titre'),
              TextField(controller: _titleController, decoration: const InputDecoration(hintText: 'Ex: IPhone 14 Pro Max 256Go')),
              const SizedBox(height: 16),
              const _Label('Catégorie'),
              DropdownButtonFormField<String>(
                value: _category,
                decoration: const InputDecoration(),
                hint: const Text('Choisir une catégorie...'),
                items: _categories
                    .map((c) => DropdownMenuItem(value: c.name, child: Text('${c.icon} ${c.name}')))
                    .toList(),
                onChanged: (v) => setState(() => _category = v),
              ),
              const SizedBox(height: 16),
              const _Label('Prix (FCFA)'),
              TextField(
                controller: _priceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(hintText: 'Ex: 550000'),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const _Label('Description'),
                  TextButton.icon(
                    onPressed: _generating ? null : _generateDescription,
                    icon: _generating
                        ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.auto_awesome, size: 14),
                    label: const Text("Générer avec l'IA", style: TextStyle(fontSize: 12)),
                  ),
                ],
              ),
              TextField(
                controller: _descriptionController,
                maxLines: 4,
                decoration: const InputDecoration(hintText: 'Décrivez votre article...'),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: Text(_submitting ? 'Publication...' : "Publier l'annonce"),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6, left: 2),
      child: Text(text.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.gray500)),
    );
  }
}

class _ConfirmSheet extends StatelessWidget {
  final String title;
  final num price;
  final String description;
  final Uint8List? imageBytes;
  const _ConfirmSheet({required this.title, required this.price, required this.description, this.imageBytes});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Confirmer l'annonce", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (imageBytes != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.memory(imageBytes!, width: 72, height: 72, fit: BoxFit.cover),
                  ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold), maxLines: 2, overflow: TextOverflow.ellipsis),
                      Text('${formatFcfa(price)} FCFA', style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
              ],
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(description, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.gray500)),
            ],
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirmer la publication'),
            ),
          ],
        ),
      ),
    );
  }
}
