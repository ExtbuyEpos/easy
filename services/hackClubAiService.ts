
/**
 * Service to interact with Hack Club AI for free image generation.
 * This assumes a standard image generation endpoint provided by the user.
 */
export const generateImageWithHackClub = async (url: string, prompt: string): Promise<string> => {
  if (!url) throw new Error("Hack Club AI URL not configured.");

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: `Hyper-realistic 4k product photo of ${prompt}, commercial lighting, 8k resolution, centered`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Hack Club AI Error: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Hack Club AI Generation Failed:", error);
    throw error;
  }
};
