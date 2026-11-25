'use client';

/**
 * Utility to print or save-as-PDF an isolated DOM element via a hidden iframe.
 * Prevents background document bleed-through, multi-page overflow,
 * and Chromium print engine layer pruning (blank white page bug).
 */
export function printDocument(element: HTMLElement | null, title: string = 'Document'): void {
  if (!element || typeof window === 'undefined') {
    if (typeof window !== 'undefined') {
      window.print();
    }
    return;
  }

  // Create an invisible iframe attached to body
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print Preview Frame');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    window.print();
    return;
  }

  // Collect all stylesheets and inline styles from the host document
  let stylesHtml = '';
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${stylesHtml}
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
    }
    .printable-document {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: #ffffff !important;
      color: #000000 !important;
      overflow: visible !important;
      max-height: none !important;
      height: auto !important;
    }
    .no-print,
    .print\\:hidden,
    button,
    input[type="button"],
    input[type="submit"] {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="printable-document">
    ${element.innerHTML}
  </div>
</body>
</html>`);
  doc.close();

  // Allow styles and font resources to evaluate before printing
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Iframe print error, falling back to window.print():', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2500);
    }
  }, 120);
}
