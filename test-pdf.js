// Test PDF generation locally
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function testPDF() {
  try {
    console.log('Creating test PDF...');
    
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595;
    const pageHeight = 842;

    // Cover Page
    const coverPage = pdfDoc.addPage([pageWidth, pageHeight]);
    
    coverPage.drawText('Test Storybook', {
      x: 200,
      y: 700,
      size: 32,
      font: boldFont,
      color: rgb(0.2, 0.3, 0.6),
    });

    coverPage.drawText('A story for Ahmad', {
      x: 220,
      y: 650,
      size: 18,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Test page
    const testPage = pdfDoc.addPage([pageWidth, pageHeight]);
    testPage.drawText('Page 1', {
      x: 50,
      y: 792,
      size: 12,
      font: font,
    });
    
    testPage.drawText('This is a test story in English.', {
      x: 50,
      y: 750,
      size: 14,
      font: font,
    });

    const pdfBytes = await pdfDoc.save();
    
    fs.writeFileSync('/tmp/test-storybook.pdf', pdfBytes);
    
    console.log('✅ PDF created successfully!');
    console.log('File saved to: /tmp/test-storybook.pdf');
    console.log('Size:', pdfBytes.length, 'bytes');
    
    return true;
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    return false;
  }
}

testPDF();
