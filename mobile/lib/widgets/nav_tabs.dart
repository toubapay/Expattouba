import 'package:flutter/material.dart';

/// Mirrors src/lib/navTabs.ts — one definition shared by the bottom nav
/// (narrow width) and the top nav (wide width) in app_shell.dart, so the
/// two can't drift into showing different destinations.
enum AppTab { home, post, wallet, profile }

class NavTabDef {
  final AppTab tab;
  final String label;
  final IconData icon;
  const NavTabDef(this.tab, this.label, this.icon);
}

const List<NavTabDef> kNavTabs = [
  NavTabDef(AppTab.home, 'Accueil', Icons.home_rounded),
  NavTabDef(AppTab.post, 'Vendre', Icons.add_box_rounded),
  NavTabDef(AppTab.wallet, 'Portefeuille', Icons.account_balance_wallet_rounded),
  NavTabDef(AppTab.profile, 'Profil', Icons.person_rounded),
];

/// Same breakpoint as the web app's Tailwind `md:` prefix (768px) — below
/// it, bottom tabs; at or above, the top nav bar takes over.
const double kDesktopBreakpoint = 768;
