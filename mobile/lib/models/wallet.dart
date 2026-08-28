/// Mirrors a row from the `transactions` table as returned by
/// GET /api/v1/wallet/transactions (src/routes/wallet.ts).
class WalletTransaction {
  final String id;
  final num amount;
  final String? type; // DEPOSIT, WITHDRAWAL, PAYMENT, TRANSFER
  final String? status;
  final String? gateway;
  final String? listingId;
  final String? note;
  final DateTime createdAt;

  WalletTransaction({
    required this.id,
    required this.amount,
    this.type,
    this.status,
    this.gateway,
    this.listingId,
    this.note,
    required this.createdAt,
  });

  bool get isCredit => type == 'DEPOSIT';

  static const _typeLabels = {
    'DEPOSIT': 'Dépôt',
    'WITHDRAWAL': 'Retrait',
    'PAYMENT': 'Achat',
    'TRANSFER': 'Transfert',
  };

  String get label => note ?? _typeLabels[type] ?? 'Mouvement';

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: json['id']?.toString() ?? '',
      amount: num.tryParse(json['amount']?.toString() ?? '') ?? 0,
      type: json['type']?.toString(),
      status: json['status']?.toString(),
      gateway: json['gateway']?.toString(),
      listingId: json['listingId']?.toString(),
      note: json['note']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}
