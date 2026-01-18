# 📱 Instagram Profile Scraper

**A powerful, efficient Instagram scraper for extracting profile metadata and exporting to CSV/JSON. Works with Instagram's current Web API (January 2026).**

---

## ✨ Features

✅ **Single Profile Scraping** - Extract username, followers, bio, verification, etc.
✅ **Batch Processing** - Scrape multiple profiles at once (JSON + CSV export)
✅ **CSV Export** - Spreadsheet-friendly format for easy analysis
✅ **JSON Export** - Complete detailed data with timestamps
✅ **Photo Fetching** - Get photo URLs and download media
✅ **Session Management** - Validate authentication, refresh credentials
✅ **Rate Limiting** - Respectful scraping with automatic delays
✅ **Error Handling** - Clear messages and troubleshooting help

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install
cp .env.example .env
```

### 2. Update .env with Your Credentials

Get from Instagram browser:

- **COOKIE**: Open DevTools (F12) → Network → Copy Cookie header
- **USER_AGENT**: Use your browser's user agent
- **X_IG_APP_ID**: Find in any instagram.com/api/ request (usually 936619743392459)

### 3. Run Commands

```bash
# Get single profile
node instagramScraper.js profile ahmedootta

# Scrape multiple profiles (saves CSV + JSON)
node instagramScraper.js batch ahmedootta instagram facebook

# Get photos
node instagramScraper.js photos instagram

# Download photos locally
node instagramScraper.js photos instagram --download

# Test session
node instagramScraper.js test
```

---

## 📊 Usage Examples

### Example 1: Get Single Profile

```bash
$ node instagramScraper.js profile ahmedootta

✅ Profile found: @ahmedootta
  📝 Ahmed Ootta
  👥 Followers: 171 | Following: 219
  📸 Posts: 17
  ✓ Verified: No | Private: Yes
```

### Example 2: Batch Scrape to CSV

```bash
$ node instagramScraper.js batch instagram facebook twitter

✅ Scraped 3/3 profiles
✅ Results saved: profiles_2026-01-18.json
✅ CSV saved: profiles_2026-01-18.csv
```

**CSV Output:**

```csv
username,fullName,followers,following,verified,isPrivate
instagram,Instagram,698867886,179,Yes,No
facebook,Facebook,232817345,123,Yes,No
twitter,Twitter,111234567,456,Yes,No
```

### Example 3: Test Session

```bash
$ node instagramScraper.js test

✅ Environment variables loaded
✅ API authentication successful
✅ Session is valid!
```

---

## 📁 Output Files

Scraper creates a `scraper_output/` folder with:

- `profiles_YYYY-MM-DD.json` - Complete profile data
- `profiles_YYYY-MM-DD.csv` - Spreadsheet format (for Excel/Sheets)
- `photos_USERNAME/` - Downloaded photos (if using --download)

---

## 🛠️ All Commands

| Command                        | Purpose                            |
| ------------------------------ | ---------------------------------- |
| `profile <username>`           | Get single profile metadata        |
| `batch <user1> <user2> ...`    | Get multiple profiles (JSON + CSV) |
| `photos <username>`            | List photos from profile           |
| `photos <username> --download` | Download all photos locally        |
| `test`                         | Verify session is working          |
| `help`                         | Show help message                  |

---

## 📝 Example CSV Output

Perfect for analysis in Excel or Google Sheets:

```
username,fullName,userId,followers,following,postsCount,verified,businessAccount,isPrivate
ahmedootta,Ahmed Ootta,8042929013,171,219,17,No,No,Yes
instagram,Instagram,25025320,698867886,179,8305,Yes,No,No
facebook,Facebook,25025307,232817345,123,2145,Yes,No,No
```

---

## 🔐 Getting Your Credentials

### Step 1: Get Cookie

1. Log into Instagram
2. Open DevTools (F12)
3. Go to Network tab
4. Look for any request to instagram.com/api/
5. Find the **Cookie** header
6. Copy entire value
7. Paste into .env COOKIE=...

### Step 2: Get User-Agent

1. In DevTools Console type: `navigator.userAgent`
2. Copy the output
3. Paste into .env USER_AGENT=...

### Step 3: Get App ID (Optional)

- Usually works with default: `936619743392459`
- Or find in Network tab: X-IG-App-ID header

---

## ⚠️ Important Notes

### Private Accounts

- Your profile is private → media list won't show
- This is Instagram's security feature
- Still can fetch basic profile info
- Can scrape PUBLIC account photos freely

### Session Expires

If you get "Authentication failed":

1. Log back into Instagram in browser
2. Get fresh COOKIE (follow steps above)
3. Update .env file
4. Try again

### Rate Limiting

- Built-in 500ms delays between requests
- Don't spam or you'll get blocked
- Respect Instagram's Terms of Service

---

## 🐛 Troubleshooting

| Error                   | Solution                                     |
| ----------------------- | -------------------------------------------- |
| "Authentication failed" | Update COOKIE in .env with fresh value       |
| "Profile not found"     | Check username spelling or if account exists |
| "Empty photo list"      | Account is private (Instagram restriction)   |
| Rate limited / Blocked  | Wait 24 hours, don't spam                    |

---

## 📊 What Gets Exported

### JSON Includes

- Username, full name, bio
- Followers, following, post count
- Verification & business status
- Private account flag
- Profile picture URL
- Timestamps

### CSV Includes

- All above in spreadsheet format
- Perfect for analysis
- Ready for Google Sheets or Excel
- Easy to filter and sort

---

## 🚀 Workflows

### Workflow 1: Build a Database

```bash
node instagramScraper.js batch user1 user2 user3
# Opens CSV in Excel → add more columns with your data
```

### Workflow 2: Track Growth

```bash
# Run weekly, compare CSV files over time
node instagramScraper.js batch competitors.txt
```

### Workflow 3: Download Media

```bash
node instagramScraper.js photos instagram --download
# Get all photos in photos_instagram/ folder
```

---

## 📦 Files Included

```
instagram-media-scraper/
├── instagramScraper.js       ← Main scraper (only file needed)
├── .env                      ← Your credentials (KEEP PRIVATE!)
├── .env.example              ← Template
├── README.md                 ← This file
├── package.json              ← Dependencies
└── scraper_output/           ← Auto-created by scraper
    ├── profiles_*.json
    ├── profiles_*.csv
    └── photos_*/
```

---

## ✨ Summary

This scraper:

- ✅ Extracts Instagram profile data
- ✅ Exports to CSV for spreadsheets
- ✅ Exports to JSON for apps
- ✅ Batch processes multiple accounts
- ✅ Handles rate limiting
- ✅ Validates sessions
- ✅ Works with current Instagram API (2026)

---

## 🔒 Privacy & Security

- Keep `.env` **PRIVATE** (never share)
- Don't commit .env to git
- Only exports public profile data
- Respects rate limits
- Complies with ethical scraping

---

## 📄 License

MIT - Use responsibly and ethically

---

**Made with ❤️ | Instagram Scraper v2.0**
