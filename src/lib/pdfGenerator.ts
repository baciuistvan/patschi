import jsPDF from 'jspdf';

interface GiftCard {
  code: string;
  current_balance: number;
  recipient_name: string;
  purchaser_name: string;
  message?: string;
  expiry_date: string;
  showPurchaser?: boolean;
}

async function loadImageAsBase64(url: string): Promise<{ data: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        data: canvas.toDataURL('image/png'),
        width: img.width,
        height: img.height
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

export async function generateGiftCardPDF(giftCard: GiftCard): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 0;
  const cardWidth = 210;
  const cardHeight = 297;
  const cardX = 0;
  const cardY = 0;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const bgImageUrl = `${supabaseUrl}/storage/v1/object/public/images/image00398.jpeg`;
    const imageInfo = await loadImageAsBase64(bgImageUrl);
    const imgAspectRatio = imageInfo.width / imageInfo.height;
    const pageAspectRatio = pageWidth / pageHeight;

    let imgWidth, imgHeight, offsetX, offsetY;

    if (imgAspectRatio > pageAspectRatio) {
      imgHeight = pageHeight;
      imgWidth = imgHeight * imgAspectRatio;
      offsetX = -(imgWidth - pageWidth) / 2;
      offsetY = 0;
    } else {
      imgWidth = pageWidth;
      imgHeight = imgWidth / imgAspectRatio;
      offsetX = 0;
      offsetY = -(imgHeight - pageHeight) / 2;
    }

    pdf.setGState(new pdf.GState({ opacity: 0.2 }));
    pdf.addImage(imageInfo.data, 'JPEG', offsetX, offsetY, imgWidth, imgHeight, '', 'NONE');
    pdf.setGState(new pdf.GState({ opacity: 1.0 }));
  } catch (error) {
    console.warn('Failed to load background image:', error);
  }

  // No border needed for full-page design

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/images/Patschi-Serfaus-Logo-transparent-schwarz.PNG`;
    const logoInfo = await loadImageAsBase64(logoUrl);
    const logoWidth = 60;
    const logoHeight = (logoWidth / logoInfo.width) * logoInfo.height;
    const logoX = (pageWidth - logoWidth) / 2;
    const logoY = 40;
    pdf.addImage(logoInfo.data, 'PNG', logoX, logoY, logoWidth, logoHeight, '', 'NONE');
  } catch (error) {
    console.warn('Failed to load logo:', error);
    pdf.setFontSize(24);
    pdf.setTextColor(220, 38, 38);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PATSCHI SERFAUS', pageWidth / 2, 50, { align: 'center' });
  }

  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38);
  pdf.text('GUTSCHEIN', pageWidth / 2, 100, { align: 'center' });

  pdf.setFontSize(56);
  pdf.setTextColor(0, 0, 0);
  pdf.text(`€ ${parseFloat(String(giftCard.current_balance)).toFixed(2)}`, pageWidth / 2, 130, { align: 'center' });

  pdf.setFillColor(248, 249, 250);
  pdf.roundedRect(20, 145, cardWidth - 40, 22, 3, 3, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(102, 102, 102);
  pdf.text('GESCHENK FÜR:', pageWidth / 2, 153, { align: 'center' });

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38);
  pdf.text(giftCard.recipient_name, pageWidth / 2, 162, { align: 'center' });

  if (giftCard.message) {
    pdf.setFillColor(240, 247, 241);
    const messageY = 175;
    const messageHeight = 20;
    pdf.roundedRect(20, messageY, cardWidth - 40, messageHeight, 2, 2, 'F');

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1);
    pdf.line(20, messageY, 20, messageY + messageHeight);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(85, 85, 85);
    const messageLines = pdf.splitTextToSize(`"${giftCard.message}"`, cardWidth - 50);
    pdf.text(messageLines, pageWidth / 2, messageY + 6, { align: 'center', maxWidth: cardWidth - 50 });
  }

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  const dividerY = giftCard.message ? 200 : 175;
  pdf.line(75, dividerY, 135, dividerY);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(102, 102, 102);
  pdf.text('GT CODE', pageWidth / 2, dividerY + 10, { align: 'center' });

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.setLineDash([2, 2]);
  const codeBoxY = dividerY + 15;
  pdf.roundedRect(40, codeBoxY, cardWidth - 80, 15, 3, 3, 'S');
  pdf.setLineDash([]);

  pdf.setFontSize(16);
  pdf.setFont('courier', 'bold');
  pdf.setTextColor(220, 38, 38);
  pdf.text(giftCard.code, pageWidth / 2, codeBoxY + 10, { align: 'center' });

  const generatedDate = new Date().toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const detailsY = codeBoxY + 25;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(102, 102, 102);

  let currentY = detailsY;

  // Only show "From" if showPurchaser is true (customer purchase)
  if (giftCard.showPurchaser !== false) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(220, 38, 38);
    pdf.text('From: ', 30, currentY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(102, 102, 102);
    pdf.text(giftCard.purchaser_name, 50, currentY);
    currentY += 8;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38);
  pdf.text('Gültig ab: ', 30, currentY);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(102, 102, 102);
  pdf.text(generatedDate, 57, currentY);

  pdf.setDrawColor(233, 236, 239);
  pdf.setLineWidth(0.5);
  pdf.line(20, currentY + 7, cardWidth - 20, currentY + 7);

  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  const footerText = [
    'Dieser Gutschein kann für Speisen und Dienstleistungen verwendet werden.',
    'Kein Wechselgeld oder Barauszahlung möglich. Verlorene Gutscheine können nicht ersetzt werden.'
  ];
  pdf.text(footerText, pageWidth / 2, currentY + 10, { align: 'center', maxWidth: cardWidth - 40 });

  pdf.setFontSize(7);
  pdf.setTextColor(0, 0, 0);
  const companyInfo = [
    'Patschi by Köhle GmbH, Dorfbahnstrasse 82, 6534 Serfaus',
    'Tel. +43 5476 6290 | E-Mail: info@patschi.at'
  ];
  pdf.text(companyInfo, pageWidth / 2, pageHeight - 10, { align: 'center' });

  return pdf.output('blob');
}
