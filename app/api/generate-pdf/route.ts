import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

export async function POST(request: NextRequest) {
  try {
    const { childName, languages, storyContent, characterImageUrl }: PDFRequest =
      await request.json();

    if (!childName || !languages || !storyContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Starting PDF generation for:', childName);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;

    // Helper function to add text with word wrap
    const addWrappedText = (
      page: any,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      fontSize: number,
      font: any
    ): number => {
      const words = text.split(' ');
      let line = '';
      let currentY = y;
      const lineHeight = fontSize * 1.2;

      for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && line !== '') {
          page.drawText(line, { x, y: currentY, size: fontSize, font });
          line = word + ' ';
          currentY -= lineHeight;
        } else {
          line = testLine;
        }
      }

      if (line.trim() !== '') {
        page.drawText(line, { x, y: currentY, size: fontSize, font });
        currentY -= lineHeight;
      }

      return currentY;
    };

    console.log('Creating cover page...');

    // Cover Page
    const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);
    
    // Title
    const titleLang = languages[0];
    const title = storyContent.title[titleLang] || 'Story Book';
    const titleFontSize = 32;
    const titleWidth = boldFont.widthOfTextAtSize(title, titleFontSize);
    
    coverPage.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y: pageHeight - 150,
      size: titleFontSize,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.6),
    });

    // Child's name
    const subtitle = `A story for ${childName}`;
    const subtitleFontSize = 18;
    const subtitleWidth = font.widthOfTextAtSize(subtitle, subtitleFontSize);
    
    coverPage.drawText(subtitle, {
      x: (pageWidth - subtitleWidth) / 2,
      y: pageHeight - 200,
      size: subtitleFontSize,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Add decorative text instead of emoji (emojis don't work with standard fonts)
    const decorativeText = '* * *';
    const decorativeWidth = font.widthOfTextAtSize(decorativeText, 48);
    coverPage.drawText(decorativeText, {
      x: (pageWidth - decorativeWidth) / 2,
      y: pageHeight / 2,
      size: 48,
      font: boldFont,
      color: rgb(0.3, 0.4, 0.7),
    });

    console.log('Creating story pages...');

    // Story Pages
    for (const pageData of storyContent.pages) {
      const storyPage = pdfDoc.addPage([pageWidth, pageHeight]);
      let currentY = pageHeight - margin;

      // Page number
      storyPage.drawText(`Page ${pageData.pageNumber}`, {
        x: margin,
        y: currentY,
        size: 12,
        font: font,
        color: rgb(0.6, 0.6, 0.6),
      });
      currentY -= 40;

      // If multiple languages, create columns
      if (languages.length === 1) {
        // Single language - full width
        const text = pageData.text[languages[0]] || '';
        addWrappedText(storyPage, text, margin, currentY, contentWidth, 16, font);
      } else if (languages.length === 2) {
        // Two languages - side by side
        const columnWidth = (contentWidth - 20) / 2;
        
        // Left column (first language)
        const text1 = pageData.text[languages[0]] || '';
        storyPage.drawText(`[${languages[0].toUpperCase()}]`, {
          x: margin,
          y: currentY,
          size: 10,
          font: boldFont,
          color: rgb(0.4, 0.4, 0.8),
        });
        addWrappedText(storyPage, text1, margin, currentY - 20, columnWidth, 14, font);

        // Right column (second language)
        const text2 = pageData.text[languages[1]] || '';
        storyPage.drawText(`[${languages[1].toUpperCase()}]`, {
          x: margin + columnWidth + 20,
          y: currentY,
          size: 10,
          font: boldFont,
          color: rgb(0.4, 0.4, 0.8),
        });
        addWrappedText(storyPage, text2, margin + columnWidth + 20, currentY - 20, columnWidth, 14, font);
      }
    }

    console.log('Saving PDF...');

    // Serialize PDF to bytes
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);
    
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Send to Telegram if configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        console.log('Attempting to send to Telegram...');
        
        // Use multipart form data with fetch
        const formData = new FormData();
        const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
        formData.append('chat_id', process.env.TELEGRAM_CHAT_ID);
        formData.append('document', blob, `${childName}-storybook.pdf`);
        formData.append('caption', `📚 ${childName}'s Storybook is ready!\n\nLanguages: ${languages.map(l => l.toUpperCase()).join(' + ')}\n\nGenerated with love ❤️`);
        
        const telegramRes = await fetch(
          `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`,
          {
            method: 'POST',
            body: formData,
          }
        );
        
        if (telegramRes.ok) {
          console.log('Successfully sent to Telegram');
        } else {
          const error = await telegramRes.text();
          console.error('Telegram API error:', error);
        }
      } catch (telegramError) {
        console.error('Failed to send to Telegram:', telegramError);
        // Continue anyway - still return the PDF
      }
    }

    // Return PDF as response for download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${childName}-storybook.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
