import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function extractPowerBIDataWithPuppeteer(
  embedUrl: string,
  embedToken: string,
  reportId: string,
  workspaceId: string
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

    // Create a simple HTML page that embeds the PowerBI report
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/powerbi-client@2.23.1/dist/powerbi.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #reportContainer { width: 100%; height: 100vh; }
    </style>
</head>
<body>
    <div id="reportContainer"></div>
    <script>
        window.extractionComplete = false;
        window.extractedData = null;
        window.extractionError = null;

        // Wait for PowerBI library to load
        window.addEventListener('load', async function() {
            try {
                console.log('Page loaded, initializing PowerBI...');

                // Check if powerbi-client is available
                if (typeof window.powerbi === 'undefined') {
                    throw new Error('PowerBI client library not loaded');
                }

                const powerbi = window.powerbi;
                const models = window['powerbi-client'].models;

                const config = {
                    type: 'report',
                    tokenType: models.TokenType.Embed,
                    accessToken: '${embedToken}',
                    embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}',
                    id: '${reportId}',
                    permissions: models.Permissions.Read,
                    settings: {
                        filterPaneEnabled: false,
                        navContentPaneEnabled: false,
                        panes: {
                            filters: { visible: false },
                            pageNavigation: { visible: false }
                        }
                    }
                };

                console.log('Embedding report...');
                const reportContainer = document.getElementById('reportContainer');
                const report = powerbi.embed(reportContainer, config);

                // Wait for report to load
                await new Promise((resolve, reject) => {
                    report.on('loaded', () => {
                        console.log('Report loaded successfully');
                        resolve();
                    });
                    report.on('error', (event) => {
                        console.error('Report load error:', event.detail);
                        reject(new Error('Report failed to load'));
                    });

                    // Timeout after 20 seconds
                    setTimeout(() => reject(new Error('Report load timeout')), 20000);
                });

                // Get all pages
                console.log('Getting report pages...');
                const pages = await report.getPages();
                console.log('Found pages:', pages.length);

                const extractedData = [];

                // Extract data from each page
                for (const page of pages) {
                    console.log('Processing page:', page.displayName);
                    const pageName = page.name;
                    const pageDisplayName = page.displayName;

                    // Get all visuals on the page
                    const visuals = await page.getVisuals();
                    console.log('Found visuals on page:', visuals.length);

                    for (const visual of visuals) {
                        try {
                            console.log('Exporting data from visual:', visual.name);
                            // Export data from visual
                            const exportedData = await visual.exportData(window['powerbi-client'].models.ExportDataType.Summarized);

                            extractedData.push({
                                pageName: pageName,
                                pageDisplayName: pageDisplayName,
                                visualName: visual.name,
                                visualTitle: visual.title,
                                visualType: visual.type,
                                data: exportedData
                            });
                            console.log('Successfully exported from visual:', visual.name);
                        } catch (error) {
                            console.error('Failed to export from visual', visual.name, ':', error);
                        }
                    }
                }

                window.extractedData = {
                    success: true,
                    visuals: extractedData,
                    pageCount: pages.length
                };
                window.extractionComplete = true;
                console.log('Data extraction complete. Total visuals:', extractedData.length);

            } catch (error) {
                console.error('Extraction error:', error);
                window.extractionError = error.message;
                window.extractionComplete = true;
            }
        });
    </script>
</body>
</html>`;

    // Load the HTML content
    console.log('[Puppeteer] Loading PowerBI embed page');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Wait for extraction to complete
    console.log('[Puppeteer] Waiting for data extraction to complete');
    await page.waitForFunction(
      () => window['extractionComplete'] === true,
      { timeout: 25000 }
    );

    // Get the extracted data
    const reportData = await page.evaluate(() => {
      if (window['extractionError']) {
        return { success: false, error: window['extractionError'] };
      }
      return window['extractedData'];
    });

    console.log('[Puppeteer] Data extraction complete:', {
      success: reportData.success,
      visualCount: reportData.visuals?.length || 0,
      pageCount: reportData.pageCount || 0
    });

    if (!reportData.success) {
      throw new Error(reportData.error || 'Unknown extraction error');
    }

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
