import { gameState } from './state.js';
import { getSettings, getCustomCards } from './main.js'; // Circular dependency, but ok for this case

export const themes = {
    'midnight-gaming': { name: 'Midnight Gaming', rank: 1, preview: 'linear-gradient(135deg, #0f1419 0%, #2d1b69 100%)' },
    'ocean-depths': { name: 'Ocean Depths', rank: 2, preview: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 100%)' },
    'forest-sanctuary': { name: 'Forest Sanctuary', rank: 3, preview: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)' },
    'ruby-elegance': { name: 'Ruby Elegance', rank: 4, preview: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)' },
    'arctic-professional': { name: 'Arctic Professional', rank: 5, preview: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)' },
    'sunset-lounge': { name: 'Sunset Lounge', rank: 6, preview: 'linear-gradient(135deg, #ea580c 0%, #7c2d12 100%)' },
    'charcoal-minimalist': { name: 'Charcoal Minimalist', rank: 7, preview: 'linear-gradient(135deg, #374151 0%, #6b7280 100%)' },
    'lavender-dreams': { name: 'Lavender Dreams', rank: 8, preview: 'linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%)' },
    'copper-industrial': { name: 'Copper Industrial', rank: 9, preview: 'linear-gradient(135deg, #92400e 0%, #d97706 100%)' },
    'neon-cyber': { name: 'Neon Cyber', rank: 10, preview: 'linear-gradient(135deg, #000000 0%, #330066 100%)' },
    'light': { name: 'Classic Light', rank: 11, preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    'dark': { name: 'Classic Dark', rank: 12, preview: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)' }
};

export const cardDatabase = {
    base: {
        name: "Base Game",
        black: [ { text: "_ is the leading cause of death among _.", pick: 2 }, { text: "What's that sound?", pick: 1 }, { text: "I never truly understood _ until I encountered _.", pick: 2 }, { text: "What's the next Disney movie?", pick: 1 }, { text: "War! What is it good for?", pick: 1 }, { text: "_ would be woefully incomplete without _.", pick: 2 }, { text: "What's that smell?", pick: 1 }, { text: "This is the way the world ends. Not with a bang, but with _.", pick: 1 }, { text: "Alternative medicine is now embracing the curative powers of _.", pick: 1 }, { text: "And the Academy Award for _ goes to _.", pick: 2 }, { text: "What never fails to liven up the party?", pick: 1 }, { text: "_ + _ = _.", pick: 3 }, { text: "What's the most emo?", pick: 1 }, { text: "Instead of coal, Santa now gives the bad children _.", pick: 1 }, { text: "What helps the president unwind?", pick: 1 }, { text: "What's there a ton of in heaven?", pick: 1 }, { text: "Studies show that lab rats navigate mazes 50% faster after being exposed to _.", pick: 1 }, { text: "I do not know with what weapons World War III will be fought, but World War IV will be fought with _.", pick: 1 }, { text: "What gives me uncontrollable gas?", pick: 1 }, { text: "When I am President of the United States, I will create the Department of _.", pick: 1 }, { text: "Life was a lot easier before _ came along.", pick: 1 }, { text: "I got 99 problems but _ ain't one.", pick: 1 }, { text: "My mom freaked out when she looked at my browser history and found _.", pick: 1 }, { text: "What's my secret power?", pick: 1 }, { text: "But before I kill you, Mr. Bond, I must show you _.", pick: 1 }, { text: "What's the new fad diet?", pick: 1 }, { text: "What did I bring back from Mexico?", pick: 1 }, { text: "The class field trip was completely ruined by _.", pick: 1 }, { text: "What don't you want to find in your Chinese food?", pick: 1 }, { text: "What would grandma find disturbing, yet oddly charming?", pick: 1 }, { text: "What will always get you laid?", pick: 1 }, { text: "In the new Disney Channel Original Movie, Hannah Montana struggles with _ for the first time.", pick: 1 }, { text: "What's my anti-drug?", pick: 1 }, { text: "How am I maintaining my relationship status?", pick: 1 }, { text: "What will I bring back in time to convince people that I am a powerful wizard?", pick: 1 }, { text: "What has been making life difficult at the nudist colony?", pick: 1 }, { text: "What do old people smell like?", pick: 1 }, { text: "What am I giving up for Lent?", pick: 1 }, { text: "What's the gift that keeps on giving?", pick: 1 }, { text: "Next from J.K. Rowling: Harry Potter and the Chamber of _.", pick: 1 }, { text: "In M. Night Shyamalan's new movie, Bruce Willis discovers that _ had really been _ all along.", pick: 2 }, { text: "What ended my last relationship?", pick: 1 }, { text: "MTV's new reality show features eight washed-up celebrities living with _.", pick: 1 }, { text: "I drink to forget _.", pick: 1 }, { text: "Coming to Broadway this season, _: The Musical.", pick: 1 }, { text: "A romantic, candlelit dinner would be incomplete without _.", pick: 1 }, { text: "White people like _.", pick: 1 }, { text: "What's a girl's best friend?", pick: 1 }, { text: "What's the next Happy Meal toy?", pick: 1 }, { text: "While the United States raced the Soviet Union to the moon, the Mexican government funneled millions of pesos into research on _.", pick: 1 } ],
        white: [ "Kids with unfortunate medical conditions", "Terrible life choices", "An awkward social situation", "Prescription medication", "Endless repetition", "The patriarchy", "Social conformity", "Questionable fashion choices", "Family dysfunction", "Religious extremism", "A child beauty pageant", "Biological functions", "A good sniff", "Medical complications", "Buzzing insects", "Switching to a competitor", "An actor's unfortunate anatomy", "Inappropriate photographs", "A professional wrestler", "A talk show host's physical attributes", "Overly enthusiastic gestures", "A superhero", "Poor life choices", "Psychological defense mechanisms", "Friendly pillow fights", "Soup that is too hot", "A media personality doing something dramatic", "A political figure's physical attributes", "Performance enhancing drugs", "Meaningless conversation", "Heartwarming orphans", "An unusual medical procedure", "Digestive issues", "Getting really high", "Inappropriate family relationships", "Historical villains", "Weaponized appendages", "The American Dream", "My collection of adult toys", "Being mean to children", "Grandma", "Famous people", "Public embarrassment", "Protein sources", "Adult activities", "The violation of our most basic human rights", "A developmental condition", "Unusual bodily functions", "Teenagers", "Impressive physical fitness", "Military pilots", "Questionable sportsmanship", "My anatomy", "Social commentary", "Free samples", "Pretending to care", "My relationship status", "Relaxing music", "A blank space", "Art class", "A disturbing image", "Supernatural beings", "Hope", "A medical condition", "An actor's career choices", "A container full of organs", "Inappropriate musical expressions", "Physics", "My inner demons", "Corporate buzzwords", "Musical performances", "Business consultants", "Online gaming", "Social media metrics", "A sudden medical emergency", "A balanced breakfast", "Technological improvements", "A mundane lifestyle", "A criminal investigation", "Athletic prowess", "Cosmetic surgery", "Human emotions", "Card games on motorcycles", "A controversial belief system", "Multiple romantic partners", "Being fabulous", "A political figure", "A celebrity's private moments" ]
    },
    expansion1: {
        name: "Social Media Pack",
        black: [ { text: "My TikTok went viral because of _.", pick: 1 }, { text: "Breaking: Local influencer cancelled for _.", pick: 1 }, { text: "Instagram vs Reality: What looks like _ is actually _.", pick: 2 }, { text: "The new social media trend involves _ and _.", pick: 2 }, { text: "LinkedIn is now endorsing people for _.", pick: 1 }, { text: "My Zoom background accidentally revealed _.", pick: 1 }, { text: "Twitter's new policy bans _.", pick: 1 }, { text: "I got unfriended because of my post about _.", pick: 1 }, { text: "The new dating app matches people based on _.", pick: 1 }, { text: "My search history is full of _.", pick: 1 }, { text: "The newest podcast is just three hours of _.", pick: 1 }, { text: "My followers expect daily content about _.", pick: 1 }, { text: "The algorithm keeps showing me ads for _.", pick: 1 }, { text: "I accidentally livestreamed _.", pick: 1 }, { text: "My profile says I'm interested in _.", pick: 1 } ],
        white: [ "Parasocial relationships", "Crypto scams", "Influencer marketing", "Cancel culture", "Engagement farming", "Sponsored content", "Digital detox", "Internet drama", "Viral challenges", "Online trolls", "Echo chambers", "Fake news", "Data mining", "Digital addiction", "Online harassment", "Virtual reality", "Artificial intelligence", "Smart home devices", "Subscription services", "Cloud storage" ]
    },
    expansion2: {
        name: "Modern Life Pack",
        black: [ { text: "The real reason I work from home is _.", pick: 1 }, { text: "My therapist says I have issues with _.", pick: 1 }, { text: "The gig economy has made everyone a part-time _.", pick: 1 }, { text: "Climate change is causing _ in my backyard.", pick: 1 }, { text: "My meditation app reminded me to focus on _.", pick: 1 }, { text: "The food delivery driver judged me for ordering _.", pick: 1 }, { text: "My smart home device overheard me talking about _.", pick: 1 }, { text: "The subscription service I forgot about was for _.", pick: 1 }, { text: "My electric car runs on _ and good intentions.", pick: 1 }, { text: "The new self-help book is called 'Finding Yourself Through _'.", pick: 1 }, { text: "My coffee shop loyalty card rewards me with _.", pick: 1 }, { text: "The new exercise trend combines yoga with _.", pick: 1 }, { text: "My student loans will be paid off by _.", pick: 1 }, { text: "The housing market crashed because of _.", pick: 1 }, { text: "My side hustle involves selling _.", pick: 1 } ],
        white: [ "Microplastics", "Essential oils", "Kombucha culture", "Cryptocurrency mining", "Minimalist lifestyle", "Plant-based meat", "Fast fashion", "Mindfulness apps", "Urban gardening", "Electric scooters", "Sustainable living", "Wellness culture", "Artisanal everything", "Organic certification", "Zero waste lifestyle", "Digital nomads", "Coworking spaces", "Meal prep culture", "Productivity hacks", "Self-care Sunday" ]
    },
    expansion3: {
        name: "Gaming & Internet Pack",
        black: [ { text: "My gaming setup is missing _.", pick: 1 }, { text: "The new battle royale game features 100 players and _.", pick: 1 }, { text: "I got banned from the Discord server for _.", pick: 1 }, { text: "My livestream was ruined by _.", pick: 1 }, { text: "The speedrun world record was broken using _.", pick: 1 }, { text: "My K/D ratio improved after I discovered _.", pick: 1 }, { text: "The new DLC includes _ as a playable character.", pick: 1 }, { text: "I spent $500 on microtransactions just to get _.", pick: 1 }, { text: "The toxic player in our lobby kept talking about _.", pick: 1 }, { text: "My parents don't understand why I need _ to game properly.", pick: 1 }, { text: "The game was delayed because the developers couldn't figure out _.", pick: 1 }, { text: "My favorite streamer was demonetized for showing _.", pick: 1 }, { text: "The esports tournament was rigged with _.", pick: 1 }, { text: "I'm addicted to _ and it's ruining my life.", pick: 1 }, { text: "The new update nerfed _ into the ground.", pick: 1 } ],
        white: [ "RGB lighting", "Mechanical keyboards", "Gaming chairs", "Energy drinks", "Rage quitting", "Stream sniping", "Pay-to-win mechanics", "Loot boxes", "Camping strategies", "Respawn timers", "Achievement hunting", "Speedrunning glitches", "Frame rate drops", "Network lag", "Console wars", "PC master race", "Casual gamers", "Hardcore raiders", "Beta testing", "Early access" ]
    }
};

export const devCardDatabase = {
    dev: {
        name: "🚧 Development Deck",
        black: [ { text: "Scientists have discovered that _ is actually caused by _.", pick: 2 }, { text: "The new Marvel movie features _ fighting against _.", pick: 2 }, { text: "Breaking News: Local man arrested for _.", pick: 1 }, { text: "My therapist says my obsession with _ stems from _.", pick: 2 }, { text: "The latest self-help book: 'How to Overcome _ in 30 Days'.", pick: 1 }, { text: "My dating profile mentions my love for _.", pick: 1 }, { text: "The zombie apocalypse started because someone ate _.", pick: 1 }, { text: "My Uber driver wouldn't stop talking about _.", pick: 1 }, { text: "The new startup idea: It's like Uber, but for _.", pick: 1 }, { text: "My Amazon shopping cart is full of _.", pick: 1 } ],
        white: [ "Emotional support animals", "Cryptocurrency mining", "Influencer culture", "Cancel culture", "Social media addiction", "Dating apps", "Food delivery services", "Streaming services", "Self-driving cars", "Voice assistants", "Smart home devices", "Virtual reality", "Artificial intelligence", "Machine learning", "Blockchain technology", "Cloud computing", "Internet of Things", "Augmented reality", "3D printing", "Quantum computing" ]
    }
};

export function getAllWhiteCards() {
    let cards = [];
    gameState.selectedExpansions.forEach(exp => {
        const deck = exp === 'dev' ? devCardDatabase.dev : cardDatabase[exp];
        if (deck) cards.push(...deck.white);
    });
    if (getSettings().enableCustomCards) {
        cards.push(...getCustomCards().white);
    }
    return cards.length > 0 ? cards : ['No cards available'];
}

export function getAllBlackCards() {
    let cards = [];
    gameState.selectedExpansions.forEach(exp => {
        const deck = exp === 'dev' ? devCardDatabase.dev : cardDatabase[exp];
        if (deck) cards.push(...deck.black);
    });
    if (getSettings().enableCustomCards) {
        cards.push(...getCustomCards().black);
    }
    return cards.length > 0 ? cards : [{ text: 'No cards available', pick: 1 }];
}
