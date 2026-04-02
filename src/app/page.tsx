"use client";

import { useState, useEffect } from "react";
import { Play, Plus, Trash2, Share2, AlertCircle, ListVideo, ExternalLink } from "lucide-react";
import { extractYoutubeId } from "@/lib/utils";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";


interface VideoItem {
  id: string;
  url: string;
  videoId: string;
  title: string;
}

export default function Home() {
  const [urlInput, setUrlInput] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchMyPlaylists(currentUser.uid);
      } else {
        setMyPlaylists([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchMyPlaylists = async (uid: string) => {
    setIsLoadingPlaylists(true);
    try {
      const q = query(
        collection(db, "playlists"),
        where("creatorId", "==", uid)
      );
      const querySnapshot = await getDocs(q);
      const lists = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort descending safely without needing a composite index
      lists.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setMyPlaylists(lists);
    } catch (err) {
      console.error("Error fetching playlists:", err);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || "AIzaSyA8Z4EtQcrWlAV0KLKqinSng8ODafAF-aE";

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!urlInput.trim()) return;

    const videoId = extractYoutubeId(urlInput);
    
    if (!videoId) {
      setError("Invalid YouTube URL. Please paste a valid link.");
      return;
    }

    setIsAdding(true);
    
    try {
      let title = `YouTube Video (${videoId})`;
      // Fetch title from YouTube Data API v3
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`);
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          title = data.items[0].snippet.title;
        }
      }

      const newVideo: VideoItem = {
        id: crypto.randomUUID(),
        url: urlInput,
        videoId,
        title
      };

      setVideos((prev) => [...prev, newVideo]);
      setUrlInput("");
    } catch (err) {
      console.error("Failed to fetch YouTube title:", err);
      // Fallback if fetch fails
      const newVideo: VideoItem = {
        id: crypto.randomUUID(),
        url: urlInput,
        videoId,
        title: `YouTube Video (${videoId})`
      };
      setVideos((prev) => [...prev, newVideo]);
      setUrlInput("");
    } finally {
      setIsAdding(false);
    }
  };

  const removeVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSavePlaylist = async () => {
    if (videos.length === 0) {
      setError("Add some videos before saving!");
      return;
    }

    if (!auth.currentUser) {
      setError("Please sign in to save and share your playlist.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const docRef = await addDoc(collection(db, "playlists"), {
        creatorId: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || "Anonymous",
        videos: videos.map(({ url, videoId, title }) => ({ url, videoId, title })),
        createdAt: serverTimestamp(),
      });
      
      const link = `${window.location.origin}/playlist/${docRef.id}`;
      setShareLink(link);
      
      // Refresh the list seamlessly
      if (user) fetchMyPlaylists(user.uid);
    } catch (err: any) {
      console.error("Error saving playlist:", err);
      // Let's provide a helpful error if Firebase isn't set up yet
      if (err.message?.includes('API key')) {
        setError("Firebase API keys are not configured yet! Check your console.");
      } else {
        setError("Failed to save playlist. Are your database rules set up?");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 flex flex-col gap-12 pt-24 z-10">
      <div className="text-center space-y-4">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          Create FlowPlay
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            Share the Vibe.
          </span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
          Paste YouTube links, arrange your perfect sequence, and share with a single link. No registration required for viewers.
        </p>
      </div>

      <div className="glass rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10" />

        <form onSubmit={handleAddVideo} className="flex gap-4">
          <input
            type="text"
            placeholder="Paste YouTube music video URL here..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-6 py-4 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-white placeholder:text-white/30"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={isAdding}
            className="bg-white text-black px-8 py-4 rounded-xl font-bold hover:bg-emerald-50 hover:text-emerald-900 transition-all flex items-center gap-2 group shadow-emerald-500/20 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className={`w-5 h-5 ${isAdding ? "animate-spin" : "group-hover:rotate-90 transition-transform"}`} />
            <span className="hidden sm:inline">{isAdding ? "…" : "Add"}</span>
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-4 min-h-[200px]">
          {videos.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-2xl">
              <Play className="w-12 h-12 mb-4 opacity-50 absolute" />
              <p className="mt-16 font-medium">Your playlist is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {videos.map((video, idx) => (
                <div
                  key={video.id}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4 w-full">
                    <div className="text-white/40 font-mono text-sm w-6">
                      {idx + 1}.
                    </div>
                    {/* Thumbnail preview */}
                    <div className="relative w-24 h-16 bg-black rounded-md overflow-hidden shrink-0 hidden sm:block">
                      <img 
                        src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} 
                        alt="thumbnail" 
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>
                    <div className="truncate flex-1">
                      <p className="font-semibold truncate text-white/90">{video.title}</p>
                      <p className="text-xs text-white/40 truncate">{video.url}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeVideo(video.id)}
                    className="p-3 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {videos.length > 0 && !shareLink && (
          <div className="flex justify-end pt-6 border-t border-white/10">
            <button
              onClick={handleSavePlaylist}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Share2 className="w-5 h-5" />
              {isSaving ? "Creating..." : "Save & Share"}
            </button>
          </div>
        )}

        {shareLink && (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-4">
            <h3 className="text-emerald-400 font-bold flex items-center gap-2">
              <Share2 className="w-5 h-5" /> Playlist Ready!
            </h3>
            <p className="text-sm text-gray-300">Share this link with anyone. They don't need to log in to watch.</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 bg-black/50 border border-emerald-500/20 rounded-lg px-4 py-2 outline-none text-emerald-100 placeholder:text-white/30 truncate selection:bg-emerald-500/30"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  // simple toast logic could go here
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Copy
              </button>
              <a 
                href={shareLink} 
                className="group flex-1 max-w-[120px] shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
              >
                Open <Play className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* User Dashboard Section */}
      {user && (
        <div className="glass rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden mt-8">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <ListVideo className="text-emerald-400" /> Your Playlists
          </h2>

          {isLoadingPlaylists ? (
            <p className="text-gray-400 animate-pulse">Loading your playlists...</p>
          ) : myPlaylists.length === 0 ? (
            <p className="text-gray-400">You haven't saved any playlists yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myPlaylists.map((pl) => (
                <div key={pl.id} className="bg-black/30 border border-white/10 p-5 rounded-2xl hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg truncate">Playlist id: {pl.id.slice(0, 6)}...</h3>
                    <p className="text-sm text-emerald-400 font-medium mt-1">{pl.videos?.length || 0} Tracks</p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/playlist/${pl.id}`}
                      className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none text-gray-300"
                    />
                    <a 
                      href={`/playlist/${pl.id}`}
                      target="_blank"
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20"
                      title="Open Playlist"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
