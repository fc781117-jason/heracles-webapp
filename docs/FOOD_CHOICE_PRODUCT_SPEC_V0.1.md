# Food Choice PWA｜Product Spec V0.1

Status: PREVIEW
Branch: feature/food-choice-pwa-v01
Production: NOT TOUCHED

## Product goal

Merge the previous "今天吃什麼 / Delphi Oracle" and restaurant/izakaya evaluator into one lightweight mobile-first PWA.

Four entry modes:
1. 完全沒想法：filter first, then slot-machine random pick.
2. 看附近：browse nearby qualified restaurants.
3. 比較幾家：compare up to 5.
4. 查一家：search by restaurant name or Google Maps URL.

## Locked UX decisions

- No default minimum heart score; no hidden bias.
- Default walking range: 15 minutes.
- Budget means **per-person budget**.
- Home shows all four modes.
- Compare up to 5 restaurants.
- Keep izakaya-specific scoring mode.
- Mobile portrait first.
- Slot/reel animation should feel like a rolling selector.
- Restaurant result can show recommended dishes when evidence exists.
- Open-now is a first-class filter.
- Local guest mode remains available.
- Optional Google login enables cloud sync.
- JSON export/import remains available as user-controlled backup.
- iPhone install guide: Safari → Share → Add to Home Screen.

## Data model strategy

Guest:
- localStorage / IndexedDB
- favorites
- dislikes / block list
- recently eaten
- preferences
- compare list
- personal ratings
- spin history

Google account:
- Supabase Auth with Google
- per-user rows protected by RLS
- cloud as sync source
- local device as cache
- first login offers merge of guest data
- new device login restores cloud data

Always:
- JSON export
- JSON import

## Restaurant data

Google Places (New):
- nearby search
- place details
- open/close information
- Google rating
- price level/range when available
- reviews when explicitly requested

Cost control:
- use cheap list fields first
- fetch richer details only for finalists / selected restaurant
- do not fetch reviews for every candidate

## Scoring

Two different concepts must remain separate:

1. Google rating (external)
2. App heart score (our structured evaluation)

General restaurant score:
- food quality
- value / portion
- dining experience
- signature / distinctiveness
- overall recommendation

Izakaya mode:
- preserves beverage / alcohol completeness as a specialized factor

No app heart filter is enabled by default.

## Review / hygiene signal

Review text is an evidence signal, not a hygiene inspection result.

Possible warning categories:
- dirty / messy
- pests
- freshness
- illness mentions
- service
- value
- portion
- wait time

Warnings must include scope/limitations.

## Competitive ideas worth borrowing

- filter-before-random
- no-setup first-use path
- favorites / veto / reroll learning
- manual custom list / add restaurant
- current or custom search location
- navigation
- parking search
- native share
- personal rating
- saved lists

Differentiators:
- compare up to 5
- structured restaurant intelligence score
- hygiene/review signal
- recommended dishes with evidence
- izakaya mode
- guest + Google cloud sync
- JSON portability

## MVP phases

V0.1 Preview
- four-mode home
- filters
- slot animation
- mock restaurant cards
- comparison UI
- local favorites/block
- cloud-sync UI placeholder

V0.2 Live data
- Google Places nearby
- open now
- Google Maps links
- real restaurant search / URL parsing
- finalist detail fetch

V0.3 Account sync
- Google login
- Supabase schema / RLS
- local-to-cloud merge
- cross-device restore
- JSON import/export

V0.4 Intelligence
- structured app heart score
- izakaya specialized score
- review signal
- recommended dishes
- recent-eaten weighting
- share / parking / delivery links

## Free-first rules

- no OpenAI API in MVP.
- no image storage required.
- no mandatory account.
- avoid broad review fetching.
- keep deployment on Preview until explicit Production authorization.
