import 'api_client.dart';
import '../models/vendor_plan.dart';

class CheckoutResult {
  final String orderId;
  final String checkoutUrl;
  CheckoutResult({required this.orderId, required this.checkoutUrl});
}

class SyncResult {
  final String status; // PENDING, COMPLETED, CANCELLED
  final bool activated;
  SyncResult({required this.status, required this.activated});
}

/// Public plan catalog + Paydunya checkout/sync
/// (src/routes/payments.ts, src/routes/vendorPlans.ts).
class VendorPlanRepository {
  final ApiClient api;
  VendorPlanRepository(this.api);

  Future<List<VendorPlan>> fetchPlans() async {
    final result = await api.get('/api/payments/vendor-plans', auth: false);
    return (result as List).map((e) => VendorPlan.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<bool> isPaydunyaEnabled() async {
    final result = await api.get('/api/payments/paydunya-status', auth: false);
    return (result as Map<String, dynamic>)['enabled'] == true;
  }

  /// Starts a Paydunya checkout for [planId]. The caller opens
  /// [CheckoutResult.checkoutUrl] (web: full-page redirect; native:
  /// external browser via url_launcher) and later calls [syncOrder] with
  /// the returned orderId once the user comes back.
  Future<CheckoutResult> startCheckout(String planId) async {
    final result = await api.post('/api/v1/vendors/plans/$planId/checkout');
    final map = result as Map<String, dynamic>;
    return CheckoutResult(orderId: map['orderId'].toString(), checkoutUrl: map['checkoutUrl'].toString());
  }

  Future<SyncResult> syncOrder(String orderId) async {
    final result = await api.post('/api/v1/vendors/plans/orders/$orderId/sync');
    final map = result as Map<String, dynamic>;
    return SyncResult(status: map['status']?.toString() ?? 'PENDING', activated: map['activated'] == true);
  }
}
