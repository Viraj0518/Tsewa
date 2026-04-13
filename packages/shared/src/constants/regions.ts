export const REGIONS = [
  { id: 'INDIA', label: 'India', labelTib: 'རྒྱ་གར' },
  { id: 'NEPAL', label: 'Nepal', labelTib: 'བལ་ཡུལ' },
  { id: 'NORTH_AMERICA', label: 'North America', labelTib: 'བྱང་ཨ་མེ་རི་ཀ' },
  { id: 'EUROPE', label: 'Europe', labelTib: 'ཡུ་རོབ' },
  { id: 'AUSTRALIA_NZ', label: 'Australia & NZ', labelTib: 'ཨོ་སི་ཊི་ལི་ཡ' },
  { id: 'EAST_ASIA', label: 'East Asia', labelTib: 'ཤར་ཨེ་ཤི་ཡ' },
  { id: 'TIBET', label: 'Tibet', labelTib: 'བོད' },
] as const;

export const DIALECTS = [
  { id: 'LHASA', label: 'Lhasa', labelTib: 'ལྷ་ས' },
  { id: 'KHAM', label: 'Kham', labelTib: 'ཁམས' },
  { id: 'AMDO', label: 'Amdo', labelTib: 'ཨ་མདོ' },
  { id: 'OTHER', label: 'Other', labelTib: 'གཞན' },
] as const;

export const BUDDHIST_PRACTICES = [
  { id: 'GELUG', label: 'Gelug', labelTib: 'དགེ་ལུགས' },
  { id: 'KAGYU', label: 'Kagyu', labelTib: 'བཀའ་བརྒྱུད' },
  { id: 'NYINGMA', label: 'Nyingma', labelTib: 'རྙིང་མ' },
  { id: 'SAKYA', label: 'Sakya', labelTib: 'ས་སྐྱ' },
  { id: 'BON', label: 'Bön', labelTib: 'བོན' },
  { id: 'SECULAR', label: 'Secular', labelTib: 'ཆོས་མེད' },
  { id: 'OTHER', label: 'Other', labelTib: 'གཞན' },
] as const;

export const DIASPORA_CITIES = [
  'Dharamsala', 'New Delhi', 'Kathmandu', 'New York', 'Toronto',
  'London', 'Zurich', 'Paris', 'Taipei', 'Melbourne', 'Minneapolis',
  'San Francisco', 'Boston', 'Washington DC', 'Portland',
] as const;
