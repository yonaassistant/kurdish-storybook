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

    // Add character image to cover (if available)
    // Note: In production, you'd decode and embed the actual image
    // For now, we'll add a placeholder text
    coverPage.drawText('📚', {
      x: (pageWidth - 50) / 2,
      y: pageHeight / 2,
      size: 72,
    });

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
      } else {
        // More than 2 languages - stack them
        for (const lang of languages) {
          const text = pageData.text[lang] || '';
          storyPage.drawText(`[${lang.toUpperCase()}]`, {
            x: margin,
            y: currentY,
            size: 10,
            font: boldFont,
            color: rgb(0.4, 0.4, 0.8),
          });
          currentY = addWrappedText(storyPage, text, margin, currentY - 20, contentWidth, 12, font);
          currentY -= 20; // Space between languages
        }
      }
    }

    // Serialize PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF as response
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${childName}-storybook.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
