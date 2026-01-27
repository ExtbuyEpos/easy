
/**
 * Service to interact with Cloudflare Workers AI for image generation.
 * This assumes the user has a worker set up that accepts a POST request 
 * with a JSON body containing a "prompt" key.
 */
export const generateImageWithCloudflare = async (url: string, prompt: string): Promise<string> => {
  if (!url) throw new Error("Cloudflare AI URL not configured.");

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt: `Professional high-quality commercial product photography of ${prompt}, studio lighting, solid clean background, 4k resolution`,
        num_steps: 20
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare AI Error: ${response.statusText}`);
    }

    // Most Workers AI templates return the image blob directly
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Cloudflare AI Generation Failed:", error);
    throw error;
  }
};
