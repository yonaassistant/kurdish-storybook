# Update Notes for v1.0.6

## Current Issue
PDF generation works but:
- Only shows English text (Kurdish characters can't be encoded)
- No images/illustrations
- Doesn't look like a storybook

## What's Needed
1. **Kurdish Font Support**
   - Downloaded: Noto Sans Arabic font (supports Kurdish)
   - Location: `public/fonts/NotoSansArabic.ttf`
   - Need to: Use @pdf-lib/fontkit to embed it
   
2. **Visual Improvements**
   - Add colorful borders
   - Add page backgrounds
   - Add illustrations (AI-generated or stock images)
   - Better typography

3. **Bilingual Layout**
   - Top half: Kurdish text (right-to-left)
   - Bottom half: English text (left-to-right)
   - Clear visual separation

## Current Blocker
pdf-lib's fontkit requires:
- Reading font file from filesystem
- Embedding custom font
- Rendering RTL (right-to-left) text for Kurdish

This requires significant refactoring of the PDF generation code.

## Recommendation
For now, the storybook can:
- Generate AI story in both languages ✅
- Send story text to Telegram ✅
- Provide a simple text-based PDF (English-only) ✅

For a proper illustrated storybook with Kurdish:
- Consider using a different PDF library (like puppeteer → PDF)
- Or use a template-based approach (HTML → PDF conversion)
- Or spend more time implementing proper font embedding

---

**Current Status**: Functional but basic
**Next Priority**: Add Kurdish font support OR switch to HTML→PDF approach
