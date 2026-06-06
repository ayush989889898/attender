import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function MessagesPage() {
  const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i;
  const DOCUMENT_LABELS = {
    pdf: "PDF",
    doc: "DOC",
    docx: "DOCX",
    xls: "XLS",
    xlsx: "XLSX",
    ppt: "PPT",
    pptx: "PPTX",
    txt: "TXT",
    zip: "ZIP",
    rar: "RAR",
  };

  const { user } = useAuth();
  const location = useLocation();

  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatMeta, setChatMeta] = useState({});

  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [composerError, setComposerError] = useState("");
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const fileRef = useRef(null);
  const imageRef = useRef(null);
  const cameraRef = useRef(null);
  const documentRef = useRef(null);
  const scrollRef = useRef();

  const isMobile = window.innerWidth < 768;
  const [mobileChat, setMobileChat] = useState(false);
  const openedChatsRef = useRef({});

  const getFileExtension = (name = "") => {
    const parts = name.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  };

  const getAttachmentUrl = (fileUrl = "") => {
    if (!fileUrl) return "";
    if (fileUrl.startsWith("http")) return fileUrl;
    const normalizedPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
    return `${window.location.origin}${normalizedPath}`;
  };

  const isImageFile = (message) => {
    if (message?.fileType === "image") return true;
    return IMAGE_EXTENSIONS.test(message?.fileUrl || message?.fileName || "");
  };

  const formatMessageTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderMessageStatus = (message, isMe) => {
    if (!isMe || activeChat?.type !== "direct") return null;

    if (message?.seenAt) {
      return <span className="font-black text-sky-500">✓✓</span>;
    }

    if (message?.deliveredAt) {
      return <span className="font-black text-slate-500">✓</span>;
    }

    return <span className="font-black text-slate-400">✓</span>;
  };

  const getDocumentBadge = (message) => {
    const ext = getFileExtension(message?.fileName || message?.fileUrl || "");
    return DOCUMENT_LABELS[ext] || (ext ? ext.toUpperCase() : "FILE");
  };

  const getChatKey = (type, id) => `${type}-${id}`;

  const buildChatItem = (item) => ({
    id: item._id || item.id,
    name: item.name || item.fullName,
    type: item.name ? "class" : "direct",
    raw: item,
  });

  const getMessagePreview = (message) => {
    if (!message) return "";
    if (message.text?.trim()) return message.text;
    if (message.fileType === "image") return "Photo";
    if (message.fileName) return message.fileName;
    if (message.fileUrl) return "Attachment";
    return "";
  };

  const openChat = (chat) => {
    const chatKey = getChatKey(chat.type, chat.id);
    openedChatsRef.current[chatKey] = new Date().toISOString();

    setActiveChat({
      id: chat.id,
      name: chat.name,
      type: chat.type,
    });
    setMobileChat(true);
    setChatMeta((prev) => ({
      ...prev,
      [chatKey]: {
        ...prev[chatKey],
        unreadCount: 0,
      },
    }));
  };

  const sortedChatItems = [...classes, ...users]
    .map(buildChatItem)
    .sort((a, b) => {
      const aMeta = chatMeta[getChatKey(a.type, a.id)];
      const bMeta = chatMeta[getChatKey(b.type, b.id)];
      const aTime = aMeta?.latestMessage?.createdAt ? new Date(aMeta.latestMessage.createdAt).getTime() : 0;
      const bTime = bMeta?.latestMessage?.createdAt ? new Date(bMeta.latestMessage.createdAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });

  const filteredChatItems = sortedChatItems.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const filteredClassChats = filteredChatItems.filter((chat) => chat.type === "class");
  const filteredDirectChats = filteredChatItems.filter((chat) => chat.type === "direct");

  const openPicker = (kind) => {
    setShowAttachMenu(false);
    if (kind === "image") imageRef.current?.click();
    if (kind === "camera") cameraRef.current?.click();
    if (kind === "document") documentRef.current?.click();
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    setComposerError("");
    setFile(selectedFile);
    setShowAttachMenu(false);
  };

  const removeSelectedFile = () => {
    setFile(null);
    setComposerError("");
    if (fileRef.current) fileRef.current.value = "";
    if (imageRef.current) imageRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
    if (documentRef.current) documentRef.current.value = "";
  };

  const clearComposer = () => {
    setText("");
    removeSelectedFile();
    setEditingId(null);
    setComposerError("");
  };

  const renderChatRow = (chat, compact = false) => {
    const meta = chatMeta[getChatKey(chat.type, chat.id)];

    return (
      <div
        key={getChatKey(chat.type, chat.id)}
        onClick={() => openChat(chat)}
        className={`flex items-center gap-4 border-b border-slate-100 bg-white p-4 transition-all ${
          activeChat?.id === chat.id && activeChat?.type === chat.type
            ? "border-l-4 border-l-indigo-600 shadow-sm"
            : "hover:bg-slate-50"
        } ${compact ? "active:bg-slate-50" : "cursor-pointer"}`}
      >
        <div className={`${compact ? "w-14 h-14 text-xl" : "w-12 h-12 text-lg"} flex shrink-0 items-center justify-center rounded-full bg-indigo-600 font-black text-white`}>
          {chat.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className={`${compact ? "text-base" : "text-sm"} truncate font-bold text-slate-800`}>{chat.name}</p>
            <div className="flex flex-col items-end gap-1">
              {meta?.latestMessage?.createdAt && (
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                  {formatMessageTime(meta.latestMessage.createdAt)}
                </span>
              )}
              {meta?.unreadCount > 0 && (
                <span className="flex min-w-5 items-center justify-center rounded-full bg-[#25d366] px-1.5 py-0.5 text-[10px] font-black text-white">
                  {meta.unreadCount}
                </span>
              )}
            </div>
          </div>
          <p className={`truncate ${compact ? "text-xs font-medium normal-case" : "text-[10px] font-black uppercase"} text-slate-400`}>
            {getMessagePreview(meta?.latestMessage) || (chat.type === "class" ? "Class Group" : "Personal Message")}
          </p>
        </div>
      </div>
    );
  };

  const renderAttachment = (message) => {
    if (!message?.fileUrl) return null;

    const fileHref = getAttachmentUrl(message.fileUrl);
    const fileName = message.fileName || "Attachment";

    if (isImageFile(message)) {
      return (
        <a href={fileHref} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-2xl">
          <img src={fileHref} alt={fileName} className="max-h-72 w-full rounded-2xl object-cover" />
        </a>
      );
    }

    return (
      <a
        href={fileHref}
        target="_blank"
        rel="noreferrer"
        className="mb-2 flex items-center gap-3 rounded-2xl bg-black/5 px-3 py-3 text-left no-underline"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 font-black text-white">
          {getDocumentBadge(message)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{fileName}</p>
          <p className="text-[11px] opacity-70">Tap to open</p>
        </div>
      </a>
    );
  };

  const renderSelectedAttachmentPreview = () => {
    if (!file) return null;

    if (file.type.startsWith("image/")) {
      return (
        <div className="mb-3 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <div className="relative">
            <img
              src={filePreviewUrl}
              alt={file.name}
              className="max-h-56 w-full object-cover"
            />
            <button
              type="button"
              onClick={removeSelectedFile}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white"
            >
              x
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
            <p className="text-xs text-slate-500">Photo ready to send</p>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 font-black text-white">
            {getDocumentBadge({ fileName: file.name })}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
            <p className="mt-1 text-xs text-slate-500">Document ready to send</p>
          </div>
          <button
            type="button"
            onClick={removeSelectedFile}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700"
          >
            x
          </button>
        </div>
      </div>
    );
  };

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
      openChat({
        id: location.state.contactId,
        name: location.state.contactName,
        type: "direct",
      });
    }
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;

    const fetchChatMeta = async () => {
      const chatItems = [...classes, ...users].map(buildChatItem);
      if (!chatItems.length) return;

      try {
        const results = await Promise.all(
          chatItems.map(async (chat) => {
            const url = chat.type === "class"
              ? `/messages/class/${chat.id}`
              : `/messages/direct/${chat.id}`;
            const { data } = await api.get(url);
            const items = data || [];
            const latestMessage = items[items.length - 1] || null;
            return { chat, latestMessage, items };
          })
        );

        if (cancelled) return;

        setChatMeta((prev) => {
          const next = { ...prev };

          results.forEach(({ chat, latestMessage, items }) => {
            const key = getChatKey(chat.type, chat.id);
            let unreadCount = 0;

            if (chat.type === "direct") {
              unreadCount = items.filter((message) => {
                const senderId = message.senderId?._id || message.senderId;
                return senderId !== user.id && !message.seenAt;
              }).length;
            } else {
              const lastOpenedAt = openedChatsRef.current[key];
              unreadCount = items.filter((message) => {
                const senderId = message.senderId?._id || message.senderId;
                if (senderId === user.id) return false;
                if (!lastOpenedAt) return true;
                return new Date(message.createdAt).getTime() > new Date(lastOpenedAt).getTime();
              }).length;
            }

            if (activeChat?.id === chat.id && activeChat?.type === chat.type) {
              unreadCount = 0;
            }

            next[key] = { latestMessage, unreadCount };

          });

          return next;
        });
      } catch (err) {
        console.error("Chat meta load failed", err);
      }
    };

    fetchChatMeta();
    const interval = setInterval(fetchChatMeta, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [classes, users, user.id, activeChat]);

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

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setFilePreviewUrl("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [file]);

  // ================= ACTIONS =================
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!activeChat) return;
    if (!text.trim() && !file) return;

    try {
      setComposerError("");

      if (editingId) {
        const { data } = await api.patch(`/messages/${editingId}`, { text: text.trim() });
        setMessages((prev) =>
          prev.map((message) =>
            message._id === editingId ? { ...message, ...data, text: data.text ?? text.trim() } : message
          )
        );
        clearComposer();
        return;
      }

      const form = new FormData();
      form.append("text", text.trim());
      if (file) form.append("file", file);
      if (activeChat.type === "class") form.append("classId", activeChat.id);
      else form.append("receiverId", activeChat.id);

      const { data } = await api.post("/messages", form, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setMessages((prev) => [...prev, data]);
      clearComposer();
    } catch (err) {
      setComposerError(err?.message || "Unable to send message");
    }
  };

  const deleteMsg = async (id) => {
    await api.delete(`/messages/${id}`);
    setMessages((prev) => prev.filter((m) => m._id !== id));
    setMenuId(null);
  };

  const editMsg = (m) => {
    setEditingId(m._id);
    setText(m.text);
    setFile(null);
    setComposerError("");
    setMenuId(null);
  };

  const cancelEdit = () => {
    clearComposer();
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
              <div className="sticky top-0 z-10 border-b bg-white p-4">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search classes or friends..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>

              <div className="px-4 py-3">
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Classes</p>
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
                  {filteredClassChats.length ? (
                    filteredClassChats.map((chat) => renderChatRow(chat, true))
                  ) : (
                    <div className="p-4 text-sm text-slate-400">No classes found.</div>
                  )}
                </div>
              </div>

              <div className="px-4 pb-4">
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Friends</p>
                <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
                  {filteredDirectChats.length ? (
                    filteredDirectChats.map((chat) => renderChatRow(chat, true))
                  ) : (
                    <div className="p-4 text-sm text-slate-400">No friends found.</div>
                  )}
                </div>
              </div>
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
            <div className="flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] p-4 space-y-3 pb-4">
              {messages.map((m) => {
                const isMe = (m.senderId?._id || m.senderId) === user.id;
                return (
                  <div key={m._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[85%] rounded-2xl px-3 py-2 shadow-sm text-sm ${
                      isMe ? "bg-[#d9fdd3] text-slate-800 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
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

                      {renderAttachment(m)}
                      {m.text && <p className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>}
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                        {m.isEdited && <span>edited</span>}
                        <span>{formatMessageTime(m.updatedAt || m.createdAt)}</span>
                        {renderMessageStatus(m, isMe)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* INPUT AREA (Fixed at bottom) */}
            <div className="p-3 bg-white border-t sticky bottom-0 z-30">
              {editingId && (
                <div className="mb-2 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                  <span className="font-semibold text-amber-800">Editing message</span>
                  <button type="button" onClick={cancelEdit} className="font-bold text-amber-700">
                    Cancel
                  </button>
                </div>
              )}

              {renderSelectedAttachmentPreview()}

              {composerError && (
                <p className="mb-2 text-xs font-semibold text-red-500">{composerError}</p>
              )}

              <form onSubmit={sendMessage} className="flex items-end gap-2">
                <div className="relative">
                  <button 
                    type="button" 
                    onClick={() => setShowAttachMenu((prev) => !prev)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 text-xl"
                  >+</button>

                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 flex w-44 flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
                      <button type="button" onClick={() => openPicker("image")} className="px-4 py-3 text-left text-sm hover:bg-slate-50">
                        Photo Library
                      </button>
                      <button type="button" onClick={() => openPicker("camera")} className="px-4 py-3 text-left text-sm hover:bg-slate-50">
                        Camera
                      </button>
                      <button type="button" onClick={() => openPicker("document")} className="px-4 py-3 text-left text-sm hover:bg-slate-50">
                        Document
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileRef}
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={imageRef}
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraRef}
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  ref={documentRef}
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />

                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="flex-1 bg-slate-100 border-none rounded-[24px] px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500"
                  placeholder={editingId ? "Edit your message..." : "Type a message..."}
                />
                
                <button className="w-10 h-10 flex items-center justify-center bg-[#25d366] text-white rounded-full shadow-lg">
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
          <div className="sticky top-0 z-10 border-b bg-slate-50 p-4">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search classes or friends..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          <div className="p-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Classes</p>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {filteredClassChats.length ? (
                filteredClassChats.map((chat) => renderChatRow(chat))
              ) : (
                <div className="p-4 text-sm text-slate-400">No classes found.</div>
              )}
            </div>
          </div>

          <div className="px-4 pb-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">Friends</p>
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              {filteredDirectChats.length ? (
                filteredDirectChats.map((chat) => renderChatRow(chat))
              ) : (
                <div className="p-4 text-sm text-slate-400">No friends found.</div>
              )}
            </div>
          </div>
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

            <div className="flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] p-6 space-y-4">
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
                        isMe ? "bg-[#d9fdd3] text-slate-800 rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none"
                      }`}>
                        {renderAttachment(m)}
                        {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                          {m.isEdited && <span>edited</span>}
                          <span>{formatMessageTime(m.updatedAt || m.createdAt)}</span>
                          {renderMessageStatus(m, isMe)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t">
              {renderSelectedAttachmentPreview()}

              <div className="flex gap-4 items-end">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu((prev) => !prev)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500"
                  >
                    +
                  </button>
                  {showAttachMenu && (
                    <div className="absolute bottom-14 left-0 flex w-44 flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
                      <button type="button" onClick={() => openPicker("image")} className="px-4 py-3 text-left text-sm hover:bg-slate-50">
                        Photo Library
                      </button>
                      <button type="button" onClick={() => openPicker("camera")} className="px-4 py-3 text-left text-sm hover:bg-slate-50">
                        Camera
                      </button>
                      <button type="button" onClick={() => openPicker("document")} className="px-4 py-3 text-left text-sm hover:bg-slate-50">
                        Document
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileRef}
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={imageRef}
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraRef}
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  ref={documentRef}
                  hidden
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <input 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  placeholder={editingId ? "Edit your message..." : "Write something..."} 
                  className="flex-1 bg-slate-50 border-none rounded-[24px] px-4 py-3 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
                <button className="bg-[#25d366] text-white px-8 py-3 rounded-xl font-bold">
                  {editingId ? "Save" : "Send"}
                </button>
              </div>
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