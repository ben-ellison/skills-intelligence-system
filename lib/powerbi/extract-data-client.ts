'use client';

import * as pbi from 'powerbi-client';

export interface PowerBIVisualData {
  pageName: string;
  pageDisplayName: string;
  visualName: string;
  visualTitle: string;
  visualType: string;
  data: string; // CSV format data from exportData()
}

export interface PowerBIExtractionResult {
  success: boolean;
  visuals: PowerBIVisualData[];
  pageCount: number;
  error?: string;
}

/**
 * Extract data from PowerBI report using the PowerBI JavaScript SDK (client-side)
 * This runs in the browser and extracts real data from visuals
 */
export async function extractPowerBIDataClient(
  accessToken: string,
  reportId: string,
  embedUrl: string,
  pageNames?: string[]
): Promise<PowerBIExtractionResult> {
  try {
    // Create a hidden container for the report
    const container = document.createElement('div');
    container.id = 'powerbi-extraction-container';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1024px';
    container.style.height = '768px';
    document.body.appendChild(container);

    // Use same PowerBI service initialization as working portal
    const powerbi = new pbi.service.Service(
      pbi.factories.hpmFactory,
      pbi.factories.wpmpFactory,
      pbi.factories.routerFactory
    );

    // Reset container to ensure clean state
    powerbi.reset(container);

    // Use exact same config as working portal
    const embedConfig: pbi.IEmbedConfiguration = {
      type: 'report',
      tokenType: pbi.models.TokenType.Embed,
      accessToken: accessToken,
      embedUrl: embedUrl,
      id: reportId,
      permissions: pbi.models.Permissions.Read,
      settings: {
        panes: {
          filters: {
            expanded: false,
            visible: false
          },
          pageNavigation: {
            visible: false
          }
        },
        navContentPaneEnabled: false,
        background: pbi.models.BackgroundType.Default
      }
    };

    console.log('[PowerBI Client Extraction] Embedding report...');
    const report = powerbi.embed(container, embedConfig) as pbi.Report;

    // Wait for report to load
    await new Promise<void>((resolve, reject) => {
      report.on('loaded', () => {
        console.log('[PowerBI Client Extraction] Report loaded');
        resolve();
      });
      report.on('error', (event: any) => {
        console.error('[PowerBI Client Extraction] Report error:', event.detail);
        reject(new Error('Report failed to load'));
      });
      setTimeout(() => reject(new Error('Report load timeout')), 120000); // 2 minutes
    });

    // Get all pages
    console.log('[PowerBI Client Extraction] Getting pages...');
    const pages = await report.getPages();
    console.log(`[PowerBI Client Extraction] Found ${pages.length} pages`);

    const extractedData: PowerBIVisualData[] = [];

    // Filter pages if specific pages are requested
    const pagesToProcess = pageNames && pageNames.length > 0
      ? pages.filter(p => pageNames.includes(p.name) || pageNames.includes(p.displayName))
      : pages;

    console.log(`[PowerBI Client Extraction] Processing ${pagesToProcess.length} pages`);

    // Extract data from each page
    for (const page of pagesToProcess) {
      console.log(`[PowerBI Client Extraction] Processing page: ${page.displayName}`);

      // Make page active to ensure visuals are loaded
      await page.setActive();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for page to render

      const visuals = await page.getVisuals();
      console.log(`[PowerBI Client Extraction] Found ${visuals.length} visuals on page ${page.displayName}`);

      for (const visual of visuals) {
        try {
          console.log(`[PowerBI Client Extraction] Exporting data from visual: ${visual.name}`);

          // Export data from visual (returns CSV string)
          const exportedData = await visual.exportData(pbi.models.ExportDataType.Summarized);

          extractedData.push({
            pageName: page.name,
            pageDisplayName: page.displayName,
            visualName: visual.name,
            visualTitle: visual.title,
            visualType: visual.type,
            data: exportedData
          });

          console.log(`[PowerBI Client Extraction] Successfully exported from visual: ${visual.name}`);
        } catch (error: any) {
          console.error(`[PowerBI Client Extraction] Failed to export from visual ${visual.name}:`, error);
          // Continue with other visuals even if one fails
        }
      }
    }

    // Clean up
    powerbi.reset(container);
    document.body.removeChild(container);

    console.log(`[PowerBI Client Extraction] Extraction complete. Total visuals: ${extractedData.length}`);

    return {
      success: true,
      visuals: extractedData,
      pageCount: pagesToProcess.length
    };

  } catch (error: any) {
    console.error('[PowerBI Client Extraction] Error:', error);

    // Clean up on error
    const container = document.getElementById('powerbi-extraction-container');
    if (container) {
      document.body.removeChild(container);
    }

    return {
      success: false,
      visuals: [],
      pageCount: 0,
      error: error.message
    };
  }
}
