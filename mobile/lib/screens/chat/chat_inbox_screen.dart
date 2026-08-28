import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/chat.dart';
import '../../services/auth_service.dart';
import '../../services/chat_repository.dart';
import '../../theme/app_theme.dart';
import '../../widgets/listing_image.dart';
import 'chat_screen.dart';

/// Mirrors ChatInboxView.tsx: every conversation this account is part of,
/// as buyer or as the vendor behind it (src/db/chat.ts's listThreadsForUid
/// already does that filtering server-side).
class ChatInboxScreen extends StatefulWidget {
  const ChatInboxScreen({super.key});

  @override
  State<ChatInboxScreen> createState() => _ChatInboxScreenState();
}

class _ChatInboxScreenState extends State<ChatInboxScreen> {
  List<ChatThreadSummary> _threads = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    final repo = ChatRepository(context.read<AuthService>().api);
    repo.listThreads().then((t) {
      if (mounted) setState(() => _threads = t);
    }).catchError((_) {}).whenComplete(() {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mes messages')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _threads.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      "Aucune conversation pour le moment. Discutez avec un vendeur depuis une annonce.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.gray400),
                    ),
                  ),
                )
              : ListView.separated(
                  itemCount: _threads.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, i) {
                    final thread = _threads[i];
                    return ListTile(
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: SizedBox(
                          width: 48,
                          height: 48,
                          child: ListingImage(url: thread.listingImage),
                        ),
                      ),
                      title: Text(thread.vendorName, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(thread.listingTitle, maxLines: 1, overflow: TextOverflow.ellipsis),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => ChatScreen(threadId: thread.threadId, vendorName: thread.vendorName),
                      )),
                    );
                  },
                ),
    );
  }
}
