import { AzureOpenAI } from 'openai';

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
});

export async function generateAISummary(
  promptText: string,
  powerbiData: any,
  tenantName: string,
  roleName: string
): Promise<string> {
  const systemPrompt = `You are an AI assistant helping ${roleName} at ${tenantName}. 
Analyze the provided PowerBI data and generate insights based on the user's prompt.
The data includes real visual data extracted from PowerBI reports.`;

  const userPrompt = `${promptText}

PowerBI Data:
${JSON.stringify(powerbiData, null, 2)}

Please provide a comprehensive analysis based on the above data.`;

  const response = await client.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  return response.choices[0].message.content || 'No summary generated';
}
