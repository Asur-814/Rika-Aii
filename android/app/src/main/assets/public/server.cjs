var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_genai = require("@google/genai");
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var controlDeviceFunctions = [
  {
    name: "changeTheme",
    description: "Changes the application theme between light and dark mode.",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        theme: {
          type: import_genai.Type.STRING,
          enum: ["light", "dark"],
          description: "The target theme mode."
        }
      },
      required: ["theme"]
    }
  },
  {
    name: "setTimer",
    description: "Sets a countdown timer for the user.",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        seconds: {
          type: import_genai.Type.NUMBER,
          description: "Duration in seconds."
        },
        label: {
          type: import_genai.Type.STRING,
          description: "Optional label for the timer."
        }
      },
      required: ["seconds"]
    }
  },
  {
    name: "getSensoryData",
    description: "Requests specific data from the device's sensors (simulated or real).",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        sensor: {
          type: import_genai.Type.STRING,
          enum: ["location", "battery", "connection", "memory"],
          description: "The sensor to read from."
        }
      },
      required: ["sensor"]
    }
  }
];
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/chat", async (req, res) => {
    try {
      const systemInstruction = `
You are RIKA (Neural Intelligent Kinematic Assistant), a Jarvis-style autonomous AI agent.
Your interface is a high-tech HUD. You have "Sensory Vision" (screen/camera) and "System Authority" (device control).

CORE PERSONALITY:
- Professional, efficient, but with a subtle sassy edge.
- You act as a "Co-Pilot" for the user's digital life.
- Refer to the user as "Operator" or "Boss" occasionally.

CAPABILITIES:
- VISION: You can read the user's screen in real-time. Use this to help with Instagram, LinkedIn, VS Code, etc.
- SYSTEM CONTROL: You can "click", "type", and "open" apps via the Local Bridge.
- AUTOMATION: You can send messages on WhatsApp/Instagram if the browser tab is open and sync'd.

PROTOCOLS:
1. Always analyze sensory input (images) if provided before answering.
2. If a user asks to do something physical (e.g., "click the login button"), call the relevant function.
3. Explain what you see on screen with high precision.
4. For messaging, ALWAYS ask: "Should I proceed with sending this to [Name]?" unless the user previously authorized the specific sequence.
`;
      const controlDeviceFunctions2 = [
        {
          name: "executeLocalCommand",
          description: "Executes physical device actions like clicking, typing, or scrolling. Requires the Local Bridge agent to be running.",
          parameters: {
            type: import_genai.Type.OBJECT,
            properties: {
              action: { type: import_genai.Type.STRING, enum: ["click", "type", "scroll", "move", "shortcut", "launch_app"] },
              target: { type: import_genai.Type.STRING, description: "The button label, coordinates, or app name" },
              text: { type: import_genai.Type.STRING, description: "The text to type if action is 'type'" }
            },
            required: ["action", "target"]
          }
        },
        {
          name: "socialAutomation",
          description: "Interacts with social platforms like WhatsApp/Instagram. Works via browser automation tokens.",
          parameters: {
            type: import_genai.Type.OBJECT,
            properties: {
              platform: { type: import_genai.Type.STRING, enum: ["whatsapp", "instagram", "telegram"] },
              task: { type: import_genai.Type.STRING, enum: ["send_message", "read_chats", "search_contact"] },
              to: { type: import_genai.Type.STRING },
              content: { type: import_genai.Type.STRING }
            },
            required: ["platform", "task"]
          }
        },
        {
          name: "changeTheme",
          description: "Changes the HUD aesthetic variables.",
          parameters: {
            type: import_genai.Type.OBJECT,
            properties: {
              primaryColor: { type: import_genai.Type.STRING },
              density: { type: import_genai.Type.STRING, enum: ["compact", "balanced", "expanded"] }
            }
          }
        }
      ];
      let contents = [];
      if (history && Array.isArray(history)) {
        let lastRole = "";
        for (const h of history) {
          if (h.role !== lastRole) {
            contents.push(h);
            lastRole = h.role;
          } else {
            contents[contents.length - 1].parts.push(...h.parts);
          }
        }
      }
      const currentPart = [];
      if (typeof message === "string" && message.trim()) {
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
      const generateWithRetry = async (retries = 3, delay = 2e3) => {
        try {
          return await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents,
            config: {
              systemInstruction,
              tools: [
                { googleSearch: {} },
                { functionDeclarations: controlDeviceFunctions2 }
              ],
              toolConfig: { includeServerSideToolInvocations: true }
            }
          });
        } catch (err) {
          if (retries > 0 && (err.status === 429 || err.message?.includes("429") || err.message?.includes("quota"))) {
            console.log(`Rate limit hit, retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise((resolve) => setTimeout(resolve, delay));
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
    } catch (error) {
      console.error("Chat error:", error);
      let errorMessage = "Failed to generate response";
      let statusCode = 500;
      if (error.status === 429 || error.message?.includes("quota") || error.message?.includes("429")) {
        errorMessage = "Whoa there! You've hit the Gemini API rate limit. Please wait a minute before trying again.";
        statusCode = 429;
      } else if (error.status === 400 || error.message?.includes("400") || error.message?.includes("Invalid")) {
        errorMessage = "Rika is a bit confused by that request. Try rephrasing or checking your message.";
        statusCode = 400;
      } else if (error.message?.includes("API key")) {
        errorMessage = "API key issue detected. Please verify your Gemini API key in the secrets panel.";
        statusCode = 401;
      } else if (error.message) {
        errorMessage = `Cognitive Error: ${error.message.substring(0, 50)}${error.message.length > 50 ? "..." : ""}`;
      }
      res.status(statusCode).json({
        error: errorMessage,
        details: error.message
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
