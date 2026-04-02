"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });
import { PlayCircle, SkipForward, Loader2, AlertCircle } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VideoItem {
  id?: string;
  url: string;
  videoId: string;
  title: string;
}

interface Playlist {
  id: string;
  creatorId: string;
  creatorName: string;
  videos: VideoItem[];
}

const Player = ReactPlayer as any;

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    async function fetchPlaylist() {
      try {
        const docRef = doc(db, "playlists", unwrappedParams.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPlaylist({ id: docSnap.id, ...docSnap.data() } as Playlist);
        } else {
          setError("Playlist not found. It might have been deleted or the link is incorrect.");
        }
      } catch (err: any) {
        console.error("Error fetching playlist:", err);
        if (err.message?.includes('API key')) {
          // Mock data fallback if firebase hasn't been configured yet
          setPlaylist({
            id: unwrappedParams.id,
            creatorId: "mock",
            creatorName: "Demo User",
            videos: [
              { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoId: "dQw4w9WgXcQ", title: "Never Gonna Give You Up" },
              { url: "https://www.youtube.com/watch?v=L_jWHffIx5E", videoId: "L_jWHffIx5E", title: "Smash Mouth - All Star" }
            ]
          });
          setError("Showing Demo Data (Firebase API Key Not Configured).");
        } else {
          setError("Failed to load playlist. Make sure database rules allow public reads.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, [unwrappedParams.id]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-white/50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <p className="font-medium animate-pulse">Loading experience...</p>
      </div>
    );
  }

  if (error && !playlist) {
    return (
      <div className="flex-1 max-w-2xl mx-auto w-full p-8 mt-24 text-center">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-3xl flex flex-col items-center gap-4">
          <AlertCircle className="w-16 h-16 text-red-400 opacity-50" />
          <h2 className="text-2xl font-bold">Oops!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const currentVideo = playlist?.videos[currentIndex];
  const hasNext = playlist && currentIndex < playlist.videos.length - 1;

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col lg:flex-row gap-8 z-10">
      {/* Player Section */}
      <div className="flex-1 space-y-4">
        <div className="flex justify-between items-center bg-black/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/5 shadow-2xl">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-300">
              {playlist?.creatorName}&apos;s Playlist
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Playing {currentIndex + 1} of {playlist?.videos.length}
            </p>
          </div>
          
          {error && (
            <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-semibold">
              Demo Mode Active
            </div>
          )}
        </div>

        <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-emerald-500/20 relative group">
          {currentVideo ? (
            <Player
              url={`https://www.youtube.com/watch?v=${currentVideo.videoId}`}
              width="100%"
              height="100%"
              playing={hasStarted}
              controls={true}
              onPlay={() => setHasStarted(true)}
              onEnded={handleNext}
              className="absolute top-0 left-0"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-white/40">
              <PlayCircle className="w-16 h-16 mb-4 opacity-50" />
              <p>End of playlist</p>
            </div>
          )}
        </div>

        {currentVideo && (
          <div className="p-6 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl flex justify-between items-center mt-6">
            <div className="truncate pr-4">
              <h2 className="text-xl font-bold text-white/90 truncate">{currentVideo.title}</h2>
              <p className="text-sm text-emerald-400 font-mono mt-1">Now Playing automatically</p>
            </div>
            
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="shrink-0 bg-white/10 hover:bg-emerald-500 hover:text-black disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              Skip <SkipForward className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Queue Section */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4">
        <div className="glass rounded-2xl p-6 h-full flex flex-col shadow-2xl max-h-[80vh] overflow-hidden">
          <h3 className="font-bold text-lg mb-6 flex items-center justify-between border-b border-white/10 pb-4 text-emerald-400">
            Up Next
            <span className="text-sm font-normal text-white/40 bg-black/40 px-3 py-1 rounded-full">
              {playlist?.videos.length} tracks
            </span>
          </h3>
          
          <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar flex-1 pb-4">
            {playlist?.videos.map((vid, idx) => {
              const isActive = idx === currentIndex;
              const isPast = idx < currentIndex;
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setHasStarted(true);
                  }}
                  className={`w-full text-left group flex items-center gap-4 p-3 rounded-xl transition-all border ${
                    isActive 
                      ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "bg-black/30 border-transparent hover:bg-white/5"
                  } ${isPast ? "opacity-40 hover:opacity-100" : ""}`}
                >
                  <div className={`relative w-20 h-12 bg-black rounded shrink-0 overflow-hidden border ${isActive ? 'border-emerald-500/50' : 'border-white/10'}`}>
                    <img 
                      src={`https://img.youtube.com/vi/${vid.videoId}/mqdefault.jpg`} 
                      alt="thumbnail" 
                      className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'}`}
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <PlayCircle className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="truncate flex-1">
                    <p className={`font-semibold text-sm truncate ${isActive ? "text-emerald-400" : "text-white/80"}`}>
                      {vid.title}
                    </p>
                    {isActive && <p className="text-xs text-emerald-500/70 mt-0.5">Playing</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
