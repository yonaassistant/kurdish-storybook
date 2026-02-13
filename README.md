# 📚 Kurdish Children's Storybook Creator

A Next.js web application that generates personalized, multilingual storybooks for children in Kurdish, English, Arabic, and Turkish.

## ✨ Features

- 🎨 **AI-Generated Characters**: Upload a child's photo and create a cartoon character (ready for AI integration)
- 📖 **Custom Stories**: Generate unique stories based on themes provided by parents
- 🌍 **Multilingual Support**: Create books in 1-4 languages (Kurdish, English, Arabic, Turkish)
- 📄 **PDF Export**: Download beautifully formatted storybooks as PDFs
- 🔄 **Bilingual Learning**: For 2+ languages, pages display parallel text for language learning

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone and navigate to the project:
```bash
cd /data/.openclaw/workspace/kurdish-storybook
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` and add your API keys:
```
OPENAI_API_KEY=sk-...your-key-here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **PDF Generation**: pdf-lib
- **AI Story Generation**: OpenAI GPT-4
- **Character Generation**: Placeholder (ready for Replicate/Stability AI integration)

## 📝 How It Works

1. **User fills out form**:
   - Child's name
   - Photo upload
   - Story theme/topic
   - Language selection (1-4 languages)

2. **Backend processing**:
   - `/api/generate-character` → Creates cartoon character from photo
   - `/api/generate-story` → Generates 8-page multilingual story using GPT-4
   - `/api/generate-pdf` → Creates downloadable PDF with formatted content

3. **PDF Download**:
   - Single language: Full-width text
   - Bilingual: Side-by-side parallel text
   - 3-4 languages: Stacked translations per page

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
4. Deploy!

```bash
# Or use Vercel CLI
npm install -g vercel
vercel
```

## 🔮 Future Enhancements

- ✅ Integrate Replicate API for real AI character generation
- ✅ Add more languages (Persian, German, French)
- ✅ Improve PDF design with colors, illustrations, page decorations
- ✅ Add payment integration (Stripe/Gumroad)
- ✅ User accounts for saving/managing storybooks
- ✅ Print-on-demand integration
- ✅ Audio narration (text-to-speech in multiple languages)
- ✅ Better RTL (right-to-left) support for Arabic/Kurdish

## 🐛 Troubleshooting

**"Failed to generate story"**
- Check that `OPENAI_API_KEY` is set correctly in `.env.local`
- Verify your OpenAI account has API credits

**PDF doesn't download**
- Check browser console for errors
- Ensure pdf-lib is installed (`npm install pdf-lib`)

**Character generation placeholder**
- Currently using uploaded photo as-is
- To enable AI cartoon generation, add Replicate API token and uncomment code in `/app/api/generate-character/route.ts`

## 📄 License

Free to use for personal/educational purposes.

## 💡 Created by Yona for Kuru
Built with ❤️ to bring multilingual stories to Kurdish children worldwide.
