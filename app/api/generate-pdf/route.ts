import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Dynamic imports for better serverless compatibility
const getPuppeteer = async () => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.AWS_EXECUTION_ENV;
  
  if (isDev) {
    // Local development - use full puppeteer
    const puppeteer = await import('puppeteer');
    return { 
      puppeteer: puppeteer.default, 
      executablePath: undefined,
      args: []
    };
  } else {
    // Production (Netlify/AWS Lambda) - use puppeteer-core with chromium
    const puppeteerCore = await import('puppeteer-core');
    const chromium = await import('@sparticuz/chromium');
    
    return { 
      puppeteer: puppeteerCore.default, 
      executablePath: await chromium.default.executablePath('/tmp'),
      args: chromium.default.args
    };
  }
};

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

    console.log('Generating PDF for:', childName, 'Languages:', languages);

    // Load HTML template
    const templatePath = join(process.cwd(), 'app/api/generate-pdf/storybook-template.html');
    let htmlTemplate = readFileSync(templatePath, 'utf-8');

    // Build pages HTML
    let pagesHtml = '';

    // Cover page
    const titleLang = languages.includes('ku') ? 'ku' : languages[0];
    const title = storyContent.title[titleLang] || 'Storybook';
    
    pagesHtml += `
      <div class="page cover-page">
        <div class="decorative-border">
          <div class="corner top-left"></div>
          <div class="corner top-right"></div>
          <div class="corner bottom-left"></div>
          <div class="corner bottom-right"></div>
        </div>
        <div class="cover-title">${title}</div>
        <div class="cover-subtitle">A story for ${childName}</div>
        ${characterImageUrl ? `<img src="${characterImageUrl}" class="cover-image" alt="${childName}" />` : ''}
        <div style="font-size: 60px; margin-top: 40px;">✨ 📚 ✨</div>
      </div>
    `;

    // Story pages
    for (const pageData of storyContent.pages) {
      const emoji = PAGE_EMOJIS[(pageData.pageNumber - 1) % PAGE_EMOJIS.length];
      
      pagesHtml += `
        <div class="page story-page">
          <div class="illustration">${emoji}</div>
      `;

      // Kurdish text (if selected)
      if (languages.includes('ku') && pageData.text.ku) {
        pagesHtml += `
          <div class="text-section">
            <div class="text-label">🇮🇶 Kurdish (کوردی)</div>
            <div class="kurdish-text">${pageData.text.ku}</div>
          </div>
        `;
      }

      // English text (if selected)
      if (languages.includes('en') && pageData.text.en) {
        pagesHtml += `
          <div class="text-section">
            <div class="text-label">🇬🇧 English</div>
            <div class="english-text">${pageData.text.en}</div>
          </div>
        `;
      }

      // Arabic text (if selected)
      if (languages.includes('ar') && pageData.text.ar) {
        pagesHtml += `
          <div class="text-section">
            <div class="text-label">🇸🇦 Arabic (العربية)</div>
            <div class="kurdish-text">${pageData.text.ar}</div>
          </div>
        `;
      }

      // Turkish text (if selected)
      if (languages.includes('tr') && pageData.text.tr) {
        pagesHtml += `
          <div class="text-section">
            <div class="text-label">🇹🇷 Turkish (Türkçe)</div>
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
    const htmlContent = htmlTemplate.replace('{{PAGES}}', pagesHtml);

    // Get Puppeteer (environment-aware)
    const { puppeteer, executablePath, args } = await getPuppeteer();
    
    // Launch browser
    const launchOptions: any = {
      headless: true,
      args: args.length > 0 ? args : ['--no-sandbox', '--disable-setuid-sandbox'],
    };
    
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();
    browser = null;

    console.log('PDF generated:', pdfBytes.length, 'bytes');

    // Send to Telegram
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const formData = new FormData();
        const blob = new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' });
        formData.append('chat_id', process.env.TELEGRAM_CHAT_ID);
        formData.append('document', blob, `${childName}-storybook.pdf`);
        formData.append(
          'caption',
          `📚 ${childName}'s Storybook!\n\nLanguages: ${languages.map(l => l.toUpperCase()).join(' + ')}\n\n✨ Powered by Puppeteer with full Unicode support!`
        );

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
    if (browser) {
      await browser.close();
    }
    console.error('PDF error:', error);
    return NextResponse.json(
      { error: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
