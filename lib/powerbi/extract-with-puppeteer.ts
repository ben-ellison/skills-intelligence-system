import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function extractPowerBIDataWithPuppeteer(
  embedUrl: string,
  accessToken: string
): Promise<any> {
  console.log('[Puppeteer] Starting headless browser to extract PowerBI data');

  let browser = null;

  try {
    // Launch headless Chromium (optimized for serverless)
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set a reasonable timeout
    page.setDefaultTimeout(25000); // 25 seconds (below Vercel's 30s limit)

    // Navigate to PowerBI embed page
    console.log('[Puppeteer] Loading PowerBI report');
    await page.goto(embedUrl, { waitUntil: 'networkidle0' });

    // Inject PowerBI JavaScript SDK
    await page.addScriptTag({
      url: 'https://cdn.jsdelivr.net/npm/powerbi-client@2.23.1/dist/powerbi.min.js'
    });

    // Extract data from PowerBI report using the SDK
    console.log('[Puppeteer] Extracting data from report');
    const reportData = await page.evaluate(async (token) => {
      // Get the iframe containing the Power BI report
      const iframe = document.querySelector('iframe');
      if (!iframe) {
        return { error: 'No PowerBI iframe found' };
      }

      // Get Power BI embed configuration
      const embedContainer = iframe.parentElement;
      const config = {
        type: 'report',
        tokenType: window['powerbi-client'].models.TokenType.Embed,
        accessToken: token,
        embedUrl: iframe.src,
        id: iframe.src.match(/reportId=([^&]+)/)?.[1] || '',
        settings: {
          filterPaneEnabled: false,
          navContentPaneEnabled: false
        }
      };

      // Embed the report
      const powerbi = window['powerbi-client'];
      const report = powerbi.embed(embedContainer, config);

      // Wait for report to load
      await new Promise((resolve) => {
        report.on('loaded', resolve);
      });

      // Get all pages
      const pages = await report.getPages();
      const extractedData: any[] = [];

      // Extract data from each page
      for (const page of pages) {
        const pageName = page.name;
        const pageDisplayName = page.displayName;

        // Get all visuals on the page
        const visuals = await page.getVisuals();

        for (const visual of visuals) {
          try {
            // Export data from visual
            const data = await visual.exportData();
            extractedData.push({
              pageName,
              pageDisplayName,
              visualName: visual.name,
              visualTitle: visual.title,
              visualType: visual.type,
              data: data
            });
          } catch (error) {
            console.error(`Failed to export from visual ${visual.name}:`, error);
          }
        }
      }

      return {
        success: true,
        visuals: extractedData,
        pageCount: pages.length
      };
    }, accessToken);

    console.log('[Puppeteer] Data extraction complete:', {
      visualCount: reportData.visuals?.length || 0
    });

    return reportData;

  } catch (error: any) {
    console.error('[Puppeteer] Error during data extraction:', error);
    throw new Error(`Puppeteer extraction failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[Puppeteer] Browser closed');
    }
  }
}
