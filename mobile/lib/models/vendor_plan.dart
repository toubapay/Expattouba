/// Mirrors GET /api/payments/vendor-plans — commissionPercent/feeFcfa are
/// deliberately absent from that response (stripped server-side, see
/// src/routes/payments.ts), so this model never carries them.
class VendorPlan {
  final String id;
  final String name;
  final int priceFcfa;
  final int durationDays;
  final int? maxListings; // null = unlimited
  final bool featuredHome;
  final bool active;

  VendorPlan({
    required this.id,
    required this.name,
    required this.priceFcfa,
    required this.durationDays,
    this.maxListings,
    required this.featuredHome,
    required this.active,
  });

  factory VendorPlan.fromJson(Map<String, dynamic> json) {
    return VendorPlan(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      priceFcfa: (json['priceFcfa'] as num?)?.toInt() ?? 0,
      durationDays: (json['durationDays'] as num?)?.toInt() ?? 0,
      maxListings: (json['maxListings'] as num?)?.toInt(),
      featuredHome: json['featuredHome'] == true,
      active: json['active'] != false,
    );
  }
}
