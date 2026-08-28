/// Mirrors the row shape returned by GET /api/v1/home and
/// GET /api/v1/listings (src/db/listings.ts's FeedListing). Parsing is
/// deliberately defensive (nulls/missing fields fall back rather than
/// throw) since this is hand-written against the API's shape from memory,
/// not verified against a live response.
class Listing {
  final String id;
  final String title;
  final String? description;
  final num price;
  final String currency;
  final String? image;
  final String? whatsapp;
  final String? category;
  final String vendorId;
  final String vendorName;
  final String? vendorBadge;
  final bool featured;

  Listing({
    required this.id,
    required this.title,
    this.description,
    required this.price,
    required this.currency,
    this.image,
    this.whatsapp,
    this.category,
    required this.vendorId,
    required this.vendorName,
    this.vendorBadge,
    this.featured = false,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    return Listing(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      price: num.tryParse(json['price']?.toString() ?? '') ?? 0,
      currency: json['currency']?.toString() ?? 'FCFA',
      image: json['image']?.toString(),
      whatsapp: json['whatsapp']?.toString(),
      category: json['category']?.toString(),
      vendorId: json['vendorId']?.toString() ?? '',
      vendorName: json['vendorName']?.toString() ?? '',
      vendorBadge: json['vendorBadge']?.toString(),
      featured: json['featured'] == true,
    );
  }
}

class Category {
  final String id;
  final String name;
  final String icon;

  Category({required this.id, required this.name, required this.icon});

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      icon: json['icon']?.toString() ?? '🛍️',
    );
  }
}

class HomeSettings {
  final String featuredTitle;
  final String newArrivalsTitle;
  final bool featuredEnabled;

  HomeSettings({required this.featuredTitle, required this.newArrivalsTitle, required this.featuredEnabled});

  factory HomeSettings.fromJson(Map<String, dynamic>? json) {
    return HomeSettings(
      featuredTitle: json?['featuredTitle']?.toString() ?? 'En vedette',
      newArrivalsTitle: json?['newArrivalsTitle']?.toString() ?? 'Nouveautés',
      featuredEnabled: json?['featuredEnabled'] != false,
    );
  }
}

class HomeFeed {
  final List<Listing> featured;
  final List<Listing> listings;
  final HomeSettings home;
  final bool walletPurchaseEnabled;

  HomeFeed({
    required this.featured,
    required this.listings,
    required this.home,
    required this.walletPurchaseEnabled,
  });

  factory HomeFeed.fromJson(Map<String, dynamic> json) {
    return HomeFeed(
      featured: (json['featured'] as List? ?? [])
          .map((e) => Listing.fromJson(e as Map<String, dynamic>))
          .toList(),
      listings: (json['listings'] as List? ?? [])
          .map((e) => Listing.fromJson(e as Map<String, dynamic>))
          .toList(),
      home: HomeSettings.fromJson(json['home'] as Map<String, dynamic>?),
      walletPurchaseEnabled: json['walletPurchaseEnabled'] != false,
    );
  }
}
