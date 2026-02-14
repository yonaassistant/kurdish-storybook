import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PDFRequest {
  childName: string;
  languages: string[];
  storyContent: {
    title: Record<string, string>;
    pages: Array<{
      pageNumber: number;
      text: Record<string, string>;
    }>;
  };
  characterImageUrl: string;
}

const PAGE_EMOJIS = ['🏔️', '🎒', '🌸', '🐰', '🎉', '🌈', '🌅', '⭐'];

export async function POST(request: NextRequest) {
  try {
    const { childName, languages, storyContent }: PDFRequest =
      await request.json();

    if (!childName || !languages || !storyContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Generating PDF for:', childName, 'Languages:', languages);

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Load fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Load Arabic font for Kurdish/Arabic
    let arabicFont = helvetica; // fallback
    try {
      const fontPath = join(process.cwd(), 'public/fonts/NotoSansArabic.ttf');
      const fontBytes = readFileSync(fontPath);
      arabicFont = await pdfDoc.embedFont(fontBytes);
      console.log('Arabic font loaded successfully');
    } catch (e) {
      console.warn('Could not load Arabic font, using fallback');
    }

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;

    // Helper to add wrapped text
    const addText = (page: any, text: string, x: number, y: number, font: any, size: number, maxWidth: number, isRTL = false) => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      const lineHeight = size * 1.4;

      for (const word of words) {
        const testLine = line + word + ' ';
        const width = font.widthOfTextAtSize(testLine, size);

        if (width > maxWidth && line) {
          const xPos = isRTL ? x + maxWidth - font.widthOfTextAtSize(line, size) : x;
          page.drawText(line.trim(), { x: xPos, y: currentY, size, font, color: rgb(0.2, 0.2, 0.2) });
          line = word + ' ';
          currentY -= lineHeight;
        } else {
          line = testLine;
        }
      }
      
      if (line.trim()) {
        const xPos = isRTL ? x + maxWidth - font.widthOfTextAtSize(line.trim(), size) : x;
        page.drawText(line.trim(), { x: xPos, y: currentY, size, font, color: rgb(0.2, 0.2, 0.2) });
        currentY -= lineHeight;
      }
      
      return currentY;
    };

    // Cover page
    const cover = pdfDoc.addPage([pageWidth, pageHeight]);
    
    // Gradient background effect with rectangles
    for (let i = 0; i < 10; i++) {
      const alpha = 0.1 - (i * 0.01);
      cover.drawRectangle({
        x: 0,
        y: pageHeight - (i * 50),
        width: pageWidth,
        height: 50,
        color: rgb(0.4 + (i * 0.05), 0.3 + (i * 0.04), 0.7),
        opacity: alpha,
      });
    }

    // Title
    const titleLang = languages.includes('ku') ? 'ku' : languages[0];
    const titleFont = titleLang === 'ku' || titleLang === 'ar' ? arabicFont : helveticaBold;
    const title = storyContent.title[titleLang] || 'Storybook';
    
    const titleSize = 36;
    const titleWidth = titleFont.widthOfTextAtSize(title, titleSize);
    cover.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y: pageHeight - 120,
      size: titleSize,
      font: titleFont,
      color: rgb(1, 1, 1),
    });

    // Subtitle
    const subtitle = `A story for ${childName}`;
    const subSize = 20;
    const subWidth = helvetica.widthOfTextAtSize(subtitle, subSize);
    cover.drawText(subtitle, {
      x: (pageWidth - subWidth) / 2,
      y: pageHeight - 170,
      size: subSize,
      font: helvetica,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Decorative stars
    cover.drawText('✨ 📚 ✨', {
      x: pageWidth / 2 - 50,
      y: pageHeight / 2,
      size: 48,
      font: helvetica,
    });

    // Story pages
    for (const pageData of storyContent.pages) {
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // Colorful border
      const borderColor = rgb(0.4 + (pageData.pageNumber * 0.05), 0.3 + (pageData.pageNumber * 0.04), 0.7);
      page.drawRectangle({
        x: 20,
        y: 20,
        width: pageWidth - 40,
        height: pageHeight - 40,
        borderColor,
        borderWidth: 3,
      });

      // Page emoji illustration
      const emoji = PAGE_EMOJIS[(pageData.pageNumber - 1) % PAGE_EMOJIS.length];
      page.drawText(emoji, {
        x: pageWidth / 2 - 30,
        y: pageHeight - 100,
        size: 60,
        font: helvetica,
      });

      let currentY = pageHeight - 180;
      const contentWidth = pageWidth - 100;

      // Kurdish text (RTL)
      if (languages.includes('ku') && pageData.text.ku) {
        page.drawText('🇮🇶 Kurdish', {
          x: margin + 10,
          y: currentY,
          size: 12,
          font: helveticaBold,
          color: rgb(0.5, 0.3, 0.7),
        });
        currentY -= 25;

        currentY = addText(page, pageData.text.ku, margin + 10, currentY, arabicFont, 16, contentWidth, true);
        currentY -= 30;
      }

      // English text
      if (languages.includes('en') && pageData.text.en) {
        page.drawText('🇬🇧 English', {
          x: margin + 10,
          y: currentY,
          size: 12,
          font: helveticaBold,
          color: rgb(0.2, 0.4, 0.7),
        });
        currentY -= 25;

        currentY = addText(page, pageData.text.en, margin + 10, currentY, helvetica, 16, contentWidth);
        currentY -= 30;
      }

      // Arabic text (RTL)
      if (languages.includes('ar') && pageData.text.ar) {
        page.drawText('🇸🇦 Arabic', {
          x: margin + 10,
          y: currentY,
          size: 12,
          font: helveticaBold,
          color: rgb(0.1, 0.6, 0.3),
        });
        currentY -= 25;

        addText(page, pageData.text.ar, margin + 10, currentY, arabicFont, 16, contentWidth, true);
      }

      // Page number
      const pageNumText = `Page ${pageData.pageNumber}`;
      page.drawText(pageNumText, {
        x: pageWidth - 80,
        y: 30,
        size: 12,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    console.log('PDF generated:', pdfBytes.length, 'bytes');

    // Send to Telegram
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const formData = new FormData();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        formData.append('chat_id', process.env.TELEGRAM_CHAT_ID);
        formData.append('document', blob, `${childName}-storybook.pdf`);
        formData.append('caption', `📚 ${childName}'s Storybook!\n\nLanguages: ${languages.map(l => l.toUpperCase()).join(' + ')}\n\n✨ With Kurdish & Arabic support!`);
        
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
          method: 'POST',
          body: formData,
        });
      } catch (e) {
        console.error('Telegram send failed:', e);
      }
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${childName}-storybook.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF error:', error);
    return NextResponse.json(
      { error: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
