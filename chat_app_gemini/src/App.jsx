import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import GeminiChat from "./GeminiChat";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const dummyHistory = [
  {
    question: "What is Gemini AI?",
    answer: "Gemini AI is a generative AI model by Google.",
  },
  {
    question: "How do I use it?",
    answer: "You can use it via the Google Generative AI API.",
  },
];

function MainApp() {
  return <div>Welcome to the Chat App Main Page!</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<GeminiChat />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}
