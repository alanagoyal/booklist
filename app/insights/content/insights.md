## Mapping the Literary Galaxy of Notable Minds

> A guided tour through 17,058 book recommendations from 1,932 notable thinkers

### Introduction

Books do more than sit on shelves. They criss‑cross communities, plant seeds of belief, and expose the private preoccupations of the people around us. What you read says a lot about what you think, who you are, and what you want to become.

Below is a richer, deeper tour of those connections, split into two big constellations: **people** and **books**. Each constellation has two smaller clusters so you can jump straight to the insights that matter.

**Quick note on method**: numbers come from 17 k+ recs by ~2 k notable people. "Types" are the 18 professional / creative categories in our supabase schema. Genre counts use the cleaned full‑stack categorization we built earlier.

---

### 1. Takeaways on Tastemakers

#### 1.1 Which people share the most recommendations?

We first explored the pairs of recommenders with the highest overlap in book recommendations to understand where literary tastes converge among notable people. This reveals clusters of shared interests and possibly common cultural or professional influences.

| **People**         | **Shared Recs** | **Types**                             |
| -------------------------------- | --------------: | ------------------------------------- |
| Emily Thomas ↔ Emily Wilson     |              33 | Authors / publishers                  |
| Timothy Noah ↔ Steven Nadler    |              30 | Journalist ↔ historian / philosopher |
| Anne Wojcicki ↔ Mike Maples Jr. |              15 | Entrepreneur ↔ investor              |
| Mike Maples Jr. ↔ Albert Wenger |              15 | Investor ↔ investor                  |
| Anne Wojcicki ↔ John Doerr      |              15 | Entrepreneur ↔ investor              |

**What it means**  
High‑overlap pairs usually sit in adjacent social or intellectual circles: the twin Emilys inhabit the same literary ecosystem, and investors and founders trade the same strategy tomes. Yet the journalist–philosopher bridge (Noah ↔ Nadler) shows how reportage and academic history converge on a shared canon—texts that unpack power and morality from both on‑the‑ground and theoretical vantage points.

**So what?**  
When two public figures love the same thirty‑plus books, their audiences quietly acquire a shared vocabulary. Collaborations feel natural, interviews dive deeper, and ideas hop domains faster.

---

#### 1.2 Which types of people share the most similar book tastes?

We then explored which types of notable people have the most overlapping book recommendations.

| **Type Pair**                                  | **Books in Common** |
| ---------------------------------------------- | ------------------: |
| Entrepreneurs ↔ investors                     |               1,263 |
| Authors / publishers ↔ musicians / filmmakers |               1,100 |
| Authors / publishers ↔ entertainers           |              ~1,000 |
| Entrepreneurs ↔ journalists                   |                 490 |
| Entrepreneurs ↔ musicians / filmmakers        |                 436 |

**Interpretation**

- **Entrepreneurs + investors** share a strategic canon—e.g., _Zero to One_, _Antifragile_.
- **Creative cluster** (authors, musicians, entertainers) overlaps on memoirs of creative struggle and storytelling craft.
- **Entrepreneurs ↔ journalists** hints at a symbiosis: founders need narrative; reporters need compelling case studies.

Shared lists act as informal professional development. When investors and founders read the same books, due‑diligence meetings start at a higher intellectual baseline.

---

#### 1.3 Which types of people recommend the widest variety of genres?

We analyzed which types of notable people recommend books across the broadest range of genres. This reveals who tends to have the most eclectic literary tastes, reflecting their diverse interests and intellectual curiosity.

| **Type**                  | **Distinct genres recommended** |
| ------------------------- | ------------------------------: |
| Authors / publishers      |                             519 |
| Entrepreneurs             |                             316 |
| Musicians / filmmakers    |                             314 |
| Scientists                |                             140 |
| Engineers / technologists |                              41 |

**Analysis**  
Perhaps unsurprisingly, authors prove cultural omnivores; entrepreneurs trail with surprisingly broad taste; engineers favor depth over breadth.

**Why diversity matters**  
Genre breadth fosters “idea recombination.” A founder who reads both stoic philosophy and ethnography can cross‑wire mental models. Meanwhile, an engineer steeped in a single domain can push that domain further through obsessive mastery.

---

#### 1.4 Which people have the most narrow tastes?

We identified the recommenders who have the most narrow tastes, revealing who tends to have the most eclectic literary tastes, reflecting their diverse interests and intellectual curiosity.

- **Engineers**: Linus Torvalds and Gilbert Strang stick to only one technical genre.
- **Anthropologists and art critics**: Scott Warren and Shaun McNiff are equally mono‑genre.
- **Entrepreneurs and authors**: Pete Flint and Tammy Cohen are single‑genre loyalists inside eclectic communities.

Even in diverse circles, laser‑focused lists can signal authority—“I’m _the_ linear‑algebra guy”—and make recommendations stickier.

---

### 2. Learnings on Books

#### 2.1 The universal canon — books that cross all borders

| **Book**                           | **Total recs** | **Type diversity** |
| ---------------------------------- | -------------: | -----------------: |
| _The Hard Thing About Hard Things_ |             29 |                  7 |
| _The Catcher in the Rye_           |             29 |                  8 |
| _Moby‑Dick_                        |             25 |                  7 |
| _Man’s Search for Meaning_         |             23 |                  8 |
| _Meditations_                      |             23 |                  8 |
| _1984_                             |             21 |                  8 |
| _Thinking, Fast and Slow_          |             19 |                  8 |

**Analysis**  
These titles form a lingua franca—business struggle, existential meaning, psychology, and social critique that everyone can tap.

**Canon as connective tissue**  
When a scientist and a VC both love _Meditations_, a shared ethical lens accelerates collaboration.

---

#### 2.2 Which books are recommended by the narrowest tastes?

We identified the books that are recommended by the fewest types of people.

| **Book**                            | **Exclusive type**           |
| ----------------------------------- | ---------------------------- |
| _Legacy of Ashes_                   | Authors / publishers         |
| _Forcing God’s Hand_                | Entertainers                 |
| _Dear Data_                         | Product managers / designers |
| _The Narrow Road to the Deep North_ | Entertainers                 |
| _The Net Delusion_                  | Journalists                  |

Exclusive picks act like subculture passwords. Surfacing them invites cross‑pollination—what could an engineer gain from an entertainer’s favorite wartime novel?

---

#### 2.3 Which genres have the most overlap?

| **Genre**                  | **Avg Books/Person** | **Avg People/Book** | **Profile**               |
| -------------------------- | -------------------: | ------------------: | ------------------------- |
| Nonfiction                 |             **1.03** |            **0.97** | Universal workhorse       |
| Self‑help                  |                 1.27 |                0.79 | Personal‑growth connector |
| Classic fiction            |                 0.26 |                3.85 | Tight canon, high overlap |
| Philosophy                 |                 0.53 |                1.88 | Specialist discourse      |
| Biography‑history‑politics |                   ≈1 |                  ≈1 | Balanced bridge           |

Nonfiction and self‑help appear everywhere; classic fiction sees many readers converge on a small shelf; philosophy stays niche.

---

#### 2.4 Which genres bridge communities?

1. **Nonfiction‑history‑politics** joins historians, investors, and journalists (e.g., _The Power Broker_).
2. **Philosophy‑nonfiction** merges abstract thought with real‑world consequences (e.g., _Antifragile_).
3. **Biography‑history / biography‑politics** humanizes big ideas (e.g., _Steve Jobs_, _Team of Rivals_).

Bridge genres translate one community’s concerns into another’s vocabulary—where innovation and empathy bloom.

---

### Conclusion

Our map reveals two forces:

- **Centripetal** — a small shared canon pulls thinkers toward common ground.
- **Centrifugal** — countless niche titles push boundaries outward.

### Try this

1. **Compute your overlap score.** List your last ten reads, see which clusters you fit, then add a book from a distant cluster.
2. **Adopt a hidden gem.** Pick one exclusive‑type book and share it with a colleague outside that profession.
3. **Build a bridge shelf.** Curate five books that each speak to different communities you care about; gift them to new teammates.

A reading list is more than media consumption—it’s a social signal and a creative toolkit. Track enough lists, and you see how ideas migrate, mutate, and occasionally change the world.
