// filepath: c:\Anis\Practice\Reactjs_project\chat_app_gemini\chat_app_gemini\src\GeminiChat.jsx
import { useEffect, useState, useRef } from "react";
import { auth, db } from "./firebase";
import { useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export default function GeminiChat() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);
  const username = user ? user.email.replace("@example.com", "") : "User";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [animatedBotMsg, setAnimatedBotMsg] = useState("");
  const [chatSessions, setChatSessions] = useState([]); // [{id, messages, created}]
  const [currentChatIdx, setCurrentChatIdx] = useState(0);
  const chatEndRef = useRef(null);

  // Load user and chat sessions on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login");
      } else {
        setUser(firebaseUser);
        const sessions = await loadChatSessions(firebaseUser.uid);
        setChatSessions(sessions);
        if (sessions.length > 0) {
          setMessages(sessions[0].messages);
          setCurrentChatIdx(0);
        } else {
          // Create a new chat session if none exist
          const newSession = await createNewChatSession(firebaseUser.uid);
          setChatSessions([newSession]);
          setMessages([]);
          setCurrentChatIdx(0);
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Save messages to Firestore when they change
  useEffect(() => {
    if (
      user &&
      chatSessions.length > 0 &&
      chatSessions[currentChatIdx] &&
      chatSessions[currentChatIdx].id
    ) {
      saveMessagesToSession(user.uid, chatSessions[currentChatIdx].id, messages);
    }
    // eslint-disable-next-line
  }, [messages]);

  // --- Firestore helpers ---

  async function createNewChatSession(userId) {
    const chatRef = collection(db, "chats");
    const docRef = await addDoc(chatRef, {
      userId,
      messages: [],
      created: serverTimestamp(),
    });
    return { id: docRef.id, messages: [], created: Date.now() };
  }

  async function loadChatSessions(userId) {
    const chatRef = collection(db, "chats");
    const q = query(
      chatRef,
      where("userId", "==", userId),
      orderBy("created", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      messages: doc.data().messages || [],
      created: doc.data().created?.toMillis?.() || Date.now(),
    }));
  }

  async function saveMessagesToSession(userId, sessionId, messages) {
    const chatDoc = doc(db, "chats", sessionId);
    await updateDoc(chatDoc, { messages });
  }

  // --- Chat logic ---

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setAnimatedBotMsg("");

    try {
      const geminiReply = await fetchGeminiResponse(userMsg.text);

      // Typing animation
      let current = "";
      for (let i = 0; i < geminiReply.length; i++) {
        current += geminiReply[i];
        setAnimatedBotMsg(current);
        // eslint-disable-next-line no-loop-func
        await new Promise((res) => setTimeout(res, 15));
      }

      const botMsg = { role: "bot", text: geminiReply };
      setMessages((prev) => [...prev, botMsg]);
      setAnimatedBotMsg("");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Error: " + err.message },
      ]);
      setAnimatedBotMsg("");
    }
    setLoading(false);
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function fetchGeminiResponse(prompt) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      apiKey;
    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error("Failed to get response from Gemini API");
    }

    const data = await response.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini."
    );
  }

  // --- UI handlers ---

  const handleNewChat = async () => {
    if (!user) return;
    const newSession = await createNewChatSession(user.uid);
    setChatSessions((prev) => [newSession, ...prev]);
    setMessages([]);
    setCurrentChatIdx(0);
  };

  const handleSelectChat = (idx) => {
    setCurrentChatIdx(idx);
    setMessages(chatSessions[idx].messages);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // --- Render ---

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-indigo-100">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-br from-indigo-600 to-indigo-300 text-white flex flex-col pb-6 shadow-lg">
        <div className="p-8 border-b border-indigo-400">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <img
              src="./images/logo.png"
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
          </div>
          <div className="text-center font-bold text-lg">{username}</div>
          <div className="text-center text-xs opacity-80">@{username}</div>
          <button
            onClick={handleNewChat}
            className="w-full mb-4 bg-indigo-500 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow font-semibold"
          >
            + New Chat
          </button>
          <button
            onClick={handleLogout}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow"
          >
            Logout
          </button>
        </div>
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4 mt-4">
          <div className="font-semibold mb-2 text-white/80">Chat History</div>
          <ul className="space-y-3">
            {chatSessions.map((session, idx) => {
              // Find the first user question in this session
              const firstUserMsg = session.messages.find((m) => m.role === "user");
              return (
                <li
                  key={session.id}
                  className={`bg-white/20 rounded px-3 py-2 text-sm cursor-pointer hover:bg-white/30 transition ${
                    idx === currentChatIdx ? "ring-2 ring-indigo-400" : ""
                  }`}
                  onClick={() => handleSelectChat(idx)}
                >
                  <div className="truncate">
                    {firstUserMsg
                      ? `Question: ${firstUserMsg.text}`
                      : "New Chat"}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {session.messages.find((m) => m.role === "bot")?.text?.slice(0, 40) ||
                      ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
      {/* Chat UI */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 bg-gradient-to-r from-indigo-600 to-indigo-400 text-white flex items-center px-8 font-bold text-xl shadow-md">
          <img
            src="./images/logo.png"
            alt="Gemini Logo"
            className="w-9 h-9 mr-4"
          />
          Universal ChatBoat
        </header>
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-white">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              id={`msg-${messages.slice(0, idx + 1).filter(m => m.role === "user").length - 1}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
            >
              <div
                className={`max-w-xl px-4 py-3 rounded-lg shadow
                  ${
                    msg.role === "user"
                      ? "bg-indigo-100 text-indigo-900"
                      : "bg-gray-100 text-gray-800"
                  }
                `}
                style={{ whiteSpace: "pre-line" }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {/* Animated bot message */}
          {animatedBotMsg && (
            <div className="flex justify-start animate-fadeIn">
              <div
                className="max-w-xl px-4 py-3 rounded-lg shadow bg-gray-100 text-gray-800"
                style={{ whiteSpace: "pre-line" }}
              >
                {animatedBotMsg}
                <span className="animate-pulse">|</span>
              </div>
            </div>
          )}
          {loading && !animatedBotMsg && (
            <div className="flex justify-start animate-pulse">
              <div className="max-w-xl px-4 py-3 rounded-lg shadow bg-gray-100 text-gray-800">
                <span className="inline-block w-6 h-3 bg-gray-300 rounded animate-pulse"></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Chat input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 p-4 border-t bg-white"
          style={{ minHeight: "72px" }}
        >
          <input
            className="flex-1 border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded font-semibold disabled:opacity-50"
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
