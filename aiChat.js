// ============================================================
// PrimeShift AI Messages Panel (frontend/aiChat.js)
// ============================================================

import { db, auth } from './firebaseConfig.js';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

window.addEventListener("DOMContentLoaded", () => {
    // 1. Look for existing button/window in HTML, or dynamically create them if missing
    let chatBtn = document.getElementById("aiChatButton");
    let chatWindow = document.getElementById("aiChatWindow");

    if (!chatBtn) {
        chatBtn = document.createElement("div");
        chatBtn.id = "aiChatButton";
        chatBtn.innerHTML = "💬";
        document.body.appendChild(chatBtn);
    }

    if (!chatWindow) {
        chatWindow = document.createElement("div");
        chatWindow.id = "aiChatWindow";
        document.body.appendChild(chatWindow);
    }

    // 2. Enforce the exact styling for the floating blue button (bottom-right)
    Object.assign(chatBtn.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "#007bff",
        color: "white",
        width: "55px",
        height: "55px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontSize: "22px",
        zIndex: "999999",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
    });

    // 3. Enforce chat window styling
    Object.assign(chatWindow.style, {
        position: "fixed",
        bottom: "85px",
        right: "20px",
        width: "320px",
        height: "420px",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "10px",
        display: "none",
        flexDirection: "column",
        zIndex: "999999",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        overflow: "hidden"
    });

    chatWindow.innerHTML = `
        <div style="background:#007bff; color:white; padding:10px; border-radius:10px 10px 0 0; text-align:center; font-weight:bold;">
            PrimeShift AI
        </div>
        <div id="aiMessages" style="flex:1; padding:10px; overflow-y:auto; height:300px; font-size:13px;"></div>
        <input id="aiInput" type="text" placeholder="Ask me anything..." style="padding:10px; border:none; border-top:1px solid #ccc; width:100%; box-sizing:border-box;">
    `;

    const messagesBox = document.getElementById("aiMessages");
    const inputBox = document.getElementById("aiInput");

    chatBtn.addEventListener("click", () => {
        chatWindow.style.display = chatWindow.style.display === "none" ? "flex" : "none";
    });

    inputBox.addEventListener("keypress", async (e) => {
        if (e.key === "Enter" && inputBox.value.trim()) {
            const msg = inputBox.value.trim();
            inputBox.value = "";
            messagesBox.innerHTML += `<div style="margin:6px 0;"><b>You:</b> ${msg}</div>`;
            messagesBox.scrollTop = messagesBox.scrollHeight;

            // Save user message to Firestore
            await addDoc(collection(db, "ai_chat"), {
                user: auth.currentUser ? auth.currentUser.uid : "guest",
                message: msg,
                from: "user",
                timestamp: serverTimestamp()
            });

            // Send message to Render AI API
            try {
                const response = await fetch("https://mind-2wn3.onrender.com/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: msg })
                });
                const data = await response.json();

                if (data.reply) {
                    // Save AI reply to Firestore
                    await addDoc(collection(db, "ai_chat"), {
                        user: auth.currentUser ? auth.currentUser.uid : "guest",
                        message: data.reply,
                        from: "ai",
                        timestamp: serverTimestamp()
                    });
                }
            } catch (err) {
                console.error("Error calling AI:", err);
                messagesBox.innerHTML += `<div style="margin:6px 0; color:red;"><b>AI:</b> Sorry, something went wrong.</div>`;
                messagesBox.scrollTop = messagesBox.scrollHeight;
            }
        }
    });

    const chatQuery = query(collection(db, "ai_chat"), orderBy("timestamp"));
    onSnapshot(chatQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            if (data.from === "ai") {
                messagesBox.innerHTML += `<div style="margin:6px 0;"><b>AI:</b> ${data.message}</div>`;
                messagesBox.scrollTop = messagesBox.scrollHeight;
            }
        });
    });

    console.log("AI Chat Loaded");
});
