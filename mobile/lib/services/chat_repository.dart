import 'api_client.dart';
import '../models/chat.dart';

class ChatRepository {
  final ApiClient api;
  ChatRepository(this.api);

  /// Get-or-create — reopening the same listing as the same buyer always
  /// resolves to the same thread (src/db/chat.ts's getOrCreateThread).
  Future<String> openThread(String listingId) async {
    final result = await api.post('/api/v1/chat/threads', body: {'listingId': listingId});
    return (result as Map<String, dynamic>)['id']?.toString() ?? '';
  }

  Future<List<ChatThreadSummary>> listThreads() async {
    final result = await api.get('/api/v1/chat/threads');
    return (result as List).map((e) => ChatThreadSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ChatMessage>> listMessages(String threadId) async {
    final result = await api.get('/api/v1/chat/threads/$threadId/messages');
    return (result as List).map((e) => ChatMessage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ChatMessage> sendMessage(String threadId, String body) async {
    final result = await api.post('/api/v1/chat/threads/$threadId/messages', body: {'body': body});
    return ChatMessage.fromJson(result as Map<String, dynamic>);
  }
}
