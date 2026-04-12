export const CONVERSATION_PROMPTS = [
  { id: 'fav_dish', text: "My favorite Tibetan dish is...", textTib: "ངའི་དགའ་ཤོས་ཀྱི་བོད་ཟས་ནི..." },
  { id: 'teaching', text: "The teaching that changed my life...", textTib: "ངའི་མི་ཚེ་བསྒྱུར་བའི་བསླབ་བྱ..." },
  { id: 'home', text: "When I think of home, I think of...", textTib: "ཕ་ཡུལ་དྲན་དུས..." },
  { id: 'weekend', text: "My perfect weekend looks like...", textTib: "ངའི་གཟའ་མཇུག་བདེ་ཤོས..." },
  { id: 'preserve', text: "I'm passionate about preserving...", textTib: "ང་སྲུང་སྐྱོབ་ལ་ཧུར་ཐག..." },
  { id: 'tradition', text: "The Tibetan tradition I value most...", textTib: "ངས་གཅེས་ཤོས་སུ་འཛིན་པའི་བོད་ཀྱི་སྲོལ་རྒྱུན..." },
  { id: 'laugh', text: "Something that always makes me laugh...", textTib: "རྟག་ཏུ་ང་དགོད་བཞིན་པའི..." },
  { id: 'fav_place', text: "My favorite place in the world...", textTib: "འཛམ་གླིང་ནང་ངའི་དགའ་ས..." },
  { id: 'knew_tibetan', text: "I knew I was Tibetan when...", textTib: "ང་བོད་པ་ཡིན་པ་ཤེས་དུས..." },
  { id: 'partner_quality', text: "The quality I value most in a partner...", textTib: "གྲོགས་པོའི་ནང་ངས་གཅེས་འཛིན་བྱེད་པའི..." },
  { id: 'dream_community', text: "My dream for the Tibetan community...", textTib: "བོད་མི་སྤྱི་ཚོགས་ཀྱི་རེ་བ..." },
  { id: 'live_anywhere', text: "If I could live anywhere, it would be...", textTib: "གང་ས་སྡོད་ཆོག་ན..." },
  { id: 'dream_language', text: "The language I dream in is...", textTib: "ང་རྨི་ལམ་ནང་བེད་སྤྱོད་བྱེད་པའི་སྐད..." },
  { id: 'buddhism_connection', text: "My connection to Buddhism is...", textTib: "ནང་ཆོས་དང་ངའི་འབྲེལ་བ..." },
  { id: 'name_story', text: "The story behind my name...", textTib: "ངའི་མིང་གི་ལོ་རྒྱུས..." },
] as const;

export type PromptId = typeof CONVERSATION_PROMPTS[number]['id'];
