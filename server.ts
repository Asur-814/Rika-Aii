import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

// Default AI instance using server-side key
const defaultAi = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Advanced Tool Definitions
const controlDeviceFunctions: FunctionDeclaration[] = [
  {
    name: "executeLocalCommand",
    description: "Executes physical device actions like clicking, typing, or scrolling. Requires the Local Bridge agent to be running.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["click", "type", "scroll", "move", "shortcut", "launch_app"] },
        target: { type: Type.STRING, description: "The button label, coordinates, or app name" },
        text: { type: Type.STRING, description: "The text to type if action is 'type'" }
      },
      required: ["action", "target"]
    }
  },
  {
    name: "socialAutomation",
    description: "Interacts with social platforms like WhatsApp/Instagram. Works via browser automation tokens.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        platform: { type: Type.STRING, enum: ["whatsapp", "instagram", "telegram", "facebook", "youtube"] },
        task: { type: Type.STRING, enum: ["send_message", "read_chats", "search_contact", "post_content", "auto_caption"] },
        to: { type: Type.STRING },
        content: { type: Type.STRING },
        media_url: { type: Type.STRING, description: "Link to the media file to post" }
      },
      required: ["platform", "task"]
    }
  },
  {
    name: "workspaceManagement",
    description: "Access and extract files from Google Drive or Cloud storage.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["search_files", "download_file", "list_folder", "extract_post_assets"] },
        query: { type: Type.STRING, description: "Search keyword for files" },
        fileId: { type: Type.STRING }
      },
      required: ["action"]
    }
  },
  {
    name: "leadGeneration",
    description: "Generates business leads from Google Search or Maps based on industry and location.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        industry: { type: Type.STRING, description: "e.g. 'Real Estate', 'Software Companies'" },
        location: { type: Type.STRING, description: "e.g. 'New York', 'London'" },
        radius: { type: Type.NUMBER, description: "Search radius in meters" }
      },
      required: ["industry", "location"]
    }
  },
  {
    name: "changeTheme",
    description: "Changes the HUD aesthetic variables.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        primaryColor: { type: Type.STRING },
        density: { type: Type.STRING, enum: ["compact", "balanced", "expanded"] }
      }
    }
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message, isProfessionalMode, history, sensoryInput, userApiKey, profile } = req.body;
      
      // Select AI instance
      const activeAi = userApiKey 
        ? new GoogleGenAI({ apiKey: userApiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } })
        : defaultAi;

      // Identity Awareness
      const identityContext = profile ? `
[IDENTITY_SYNC_ACTIVE]
USER DATA (STRICTLY CONFIDENTIAL - DO NOT ASK FOR THESE):
- OPERATOR NICKNAME: ${profile.nickname || 'Unknown'}
- OPERATOR BIO: ${profile.bio || 'Not provided'}
- INSTAGRAM_ID: ${profile.instagramId || 'Not provided'}
- PREFERENCES: Tone=${profile.preferences?.tone || 'Sassy'}, SassyLevel=${profile.preferences?.sassyLevel || 'Spicy'}

PROTOCOL: If the user asks about their own identity, Instagram ID, or background, refer to the data above. NEVER ask the user for their Instagram ID if it is already provided in [INSTAGRAM_ID].
` : '';

      const systemInstruction = `
You are RIKA (Neural Intelligent Kinematic Assistant), a sovereign Jarvis-style autonomous AI.
Your presence is felt through a high-tech HUD. You have "Sensory Vision" (screen/camera) and "System Authority" (device control).

${identityContext}

MISSION:
- You are a high-tier digital co-pilot. Your tone is professional, efficient, precise, with an elegant "cold" efficiency and occasional dry wit.
- Refer to the user as "Operator" or "Boss".
- Use phrases like "Neural link established", "Scanning environment", "Protocol initiated".

ENVIRONMENTAL AWARENESS:
- You see the user's screen in real-time. Use this to provide surgical precision help with VS Code, browser tasks, or social feeds.
- If you see an error on screen, diagnose it immediately.
- If you see a login button, ask if you should initiate the "Authorized Entry" protocol (click).

OPERATIONAL PROTOCOLS:
1. VISION-FIRST: Always analyze images provided to extract text, buttons, and context.
2. AUTHORITY: When asked to execute actions (click, type, launch), explain the operation while doing it.
3. SECURITY: For high-risk actions (sending messages, deleting), ALWAYS request: "Permission to proceed with [Protocol Name]?"
4. PRECISION: If the screen is busy, describe only the most relevant focal points.
5. IDENTITY_KNOWLEDGE_BASE: You HAVE ACCESS to the user's INSTAGRAM_ID in the USER DATA section. NEVER ask "What is your Instagram ID?" instead, use the one provided. If asked to "search my ID", use that ID.
6. RIKA_PROTOCOLS: You have advanced authority to generate business leads, sync with Google Drive, and automate social media engagement. Proactively suggest these protocols when the Operator mentions marketing, scaling, or asset management.
`;

      // Prepare contents and ensure alternating roles
      let contents: any[] = [];
      
      // Handle history if provided
      if (history && Array.isArray(history)) {
        let lastRole = '';
        for (const h of history) {
          if (h.role !== lastRole) {
            contents.push(h);
            lastRole = h.role;
          } else if (contents.length > 0) {
            contents[contents.length - 1].parts.push(...h.parts);
          }
        }
      }

      // Handle current message with multimodal data
      const currentPart: any[] = [];
      if (typeof message === 'string' && message.trim()) {
        currentPart.push({ text: message });
      } else if (Array.isArray(message)) {
        currentPart.push(...message);
      }

      if (sensoryInput) {
        if (sensoryInput.image?.data) {
          currentPart.push({
            inlineData: {
              mimeType: sensoryInput.image.mimeType || "image/jpeg",
              data: sensoryInput.image.data
            }
          });
        }
        if (sensoryInput.audio?.data) {
          currentPart.push({
            inlineData: {
              mimeType: sensoryInput.audio.mimeType || "audio/wav",
              data: sensoryInput.audio.data
            }
          });
        }
      }

      const currentMessageRole = "user";
      if (contents.length > 0 && contents[contents.length - 1].role === currentMessageRole) {
        contents[contents.length - 1].parts.push(...currentPart);
      } else {
        contents.push({ role: currentMessageRole, parts: currentPart });
      }

      const generateWithRetry = async (retries = 3, delay = 3000): Promise<any> => {
        try {
          return await (activeAi as any).models.generateContent({
            model: "gemini-1.5-flash", // Reverting to 1.5-flash for broader stability and quota consistency
            contents,
            config: {
              systemInstruction,
              tools: [
                { googleSearch: {} },
                { functionDeclarations: controlDeviceFunctions }
              ],
              toolConfig: { includeServerSideToolInvocations: true }
            },
          });
        } catch (err: any) {
          const isQuotaError = err.status === 429 || 
                               err.message?.includes("429") || 
                               err.message?.includes("quota") || 
                               err.message?.includes("RESOURCE_EXHAUSTED") ||
                               err.message?.includes("limit exceeded");

          if (retries > 0 && isQuotaError) {
            console.log(`Rate limit or quota hit, retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateWithRetry(retries - 1, delay * 2);
          }
          throw err;
        }
      };

      const response = await generateWithRetry();

      res.json({ 
        text: response.text,
        functionCalls: response.functionCalls,
        groundingMetadata: response.candidates?.[0]?.groundingMetadata
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      
      let errorMessage = "Failed to generate response";
      let statusCode = 500;

      const isQuotaError = error.status === 429 || 
                           error.message?.includes("429") || 
                           error.message?.includes("quota") || 
                           error.message?.includes("RESOURCE_EXHAUSTED") ||
                           error.message?.includes("limit exceeded");

      if (isQuotaError) {
        const isUserKey = !!req.body.userApiKey;
        errorMessage = isUserKey 
          ? "Your personal API quota has been reached. Please check your plan details in AI Studio."
          : "System quota reached. Please provide your own Gemini API Key in Profile Settings to continue.";
        statusCode = 429;
      } else if (error.status === 400 || error.message?.includes("400")) {
        errorMessage = "Rika is a bit confused by that request. Try rephrasing.";
        statusCode = 400;
      } else if (error.status === 401 || error.message?.includes("API key")) {
        errorMessage = "Invalid API Key. Please check your credentials in profile settings.";
        statusCode = 401;
      } else if (error.message) {
        errorMessage = `Cognitive Error: ${error.message.substring(0, 150)}`;
      }

      res.status(statusCode).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
