import { PrismaClient, Region, Dialect, BuddhistPractice, Diet, FamilyView, EventType, FeedPostType, RoomType, RoomStatus, RoomRole, WaitlistStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const PASSWORD = 'password123';

// ========================
// USER DATA
// ========================

interface UserSeed {
  firstName: string;
  lastName: string;
  gender: 'Female' | 'Male';
  age: number;
  region: Region;
  dialect: Dialect;
  buddhaPractice: BuddhistPractice;
  city: string;
  country: string;
  profession: string;
  languages: string[];
  activeCategories: string[];
  bio: string;
  diet: Diet;
  familyViews: FamilyView;
  smoking: boolean;
  drinking: boolean;
  height: number;
  prompts: { question: string; answer: string }[];
}

const femaleUsers: UserSeed[] = [
  {
    firstName: 'Dolma',
    lastName: 'Tenzin',
    gender: 'Female',
    age: 26,
    region: Region.U_TSANG,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.GELUG,
    city: 'Dharamsala',
    country: 'India',
    profession: 'Data Scientist',
    languages: ['Tibetan', 'English', 'Hindi'],
    activeCategories: ['Coffee Date', 'Teaching Companion'],
    bio: 'Data scientist by day, momo maker by night. Born in Lhasa, raised in Dharamsala. I love exploring the intersection of technology and Tibetan culture. Looking for someone who can debate philosophy over butter tea.',
    diet: Diet.VEGETARIAN,
    familyViews: FamilyView.OPEN_TO_CHILDREN,
    smoking: false,
    drinking: false,
    height: 160,
    prompts: [
      { question: 'My favorite Tibetan tradition is...', answer: 'Making butter tea with my ama-la every morning. The ritual of it grounds me before diving into datasets and algorithms.' },
      { question: 'A perfect weekend looks like...', answer: 'A morning hike to Triund, afternoon coding session at a cafe in McLeod Ganj, and evening prayers at the temple.' },
      { question: 'I connect with my Tibetan roots by...', answer: 'Volunteering to teach coding to Tibetan youth at TCV. Bridging our heritage with the future.' },
    ],
  },
  {
    firstName: 'Yangchen',
    lastName: 'Lhamo',
    gender: 'Female',
    age: 24,
    region: Region.KHAM,
    dialect: Dialect.KHAM,
    buddhaPractice: BuddhistPractice.KAGYU,
    city: 'New York',
    country: 'USA',
    profession: 'Graphic Designer',
    languages: ['Tibetan', 'English', 'Mandarin'],
    activeCategories: ['Going Out Tonight', 'Diaspora Connect'],
    bio: 'Kham girl in the big city. I design brands by day and paint thangka-inspired art by night. My apartment smells like juniper incense and oil paints. Swipe right if you appreciate good design and better dumplings.',
    diet: Diet.FLEXIBLE,
    familyViews: FamilyView.UNDECIDED,
    smoking: false,
    drinking: true,
    height: 165,
    prompts: [
      { question: 'The way to my heart is...', answer: 'Through art and food, obviously. Take me to a gallery opening and then get shabalay at a Tibetan restaurant in Jackson Heights.' },
      { question: 'My hidden talent is...', answer: 'I can draw a perfect mandala freehand. My Kham grandma taught me patience through sand painting when I was little.' },
      { question: 'I knew I was Tibetan when...', answer: 'I realized I judge every city by the quality of its thukpa. New York is surprisingly decent.' },
    ],
  },
  {
    firstName: 'Pema',
    lastName: 'Choedron',
    gender: 'Female',
    age: 29,
    region: Region.AMDO,
    dialect: Dialect.AMDO,
    buddhaPractice: BuddhistPractice.NYINGMA,
    city: 'Toronto',
    country: 'Canada',
    profession: 'Nurse',
    languages: ['Tibetan', 'English', 'French'],
    activeCategories: ['Brunch Date', 'Language Exchange'],
    bio: 'ICU nurse who finds peace in Nyingma practice after long shifts. Amdo born, Toronto based. I speak three languages but my heart speaks Tibetan. Looking for someone grounded, kind, and not afraid of a woman who works night shifts.',
    diet: Diet.VEGETARIAN,
    familyViews: FamilyView.WANT_CHILDREN,
    smoking: false,
    drinking: false,
    height: 158,
    prompts: [
      { question: 'My favorite Tibetan tradition is...', answer: 'Saga Dawa — the month of merit. I try to do extra volunteering and practice during this time. It reminds me why compassion is at the center of everything.' },
      { question: 'What I value most in a partner...', answer: 'Kindness that is not performative. Someone who holds the door for strangers and calls their parents regularly.' },
      { question: 'I connect with my Tibetan roots by...', answer: 'Teaching Amdo dialect to second-gen kids on weekends. Their excitement when they learn a new phrase is everything.' },
    ],
  },
  {
    firstName: 'Tsering',
    lastName: 'Wangmo',
    gender: 'Female',
    age: 23,
    region: Region.DIASPORA,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.GELUG,
    city: 'London',
    country: 'UK',
    profession: 'Law Student',
    languages: ['Tibetan', 'English'],
    activeCategories: ['Adventure Partner', 'Cultural Event Buddy'],
    bio: 'Second-gen Tibetan navigating law school and identity in London. I debate human rights cases by day and argue about the best momo recipe with my ama-la by night. Looking for someone who cares about justice and can keep up with my energy.',
    diet: Diet.FLEXIBLE,
    familyViews: FamilyView.UNDECIDED,
    smoking: false,
    drinking: true,
    height: 163,
    prompts: [
      { question: 'A perfect weekend looks like...', answer: 'A protest march in the morning, dim sum with the Tibetan crew at lunch, and a cozy movie night. Balance is key.' },
      { question: 'The way to my heart is...', answer: 'Intellectual conversation and a good sense of humor. Bonus points if you can recite Milarepa poetry.' },
      { question: 'I knew I was Tibetan when...', answer: 'I got emotional seeing the Tibetan flag at a solidarity rally in Trafalgar Square. Identity hits different in the diaspora.' },
    ],
  },
  {
    firstName: 'Dechen',
    lastName: 'Lhamo',
    gender: 'Female',
    age: 27,
    region: Region.U_TSANG,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.SAKYA,
    city: 'Zurich',
    country: 'Switzerland',
    profession: 'Software Engineer',
    languages: ['Tibetan', 'English', 'German'],
    activeCategories: ['Study Buddy', 'Losar Celebration'],
    bio: 'Building apps in the Alps. Software engineer at a fintech startup by day, Sakya practitioner by choice. I code in TypeScript and pray in Tibetan. Looking for someone who values both innovation and tradition.',
    diet: Diet.VEGETARIAN,
    familyViews: FamilyView.OPEN_TO_CHILDREN,
    smoking: false,
    drinking: false,
    height: 167,
    prompts: [
      { question: 'My hidden talent is...', answer: 'I can debug production code while explaining the Four Noble Truths. Multitasking at its finest.' },
      { question: 'What I value most in a partner...', answer: 'Curiosity and depth. Someone who reads beyond headlines and thinks beyond convention.' },
      { question: 'My favorite Tibetan tradition is...', answer: 'Losar preparations — the entire house smells of khapse and everyone comes together. Even in Zurich, we make it happen.' },
    ],
  },
  {
    firstName: 'Sonam',
    lastName: 'Dolkar',
    gender: 'Female',
    age: 25,
    region: Region.KHAM,
    dialect: Dialect.KHAM,
    buddhaPractice: BuddhistPractice.KAGYU,
    city: 'Dharamsala',
    country: 'India',
    profession: 'Teacher',
    languages: ['Tibetan', 'English', 'Hindi'],
    activeCategories: ['Festival Companion', 'Teaching Companion'],
    bio: 'Teaching English and Tibetan at a local school in Dharamsala. Kham roots, big heart. I believe education is the foundation of our community\'s future. Seeking someone with patience, warmth, and a love for learning.',
    diet: Diet.VEGETARIAN,
    familyViews: FamilyView.WANT_CHILDREN,
    smoking: false,
    drinking: false,
    height: 155,
    prompts: [
      { question: 'I connect with my Tibetan roots by...', answer: 'Teaching children to read and write in Tibetan. When a student writes their first complete sentence, my heart sings.' },
      { question: 'A perfect weekend looks like...', answer: 'Morning meditation at the Karmapa\'s monastery, lunch with friends, and an afternoon spent reading on my balcony overlooking the Dhauladhar range.' },
      { question: 'The way to my heart is...', answer: 'Show me you care about the next generation. Volunteer, teach, mentor — actions speak louder than words.' },
    ],
  },
  {
    firstName: 'Karma',
    lastName: 'Yangzom',
    gender: 'Female',
    age: 30,
    region: Region.AMDO,
    dialect: Dialect.AMDO,
    buddhaPractice: BuddhistPractice.NYINGMA,
    city: 'San Francisco',
    country: 'USA',
    profession: 'Product Manager',
    languages: ['Tibetan', 'English', 'Mandarin'],
    activeCategories: ['Coffee Date', 'Homecoming'],
    bio: 'PM at a tech company, navigating roadmaps and retros. Amdo native who found a second home in the Bay Area. I organize Tibetan cultural events on weekends and dream about building a tech hub for Tibetans. Looking for a partner who thinks big.',
    diet: Diet.FLEXIBLE,
    familyViews: FamilyView.OPEN_TO_CHILDREN,
    smoking: false,
    drinking: true,
    height: 162,
    prompts: [
      { question: 'My hidden talent is...', answer: 'I can negotiate anything — product features, restaurant bills, and the best price for pashmina shawls in Dharamsala.' },
      { question: 'I knew I was Tibetan when...', answer: 'I realized my approach to conflict resolution at work is basically Buddhist philosophy in corporate language.' },
      { question: 'What I value most in a partner...', answer: 'Ambition paired with humility. Dream big but stay grounded. And please, appreciate a good cup of po cha.' },
    ],
  },
  {
    firstName: 'Lhamo',
    lastName: 'Tsering',
    gender: 'Female',
    age: 22,
    region: Region.DIASPORA,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.SECULAR,
    city: 'Melbourne',
    country: 'Australia',
    profession: 'Art Student',
    languages: ['Tibetan', 'English'],
    activeCategories: ['Going Out Tonight', 'Language Exchange'],
    bio: 'Art school student exploring identity through mixed media. Born in Melbourne, raised between two cultures. My art explores what it means to be Tibetan when you\'ve never been to Tibet. Secular but spiritually curious. Let\'s get coffee and talk about everything.',
    diet: Diet.VEGAN,
    familyViews: FamilyView.UNDECIDED,
    smoking: false,
    drinking: true,
    height: 170,
    prompts: [
      { question: 'A perfect weekend looks like...', answer: 'Saturday morning at the gallery, afternoon at a vegan cafe sketching, Sunday at the Tibetan community center helping with event posters.' },
      { question: 'The way to my heart is...', answer: 'Take me to a street art walk and then surprise me with Tibetan butter tea. Contrast is my aesthetic.' },
      { question: 'I connect with my Tibetan roots by...', answer: 'Through art. Every piece I make is a conversation with a homeland I\'ve never visited but deeply feel connected to.' },
    ],
  },
  {
    firstName: 'Tashi',
    lastName: 'Dolma',
    gender: 'Female',
    age: 28,
    region: Region.U_TSANG,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.GELUG,
    city: 'Minneapolis',
    country: 'USA',
    profession: 'Doctor',
    languages: ['Tibetan', 'English', 'Hindi'],
    activeCategories: ['Brunch Date', 'Diaspora Connect'],
    bio: 'Internal medicine resident surviving on coffee and compassion. Born in Lhasa, trained in Delhi, practicing in Minnesota. The Tibetan community here is small but mighty. Looking for someone who understands the immigrant grind and still makes time for what matters.',
    diet: Diet.NON_VEGETARIAN,
    familyViews: FamilyView.WANT_CHILDREN,
    smoking: false,
    drinking: false,
    height: 157,
    prompts: [
      { question: 'My favorite Tibetan tradition is...', answer: 'Butter lamp offerings. There is something profoundly peaceful about lighting a lamp and making a wish in silence.' },
      { question: 'What I value most in a partner...', answer: 'Emotional intelligence and resilience. Life as an immigrant doctor is not easy — I need someone who understands that growth comes with sacrifice.' },
      { question: 'I knew I was Tibetan when...', answer: 'I instinctively offered my seat to every elder at the community gathering, even though I had been on my feet for a 14-hour shift.' },
    ],
  },
  {
    firstName: 'Choeying',
    lastName: 'Lhamo',
    gender: 'Female',
    age: 26,
    region: Region.KHAM,
    dialect: Dialect.KHAM,
    buddhaPractice: BuddhistPractice.BON,
    city: 'Kathmandu',
    country: 'Nepal',
    profession: 'Journalist',
    languages: ['Tibetan', 'English', 'Nepali'],
    activeCategories: ['Adventure Partner', 'Cultural Event Buddy'],
    bio: 'Journalist covering Tibetan diaspora stories across South Asia. Bon practitioner from Kham — yes, we exist! I chase stories the way I chase mountain trails: with persistence and curiosity. Looking for a partner in adventure, both literal and metaphorical.',
    diet: Diet.FLEXIBLE,
    familyViews: FamilyView.OPEN_TO_CHILDREN,
    smoking: false,
    drinking: true,
    height: 164,
    prompts: [
      { question: 'My hidden talent is...', answer: 'I can set up a campfire, cook thukpa, and file a story — all from a tent at 4,000 meters. Kham resilience runs deep.' },
      { question: 'A perfect weekend looks like...', answer: 'A trek to a monastery I have not visited yet, interviewing the locals, and writing by candlelight. Simple joys.' },
      { question: 'I connect with my Tibetan roots by...', answer: 'Telling our stories. Every article I write is an act of preservation — making sure the world remembers we are here.' },
    ],
  },
];

const maleUsers: UserSeed[] = [
  {
    firstName: 'Tenzin',
    lastName: 'Dorje',
    gender: 'Male',
    age: 28,
    region: Region.U_TSANG,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.GELUG,
    city: 'Dharamsala',
    country: 'India',
    profession: 'Monk/Scholar',
    languages: ['Tibetan', 'English', 'Hindi', 'Sanskrit'],
    activeCategories: ['Teaching Companion', 'Losar Celebration'],
    bio: 'Former monk, current Buddhist philosophy scholar at the Library of Tibetan Works. I spent 10 years in monastic training and now bridge traditional wisdom with modern academia. Looking for a deep, meaningful connection rooted in shared values.',
    diet: Diet.VEGETARIAN,
    familyViews: FamilyView.OPEN_TO_CHILDREN,
    smoking: false,
    drinking: false,
    height: 175,
    prompts: [
      { question: 'My favorite Tibetan tradition is...', answer: 'The philosophical debates at the monastery. There is nothing like the sound of monks clapping their hands in debate — it sharpens the mind like nothing else.' },
      { question: 'What I value most in a partner...', answer: 'Depth of character and a genuine spiritual curiosity. Someone who asks "why" and is not satisfied with surface-level answers.' },
      { question: 'I connect with my Tibetan roots by...', answer: 'Translating ancient Tibetan texts into English. Every word carries centuries of wisdom — it is a privilege to share it.' },
    ],
  },
  {
    firstName: 'Lobsang',
    lastName: 'Gyatso',
    gender: 'Male',
    age: 25,
    region: Region.KHAM,
    dialect: Dialect.KHAM,
    buddhaPractice: BuddhistPractice.KAGYU,
    city: 'New York',
    country: 'USA',
    profession: 'Finance Analyst',
    languages: ['Tibetan', 'English', 'Mandarin'],
    activeCategories: ['Going Out Tonight', 'Coffee Date'],
    bio: 'Wall Street by day, Tibetan community organizer by night. Kham born, NYC living. I run the numbers at work and run events for the Tibetan Youth Congress on weekends. Looking for someone who matches my energy and shares my love for our culture.',
    diet: Diet.NON_VEGETARIAN,
    familyViews: FamilyView.WANT_CHILDREN,
    smoking: false,
    drinking: true,
    height: 178,
    prompts: [
      { question: 'A perfect weekend looks like...', answer: 'Saturday morning basketball in Central Park, afternoon at the Rubin Museum, evening cooking Kham-style beef with friends.' },
      { question: 'The way to my heart is...', answer: 'Be passionate about something — anything. I love people who light up when they talk about what they care about.' },
      { question: 'I knew I was Tibetan when...', answer: 'I organized a flash mob of 50 Tibetans doing gorshey in Times Square for March 10th. The NYPD was confused but supportive.' },
    ],
  },
  {
    firstName: 'Thubten',
    lastName: 'Norbu',
    gender: 'Male',
    age: 31,
    region: Region.AMDO,
    dialect: Dialect.AMDO,
    buddhaPractice: BuddhistPractice.GELUG,
    city: 'Toronto',
    country: 'Canada',
    profession: 'Civil Engineer',
    languages: ['Tibetan', 'English', 'French'],
    activeCategories: ['Brunch Date', 'Homecoming'],
    bio: 'Building bridges — literally and figuratively. Civil engineer working on infrastructure projects across Ontario. Amdo roots, Canadian life. I dream of one day using my skills to build in Tibet. For now, I build community here.',
    diet: Diet.FLEXIBLE,
    familyViews: FamilyView.WANT_CHILDREN,
    smoking: false,
    drinking: true,
    height: 180,
    prompts: [
      { question: 'My favorite Tibetan tradition is...', answer: 'Horse racing festivals in Amdo. The thundering hooves, the cheering crowds, the wide open grasslands — nothing compares.' },
      { question: 'What I value most in a partner...', answer: 'Loyalty and a sense of home. I want to build a life with someone who values family and community as much as I do.' },
      { question: 'I connect with my Tibetan roots by...', answer: 'Cooking Amdo-style tsampa dishes every Sunday. My apartment in Toronto smells like my grandmother\'s kitchen in Rebkong.' },
    ],
  },
  {
    firstName: 'Karma',
    lastName: 'Wangchuk',
    gender: 'Male',
    age: 24,
    region: Region.DIASPORA,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.NYINGMA,
    city: 'London',
    country: 'UK',
    profession: 'Music Producer',
    languages: ['Tibetan', 'English'],
    activeCategories: ['Festival Companion', 'Cultural Event Buddy'],
    bio: 'Blending traditional Tibetan sounds with modern electronic music. Born in London, soul in the Himalayas. My tracks sample dranyen and dungchen. Looking for someone who vibes with both ancient wisdom and modern beats.',
    diet: Diet.FLEXIBLE,
    familyViews: FamilyView.UNDECIDED,
    smoking: false,
    drinking: true,
    height: 173,
    prompts: [
      { question: 'My hidden talent is...', answer: 'I can play five traditional Tibetan instruments and produce a beat on Ableton in under an hour. Fusion is my middle name.' },
      { question: 'A perfect weekend looks like...', answer: 'Studio session Saturday, record shopping in Camden, Sunday roast with the Tibetan crew in Finchley.' },
      { question: 'The way to my heart is...', answer: 'Good music taste and an open mind. If you can appreciate both Yungchen Lhamo and Aphex Twin, we will get along.' },
    ],
  },
  {
    firstName: 'Jampa',
    lastName: 'Tsering',
    gender: 'Male',
    age: 27,
    region: Region.U_TSANG,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.SAKYA,
    city: 'Paris',
    country: 'France',
    profession: 'Chef',
    languages: ['Tibetan', 'English', 'French'],
    activeCategories: ['Going Out Tonight', 'Diaspora Connect'],
    bio: 'Tibetan chef in Paris, blending Himalayan flavors with French technique. I trained at Le Cordon Bleu and now run a pop-up that serves momo bourguignon and thukpa bisque. Food is love, and I cook with all of it.',
    diet: Diet.NON_VEGETARIAN,
    familyViews: FamilyView.OPEN_TO_CHILDREN,
    smoking: false,
    drinking: true,
    height: 176,
    prompts: [
      { question: 'My favorite Tibetan tradition is...', answer: 'The communal cooking before Losar. Everyone gathers, everyone has a role, everyone tastes. It is cuisine as ceremony.' },
      { question: 'The way to my heart is...', answer: 'Appreciate good food without pretension. The best meal I ever had was my ama-la\'s simple tsampa porridge.' },
      { question: 'I knew I was Tibetan when...', answer: 'My French colleagues asked why I add so much butter to everything. I told them it is not French influence — it is Tibetan heritage.' },
    ],
  },
  {
    firstName: 'Ngawang',
    lastName: 'Tashi',
    gender: 'Male',
    age: 29,
    region: Region.KHAM,
    dialect: Dialect.KHAM,
    buddhaPractice: BuddhistPractice.KAGYU,
    city: 'San Francisco',
    country: 'USA',
    profession: 'Software Engineer',
    languages: ['Tibetan', 'English', 'Mandarin'],
    activeCategories: ['Study Buddy', 'Language Exchange'],
    bio: 'Senior engineer at a Bay Area startup. Kham dialect speaker trying to keep my language alive in Silicon Valley. I build distributed systems by day and study Kagyu texts by night. Looking for someone who appreciates both logic and mystery.',
    diet: Diet.VEGETARIAN,
    familyViews: FamilyView.OPEN_TO_CHILDREN,
    smoking: false,
    drinking: false,
    height: 177,
    prompts: [
      { question: 'What I value most in a partner...', answer: 'Intellectual curiosity and emotional warmth. The best relationships are those where you never run out of things to talk about.' },
      { question: 'A perfect weekend looks like...', answer: 'Hike in Muir Woods, then home to build a side project and cook Kham-style stew. Simple, productive, peaceful.' },
      { question: 'I connect with my Tibetan roots by...', answer: 'Building open-source tools for Tibetan language processing. NLP for Tibetan script is my passion project.' },
    ],
  },
  {
    firstName: 'Dorje',
    lastName: 'Rabten',
    gender: 'Male',
    age: 23,
    region: Region.AMDO,
    dialect: Dialect.AMDO,
    buddhaPractice: BuddhistPractice.GELUG,
    city: 'Dharamsala',
    country: 'India',
    profession: 'Thangka Painter',
    languages: ['Tibetan', 'English', 'Hindi'],
    activeCategories: ['Adventure Partner', 'Losar Celebration'],
    bio: 'Traditional thangka painter carrying forward an art form that spans centuries. Trained under a master in Dharamsala for 6 years. Each painting takes months of meditation and meticulous brushwork. Looking for someone who values patience and beauty.',
    diet: Diet.VEGETARIAN,
    familyViews: FamilyView.UNDECIDED,
    smoking: false,
    drinking: false,
    height: 171,
    prompts: [
      { question: 'My hidden talent is...', answer: 'I can grind mineral pigments into paint the traditional way. Each color is a meditation — lapis lazuli blue takes three days to prepare.' },
      { question: 'My favorite Tibetan tradition is...', answer: 'The tradition of master and student in thangka painting. My teacher gave me everything — technique, history, and the patience to see beauty in slowness.' },
      { question: 'The way to my heart is...', answer: 'Sit with me in my studio while I paint. No need to talk — just the sound of brushes and breathing. That is intimacy.' },
    ],
  },
  {
    firstName: 'Sonam',
    lastName: 'Topgyal',
    gender: 'Male',
    age: 26,
    region: Region.DIASPORA,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.SECULAR,
    city: 'Washington DC',
    country: 'USA',
    profession: 'Political Scientist',
    languages: ['Tibetan', 'English'],
    activeCategories: ['Coffee Date', 'Diaspora Connect'],
    bio: 'Researcher at a think tank focusing on Central Asian geopolitics and Tibetan self-determination. Born in DC, raised on rangzen debates at the dinner table. Secular but culturally Tibetan to my core. Seeking someone who cares about the world.',
    diet: Diet.FLEXIBLE,
    familyViews: FamilyView.OPEN_TO_CHILDREN,
    smoking: false,
    drinking: true,
    height: 179,
    prompts: [
      { question: 'I knew I was Tibetan when...', answer: 'I realized my entire career is built on a personal mission. Policy papers by day, community advocacy by night — it is all connected.' },
      { question: 'A perfect weekend looks like...', answer: 'Morning at the Smithsonian, afternoon writing at a coffee shop on the Hill, evening dinner with the DC Tibetan crew.' },
      { question: 'What I value most in a partner...', answer: 'Someone who is informed and engaged with the world but can also be silly and present in the moment.' },
    ],
  },
  {
    firstName: 'Phuntsok',
    lastName: 'Namgyal',
    gender: 'Male',
    age: 30,
    region: Region.U_TSANG,
    dialect: Dialect.LHASA,
    buddhaPractice: BuddhistPractice.GELUG,
    city: 'Taipei',
    country: 'Taiwan',
    profession: 'Business Owner',
    languages: ['Tibetan', 'English', 'Mandarin'],
    activeCategories: ['Brunch Date', 'Homecoming'],
    bio: 'Running a Tibetan restaurant and cultural space in Taipei. Building a bridge between Tibetan and Taiwanese communities through food and conversation. Business is tough, but every bowl of thukpa served is a story shared.',
    diet: Diet.NON_VEGETARIAN,
    familyViews: FamilyView.WANT_CHILDREN,
    smoking: false,
    drinking: true,
    height: 174,
    prompts: [
      { question: 'My favorite Tibetan tradition is...', answer: 'The hospitality — we never let a guest leave hungry. My restaurant runs on that principle. Every stranger is a friend we have not met yet.' },
      { question: 'I connect with my Tibetan roots by...', answer: 'My restaurant is not just a business. It is a cultural embassy. We host language classes, movie nights, and Losar celebrations.' },
      { question: 'The way to my heart is...', answer: 'Come to my restaurant and tell me honestly what you think of the food. Honesty is the best seasoning.' },
    ],
  },
  {
    firstName: 'Kunga',
    lastName: 'Dhondup',
    gender: 'Male',
    age: 22,
    region: Region.KHAM,
    dialect: Dialect.KHAM,
    buddhaPractice: BuddhistPractice.NYINGMA,
    city: 'Boston',
    country: 'USA',
    profession: 'Computer Science Student',
    languages: ['Tibetan', 'English'],
    activeCategories: ['Study Buddy', 'Cultural Event Buddy'],
    bio: 'CS major at MIT, first-gen college student. My parents escaped from Kham and built a life from nothing — I owe it to them to make the most of every opportunity. Into AI research and Tibetan language preservation. Looking for a study partner who becomes something more.',
    diet: Diet.FLEXIBLE,
    familyViews: FamilyView.UNDECIDED,
    smoking: false,
    drinking: false,
    height: 172,
    prompts: [
      { question: 'My hidden talent is...', answer: 'I can explain machine learning using Buddhist metaphors. Neural networks and dependent origination have more in common than you think.' },
      { question: 'A perfect weekend looks like...', answer: 'Hackathon Saturday, dim sum with the Tibetan students\' association Sunday, followed by a study session at Widener Library.' },
      { question: 'I knew I was Tibetan when...', answer: 'I built a Tibetan script OCR as my first ML project. My professor was confused but my parents cried happy tears.' },
    ],
  },
];

// ========================
// MAIN SEED FUNCTION
// ========================

async function main() {
  console.log('🌱 Starting Tsewa seed...\n');

  // Hash password once
  console.log('🔐 Hashing password...');
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  // ========================
  // STEP 1: Clear all existing data
  // ========================
  console.log('🧹 Clearing existing data...');

  await prisma.watchPartyState.deleteMany();
  await prisma.roomScheduleRsvp.deleteMany();
  await prisma.roomMessage.deleteMany();
  await prisma.roomParticipant.deleteMany();
  await prisma.room.deleteMany();
  await prisma.topicChannel.deleteMany();
  await prisma.feedLike.deleteMany();
  await prisma.feedComment.deleteMany();
  await prisma.feedPost.deleteMany();
  await prisma.eventRsvp.deleteMany();
  await prisma.event.deleteMany();
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.dailyPick.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.report.deleteMany();
  await prisma.block.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.conversationPrompt.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log('   ✅ All tables cleared.\n');

  // ========================
  // STEP 2: Create users with profiles, photos, prompts, waitlist
  // ========================
  console.log('👤 Creating users...');

  const allUserData = [...femaleUsers, ...maleUsers];
  const createdUsers: { id: string; firstName: string; lastName: string; gender: string }[] = [];

  for (const userData of allUserData) {
    const email = `${userData.firstName.toLowerCase()}.${userData.lastName.toLowerCase()}@tsewa.test`;
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - userData.age);
    // Set to Jan 15 to avoid timezone edge cases
    birthDate.setMonth(0, 15);

    const lookingForGender = userData.gender === 'Female' ? ['Male'] : ['Female'];

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        isActive: true,
        isVerified: true,
        lastActiveAt: new Date(),
        profile: {
          create: {
            displayName: `${userData.firstName} ${userData.lastName}`,
            birthDate,
            gender: userData.gender,
            bio: userData.bio,
            height: userData.height,
            region: userData.region,
            dialect: userData.dialect,
            buddhaPractice: userData.buddhaPractice,
            hometown: `${userData.city}, ${userData.country}`,
            education: userData.profession.includes('Student') ? userData.profession : undefined,
            profession: userData.profession,
            languages: userData.languages,
            diet: userData.diet,
            familyViews: userData.familyViews,
            smoking: userData.smoking,
            drinking: userData.drinking,
            currentCity: userData.city,
            currentCountry: userData.country,
            lookingForGender,
            ageMin: Math.max(18, userData.age - 5),
            ageMax: userData.age + 8,
            maxDistance: 200,
            regionFilter: [],
            activeCategories: userData.activeCategories,
          },
        },
        waitlistEntry: {
          create: {
            status: WaitlistStatus.APPROVED,
            approvedAt: new Date(),
          },
        },
      },
    });

    // Create photos (3-4 per user)
    const photoSeeds = [
      `${userData.firstName}`,
      `${userData.firstName}${userData.lastName}`,
      `${userData.firstName.toLowerCase()}${userData.age}`,
      `${userData.lastName.toLowerCase()}${userData.firstName.toLowerCase()}`,
    ];

    const photoCount = userData.age % 2 === 0 ? 4 : 3;
    for (let i = 0; i < photoCount; i++) {
      await prisma.photo.create({
        data: {
          userId: user.id,
          url: `https://api.dicebear.com/7.x/avataaars/png?seed=${photoSeeds[i]}`,
          position: i,
          isMain: i === 0,
        },
      });
    }

    // Create conversation prompts
    for (let i = 0; i < userData.prompts.length; i++) {
      await prisma.conversationPrompt.create({
        data: {
          userId: user.id,
          question: userData.prompts[i].question,
          answer: userData.prompts[i].answer,
          position: i,
        },
      });
    }

    createdUsers.push({
      id: user.id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      gender: userData.gender,
    });

    console.log(`   ✅ ${userData.firstName} ${userData.lastName} (${userData.gender}, ${userData.age}, ${userData.city})`);
  }

  console.log(`\n   📊 Created ${createdUsers.length} users with profiles, photos, prompts, and waitlist entries.\n`);

  // Helper to find user by first name
  const findUser = (firstName: string) => createdUsers.find(u => u.firstName === firstName)!;

  // ========================
  // STEP 3: Create invite codes
  // ========================
  console.log('🎟️  Creating invite codes...');

  const tenzinDorje = findUser('Tenzin');

  for (let i = 1; i <= 10; i++) {
    await prisma.inviteCode.create({
      data: {
        code: `TSEWA${i}`,
        inviterId: tenzinDorje.id,
        maxUses: 5,
        usedCount: 0,
        isActive: true,
      },
    });
  }

  console.log('   ✅ Created 10 invite codes (TSEWA1-TSEWA10) from Tenzin Dorje.\n');

  // ========================
  // STEP 4: Create events
  // ========================
  console.log('📅 Creating events...');

  const dolma = findUser('Dolma');
  const lobsang = findUser('Lobsang');
  const pema = findUser('Pema');
  const karmaW = findUser('Karma'); // Karma Wangchuk (male)
  const karmaWangchuk = createdUsers.find(u => u.firstName === 'Karma' && u.gender === 'Male')!;
  const yangchen = findUser('Yangchen');

  const events = [
    {
      creatorId: dolma.id,
      title: 'Losar 2024 Celebration',
      titleTib: 'ལོ་གསར་སྲུང་བརྩི།',
      description: 'Join us for the grandest Losar celebration in Dharamsala! Traditional dances, music performances, khapse tasting, and butter sculpture exhibitions. A wonderful opportunity to ring in the Tibetan New Year with our community. All ages welcome. Traditional dress encouraged!',
      type: EventType.LOSAR,
      location: 'Tibetan Institute of Performing Arts',
      city: 'Dharamsala',
      country: 'India',
      latitude: 32.2190,
      longitude: 76.3234,
      startDate: new Date('2026-04-20T10:00:00Z'),
      endDate: new Date('2026-04-20T22:00:00Z'),
      isOnline: false,
      maxAttendees: 500,
    },
    {
      creatorId: tenzinDorje.id,
      title: 'Meditation & Mindfulness Workshop',
      titleTib: 'བསམ་གཏན་དང་དྲན་པ་ཉེར་གཞག',
      description: 'A guided meditation and mindfulness workshop open to all levels. We will explore shamatha (calm abiding) and vipassana (insight) meditation techniques rooted in the Tibetan Buddhist tradition. Perfect for beginners and experienced practitioners alike. Zoom link will be shared upon RSVP.',
      type: EventType.TEACHING,
      location: 'Online — Zoom',
      startDate: new Date('2026-04-18T14:00:00Z'),
      endDate: new Date('2026-04-18T16:00:00Z'),
      isOnline: true,
      link: 'https://zoom.us/j/example-meditation-workshop',
      maxAttendees: 100,
    },
    {
      creatorId: yangchen.id,
      title: 'Tibetan Film Night: The Sun Behind the Clouds',
      description: 'Screening of the award-winning documentary "The Sun Behind the Clouds: Tibet\'s Struggle for Freedom" followed by a panel discussion with Tibetan community leaders. Light Tibetan snacks will be served. This is a rare opportunity to watch this powerful film on the big screen and discuss its relevance today.',
      type: EventType.CULTURAL,
      location: 'Tibet House US',
      city: 'New York',
      country: 'USA',
      latitude: 40.7394,
      longitude: -73.9879,
      startDate: new Date('2026-04-22T19:00:00Z'),
      endDate: new Date('2026-04-22T22:00:00Z'),
      isOnline: false,
      maxAttendees: 80,
    },
    {
      creatorId: pema.id,
      title: 'Language Exchange Meetup',
      titleTib: 'སྐད་ཡིག་བརྗེ་རེས་འཚོགས་འདུ།',
      description: 'Practice your Tibetan (Lhasa, Kham, or Amdo dialect) in a friendly, informal setting! Paired conversation practice, group games, and cultural sharing. All levels welcome — from complete beginners to native speakers looking to help. Coffee and cha ngarmo provided.',
      type: EventType.SOCIAL,
      location: 'Tibetan Canadian Cultural Centre',
      city: 'Toronto',
      country: 'Canada',
      latitude: 43.7615,
      longitude: -79.4111,
      startDate: new Date('2026-04-19T15:00:00Z'),
      endDate: new Date('2026-04-19T18:00:00Z'),
      isOnline: false,
      maxAttendees: 40,
    },
    {
      creatorId: karmaWangchuk.id,
      title: 'Kham Traditional Dance Evening',
      titleTib: 'ཁམས་ཀྱི་གཞས་བྲོ་དགོང་མོ།',
      description: 'An evening celebrating the rich dance traditions of Kham! Learn traditional Khampa dances, enjoy live music featuring dranyen and piwang, and connect with fellow Kham community members. No experience necessary — just bring your energy and enthusiasm. Traditional Kham attire welcome!',
      type: EventType.CULTURAL,
      location: 'Tibetan Community Centre',
      city: 'London',
      country: 'UK',
      latitude: 51.5074,
      longitude: -0.1278,
      startDate: new Date('2026-04-25T18:00:00Z'),
      endDate: new Date('2026-04-25T22:00:00Z'),
      isOnline: false,
      maxAttendees: 120,
    },
  ];

  for (const eventData of events) {
    await prisma.event.create({ data: eventData });
    console.log(`   ✅ ${eventData.title}`);
  }

  console.log(`\n   📊 Created ${events.length} events.\n`);

  // ========================
  // STEP 5: Create feed posts
  // ========================
  console.log('📝 Creating feed posts...');

  const tashiDolma = createdUsers.find(u => u.firstName === 'Tashi' && u.gender === 'Female')!;

  const feedPosts = [
    {
      authorId: dolma.id,
      type: FeedPostType.TEXT,
      content: 'Just had the most amazing thukpa at a little restaurant in McLeod Ganj. Nothing beats home cooking! 🍜',
    },
    {
      authorId: lobsang.id,
      type: FeedPostType.TEXT,
      content: 'Excited to announce I\'m organizing a Tibetan coding meetup in NYC next month. Any developers out there? 💻',
    },
    {
      authorId: pema.id,
      type: FeedPostType.TEXT,
      content: 'Beautiful morning practice today. Grateful for this community that keeps our traditions alive 🙏',
    },
    {
      authorId: karmaWangchuk.id,
      type: FeedPostType.TEXT,
      content: 'New track dropping next week — blending traditional Tibetan instruments with electronic beats. Stay tuned! 🎵',
    },
    {
      authorId: tashiDolma.id,
      type: FeedPostType.TEXT,
      content: 'Spent the weekend volunteering at the Tibetan Children\'s Village. These kids are incredible. ❤️',
    },
  ];

  for (const postData of feedPosts) {
    await prisma.feedPost.create({ data: postData });
  }

  console.log('   ✅ Created 5 feed posts.');
  console.log('');

  // ========================
  // STEP 6: Create topic channels
  // ========================
  console.log('💬 Creating topic channels...');

  const topicChannels = [
    { name: 'Dharma Talk', iconEmoji: '🙏', description: 'Discuss Buddhist teachings and practice', position: 0 },
    { name: 'Dating Advice', iconEmoji: '💝', description: 'Get and share dating tips', position: 1 },
    { name: 'Tibetan Music', iconEmoji: '🎵', description: 'Share and discover Tibetan music', position: 2 },
    { name: 'Language Practice', iconEmoji: '🗣️', description: 'Practice Tibetan with others', position: 3 },
    { name: 'Kham Corner', iconEmoji: '🏔️', description: 'For Kham folks to connect', position: 4 },
    { name: 'Amdo Corner', iconEmoji: '🌾', description: 'For Amdo folks to connect', position: 5 },
  ];

  for (const channel of topicChannels) {
    await prisma.topicChannel.create({ data: channel });
    console.log(`   ✅ #${channel.name} ${channel.iconEmoji}`);
  }

  console.log(`\n   📊 Created ${topicChannels.length} topic channels.\n`);

  // ========================
  // STEP 7: Create a live room
  // ========================
  console.log('🎙️  Creating rooms...');

  const ngawang = findUser('Ngawang');
  const kunga = findUser('Kunga');

  const room = await prisma.room.create({
    data: {
      hostId: lobsang.id,
      title: 'Friday Night Hangout',
      description: 'Casual hangout for the Tibetan community. Come chat about your week, share stories, and meet new people. All are welcome!',
      type: RoomType.OPEN,
      topicTag: 'Social',
      status: RoomStatus.LIVE,
      maxSpeakers: 8,
      participants: {
        create: [
          { userId: lobsang.id, role: RoomRole.HOST, isMuted: false },
          { userId: ngawang.id, role: RoomRole.SPEAKER, isMuted: false },
          { userId: kunga.id, role: RoomRole.LISTENER, isMuted: true },
        ],
      },
    },
  });

  console.log(`   ✅ Room: "Friday Night Hangout" (LIVE, hosted by Lobsang Gyatso)`);
  console.log('      Participants: Lobsang (HOST), Ngawang (SPEAKER), Kunga (LISTENER)');
  console.log('');

  // ========================
  // DONE
  // ========================
  console.log('═══════════════════════════════════════════════');
  console.log('🎉 Seed complete!');
  console.log('═══════════════════════════════════════════════');
  console.log(`   👤 ${createdUsers.length} users with profiles, photos & prompts`);
  console.log('   🎟️  10 invite codes (TSEWA1-TSEWA10)');
  console.log(`   📅 ${events.length} events`);
  console.log(`   📝 ${feedPosts.length} feed posts`);
  console.log(`   💬 ${topicChannels.length} topic channels`);
  console.log('   🎙️  1 live room');
  console.log('');
  console.log('   📧 Login with: {firstname}.{lastname}@tsewa.test');
  console.log('   🔑 Password:  password123');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('\n❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
