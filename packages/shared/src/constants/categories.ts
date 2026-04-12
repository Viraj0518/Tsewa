export const DATING_CATEGORIES = [
  { id: 'going_out_tonight', label: 'Going Out Tonight', labelTib: 'དགོང་མོ་ཕྱིར་འགྲོ', emoji: '🌙' },
  { id: 'brunch_date', label: 'Brunch Date', labelTib: 'ཉིན་གུང་ཟ་མ', emoji: '🥂' },
  { id: 'coffee_date', label: 'Coffee Date', labelTib: 'ཇ་འཐུང', emoji: '☕' },
  { id: 'study_buddy', label: 'Study Buddy', labelTib: 'སློབ་གྲོགས', emoji: '📚' },
  { id: 'adventure_partner', label: 'Adventure Partner', labelTib: 'འགྲུལ་གྲོགས', emoji: '🏔️' },
  { id: 'festival_companion', label: 'Festival Companion', labelTib: 'དུས་ཆེན་གྲོགས', emoji: '🎉' },
] as const;

export const CULTURAL_CATEGORIES = [
  { id: 'losar_celebration', label: 'Losar Celebration', labelTib: 'ལོ་གསར་སྲུང', emoji: '🎊' },
  { id: 'teaching_companion', label: 'Teaching Companion', labelTib: 'ཆོས་གྲོགས', emoji: '🙏' },
  { id: 'language_exchange', label: 'Language Exchange', labelTib: 'སྐད་རིགས་བརྗེ་རེས', emoji: '🗣️' },
  { id: 'diaspora_connect', label: 'Diaspora Connect', labelTib: 'མཐའ་འཁོར་འབྲེལ', emoji: '🌍' },
  { id: 'homecoming', label: 'Homecoming', labelTib: 'ཕ་ཡུལ་ལོག', emoji: '🏠' },
  { id: 'cultural_event_buddy', label: 'Cultural Event Buddy', labelTib: 'རིག་གཞུང་གྲོགས', emoji: '🎭' },
] as const;

export const ALL_CATEGORIES = [...DATING_CATEGORIES, ...CULTURAL_CATEGORIES] as const;

export type CategoryId = typeof ALL_CATEGORIES[number]['id'];
