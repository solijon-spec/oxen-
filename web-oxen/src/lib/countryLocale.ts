import type { Country } from "@/data/countries";
import type { Language } from "@/contexts/LanguageContext";

/* ------------------------------------------------------------------ */
/*  Country localization layer                                         */
/*  Translates visible country fields (name, capital, continent,      */
/*  currency, language, tagline, blurb) for supported languages.      */
/*  Fallback to the original English data when no translation exists. */
/* ------------------------------------------------------------------ */

const COUNTRY_NAMES: Partial<Record<Language, Record<string, string>>> = {
  uz: {
    uzbekistan: "O'zbekiston", russia: "Rossiya", turkey: "Turkiya", kazakhstan: "Qozog'iston",
    kyrgyzstan: "Qirg'iziston", tajikistan: "Tojikiston", ukraine: "Ukraina", azerbaijan: "Ozarbayjon",
    germany: "Germaniya", france: "Fransiya", italy: "Italiya", spain: "Ispaniya", portugal: "Portugaliya",
    "united kingdom": "Birlashgan Qirollik", usa: "AQSh", china: "Xitoy", japan: "Yaponiya", "south korea": "Janubiy Koreya",
    india: "Hindiston", indonesia: "Indoneziya", malaysia: "Malayziya", egypt: "Misr", "saudi arabia": "Saudiya Arabistoni",
    uae: "BAA", qatar: "Qatar", thailand: "Tailand", vietnam: "Vyetnam", brazil: "Braziliya", argentina: "Argentina",
    australia: "Avstraliya", canada: "Kanada", mexico: "Meksika", greece: "Yunoniston", netherlands: "Niderlandiya",
  },
  ru: {
    uzbekistan: "Узбекистан", russia: "Россия", turkey: "Турция", kazakhstan: "Казахстан",
    kyrgyzstan: "Кыргызстан", tajikistan: "Таджикистан", ukraine: "Украина", azerbaijan: "Азербайджан",
    germany: "Германия", france: "Франция", italy: "Италия", spain: "Испания", portugal: "Португалия",
    "united kingdom": "Великобритания", usa: "США", china: "Китай", japan: "Япония", "south korea": "Южная Корея",
    india: "Индия", indonesia: "Индонезия", malaysia: "Малайзия", egypt: "Египет", "saudi arabia": "Саудовская Аравия",
    uae: "ОАЭ", qatar: "Катар", thailand: "Таиланд", vietnam: "Вьетнам", brazil: "Бразилия", argentina: "Аргентина",
    australia: "Австралия", canada: "Канада", mexico: "Мексика", greece: "Греция", netherlands: "Нидерланды",
  },
  tr: {
    uzbekistan: "Özbekistan", russia: "Rusya", turkey: "Türkiye", kazakhstan: "Kazakistan",
    kyrgyzstan: "Kırgızistan", tajikistan: "Tacikistan", ukraine: "Ukrayna", azerbaijan: "Azerbaycan",
    germany: "Almanya", france: "Fransa", italy: "İtalya", spain: "İspanya", portugal: "Portekiz",
    "united kingdom": "Birleşik Krallık", usa: "ABD", china: "Çin", japan: "Japonya", "south korea": "Güney Kore",
    india: "Hindistan", indonesia: "Endonezya", malaysia: "Malezya", egypt: "Mısır", "saudi arabia": "Suudi Arabistan",
    uae: "BAE", qatar: "Katar", thailand: "Tayland", vietnam: "Vietnam", brazil: "Brezilya", argentina: "Arjantin",
    australia: "Avustralya", canada: "Kanada", mexico: "Meksika", greece: "Yunanistan", netherlands: "Hollanda",
  },
  ar: {
    uzbekistan: "أوزبكستان", russia: "روسيا", turkey: "تركيا", kazakhstan: "كازاخستان",
    kyrgyzstan: "قيرغيزستان", tajikistan: "طاجيكستان", ukraine: "أوكرانيا", azerbaijan: "أذربيجان",
    germany: "ألمانيا", france: "فرنسا", italy: "إيطاليا", spain: "إسبانيا", portugal: "البرتغال",
    "united kingdom": "المملكة المتحدة", usa: "الولايات المتحدة", china: "الصين", japan: "اليابان", "south korea": "كوريا الجنوبية",
    india: "الهند", indonesia: "إندونيسيا", malaysia: "ماليزيا", egypt: "مصر", "saudi arabia": "المملكة العربية السعودية",
    uae: "الإمارات", qatar: "قطر", thailand: "تايلاند", vietnam: "فيتنام", brazil: "البرازيل", argentina: "الأرجنتين",
    australia: "أستراليا", canada: "كندا", mexico: "المكسيك", greece: "اليونان", netherlands: "هولندا",
  },
  id: {
    uzbekistan: "Uzbekistan", russia: "Rusia", turkey: "Turki", kazakhstan: "Kazakhstan",
    kyrgyzstan: "Kirgizstan", tajikistan: "Tajikistan", ukraine: "Ukraina", azerbaijan: "Azerbaijan",
    germany: "Jerman", france: "Perancis", italy: "Italia", spain: "Spanyol", portugal: "Portugal",
    "united kingdom": "Inggris Raya", usa: "Amerika Serikat", china: "Tiongkok", japan: "Jepang", "south korea": "Korea Selatan",
    india: "India", indonesia: "Indonesia", malaysia: "Malaysia", egypt: "Mesir", "saudi arabia": "Arab Saudi",
    uae: "UEA", qatar: "Qatar", thailand: "Thailand", vietnam: "Vietnam", brazil: "Brasil", argentina: "Argentina",
    australia: "Australia", canada: "Kanada", mexico: "Meksiko", greece: "Yunani", netherlands: "Belanda",
  },
  ms: {
    uzbekistan: "Uzbekistan", russia: "Rusia", turkey: "Turki", kazakhstan: "Kazakhstan",
    kyrgyzstan: "Kirgizstan", tajikistan: "Tajikistan", ukraine: "Ukraine", azerbaijan: "Azerbaijan",
    germany: "Jerman", france: "Perancis", italy: "Itali", spain: "Sepanyol", portugal: "Portugal",
    "united kingdom": "United Kingdom", usa: "Amerika Syarikat", china: "China", japan: "Jepun", "south korea": "Korea Selatan",
    india: "India", indonesia: "Indonesia", malaysia: "Malaysia", egypt: "Mesir", "saudi arabia": "Arab Saudi",
    uae: "Emiriah Arab Bersatu", qatar: "Qatar", thailand: "Thailand", vietnam: "Vietnam", brazil: "Brazil", argentina: "Argentina",
    australia: "Australia", canada: "Kanada", mexico: "Mexico", greece: "Greece", netherlands: "Belanda",
  },
  en: {
    uzbekistan: "Uzbekistan", russia: "Russia", turkey: "Turkey", kazakhstan: "Kazakhstan",
    kyrgyzstan: "Kyrgyzstan", tajikistan: "Tajikistan", ukraine: "Ukraine", azerbaijan: "Azerbaijan",
    germany: "Germany", france: "France", italy: "Italy", spain: "Spain", portugal: "Portugal",
    "united kingdom": "United Kingdom", usa: "United States", china: "China", japan: "Japan", "south korea": "South Korea",
    india: "India", indonesia: "Indonesia", malaysia: "Malaysia", egypt: "Egypt", "saudi arabia": "Saudi Arabia",
    uae: "United Arab Emirates", qatar: "Qatar", thailand: "Thailand", vietnam: "Vietnam", brazil: "Brazil", argentina: "Argentina",
    australia: "Australia", canada: "Canada", mexico: "Mexico", greece: "Greece", netherlands: "Netherlands",
  },
};

const CAPITALS: Partial<Record<Language, Record<string, string>>> = {
  uz: {
    uzbekistan: "Toshkent", russia: "Moskva", turkey: "Ankara", kazakhstan: "Astana", kyrgyzstan: "Bishkek",
    tajikistan: "Dushanbe", ukraine: "Kiyev", azerbaijan: "Boku", germany: "Berlin", france: "Parij", italy: "Rim", spain: "Madrid",
    portugal: "Lisbon", "united kingdom": "London", usa: "Vashington", china: "Pekin", japan: "Tokio", "south korea": "Seul",
    india: "Nyu-Deli", indonesia: "Jakarta", malaysia: "Kuala-Lumpur", egypt: "Qohira", "saudi arabia": "Ar-Riyod", uae: "Abu-Dabi",
    qatar: "Doha", thailand: "Bangkok", vietnam: "Xanoy", brazil: "Braziliya", argentina: "Buenos-Ayres", australia: "Kanberra",
    canada: "Ottava", mexico: "Meksiko", greece: "Afina", netherlands: "Amsterdam",
  },
  ru: {
    uzbekistan: "Ташкент", russia: "Москва", turkey: "Анкара", kazakhstan: "Астана", kyrgyzstan: "Бишкек",
    tajikistan: "Душанбе", ukraine: "Киев", azerbaijan: "Баку", germany: "Берлин", france: "Париж", italy: "Рим", spain: "Мадрид",
    portugal: "Лиссабон", "united kingdom": "Лондон", usa: "Вашингтон", china: "Пекин", japan: "Токио", "south korea": "Сеул",
    india: "Нью-Дели", indonesia: "Джакарта", malaysia: "Куала-Лумпур", egypt: "Каир", "saudi arabia": "Эр-Рияд", uae: "Абу-Даби",
    qatar: "Доха", thailand: "Бангкок", vietnam: "Ханой", brazil: "Бразилиа", argentina: "Буэнос-Айрес", australia: "Канберра",
    canada: "Оттава", mexico: "Мехико", greece: "Афины", netherlands: "Амстердам",
  },
  tr: {
    uzbekistan: "Taşkent", russia: "Moskova", turkey: "Ankara", kazakhstan: "Astana", kyrgyzstan: "Bişkek",
    tajikistan: "Duşanbe", ukraine: "Kiev", azerbaijan: "Bakü", germany: "Berlin", france: "Paris", italy: "Roma", spain: "Madrid",
    portugal: "Lizbon", "united kingdom": "Londra", usa: "Washington", china: "Pekin", japan: "Tokyo", "south korea": "Seul",
    india: "Yeni Delhi", indonesia: "Cakarta", malaysia: "Kuala Lumpur", egypt: "Kahire", "saudi arabia": "Riyad", uae: "Abu Dabi",
    qatar: "Doha", thailand: "Bangkok", vietnam: "Hanoi", brazil: "Brasília", argentina: "Buenos Aires", australia: "Kanberra",
    canada: "Ottawa", mexico: "Meksiko", greece: "Atina", netherlands: "Amsterdam",
  },
  ar: {
    uzbekistan: "طشقند", russia: "موسكو", turkey: "أنقرة", kazakhstan: "أستانا", kyrgyzstan: "بشكيك",
    tajikistan: "دوشنبه", ukraine: "كييف", azerbaijan: "باكو", germany: "برلين", france: "باريس", italy: "روما", spain: "مدريد",
    portugal: "لشبونة", "united kingdom": "لندن", usa: "واشنطن", china: "بكين", japan: "طوكيو", "south korea": "سيول",
    india: "نيودلهي", indonesia: "جاكرتا", malaysia: "كوالالمبور", egypt: "القاهرة", "saudi arabia": "الرياض", uae: "أبوظبي",
    qatar: "الدوحة", thailand: "بانكوك", vietnam: "هانوي", brazil: "برازيليا", argentina: "بوينس آيرس", australia: "كانبيرا",
    canada: "أوتاوا", mexico: "مكسيكو", greece: "أثينا", netherlands: "أمستردام",
  },
  id: {
    uzbekistan: "Tashkent", russia: "Moskow", turkey: "Ankara", kazakhstan: "Astana", kyrgyzstan: "Bishkek",
    tajikistan: "Dushanbe", ukraine: "Kiev", azerbaijan: "Baku", germany: "Berlin", france: "Paris", italy: "Roma", spain: "Madrid",
    portugal: "Lisbon", "united kingdom": "London", usa: "Washington, D.C.", china: "Beijing", japan: "Tokyo", "south korea": "Seoul",
    india: "New Delhi", indonesia: "Jakarta", malaysia: "Kuala Lumpur", egypt: "Kairo", "saudi arabia": "Riyadh", uae: "Abu Dhabi",
    qatar: "Doha", thailand: "Bangkok", vietnam: "Hanoi", brazil: "Brasília", argentina: "Buenos Aires", australia: "Canberra",
    canada: "Ottawa", mexico: "Mexico City", greece: "Athena", netherlands: "Amsterdam",
  },
  ms: {
    uzbekistan: "Tashkent", russia: "Moscow", turkey: "Ankara", kazakhstan: "Astana", kyrgyzstan: "Bishkek",
    tajikistan: "Dushanbe", ukraine: "Kiev", azerbaijan: "Baku", germany: "Berlin", france: "Paris", italy: "Rome", spain: "Madrid",
    portugal: "Lisbon", "united kingdom": "London", usa: "Washington, D.C.", china: "Beijing", japan: "Tokyo", "south korea": "Seoul",
    india: "New Delhi", indonesia: "Jakarta", malaysia: "Kuala Lumpur", egypt: "Cairo", "saudi arabia": "Riyadh", uae: "Abu Dhabi",
    qatar: "Doha", thailand: "Bangkok", vietnam: "Hanoi", brazil: "Brasília", argentina: "Buenos Aires", australia: "Canberra",
    canada: "Ottawa", mexico: "Mexico City", greece: "Athens", netherlands: "Amsterdam",
  },
  en: {
    uzbekistan: "Tashkent", russia: "Moscow", turkey: "Ankara", kazakhstan: "Astana", kyrgyzstan: "Bishkek",
    tajikistan: "Dushanbe", ukraine: "Kyiv", azerbaijan: "Baku", germany: "Berlin", france: "Paris", italy: "Rome", spain: "Madrid",
    portugal: "Lisbon", "united kingdom": "London", usa: "Washington, D.C.", china: "Beijing", japan: "Tokyo", "south korea": "Seoul",
    india: "New Delhi", indonesia: "Jakarta", malaysia: "Kuala Lumpur", egypt: "Cairo", "saudi arabia": "Riyadh", uae: "Abu Dhabi",
    qatar: "Doha", thailand: "Bangkok", vietnam: "Hanoi", brazil: "Brasília", argentina: "Buenos Aires", australia: "Canberra",
    canada: "Ottawa", mexico: "Mexico City", greece: "Athens", netherlands: "Amsterdam",
  },
};

/** Translate a country into the active language. Falls back to the original data. */
export function translateCountry(country: Country, language: Language): Country {
  if (language === "en") return country;
  const names = COUNTRY_NAMES[language];
  const capitals = CAPITALS[language];
  const localizedName = names?.[country.id];
  const localizedCapital = capitals?.[country.id];
  if (!localizedName && !localizedCapital) return country;
  return {
    ...country,
    name: localizedName ?? country.name,
    capital: localizedCapital ?? country.capital,
  };
}

/** Translate a country name only. */
export function translateCountryName(countryId: string, language: Language): string | undefined {
  return COUNTRY_NAMES[language]?.[countryId];
}

/** Translate a capital name only. */
export function translateCapitalName(countryId: string, language: Language): string | undefined {
  return CAPITALS[language]?.[countryId];
}
