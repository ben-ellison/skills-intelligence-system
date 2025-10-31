// Email sending utility using Microsoft Graph API
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const senderEmail = process.env.AZURE_SENDER_EMAIL || 'info@aivii.co.uk';

/**
 * Get authenticated Microsoft Graph client
 */
function getGraphClient(): Client {
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Graph credentials not configured');
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  const client = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
        return tokenResponse.token;
      },
    },
  });

  return client;
}

/**
 * Send invitation email to new user
 */
export async function sendUserInvitationEmail(
  recipientEmail: string,
  recipientName: string,
  organizationName: string,
  inviterName: string,
  loginUrl: string
): Promise<boolean> {
  try {
    console.log('[EMAIL] Starting sendUserInvitationEmail for:', recipientEmail);
    console.log('[EMAIL] Environment check - tenantId:', !!tenantId, 'clientId:', !!clientId, 'clientSecret:', !!clientSecret, 'senderEmail:', senderEmail);

    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
      console.warn('[EMAIL] Microsoft Graph not configured - invitation email not sent');
      console.warn('[EMAIL] Missing values - tenantId:', !!tenantId, 'clientId:', !!clientId, 'clientSecret:', !!clientSecret, 'senderEmail:', !!senderEmail);
      return false;
    }

    console.log('[EMAIL] Creating Graph client...');
    const client = getGraphClient();
    console.log('[EMAIL] Graph client created successfully');

    const message = {
      message: {
        subject: `You've been invited to join ${organizationName} on Skills Intelligence System`,
        body: {
          contentType: 'HTML',
          content: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #00e5c0 0%, #0eafaa 100%); color: #033c3a; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                .button { display: inline-block; background: #00e5c0; color: #033c3a; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                .button:hover { background: #0eafaa; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                .info-box { background: #f0fffe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #00e5c0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">Skills Intelligence System</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Team Invitation</p>
                </div>
                <div class="content">
                  <h2>Hello${recipientName ? ` ${recipientName}` : ''}!</h2>

                  <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on the Skills Intelligence System.</p>

                  <div class="info-box">
                    <p style="margin: 0;"><strong>Organisation:</strong> ${organizationName}</p>
                    <p style="margin: 10px 0 0 0;"><strong>Invited by:</strong> ${inviterName}</p>
                  </div>

                  <p>The Skills Intelligence System provides powerful insights and analytics for apprenticeship training programmes, helping you track learner progress, manage compliance, and optimize outcomes.</p>

                  <p>Click the button below to access the system:</p>

                  <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Access Dashboard</a>
                  </div>

                  <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${loginUrl}" style="color: #0eafaa;">${loginUrl}</a>
                  </p>

                  <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                    You'll be asked to sign in using Auth0. If you don't have an account yet, you can create one during the sign-in process.
                  </p>
                </div>
                <div class="footer">
                  <p>© 2025 AiVII. All rights reserved.</p>
                  <p>If you didn't expect this invitation, please contact ${inviterName} or ignore this email.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipientEmail,
              name: recipientName || recipientEmail,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    console.log('[EMAIL] Sending email via Graph API...');
    await client.api(`/users/${senderEmail}/sendMail`).post(message);

    console.log(`[EMAIL] Invitation email sent successfully to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending invitation email:', error);
    console.error('[EMAIL] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[EMAIL] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[EMAIL] Error stack:', error instanceof Error ? error.stack : 'N/A');
    if (typeof error === 'object' && error !== null) {
      console.error('[EMAIL] Error details:', JSON.stringify(error, null, 2));
    }
    return false;
  }
}

/**
 * Send welcome email when user account is activated
 */
export async function sendWelcomeEmail(
  recipientEmail: string,
  recipientName: string,
  organizationName: string,
  dashboardUrl: string
): Promise<boolean> {
  try {
    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
      console.warn('[EMAIL] Microsoft Graph not configured - welcome email not sent');
      return false;
    }

    const client = getGraphClient();

    const message = {
      message: {
        subject: `Welcome to ${organizationName} on Skills Intelligence System!`,
        body: {
          contentType: 'HTML',
          content: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #00e5c0 0%, #0eafaa 100%); color: #033c3a; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
                .button { display: inline-block; background: #00e5c0; color: #033c3a; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">Welcome!</h1>
                </div>
                <div class="content">
                  <h2>Hello ${recipientName}!</h2>

                  <p>Your access to <strong>${organizationName}</strong> on the Skills Intelligence System has been activated! You can now start using the platform.</p>

                  <p>Get started by:</p>
                  <ul>
                    <li>Exploring your dashboard and reports</li>
                    <li>Viewing learner progress and analytics</li>
                    <li>Accessing AI-powered insights</li>
                    <li>Managing your team and resources</li>
                  </ul>

                  <div style="text-align: center;">
                    <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
                  </div>

                  <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                    Need help? Check out our <a href="https://aivii.co.uk/knowledge-base" style="color: #0eafaa;">Knowledge Base</a> or contact <a href="https://support.aivii.co.uk/tickets-view" style="color: #0eafaa;">Support</a>.
                  </p>
                </div>
                <div class="footer">
                  <p>© 2025 AiVII. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipientEmail,
              name: recipientName || recipientEmail,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    await client.api(`/users/${senderEmail}/sendMail`).post(message);

    console.log(`[EMAIL] Welcome email sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending welcome email:', error);
    return false;
  }
}

/**
 * Generic notification email sender using Microsoft Graph
 */
export async function sendNotificationEmail(
  recipientEmail: string,
  recipientName: string,
  subject: string,
  htmlContent: string
): Promise<boolean> {
  try {
    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
      console.warn('[EMAIL] Microsoft Graph not configured - email not sent');
      return false;
    }

    const client = getGraphClient();

    const message = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: recipientEmail,
              name: recipientName || recipientEmail,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    await client.api(`/users/${senderEmail}/sendMail`).post(message);

    console.log(`[EMAIL] Notification email sent to ${recipientEmail}: ${subject}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending notification email:', error);
    return false;
  }
}
