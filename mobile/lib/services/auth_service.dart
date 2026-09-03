import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';
import 'favorites_repository.dart';
import '../models/app_user.dart';

/// Session state for the whole app — the same role AuthContext.tsx plays
/// in the web app. Two auth paths, same as the web app:
///   - Phone + PIN: our own backend JWT, stored in SharedPreferences
///     (mirrors localStorage's 'phoneToken'). Works on every platform.
///   - Google: Firebase Auth. Web-only here — see the class doc on
///     signInWithGoogle for why — so `fb.FirebaseAuth.instance` is never
///     touched unless kIsWeb, since it's never initialized otherwise
///     (see main.dart).
class AuthService extends ChangeNotifier {
  static const _phoneTokenKey = 'phoneToken';

  late final ApiClient _apiWithToken = ApiClient(getToken);
  ApiClient get api => _apiWithToken;

  String? _phoneToken;
  fb.User? _firebaseUser;
  AppUser? dbUser;
  bool loading = true;

  // Loaded once on login/sync, kept as ids only (not full listings) so
  // every heart icon on the page can check membership without its own
  // fetch — same reasoning as AuthContext.tsx's favoriteIds.
  Set<String> favoriteIds = {};
  late final FavoritesRepository _favoritesRepo = FavoritesRepository(_apiWithToken);

  bool get isLoggedIn => _phoneToken != null || _firebaseUser != null;
  bool get isPhoneAuth => _phoneToken != null;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _phoneToken = prefs.getString(_phoneTokenKey);

    if (_phoneToken != null) {
      await refreshUser();
    } else if (kIsWeb) {
      // fb.FirebaseAuth.instance is only safe to touch on web — see the
      // class doc. authStateChanges fires once immediately with the
      // current state, so this also covers "already signed in" on load.
      fb.FirebaseAuth.instance.authStateChanges().listen((user) async {
        _firebaseUser = user;
        if (user != null && _phoneToken == null) {
          await refreshUser();
        } else if (user == null && _phoneToken == null) {
          dbUser = null;
          favoriteIds = {};
        }
        loading = false;
        notifyListeners();
      });
      return;
    }

    loading = false;
    notifyListeners();
  }

  Future<String?> getToken() async {
    if (_phoneToken != null) return _phoneToken;
    if (kIsWeb && fb.FirebaseAuth.instance.currentUser != null) {
      return fb.FirebaseAuth.instance.currentUser!.getIdToken();
    }
    return null;
  }

  /// Same endpoint for both auth paths — POST /api/v1/auth/sync — matching
  /// the web app's refreshUser(), which doesn't special-case phone vs
  /// Google either (see src/db/users.ts's getOrCreateUser, which no-ops
  /// harmlessly for a phone account with no email).
  Future<void> refreshUser() async {
    try {
      final result = await _apiWithToken.post('/api/v1/auth/sync');
      if (result is Map<String, dynamic>) {
        dbUser = AppUser.fromJson(result);
      }
    } catch (e) {
      debugPrint('refreshUser failed: $e');
    }
    await _refreshFavoriteIds();
    notifyListeners();
  }

  Future<void> _refreshFavoriteIds() async {
    try {
      favoriteIds = await _favoritesRepo.fetchIds();
    } catch (e) {
      debugPrint('refreshFavoriteIds failed: $e');
    }
  }

  /// Optimistic: the heart icon flips immediately, then this reconciles
  /// with the server. A failed request rolls the local set back rather
  /// than leaving the UI claiming a state the database doesn't have.
  Future<void> toggleFavorite(String listingId) async {
    final wasFavorited = favoriteIds.contains(listingId);
    favoriteIds = Set.of(favoriteIds);
    if (wasFavorited) {
      favoriteIds.remove(listingId);
    } else {
      favoriteIds.add(listingId);
    }
    notifyListeners();
    try {
      if (wasFavorited) {
        await _favoritesRepo.remove(listingId);
      } else {
        await _favoritesRepo.add(listingId);
      }
    } catch (e) {
      debugPrint('toggleFavorite failed: $e');
      favoriteIds = Set.of(favoriteIds);
      if (wasFavorited) {
        favoriteIds.add(listingId);
      } else {
        favoriteIds.remove(listingId);
      }
      notifyListeners();
    }
  }

  Future<void> signInWithPhone(String phone, String pin) async {
    final result = await _apiWithToken.post(
      '/api/v1/auth/phone',
      body: {'phone': phone, 'pin': pin},
      auth: false,
    );
    final token = result['token']?.toString();
    if (token == null) throw ApiException('Réponse invalide du serveur');

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_phoneTokenKey, token);
    _phoneToken = token;
    dbUser = AppUser.fromJson(result['user'] as Map<String, dynamic>);
    await _refreshFavoriteIds();
    loading = false;
    notifyListeners();
  }

  /// Web-only: Google sign-in on Android/iOS needs google-services.json /
  /// GoogleService-Info.plist from the Firebase console, which can't be
  /// generated here (see firebase_options.dart and MOBILE_README.md).
  /// Phone/PIN works everywhere and needs none of this.
  Future<void> signInWithGoogle() async {
    if (!kIsWeb) {
      throw ApiException(
        "Google n'est disponible que sur la version web pour le moment. Utilisez Téléphone/PIN.",
      );
    }
    final provider = fb.GoogleAuthProvider();
    final credential = await fb.FirebaseAuth.instance.signInWithPopup(provider);
    _firebaseUser = credential.user;
    await refreshUser();
  }

  Future<void> logOut() async {
    if (_phoneToken != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_phoneTokenKey);
      _phoneToken = null;
    } else if (kIsWeb) {
      await fb.FirebaseAuth.instance.signOut();
      _firebaseUser = null;
    }
    dbUser = null;
    favoriteIds = {};
    notifyListeners();
  }
}
