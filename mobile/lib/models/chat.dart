/// A row from GET /api/v1/chat/threads/:id/messages.
class ChatMessage {
  final String id;
  final String threadId;
  final String senderUid;
  final String body;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.threadId,
    required this.senderUid,
    required this.body,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id']?.toString() ?? '',
      threadId: json['threadId']?.toString() ?? '',
      senderUid: json['senderUid']?.toString() ?? '',
      body: json['body']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

/// One row from GET /api/v1/chat/threads (src/db/chat.ts's
/// listThreadsForUid) — the thread plus the listing/vendor context the
/// inbox list needs to render without a second round trip per row.
class ChatThreadSummary {
  final String threadId;
  final String listingId;
  final String vendorId;
  final String buyerUid;
  final String listingTitle;
  final String? listingImage;
  final String vendorName;

  ChatThreadSummary({
    required this.threadId,
    required this.listingId,
    required this.vendorId,
    required this.buyerUid,
    required this.listingTitle,
    this.listingImage,
    required this.vendorName,
  });

  factory ChatThreadSummary.fromJson(Map<String, dynamic> json) {
    final thread = json['thread'] as Map<String, dynamic>? ?? {};
    return ChatThreadSummary(
      threadId: thread['id']?.toString() ?? '',
      listingId: thread['listingId']?.toString() ?? '',
      vendorId: thread['vendorId']?.toString() ?? '',
      buyerUid: thread['buyerUid']?.toString() ?? '',
      listingTitle: json['listingTitle']?.toString() ?? '',
      listingImage: json['listingImage']?.toString(),
      vendorName: json['vendorName']?.toString() ?? '',
    );
  }
}
