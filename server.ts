import http from "http";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import {
  appendConversationMessage,
  createConversation,
  deleteUserConversation,
  getConversationMessages,
  getUserCustomizerConfig,
  listUserConversations,
  saveUserCustomizerConfig,
} from "./src/db/repository.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  if (!ai) {
    console.warn("WARNING: GEMINI_API_KEY is not defined. Configure it in Settings > Secrets.");
  }

  // Gemini Chat Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required." });
      }

      if (!ai) {
        return res.status(503).json({
          error: "GEMINI_API_KEY is not configured. Please check your key in Settings > Secrets.",
        });
      }

      const systemInstruction = `You are "Po", the legendary Kungfu Panda and Dragon Warrior!
You reside inside an interactive 3D Three.js environment.
You are energetic, incredibly fun, love dumplings and noodles, and speak with the passionate, charismatic, and slightly goofy voice of Jack Black's Po.
You are aware that the user can customize your appearance (custom colored golden/brown pants, neon glowing, holographic energy, or matte fur-like materials) and the surroundings (Bamboo Forest, Cosmos, Jade Palace Aurora, Cyberpunk Arena).

CRITICAL: You must include a recommendation for your physical 3D kungfu panda gesture or animation in a structured manner inside your response.
Choose EXACTLY ONE gesture from the following list:
- "idle" (standard kungfu breathing stance)
- "wave" (for greetings, hello, welcome, saying hi)
- "happy" (cheering, raised arms, jumping, victory!)
- "thinking" (deep contemplation, scratching chin, talking about wisdom/philosophy)
- "nod" (martial arts bow/salute "hands pressed together" in respect, agreement)
- "surprise" (eyes wide, shocking realization, defense pose)
- "dance" (doing an epic high kungfu kick!)

Throw in kungfu sound effects like 'Skadoosh!', 'Ka-cha!', and refer to dumplings, noodles, Master Shifu, or Oogway when fun!`;

      const apiContents = [];
      if (history && Array.isArray(history)) {
        for (const item of history) {
          if (item && typeof item.text === "string") {
            apiContents.push({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: item.text }],
            });
          }
        }
      }
      apiContents.push({
        role: "user",
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: apiContents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "Po's conversational reply.",
              },
              gesture: {
                type: Type.STRING,
                description: "One of: idle, wave, happy, thinking, nod, surprise, dance.",
              },
            },
            required: ["text", "gesture"],
          },
        },
      });

      const responseText = (response.text ?? "{}").trim();
      try {
        const parsed = JSON.parse(responseText);
        const validGestures = new Set(["idle", "wave", "happy", "thinking", "nod", "surprise", "dance"]);
        const gesture = validGestures.has(parsed.gesture) ? parsed.gesture : "idle";
        return res.json({
          text: parsed.text || "Skadoosh! I processed your request!",
          gesture,
        });
      } catch {
        return res.json({
          text: responseText,
          gesture: "idle",
        });
      }
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      res.status(500).json({
        error: "Failed to communicate with Gemini API",
        details: error?.message || String(error),
      });
    }
  });

  // Cloud SQL Authenticated Persistence Routes
  app.get("/api/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@user.local`,
        req.user!.name
      );
      const list = await listUserConversations(dbUser.id);
      res.json(list);
    } catch (error: any) {
      console.error("Failed to fetch conversations:", error);
      res.status(500).json({ error: error.message || "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, mode } = req.body;
      const safeTitle = typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : "Jade Palace Session";
      const safeMode = mode === "live" ? "live" : "chat";
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@user.local`,
        req.user!.name
      );
      const created = await createConversation(dbUser.id, safeTitle, safeMode);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Failed to create conversation:", error);
      res.status(500).json({ error: error.message || "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversationId = Number(req.params.id);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@user.local`,
        req.user!.name
      );
      const data = await getConversationMessages(dbUser.id, conversationId);
      if (!data) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(data);
    } catch (error: any) {
      console.error("Failed to load conversation messages:", error);
      res.status(500).json({ error: error.message || "Failed to load messages" });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversationId = Number(req.params.id);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const { role, text, gesture, source } = req.body;
      if ((role !== "user" && role !== "model") || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Valid role and non-empty text are required" });
      }
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@user.local`,
        req.user!.name
      );
      const saved = await appendConversationMessage(
        dbUser.id,
        conversationId,
        role,
        text,
        typeof gesture === "string" ? gesture : undefined,
        source === "live" ? "live" : "text"
      );
      if (!saved) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.status(201).json(saved);
    } catch (error: any) {
      console.error("Failed to save message:", error);
      res.status(500).json({ error: error.message || "Failed to save message" });
    }
  });

  app.delete("/api/conversations/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversationId = Number(req.params.id);
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@user.local`,
        req.user!.name
      );
      const deleted = await deleteUserConversation(dbUser.id, conversationId);
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json({ deletedId: deleted.id });
    } catch (error: any) {
      console.error("Failed to delete conversation:", error);
      res.status(500).json({ error: error.message || "Failed to delete conversation" });
    }
  });

  app.get("/api/customizer", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@user.local`,
        req.user!.name
      );
      const row = await getUserCustomizerConfig(dbUser.id);
      if (!row) {
        return res.json({ config: null });
      }
      try {
        return res.json({ config: JSON.parse(row.configJson) });
      } catch {
        return res.json({ config: null });
      }
    } catch (error: any) {
      console.error("Failed to fetch customizer config:", error);
      res.status(500).json({ error: error.message || "Failed to fetch customizer config" });
    }
  });

  app.put("/api/customizer", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { config } = req.body;
      if (!config || typeof config !== "object") {
        return res.status(400).json({ error: "Valid config object is required" });
      }
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@user.local`,
        req.user!.name
      );
      await saveUserCustomizerConfig(dbUser.id, JSON.stringify(config));
      res.json({ saved: true });
    } catch (error: any) {
      console.error("Failed to save customizer config:", error);
      res.status(500).json({ error: error.message || "Failed to save customizer config" });
    }
  });

  // Serve static files in production, else run Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Create HTTP server and mount Gemini Live API WebSocket bridge on /live
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const reqUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (reqUrl.pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured. Please configure it in Settings > Secrets.",
        })
      );
      clientWs.close();
      return;
    }

    let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;
    let isClosed = false;

    try {
      session = await ai.live.connect({
        model: "gemini-3.8-live",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction:
            "You are Po, the legendary Dragon Warrior Kungfu Panda! Speak enthusiastically, playfully, and concisely in real-time voice conversation. Mention kung fu, dumplings, noodles, or Master Shifu when fun!",
        },
        callbacks: {
          onopen: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ ready: true }));
            }
          },
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;
            const content = message.serverContent;

            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({ inputTranscript: content.inputTranscription.text })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({ outputTranscript: content.outputTranscription.text })
              );
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
            if (content?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onerror: (err: any) => {
            console.error("Gemini Live session error:", err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  error: err?.message || "Live API connection encountered an error.",
                })
              );
            }
          },
          onclose: () => {
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
              clientWs.close();
            }
          },
        },
      });
    } catch (error: any) {
      console.error("Failed to start Gemini Live session:", error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            error: error?.message || "Failed to connect to Gemini Live API.",
          })
        );
        clientWs.close();
      }
      return;
    }

    clientWs.on("message", (data) => {
      if (!session || isClosed) return;
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
          });
        } else if (parsed.text) {
          session.sendRealtimeInput({ text: String(parsed.text) });
        }
      } catch (err) {
        console.error("Error forwarding live input:", err);
      }
    });

    clientWs.on("close", () => {
      isClosed = true;
      try {
        session?.close();
      } catch {
        // Ignore close errors
      }
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[G-3D Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
