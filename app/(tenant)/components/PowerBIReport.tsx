'use client';

import { useEffect, useState, useRef } from 'react';
import * as pbi from 'powerbi-client';
import * as models from 'powerbi-models';

interface PowerBIReportProps {
  reportId: string;
  workspaceId: string;
  reportName: string;
  pageName?: string | null; // Optional: specific page to navigate to
  templateReportId: string; // Template report ID for embed token lookup
}

export default function PowerBIReport({
  reportId,
  workspaceId,
  reportName,
  pageName,
  templateReportId,
}: PowerBIReportProps) {
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(true);
  const reportRef = useRef<pbi.Embed | null>(null);
  const filterSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset state when switching to a different report
    setEmbedUrl('');
    setAccessToken('');
    setReportLoading(true);
    reportRef.current = null;
    fetchEmbedToken();

    // Cleanup function
    return () => {
      if (filterSaveTimeoutRef.current) {
        clearTimeout(filterSaveTimeoutRef.current);
      }
      // Clean up polling interval
      if (reportRef.current && (reportRef.current as any).filterPollInterval) {
        clearInterval((reportRef.current as any).filterPollInterval);
      }
    };
  }, [reportId, templateReportId, workspaceId]);

  const fetchEmbedToken = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first (unless forced refresh)
      if (!forceRefresh) {
        const cacheKey = `powerbi_token_${templateReportId}`;
        const cachedDataStr = localStorage.getItem(cacheKey);

        if (cachedDataStr) {
          try {
            const cachedData = JSON.parse(cachedDataStr);
            const cacheAge = Date.now() - cachedData.timestamp;
            const cacheMaxAge = 50 * 60 * 1000; // 50 minutes (tokens last ~60 mins)

            if (cacheAge < cacheMaxAge) {
              console.log('[PowerBI Cache] Using cached token, age:', Math.round(cacheAge / 60000), 'minutes');
              setEmbedUrl(cachedData.embedUrl);
              setAccessToken(cachedData.accessToken);
              setLoading(false);
              return;
            } else {
              console.log('[PowerBI Cache] Token expired, fetching new one');
            }
          } catch (cacheError) {
            console.log('[PowerBI Cache] Invalid cache, fetching fresh token');
          }
        }
      }

      // Fetch fresh token
      const response = await fetch('/api/powerbi/embed-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateReportId: templateReportId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to get embed token:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to get embed token');
      }

      const data = await response.json();
      console.log('PowerBI Embed Token Response:', data);

      if (!data.embedUrl || !data.accessToken) {
        console.error('Missing embedUrl or accessToken in response:', data);
        throw new Error('Received invalid embed token response - missing embedUrl or accessToken');
      }

      // Cache the token
      const cacheKey = `powerbi_token_${templateReportId}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        embedUrl: data.embedUrl,
        accessToken: data.accessToken,
        timestamp: Date.now()
      }));

      setEmbedUrl(data.embedUrl);
      setAccessToken(data.accessToken);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load saved slicer state from localStorage - use TENANT-SCOPED key for global persistence
  const loadSavedFilters = async (report: pbi.Report) => {
    try {
      // Get subdomain from URL to scope slicers per tenant only
      const subdomain = window.location.hostname.split('.')[0];
      const storageKey = `powerbi_slicers_${subdomain}`;
      const savedSlicersStr = localStorage.getItem(storageKey);

      if (savedSlicersStr) {
        const savedSlicers = JSON.parse(savedSlicersStr);
        console.log('[Filter Persistence] Restoring', savedSlicers.length, 'global slicer states');

        const restorePromise = (async () => {
          // OPTIMIZATION: Only work with active page, not all pages
          const pages = await report.getPages();
          const activePage = pages.find((p: any) => p.isActive);

          // Apply saved slicer states by matching target fields
          for (const savedSlicer of savedSlicers) {
            let restored = false;

            // OPTIMIZATION: Only check active page for performance
            if (activePage) {
              try {
                const visuals = await activePage.getVisuals();

                for (const visual of visuals) {
                  if (visual.type === 'slicer') {
                    try {
                      const currentState = await visual.getSlicerState();

                      // Extract target field from current slicer
                      let targetField = null;
                      if (currentState?.targets && currentState.targets.length > 0) {
                        const target = currentState.targets[0];
                        if (target.table && target.column) {
                          targetField = `${target.table}.${target.column}`;
                        }
                      }

                      // If target field matches, apply saved state
                      if (targetField === savedSlicer.targetField) {
                        try {
                          await visual.setSlicerState(savedSlicer.state);
                          console.log('[Filter Persistence] ✓ Restored slicer for field:', targetField);
                          restored = true;
                          break;
                        } catch (setErr) {
                          console.log('[Filter Persistence] Failed to restore slicer for field:', targetField, '- incompatible state');
                          // Continue to next slicer
                        }
                      }
                    } catch (err) {
                      // Skip slicers that don't support getSlicerState
                    }
                  }
                }
              } catch (err) {
                // Skip errors on this page
              }
            }
          }
        })();

        await restorePromise;
        console.log('[Filter Persistence] Restoration complete');
      } else {
        console.log('[Filter Persistence] No saved slicers found');
      }
    } catch (error) {
      console.error('[Filter Persistence] Error loading slicer states:', error);
    }
  };

  // Save current slicer state to localStorage - use GLOBAL key
  const saveCurrentFilters = async (report: pbi.Report) => {
    try {
      // OPTIMIZATION: Only get slicers from active page
      const pages = await report.getPages();
      const activePage = pages.find((p: any) => p.isActive);
      const slicerStates: any[] = [];

      // Get slicer state from active page only
      if (activePage) {
        const visuals = await activePage.getVisuals();

        for (const visual of visuals) {
          if (visual.type === 'slicer') {
            try {
              const slicerState = await visual.getSlicerState();

              // Extract the target field from the slicer state for cross-page matching
              let targetField = null;
              if (slicerState?.targets && slicerState.targets.length > 0) {
                const target = slicerState.targets[0];
                if (target.table && target.column) {
                  targetField = `${target.table}.${target.column}`;
                }
              }

              if (targetField) {
                slicerStates.push({
                  targetField: targetField, // Use field name instead of page/visual name
                  state: slicerState
                });
              }
            } catch (err) {
              // Skip slicers that don't support getSlicerState or are still loading
            }
          }
        }
      }

      // Get subdomain from URL to scope slicers per tenant only (global across all reports)
      const subdomain = window.location.hostname.split('.')[0];
      const storageKey = `powerbi_slicers_${subdomain}`;

      if (slicerStates.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(slicerStates));
        console.log(`[Filter Persistence] ✓ Saved ${slicerStates.length} global slicer states, key:`, storageKey);
      } else {
        console.log('[Filter Persistence] No slicer states to save (empty array)');
      }
    } catch (error) {
      console.error('[Filter Persistence] Error saving slicer states:', error);
    }
  };

  // Setup slicer change listener using polling
  const setupFilterListener = (report: pbi.Report) => {
    let lastSlicerState: string | null = null;
    let pollCount = 0;
    let isInitialized = false;

    console.log('[Filter Persistence] Starting slicer state polling every 3 seconds...');

    // Poll for slicer changes every 3 seconds (balance between responsiveness and performance)
    const pollInterval = setInterval(async () => {
      try {
        pollCount++;

        // OPTIMIZATION: Get current slicer states from active page only
        const pages = await report.getPages();
        const activePage = pages.find((p: any) => p.isActive);
        const currentSlicers: any[] = [];

        if (activePage) {
          const visuals = await activePage.getVisuals();
          for (const visual of visuals) {
            if (visual.type === 'slicer') {
              try {
                const slicerState = await visual.getSlicerState();

                // Extract target field for matching
                let targetField = null;
                if (slicerState?.targets && slicerState.targets.length > 0) {
                  const target = slicerState.targets[0];
                  if (target.table && target.column) {
                    targetField = `${target.table}.${target.column}`;
                  }
                }

                if (targetField) {
                  currentSlicers.push({
                    targetField: targetField,
                    state: slicerState
                  });
                }
              } catch (err) {
                // Skip slicers that don't support getSlicerState
              }
            }
          }
        }

        const currentSlicerStr = JSON.stringify(currentSlicers);

        // Log every 5th poll to show it's working
        if (pollCount % 5 === 0) {
          console.log('[Filter Persistence] Poll check #' + pollCount + ', slicers count:', currentSlicers.length);
        }

        // On first poll, just capture the initial state (after restoration)
        if (!isInitialized) {
          lastSlicerState = currentSlicerStr;
          isInitialized = true;
          console.log('[Filter Persistence] Initial state captured, monitoring for changes...');
          return;
        }

        // Only save if slicer state actually changed
        if (currentSlicerStr !== lastSlicerState) {
          if (currentSlicers.length > 0) {
            console.log('[Filter Persistence] Slicer state changed, saving...', currentSlicers);
            saveCurrentFilters(report);
          }
          lastSlicerState = currentSlicerStr;
        }
      } catch (error) {
        console.error('[Filter Persistence] Polling error:', error);
        // Report might be disposed, stop polling
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds

    // Store interval ID for cleanup
    (report as any).filterPollInterval = pollInterval;
  };

  useEffect(() => {
    if (!embedUrl || !accessToken) return;
    embedReport();
  }, [embedUrl, accessToken]);

  // Navigate to a specific page when pageName changes
  useEffect(() => {
    if (!reportRef.current || !pageName) return;

    const navigateToPage = async () => {
      try {
        const report = reportRef.current as pbi.Report;
        const reportPages = await report.getPages();
        const targetPage = reportPages.find((page: any) =>
          page.name === pageName || page.displayName === pageName
        );

        if (targetPage) {
          await targetPage.setActive();
          console.log('Navigated to page:', pageName);
        } else {
          console.warn('Page not found:', pageName);
        }
      } catch (err) {
        console.error('Error navigating to page:', err);
      }
    };

    navigateToPage();
  }, [pageName]);

  const embedReport = async () => {
    const embedContainer = document.getElementById('powerbi-container');
    if (!embedContainer) {
      console.error('PowerBI container not found!');
      return;
    }

    console.log('Attempting to embed PowerBI report...');
    console.log('Report ID:', reportId);
    console.log('Embed URL:', embedUrl);

    try {
      // Create PowerBI service instance
      const powerbi = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      );

      // Reset the container to remove any previously embedded reports
      powerbi.reset(embedContainer);

      const config: pbi.IEmbedConfiguration = {
        type: 'report',
        tokenType: models.TokenType.Embed,
        accessToken: accessToken,
        embedUrl: embedUrl,
        id: reportId,
        permissions: models.Permissions.Read,
        settings: {
          panes: {
            filters: {
              expanded: false,
              visible: false,
            },
            pageNavigation: {
              visible: false, // Hide the bottom page tabs
            },
          },
          navContentPaneEnabled: false, // Hide the top page navigation bar
          background: models.BackgroundType.Default,
          persistentFiltersEnabled: false,
        },
      };

      console.log('Embed config created');

      // Embed the report
      const report = powerbi.embed(embedContainer, config) as pbi.Report;
      reportRef.current = report;
      console.log('Report embedded successfully');

      report.on('loaded', async () => {
        console.log('Report loaded!');

        try {
          // Load saved filters first
          await loadSavedFilters(report);

          // Setup filter change listener (only on active page, not all pages)
          setupFilterListener(report);

          // If a specific page was requested, navigate to it
          if (pageName) {
            const reportPages = await report.getPages();
            const targetPage = reportPages.find((page: any) => page.name === pageName || page.displayName === pageName);
            if (targetPage) {
              await targetPage.setActive();
              console.log('Navigated to specified page:', pageName);
            } else {
              console.warn('Specified page not found:', pageName);
            }
          }
        } catch (err) {
          console.error('Error navigating to page:', err);
        }
      });

      report.on('rendered', async () => {
        console.log('Report rendered!');

        // Setup filter persistence on first render
        if (!(report as any).filterListenerSetup) {
          try {
            console.log('[Filter Persistence] Setting up on rendered event');
            await loadSavedFilters(report);
            setupFilterListener(report);
            (report as any).filterListenerSetup = true;
          } catch (err) {
            console.error('[Filter Persistence] Setup error:', err);
          }
        }

        // Hide loading overlay once report is fully rendered
        setTimeout(() => {
          setReportLoading(false);
        }, 500); // Shorter delay for faster perceived load time
      });

      report.on('error', (event: any) => {
        console.error('PowerBI Report Error:', event.detail);
        setError('PowerBI error: ' + JSON.stringify(event.detail));
      });
    } catch (error) {
      console.error('Error embedding report:', error);
      setError('Failed to embed report: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00e5c0] mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading {reportName}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Error Loading Report
          </h3>
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchEmbedToken}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* CSS to hide PowerBI branding elements */}
      <style jsx global>{`
        /* Hide PowerBI logo and branding */
        .powerbi-logo,
        .pbi-logo,
        div[class*="logo"],
        img[alt*="Power BI"],
        img[alt*="PowerBI"],
        a[href*="powerbi.com"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }

        /* Hide the white PowerBI loading screen */
        .powerbi-embed-container iframe {
          background-color: #033c3a !important;
        }
      `}</style>

      {/* PowerBI Report Container */}
      {/* Note: Page navigation tabs are handled at the module level in page.tsx */}
      {/* Each module tab corresponds to a specific PowerBI report page */}
      <div id="powerbi-container" className="flex-1 w-full" style={{ backgroundColor: '#033c3a' }} />

      {/* Loading Overlay - Covers PowerBI logo during initial load */}
      {reportLoading && (
        <div className="absolute inset-0 bg-[#033c3a] flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#00e5c0] mx-auto"></div>
            <p className="mt-6 text-[#e6ffff] text-lg font-medium">Loading report...</p>
          </div>
        </div>
      )}
    </div>
  );
}
