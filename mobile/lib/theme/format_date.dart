// Ports src/lib/formatDate.ts — a listing's real posted date, rendered
// the way a French classifieds site would ("à l'instant", "il y a 2h",
// "hier", "18 mai"). Replaces what used to be no date at all on the
// mobile product detail screen.
String formatRelativeTime(DateTime date) {
  final diff = DateTime.now().difference(date);
  final minutes = diff.inMinutes;

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return 'il y a $minutes min';
  final hours = diff.inHours;
  if (hours < 24) return 'il y a ${hours}h';
  final days = diff.inDays;
  if (days == 1) return 'hier';
  if (days < 7) return 'il y a $days j';

  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return '${date.day} ${months[date.month - 1]}';
}
