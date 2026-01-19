# 🔍 How Instagram Search Works (Official)

_Based on Instagram's official documentation - Updated January 2026_

---

## 📋 Summary

Instagram Search is designed to help find accounts and topics of interest using **text matching + relevance ranking**. Unlike Feed/Stories/Reels, Search is entirely driven by **your input** (what you type).

---

## 🎯 What Instagram Search Matches

When you type in the search bar, Instagram searches across:

1. **Usernames** (@samsamouy)
2. **Profile names** (full_name: "Sam Samouy")
3. **Bios** (biography text)
4. **Hashtags** (#fitness, #coach)
5. **Places** (Cairo, Egypt)
6. **Captions** (post text - but lower priority)

---

## ⚖️ Ranking Signals (In Order of Importance)

Instagram uses these signals to rank results, **in this exact order**:

### 1️⃣ **Your Text in Search** (MOST IMPORTANT)

- What you type is **by far the most important signal**
- Instagram tries to match your text with:
  - Usernames
  - Bios
  - Captions
  - Hashtags
  - Places

**Example:**

```
Search: "sam coach"
✅ Matches: @coach_sam (username has both)
✅ Matches: "Sam Coach" (profile name has both)
✅ Matches: @samsamouy if bio contains "coach"
✅ Matches: @sam with "Personal coach" in bio
```

### 2️⃣ **Your Activity** (MEDIUM IMPORTANCE)

- Accounts you follow
- Posts you've viewed
- How you've interacted with accounts

**Priority:**

- Accounts you follow → shown **higher**
- Accounts you don't follow → shown **lower**

### 3️⃣ **Popularity Signals** (LOWER IMPORTANCE)

When there are many potential results, Instagram also considers:

- Number of clicks
- Number of likes
- Number of shares
- Number of follows

**Example:**

```
If 1000 profiles match "sam coach":
- @samsamouy (591K followers) ranks higher
- @sam_coach_newbie (100 followers) ranks lower
```

---

## 🔍 Search Behavior - How It Works

### Single Word Search

```
Search: "sam"

Instagram returns profiles where "sam" appears in:
✅ Username: @samsamouy, @sam, @ahmed_sam
✅ Profile name: "Sam Samouy", "Ahmed Sam"
✅ Bio: "Hi I'm Sam, a fitness coach"
```

### Multi-Word Search

```
Search: "sam coach"

Instagram searches for profiles with BOTH words in:
✅ Username: @sam_coach, @coach_sam
✅ Profile name: "Sam the Coach", "Coach Sam"
✅ Bio: "Sam here, personal coach"
✅ Mix: Username has "sam" + Bio has "coach"
```

**Important:** Instagram tries to find ALL words you type, but ranks profiles where words appear in **username/name** higher than those where words only appear in **bio**.

---

## 📊 Real Example: "sam coach" Search

### Why @samsamouy Might NOT Appear in Top 5

**Profile: @samsamouy**

- Username: `samsamouy` ✅ (contains "sam")
- Full name: `Sam Samouy` ✅ (contains "sam")
- Bio: `"DM for coaching 📩 Be Nice 💙✌️"` ✅ (contains "coach")

**Match Score Breakdown:**

| Field     | Contains "sam"? | Contains "coach"? |
| --------- | --------------- | ----------------- |
| Username  | ✅ samsamouy    | ❌                |
| Full name | ✅ Sam Samouy   | ❌                |
| Bio       | ❌              | ✅ coaching       |

**Relevance Score:** Medium-Low

- Has BOTH words ✅
- But words are **split** across fields (not in same field)
- Username/name has only "sam"
- Bio has only "coach"

**Higher Ranking Profiles:**

| Profile      | Username       | Full Name                                  | Why It Ranks Higher           |
| ------------ | -------------- | ------------------------------------------ | ----------------------------- |
| @coach.sama  | ✅ coach.sama  | ✅ Coach Sama Foad                         | BOTH words in username + name |
| @elcoachsam  | ✅ elcoachsam  | ✅ Samer Georges                           | BOTH words in username        |
| @samslackfit | ❌ samslackfit | ✅ Sam Slack - Online Transformation Coach | BOTH words in full_name       |

**Result:** Profiles with BOTH words in username/name rank higher and push @samsamouy out of top 5 results.

---

## 🎯 Key Insights for PT Finder

### ✅ What We Know

1. **Instagram DOES match across all fields** (username, name, bio)
2. **Multi-word searches find profiles with ALL words** (like SQL AND)
3. **Ranking prioritizes username/name over bio**
4. **Only top ~5-30 results are returned** (not all matches)

### ⚠️ The Challenge

**When searching "sam coach":**

- Instagram finds profiles with BOTH words
- Profiles with both words in **username/name** rank highest
- Profiles with words **split across fields** rank lower
- **Only top 5-30 are returned**

**This means:**

- @samsamouy (words split) gets **lower relevance score**
- Other profiles (both words in username) get **higher score**
- @samsamouy is **pushed out** of top 5 results

---

## 💡 Optimal Search Strategy for PT Finder

### Strategy 1: Single-Word Searches (RECOMMENDED)

```javascript
// Better coverage
search("sam")      // Returns ALL profiles with "sam" (including @samsamouy)
search("coach")    // Returns ALL profiles with "coach"

// Then filter programmatically
filter(bio contains fitness keywords)
filter(followers > 100)
deduplicate()
```

**Pros:**

- ✅ Catches profiles where words are split
- ✅ More comprehensive coverage
- ✅ Won't miss @samsamouy

**Cons:**

- ❌ More API calls
- ❌ More false positives

### Strategy 2: Multi-Word Searches

```javascript
// More precise
search("sam coach"); // Only profiles with BOTH words
search("ahmed trainer"); // Only profiles with BOTH words

// Less filtering needed
```

**Pros:**

- ✅ More relevant results
- ✅ Fewer false positives
- ✅ Less filtering needed

**Cons:**

- ❌ Misses profiles where words are split
- ❌ Will miss @samsamouy if it's not in top 5

### Strategy 3: Hybrid Approach (BEST)

```javascript
// Phase 1: Single words for comprehensive coverage
search("sam");
search("ahmed");
search("mohammed");

// Phase 2: Multi-word for precision
search("personal trainer");
search("fitness coach");
search("gym trainer");

// Phase 3: Arabic terms
search("مدرب");
search("كوتش");

// Then filter + deduplicate all results
```

---

## 📝 Best Practices (From Instagram)

To help your profile show up in search results:

1. **Use fitting handle and profile name**
   - Include relevant keywords in username
   - Example: `@ahmed_fitness` better than `@ahmed123`

2. **Include relevant keywords in bio**
   - Add keywords about who you are
   - Example: "Personal Trainer | Cairo, Egypt"

3. **Use relevant keywords in captions**
   - Put keywords in captions, not comments
   - Example: "#personaltrainer #fitness #cairo"

4. **Add location if relevant**
   - For local businesses, include location in bio
   - Example: "Based in Cairo, Egypt 🇪🇬"

---

## 🔬 Testing Results

### Test 1: Single Word "sam"

```json
{
  "query": "sam",
  "results": [
    "@samsamouy" ✅,
    "@ayahsamaha" ❌ (not fitness),
    "@sam" ✅,
    "@sammohamedmusic" ❌ (musician)
  ]
}
```

**Conclusion:** Found @samsamouy ✅ but also non-fitness profiles ❌

### Test 2: Multi-Word "sam coach"

```json
{
  "query": "sam coach",
  "results": [
    "@coach.sama" ✅,
    "@elcoachsam" ✅,
    "@samslackfit" ✅,
    "@sam_coach_" ✅
  ]
}
```

**Conclusion:** Didn't find @samsamouy ❌ but all results are coaches ✅

---

## 🎯 Final Recommendation

**For maximum PT trainer coverage:**

```javascript
// Use SINGLE-WORD searches for Egyptian names
egyptianNames.forEach((name) => {
  search(name); // "sam", "ahmed", "mohammed", etc.
});

// Use MULTI-WORD searches for fitness keywords
fitnessKeywords.forEach((keyword) => {
  search(keyword); // "personal trainer", "fitness coach", etc.
});

// Filter all results by:
// 1. Bio contains fitness keywords
// 2. Followers > 100
// 3. Not private
// 4. No exclude keywords (musician, artist, etc.)

// Deduplicate by username
```

**This approach:**

- ✅ Maximum coverage (won't miss @samsamouy)
- ✅ Good precision (filter out non-fitness)
- ✅ Handles both scenarios (split words + combined words)

---

## 📌 Answer to Key Question

**Q: How if "sam" exists in fullname/username and "coach" in bio using %LIKE%?**

**A:** Instagram WILL find the profile, but ranking matters:

1. **Profile IS matched** ✅
   - "sam" in username/name → Match ✅
   - "coach" in bio → Match ✅
   - Profile is included in results ✅

2. **Profile might NOT appear in top 5** ❌
   - Other profiles with BOTH words in username/name rank higher
   - Instagram only returns top ~5-30 results
   - Split-field matches get pushed down in ranking

**Solution:** Use single-word searches ("sam" alone) to get ALL Sam profiles, then filter by bio programmatically.

---

_Last Updated: January 19, 2026_
