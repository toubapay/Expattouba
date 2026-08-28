import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/chat.dart';
import '../../services/auth_service.dart';
import '../../services/chat_repository.dart';
import '../../theme/app_theme.dart';

/// Mirrors ChatPanel.tsx: polling every 4s rather than a websocket — the
/// same "live means a short poll" choice the whole app makes elsewhere,
/// and it needs no persistent-connection server.
class ChatScreen extends StatefulWidget {
  final String threadId;
  final String vendorName;
  const ChatScreen({super.key, required this.threadId, required this.vendorName});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static const _pollInterval = Duration(seconds: 4);

  late final ChatRepository _repo;
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  List<ChatMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _repo = ChatRepository(context.read<AuthService>().api);
    _fetch(isFirstLoad: true);
    _timer = Timer.periodic(_pollInterval, (_) => _fetch());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetch({bool isFirstLoad = false}) async {
    try {
      final messages = await _repo.listMessages(widget.threadId);
      if (!mounted) return;
      setState(() => _messages = messages);
      _scrollToBottom();
    } catch (e) {
      if (isFirstLoad && mounted) setState(() => _error = 'Impossible de charger la conversation');
    } finally {
      if (isFirstLoad && mounted) setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty) return;
    setState(() => _sending = true);
    _controller.clear();
    try {
      final message = await _repo.sendMessage(widget.threadId, body);
      if (!mounted) return;
      setState(() => _messages = [..._messages, message]);
      _scrollToBottom();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Message non envoyé, réessayez.')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final myUid = context.watch<AuthService>().dbUser?.uid;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          children: [
            const Text('Discussion avec', style: TextStyle(fontSize: 11, color: AppColors.gray400)),
            Text(widget.vendorName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.red)))
                    : _messages.isEmpty
                        ? const Center(
                            child: Text('Envoyez un message pour démarrer la conversation.', style: TextStyle(color: AppColors.gray400)),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(16),
                            itemCount: _messages.length,
                            itemBuilder: (context, i) {
                              final message = _messages[i];
                              final mine = myUid != null && message.senderUid == myUid;
                              return Align(
                                alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                  decoration: BoxDecoration(
                                    color: mine ? AppColors.orange : AppColors.gray100,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Text(message.body, style: TextStyle(color: mine ? Colors.white : AppColors.gray900)),
                                ),
                              );
                            },
                          ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: const InputDecoration(hintText: 'Écrire un message...'),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _sending ? null : _send,
                    icon: const Icon(Icons.send_rounded),
                    style: IconButton.styleFrom(backgroundColor: AppColors.orange, foregroundColor: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
