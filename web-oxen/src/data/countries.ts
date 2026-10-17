export interface City {
  id: string;
  name: string;
  blurb: string;
  attractions: string[];
  hotels: { name: string; tier: string }[];
  restaurants: { name: string; cuisine: string }[];
  transport: string;
}

export interface Country {
  id: string;
  name: string;
  flag: string;
  isoCode?: string;
  continent: string;
  region: string;
  capital: string;
  currency: string;
  language: string;
  population: number;
  area?: number;
  timezone: string;
  lat: number;
  lng: number;
  safety: number;
  bestSeason: string;
  visa: string;
  weather: string;
  blurb: string;
  tagline: string;
  cities: City[];
  border?: [number, number][];
}

// ── Helper: minimal city entry ───────────────────────────
function c(name: string, blurb: string): City {
  return { id: name.toLowerCase().replace(/\s+/g, "-"), name, blurb, attractions: [], hotels: [], restaurants: [], transport: "" };
}

/* ==================================================================
   193 UN MEMBER STATES  +  OBSERVER / PARTIALLY-RECOGNISED
   ================================================================== */

export const COUNTRIES: Country[] = [

  // ═══════════════════════════════════════════════════════════════
  //  ASIA  (48 members)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "afghanistan", name: "Afghanistan", flag: "🇦🇫", continent: "Asia", region: "South Asia",
    capital: "Kabul", currency: "Afghani (AFN)", language: "Pashto, Dari",
    population: 42_200_000, timezone: "UTC+4:30 (AFT)",
    lat: 34.56, lng: 69.21, safety: 28,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa required for most passports",
    weather: "Arid continental, cold winters, hot summers",
    tagline: "Crossroads of Central Asia",
    blurb: "A land of rugged mountains and ancient Silk Road cities. Kabul, Bamyan's giant Buddhas, and the breathtaking Hindu Kush peaks tell stories millennia old.",
    cities: [c("Kabul", "Capital city beneath the Hindu Kush."), c("Herat", "Timurid jewel of the west.")],
  },

  {
    id: "armenia", name: "Armenia", flag: "🇦🇲", continent: "Asia", region: "Western Asia",
    capital: "Yerevan", currency: "Armenian Dram (AMD)", language: "Armenian",
    population: 2_780_000, timezone: "UTC+4 (AMT)",
    lat: 40.18, lng: 44.52, safety: 83,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "Visa-free / e-Visa for many passports",
    weather: "Continental, hot summers, cold winters",
    tagline: "Land of ancient monasteries",
    blurb: "The first nation to adopt Christianity. Stone churches perched on canyon edges, Lake Sevan's turquoise waters, and Yerevan's café culture.",
    cities: [c("Yerevan", "Pink city of culture and cafés.")],
  },

  {
    id: "azerbaijan", name: "Azerbaijan", flag: "🇦🇿", continent: "Asia", region: "Western Asia",
    capital: "Baku", currency: "Azerbaijani Manat (AZN)", language: "Azerbaijani",
    population: 10_200_000, timezone: "UTC+4 (AZT)",
    lat: 40.41, lng: 49.87, safety: 74,
    bestSeason: "Spring (Apr–Jun) & Autumn (Sep–Oct)", visa: "e-Visa available",
    weather: "Temperate, Caspian coastal climate",
    tagline: "The Land of Fire",
    blurb: "Mud volcanoes, eternal flames on hillsides, and Baku's futuristic skyline. Azerbaijan blends Zoroastrian heritage with oil wealth and Caucasus charm.",
    cities: [c("Baku", "Flame towers on the Caspian Sea.")],
  },

  {
    id: "bahrain", name: "Bahrain", flag: "🇧🇭", continent: "Asia", region: "Middle East",
    capital: "Manama", currency: "Bahraini Dinar (BHD)", language: "Arabic",
    population: 1_500_000, timezone: "UTC+3 (AST)",
    lat: 26.22, lng: 50.59, safety: 86,
    bestSeason: "Winter (Nov–Mar)", visa: "e-Visa available",
    weather: "Hot arid, mild winters",
    tagline: "Pearl of the Gulf",
    blurb: "Ancient Dilmun burial mounds, a Formula 1 circuit, and Manama's buzzing souq. Bahrain is where Gulf tradition meets cosmopolitan energy.",
    cities: [c("Manama", "Island capital of pearls and skyscrapers.")],
  },

  {
    id: "bangladesh", name: "Bangladesh", flag: "🇧🇩", continent: "Asia", region: "South Asia",
    capital: "Dhaka", currency: "Bangladeshi Taka (BDT)", language: "Bengali",
    population: 173_000_000, timezone: "UTC+6 (BST)",
    lat: 23.69, lng: 90.36, safety: 65,
    bestSeason: "Winter (Nov–Feb)", visa: "Visa on arrival for many passports",
    weather: "Tropical monsoon, hot and humid",
    tagline: "Riverine soul of Bengal",
    blurb: "The world's largest river delta, Sundarbans' mangrove forests with Bengal tigers, and Dhaka's ceaseless energy. A land shaped by water.",
    cities: [c("Dhaka", "The rickshaw capital of the world.")],
  },

  {
    id: "bhutan", name: "Bhutan", flag: "🇧🇹", continent: "Asia", region: "South Asia",
    capital: "Thimphu", currency: "Bhutanese Ngultrum (BTN)", language: "Dzongkha",
    population: 790_000, timezone: "UTC+6 (BTT)",
    lat: 27.51, lng: 89.64, safety: 94,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa required — must book through tour operator",
    weather: "High-altitude Himalayan, varied by elevation",
    tagline: "The last Shangri-La",
    blurb: "A carbon-negative kingdom measuring Gross National Happiness. Tiger's Nest monastery clings to a cliff, and the Himalayas dominate every horizon.",
    cities: [c("Thimphu", "Capital without a single traffic light."), c("Paro", "Gateway to Tiger's Nest monastery.")],
  },

  {
    id: "brunei", name: "Brunei", flag: "🇧🇳", continent: "Asia", region: "Southeast Asia",
    capital: "Bandar Seri Begawan", currency: "Brunei Dollar (BND)", language: "Malay",
    population: 450_000, timezone: "UTC+8 (BNT)",
    lat: 4.94, lng: 114.95, safety: 92,
    bestSeason: "Year-round, Feb–Apr driest", visa: "Visa-free for many passports up to 90 days",
    weather: "Tropical rainforest, hot and humid",
    tagline: "Abode of peace",
    blurb: "Golden-domed mosques, pristine rainforests, and the world's largest floating village. Tiny Brunei packs royal opulence and jungle tranquility.",
    cities: [c("Bandar Seri Begawan", "City of golden domes and water villages.")],
  },

  {
    id: "cambodia", name: "Cambodia", flag: "🇰🇭", continent: "Asia", region: "Southeast Asia",
    capital: "Phnom Penh", currency: "Cambodian Riel (KHR)", language: "Khmer",
    population: 17_100_000, timezone: "UTC+7 (ICT)",
    lat: 11.54, lng: 104.89, safety: 71,
    bestSeason: "Dry season (Nov–Apr)", visa: "e-Visa / visa on arrival",
    weather: "Tropical, monsoon May–Oct",
    tagline: "Land of the Khmer Empire",
    blurb: "Angkor Wat at sunrise, floating villages on Tonlé Sap, and Phnom Penh's riverside charm. Cambodia is ancient wonder and resilient spirit.",
    cities: [c("Phnom Penh", "The Pearl of Asia on the Mekong."), c("Siem Reap", "Gateway to Angkor's temples.")],
  },

  // China — existing, kept as-is
  {
    id: "china", name: "China", flag: "🇨🇳", continent: "Asia", region: "East Asia",
    capital: "Beijing", currency: "Chinese Yuan (¥)", language: "Mandarin Chinese",
    population: 1_425_000_000, timezone: "UTC+8 (CST)",
    lat: 35.86, lng: 104.2, safety: 80,
    bestSeason: "Spring (Apr–May) & Autumn (Sep–Oct)", visa: "Visa required for most passports",
    weather: "Varies widely — temperate north to subtropical south",
    tagline: "Ancient civilization, modern marvel",
    blurb: "Walk the Great Wall, explore the Forbidden City, and taste authentic dim sum. China's scale and history are unmatched anywhere on Earth.",
    cities: [
      { id: "beijing", name: "Beijing", blurb: "Imperial capital and modern megacity.", attractions: ["Great Wall", "Forbidden City", "Temple of Heaven"], hotels: [{ name: "Aman Summer Palace", tier: "Luxury" }, { name: "Peking Yard Hostel", tier: "Budget" }], restaurants: [{ name: "Da Dong", cuisine: "Peking Duck" }], transport: "Extensive metro, high-speed rail." },
      c("Shanghai", "China's futuristic financial hub."),
    ],
  },

  {
    id: "cyprus", name: "Cyprus", flag: "🇨🇾", continent: "Asia", region: "Western Asia",
    capital: "Nicosia", currency: "Euro (€)", language: "Greek, Turkish",
    population: 1_260_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 35.19, lng: 33.38, safety: 88,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Schengen in practice for many passports",
    weather: "Mediterranean, hot dry summers",
    tagline: "Island of Aphrodite",
    blurb: "Roman mosaics, Byzantine churches, and golden beaches. Cyprus sits at the crossroads of Europe, Asia, and Africa with sun year-round.",
    cities: [c("Nicosia", "Europe's last divided capital."), c("Paphos", "Birthplace of Aphrodite.")],
  },

  {
    id: "georgia", name: "Georgia", flag: "🇬🇪", continent: "Asia", region: "Western Asia",
    capital: "Tbilisi", currency: "Georgian Lari (GEL)", language: "Georgian",
    population: 3_700_000, timezone: "UTC+4 (GET)",
    lat: 41.72, lng: 44.78, safety: 84,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "Visa-free for many passports up to 1 year",
    weather: "Temperate, warm summers, moderate winters",
    tagline: "The cradle of wine",
    blurb: "8,000-year-old winemaking traditions, Caucasus peaks, and Tbilisi's cobbled old town with sulfur baths. Georgia's hospitality is legendary.",
    cities: [c("Tbilisi", "Balconied city of sulphur baths and wine."), c("Batumi", "Black Sea resort with futuristic architecture.")],
  },

  // India — existing, kept as-is
  {
    id: "india", name: "India", flag: "🇮🇳", continent: "Asia", region: "South Asia",
    capital: "New Delhi", currency: "Indian Rupee (₹)", language: "Hindi, English",
    population: 1_428_000_000, timezone: "UTC+5:30 (IST)",
    lat: 20.59, lng: 78.96, safety: 62,
    bestSeason: "Winter (Oct–Mar)", visa: "e-Visa available for most passports",
    weather: "Tropical to temperate, monsoons Jun–Sep",
    tagline: "A billion shades of incredible",
    blurb: "From the Taj Mahal to the backwaters of Kerala, India is a sensory feast. Ancient temples, vibrant festivals, and cuisine that defies description.",
    cities: [
      { id: "delhi", name: "New Delhi", blurb: "Capital of contrasts.", attractions: ["Red Fort", "Qutub Minar", "India Gate"], hotels: [{ name: "The Oberoi", tier: "Luxury" }, { name: "Zostel", tier: "Budget" }], restaurants: [{ name: "Bukhara", cuisine: "North Indian" }], transport: "Metro, auto-rickshaws." },
      c("Agra", "Home to the Taj Mahal."),
    ],
  },

  // Indonesia — existing, kept as-is
  {
    id: "indonesia", name: "Indonesia", flag: "🇮🇩", continent: "Asia", region: "Southeast Asia",
    capital: "Jakarta", currency: "Indonesian Rupiah (Rp)", language: "Indonesian",
    population: 277_500_000, timezone: "UTC+7 to +9 (WIB/WITA/WIT)",
    lat: -0.79, lng: 113.92, safety: 73,
    bestSeason: "Dry season (Apr–Oct)", visa: "Visa-free/visa on arrival for many",
    weather: "Tropical, hot and humid year-round",
    tagline: "17,000 islands of paradise",
    blurb: "Bali's rice terraces, Komodo dragons, and the world's most diverse coral reefs. Indonesia is an archipelago adventure of epic proportions.",
    cities: [
      { id: "bali", name: "Bali", blurb: "The Island of Gods.", attractions: ["Ubud Rice Terraces", "Uluwatu Temple", "Seminyak Beach"], hotels: [{ name: "Four Seasons Bali", tier: "Luxury" }, { name: "Puri Garden", tier: "Budget" }], restaurants: [{ name: "Locavore", cuisine: "Modern Indonesian" }], transport: "Scooter rental, taxis." },
    ],
  },

  {
    id: "iran", name: "Iran", flag: "🇮🇷", continent: "Asia", region: "Western Asia",
    capital: "Tehran", currency: "Iranian Rial (IRR)", language: "Persian",
    population: 89_800_000, timezone: "UTC+3:30 (IRST)",
    lat: 35.69, lng: 51.42, safety: 58,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa on arrival / e-Visa",
    weather: "Arid to subtropical, cold winters in mountains",
    tagline: "Persia's timeless legacy",
    blurb: "Isfahan's turquoise-tiled mosques, Persepolis ruins, and the poetry of Hafez. Iran has one of the world's oldest continuous civilizations.",
    cities: [c("Tehran", "Modern capital at the foot of the Alborz."), c("Isfahan", "Half the world — with Naqsh-e Jahan Square.")],
  },

  {
    id: "iraq", name: "Iraq", flag: "🇮🇶", continent: "Asia", region: "Western Asia",
    capital: "Baghdad", currency: "Iraqi Dinar (IQD)", language: "Arabic, Kurdish",
    population: 45_500_000, timezone: "UTC+3 (AST)",
    lat: 33.32, lng: 44.42, safety: 30,
    bestSeason: "Spring (Mar–Apr) & Autumn (Oct–Nov)", visa: "Visa required for most passports",
    weather: "Hot desert, mild winters",
    tagline: "Cradle of civilization",
    blurb: "Mesopotamia — where writing began. The Ziggurat of Ur, Babylon's reconstructed gates, and Baghdad's storied past echo through the ages.",
    cities: [c("Baghdad", "Fabled city of the Abbasid Caliphate.")],
  },

  {
    id: "israel", name: "Israel", flag: "🇮🇱", continent: "Asia", region: "Western Asia",
    capital: "Jerusalem", currency: "Israeli New Shekel (₪)", language: "Hebrew, Arabic",
    population: 9_800_000, timezone: "UTC+2/+3 (IST/IDT)",
    lat: 31.77, lng: 35.21, safety: 76,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa-free for many passports up to 90 days",
    weather: "Mediterranean coast, arid south",
    tagline: "Land of creation",
    blurb: "Jerusalem's ancient stones, Tel Aviv's 24/7 energy, and the Dead Sea's surreal buoyancy. Israel is layered with three millennia of history.",
    cities: [c("Jerusalem", "Holy city of three faiths."), c("Tel Aviv", "Mediterranean hub of innovation and nightlife.")],
  },

  // Japan — existing, kept as-is
  {
    id: "japan", name: "Japan", flag: "🇯🇵", continent: "Asia", region: "East Asia",
    capital: "Tokyo", currency: "Japanese Yen (¥)", language: "Japanese",
    population: 125_700_000, timezone: "UTC+9 (JST)",
    lat: 36.2, lng: 138.25, safety: 92,
    bestSeason: "Spring (Mar–May) & Autumn (Oct–Nov)",
    visa: "Visa-free up to 90 days for most passports",
    weather: "Temperate, four distinct seasons",
    tagline: "Where neon meets tradition",
    blurb: "A country of beautiful contrasts — ancient shrines beside neon skylines, bullet trains slicing past sacred mountains. Japan rewards the curious with impeccable food, deep ritual, and effortless travel.",
    cities: [
      { id: "tokyo", name: "Tokyo", blurb: "An electric megacity of micro-neighborhoods.", attractions: ["Senso-ji Temple", "Shibuya Crossing", "teamLab Planets", "Meiji Shrine"], hotels: [{ name: "Aman Tokyo", tier: "Luxury" }, { name: "Hotel Gracery Shinjuku", tier: "Mid-range" }, { name: "UNPLAN Kagurazaka", tier: "Budget" }], restaurants: [{ name: "Sukiyabashi Jiro", cuisine: "Sushi" }, { name: "Afuri", cuisine: "Ramen" }], transport: "World-class metro & JR rail." },
      { id: "kyoto", name: "Kyoto", blurb: "Cultural heart of Japan.", attractions: ["Fushimi Inari Shrine", "Arashiyama Bamboo Grove", "Kinkaku-ji"], hotels: [{ name: "The Ritz-Carlton Kyoto", tier: "Luxury" }, { name: "Hotel Kanra", tier: "Mid-range" }], restaurants: [{ name: "Kikunoi", cuisine: "Kaiseki" }], transport: "Buses and bicycles." },
    ],
  },

  {
    id: "jordan", name: "Jordan", flag: "🇯🇴", continent: "Asia", region: "Western Asia",
    capital: "Amman", currency: "Jordanian Dinar (JOD)", language: "Arabic",
    population: 11_300_000, timezone: "UTC+3 (EEST)",
    lat: 31.24, lng: 36.77, safety: 82,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa on arrival / Jordan Pass",
    weather: "Mediterranean in west, desert in east",
    tagline: "Timeless desert kingdom",
    blurb: "Petra's rose-red city carved from cliffs, Wadi Rum's Martian landscapes, and the healing waters of the Dead Sea. Jordan is the Middle East's safest gem.",
    cities: [c("Amman", "Ancient Philadelphia — modern Arab capital."), c("Petra", "The lost city carved in rose-red stone.")],
  },

  {
    id: "kazakhstan", name: "Kazakhstan", flag: "🇰🇿", continent: "Asia", region: "Central Asia",
    capital: "Astana", currency: "Kazakhstani Tenge (KZT)", language: "Kazakh, Russian",
    population: 20_300_000, timezone: "UTC+5/+6 (ALMT/ORAT)",
    lat: 48.02, lng: 66.92, safety: 80,
    bestSeason: "Spring (Apr–May) & Autumn (Sep–Oct)", visa: "Visa-free for many passports up to 30 days",
    weather: "Continental, cold winters, hot summers",
    tagline: "Endless steppe, boundless future",
    blurb: "The world's largest landlocked country. From the futuristic skyline of Astana to the silent vastness of the Kazakh steppe and the snow-capped Tian Shan — Kazakhstan is Central Asia's rising giant.",
    cities: [
      c("Astana", "Futuristic capital rising from the steppe."),
      c("Almaty", "Leafy cultural hub beneath the Tian Shan."),
      c("Shymkent", "Ancient Silk Road city in the south."),
    ],
  },

  {
    id: "kuwait", name: "Kuwait", flag: "🇰🇼", continent: "Asia", region: "Middle East",
    capital: "Kuwait City", currency: "Kuwaiti Dinar (KWD)", language: "Arabic",
    population: 4_300_000, timezone: "UTC+3 (AST)",
    lat: 29.37, lng: 47.98, safety: 80,
    bestSeason: "Winter (Nov–Mar)", visa: "e-Visa available",
    weather: "Hot arid, very hot summers",
    tagline: "Small state, big heart",
    blurb: "The world's strongest currency, dramatic souks, and a glittering skyline along the Gulf. Kuwait blends Bedouin heritage with oil-era ambition.",
    cities: [c("Kuwait City", "Gulf metropolis of towers and tradition.")],
  },

  {
    id: "kyrgyzstan", name: "Kyrgyzstan", flag: "🇰🇬", continent: "Asia", region: "Central Asia",
    capital: "Bishkek", currency: "Kyrgyzstani Som (KGS)", language: "Kyrgyz, Russian",
    population: 7_100_000, timezone: "UTC+6 (KGT)",
    lat: 41.2, lng: 74.77, safety: 78,
    bestSeason: "Summer (Jun–Sep) for mountains", visa: "Visa-free for many passports up to 60 days",
    weather: "Continental, alpine climate in mountains",
    tagline: "Switzerland of Central Asia",
    blurb: "Over 90% mountains — pristine alpine lakes, nomad yurt camps, and Issyk-Kul's endless blue waters. Kyrgyzstan is Central Asia's wild, beautiful secret.",
    cities: [
      c("Bishkek", "Green Soviet-era capital with mountain views."),
      c("Karakol", "Gateway to Tian Shan trekking and Issyk-Kul."),
      c("Osh", "Silk Road city with Sulayman Mountain."),
    ],
  },

  {
    id: "laos", name: "Laos", flag: "🇱🇦", continent: "Asia", region: "Southeast Asia",
    capital: "Vientiane", currency: "Lao Kip (LAK)", language: "Lao",
    population: 7_700_000, timezone: "UTC+7 (ICT)",
    lat: 17.97, lng: 102.63, safety: 78,
    bestSeason: "Dry season (Nov–Mar)", visa: "Visa on arrival / e-Visa",
    weather: "Tropical monsoon, hot year-round",
    tagline: "The land of a million elephants",
    blurb: "Luang Prabang's golden temples, the mighty Mekong, and jungle waterfalls. Laos moves at its own gentle pace — Southeast Asia's quiet soul.",
    cities: [c("Vientiane", "Sleepy capital on the Mekong."), c("Luang Prabang", "UNESCO temple town in the mountains.")],
  },

  {
    id: "lebanon", name: "Lebanon", flag: "🇱🇧", continent: "Asia", region: "Western Asia",
    capital: "Beirut", currency: "Lebanese Pound (LBP)", language: "Arabic, French",
    population: 5_400_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 33.89, lng: 35.5, safety: 48,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa-free for many passports",
    weather: "Mediterranean, snowy mountains in winter",
    tagline: "The Paris of the Middle East",
    blurb: "Ski in the morning, swim in the Mediterranean by afternoon. Beirut's resilience, Byblos' 7,000-year port, and legendary cuisine.",
    cities: [c("Beirut", "Phoenicia's phoenix — a city that always rises.")],
  },

  {
    id: "malaysia", name: "Malaysia", flag: "🇲🇾", continent: "Asia", region: "Southeast Asia",
    capital: "Kuala Lumpur", currency: "Malaysian Ringgit (RM)", language: "Malay",
    population: 34_300_000, timezone: "UTC+8 (MYT)",
    lat: 4.21, lng: 101.98, safety: 82,
    bestSeason: "Year-round, Mar–Oct driest", visa: "Visa-free for many passports up to 90 days",
    weather: "Tropical, humid year-round",
    tagline: "Truly Asia",
    blurb: "Petronas Towers pierce the clouds, Borneo's rainforests house orangutans, and Penang's street food is legendary. Malaysia is multicultural Asia in one country.",
    cities: [c("Kuala Lumpur", "Twin towers and street food capital."), c("Penang", "Island of temples and hawker delights.")],
  },

  {
    id: "maldives", name: "Maldives", flag: "🇲🇻", continent: "Asia", region: "South Asia",
    capital: "Malé", currency: "Maldivian Rufiyaa (MVR)", language: "Dhivehi",
    population: 520_000, timezone: "UTC+5 (MVT)",
    lat: 3.2, lng: 73.22, safety: 95,
    bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for most passports up to 30 days",
    weather: "Tropical, warm year-round",
    tagline: "Paradise on water",
    blurb: "Overwater villas above turquoise lagoons, powder-white sand, and coral reefs teeming with life. The Maldives is the ultimate island escape.",
    cities: [c("Malé", "One of the world's most densely populated capitals.")],
  },

  {
    id: "mongolia", name: "Mongolia", flag: "🇲🇳", continent: "Asia", region: "East Asia",
    capital: "Ulaanbaatar", currency: "Mongolian Tögrög (MNT)", language: "Mongolian",
    population: 3_500_000, timezone: "UTC+7/+8 (ULAT)",
    lat: 47.92, lng: 106.92, safety: 82,
    bestSeason: "Summer (Jun–Aug)", visa: "Visa-free for many passports up to 30 days",
    weather: "Continental, extreme winters",
    tagline: "Land of the eternal blue sky",
    blurb: "Vast steppes where nomads still live in gers, the Gobi Desert's singing dunes, and the legacy of Genghis Khan. Mongolia is raw, wild, and unforgettable.",
    cities: [c("Ulaanbaatar", "The coldest capital city on Earth.")],
  },

  {
    id: "myanmar", name: "Myanmar", flag: "🇲🇲", continent: "Asia", region: "Southeast Asia",
    capital: "Naypyidaw", currency: "Myanmar Kyat (MMK)", language: "Burmese",
    population: 54_200_000, timezone: "UTC+6:30 (MMT)",
    lat: 19.76, lng: 96.08, safety: 42,
    bestSeason: "Dry season (Nov–Feb)", visa: "e-Visa available",
    weather: "Tropical monsoon",
    tagline: "The Golden Land",
    blurb: "Bagan's plain of 2,000 ancient temples, Shwedagon Pagoda's golden spire, and Inle Lake's floating gardens. Myanmar is breathtaking and complex.",
    cities: [c("Yangon", "Colonial grandeur and golden pagodas."), c("Bagan", "Plain of a thousand ancient temples.")],
  },

  {
    id: "nepal", name: "Nepal", flag: "🇳🇵", continent: "Asia", region: "South Asia",
    capital: "Kathmandu", currency: "Nepalese Rupee (NPR)", language: "Nepali",
    population: 30_900_000, timezone: "UTC+5:45 (NPT)",
    lat: 27.72, lng: 85.31, safety: 72,
    bestSeason: "Autumn (Oct–Nov) & Spring (Mar–Apr)", visa: "Visa on arrival",
    weather: "Varied by altitude — subtropical to alpine",
    tagline: "Roof of the world",
    blurb: "Everest, Annapurna, and the birthplace of Buddha. Nepal's Himalayan peaks, ancient stupas, and warm people make it a trekker's and seeker's paradise.",
    cities: [c("Kathmandu", "Valley of ancient temples and mountain views."), c("Pokhara", "Lakeside gateway to the Annapurnas.")],
  },

  {
    id: "north-korea", name: "North Korea", flag: "🇰🇵", continent: "Asia", region: "East Asia",
    capital: "Pyongyang", currency: "North Korean Won (KPW)", language: "Korean",
    population: 26_200_000, timezone: "UTC+9 (PYT)",
    lat: 39.04, lng: 125.76, safety: 15,
    bestSeason: "Spring (Apr–May) & Autumn (Sep–Oct)", visa: "Highly restricted — guided tours only",
    weather: "Continental, cold winters",
    tagline: "The Hermit Kingdom",
    blurb: "One of the world's most isolated nations. Mass games, monumental architecture, and a society frozen in time. Access is heavily restricted.",
    cities: [c("Pyongyang", "Monumental capital of the DPRK.")],
  },

  {
    id: "oman", name: "Oman", flag: "🇴🇲", continent: "Asia", region: "Middle East",
    capital: "Muscat", currency: "Omani Rial (OMR)", language: "Arabic",
    population: 4_700_000, timezone: "UTC+4 (GST)",
    lat: 23.59, lng: 58.41, safety: 91,
    bestSeason: "Winter (Oct–Mar)", visa: "e-Visa available",
    weather: "Hot desert, milder coastal regions",
    tagline: "Arabia's best-kept secret",
    blurb: "Jebel Akhdar's green mountains, frankincense-scented souks, and Muscat's white-washed elegance. Oman is the Middle East with its soul intact.",
    cities: [c("Muscat", "Coastal capital of white buildings and mountains.")],
  },

  {
    id: "pakistan", name: "Pakistan", flag: "🇵🇰", continent: "Asia", region: "South Asia",
    capital: "Islamabad", currency: "Pakistani Rupee (PKR)", language: "Urdu, English",
    population: 241_500_000, timezone: "UTC+5 (PKT)",
    lat: 33.68, lng: 73.06, safety: 52,
    bestSeason: "Spring (Mar–Apr) & Autumn (Oct–Nov)", visa: "e-Visa available",
    weather: "Varied — arid south, alpine north",
    tagline: "Where mountains touch the sky",
    blurb: "K2, the world's second-highest peak, the Karakoram Highway, and Lahore's Mughal magnificence. Pakistan's north is some of Earth's most dramatic scenery.",
    cities: [c("Islamabad", "Planned garden capital."), c("Lahore", "Mughal heart of Punjab."), c("Karachi", "Pakistan's cosmopolitan megacity.")],
  },

  {
    id: "palestine", name: "Palestine", flag: "🇵🇸", continent: "Asia", region: "Western Asia",
    capital: "Ramallah (admin.)", currency: "Israeli Shekel (₪)", language: "Arabic",
    population: 5_500_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 31.95, lng: 35.23, safety: 50,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Access via Israel — check restrictions",
    weather: "Mediterranean, mild winters, warm summers",
    tagline: "Land of olive trees and ancient stones",
    blurb: "Bethlehem's Nativity Church, Hebron's old city, and Ramallah's vibrant cultural scene. A land layered with profound history.",
    cities: [c("Bethlehem", "City of the Nativity.")],
  },

  // Philippines — existing, kept as-is
  {
    id: "philippines", name: "Philippines", flag: "🇵🇭", continent: "Asia", region: "Southeast Asia",
    capital: "Manila", currency: "Philippine Peso (₱)", language: "Filipino, English",
    population: 117_300_000, timezone: "UTC+8 (PHT)",
    lat: 12.88, lng: 121.77, safety: 67,
    bestSeason: "Nov–May (dry season)", visa: "Visa-free for many passports up to 30 days",
    weather: "Tropical, typhoon season Jun–Oct",
    tagline: "7,641 islands of wonder",
    blurb: "Palawan's limestone cliffs, chocolate hills of Bohol, and the world's friendliest people. The Philippines is Southeast Asia's ultimate island-hopping destination.",
    cities: [
      { id: "palawan", name: "El Nido", blurb: "Island paradise.", attractions: ["Big Lagoon", "Nacpan Beach", "Secret Lagoon"], hotels: [{ name: "El Nido Resorts", tier: "Luxury" }, { name: "Outpost Hostel", tier: "Budget" }], restaurants: [{ name: "Trattoria Altrove", cuisine: "Italian" }], transport: "Tricycles, island-hopping boats." },
    ],
  },

  {
    id: "qatar", name: "Qatar", flag: "🇶🇦", continent: "Asia", region: "Middle East",
    capital: "Doha", currency: "Qatari Riyal (QAR)", language: "Arabic",
    population: 2_700_000, timezone: "UTC+3 (AST)",
    lat: 25.29, lng: 51.53, safety: 92,
    bestSeason: "Winter (Nov–Mar)", visa: "Visa-free for many passports up to 90 days",
    weather: "Hot desert, mild winters",
    tagline: "Where ambition meets the Gulf",
    blurb: "Doha's striking skyline, the Museum of Islamic Art, and desert safaris amid rolling dunes. Qatar is small in size, vast in vision.",
    cities: [c("Doha", "Futuristic peninsula capital.")],
  },

  {
    id: "saudi-arabia", name: "Saudi Arabia", flag: "🇸🇦", continent: "Asia", region: "Middle East",
    capital: "Riyadh", currency: "Saudi Riyal (SAR)", language: "Arabic",
    population: 37_000_000, timezone: "UTC+3 (AST)",
    lat: 24.71, lng: 46.68, safety: 78,
    bestSeason: "Winter (Nov–Feb)", visa: "e-Visa / visa on arrival for many passports",
    weather: "Hot desert, mild winters",
    tagline: "Land of the two holy mosques",
    blurb: "AlUla's ancient Nabataean tombs, the Red Sea coast's untouched reefs, and the vast Empty Quarter. Saudi Arabia is opening its doors to the world.",
    cities: [c("Riyadh", "Modern capital rising from the desert."), c("Jeddah", "Red Sea gateway and historic port.")],
  },

  // Singapore — existing, kept as-is
  {
    id: "singapore", name: "Singapore", flag: "🇸🇬", continent: "Asia", region: "Southeast Asia",
    capital: "Singapore", currency: "Singapore Dollar (S$)", language: "English, Mandarin, Malay, Tamil",
    population: 5_900_000, timezone: "UTC+8 (SGT)",
    lat: 1.35, lng: 103.82, safety: 94,
    bestSeason: "Year-round, Feb–Apr driest", visa: "Visa-free for most passports",
    weather: "Tropical, hot and humid",
    tagline: "The little red dot that could",
    blurb: "A futuristic garden city where hawker stalls sit beside Michelin-starred restaurants. Gardens by the Bay, Marina Bay Sands, and incredible street food.",
    cities: [
      { id: "singapore-city", name: "Singapore", blurb: "A city-state of superlatives.", attractions: ["Gardens by the Bay", "Marina Bay Sands", "Sentosa"], hotels: [{ name: "Raffles Hotel", tier: "Luxury" }, { name: "The Pod", tier: "Budget" }], restaurants: [{ name: "Odette", cuisine: "Modern French" }], transport: "World-class MRT system." },
    ],
  },

  // South Korea — existing, kept as-is
  {
    id: "south-korea", name: "South Korea", flag: "🇰🇷", continent: "Asia", region: "East Asia",
    capital: "Seoul", currency: "South Korean Won (₩)", language: "Korean",
    population: 51_700_000, timezone: "UTC+9 (KST)",
    lat: 37.57, lng: 126.98, safety: 89,
    bestSeason: "Spring (Apr–Jun) & Autumn (Sep–Nov)", visa: "K-ETA required for many passports",
    weather: "Four distinct seasons, cold winters",
    tagline: "K-culture, ancient and modern",
    blurb: "From K-pop and cutting-edge tech to centuries-old palaces, South Korea blends tradition with hyper-modernity. Seoul hums 24/7 and the countryside is dotted with temples.",
    cities: [
      { id: "seoul", name: "Seoul", blurb: "A city that never sleeps.", attractions: ["Gyeongbokgung Palace", "Myeongdong", "N Seoul Tower"], hotels: [{ name: "Shilla Seoul", tier: "Luxury" }, { name: "Grid Inn", tier: "Budget" }], restaurants: [{ name: "Jungsik", cuisine: "Modern Korean" }], transport: "Excellent metro and buses." },
    ],
  },

  {
    id: "sri-lanka", name: "Sri Lanka", flag: "🇱🇰", continent: "Asia", region: "South Asia",
    capital: "Sri Jayawardenepura Kotte", currency: "Sri Lankan Rupee (LKR)", language: "Sinhala, Tamil",
    population: 22_000_000, timezone: "UTC+5:30 (SLST)",
    lat: 6.93, lng: 79.86, safety: 74,
    bestSeason: "Dec–Mar (west), May–Sep (east)", visa: "e-Visa available",
    weather: "Tropical monsoon",
    tagline: "The Pearl of the Indian Ocean",
    blurb: "Tea plantations rolling through misty hills, ancient rock fortresses, and golden beaches. Sri Lanka's compact size packs endless variety.",
    cities: [c("Colombo", "Coastal capital with colonial charm."), c("Kandy", "Sacred city of the Temple of the Tooth.")],
  },

  {
    id: "syria", name: "Syria", flag: "🇸🇾", continent: "Asia", region: "Western Asia",
    capital: "Damascus", currency: "Syrian Pound (SYP)", language: "Arabic",
    population: 23_200_000, timezone: "UTC+3 (EEST)",
    lat: 33.51, lng: 36.29, safety: 20,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa required — check travel advisories",
    weather: "Mediterranean coast, arid interior",
    tagline: "The oldest continuously inhabited capital",
    blurb: "Damascus has been lived in for over 4,000 years. Umayyad Mosque, Aleppo's citadel, and Palmyra's ruins speak of Syria's ancient grandeur.",
    cities: [c("Damascus", "The world's oldest capital city.")],
  },

  {
    id: "tajikistan", name: "Tajikistan", flag: "🇹🇯", continent: "Asia", region: "Central Asia",
    capital: "Dushanbe", currency: "Tajikistani Somoni (TJS)", language: "Tajik",
    population: 10_400_000, timezone: "UTC+5 (TJT)",
    lat: 38.56, lng: 68.79, safety: 68,
    bestSeason: "Summer (Jun–Sep) for mountain trekking", visa: "e-Visa available",
    weather: "Continental, extreme altitudes",
    tagline: "Roof of Central Asia",
    blurb: "Over 90% mountainous — the Pamir Highway is one of the world's greatest road trips. Turquoise alpine lakes, towering peaks, and legendary hospitality in the heart of the Silk Road.",
    cities: [
      c("Dushanbe", "Tree-lined capital with Soviet-era charm."),
      c("Khorog", "Gateway to the Pamir Mountains."),
      c("Khujand", "Ancient Silk Road city on the Syr Darya River."),
    ],
  },

  // Thailand — existing, kept as-is
  {
    id: "thailand", name: "Thailand", flag: "🇹🇭", continent: "Asia", region: "Southeast Asia",
    capital: "Bangkok", currency: "Thai Baht (฿)", language: "Thai",
    population: 71_800_000, timezone: "UTC+7 (ICT)",
    lat: 15.87, lng: 100.99, safety: 76,
    bestSeason: "Cool & dry (Nov–Feb)", visa: "Visa-free 30–60 days for many passports",
    weather: "Tropical, hot and humid",
    tagline: "Smiles, temples, and island bliss",
    blurb: "Golden temples, street food paradise, and turquoise islands — Thailand serves up adventure and serenity in equal measure with legendary hospitality.",
    cities: [
      { id: "bangkok", name: "Bangkok", blurb: "A dizzying, delicious capital.", attractions: ["Grand Palace", "Wat Arun", "Chatuchak Market"], hotels: [{ name: "Mandarin Oriental", tier: "Luxury" }, { name: "Lub d Silom", tier: "Budget" }], restaurants: [{ name: "Gaggan Anand", cuisine: "Progressive Indian" }], transport: "BTS Skytrain, MRT metro." },
    ],
  },

  {
    id: "timor-leste", name: "Timor-Leste", flag: "🇹🇱", continent: "Asia", region: "Southeast Asia",
    capital: "Dili", currency: "US Dollar ($)", language: "Tetum, Portuguese",
    population: 1_370_000, timezone: "UTC+9 (TLT)",
    lat: -8.56, lng: 125.57, safety: 68,
    bestSeason: "Dry season (May–Nov)", visa: "Visa on arrival",
    weather: "Tropical, wet and dry seasons",
    tagline: "Asia's youngest nation",
    blurb: "Untouched coral reefs, dramatic mountain scenery, and a resilient spirit. Timor-Leste is off the beaten path and all the better for it.",
    cities: [c("Dili", "Coastal capital with Portuguese influence.")],
  },

  // Turkey — existing, kept as-is
  {
    id: "turkey", name: "Turkey", flag: "🇹🇷", continent: "Asia / Europe", region: "Western Asia / Southeastern Europe",
    capital: "Ankara", currency: "Turkish Lira (₺)", language: "Turkish",
    population: 85_300_000, timezone: "UTC+3 (TRT)",
    lat: 38.96, lng: 35.24, safety: 68,
    bestSeason: "Spring (Apr–May) & Autumn (Sep–Oct)", visa: "e-Visa available for many passports",
    weather: "Mediterranean coast, continental interior",
    tagline: "Where East meets West",
    blurb: "Hagia Sophia, Cappadocia's fairy chimneys, and the turquoise coast. Turkey bridges continents with incredible food, bazaars, and ancient ruins.",
    cities: [
      { id: "istanbul", name: "Istanbul", blurb: "The city on two continents.", attractions: ["Hagia Sophia", "Blue Mosque", "Grand Bazaar"], hotels: [{ name: "Four Seasons Bosphorus", tier: "Luxury" }, { name: "Cheers Hostel", tier: "Budget" }], restaurants: [{ name: "Mikla", cuisine: "Modern Turkish" }], transport: "Trams, ferries, metro." },
    ],
  },

  {
    id: "turkmenistan", name: "Turkmenistan", flag: "🇹🇲", continent: "Asia", region: "Central Asia",
    capital: "Ashgabat", currency: "Turkmenistani Manat (TMT)", language: "Turkmen",
    population: 6_500_000, timezone: "UTC+5 (TMT)",
    lat: 37.96, lng: 58.38, safety: 60,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa required — guided tours often necessary",
    weather: "Arid desert, continental",
    tagline: "Marble city in the desert",
    blurb: "Ashgabat's white marble skyline, the flaming Darvaza gas crater (Door to Hell), and ancient Silk Road ruins at Merv. Turkmenistan is surreal and mysterious.",
    cities: [c("Ashgabat", "The marble city — world record holder for white marble buildings.")],
  },

  // UAE — existing, kept as-is
  {
    id: "uae", name: "United Arab Emirates", flag: "🇦🇪", continent: "Asia", region: "Middle East",
    capital: "Abu Dhabi", currency: "UAE Dirham (د.إ)", language: "Arabic",
    population: 10_200_000, timezone: "UTC+4 (GST)",
    lat: 23.42, lng: 53.85, safety: 92,
    bestSeason: "Winter (Nov–Mar)", visa: "Visa-free for many passports",
    weather: "Hot desert climate, mild winters",
    tagline: "Futuristic oasis in the desert",
    blurb: "Burj Khalifa piercing the sky, golden dunes, and world-class shopping. The UAE is a vision of what ambition and oil money can build in the sand.",
    cities: [
      { id: "dubai", name: "Dubai", blurb: "The city of superlatives.", attractions: ["Burj Khalifa", "Palm Jumeirah", "Dubai Mall"], hotels: [{ name: "Burj Al Arab", tier: "Luxury" }, { name: "Rove Downtown", tier: "Mid-range" }], restaurants: [{ name: "Nobu Dubai", cuisine: "Japanese" }], transport: "Metro, taxis, ride-hailing." },
    ],
  },

  {
    id: "uzbekistan", name: "Uzbekistan", flag: "🇺🇿", continent: "Asia", region: "Central Asia",
    capital: "Tashkent", currency: "Uzbekistani Som (UZS)", language: "Uzbek",
    population: 36_500_000, timezone: "UTC+5 (UZT)",
    lat: 41.38, lng: 64.59, safety: 82,
    bestSeason: "Spring (Apr–May) & Autumn (Sep–Oct)", visa: "Visa-free for many passports up to 30 days",
    weather: "Continental, hot summers, cold winters",
    tagline: "Heart of the Silk Road",
    blurb: "Samarkand's Registan, Bukhara's ancient domes, and Khiva's fortress walls. Uzbekistan is a living museum of turquoise-tiled mosques, silk bazaars, and the warmest hospitality in Central Asia.",
    cities: [
      c("Tashkent", "Modern capital blending Soviet and Islamic architecture."),
      c("Samarkand", "Jewel of the Silk Road — the Registan, Gur-e-Amir, and Shah-i-Zinda."),
      c("Bukhara", "Sacred city of domed bazaars and ancient madrasas."),
      c("Khiva", "Walled inner city frozen in time."),
    ],
  },

  // Vietnam — existing, kept as-is
  {
    id: "vietnam", name: "Vietnam", flag: "🇻🇳", continent: "Asia", region: "Southeast Asia",
    capital: "Hanoi", currency: "Vietnamese Dong (₫)", language: "Vietnamese",
    population: 100_300_000, timezone: "UTC+7 (ICT)",
    lat: 14.06, lng: 108.28, safety: 78,
    bestSeason: "Spring (Feb–Apr) & Autumn (Aug–Oct)", visa: "e-Visa available for many passports",
    weather: "Tropical monsoon, cooler in the north",
    tagline: "Pho, motorbikes, and limestone karsts",
    blurb: "Halong Bay's emerald waters, Hanoi's buzzing Old Quarter, and Ho Chi Minh City's energy. Vietnam is a land of stunning landscapes and incredible food.",
    cities: [
      { id: "hanoi", name: "Hanoi", blurb: "Timeless charm in the capital.", attractions: ["Halong Bay", "Old Quarter", "Hoan Kiem Lake"], hotels: [{ name: "Sofitel Metropole", tier: "Luxury" }, { name: "Hanoi Backpackers", tier: "Budget" }], restaurants: [{ name: "Bun Cha Huong Lien", cuisine: "Vietnamese" }], transport: "Walkable Old Quarter, taxis." },
    ],
  },

  {
    id: "yemen", name: "Yemen", flag: "🇾🇪", continent: "Asia", region: "Middle East",
    capital: "Sana'a", currency: "Yemeni Rial (YER)", language: "Arabic",
    population: 34_500_000, timezone: "UTC+3 (AST)",
    lat: 15.37, lng: 44.19, safety: 18,
    bestSeason: "Winter (Oct–Mar)", visa: "Visa required — check travel safety advisories",
    weather: "Desert, varied by elevation",
    tagline: "Arabia Felix",
    blurb: "Sana'a's ancient skyscrapers of mud brick, Socotra's alien dragon's blood trees, and frankincense routes. Yemen is the Arabia of legend.",
    cities: [c("Sana'a", "City of gingerbread skyscrapers.")],
  },

  // ═══════════════════════════════════════════════════════════════
  //  EUROPE  (44 members)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "albania", name: "Albania", flag: "🇦🇱", continent: "Europe", region: "Southeastern Europe",
    capital: "Tirana", currency: "Albanian Lek (ALL)", language: "Albanian",
    population: 2_800_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 41.33, lng: 19.82, safety: 82,
    bestSeason: "Summer (Jun–Sep) for beaches, Spring & Autumn for hiking", visa: "Visa-free for many passports up to 90 days",
    weather: "Mediterranean coast, continental interior",
    tagline: "Europe's hidden gem",
    blurb: "Riviera beaches without the crowds, Ottoman-era cities, and the Albanian Alps. Europe's last undiscovered corner.",
    cities: [c("Tirana", "Colorful capital of cafés and museums.")],
  },

  {
    id: "andorra", name: "Andorra", flag: "🇦🇩", continent: "Europe", region: "Western Europe",
    capital: "Andorra la Vella", currency: "Euro (€)", language: "Catalan",
    population: 80_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 42.51, lng: 1.52, safety: 96,
    bestSeason: "Winter for skiing, Summer for hiking", visa: "No visa required — accessed through France/Spain",
    weather: "Alpine, snowy winters, mild summers",
    tagline: "Microstate in the mountains",
    blurb: "Duty-free shopping, Pyrenees ski slopes, and Romanesque churches. The highest capital in Europe.",
    cities: [c("Andorra la Vella", "Europe's highest capital city.")],
  },

  // Austria — existing, kept as-is
  {
    id: "austria", name: "Austria", flag: "🇦🇹", continent: "Europe", region: "Central Europe",
    capital: "Vienna", currency: "Euro (€)", language: "German",
    population: 9_100_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 47.7, lng: 14.55, safety: 91,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "Schengen — 90 days visa-free",
    weather: "Continental, Alpine climate",
    tagline: "Music, mountains, and Sachertorte",
    blurb: "Vienna's imperial palaces, Salzburg's Sound of Music hills, and the jagged peaks of the Alps. Austria is culture, cake, and incredible scenery.",
    cities: [
      { id: "vienna", name: "Vienna", blurb: "Imperial elegance.", attractions: ["Schönbrunn Palace", "St. Stephen's Cathedral", "Belvedere"], hotels: [{ name: "Hotel Sacher", tier: "Luxury" }, { name: "Wombat's", tier: "Budget" }], restaurants: [{ name: "Steirereck", cuisine: "Austrian" }], transport: "Excellent U-Bahn, trams." },
    ],
  },

  {
    id: "belarus", name: "Belarus", flag: "🇧🇾", continent: "Europe", region: "Eastern Europe",
    capital: "Minsk", currency: "Belarusian Ruble (BYN)", language: "Belarusian, Russian",
    population: 9_200_000, timezone: "UTC+3 (MSK)",
    lat: 53.9, lng: 27.57, safety: 62,
    bestSeason: "Summer (Jun–Aug)", visa: "Visa-free for many passports up to 30 days (via Minsk airport)",
    weather: "Continental, cold winters",
    tagline: "The lungs of Europe",
    blurb: "Vast primeval forests, Soviet-era grandeur, and castles from the Grand Duchy of Lithuania. Belarus preserves a unique slice of Eastern Europe.",
    cities: [c("Minsk", "Soviet-planned capital with wide boulevards.")],
  },

  {
    id: "belgium", name: "Belgium", flag: "🇧🇪", continent: "Europe", region: "Western Europe",
    capital: "Brussels", currency: "Euro (€)", language: "Dutch, French, German",
    population: 11_700_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 50.5, lng: 4.47, safety: 83,
    bestSeason: "Spring (Apr–Jun) & Summer (Jul–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Temperate maritime, mild and rainy",
    tagline: "The heart of Europe",
    blurb: "Medieval Bruges, world-class beer, chocolate, and Brussels' EU-quarter buzz. Belgium is compact, cultured, and delicious.",
    cities: [c("Brussels", "EU capital with Art Nouveau flair."), c("Bruges", "Fairytale medieval city of canals.")],
  },

  {
    id: "bosnia", name: "Bosnia and Herzegovina", flag: "🇧🇦", continent: "Europe", region: "Southeastern Europe",
    capital: "Sarajevo", currency: "Bosnia-Herzegovina Convertible Mark (BAM)", language: "Bosnian, Croatian, Serbian",
    population: 3_200_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 43.92, lng: 17.68, safety: 72,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "Visa-free for many passports up to 90 days",
    weather: "Continental, Mediterranean in the south",
    tagline: "Where East meets West in Europe",
    blurb: "Sarajevo's Ottoman old town, Mostar's iconic bridge, and emerald rivers cutting through deep canyons. A country of stunning natural beauty and resilient spirit.",
    cities: [c("Sarajevo", "The Jerusalem of Europe."), c("Mostar", "City of the iconic Stari Most bridge.")],
  },

  {
    id: "bulgaria", name: "Bulgaria", flag: "🇧🇬", continent: "Europe", region: "Southeastern Europe",
    capital: "Sofia", currency: "Bulgarian Lev (BGN)", language: "Bulgarian",
    population: 6_400_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 42.7, lng: 23.32, safety: 76,
    bestSeason: "Summer (Jun–Sep) for beaches, Winter for skiing", visa: "EU member — visa-free for Schengen holders",
    weather: "Continental, Mediterranean influence in south",
    tagline: "Ancient crossroads of Europe",
    blurb: "Golden Black Sea beaches, Rila Monastery in the mountains, and Plovdiv's 8,000-year history. Bulgaria is Europe's oldest country by name.",
    cities: [c("Sofia", "Capital beneath Vitosha Mountain.")],
  },

  {
    id: "croatia", name: "Croatia", flag: "🇭🇷", continent: "Europe", region: "Southeastern Europe",
    capital: "Zagreb", currency: "Euro (€)", language: "Croatian",
    population: 3_800_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 45.1, lng: 15.2, safety: 89,
    bestSeason: "Summer (Jun–Sep) for coast", visa: "Schengen — 90 days visa-free",
    weather: "Mediterranean coast, continental interior",
    tagline: "The Adriatic jewel",
    blurb: "Dubrovnik's ancient walls, Plitvice Lakes' cascading waterfalls, and more than a thousand islands. Croatia is the Adriatic at its most beautiful.",
    cities: [c("Zagreb", "Central European capital with Austro-Hungarian charm."), c("Dubrovnik", "The Pearl of the Adriatic.")],
  },

  // Czech Republic — existing, kept as-is
  {
    id: "czech", name: "Czech Republic", flag: "🇨🇿", continent: "Europe", region: "Central Europe",
    capital: "Prague", currency: "Czech Koruna (Kč)", language: "Czech",
    population: 10_900_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 49.82, lng: 15.47, safety: 90,
    bestSeason: "Spring (Apr–Jun) & Autumn (Sep–Oct)", visa: "Schengen — 90 days visa-free",
    weather: "Continental, warm summers, cold winters",
    tagline: "Fairy-tale Europe",
    blurb: "Prague's Charles Bridge, Český Krumlov's winding streets, and some of the world's best beer. The Czech Republic is storybook Europe at its finest.",
    cities: [
      { id: "prague", name: "Prague", blurb: "City of a Hundred Spires.", attractions: ["Charles Bridge", "Prague Castle", "Old Town Square"], hotels: [{ name: "Four Seasons Prague", tier: "Luxury" }, { name: "Sophie's Hostel", tier: "Budget" }], restaurants: [{ name: "La Degustation", cuisine: "Czech" }], transport: "Trams, metro, walking." },
    ],
  },

  {
    id: "denmark", name: "Denmark", flag: "🇩🇰", continent: "Europe", region: "Nordic",
    capital: "Copenhagen", currency: "Danish Krone (DKK)", language: "Danish",
    population: 5_900_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 56.26, lng: 9.5, safety: 93,
    bestSeason: "Summer (Jun–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Temperate maritime, cool summers",
    tagline: "Hygge and happiness",
    blurb: "Copenhagen's colorful Nyhavn, world-leading design, and the concept of hygge. Denmark consistently ranks among the world's happiest countries.",
    cities: [c("Copenhagen", "Cycling capital and gastronomic powerhouse.")],
  },

  {
    id: "estonia", name: "Estonia", flag: "🇪🇪", continent: "Europe", region: "Nordic / Baltic",
    capital: "Tallinn", currency: "Euro (€)", language: "Estonian",
    population: 1_360_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 59.44, lng: 24.75, safety: 92,
    bestSeason: "Summer (Jun–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Cool maritime, cold winters",
    tagline: "The digital republic",
    blurb: "Tallinn's medieval Old Town, cutting-edge e-governance, and vast bog landscapes. Estonia punches far above its weight.",
    cities: [c("Tallinn", "Fairy-tale medieval capital of the Baltics.")],
  },

  {
    id: "finland", name: "Finland", flag: "🇫🇮", continent: "Europe", region: "Nordic",
    capital: "Helsinki", currency: "Euro (€)", language: "Finnish, Swedish",
    population: 5_600_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 64.0, lng: 26.0, safety: 95,
    bestSeason: "Summer (Jun–Aug) for midnight sun, Winter for auroras", visa: "Schengen — 90 days visa-free",
    weather: "Subarctic, long cold winters",
    tagline: "Land of a thousand lakes",
    blurb: "Saunas, the Northern Lights, and Santa's official hometown. Finland is the world's happiest country — vast forests and clear lakes.",
    cities: [c("Helsinki", "Design-forward capital on the Baltic."), c("Rovaniemi", "Official hometown of Santa Claus.")],
  },

  // France — existing, kept as-is
  {
    id: "france", name: "France", flag: "🇫🇷", continent: "Europe", region: "Western Europe",
    capital: "Paris", currency: "Euro (€)", language: "French",
    population: 64_800_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 46.6, lng: 2.21, safety: 80,
    bestSeason: "Spring (Apr–Jun) & Autumn (Sep–Oct)", visa: "Schengen — 90 days visa-free",
    weather: "Temperate, Mediterranean south",
    tagline: "L'art de vivre",
    blurb: "The Louvre, croissants at sunrise, lavender fields of Provence, and the French Riviera. France is elegance, culture, and culinary perfection in one country.",
    cities: [
      { id: "paris", name: "Paris", blurb: "The City of Light.", attractions: ["Eiffel Tower", "Louvre", "Notre-Dame"], hotels: [{ name: "Ritz Paris", tier: "Luxury" }, { name: "The People Hostel", tier: "Budget" }], restaurants: [{ name: "Septime", cuisine: "Modern French" }], transport: "Metro, Vélib' bikes." },
    ],
  },

  // Germany — existing, kept as-is
  {
    id: "germany", name: "Germany", flag: "🇩🇪", continent: "Europe", region: "Central Europe",
    capital: "Berlin", currency: "Euro (€)", language: "German",
    population: 83_300_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 51.17, lng: 10.45, safety: 85,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "Schengen — 90 days visa-free",
    weather: "Temperate, cooler winters",
    tagline: "Efficiency, beer, and fairy tales",
    blurb: "Berlin's edgy art scene, Bavaria's fairy-tale castles, and the Black Forest. Germany is a powerhouse of culture, history, and surprisingly great food.",
    cities: [
      { id: "berlin", name: "Berlin", blurb: "The city of reinvention.", attractions: ["Brandenburg Gate", "Berlin Wall Memorial", "Museum Island"], hotels: [{ name: "Hotel Adlon", tier: "Luxury" }, { name: "Circus Hostel", tier: "Budget" }], restaurants: [{ name: "Tim Raue", cuisine: "Asian fusion" }], transport: "S-Bahn, U-Bahn, trams." },
    ],
  },

  // Greece — existing, kept as-is
  {
    id: "greece", name: "Greece", flag: "🇬🇷", continent: "Europe", region: "Southern Europe",
    capital: "Athens", currency: "Euro (€)", language: "Greek",
    population: 10_300_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 39.07, lng: 21.82, safety: 82,
    bestSeason: "Late Spring & Early Autumn", visa: "Schengen — 90 days visa-free",
    weather: "Mediterranean, hot dry summers",
    tagline: "Myth, sea, and sunlight",
    blurb: "Whitewashed islands above an impossibly blue sea, ancient ruins, and sun-drenched dinners. Greece is where myth and Mediterranean ease meet.",
    cities: [
      { id: "santorini", name: "Santorini", blurb: "Caldera sunsets and white villages.", attractions: ["Oia Sunset", "Red Beach", "Ancient Akrotiri"], hotels: [{ name: "Grace Hotel", tier: "Luxury" }, { name: "Caveland Hostel", tier: "Budget" }], restaurants: [{ name: "Selene", cuisine: "Aegean" }], transport: "ATV rental, buses." },
    ],
  },

  {
    id: "hungary", name: "Hungary", flag: "🇭🇺", continent: "Europe", region: "Central Europe",
    capital: "Budapest", currency: "Hungarian Forint (HUF)", language: "Hungarian",
    population: 9_600_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 47.16, lng: 19.5, safety: 86,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Schengen — 90 days visa-free",
    weather: "Continental, warm summers",
    tagline: "The Pearl of the Danube",
    blurb: "Budapest's thermal baths, ruin bars, and grand Parliament building. Hungary is Central European grandeur with a spicy paprika kick.",
    cities: [c("Budapest", "Danube-divided capital of baths and bars.")],
  },

  // Iceland — existing, kept as-is
  {
    id: "iceland", name: "Iceland", flag: "🇮🇸", continent: "Europe", region: "Nordic",
    capital: "Reykjavík", currency: "Icelandic Króna (kr)", language: "Icelandic",
    population: 380_000, timezone: "UTC+0 (GMT)",
    lat: 64.96, lng: -19.02, safety: 96,
    bestSeason: "Summer (Jun–Aug) for daylight, Winter for auroras", visa: "Schengen — 90 days visa-free",
    weather: "Subarctic, wildly changeable",
    tagline: "Fire, ice, and northern lights",
    blurb: "A raw, otherworldly island of glaciers, geysers, and black-sand beaches. Chase waterfalls by day and the aurora by night in one of Earth's last great wildernesses.",
    cities: [
      { id: "reykjavik", name: "Reykjavík", blurb: "The world's northernmost capital.", attractions: ["Hallgrímskirkja", "Blue Lagoon", "Golden Circle"], hotels: [{ name: "The Retreat", tier: "Luxury" }, { name: "Kex Hostel", tier: "Budget" }], restaurants: [{ name: "Dill", cuisine: "New Nordic" }], transport: "Rent a car for the Ring Road." },
    ],
  },

  {
    id: "ireland", name: "Ireland", flag: "🇮🇪", continent: "Europe", region: "Northern Europe",
    capital: "Dublin", currency: "Euro (€)", language: "English, Irish",
    population: 5_200_000, timezone: "UTC+0/+1 (GMT/IST)",
    lat: 53.35, lng: -7.7, safety: 90,
    bestSeason: "Summer (Jun–Aug)", visa: "Visa-free for many passports",
    weather: "Temperate maritime, famously green",
    tagline: "The Emerald Isle",
    blurb: "Cliffs of Moher, Guinness in a Dublin pub, and the Wild Atlantic Way. Ireland is green landscapes, ancient castles, and legendary craic.",
    cities: [c("Dublin", "Literary capital of pubs and Georgian squares.")],
  },

  // Italy — existing, kept as-is
  {
    id: "italy", name: "Italy", flag: "🇮🇹", continent: "Europe", region: "Southern Europe",
    capital: "Rome", currency: "Euro (€)", language: "Italian",
    population: 58_900_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 41.87, lng: 12.56, safety: 84,
    bestSeason: "Late Spring (Apr–Jun) & Early Autumn (Sep–Oct)", visa: "Schengen — 90 days visa-free",
    weather: "Mediterranean, warm dry summers",
    tagline: "La dolce vita awaits",
    blurb: "Open-air museums, coastlines carved by light, and food worth crossing oceans for. Italy is a feast for every sense.",
    cities: [
      { id: "rome", name: "Rome", blurb: "The Eternal City.", attractions: ["Colosseum", "Vatican Museums", "Trevi Fountain"], hotels: [{ name: "Hotel de Russie", tier: "Luxury" }, { name: "Generator Rome", tier: "Budget" }], restaurants: [{ name: "Roscioli", cuisine: "Roman" }], transport: "Walkable center, metro A & B." },
      { id: "venice", name: "Venice", blurb: "Floating dream of canals.", attractions: ["St. Mark's Basilica", "Grand Canal", "Rialto Bridge"], hotels: [{ name: "Gritti Palace", tier: "Luxury" }], restaurants: [{ name: "Osteria alle Testiere", cuisine: "Seafood" }], transport: "Vaporetto water buses." },
    ],
  },

  {
    id: "latvia", name: "Latvia", flag: "🇱🇻", continent: "Europe", region: "Baltic",
    capital: "Riga", currency: "Euro (€)", language: "Latvian",
    population: 1_870_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 56.95, lng: 24.11, safety: 84,
    bestSeason: "Summer (Jun–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Cool maritime, cold winters",
    tagline: "Art Nouveau capital of the north",
    blurb: "Riga's stunning Art Nouveau district, Jurmala's white-sand beach, and deep pine forests. The Baltic's beating heart.",
    cities: [c("Riga", "Art Nouveau jewel on the Daugava River.")],
  },

  {
    id: "liechtenstein", name: "Liechtenstein", flag: "🇱🇮", continent: "Europe", region: "Central Europe",
    capital: "Vaduz", currency: "Swiss Franc (CHF)", language: "German",
    population: 40_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 47.17, lng: 9.52, safety: 97,
    bestSeason: "Summer (Jun–Sep) for hiking", visa: "Schengen via Switzerland/Austria",
    weather: "Alpine, cool winters, mild summers",
    tagline: "The principality in the Alps",
    blurb: "Castle perched on a hilltop, alpine hiking trails, and the Rhine Valley's beauty. One of the world's smallest yet richest countries.",
    cities: [c("Vaduz", "Castle-topped capital of the Alps.")],
  },

  {
    id: "lithuania", name: "Lithuania", flag: "🇱🇹", continent: "Europe", region: "Baltic",
    capital: "Vilnius", currency: "Euro (€)", language: "Lithuanian",
    population: 2_870_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 54.69, lng: 25.28, safety: 88,
    bestSeason: "Summer (Jun–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Cool maritime to continental",
    tagline: "Baroque heart of the Baltics",
    blurb: "Vilnius' UNESCO Baroque old town, the Curonian Spit's giant dunes, and Trakai's island castle. Lithuania is compact, beautiful, and deeply historic.",
    cities: [c("Vilnius", "Baroque capital with a bohemian republic.")],
  },

  {
    id: "luxembourg", name: "Luxembourg", flag: "🇱🇺", continent: "Europe", region: "Western Europe",
    capital: "Luxembourg City", currency: "Euro (€)", language: "Luxembourgish, French, German",
    population: 660_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 49.61, lng: 6.13, safety: 96,
    bestSeason: "Spring (Apr–Jun) & Summer (Jul–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Temperate maritime",
    tagline: "Gibraltar of the North",
    blurb: "Fortress city perched above deep gorges, the Ardennes forests, and Europe's wealthiest square mile. Luxembourg City is a UNESCO wonder.",
    cities: [c("Luxembourg City", "Fortress capital above dramatic valleys.")],
  },

  {
    id: "malta", name: "Malta", flag: "🇲🇹", continent: "Europe", region: "Southern Europe",
    capital: "Valletta", currency: "Euro (€)", language: "Maltese, English",
    population: 540_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 35.9, lng: 14.51, safety: 91,
    bestSeason: "Spring (Apr–Jun) & Autumn (Sep–Oct)", visa: "Schengen — 90 days visa-free",
    weather: "Mediterranean, hot dry summers",
    tagline: "Mediterranean microcosm",
    blurb: "Valletta's honey-stone fortifications, prehistoric temples older than the pyramids, and crystal-clear Blue Lagoon. An island of endless sun.",
    cities: [c("Valletta", "Baroque capital jutting into the sea.")],
  },

  {
    id: "moldova", name: "Moldova", flag: "🇲🇩", continent: "Europe", region: "Eastern Europe",
    capital: "Chișinău", currency: "Moldovan Leu (MDL)", language: "Romanian",
    population: 2_500_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 47.02, lng: 28.86, safety: 66,
    bestSeason: "Spring (Apr–May) & Autumn (Sep–Oct)", visa: "Visa-free for many passports up to 90 days",
    weather: "Continental, warm summers",
    tagline: "Europe's least visited country",
    blurb: "Mileștii Mici's underground wine city — the world's largest wine cellar. Rolling vineyards, Soviet relics, and genuine countryside charm.",
    cities: [c("Chișinău", "Green capital of parks and wine cellars.")],
  },

  {
    id: "monaco", name: "Monaco", flag: "🇲🇨", continent: "Europe", region: "Western Europe",
    capital: "Monaco", currency: "Euro (€)", language: "French",
    population: 39_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 43.74, lng: 7.43, safety: 97,
    bestSeason: "Spring (Apr–Jun) & Autumn (Sep–Oct)", visa: "France Schengen rules apply",
    weather: "Mediterranean, mild winters, warm summers",
    tagline: "The billionaires' playground",
    blurb: "Monte Carlo Casino, the Formula 1 Grand Prix circuit, and super-yacht harbor. The world's most glamorous microstate.",
    cities: [c("Monte Carlo", "Legendary district of casinos and glamour.")],
  },

  {
    id: "montenegro", name: "Montenegro", flag: "🇲🇪", continent: "Europe", region: "Southeastern Europe",
    capital: "Podgorica", currency: "Euro (€)", language: "Montenegrin",
    population: 620_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 42.71, lng: 19.37, safety: 82,
    bestSeason: "Summer (Jun–Sep) for coast", visa: "Visa-free for many passports up to 90 days",
    weather: "Mediterranean coast, continental interior",
    tagline: "Wild beauty of the Adriatic",
    blurb: "Kotor's fjord-like bay, Durmitor's dramatic peaks, and the glittering Budva Riviera. Montenegro packs epic scenery into a tiny country.",
    cities: [c("Podgorica", "Low-key capital beneath the mountains."), c("Kotor", "Medieval town on Europe's southernmost fjord.")],
  },

  // Netherlands — existing, kept as-is
  {
    id: "netherlands", name: "Netherlands", flag: "🇳🇱", continent: "Europe", region: "Western Europe",
    capital: "Amsterdam", currency: "Euro (€)", language: "Dutch",
    population: 17_600_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 52.13, lng: 5.29, safety: 86,
    bestSeason: "Spring (Apr–May) for tulips, Summer (Jun–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Temperate maritime, mild and wet",
    tagline: "Canals, bikes, and masterpieces",
    blurb: "Cycle along Amsterdam's canals, stand before Van Gogh's sunflowers, and marvel at endless tulip fields. The Netherlands is compact, cultured, and effortlessly cool.",
    cities: [
      { id: "amsterdam", name: "Amsterdam", blurb: "Canals and creativity.", attractions: ["Rijksmuseum", "Anne Frank House", "Vondelpark"], hotels: [{ name: "Waldorf Astoria", tier: "Luxury" }, { name: "Flying Pig", tier: "Budget" }], restaurants: [{ name: "De Kas", cuisine: "Farm-to-table" }], transport: "Bikes, trams, walking." },
    ],
  },

  {
    id: "north-macedonia", name: "North Macedonia", flag: "🇲🇰", continent: "Europe", region: "Southeastern Europe",
    capital: "Skopje", currency: "Macedonian Denar (MKD)", language: "Macedonian",
    population: 1_830_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 41.61, lng: 21.75, safety: 72,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "Visa-free for many passports up to 90 days",
    weather: "Continental, warm summers, snowy winters",
    tagline: "Land of lakes and ancient kingdoms",
    blurb: "Lake Ohrid's ancient churches, Skopje's eclectic statues, and the canyons of Matka. A Balkan crossroads of civilizations.",
    cities: [c("Skopje", "Quirky capital of statues and bazaars.")],
  },

  // Norway — existing, kept as-is
  {
    id: "norway", name: "Norway", flag: "🇳🇴", continent: "Europe", region: "Nordic",
    capital: "Oslo", currency: "Norwegian Krone (kr)", language: "Norwegian",
    population: 5_500_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 60.47, lng: 8.47, safety: 94,
    bestSeason: "Summer (Jun–Aug) & Winter for auroras", visa: "Schengen — 90 days visa-free",
    weather: "Cool, wet coast; cold interior",
    tagline: "Land of the fjords",
    blurb: "Sheer fjords, midnight sun, and storybook fishing villages. Norway is nature at its most dramatic — sail, ski, and watch the northern lights dance.",
    cities: [
      { id: "bergen", name: "Bergen", blurb: "Colorful harbor and fjord gateway.", attractions: ["Bryggen Wharf", "Fløibanen", "Nærøyfjord"], hotels: [{ name: "Opus XVI", tier: "Luxury" }, { name: "Marken Gjestehus", tier: "Budget" }], restaurants: [{ name: "Lysverket", cuisine: "New Nordic" }], transport: "Walkable, fjord cruises." },
    ],
  },

  {
    id: "poland", name: "Poland", flag: "🇵🇱", continent: "Europe", region: "Central Europe",
    capital: "Warsaw", currency: "Polish Złoty (PLN)", language: "Polish",
    population: 38_500_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 52.23, lng: 21.01, safety: 86,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "Schengen — 90 days visa-free",
    weather: "Continental, cold winters, warm summers",
    tagline: "The phoenix of Europe",
    blurb: "Kraków's medieval square, Warsaw's rebuilt Old Town, and the haunting Auschwitz memorial. Poland is a country of resilience and rich heritage.",
    cities: [c("Warsaw", "Capital that rebuilt itself from the ashes."), c("Kraków", "Poland's cultural crown jewel.")],
  },

  // Portugal — existing, kept as-is
  {
    id: "portugal", name: "Portugal", flag: "🇵🇹", continent: "Europe", region: "Southern Europe",
    capital: "Lisbon", currency: "Euro (€)", language: "Portuguese",
    population: 10_300_000, timezone: "UTC+0/+1 (WET/WEST)",
    lat: 39.4, lng: -8.22, safety: 88,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Oct)", visa: "Schengen — 90 days visa-free",
    weather: "Mediterranean, Atlantic-cooled",
    tagline: "Saudade by the Atlantic",
    blurb: "Pastéis de nata, golden cliffs of the Algarve, and Porto's wine cellars. Portugal is Europe's best-kept secret — affordable, beautiful, and deeply charming.",
    cities: [
      { id: "lisbon", name: "Lisbon", blurb: "City of seven hills.", attractions: ["Belém Tower", "Jerónimos Monastery", "Alfama"], hotels: [{ name: "Four Seasons Ritz", tier: "Luxury" }, { name: "Yes! Lisbon", tier: "Budget" }], restaurants: [{ name: "Belcanto", cuisine: "Portuguese" }], transport: "Trams, metro, funiculars." },
    ],
  },

  {
    id: "romania", name: "Romania", flag: "🇷🇴", continent: "Europe", region: "Eastern Europe",
    capital: "Bucharest", currency: "Romanian Leu (RON)", language: "Romanian",
    population: 19_000_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 45.94, lng: 24.97, safety: 82,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "EU member — visa-free for Schengen holders",
    weather: "Continental, warm summers, cold winters",
    tagline: "Legends in the Carpathians",
    blurb: "Bran Castle (Dracula's lair), Transylvania's medieval towns, and the winding Transfăgărășan highway. Romania is mythic, beautiful, and affordable.",
    cities: [c("Bucharest", "The Little Paris of the East."), c("Brașov", "Gateway to Transylvania and Bran Castle.")],
  },

  {
    id: "russia", name: "Russia", flag: "🇷🇺", continent: "Europe / Asia", region: "Eastern Europe / Northern Asia",
    capital: "Moscow", currency: "Russian Ruble (₽)", language: "Russian",
    population: 144_000_000, timezone: "UTC+2 to +12 (MSK)",
    lat: 61.52, lng: 105.32, safety: 58,
    bestSeason: "Summer (Jun–Aug)", visa: "Visa required for most passports",
    weather: "Varies — Arctic north to subtropical south",
    tagline: "The largest country on Earth",
    blurb: "Moscow's Red Square and St. Basil's Cathedral, St. Petersburg's Hermitage Museum, and the Trans-Siberian Railway spanning 9,000 km. Russia is vast, historic, and unforgettable.",
    cities: [
      c("Moscow", "The Kremlin, Red Square, and Bolshoi Theatre."),
      c("Saint Petersburg", "Venice of the North — canals, palaces, and the Hermitage."),
      c("Vladivostok", "Pacific gateway at the end of the Trans-Siberian Railway."),
    ],
  },

  {
    id: "san-marino", name: "San Marino", flag: "🇸🇲", continent: "Europe", region: "Southern Europe",
    capital: "San Marino", currency: "Euro (€)", language: "Italian",
    population: 34_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 43.94, lng: 12.46, safety: 97,
    bestSeason: "Spring (Apr–Jun) & Autumn (Sep–Oct)", visa: "Italy Schengen rules apply",
    weather: "Mediterranean, mild",
    tagline: "The oldest republic in the world",
    blurb: "Medieval towers perched atop Monte Titano, sweeping views to the Adriatic, and the claim to being the world's oldest surviving sovereign state.",
    cities: [c("San Marino", "Fortress capital atop Monte Titano.")],
  },

  {
    id: "serbia", name: "Serbia", flag: "🇷🇸", continent: "Europe", region: "Southeastern Europe",
    capital: "Belgrade", currency: "Serbian Dinar (RSD)", language: "Serbian",
    population: 6_600_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 44.79, lng: 20.45, safety: 74,
    bestSeason: "Spring (Apr–Jun) & Autumn (Sep–Oct)", visa: "Visa-free for many passports up to 90 days",
    weather: "Continental, warm summers",
    tagline: "Balkan heart, European soul",
    blurb: "Belgrade's floating river clubs, Novi Sad's EXIT Festival, and the Đavolja Varoš rock formations. Serbia is the Balkans' cultural engine.",
    cities: [c("Belgrade", "White city at the confluence of the Danube and Sava.")],
  },

  {
    id: "slovakia", name: "Slovakia", flag: "🇸🇰", continent: "Europe", region: "Central Europe",
    capital: "Bratislava", currency: "Euro (€)", language: "Slovak",
    population: 5_400_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 48.67, lng: 19.7, safety: 88,
    bestSeason: "Spring (May–Jun) & Summer (Jul–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Continental, alpine in north",
    tagline: "Castle country of Europe",
    blurb: "More castles per capita than anywhere else, the High Tatras' jagged peaks, and Bratislava's Danube charm. Slovakia is compact, beautiful, and underrated.",
    cities: [c("Bratislava", "Danube capital beneath castle ramparts.")],
  },

  {
    id: "slovenia", name: "Slovenia", flag: "🇸🇮", continent: "Europe", region: "Central Europe",
    capital: "Ljubljana", currency: "Euro (€)", language: "Slovene",
    population: 2_120_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 46.05, lng: 14.51, safety: 94,
    bestSeason: "Spring (Apr–Jun) & Summer (Jul–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Alpine, Mediterranean on the coast",
    tagline: "Green heart of Europe",
    blurb: "Lake Bled's fairy-tale island, Triglav National Park, and Ljubljana's dragon bridge. Slovenia is bite-sized perfection — mountains, sea, and caves.",
    cities: [c("Ljubljana", "Dragon city with a castle on the hill."), c("Bled", "Fairy-tale lake with a church on an island.")],
  },

  // Spain — existing, kept as-is
  {
    id: "spain", name: "Spain", flag: "🇪🇸", continent: "Europe", region: "Southern Europe",
    capital: "Madrid", currency: "Euro (€)", language: "Spanish",
    population: 47_500_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 40.46, lng: -3.75, safety: 83,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Schengen — 90 days visa-free",
    weather: "Mediterranean, hot interior summers",
    tagline: "Fiesta, siesta, and endless sun",
    blurb: "Flamenco in Seville, Gaudí in Barcelona, and tapas everywhere in between. Spain pulses with passion, art, and some of the world's best beaches.",
    cities: [
      { id: "barcelona", name: "Barcelona", blurb: "Gaudí's playground by the sea.", attractions: ["Sagrada Familia", "Park Güell", "La Rambla"], hotels: [{ name: "W Barcelona", tier: "Luxury" }, { name: "Hostel One", tier: "Budget" }], restaurants: [{ name: "Tickets", cuisine: "Tapas" }], transport: "Metro, buses, walkable." },
    ],
  },

  {
    id: "sweden", name: "Sweden", flag: "🇸🇪", continent: "Europe", region: "Nordic",
    capital: "Stockholm", currency: "Swedish Krona (SEK)", language: "Swedish",
    population: 10_600_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 60.13, lng: 18.64, safety: 93,
    bestSeason: "Summer (Jun–Aug)", visa: "Schengen — 90 days visa-free",
    weather: "Cool, long summer days, dark winters",
    tagline: "Lagom and design",
    blurb: "Stockholm's 14 islands, the Northern Lights above Abisko, and fika coffee culture. Sweden is sleek, nature-rich, and effortlessly cool.",
    cities: [c("Stockholm", "City of 14 islands on the Baltic.")],
  },

  // Switzerland — existing, kept as-is
  {
    id: "switzerland", name: "Switzerland", flag: "🇨🇭", continent: "Europe", region: "Central Europe",
    capital: "Bern", currency: "Swiss Franc (CHF)", language: "German, French, Italian, Romansh",
    population: 8_800_000, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 46.82, lng: 8.23, safety: 93,
    bestSeason: "Summer (Jun–Sep) for hiking, Winter for skiing", visa: "Schengen — 90 days visa-free",
    weather: "Alpine, cool winters and mild summers",
    tagline: "The roof of Europe",
    blurb: "Snow-capped Alps, pristine lakes, and chocolate-box villages. Switzerland is natural beauty refined to perfection, with trains that run like clockwork.",
    cities: [
      { id: "zurich", name: "Zürich", blurb: "Banking capital with a soul.", attractions: ["Lake Zürich", "Old Town", "Kunsthaus"], hotels: [{ name: "Baur au Lac", tier: "Luxury" }, { name: "Zurich Youth Hostel", tier: "Budget" }], restaurants: [{ name: "Hiltl", cuisine: "Vegetarian" }], transport: "Trams, trains, Swiss precision." },
    ],
  },

  {
    id: "ukraine", name: "Ukraine", flag: "🇺🇦", continent: "Europe", region: "Eastern Europe",
    capital: "Kyiv", currency: "Ukrainian Hryvnia (₴)", language: "Ukrainian",
    population: 37_000_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 49.42, lng: 31.46, safety: 40,
    bestSeason: "Spring (May–Jun) & Autumn (Sep–Oct)", visa: "Visa-free for many passports up to 90 days",
    weather: "Continental, warm summers, cold winters",
    tagline: "The breadbasket of Europe",
    blurb: "Kyiv's golden-domed monasteries, Lviv's cobblestone charm, the Carpathian Mountains, and the vast sunflower fields of the steppe. Ukraine is resilient, warm-hearted, and culturally rich.",
    cities: [
      c("Kyiv", "Ancient capital of golden domes on the Dnipro River."),
      c("Lviv", "Coffee-scented cultural capital of western Ukraine."),
      c("Odesa", "The Pearl of the Black Sea — opera, steps, and beaches."),
    ],
  },

  // United Kingdom — existing, kept as-is
  {
    id: "uk", name: "United Kingdom", flag: "🇬🇧", continent: "Europe", region: "Northern Europe",
    capital: "London", currency: "Pound Sterling (£)", language: "English",
    population: 67_700_000, timezone: "UTC+0/+1 (GMT/BST)",
    lat: 55.38, lng: -3.44, safety: 85,
    bestSeason: "Summer (Jun–Aug)", visa: "ETA required for many visa-free passports",
    weather: "Temperate maritime, famously rainy",
    tagline: "Royal history meets modern edge",
    blurb: "From Big Ben to the Scottish Highlands, Britain packs castles, pubs, world-class theatre, and countryside charm into one rainy, wonderful island.",
    cities: [
      { id: "london", name: "London", blurb: "A global capital of culture.", attractions: ["Tower of London", "British Museum", "London Eye"], hotels: [{ name: "The Savoy", tier: "Luxury" }, { name: "YHA London", tier: "Budget" }], restaurants: [{ name: "Dishoom", cuisine: "Indian" }], transport: "Tube, buses, black cabs." },
    ],
  },

  {
    id: "vatican", name: "Vatican City", flag: "🇻🇦", continent: "Europe", region: "Southern Europe",
    capital: "Vatican City", currency: "Euro (€)", language: "Latin, Italian",
    population: 800, timezone: "UTC+1/+2 (CET/CEST)",
    lat: 41.9, lng: 12.45, safety: 98,
    bestSeason: "Year-round, Spring & Autumn best", visa: "Open border with Italy — no separate visa",
    weather: "Mediterranean, mild winters",
    tagline: "The world's smallest country",
    blurb: "St. Peter's Basilica, the Sistine Chapel, and the Vatican Museums. The spiritual epicenter of Roman Catholicism and a treasure trove of art.",
    cities: [c("Vatican City", "The seat of the Holy See.")],
  },

  // ═══════════════════════════════════════════════════════════════
  //  AFRICA  (54 members)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "algeria", name: "Algeria", flag: "🇩🇿", continent: "Africa", region: "North Africa",
    capital: "Algiers", currency: "Algerian Dinar (DZD)", language: "Arabic, Berber",
    population: 45_600_000, timezone: "UTC+1 (CET)",
    lat: 36.75, lng: 3.05, safety: 62,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa required for most passports",
    weather: "Mediterranean coast, Saharan interior",
    tagline: "Africa's largest country",
    blurb: "Roman ruins at Timgad, the Casbah of Algiers, and the vast Sahara. Algeria is North Africa's best-kept secret.",
    cities: [c("Algiers", "The White City on the Mediterranean.")],
  },

  {
    id: "angola", name: "Angola", flag: "🇦🇴", continent: "Africa", region: "Southern Africa",
    capital: "Luanda", currency: "Angolan Kwanza (AOA)", language: "Portuguese",
    population: 36_600_000, timezone: "UTC+1 (WAT)",
    lat: -8.81, lng: 13.23, safety: 52,
    bestSeason: "Dry season (Jun–Sep)", visa: "Visa required — e-Visa available",
    weather: "Tropical, savanna, arid south",
    tagline: "Atlantic jewel rising",
    blurb: "Luanda's bayfront skyline, Calandula Falls, and vast untamed landscapes. Angola is one of Africa's fastest-changing countries.",
    cities: [c("Luanda", "Bustling Atlantic capital of contrasts.")],
  },

  {
    id: "benin", name: "Benin", flag: "🇧🇯", continent: "Africa", region: "West Africa",
    capital: "Porto-Novo", currency: "West African CFA Franc (XOF)", language: "French",
    population: 14_100_000, timezone: "UTC+1 (WAT)",
    lat: 6.48, lng: 2.6, safety: 64,
    bestSeason: "Dry season (Nov–Mar)", visa: "e-Visa available",
    weather: "Tropical, humid south, arid north",
    tagline: "Cradle of vodun",
    blurb: "Birthplace of Vodun (Voodoo), the Royal Palaces of Abomey, and Pendjari National Park's elephants. West Africa's spiritual heart.",
    cities: [c("Porto-Novo", "Colonial capital with African soul."), c("Cotonou", "Economic hub on the Gulf of Guinea.")],
  },

  {
    id: "botswana", name: "Botswana", flag: "🇧🇼", continent: "Africa", region: "Southern Africa",
    capital: "Gaborone", currency: "Botswana Pula (BWP)", language: "English, Setswana",
    population: 2_700_000, timezone: "UTC+2 (CAT)",
    lat: -22.33, lng: 24.68, safety: 84,
    bestSeason: "Jun–Oct (dry season for wildlife)", visa: "Visa-free for many passports up to 90 days",
    weather: "Semi-arid, hot summers",
    tagline: "Africa's conservation success story",
    blurb: "The Okavango Delta — a flooded paradise teaming with wildlife, the Kalahari Desert, and Chobe's elephant herds. Botswana is safari at its purest.",
    cities: [c("Gaborone", "Clean, modern capital of diamonds and wildlife.")],
  },

  {
    id: "burkina-faso", name: "Burkina Faso", flag: "🇧🇫", continent: "Africa", region: "West Africa",
    capital: "Ouagadougou", currency: "West African CFA Franc (XOF)", language: "French",
    population: 23_200_000, timezone: "UTC+0 (GMT)",
    lat: 12.36, lng: -1.53, safety: 42,
    bestSeason: "Dry season (Nov–Mar)", visa: "Visa required",
    weather: "Tropical, dry and rainy seasons",
    tagline: "Land of the upright people",
    blurb: "Ouagadougou's vibrant markets, the Sindou Peaks, and FESPACO — Africa's largest film festival. A country of creative energy.",
    cities: [c("Ouagadougou", "Cinematic capital of West Africa.")],
  },

  {
    id: "burundi", name: "Burundi", flag: "🇧🇮", continent: "Africa", region: "East Africa",
    capital: "Gitega", currency: "Burundian Franc (BIF)", language: "Kirundi, French, English",
    population: 13_200_000, timezone: "UTC+2 (CAT)",
    lat: -3.37, lng: 29.92, safety: 48,
    bestSeason: "Dry season (Jun–Aug)", visa: "Visa on arrival",
    weather: "Tropical highland, mild",
    tagline: "Heart of Africa",
    blurb: "Lake Tanganyika's blue depths, drumming traditions, and rolling highland hills. Burundi is small but deeply soulful.",
    cities: [c("Gitega", "New capital in the central highlands.")],
  },

  {
    id: "cape-verde", name: "Cape Verde", flag: "🇨🇻", continent: "Africa", region: "West Africa",
    capital: "Praia", currency: "Cape Verdean Escudo (CVE)", language: "Portuguese, Cape Verdean Creole",
    population: 590_000, timezone: "UTC-1 (CVT)",
    lat: 14.93, lng: -23.51, safety: 86,
    bestSeason: "Year-round, Dec–Jun driest", visa: "Visa-free for many passports up to 30 days",
    weather: "Tropical, mild year-round",
    tagline: "Africa's island secret",
    blurb: "Volcanic islands in the Atlantic with Creole culture, morna music, and wind-swept beaches. Cape Verde is where Africa meets Brazil.",
    cities: [c("Praia", "Sun-drenched capital on Santiago Island.")],
  },

  {
    id: "cameroon", name: "Cameroon", flag: "🇨🇲", continent: "Africa", region: "Central Africa",
    capital: "Yaoundé", currency: "Central African CFA Franc (XAF)", language: "French, English",
    population: 28_600_000, timezone: "UTC+1 (WAT)",
    lat: 3.87, lng: 11.52, safety: 54,
    bestSeason: "Nov–Feb (dry season)", visa: "Visa required — e-Visa emerging",
    weather: "Tropical, varies by region",
    tagline: "Africa in miniature",
    blurb: "Mount Cameroon — West Africa's highest peak, the Waza savanna, and rainforests home to gorillas. Cameroon packs every African biome into one country.",
    cities: [c("Yaoundé", "Hilly capital of seven hills.")],
  },

  {
    id: "car", name: "Central African Republic", flag: "🇨🇫", continent: "Africa", region: "Central Africa",
    capital: "Bangui", currency: "Central African CFA Franc (XAF)", language: "French, Sango",
    population: 5_700_000, timezone: "UTC+1 (WAT)",
    lat: 4.36, lng: 18.58, safety: 22,
    bestSeason: "Dec–Mar (dry season)", visa: "Visa required",
    weather: "Tropical, wet and dry seasons",
    tagline: "Wild heart of Africa",
    blurb: "Dzanga-Sangha's forest elephants and lowland gorillas, the Ubangi River, and vast untouched wilderness. A land of raw, wild beauty.",
    cities: [c("Bangui", "River capital on the Ubangi.")],
  },

  {
    id: "chad", name: "Chad", flag: "🇹🇩", continent: "Africa", region: "Central Africa",
    capital: "N'Djamena", currency: "Central African CFA Franc (XAF)", language: "French, Arabic",
    population: 18_300_000, timezone: "UTC+1 (WAT)",
    lat: 12.11, lng: 15.06, safety: 32,
    bestSeason: "Nov–Feb (cooler dry season)", visa: "Visa required",
    weather: "Desert in north, Sahel in center, tropical south",
    tagline: "The Sahel's titan",
    blurb: "Lake Chad — a vanishing inland sea, the Ennedi Massif's surreal rock formations, and the Tibesti Mountains. Remote and extraordinary.",
    cities: [c("N'Djamena", "Sahelian capital on the Chari River.")],
  },

  {
    id: "comoros", name: "Comoros", flag: "🇰🇲", continent: "Africa", region: "East Africa",
    capital: "Moroni", currency: "Comorian Franc (KMF)", language: "Comorian, French, Arabic",
    population: 850_000, timezone: "UTC+3 (EAT)",
    lat: -11.88, lng: 43.87, safety: 68,
    bestSeason: "May–Oct (dry season)", visa: "Visa on arrival",
    weather: "Tropical, warm year-round",
    tagline: "Perfume islands of the Indian Ocean",
    blurb: "Volcanic islands fragrant with ylang-ylang, pristine beaches, and Arab-Swahili heritage. The Comoros are Africa's hidden island paradise.",
    cities: [c("Moroni", "Indian Ocean capital beneath Mount Karthala.")],
  },

  {
    id: "congo", name: "Republic of the Congo", flag: "🇨🇬", continent: "Africa", region: "Central Africa",
    capital: "Brazzaville", currency: "Central African CFA Franc (XAF)", language: "French",
    population: 6_100_000, timezone: "UTC+1 (WAT)",
    lat: -4.26, lng: 15.28, safety: 48,
    bestSeason: "Jun–Sep (dry season)", visa: "Visa required",
    weather: "Tropical, equatorial climate",
    tagline: "Congo Basin heartland",
    blurb: "Odzala-Kokoua's forest elephants and gorillas, the mighty Congo River, and Brazzaville's riverside charm. Congo is raw Central Africa.",
    cities: [c("Brazzaville", "River capital facing Kinshasa across the Congo.")],
  },

  {
    id: "dr-congo", name: "Democratic Republic of the Congo", flag: "🇨🇩", continent: "Africa", region: "Central Africa",
    capital: "Kinshasa", currency: "Congolese Franc (CDF)", language: "French",
    population: 102_000_000, timezone: "UTC+1/+2 (WAT/CAT)",
    lat: -4.32, lng: 15.31, safety: 30,
    bestSeason: "Jun–Sep (dry season)", visa: "Visa required",
    weather: "Tropical, equatorial",
    tagline: "The beating heart of Africa",
    blurb: "Virunga's mountain gorillas, the Nyiragongo volcano's lava lake, and the mighty Congo. The DRC is Africa's wildest, most magnificent frontier.",
    cities: [c("Kinshasa", "Africa's third-largest megacity with vibrant music.")],
  },

  {
    id: "djibouti", name: "Djibouti", flag: "🇩🇯", continent: "Africa", region: "East Africa",
    capital: "Djibouti City", currency: "Djiboutian Franc (DJF)", language: "French, Arabic",
    population: 1_140_000, timezone: "UTC+3 (EAT)",
    lat: 11.59, lng: 43.15, safety: 58,
    bestSeason: "Nov–Mar (cooler season)", visa: "e-Visa available",
    weather: "Hot desert, very hot summers",
    tagline: "Where the Red Sea meets Africa",
    blurb: "Lake Assal — Earth's lowest point in Africa, whale sharks in the Gulf of Tadjoura, and surreal salt flats.",
    cities: [c("Djibouti City", "Strategic port at the Horn of Africa.")],
  },

  // Egypt — existing, kept as-is
  {
    id: "egypt", name: "Egypt", flag: "🇪🇬", continent: "Africa", region: "North Africa",
    capital: "Cairo", currency: "Egyptian Pound (E£)", language: "Arabic",
    population: 112_700_000, timezone: "UTC+2/+3 (EET/EEST)",
    lat: 26.82, lng: 30.8, safety: 65,
    bestSeason: "Winter (Oct–Apr)", visa: "Visa on arrival / e-Visa for many passports",
    weather: "Hot desert climate",
    tagline: "Where civilization began",
    blurb: "Stand before the Pyramids, cruise the timeless Nile, and wander temples older than memory. Egypt is history you can touch, under an endless desert sky.",
    cities: [
      { id: "cairo", name: "Cairo", blurb: "Ancient-meets-modern capital.", attractions: ["Pyramids of Giza", "Egyptian Museum", "Khan el-Khalili"], hotels: [{ name: "Four Seasons Nile Plaza", tier: "Luxury" }, { name: "Dahab Hostel", tier: "Budget" }], restaurants: [{ name: "Abou El Sid", cuisine: "Egyptian" }], transport: "Metro, ride-hailing." },
    ],
  },

  {
    id: "equatorial-guinea", name: "Equatorial Guinea", flag: "🇬🇶", continent: "Africa", region: "Central Africa",
    capital: "Malabo", currency: "Central African CFA Franc (XAF)", language: "Spanish, French, Portuguese",
    population: 1_710_000, timezone: "UTC+1 (WAT)",
    lat: 3.75, lng: 8.78, safety: 50,
    bestSeason: "Dec–Feb (dry season)", visa: "Visa required",
    weather: "Tropical, humid",
    tagline: "Island and mainland Africa",
    blurb: "Bioko's volcanic peaks, pristine beaches, and Spanish colonial architecture. The only Spanish-speaking country in Africa.",
    cities: [c("Malabo", "Island capital on Bioko.")],
  },

  {
    id: "eritrea", name: "Eritrea", flag: "🇪🇷", continent: "Africa", region: "East Africa",
    capital: "Asmara", currency: "Eritrean Nakfa (ERN)", language: "Tigrinya, Arabic, English",
    population: 3_700_000, timezone: "UTC+3 (EAT)",
    lat: 15.33, lng: 38.94, safety: 44,
    bestSeason: "Oct–Mar (cooler season)", visa: "Visa required",
    weather: "Hot, arid coast; cooler highlands",
    tagline: "Art Deco Africa",
    blurb: "Asmara's UNESCO-listed Art Deco architecture, the Dahlak Archipelago's untouched reefs, and the Red Sea coast. Africa's most unexpected cityscape.",
    cities: [c("Asmara", "Modernist gem on the Horn of Africa.")],
  },

  {
    id: "eswatini", name: "Eswatini", flag: "🇸🇿", continent: "Africa", region: "Southern Africa",
    capital: "Mbabane", currency: "Swazi Lilangeni (SZL)", language: "Swazi, English",
    population: 1_210_000, timezone: "UTC+2 (SAST)",
    lat: -26.52, lng: 31.47, safety: 72,
    bestSeason: "May–Sep (dry winter)", visa: "Visa-free for many passports up to 30 days",
    weather: "Subtropical, varied by altitude",
    tagline: "Africa's last absolute monarchy",
    blurb: "Umhlanga reed dance, the Malolotja highlands, and intimate wildlife reserves. Eswatini is a tiny kingdom with big cultural pride.",
    cities: [c("Mbabane", "Highland capital of the Swazi kingdom.")],
  },

  {
    id: "ethiopia", name: "Ethiopia", flag: "🇪🇹", continent: "Africa", region: "East Africa",
    capital: "Addis Ababa", currency: "Ethiopian Birr (ETB)", language: "Amharic",
    population: 126_500_000, timezone: "UTC+3 (EAT)",
    lat: 9.02, lng: 38.75, safety: 56,
    bestSeason: "Oct–Mar (dry season)", visa: "e-Visa available",
    weather: "Tropical highland, varied climates",
    tagline: "Land of origins",
    blurb: "Lalibela's rock-hewn churches, the Simien Mountains' jagged peaks, and the birthplace of coffee. Ethiopia has a calendar and script all its own.",
    cities: [c("Addis Ababa", "Diplomatic capital of Africa at 2,355m.")],
  },

  {
    id: "gabon", name: "Gabon", flag: "🇬🇦", continent: "Africa", region: "Central Africa",
    capital: "Libreville", currency: "Central African CFA Franc (XAF)", language: "French",
    population: 2_440_000, timezone: "UTC+1 (WAT)",
    lat: -0.8, lng: 11.61, safety: 66,
    bestSeason: "Jun–Sep (dry season)", visa: "e-Visa available",
    weather: "Tropical, equatorial",
    tagline: "Africa's Eden",
    blurb: "Loango National Park — where forest elephants roam beaches, surfing hippos, and pristine Atlantic coastline. Gabon is conservation at its wildest.",
    cities: [c("Libreville", "Coastal capital of rainforest and oil wealth.")],
  },

  {
    id: "gambia", name: "The Gambia", flag: "🇬🇲", continent: "Africa", region: "West Africa",
    capital: "Banjul", currency: "Gambian Dalasi (GMD)", language: "English",
    population: 2_770_000, timezone: "UTC+0 (GMT)",
    lat: 13.44, lng: -15.31, safety: 68,
    bestSeason: "Nov–Mar (dry season)", visa: "Visa-free for many passports",
    weather: "Tropical, wet and dry seasons",
    tagline: "The smiling coast of Africa",
    blurb: "The smallest country in mainland Africa, built around the Gambia River. Birdwatching paradise, golden beaches, and legendary hospitality.",
    cities: [c("Banjul", "Island capital at the mouth of the Gambia River.")],
  },

  {
    id: "ghana", name: "Ghana", flag: "🇬🇭", continent: "Africa", region: "West Africa",
    capital: "Accra", currency: "Ghanaian Cedi (GHS)", language: "English",
    population: 34_200_000, timezone: "UTC+0 (GMT)",
    lat: 5.6, lng: -0.19, safety: 72,
    bestSeason: "Nov–Mar (dry season)", visa: "Visa on arrival for many passports",
    weather: "Tropical, humid coast, drier north",
    tagline: "Gateway to Africa",
    blurb: "Cape Coast's slave-dungeon history, Accra's vibrant arts scene, and Mole National Park's elephants. Ghana is West Africa's cultural powerhouse.",
    cities: [c("Accra", "Atlantic capital of art, music, and jollof rice.")],
  },

  {
    id: "guinea", name: "Guinea", flag: "🇬🇳", continent: "Africa", region: "West Africa",
    capital: "Conakry", currency: "Guinean Franc (GNF)", language: "French",
    population: 14_200_000, timezone: "UTC+0 (GMT)",
    lat: 9.64, lng: -13.58, safety: 52,
    bestSeason: "Nov–Mar (dry season)", visa: "Visa required",
    weather: "Tropical, monsoonal",
    tagline: "The water tower of West Africa",
    blurb: "The source of the Niger, Senegal, and Gambia rivers. The Fouta Djallon highlands offer West Africa's best hiking with waterfalls and cliffs.",
    cities: [c("Conakry", "Peninsula capital on the Atlantic.")],
  },

  {
    id: "guinea-bissau", name: "Guinea-Bissau", flag: "🇬🇼", continent: "Africa", region: "West Africa",
    capital: "Bissau", currency: "West African CFA Franc (XOF)", language: "Portuguese",
    population: 2_160_000, timezone: "UTC+0 (GMT)",
    lat: 11.88, lng: -15.62, safety: 50,
    bestSeason: "Nov–Mar (dry season)", visa: "Visa on arrival",
    weather: "Tropical, wet and dry seasons",
    tagline: "Archipelago of the Bijagós",
    blurb: "The Bijagós Islands — a UNESCO Biosphere Reserve of mangroves, hippos, and matriarchal culture. Africa's last great coastal wilderness.",
    cities: [c("Bissau", "Crumbling colonial capital on the Geba River.")],
  },

  {
    id: "ivory-coast", name: "Ivory Coast", flag: "🇨🇮", continent: "Africa", region: "West Africa",
    capital: "Yamoussoukro", currency: "West African CFA Franc (XOF)", language: "French",
    population: 29_300_000, timezone: "UTC+0 (GMT)",
    lat: 6.83, lng: -5.47, safety: 62,
    bestSeason: "Nov–Mar (dry season)", visa: "e-Visa available",
    weather: "Tropical, humid",
    tagline: "The jewel of West Africa",
    blurb: "Yamoussoukro's Basilica — the world's largest church, Abidjan's skyscraper skyline, and Taï National Park's chimpanzees. West Africa rising.",
    cities: [c("Yamoussoukro", "Capital with the world's largest basilica."), c("Abidjan", "The Manhattan of West Africa.")],
  },

  // Kenya — existing, kept as-is
  {
    id: "kenya", name: "Kenya", flag: "🇰🇪", continent: "Africa", region: "East Africa",
    capital: "Nairobi", currency: "Kenyan Shilling (KES)", language: "Swahili, English",
    population: 55_100_000, timezone: "UTC+3 (EAT)",
    lat: -0.02, lng: 37.91, safety: 58,
    bestSeason: "Jun–Oct (Great Migration) & Jan–Feb", visa: "e-Visa available for most passports",
    weather: "Tropical, varied by altitude",
    tagline: "Safari dreams come true",
    blurb: "The Great Migration, Maasai Mara's endless plains, and Diani's white beaches. Kenya is the cradle of safari and home to some of Earth's greatest wildlife spectacles.",
    cities: [
      { id: "nairobi", name: "Nairobi", blurb: "Safari capital of the world.", attractions: ["Nairobi National Park", "David Sheldrick Wildlife Trust", "Giraffe Centre"], hotels: [{ name: "Giraffe Manor", tier: "Luxury" }, { name: "Milimani Backpackers", tier: "Budget" }], restaurants: [{ name: "Carnivore", cuisine: "Nyama Choma" }], transport: "Uber, matatus." },
    ],
  },

  // ... (adding remaining African countries — approximately 35 more)
  // Using compact format for the remaining ones

  { id: "lesotho", name: "Lesotho", flag: "🇱🇸", continent: "Africa", region: "Southern Africa", capital: "Maseru", currency: "Lesotho Loti (LSL)", language: "Sesotho, English", population: 2_330_000, timezone: "UTC+2 (SAST)", lat: -29.6, lng: 28.21, safety: 70, bestSeason: "Mar–May & Sep–Nov", visa: "Visa-free for many passports up to 90 days", weather: "Temperate highland", tagline: "The Kingdom in the Sky", blurb: "The only country entirely above 1,000m. Pony trekking through the Maloti Mountains and the highest pub in Africa.", cities: [c("Maseru", "Capital perched in the highlands.")] },

  { id: "liberia", name: "Liberia", flag: "🇱🇷", continent: "Africa", region: "West Africa", capital: "Monrovia", currency: "Liberian Dollar (LRD)", language: "English", population: 5_500_000, timezone: "UTC+0 (GMT)", lat: 6.43, lng: -9.43, safety: 50, bestSeason: "Nov–Mar (dry season)", visa: "Visa required — some visas on arrival", weather: "Tropical, very humid", tagline: "The Land of the Free", blurb: "Founded by freed American slaves. Sapo National Park's rainforest, Monrovia's Atlantic beaches, and a unique Americo-Liberian heritage.", cities: [c("Monrovia", "Coastal capital founded by freed slaves.")] },

  { id: "libya", name: "Libya", flag: "🇱🇾", continent: "Africa", region: "North Africa", capital: "Tripoli", currency: "Libyan Dinar (LYD)", language: "Arabic", population: 6_900_000, timezone: "UTC+2 (EET)", lat: 32.88, lng: 13.19, safety: 25, bestSeason: "Winter (Nov–Mar)", visa: "Visa required — check travel advisories", weather: "Mediterranean coast, Saharan interior", tagline: "Roman ruins in the Sahara", blurb: "Leptis Magna — the Mediterranean's best-preserved Roman city, the Sahara's Ubari Lakes, and Tripoli's medina. Libya is ancient wonder awaiting rediscovery.", cities: [c("Tripoli", "Mediterranean capital of ancient empires.")] },

  { id: "madagascar", name: "Madagascar", flag: "🇲🇬", continent: "Africa", region: "East Africa", capital: "Antananarivo", currency: "Malagasy Ariary (MGA)", language: "Malagasy, French", population: 30_300_000, timezone: "UTC+3 (EAT)", lat: -18.77, lng: 46.87, safety: 62, bestSeason: "Apr–Oct (dry season)", visa: "Visa on arrival", weather: "Tropical, varied by region", tagline: "The eighth continent", blurb: "90% of wildlife found nowhere else — lemurs, baobab avenues, and the otherworldly Tsingy stone forest. Madagascar is evolution's laboratory.", cities: [c("Antananarivo", "City of a thousand warriors in the highlands.")] },

  { id: "malawi", name: "Malawi", flag: "🇲🇼", continent: "Africa", region: "East Africa", capital: "Lilongwe", currency: "Malawian Kwacha (MWK)", language: "English, Chichewa", population: 20_900_000, timezone: "UTC+2 (CAT)", lat: -13.25, lng: 34.3, safety: 66, bestSeason: "May–Oct (dry season)", visa: "e-Visa available", weather: "Subtropical, warm", tagline: "The Warm Heart of Africa", blurb: "Lake Malawi's crystal waters — one of the world's great freshwater seas, with more fish species than any other lake. Simple, beautiful, welcoming.", cities: [c("Lilongwe", "Capital divided into old and new towns.")] },

  { id: "mali", name: "Mali", flag: "🇲🇱", continent: "Africa", region: "West Africa", capital: "Bamako", currency: "West African CFA Franc (XOF)", language: "French, Bambara", population: 23_300_000, timezone: "UTC+0 (GMT)", lat: 17.57, lng: -3.99, safety: 28, bestSeason: "Nov–Feb (cooler dry season)", visa: "Visa required", weather: "Hot desert and Sahel", tagline: "Empire of gold and mud", blurb: "Timbuktu's legendary libraries, the Great Mosque of Djenné — the world's largest mud-brick building, and the Dogon cliff villages.", cities: [c("Bamako", "Niger River capital of music and markets.")] },

  { id: "mauritania", name: "Mauritania", flag: "🇲🇷", continent: "Africa", region: "North Africa", capital: "Nouakchott", currency: "Mauritanian Ouguiya (MRU)", language: "Arabic", population: 4_900_000, timezone: "UTC+0 (GMT)", lat: 20.25, lng: -10.35, safety: 46, bestSeason: "Nov–Mar (cooler season)", visa: "Visa on arrival", weather: "Hot desert, very hot", tagline: "Land of a thousand poets", blurb: "The Banc d'Arguin — a UNESCO coastal wilderness, ancient caravan cities, and the Eye of the Sahara. Mauritania is the Sahara at its most authentic.", cities: [c("Nouakchott", "Sahara-edge capital of poets and fishermen.")] },

  { id: "mauritius", name: "Mauritius", flag: "🇲🇺", continent: "Africa", region: "East Africa", capital: "Port Louis", currency: "Mauritian Rupee (MUR)", language: "English, French, Mauritian Creole", population: 1_260_000, timezone: "UTC+4 (MUT)", lat: -20.3, lng: 57.58, safety: 90, bestSeason: "May–Dec (drier, cooler)", visa: "Visa-free for most passports up to 90 days", weather: "Tropical, warm year-round", tagline: "Star and key of the Indian Ocean", blurb: "Pristine lagoons, volcanic peaks, and multicultural harmony. Mauritius is the Indian Ocean's ultimate honeymoon and luxury destination.", cities: [c("Port Louis", "Harbor capital of a tropical paradise.")] },

  // Morocco — existing, kept as-is
  {
    id: "morocco", name: "Morocco", flag: "🇲🇦", continent: "Africa", region: "North Africa",
    capital: "Rabat", currency: "Moroccan Dirham (MAD)", language: "Arabic, Berber, French",
    population: 37_800_000, timezone: "UTC+0/+1 (WET/WEST)",
    lat: 31.79, lng: -7.09, safety: 74,
    bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa-free up to 90 days for many passports",
    weather: "Mediterranean coast, hot arid interior",
    tagline: "A feast of color and spice",
    blurb: "Labyrinthine medinas, Saharan dunes, and the snow-capped Atlas. Morocco is a sensory overload in the best way.",
    cities: [
      { id: "marrakech", name: "Marrakech", blurb: "The Red City pulses with markets.", attractions: ["Jemaa el-Fnaa", "Bahia Palace", "Majorelle Garden"], hotels: [{ name: "La Mamounia", tier: "Luxury" }, { name: "Equity Point", tier: "Budget" }], restaurants: [{ name: "Nomad", cuisine: "Modern Moroccan" }], transport: "Walk the medina, taxis." },
    ],
  },

  { id: "mozambique", name: "Mozambique", flag: "🇲🇿", continent: "Africa", region: "East Africa", capital: "Maputo", currency: "Mozambican Metical (MZN)", language: "Portuguese", population: 33_900_000, timezone: "UTC+2 (CAT)", lat: -25.97, lng: 32.57, safety: 54, bestSeason: "Jun–Oct (dry season)", visa: "Visa on arrival / e-Visa", weather: "Tropical, Indian Ocean coast", tagline: "The pearl of the Indian Ocean", blurb: "Bazaruto Archipelago's turquoise waters, Maputo's Afro-Portuguese charm, and the world's best diving. Mozambique is Africa's beach paradise.", cities: [c("Maputo", "Coastal capital with Portuguese soul.")] },

  { id: "namibia", name: "Namibia", flag: "🇳🇦", continent: "Africa", region: "Southern Africa", capital: "Windhoek", currency: "Namibian Dollar (NAD)", language: "English", population: 2_600_000, timezone: "UTC+2 (CAT)", lat: -22.56, lng: 17.07, safety: 82, bestSeason: "May–Oct (dry season)", visa: "Visa-free for many passports up to 90 days", weather: "Subtropical desert, semi-arid", tagline: "Land of endless horizons", blurb: "Sossusvlei's blood-red dunes, Etosha's vast salt pan teeming with wildlife, and the Skeleton Coast. Namibia is landscape photography heaven.", cities: [c("Windhoek", "German-influenced capital in the highlands.")] },

  { id: "niger", name: "Niger", flag: "🇳🇪", continent: "Africa", region: "West Africa", capital: "Niamey", currency: "West African CFA Franc (XOF)", language: "French", population: 27_200_000, timezone: "UTC+1 (WAT)", lat: 13.51, lng: 2.11, safety: 32, bestSeason: "Nov–Feb (cooler season)", visa: "Visa required", weather: "Hot desert, Sahel", tagline: "The cross of the Sahara", blurb: "The Ténéré Desert's grand emptiness, the Sultan's Palace of Zinder, and the W National Park. Niger is vast, raw, and deeply traditional.", cities: [c("Niamey", "Niger River capital of the Sahel.")] },

  { id: "nigeria", name: "Nigeria", flag: "🇳🇬", continent: "Africa", region: "West Africa", capital: "Abuja", currency: "Nigerian Naira (NGN)", language: "English", population: 223_800_000, timezone: "UTC+1 (WAT)", lat: 9.08, lng: 7.4, safety: 46, bestSeason: "Nov–Feb (dry season)", visa: "e-Visa available", weather: "Tropical, wet and dry seasons", tagline: "The giant of Africa", blurb: "Lagos' explosive energy — Africa's biggest city, Nollywood films, and the vibrant Afrobeat scene. Nigeria is Africa's cultural and economic powerhouse.", cities: [c("Abuja", "Planned capital at the geographic center."), c("Lagos", "Africa's largest megacity — 24/7 energy.")] },

  { id: "rwanda", name: "Rwanda", flag: "🇷🇼", continent: "Africa", region: "East Africa", capital: "Kigali", currency: "Rwandan Franc (RWF)", language: "Kinyarwanda, French, English", population: 14_100_000, timezone: "UTC+2 (CAT)", lat: -1.94, lng: 30.06, safety: 78, bestSeason: "Jun–Sep & Dec–Feb (dry seasons)", visa: "Visa-free for many African nations; e-Visa for others", weather: "Tropical highland, mild", tagline: "Land of a Thousand Hills", blurb: "Mountain gorillas in Volcanoes National Park, Kigali's spotless streets, and Lake Kivu's serene shores. Rwanda is Africa's success story.", cities: [c("Kigali", "Clean, green capital of a thousand hills.")] },

  { id: "sao-tome", name: "São Tomé and Príncipe", flag: "🇸🇹", continent: "Africa", region: "Central Africa", capital: "São Tomé", currency: "São Tomé and Príncipe Dobra (STN)", language: "Portuguese", population: 230_000, timezone: "UTC+0 (GMT)", lat: 0.34, lng: 6.73, safety: 82, bestSeason: "Jun–Sep (dry season)", visa: "Visa-free for many passports", weather: "Tropical, equatorial", tagline: "Africa's Galápagos", blurb: "The world's smallest Portuguese-speaking country. Pristine rainforests, cocoa plantations, and the surreal Pico Cão Grande needle.", cities: [c("São Tomé", "Colonial capital of the chocolate islands.")] },

  { id: "senegal", name: "Senegal", flag: "🇸🇳", continent: "Africa", region: "West Africa", capital: "Dakar", currency: "West African CFA Franc (XOF)", language: "French, Wolof", population: 18_100_000, timezone: "UTC+0 (GMT)", lat: 14.69, lng: -17.44, safety: 72, bestSeason: "Nov–Mar (dry season)", visa: "Visa-free for many passports", weather: "Tropical Sahel, coastal breezes", tagline: "The Teranga nation", blurb: "Dakar's Ile de Gorée — a UNESCO slave-trade memorial, Lac Rose's pink waters, and legendary Senegalese hospitality (teranga). West Africa at its most welcoming.", cities: [c("Dakar", "Peninsula capital of music and hospitality.")] },

  { id: "seychelles", name: "Seychelles", flag: "🇸🇨", continent: "Africa", region: "East Africa", capital: "Victoria", currency: "Seychellois Rupee (SCR)", language: "Seychellois Creole, English, French", population: 130_000, timezone: "UTC+4 (SCT)", lat: -4.68, lng: 55.49, safety: 94, bestSeason: "Apr–Oct (drier, trade winds)", visa: "Visa-free for all nationalities", weather: "Tropical, warm and humid", tagline: "Another world", blurb: "Giant granite boulders on powder-white sands, the coco de mer palm, and some of Earth's most pristine reefs. The Seychelles defines island luxury.", cities: [c("Victoria", "One of the world's smallest capitals.")] },

  { id: "sierra-leone", name: "Sierra Leone", flag: "🇸🇱", continent: "Africa", region: "West Africa", capital: "Freetown", currency: "Sierra Leonean Leone (SLE)", language: "English, Krio", population: 8_800_000, timezone: "UTC+0 (GMT)", lat: 8.47, lng: -11.78, safety: 56, bestSeason: "Nov–Mar (dry season)", visa: "e-Visa available", weather: "Tropical, very humid", tagline: "The Lion Mountain", blurb: "Freetown's historic Cotton Tree, white-sand Atlantic beaches, and the Tacugama chimpanzee sanctuary. Sierra Leone is on the rise.", cities: [c("Freetown", "Coastal capital beneath the Lion Mountain.")] },

  { id: "somalia", name: "Somalia", flag: "🇸🇴", continent: "Africa", region: "East Africa", capital: "Mogadishu", currency: "Somali Shilling (SOS)", language: "Somali, Arabic", population: 18_100_000, timezone: "UTC+3 (EAT)", lat: 2.05, lng: 45.34, safety: 14, bestSeason: "Nov–Feb (drier)", visa: "Visa required — check safety advisories", weather: "Arid to semi-arid, very hot", tagline: "Horn of Africa spirit", blurb: "Mogadishu's Indian Ocean promenade — the longest coastline on mainland Africa, ancient cave paintings at Laas Geel, and a proud nomadic heritage.", cities: [c("Mogadishu", "Ancient port city on the longest African coastline.")] },

  // South Africa — existing, kept as-is
  {
    id: "south-africa", name: "South Africa", flag: "🇿🇦", continent: "Africa", region: "Southern Africa",
    capital: "Pretoria (executive)", currency: "South African Rand (R)", language: "11 official languages incl. English",
    population: 60_400_000, timezone: "UTC+2 (SAST)",
    lat: -30.56, lng: 22.94, safety: 55,
    bestSeason: "Summer (Nov–Mar) for beaches, Winter (Jun–Aug) for safaris", visa: "Visa-free for many passports up to 90 days",
    weather: "Mostly temperate, Mediterranean south-west",
    tagline: "A world in one country",
    blurb: "Cape Town's Table Mountain, Kruger's Big Five, and the Garden Route. South Africa delivers stunning diversity — wildlife, wine, and warm people.",
    cities: [
      { id: "cape-town", name: "Cape Town", blurb: "Where mountains meet the sea.", attractions: ["Table Mountain", "Boulders Beach", "V&A Waterfront"], hotels: [{ name: "One&Only", tier: "Luxury" }, { name: "The Backpack", tier: "Budget" }], restaurants: [{ name: "The Test Kitchen", cuisine: "Fine dining" }], transport: "MyCiTi bus, Uber." },
    ],
  },

  { id: "south-sudan", name: "South Sudan", flag: "🇸🇸", continent: "Africa", region: "East Africa", capital: "Juba", currency: "South Sudanese Pound (SSP)", language: "English", population: 11_100_000, timezone: "UTC+2 (CAT)", lat: 7.87, lng: 30.23, safety: 18, bestSeason: "Nov–Mar (dry season)", visa: "Visa required", weather: "Tropical savanna, hot", tagline: "The world's youngest nation", blurb: "The Sudd — one of the world's largest wetlands, the White Nile, and traditional cattle camps. South Sudan is a frontier of raw nature.", cities: [c("Juba", "Young capital on the White Nile.")] },

  { id: "sudan", name: "Sudan", flag: "🇸🇩", continent: "Africa", region: "North Africa", capital: "Khartoum", currency: "Sudanese Pound (SDG)", language: "Arabic, English", population: 48_100_000, timezone: "UTC+2 (CAT)", lat: 15.5, lng: 32.56, safety: 22, bestSeason: "Nov–Feb (cooler)", visa: "Visa required", weather: "Hot desert, Nile valley", tagline: "Nubia's ancient heart", blurb: "More pyramids than Egypt — the royal tombs of Meroë, the confluence of the Blue and White Nile at Khartoum, and Nubian hospitality.", cities: [c("Khartoum", "Where the two Niles meet.")] },

  // Tanzania — existing, kept as-is
  {
    id: "tanzania", name: "Tanzania", flag: "🇹🇿", continent: "Africa", region: "East Africa",
    capital: "Dodoma", currency: "Tanzanian Shilling (TZS)", language: "Swahili, English",
    population: 67_400_000, timezone: "UTC+3 (EAT)",
    lat: -6.37, lng: 34.89, safety: 63,
    bestSeason: "Jun–Oct (dry season for safaris)", visa: "e-Visa or visa on arrival",
    weather: "Tropical, coastal hot and humid",
    tagline: "The roof of Africa",
    blurb: "Kilimanjaro's snow-capped peak, Serengeti's endless plains, and Zanzibar's spice-scented alleys. Tanzania is East Africa's crown jewel.",
    cities: [
      { id: "zanzibar", name: "Zanzibar City", blurb: "Spice island paradise.", attractions: ["Stone Town", "Nungwi Beach", "Jozani Forest"], hotels: [{ name: "Park Hyatt Zanzibar", tier: "Luxury" }, { name: "Lost & Found Hostel", tier: "Budget" }], restaurants: [{ name: "The Rock", cuisine: "Seafood" }], transport: "Taxis, dala-dalas." },
    ],
  },

  { id: "togo", name: "Togo", flag: "🇹🇬", continent: "Africa", region: "West Africa", capital: "Lomé", currency: "West African CFA Franc (XOF)", language: "French", population: 9_100_000, timezone: "UTC+0 (GMT)", lat: 6.14, lng: 1.21, safety: 60, bestSeason: "Nov–Mar (dry season)", visa: "Visa on arrival / e-Visa", weather: "Tropical, humid", tagline: "West Africa in miniature", blurb: "Togoville's voodoo shrines, Lomé's palm-fringed boulevard, and Koutammakou's mud tower houses. A tiny country of deep traditions.", cities: [c("Lomé", "Palm-lined coastal capital.")] },

  { id: "tunisia", name: "Tunisia", flag: "🇹🇳", continent: "Africa", region: "North Africa", capital: "Tunis", currency: "Tunisian Dinar (TND)", language: "Arabic, French", population: 12_500_000, timezone: "UTC+1 (CET)", lat: 36.81, lng: 10.18, safety: 72, bestSeason: "Spring (Mar–May) & Autumn (Sep–Nov)", visa: "Visa-free for many passports up to 90 days", weather: "Mediterranean north, Sahara south", tagline: "Where the Arab Spring began", blurb: "Carthage's ancient ruins, Sidi Bou Said's blue-and-white village, and the Sahara's Star Wars film sets. Tunisia is Mediterranean meets desert.", cities: [c("Tunis", "Capital where Carthage meets the medina.")] },

  { id: "uganda", name: "Uganda", flag: "🇺🇬", continent: "Africa", region: "East Africa", capital: "Kampala", currency: "Ugandan Shilling (UGX)", language: "English, Swahili", population: 48_600_000, timezone: "UTC+3 (EAT)", lat: 0.35, lng: 32.58, safety: 58, bestSeason: "Jun–Sep & Dec–Feb (dry seasons)", visa: "e-Visa available", weather: "Tropical, equatorial highlands", tagline: "The Pearl of Africa", blurb: "Bwindi's mountain gorillas — half the world's population, Murchison Falls where the Nile squeezes through a 7m gap, and Lake Victoria's shores.", cities: [c("Kampala", "Hilly capital on the shores of Lake Victoria.")] },

  { id: "zambia", name: "Zambia", flag: "🇿🇲", continent: "Africa", region: "Southern Africa", capital: "Lusaka", currency: "Zambian Kwacha (ZMW)", language: "English", population: 20_500_000, timezone: "UTC+2 (CAT)", lat: -15.39, lng: 28.32, safety: 66, bestSeason: "May–Oct (dry season)", visa: "e-Visa available", weather: "Subtropical, varied", tagline: "The real Africa", blurb: "Victoria Falls' smoke that thunders, walking safaris in South Luangwa, and the mighty Zambezi. Zambia is safari in its purest, most intimate form.", cities: [c("Lusaka", "Capital of the copper belt and gateway to Victoria Falls.")] },

  { id: "zimbabwe", name: "Zimbabwe", flag: "🇿🇼", continent: "Africa", region: "Southern Africa", capital: "Harare", currency: "Zimbabwean Dollar (ZWL)", language: "English, Shona, Ndebele", population: 16_600_000, timezone: "UTC+2 (CAT)", lat: -17.83, lng: 31.05, safety: 58, bestSeason: "May–Oct (dry season)", visa: "Visa on arrival for many passports", weather: "Subtropical, varied", tagline: "Legacy of Great Zimbabwe", blurb: "The ancient stone city of Great Zimbabwe, Victoria Falls' Devil's Pool, and Hwange's elephant herds. Zimbabwe is the soul of southern Africa.", cities: [c("Harare", "Garden city with jacaranda-lined streets.")] },

  // ═══════════════════════════════════════════════════════════════
  //  NORTH AMERICA  (23 members)
  // ═══════════════════════════════════════════════════════════════

  { id: "antigua-barbuda", name: "Antigua and Barbuda", flag: "🇦🇬", continent: "North America", region: "Caribbean", capital: "Saint John's", currency: "East Caribbean Dollar (XCD)", language: "English", population: 94_000, timezone: "UTC-4 (AST)", lat: 17.12, lng: -61.85, safety: 88, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports up to 6 months", weather: "Tropical, warm year-round", tagline: "Land of 365 beaches", blurb: "A beach for every day of the year, Nelson's Dockyard — a UNESCO marina, and Caribbean sailing culture. Antigua is the classic island getaway.", cities: [c("Saint John's", "Caribbean capital of 365 beaches.")] },

  { id: "bahamas", name: "The Bahamas", flag: "🇧🇸", continent: "North America", region: "Caribbean", capital: "Nassau", currency: "Bahamian Dollar (BSD)", language: "English", population: 400_000, timezone: "UTC-5 (EST)", lat: 25.03, lng: -77.4, safety: 84, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports", weather: "Tropical, warm year-round", tagline: "It's better in the Bahamas", blurb: "The swimming pigs of Exuma, Nassau's pink government buildings, and 700 islands of turquoise sea. The Bahamas equals paradise.", cities: [c("Nassau", "Capital of pink buildings and pirate history.")] },

  { id: "barbados", name: "Barbados", flag: "🇧🇧", continent: "North America", region: "Caribbean", capital: "Bridgetown", currency: "Barbadian Dollar (BBD)", language: "English", population: 280_000, timezone: "UTC-4 (AST)", lat: 13.19, lng: -59.54, safety: 90, bestSeason: "Dec–May (dry season)", visa: "Visa-free for many passports up to 6 months", weather: "Tropical, cooling trade winds", tagline: "The birthplace of rum", blurb: "Mount Gay rum — the world's oldest, crystal-clear Caribbean waters, and Oistins' Friday-night fish fry. Barbados is pure Caribbean charm.", cities: [c("Bridgetown", "UNESCO-listed capital and rum heritage.")] },

  { id: "belize", name: "Belize", flag: "🇧🇿", continent: "North America", region: "Central America", capital: "Belmopan", currency: "Belize Dollar (BZD)", language: "English", population: 410_000, timezone: "UTC-6 (CST)", lat: 17.19, lng: -88.5, safety: 70, bestSeason: "Nov–Apr (dry season)", visa: "Visa-free for many passports", weather: "Subtropical, humid", tagline: "The jewel in the Caribbean crown", blurb: "The Great Blue Hole — one of Earth's most famous dive sites, ancient Maya temples in the jungle, and the world's second-largest barrier reef.", cities: [c("Belmopan", "Smallest capital in the Americas.")] },

  // Canada — existing, kept as-is
  {
    id: "canada", name: "Canada", flag: "🇨🇦", continent: "North America", region: "Northern America",
    capital: "Ottawa", currency: "Canadian Dollar (C$)", language: "English, French",
    population: 40_100_000, timezone: "UTC-3:30 to -8 (NST/PST)",
    lat: 56.13, lng: -106.35, safety: 91,
    bestSeason: "Summer (Jun–Aug) & Fall foliage (Sep–Oct)", visa: "eTA required for many visa-exempt passports",
    weather: "Cold winters, mild summers",
    tagline: "Wild peaks and friendly cities",
    blurb: "Glacier-fed lakes, towering Rockies, and cosmopolitan cities. Canada pairs vast wilderness with warm, multicultural urban life.",
    cities: [
      { id: "banff", name: "Banff", blurb: "Mountain town in the Rockies.", attractions: ["Lake Louise", "Moraine Lake", "Banff Gondola"], hotels: [{ name: "Fairmont Banff Springs", tier: "Luxury" }, { name: "Samesun Banff", tier: "Budget" }], restaurants: [{ name: "Eden", cuisine: "Fine dining" }], transport: "Rent a car for the Icefields Parkway." },
    ],
  },

  // Costa Rica — existing, kept as-is
  {
    id: "costa-rica", name: "Costa Rica", flag: "🇨🇷", continent: "North America", region: "Central America",
    capital: "San José", currency: "Costa Rican Colón (₡)", language: "Spanish",
    population: 5_200_000, timezone: "UTC-6 (CST)",
    lat: 9.75, lng: -83.75, safety: 84,
    bestSeason: "Dry season (Dec–Apr)", visa: "Visa-free for most passports",
    weather: "Tropical, dry and rainy seasons",
    tagline: "Pura vida in the rainforest",
    blurb: "Zip-line through cloud forests, surf Pacific waves, and spot howler monkeys. Costa Rica is the blueprint for eco-tourism done right.",
    cities: [
      { id: "san-jose", name: "San José", blurb: "Gateway to paradise.", attractions: ["Arenal Volcano", "Manuel Antonio", "Monteverde"], hotels: [{ name: "Nayara Springs", tier: "Luxury" }, { name: "Selina Hostel", tier: "Budget" }], restaurants: [{ name: "Sikwa", cuisine: "Costa Rican" }], transport: "Shuttles and rental cars." },
    ],
  },

  // Cuba — existing, kept as-is
  {
    id: "cuba", name: "Cuba", flag: "🇨🇺", continent: "North America", region: "Caribbean",
    capital: "Havana", currency: "Cuban Peso (CUP)", language: "Spanish",
    population: 11_200_000, timezone: "UTC-5 (CST)",
    lat: 21.52, lng: -77.78, safety: 78,
    bestSeason: "Nov–Apr (dry season)", visa: "Tourist card required for most passports",
    weather: "Tropical, hurricane season Jun–Nov",
    tagline: "Frozen in time, alive with soul",
    blurb: "Classic cars, colonial architecture, and the sound of salsa on every corner. Cuba is a living museum with some of the Caribbean's most beautiful beaches.",
    cities: [
      { id: "havana", name: "Havana", blurb: "Timeless Caribbean capital.", attractions: ["Old Havana", "Malecón", "El Capitolio"], hotels: [{ name: "Hotel Nacional", tier: "Luxury" }, { name: "Casa Particulares", tier: "Budget" }], restaurants: [{ name: "La Guarida", cuisine: "Cuban" }], transport: "Classic car taxis, walking." },
    ],
  },

  { id: "dominica", name: "Dominica", flag: "🇩🇲", continent: "North America", region: "Caribbean", capital: "Roseau", currency: "East Caribbean Dollar (XCD)", language: "English", population: 73_000, timezone: "UTC-4 (AST)", lat: 15.41, lng: -61.37, safety: 86, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports up to 6 months", weather: "Tropical, lush", tagline: "The Nature Island", blurb: "Boiling Lake — the world's second-largest, 365 rivers, and untouched rainforest. Dominica is the Caribbean for adventurers, not beach-sitters.", cities: [c("Roseau", "Small capital of the Nature Island.")] },

  { id: "dominican-republic", name: "Dominican Republic", flag: "🇩🇴", continent: "North America", region: "Caribbean", capital: "Santo Domingo", currency: "Dominican Peso (DOP)", language: "Spanish", population: 11_300_000, timezone: "UTC-4 (AST)", lat: 18.74, lng: -70.16, safety: 68, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports", weather: "Tropical, warm year-round", tagline: "It has it all", blurb: "Santo Domingo — the New World's first European city, Punta Cana's endless beaches, and merengue rhythms. The DR is the Caribbean's most diverse destination.", cities: [c("Santo Domingo", "First city of the Americas."), c("Punta Cana", "Caribbean's most famous beach resort zone.")] },

  { id: "el-salvador", name: "El Salvador", flag: "🇸🇻", continent: "North America", region: "Central America", capital: "San Salvador", currency: "US Dollar ($)", language: "Spanish", population: 6_360_000, timezone: "UTC-6 (CST)", lat: 13.79, lng: -88.9, safety: 56, bestSeason: "Nov–Mar (dry season)", visa: "Visa-free for many passports", weather: "Tropical, warm", tagline: "The land of volcanoes", blurb: "El Tunco's world-class surf, the Santa Ana volcano's emerald crater lake, and the Ruta de las Flores. Compact, affordable, and full of surprises.", cities: [c("San Salvador", "Capital ringed by volcanoes.")] },

  { id: "grenada", name: "Grenada", flag: "🇬🇩", continent: "North America", region: "Caribbean", capital: "Saint George's", currency: "East Caribbean Dollar (XCD)", language: "English", population: 126_000, timezone: "UTC-4 (AST)", lat: 12.12, lng: -61.68, safety: 88, bestSeason: "Jan–May (drier)", visa: "Visa-free for many passports", weather: "Tropical, warm", tagline: "The Spice Isle", blurb: "Nutmeg-scented air, Grand Anse's two-mile crescent of white sand, and the world's first underwater sculpture park. Grenada is intoxicating.", cities: [c("Saint George's", "Horseshoe-harbor capital of the Spice Isle.")] },

  { id: "guatemala", name: "Guatemala", flag: "🇬🇹", continent: "North America", region: "Central America", capital: "Guatemala City", currency: "Guatemalan Quetzal (GTQ)", language: "Spanish", population: 18_100_000, timezone: "UTC-6 (CST)", lat: 14.63, lng: -90.51, safety: 54, bestSeason: "Nov–Mar (dry season)", visa: "Visa-free for many passports", weather: "Tropical highlands, varied", tagline: "Heart of the Maya world", blurb: "Tikal's jungle pyramids, Lake Atitlán ringed by volcanoes, and Antigua's cobblestone charm. Guatemala is Maya culture, living and breathing.", cities: [c("Guatemala City", "Central American hub in a valley of volcanoes."), c("Antigua", "Colonial jewel beneath three volcanoes.")] },

  { id: "haiti", name: "Haiti", flag: "🇭🇹", continent: "North America", region: "Caribbean", capital: "Port-au-Prince", currency: "Haitian Gourde (HTG)", language: "Haitian Creole, French", population: 11_700_000, timezone: "UTC-5 (EST)", lat: 19.05, lng: -72.33, safety: 30, bestSeason: "Nov–Mar (drier)", visa: "Visa-free for many passports up to 90 days", weather: "Tropical, hot", tagline: "The first Black republic", blurb: "The Citadelle Laferrière — the Western Hemisphere's largest fortress, vibrant Vodou art, and the resilience of the first nation born from a slave revolt.", cities: [c("Port-au-Prince", "Caribbean capital of art and resilience.")] },

  { id: "honduras", name: "Honduras", flag: "🇭🇳", continent: "North America", region: "Central America", capital: "Tegucigalpa", currency: "Honduran Lempira (HNL)", language: "Spanish", population: 10_500_000, timezone: "UTC-6 (CST)", lat: 15.2, lng: -86.24, safety: 46, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports", weather: "Tropical, varied by altitude", tagline: "The original banana republic", blurb: "Copán's Maya ruins — some of the finest in Mesoamerica, the Bay Islands' world-class diving, and cloud forests teeming with wildlife.", cities: [c("Tegucigalpa", "Mountain-ringed capital of Central America.")] },

  { id: "jamaica", name: "Jamaica", flag: "🇯🇲", continent: "North America", region: "Caribbean", capital: "Kingston", currency: "Jamaican Dollar (JMD)", language: "English, Jamaican Patois", population: 2_820_000, timezone: "UTC-5 (EST)", lat: 18.11, lng: -77.3, safety: 64, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports", weather: "Tropical, warm year-round", tagline: "Yeah mon, no problem", blurb: "The birthplace of reggae, Bob Marley's Kingston, Dunn's River Falls, and jerk chicken. Jamaica is pure vibe — music, food, and soul.", cities: [c("Kingston", "Birthplace of reggae and Caribbean culture.")] },

  // Mexico — existing, kept as-is
  {
    id: "mexico", name: "Mexico", flag: "🇲🇽", continent: "North America", region: "Central America",
    capital: "Mexico City", currency: "Mexican Peso (MX$)", language: "Spanish",
    population: 128_500_000, timezone: "UTC-5 to -8 (CST/PST)",
    lat: 23.63, lng: -102.55, safety: 60,
    bestSeason: "Dry season (Nov–Apr)", visa: "Visa-free for many passports up to 180 days",
    weather: "Varies — coastal tropical, highland temperate",
    tagline: "Ancient pyramids, modern soul",
    blurb: "Mayan ruins rising from the jungle, tequila in Jalisco, and the world's best street tacos. Mexico is a feast of color, history, and warmth.",
    cities: [
      { id: "cancun", name: "Cancún", blurb: "Caribbean beaches and Mayan ruins.", attractions: ["Chichén Itzá", "Isla Mujeres", "Cenotes"], hotels: [{ name: "NIZUC Resort", tier: "Luxury" }, { name: "Hostel Ka'beh", tier: "Budget" }], restaurants: [{ name: "La Habichuela", cuisine: "Yucatecan" }], transport: "Buses, colectivos, taxis." },
    ],
  },

  { id: "nicaragua", name: "Nicaragua", flag: "🇳🇮", continent: "North America", region: "Central America", capital: "Managua", currency: "Nicaraguan Córdoba (NIO)", language: "Spanish", population: 7_000_000, timezone: "UTC-6 (CST)", lat: 12.13, lng: -86.25, safety: 62, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports", weather: "Tropical, warm", tagline: "Land of lakes and volcanoes", blurb: "Granada's colorful colonial streets, surfing on the Pacific, and the twin-volcano island of Ometepe in Lake Nicaragua.", cities: [c("Managua", "Lakeside capital recovering and vibrant."), c("Granada", "Colonial jewel on Lake Nicaragua.")] },

  { id: "panama", name: "Panama", flag: "🇵🇦", continent: "North America", region: "Central America", capital: "Panama City", currency: "Panamanian Balboa (PAB)", language: "Spanish", population: 4_500_000, timezone: "UTC-5 (EST)", lat: 8.98, lng: -79.52, safety: 74, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports", weather: "Tropical, humid", tagline: "The crossroads of the world", blurb: "The Panama Canal — an engineering wonder, Panama City's glass skyline, and the San Blas Islands of the Guna people. A bridge between oceans.", cities: [c("Panama City", "Skyscraper capital of Central America.")] },

  { id: "st-kitts-nevis", name: "Saint Kitts and Nevis", flag: "🇰🇳", continent: "North America", region: "Caribbean", capital: "Basseterre", currency: "East Caribbean Dollar (XCD)", language: "English", population: 48_000, timezone: "UTC-4 (AST)", lat: 17.3, lng: -62.73, safety: 90, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports", weather: "Tropical, cooling trade winds", tagline: "The Sugar City", blurb: "Brimstone Hill Fortress — the 'Gibraltar of the West Indies,' the scenic Sugar Train, and two volcanic islands of untouched Caribbean beauty.", cities: [c("Basseterre", "Historic sugar capital turned tropical escape.")] },

  { id: "st-lucia", name: "Saint Lucia", flag: "🇱🇨", continent: "North America", region: "Caribbean", capital: "Castries", currency: "East Caribbean Dollar (XCD)", language: "English", population: 180_000, timezone: "UTC-4 (AST)", lat: 13.91, lng: -60.98, safety: 88, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports up to 6 weeks", weather: "Tropical, warm", tagline: "Simply beautiful", blurb: "The Pitons — twin volcanic spires rising from the sea, Sulphur Springs' drive-in volcano, and some of the Caribbean's best luxury resorts.", cities: [c("Castries", "Harbor capital beneath the Pitons.")] },

  { id: "st-vincent", name: "Saint Vincent and the Grenadines", flag: "🇻🇨", continent: "North America", region: "Caribbean", capital: "Kingstown", currency: "East Caribbean Dollar (XCD)", language: "English", population: 104_000, timezone: "UTC-4 (AST)", lat: 13.25, lng: -61.19, safety: 86, bestSeason: "Dec–Apr (dry season)", visa: "Visa-free for many passports", weather: "Tropical, warm", tagline: "Jewels of the Caribbean", blurb: "The Tobago Cays — a protected marine park of turquoise lagoons, La Soufrière volcano, and some of the Caribbean's most pristine sailing grounds.", cities: [c("Kingstown", "Gateway to the Grenadines' turquoise waters.")] },

  { id: "trinidad-tobago", name: "Trinidad and Tobago", flag: "🇹🇹", continent: "North America", region: "Caribbean", capital: "Port of Spain", currency: "Trinidad and Tobago Dollar (TTD)", language: "English", population: 1_530_000, timezone: "UTC-4 (AST)", lat: 10.69, lng: -61.22, safety: 62, bestSeason: "Jan–May (dry season)", visa: "Visa-free for many passports", weather: "Tropical, warm", tagline: "The birthplace of Carnival", blurb: "Trinidad's explosive Carnival — one of the world's greatest parties, Tobago's quiet beaches, and steelpan music. The Caribbean's cultural capital.", cities: [c("Port of Spain", "Carnival capital of the Caribbean.")] },

  // USA — existing, kept as-is
  {
    id: "usa", name: "United States", flag: "🇺🇸", continent: "North America", region: "Northern America",
    capital: "Washington, D.C.", currency: "US Dollar ($)", language: "English",
    population: 335_000_000, timezone: "UTC-5 to -10 (EST/HST)",
    lat: 37.09, lng: -95.71, safety: 72,
    bestSeason: "Varies widely by region", visa: "ESTA required for many visa-exempt passports",
    weather: "Vast — arctic Alaska to subtropical Florida",
    tagline: "The land of the free and the brave",
    blurb: "From Manhattan's skyline to the Grand Canyon, the USA offers jaw-dropping diversity. National parks, world cities, and every cuisine imaginable.",
    cities: [
      { id: "nyc", name: "New York City", blurb: "The city that never sleeps.", attractions: ["Statue of Liberty", "Central Park", "Times Square"], hotels: [{ name: "The Plaza", tier: "Luxury" }, { name: "HI NYC", tier: "Budget" }], restaurants: [{ name: "Le Bernardin", cuisine: "Seafood" }], transport: "Subway 24/7, yellow cabs." },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  //  SOUTH AMERICA  (12 members)
  // ═══════════════════════════════════════════════════════════════

  // Argentina — existing, kept as-is
  {
    id: "argentina", name: "Argentina", flag: "🇦🇷", continent: "South America", region: "Southern Cone",
    capital: "Buenos Aires", currency: "Argentine Peso (AR$)", language: "Spanish",
    population: 45_800_000, timezone: "UTC-3 (ART)",
    lat: -38.42, lng: -63.62, safety: 72,
    bestSeason: "Spring (Sep–Nov) & Autumn (Mar–May)", visa: "Visa-free for most passports up to 90 days",
    weather: "Varied — subtropical north, subpolar south",
    tagline: "Tango, steak, and Patagonia",
    blurb: "Buenos Aires' European grandeur, Patagonia's glaciers, and Mendoza's Malbec. Argentina is passion on a plate and landscapes that steal your breath.",
    cities: [
      { id: "buenos-aires", name: "Buenos Aires", blurb: "The Paris of South America.", attractions: ["La Boca", "Recoleta Cemetery", "Palermo Soho"], hotels: [{ name: "Alvear Palace", tier: "Luxury" }, { name: "Milhouse Hostel", tier: "Budget" }], restaurants: [{ name: "Don Julio", cuisine: "Steakhouse" }], transport: "Subte metro, buses." },
    ],
  },

  { id: "bolivia", name: "Bolivia", flag: "🇧🇴", continent: "South America", region: "Andes", capital: "Sucre (const.)", currency: "Bolivian Boliviano (BOB)", language: "Spanish, Quechua, Aymara", population: 12_400_000, timezone: "UTC-4 (BOT)", lat: -16.29, lng: -63.59, safety: 64, bestSeason: "May–Oct (dry season)", visa: "Visa-free for many passports up to 90 days", weather: "Arid highlands, tropical lowlands", tagline: "The Tibet of the Americas", blurb: "Salar de Uyuni — the world's largest salt flat reflecting the sky, Lake Titicaca at 3,800m, and La Paz's vertiginous valleys. Otherworldly.", cities: [c("La Paz", "World's highest de facto capital."), c("Sucre", "White city and constitutional capital.")] },

  // Brazil — existing, kept as-is
  {
    id: "brazil", name: "Brazil", flag: "🇧🇷", continent: "South America", region: "South America",
    capital: "Brasília", currency: "Brazilian Real (R$)", language: "Portuguese",
    population: 216_400_000, timezone: "UTC-2 to -5 (BRT/ACT)",
    lat: -14.24, lng: -51.93, safety: 52,
    bestSeason: "Summer (Dec–Mar) for beaches, year-round in the north", visa: "Visa-free for many passports up to 90 days",
    weather: "Tropical, Amazon rainforest to temperate south",
    tagline: "Samba, soccer, and stunning beaches",
    blurb: "Rio's Christ the Redeemer, the Amazon rainforest, and Carnival — Brazil is larger than life, pulsing with rhythm and natural wonders beyond imagination.",
    cities: [
      { id: "rio", name: "Rio de Janeiro", blurb: "The Marvelous City.", attractions: ["Christ the Redeemer", "Copacabana", "Sugarloaf Mountain"], hotels: [{ name: "Copacabana Palace", tier: "Luxury" }, { name: "Books Hostel", tier: "Budget" }], restaurants: [{ name: "Oro", cuisine: "Brazilian" }], transport: "Metro, buses, Uber." },
    ],
  },

  {
    id: "chile", name: "Chile", flag: "🇨🇱", continent: "South America", region: "Southern Cone",
    capital: "Santiago", currency: "Chilean Peso (CLP)", language: "Spanish",
    population: 19_600_000, timezone: "UTC-3 to -5 (CLT/EAST)",
    lat: -35.68, lng: -71.54, safety: 80,
    bestSeason: "Summer (Dec–Feb) for Patagonia, Winter (Jun–Sep) for skiing", visa: "Visa-free for many passports up to 90 days",
    weather: "Atacama desert (driest on Earth) to Patagonian glaciers",
    tagline: "The long, thin country",
    blurb: "Atacama's stargazing — the driest desert on Earth, Torres del Paine's granite spires, Easter Island's moai, and Santiago beneath the Andes. Chile stretches from desert to ice — over 4,300 km of extremes.",
    cities: [
      c("Santiago", "Cosmopolitan capital beneath the Andes."),
      c("Valparaíso", "Bohemian port of colorful hills and street art."),
      c("Punta Arenas", "Patagonian gateway at the end of the world."),
    ],
  },

  // Colombia — existing, kept as-is
  {
    id: "colombia", name: "Colombia", flag: "🇨🇴", continent: "South America", region: "Northern South America",
    capital: "Bogotá", currency: "Colombian Peso (COP$)", language: "Spanish",
    population: 52_100_000, timezone: "UTC-5 (COT)",
    lat: 4.57, lng: -74.3, safety: 58,
    bestSeason: "Dry season (Dec–Mar)", visa: "Visa-free for most passports up to 90 days",
    weather: "Tropical, varied by altitude",
    tagline: "The rhythm of South America",
    blurb: "Cartagena's colorful old town, Medellín's transformation, and the lush Coffee Triangle. Colombia surprises and delights at every turn.",
    cities: [
      { id: "cartagena", name: "Cartagena", blurb: "Caribbean colonial jewel.", attractions: ["Old Town", "Castillo San Felipe", "Rosario Islands"], hotels: [{ name: "Sofitel Santa Clara", tier: "Luxury" }, { name: "Media Luna Hostel", tier: "Budget" }], restaurants: [{ name: "Carmen", cuisine: "Colombian" }], transport: "Walking, taxis." },
    ],
  },

  { id: "ecuador", name: "Ecuador", flag: "🇪🇨", continent: "South America", region: "Andes", capital: "Quito", currency: "US Dollar ($)", language: "Spanish", population: 18_200_000, timezone: "UTC-5 to -6 (ECT/GALT)", lat: -1.83, lng: -78.18, safety: 66, bestSeason: "Jun–Sep (drier highlands)", visa: "Visa-free for most passports up to 90 days", weather: "Varied — Amazon to Andes to Galápagos", tagline: "Four worlds, one country", blurb: "The Galápagos Islands' fearless wildlife, Quito's colonial center at 2,850m, and the Avenue of the Volcanoes. Ecuador is condensed wonder.", cities: [c("Quito", "Second-highest capital in the world."), c("Guayaquil", "Pacific gateway and economic heart.")] },

  { id: "guyana", name: "Guyana", flag: "🇬🇾", continent: "South America", region: "Northern South America", capital: "Georgetown", currency: "Guyanese Dollar (GYD)", language: "English", population: 810_000, timezone: "UTC-4 (GYT)", lat: 4.86, lng: -58.93, safety: 64, bestSeason: "Sep–Nov & Feb–Apr (drier periods)", visa: "Visa-free for many Caribbean & Commonwealth citizens", weather: "Tropical, equatorial", tagline: "South America's secret", blurb: "Kaieteur Falls — five times the height of Niagara in pristine rainforest, and the only English-speaking country in South America. Untouched and wild.", cities: [c("Georgetown", "Colonial capital below sea level.")] },

  { id: "paraguay", name: "Paraguay", flag: "🇵🇾", continent: "South America", region: "South America", capital: "Asunción", currency: "Paraguayan Guaraní (PYG)", language: "Spanish, Guaraní", population: 6_800_000, timezone: "UTC-4 (PYT)", lat: -25.3, lng: -57.64, safety: 68, bestSeason: "Mar–Nov (milder)", visa: "Visa-free for many passports", weather: "Subtropical, hot summers", tagline: "Heart of South America", blurb: "The Pantanal — the world's largest wetland, Iguazú Falls from the Paraguayan side, and a culture where Guaraní is spoken by everyone. Authentic and overlooked.", cities: [c("Asunción", "River capital with laid-back charm.")] },

  // Peru — existing, kept as-is
  {
    id: "peru", name: "Peru", flag: "🇵🇪", continent: "South America", region: "Andes",
    capital: "Lima", currency: "Peruvian Sol (S/)", language: "Spanish, Quechua",
    population: 34_400_000, timezone: "UTC-5 (PET)",
    lat: -9.19, lng: -75.02, safety: 70,
    bestSeason: "Dry season (May–Sep)", visa: "Visa-free up to 90–183 days for many passports",
    weather: "Coastal desert, Andean highlands, Amazon",
    tagline: "Lost cities and living culture",
    blurb: "From the misty heights of Machu Picchu to Lima's buzzing food scene, Peru blends ancient wonder with bold modern flavor.",
    cities: [
      { id: "cusco", name: "Cusco", blurb: "Inca capital and gateway to Machu Picchu.", attractions: ["Machu Picchu", "Sacsayhuamán", "Rainbow Mountain"], hotels: [{ name: "Belmond Monasterio", tier: "Luxury" }, { name: "Pariwana Hostel", tier: "Budget" }], restaurants: [{ name: "Cicciolina", cuisine: "Andean fusion" }], transport: "Trains and treks." },
    ],
  },

  { id: "suriname", name: "Suriname", flag: "🇸🇷", continent: "South America", region: "Northern South America", capital: "Paramaribo", currency: "Surinamese Dollar (SRD)", language: "Dutch", population: 630_000, timezone: "UTC-3 (SRT)", lat: 4.1, lng: -55.91, safety: 72, bestSeason: "Aug–Nov & Feb–Apr (drier)", visa: "Visa required — e-Visa emerging", weather: "Tropical, equatorial", tagline: "The Amazon's multicultural gem", blurb: "Paramaribo's wooden Dutch-colonial inner city, the most pristine Amazon rainforest on the continent, and a fusion of cultures from four continents.", cities: [c("Paramaribo", "UNESCO wooden city on the Suriname River.")] },

  { id: "uruguay", name: "Uruguay", flag: "🇺🇾", continent: "South America", region: "Southern Cone", capital: "Montevideo", currency: "Uruguayan Peso (UYU)", language: "Spanish", population: 3_420_000, timezone: "UTC-3 (UYT)", lat: -34.89, lng: -56.19, safety: 88, bestSeason: "Summer (Dec–Feb) for beaches", visa: "Visa-free for most passports up to 90 days", weather: "Temperate, four seasons", tagline: "South America's best-kept secret", blurb: "Punta del Este's glitzy beaches, Montevideo's laid-back rambla, and Colonia's cobblestone charm. Uruguay is safe, progressive, and wonderfully understated.", cities: [c("Montevideo", "Relaxed capital on the Río de la Plata."), c("Punta del Este", "South America's most glamorous beach resort.")] },

  { id: "venezuela", name: "Venezuela", flag: "🇻🇪", continent: "South America", region: "Northern South America", capital: "Caracas", currency: "Venezuelan Bolívar (VES)", language: "Spanish", population: 28_800_000, timezone: "UTC-4 (VET)", lat: 7.12, lng: -66.18, safety: 20, bestSeason: "Dec–Apr (dry season)", visa: "Visa required — check travel advisories", weather: "Tropical, varied by altitude", tagline: "Land of grace", blurb: "Angel Falls — the world's tallest waterfall, Los Roques' pristine archipelago, and the Andes' páramo landscapes. Venezuela's natural beauty is staggering.", cities: [c("Caracas", "Valley capital beneath Ávila Mountain.")] },

  // ═══════════════════════════════════════════════════════════════
  //  OCEANIA  (14 members)
  // ═══════════════════════════════════════════════════════════════

  // Australia — existing, kept as-is
  {
    id: "australia", name: "Australia", flag: "🇦🇺", continent: "Oceania", region: "Pacific",
    capital: "Canberra", currency: "Australian Dollar (A$)", language: "English",
    population: 26_600_000, timezone: "UTC+8 to +10 (AWST/AEST)",
    lat: -25.27, lng: 133.78, safety: 90,
    bestSeason: "Spring (Sep–Nov) & Autumn (Mar–May)", visa: "ETA / eVisitor required",
    weather: "Varies — tropical north to temperate south",
    tagline: "Reefs, deserts, and endless coast",
    blurb: "From the Great Barrier Reef to the Outback's red heart, Australia is vast and varied. World-class cities, surf beaches, and wildlife found nowhere else.",
    cities: [
      { id: "sydney", name: "Sydney", blurb: "Iconic harbor city.", attractions: ["Opera House", "Bondi Beach", "Harbour Bridge"], hotels: [{ name: "Park Hyatt Sydney", tier: "Luxury" }, { name: "Wake Up! Sydney", tier: "Budget" }], restaurants: [{ name: "Quay", cuisine: "Modern Australian" }], transport: "Trains, ferries, Opal card." },
    ],
  },

  // Fiji — existing, kept as-is
  {
    id: "fiji", name: "Fiji", flag: "🇫🇯", continent: "Oceania", region: "Pacific",
    capital: "Suva", currency: "Fijian Dollar (FJ$)", language: "English, Fijian, Hindi",
    population: 930_000, timezone: "UTC+12 (FJT)",
    lat: -17.71, lng: 178.07, safety: 88,
    bestSeason: "May–Oct (dry season)", visa: "Visa-free for most passports up to 4 months",
    weather: "Tropical, warm year-round",
    tagline: "Paradise found",
    blurb: "Crystal-clear lagoons, palm-fringed beaches, and the warmest welcome on Earth. Fiji is 333 islands of pure tropical bliss.",
    cities: [
      { id: "nadi", name: "Nadi", blurb: "Gateway to the islands.", attractions: ["Mamanuca Islands", "Sabeto Hot Springs", "Garden of the Sleeping Giant"], hotels: [{ name: "Likuliku Lagoon Resort", tier: "Luxury" }, { name: "Bamboo Backpackers", tier: "Budget" }], restaurants: [{ name: "Nadina", cuisine: "Fijian" }], transport: "Taxis, island transfers." },
    ],
  },

  { id: "kiribati", name: "Kiribati", flag: "🇰🇮", continent: "Oceania", region: "Micronesia", capital: "Tarawa", currency: "Kiribati Dollar / AUD", language: "English, Gilbertese", population: 133_000, timezone: "UTC+12 to +14 (GILT/LINT)", lat: 1.45, lng: 173.0, safety: 80, bestSeason: "May–Oct (drier)", visa: "Visa-free for many passports", weather: "Tropical, equatorial", tagline: "The first to see the sun", blurb: "The only country in all four hemispheres, Christmas Island's bonefishing flats, and the world's largest marine protected area.", cities: [c("Tarawa", "Atoll capital on the equator.")] },

  { id: "marshall-islands", name: "Marshall Islands", flag: "🇲🇭", continent: "Oceania", region: "Micronesia", capital: "Majuro", currency: "US Dollar ($)", language: "Marshallese, English", population: 42_000, timezone: "UTC+12 (MHT)", lat: 7.13, lng: 171.18, safety: 82, bestSeason: "Dec–Apr (drier)", visa: "Visa-free for many passports", weather: "Tropical, humid", tagline: "Pearl of the Pacific", blurb: "Bikini Atoll's WWII wreck diving — a UNESCO site, 29 coral atolls across a million square miles of ocean. Pure Pacific isolation.", cities: [c("Majuro", "Atoll capital of a scattered island nation.")] },

  { id: "micronesia", name: "Micronesia", flag: "🇫🇲", continent: "Oceania", region: "Micronesia", capital: "Palikir", currency: "US Dollar ($)", language: "English", population: 114_000, timezone: "UTC+10 to +11 (CHUT/PONT)", lat: 6.88, lng: 158.21, safety: 84, bestSeason: "Nov–Apr (drier)", visa: "Visa-free for many passports", weather: "Tropical, humid", tagline: "The Federated States", blurb: "Nan Madol — the 'Venice of the Pacific,' ancient basalt ruins on 92 artificial islets. Micronesia blends deep history with pristine reefs.", cities: [c("Palikir", "Tiny capital on the island of Pohnpei.")] },

  { id: "nauru", name: "Nauru", flag: "🇳🇷", continent: "Oceania", region: "Micronesia", capital: "Yaren (de facto)", currency: "Australian Dollar (A$)", language: "Nauruan, English", population: 12_000, timezone: "UTC+12 (NRT)", lat: -0.53, lng: 166.93, safety: 78, bestSeason: "May–Oct (drier)", visa: "Visa required — check with authorities", weather: "Tropical, hot", tagline: "The world's smallest island nation", blurb: "The least-visited country on Earth. A single 21 km² island of phosphate pinnacles, reef-fringed beaches, and deep Pacific isolation.", cities: [c("Yaren", "De facto capital of the world's smallest republic.")] },

  // New Zealand — existing, kept as-is
  {
    id: "new-zealand", name: "New Zealand", flag: "🇳🇿", continent: "Oceania", region: "Pacific",
    capital: "Wellington", currency: "NZ Dollar (NZ$)", language: "English, Māori",
    population: 5_200_000, timezone: "UTC+12/+13 (NZST/NZDT)",
    lat: -40.9, lng: 174.89, safety: 95,
    bestSeason: "Summer (Dec–Feb) & Autumn (Mar–May)", visa: "NZeTA required",
    weather: "Temperate maritime, four seasons",
    tagline: "Middle-earth made real",
    blurb: "Fjords, glaciers, and rolling green hills — New Zealand is an adventurer's playground. Bungy, hike, or simply drive through cinematic scenery.",
    cities: [
      { id: "queenstown", name: "Queenstown", blurb: "Adventure capital of the world.", attractions: ["Milford Sound", "Skyline Gondola", "The Remarkables"], hotels: [{ name: "Eichardt's", tier: "Luxury" }, { name: "Adventure Q2", tier: "Budget" }], restaurants: [{ name: "Rata", cuisine: "Modern NZ" }], transport: "Rent a car or campervan." },
    ],
  },

  { id: "palau", name: "Palau", flag: "🇵🇼", continent: "Oceania", region: "Micronesia", capital: "Ngerulmud", currency: "US Dollar ($)", language: "Palauan, English", population: 18_000, timezone: "UTC+9 (PWT)", lat: 7.51, lng: 134.58, safety: 92, bestSeason: "Nov–Apr (dry season)", visa: "Visa-free for many passports up to 30 days", weather: "Tropical, humid", tagline: "Pristine paradise", blurb: "Jellyfish Lake — swim with millions of harmless golden jellyfish, the Rock Islands' emerald lagoons, and world-class WWII wreck diving.", cities: [c("Ngerulmud", "The world's least populated capital.")] },

  { id: "papua-new-guinea", name: "Papua New Guinea", flag: "🇵🇬", continent: "Oceania", region: "Melanesia", capital: "Port Moresby", currency: "Papua New Guinean Kina (PGK)", language: "English, Tok Pisin, Hiri Motu", population: 10_300_000, timezone: "UTC+10 (PGT)", lat: -9.48, lng: 147.19, safety: 40, bestSeason: "May–Oct (drier)", visa: "Visa on arrival for many passports", weather: "Tropical, equatorial", tagline: "Land of the unexpected", blurb: "Over 800 languages, the Kokoda Track's WWII history, and the Sepik River's spirit houses. PNG is Earth's last great cultural frontier.", cities: [c("Port Moresby", "Capital on the Coral Sea.")] },

  { id: "samoa", name: "Samoa", flag: "🇼🇸", continent: "Oceania", region: "Polynesia", capital: "Apia", currency: "Samoan Tala (WST)", language: "Samoan, English", population: 225_000, timezone: "UTC+13 (WST)", lat: -13.83, lng: -171.77, safety: 84, bestSeason: "May–Oct (dry season)", visa: "Visa-free for many passports up to 90 days", weather: "Tropical, warm", tagline: "The cradle of Polynesia", blurb: "To Sua Ocean Trench — a giant natural swimming hole, the Saleaula lava fields, and fa'a Samoa — the traditional Samoan way of life.", cities: [c("Apia", "Harbor capital of traditional Polynesia.")] },

  { id: "solomon-islands", name: "Solomon Islands", flag: "🇸🇧", continent: "Oceania", region: "Melanesia", capital: "Honiara", currency: "Solomon Islands Dollar (SBD)", language: "English", population: 740_000, timezone: "UTC+11 (SBT)", lat: -9.65, lng: 160.16, safety: 62, bestSeason: "May–Oct (drier)", visa: "Visa-free for many passports", weather: "Tropical, humid", tagline: "The Happy Isles", blurb: "Guadalcanal's WWII legacy — Iron Bottom Sound, the world's best wreck diving, and over 900 islands of Melanesian culture. Wild and welcoming.", cities: [c("Honiara", "Guadalcanal capital of history and reefs.")] },

  { id: "tonga", name: "Tonga", flag: "🇹🇴", continent: "Oceania", region: "Polynesia", capital: "Nuku'alofa", currency: "Tongan Pa'anga (TOP)", language: "Tongan, English", population: 104_000, timezone: "UTC+13 (TOT)", lat: -21.17, lng: -175.2, safety: 88, bestSeason: "May–Oct (dry season)", visa: "Visa-free for many passports up to 30 days", weather: "Tropical, warm", tagline: "The Friendly Islands", blurb: "Swimming with humpback whales — one of the few places on Earth you can, the Mapu'a 'a Vaea blowholes, and the only Pacific kingdom never colonized.", cities: [c("Nuku'alofa", "Royal capital of the last Polynesian kingdom.")] },

  { id: "tuvalu", name: "Tuvalu", flag: "🇹🇻", continent: "Oceania", region: "Polynesia", capital: "Funafuti", currency: "Tuvaluan Dollar / AUD", language: "Tuvaluan, English", population: 11_000, timezone: "UTC+12 (TVT)", lat: -8.52, lng: 179.2, safety: 92, bestSeason: "May–Oct (drier)", visa: "Visa on arrival for most", weather: "Tropical, warm", tagline: "The world's least visited country", blurb: "Nine tiny atolls in the vast Pacific, Funafuti's conservation area, and a culture deeply connected to the sea. Tuvalu is the frontline of climate change.", cities: [c("Funafuti", "Atoll capital of one of Earth's smallest nations.")] },

  { id: "vanuatu", name: "Vanuatu", flag: "🇻🇺", continent: "Oceania", region: "Melanesia", capital: "Port Vila", currency: "Vanuatu Vatu (VUV)", language: "Bislama, English, French", population: 330_000, timezone: "UTC+11 (VUT)", lat: -17.73, lng: 168.31, safety: 78, bestSeason: "May–Oct (dry season)", visa: "Visa-free for many passports up to 30 days", weather: "Tropical, humid", tagline: "Yumi, Yumi, Yumi", blurb: "Mount Yasur — the world's most accessible active volcano, land diving on Pentecost Island (the original bungy), and pristine coral reefs.", cities: [c("Port Vila", "Harbor capital of volcanoes and kava.")] },

  // ═══════════════════════════════════════════════════════════════
  //  ANTARCTICA  (bonus)
  // ═══════════════════════════════════════════════════════════════

  {
    id: "antarctica", name: "Antarctica", flag: "🇦🇶", continent: "Antarctica", region: "Antarctic",
    capital: "None", currency: "No official currency", language: "No official language",
    population: 1_100, timezone: "Various (research stations use home-country time)",
    lat: -82.86, lng: 135.0, safety: 98,
    bestSeason: "Nov–Mar (austral summer)", visa: "Antarctic Treaty — tour operators arrange permits",
    weather: "Coldest, driest, windiest continent",
    tagline: "The last frontier",
    blurb: "A continent of ice and silence — towering glaciers, vast penguin colonies, and landscapes no words can capture. Antarctica is Earth's final wilderness.",
    cities: [c("McMurdo Station", "The largest research station in Antarctica.")],
  },
];

// ── Merge border polygon data from Natural Earth ──
import { COUNTRY_BORDERS } from "./borders";
for (const c of COUNTRIES) {
  if (COUNTRY_BORDERS[c.id]) {
    c.border = COUNTRY_BORDERS[c.id];
  }
}

export function getCountry(id: string): Country | undefined {
  return COUNTRIES.find((c) => c.id === id);
}

export function getCity(countryId: string, cityId: string): { country: Country; city: City } | undefined {
  const country = getCountry(countryId);
  if (!country) return undefined;
  const city = country.cities.find((c) => c.id === cityId);
  if (!city) return undefined;
  return { country, city };
}
