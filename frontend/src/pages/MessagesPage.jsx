import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function MessagesPage() {
  const { user } = useAuth();
  const location = useLocation();

  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [menuId, setMenuId] = useState(null);

  const fileRef = useRef();
  const scrollRef = useRef();

  const isMobile = window.innerWidth < 768;
  const [mobileChat, setMobileChat] = useState(false);

  // ================= INIT =================
  useEffect(() => {
    const load = async () => {
      try {
        const [cls, usr] = await Promise.all([
          api.get("/classes"),
          api.get("/users?limit=100"),
        ]);
        setClasses(cls.data.data || []);
        // Filter out the current user
        setUsers((usr.data.data || []).filter((u) => (u._id || u.id) !== user.id));
      } catch (err) {
        console.error("Load failed", err);
      }
    };
    load();
  }, [user.id]);

  useEffect(() => {
    if (location.state?.contactId) {
      setActiveChat({
        id: location.state.contactId,
        name: location.state.contactName,
        type: "direct",
      });
      setMobileChat(true);
    }
  }, [location.state]);

  // ================= FETCH =================
  useEffect(() => {
    if (!activeChat) return;
    const fetchMsg = async () => {
      const url = activeChat.type === "class" 
        ? `/messages/class/${activeChat.id}` 
        : `/messages/direct/${activeChat.id}`;
      const { data } = await api.get(url);
      setMessages(data || []);
    };
    fetchMsg();
    const interval = setInterval(fetchMsg, 4000);
    return () => clearInterval(interval);
  }, [activeChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ================= ACTIONS =================
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !file) return;
    const form = new FormData();
    form.append("text", text);
    if (file) form.append("file", file);
    if (activeChat.type === "class") form.append("classId", activeChat.id);
    else form.append("receiverId", activeChat.id);

    const { data } = await api.post("/messages", form);
    setMessages((prev) => [...prev, data]);
    setText("");
    setFile(null);
    setEditingId(null);
  };

  const deleteMsg = async (id) => {
    await api.delete(`/messages/${id}`);
    setMessages((prev) => prev.filter((m) => m._id !== id));
    setMenuId(null);
  };

  const editMsg = (m) => {
    setEditingId(m._id);
    setText(m.text);
    setMenuId(null);
  };

  // ================= MOBILE UI =================
  if (isMobile) {
    return (
      <div className="bg-white min-h-screen">
        {!mobileChat ? (
          /* CHAT LIST VIEW (Bottom sidebar will be visible here) */
          <div className="flex flex-col pb-24">
            <div className="p-5 bg-white font-black text-2xl border-b top-0 z-10 shadow-sm">
              Messages
            </div>
            <div className="flex-1 overflow-y-auto">
              {[...classes, ...users].map((item, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setActiveChat({
                      id: item._id || item.id,
                      name: item.name || item.fullName,
                      type: item.name ? "class" : "direct",
                    });
                    setMobileChat(true);
                  }}
                  className="p-4 bg-white border-b flex items-center gap-4 active:bg-slate-50 transition-colors"
                >
                  <div className="w-14 h-14 bg-indigo-600 text-white flex items-center justify-center rounded-full font-bold shadow-md text-xl">
                    {(item.name || item.fullName)[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-base">{item.name || item.fullName}</p>
                    <p className="text-xs text-slate-400 font-medium">
                      {item.name ? "Class Group" : "Personal Message"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ACTIVE CHAT VIEW (Overrides full screen to hide bottom sidebar) */
          <div className="fixed inset-0 z-[200] flex flex-col bg-[#efeae2] h-screen overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center gap-3 p-3 bg-white border-b shadow-sm sticky top-0 z-30">
              <button 
                className="text-2xl p-2 text-indigo-600 font-bold" 
                onClick={() => setMobileChat(false)}
              >
                ←
              </button>
              <div className="w-10 h-10 bg-indigo-600 text-white flex items-center justify-center rounded-full font-bold">
                {activeChat.name[0]}
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-800 text-sm leading-none">{activeChat.name}</p>
                <p className="text-[10px] text-green-500 font-bold uppercase mt-1 tracking-tight">Online</p>
              </div>
            </div>

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
              {messages.map((m) => {
                const isMe = (m.senderId?._id || m.senderId) === user.id;
                return (
                  <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[85%] px-3 py-2 rounded-2xl shadow-sm text-sm ${
                      isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
                    }`}>
                      {isMe && (
                        <button 
                          onClick={() => setMenuId(menuId === m._id ? null : m._id)}
                          className={`absolute -left-6 top-1 text-slate-400 ${isMe ? "" : "-right-6 left-auto"}`}
                        >⋮</button>
                      )}
                      
                      {menuId === m._id && (
                        <div className="absolute -left-20 top-6 bg-white shadow-xl border rounded-lg text-xs z-50 flex flex-col min-w-[80px] overflow-hidden">
                          <button onClick={() => editMsg(m)} className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-left border-b">Edit</button>
                          <button onClick={() => deleteMsg(m._id)} className="px-4 py-2 hover:bg-slate-50 text-red-500 text-left font-bold">Delete</button>
                        </div>
                      )}

                      {m.fileUrl && (
                        <div className="mb-1">
                          {m.fileUrl.match(/\.(jpg|png|jpeg|webp)$/i) ? (
                            <img src={m.fileUrl} alt="attachment" className="rounded-lg max-h-60 w-full object-cover" />
                          ) : (
                            <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-[10px] bg-black/5 p-1 rounded">📄 Download File</a>
                          )}
                        </div>
                      )}
                      <p className="leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* INPUT AREA (Fixed at bottom) */}
            <div className="p-3 bg-white border-t sticky bottom-0 z-30">
              {file && (
                <div className="mb-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] flex justify-between items-center">
                  <span className="truncate">📎 {file.name}</span>
                  <button onClick={() => setFile(null)} className="text-red-500 font-bold">✕</button>
                </div>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => fileRef.current.click()}
                  className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 text-xl"
                >+</button>
                <input type="file" ref={fileRef} hidden onChange={(e) => setFile(e.target.files[0])} />
                
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-indigo-500"
                  placeholder="Type a message..."
                />
                
                <button className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full shadow-lg">
                  {editingId ? "✓" : "➤"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= DESKTOP UI =================
  return (
    <div className="flex h-[82vh] bg-white border rounded-3xl shadow-sm overflow-hidden m-2">
      <div className="w-80 border-r flex flex-col bg-slate-50">
        <div className="p-6 font-black text-2xl text-slate-800">Messages</div>
        <div className="flex-1 overflow-y-auto">
          {[...classes, ...users].map((item, i) => (
            <div
              key={i}
              onClick={() => setActiveChat({
                id: item._id || item.id,
                name: item.name || item.fullName,
                type: item.name ? "class" : "direct",
              })}
              className={`flex items-center gap-4 p-4 cursor-pointer transition-all ${
                activeChat?.id === (item._id || item.id) ? "bg-white border-l-4 border-indigo-600 shadow-sm" : "hover:bg-slate-100"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                {(item.name || item.fullName)[0]}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-700 truncate">{item.name || item.fullName}</p>
                <p className="text-[10px] uppercase font-black text-slate-400">
                  {item.name ? "Group" : "Direct"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#f0f2f5]">
        {activeChat ? (
          <>
            <div className="p-4 bg-white border-b flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 text-white flex items-center justify-center rounded-full text-xs font-bold">
                {activeChat.name[0]}
              </div>
              <p className="font-black text-slate-800">{activeChat.name}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m) => {
                const isMe = (m.senderId?._id || m.senderId) === user.id;
                return (
                  <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className="relative group max-w-[70%]">
                      {isMe && (
                        <button 
                          onClick={() => setMenuId(menuId === m._id ? null : m._id)}
                          className="absolute -left-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >⋮</button>
                      )}
                      {menuId === m._id && (
                        <div className="absolute -left-24 top-8 bg-white shadow-xl rounded-lg text-xs z-10 border overflow-hidden">
                          <button onClick={() => editMsg(m)} className="block px-4 py-2 hover:bg-slate-50 w-full text-left">Edit</button>
                          <button onClick={() => deleteMsg(m._id)} className="block px-4 py-2 hover:bg-slate-50 text-red-500 w-full text-left">Delete</button>
                        </div>
                      )}
                      <div className={`px-4 py-2 rounded-2xl shadow-sm text-sm ${
                        isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t flex gap-4 items-center">
              <input 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                placeholder="Write something..." 
                className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-600 outline-none"
              />
              <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold">
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="text-6xl mb-4">💬</div>
            <p className="font-bold">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}