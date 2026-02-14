import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
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

// Emojis for illustrations
const PAGE_EMOJIS = ['🏔️', '🎒', '🌸', '🐰', '🎉', '🌈', '🌅', '⭐'];

export async function POST(request: NextRequest) {
  let browser;
  
  try {
    const { childName, languages, storyContent, characterImageUrl }: PDFRequest =
      await request.json();

    if (!childName || !languages || !storyContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('Starting PDF generation with Puppeteer for:', childName);
    console.log('Languages:', languages);

    // Read HTML template
    const templatePath = join(process.cwd(), 'app/api/generate-pdf/storybook-template.html');
    let htmlTemplate = readFileSync(templatePath, 'utf-8');

    // Build pages HTML
    let pagesHtml = '';

    // Cover page
    const coverTitle = languages.includes('ku') && storyContent.title.ku
      ? storyContent.title.ku
      : storyContent.title.en || storyContent.title[languages[0]] || 'Storybook';
    
    const coverSubtitle = languages.includes('en') && storyContent.title.en
      ? storyContent.title.en
      : '';

    pagesHtml += `
      <div class="page cover-page">
        <div class="decorative-border">
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
        </div>
        <div class="cover-title">${coverTitle}</div>
        ${coverSubtitle ? `<div class="cover-subtitle">${coverSubtitle}</div>` : ''}
        <div class="illustration">📚</div>
        <div class="cover-subtitle">A story for ${childName}</div>
      </div>
    `;

    // Story pages
    for (const pageData of storyContent.pages) {
      const emoji = PAGE_EMOJIS[(pageData.pageNumber - 1) % PAGE_EMOJIS.length];
      
      pagesHtml += `
        <div class="page story-page">
          <div class="illustration">${emoji}</div>
      `;

      // Kurdish text (if available)
      if (languages.includes('ku') && pageData.text.ku) {
        pagesHtml += `
          <div class="text-section">
            <div class="text-label">🇮🇶 Kurdish</div>
            <div class="kurdish-text">${pageData.text.ku}</div>
          </div>
        `;
      }

      // English text (if available)
      if (languages.includes('en') && pageData.text.en) {
        pagesHtml += `
          <div class="text-section">
            <div class="text-label">🇬🇧 English</div>
            <div class="english-text">${pageData.text.en}</div>
          </div>
        `;
      }

      // Arabic text (if available)
      if (languages.includes('ar') && pageData.text.ar) {
        pagesHtml += `
          <div class="text-section">
            <div class="text-label">🇸🇦 Arabic</div>
            <div class="kurdish-text">${pageData.text.ar}</div>
          </div>
        `;
      }

      // Turkish text (if available)
      if (languages.includes('tr') && pageData.text.tr) {
        pagesHtml += `
          <div class="text-section">
            <div class="text-label">🇹🇷 Turkish</div>
            <div class="english-text">${pageData.text.tr}</div>
          </div>
        `;
      }

      pagesHtml += `
          <div class="page-number">Page ${pageData.pageNumber}</div>
        </div>
      `;
    }

    // Replace template placeholder
    const finalHtml = htmlTemplate.replace('{{PAGES}}', pagesHtml);

    console.log('Launching Puppeteer...');

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'networkidle0' });

    console.log('Generating PDF...');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
    });

    await browser.close();
    browser = null;

    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Send to Telegram if configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        console.log('Sending to Telegram...');
        
        const formData = new FormData();
        const blob = new Blob([Buffer.from(pdfBuffer)], { type: 'application/pdf' });
        formData.append('chat_id', process.env.TELEGRAM_CHAT_ID);
        formData.append('document', blob, `${childName}-storybook.pdf`);
        formData.append('caption', `📚 ${childName}'s Storybook is ready!\n\nLanguages: ${languages.map(l => l.toUpperCase()).join(' + ')}\n\n✨ Now with Kurdish support & illustrations!`);
        
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
      }
    }

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${childName}-storybook.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    
    // Clean up browser if it's still running
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
    
    return NextResponse.json(
      { error: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
