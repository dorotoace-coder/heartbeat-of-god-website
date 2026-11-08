/**
 * Word of the Day — a fixed, local list of King James Version verses
 * (public domain). One verse per calendar day (UTC), rotating through the
 * list. No network calls, so it can never get stuck on "Loading…".
 */

export type Verse = { text: string; reference: string };

export const VERSES: Verse[] = [
  { reference: "Psalm 46:10", text: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth." },
  { reference: "Exodus 33:14", text: "And he said, My presence shall go with thee, and I will give thee rest." },
  { reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { reference: "Proverbs 3:5–6", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths." },
  { reference: "Isaiah 40:31", text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." },
  { reference: "Psalm 16:11", text: "Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore." },
  { reference: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." },
  { reference: "Jeremiah 33:3", text: "Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not." },
  { reference: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want." },
  { reference: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
  { reference: "Matthew 6:33", text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you." },
  { reference: "Joshua 1:9", text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest." },
  { reference: "2 Corinthians 5:17", text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new." },
  { reference: "Zechariah 4:6", text: "Not by might, nor by power, but by my spirit, saith the LORD of hosts." },
  { reference: "Acts 1:8", text: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth." },
  { reference: "Romans 12:2", text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God." },
  { reference: "Psalm 91:1", text: "He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty." },
  { reference: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness." },
  { reference: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest." },
  { reference: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
  { reference: "Hebrews 11:6", text: "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him." },
  { reference: "James 4:8", text: "Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded." },
  { reference: "Lamentations 3:22–23", text: "It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness." },
  { reference: "Psalm 27:1", text: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?" },
  { reference: "1 John 4:4", text: "Ye are of God, little children, and have overcome them: because greater is he that is in you, than he that is in the world." },
  { reference: "Ephesians 2:8–9", text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast." },
  { reference: "Mark 16:15", text: "And he said unto them, Go ye into all the world, and preach the gospel to every creature." },
  { reference: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path." },
  { reference: "John 4:24", text: "God is a Spirit: and they that worship him must worship him in spirit and in truth." },
  { reference: "Philippians 4:6–7", text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus." },
  { reference: "Galatians 2:20", text: "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me." },
];

/** Deterministic: the same UTC calendar day always returns the same verse. */
export function verseForDate(date: Date = new Date()): Verse {
  const day = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000,
  );
  return VERSES[((day % VERSES.length) + VERSES.length) % VERSES.length];
}
