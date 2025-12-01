'use server';
/**
 * @fileOverview An AI flow to suggest optimal overlay settings.
 *
 * - suggestOverlay - A function that suggests position, size, and rotation for an overlay on a PLT file.
 * - SuggestOverlayInput - The input type for the suggestOverlay function.
 * - SuggestOverlayOutput - The return type for the suggestOverlay function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestOverlayInputSchema = z.object({
  pltFileContent: z
    .string()
    .describe(
      'The content of the PLT file, which represents the die-line or template, like for a phone case.'
    ),
  overlayImageDataUri: z
    .string()
    .describe(
      "A photo of the design to be overlaid, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SuggestOverlayInput = z.infer<typeof SuggestOverlayInputSchema>;

const SuggestOverlayOutputSchema = z.object({
  position: z.object({
    x: z.number().describe('The suggested X coordinate for the top-left corner of the overlay image.'),
    y: z.number().describe('The suggested Y coordinate for the top-left corner of the overlay image.'),
  }),
  size: z.number().describe('The suggested size (width) of the overlay image as a percentage of the container.'),
  rotation: z.number().describe('The suggested rotation of the overlay image in degrees.'),
});
export type SuggestOverlayOutput = z.infer<typeof SuggestOverlayOutputSchema>;

export async function suggestOverlay(input: SuggestOverlayInput): Promise<SuggestOverlayOutput> {
  return suggestOverlayFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOverlayPrompt',
  input: { schema: SuggestOverlayInputSchema },
  output: { schema: SuggestOverlayOutputSchema },
  prompt: `You are a helpful assistant for a print-on-demand mockup tool. Your task is to analyze a PLT file (a vector-based plotter file representing a die-line, like for a phone case) and an overlay image.

You need to suggest the best position, size, and rotation for the overlay image to fit perfectly onto the shape defined by the PLT file. The PLT file often contains cutouts for things like cameras, so the overlay should be adjusted to avoid these areas while covering the main body of the shape.

The user is working in a visual editor where the PLT file is rendered. The coordinate system's origin (0,0) is at the top-left. The user will place the overlay image based on your suggested x, y, size, and rotation values.

PLT File Content:
\`\`\`
{{{pltFileContent}}}
\`\`\`

Overlay Image:
{{media url=overlayImageDataUri}}

Analyze both inputs and provide the optimal placement values. Consider the main shape, cutouts, and the visual content of the overlay image. Provide your answer in the requested JSON format.`,
});


const suggestOverlayFlow = ai.defineFlow(
  {
    name: 'suggestOverlayFlow',
    inputSchema: SuggestOverlayInputSchema,
    outputSchema: SuggestOverlayOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to get a suggestion from the AI.');
    }
    return output;
  }
);
