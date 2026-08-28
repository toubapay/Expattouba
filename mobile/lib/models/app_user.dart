class Vendor {
  final String id;
  final String boutiqueName;
  final String? whatsappNumber;
  final String? address;
  final String badgeStatus;
  final bool isVerified;

  Vendor({
    required this.id,
    required this.boutiqueName,
    this.whatsappNumber,
    this.address,
    required this.badgeStatus,
    required this.isVerified,
  });

  factory Vendor.fromJson(Map<String, dynamic> json) {
    return Vendor(
      id: json['id']?.toString() ?? '',
      boutiqueName: json['boutiqueName']?.toString() ?? '',
      whatsappNumber: json['whatsappNumber']?.toString(),
      address: json['address']?.toString(),
      badgeStatus: json['badgeStatus']?.toString() ?? 'BRONZE',
      isVerified: json['isVerified'] == true,
    );
  }
}

/// Mirrors getUserWithVendor()'s response — the shape returned by
/// /api/v1/auth/phone, /api/v1/auth/sync, and /api/v1/vendors/onboard.
/// Never carries a `pin` field — the backend strips it before this JSON
/// is ever sent (see src/db/users.ts's getUserWithVendor).
class AppUser {
  final String id;
  final String uid;
  final String? email;
  final String? phoneNumber;
  final num walletBalance;
  final bool isAdmin;
  final Vendor? vendor;

  AppUser({
    required this.id,
    required this.uid,
    this.email,
    this.phoneNumber,
    required this.walletBalance,
    required this.isAdmin,
    this.vendor,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    final vendorJson = json['vendor'];
    return AppUser(
      id: json['id']?.toString() ?? '',
      uid: json['uid']?.toString() ?? '',
      email: json['email']?.toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      walletBalance: num.tryParse(json['walletBalance']?.toString() ?? '') ?? 0,
      isAdmin: json['isAdmin'] == true,
      vendor: vendorJson is Map<String, dynamic> ? Vendor.fromJson(vendorJson) : null,
    );
  }

  String get displayHandle => phoneNumber ?? email ?? uid;
}
