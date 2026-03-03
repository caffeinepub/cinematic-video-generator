import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fal } from "@fal-ai/client";
import {
  AlertTriangle,
  ChevronRight,
  Clapperboard,
  Clock,
  Eye,
  Film,
  Key,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────── */
interface VideoHistoryItem {
  id: string;
  prompt: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  videoUrl: string;
  createdAt: string;
}

type AspectRatio = "16:9" | "9:16" | "1:1";
type GenerationState = "idle" | "generating" | "success" | "error";

const ASPECT_RATIO_OPTIONS: {
  value: AspectRatio;
  label: string;
  shortLabel: string;
  icon: string;
}[] = [
  { value: "16:9", label: "16:9 Landscape", shortLabel: "16:9", icon: "▬" },
  { value: "9:16", label: "9:16 Portrait", shortLabel: "9:16", icon: "▮" },
  { value: "1:1", label: "1:1 Square", shortLabel: "1:1", icon: "■" },
];

const UNSAFE_TERMS = ["violence", "nsfw", "political figure"];
const MAX_HISTORY = 20;
const LS_KEY_API = "fal_api_key";
const LS_KEY_HISTORY = "video_history";

function isSafe(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return !UNSAFE_TERMS.some((term) => lower.includes(term));
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getAspectClass(ratio: AspectRatio): string {
  if (ratio === "16:9") return "video-aspect-16-9";
  if (ratio === "9:16") return "video-aspect-9-16";
  return "video-aspect-1-1";
}

/* ─── API Key Setup Screen ───────────────────────────────────── */
function ApiKeySetup({ onSave }: { onSave: (key: string) => void }) {
  const [keyInput, setKeyInput] = useState("");

  const handleSave = () => {
    const trimmed = keyInput.trim();
    if (trimmed) onSave(trimmed);
  };

  return (
    <div className="min-h-screen bg-film-dark grain-overlay flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
            <Clapperboard className="w-5 h-5 text-[oklch(0.08_0.005_260)]" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            CineGen
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-foreground mb-2 leading-tight">
          Cinematic Video
          <br />
          <span className="text-gold">Generator</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Transform your imagination into cinematic sequences using AI-powered
          video synthesis.
        </p>

        <div className="bg-film-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-gold mb-1">
            <Key className="w-4 h-4" />
            <span className="text-sm font-medium">API Key Required</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Enter your{" "}
            <a
              href="https://fal.ai/dashboard/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:opacity-80 underline underline-offset-2 transition-opacity"
            >
              fal.ai API key
            </a>{" "}
            to begin generating. Your key is stored locally and never sent to
            our servers.
          </p>

          <Input
            data-ocid="app.api_key_input"
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="fal-key-xxxxxxxx-xxxx-xxxx-xxxx"
            className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 font-mono text-sm focus:border-gold focus:ring-gold/20"
          />

          <Button
            data-ocid="app.save_key_button"
            onClick={handleSave}
            disabled={!keyInput.trim()}
            className="w-full gradient-gold text-[oklch(0.08_0.005_260)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4 mr-1.5" />
            Start Generating
          </Button>
        </div>

        <p className="text-muted-foreground/60 text-xs mt-4 text-center">
          Your key is stored only in your browser's localStorage
        </p>
      </motion.div>
    </div>
  );
}

const FILMSTRIP_HOLES = [
  "h01",
  "h02",
  "h03",
  "h04",
  "h05",
  "h06",
  "h07",
  "h08",
  "h09",
  "h10",
  "h11",
  "h12",
  "h13",
  "h14",
  "h15",
  "h16",
  "h17",
  "h18",
  "h19",
  "h20",
  "h21",
  "h22",
  "h23",
  "h24",
  "h25",
  "h26",
  "h27",
  "h28",
  "h29",
  "h30",
  "h31",
  "h32",
  "h33",
  "h34",
  "h35",
  "h36",
  "h37",
  "h38",
  "h39",
  "h40",
];

/* ─── Filmstrip Decoration ───────────────────────────────────── */
function FilmstripEdge({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "hidden lg:flex fixed top-0 bottom-0 w-8 flex-col z-10 bg-[oklch(0.06_0.003_260)]",
        side === "left" ? "left-0" : "right-0",
      )}
    >
      {FILMSTRIP_HOLES.map((id) => (
        <div
          key={`${side}-${id}`}
          className="flex-shrink-0 mx-1 my-0.5 bg-background rounded-[2px]"
          style={{ height: "20px" }}
        />
      ))}
    </div>
  );
}

/* ─── History Card ───────────────────────────────────────────── */
function HistoryCard({
  item,
  index,
  onPlay,
  onDelete,
}: {
  item: VideoHistoryItem;
  index: number;
  onPlay: (item: VideoHistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else if (!hovered && videoRef.current) {
      videoRef.current.pause();
    }
  }, [hovered]);

  return (
    <motion.div
      data-ocid={`history.item.${index}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative bg-film-surface border border-border rounded-xl overflow-hidden hover:border-gold/40 transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onPlay(item)}
    >
      {/* Video preview */}
      <div
        className={cn(
          "relative overflow-hidden bg-film-dark",
          getAspectClass(item.aspectRatio),
          item.aspectRatio === "9:16" ? "max-h-48" : "",
        )}
      >
        <video
          ref={videoRef}
          src={item.videoUrl}
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
        {/* Play overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200",
            hovered ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="w-10 h-10 rounded-full bg-gold/90 flex items-center justify-center">
            <Eye className="w-4 h-4 text-[oklch(0.08_0.005_260)]" />
          </div>
        </div>
        {/* Aspect ratio badge */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="outline"
            className="text-[10px] border-gold/40 text-gold bg-film-dark/80 backdrop-blur-sm px-1.5 py-0.5"
          >
            {item.aspectRatio}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed mb-2">
          {item.prompt}
        </p>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(item.createdAt)}
          </span>
          <button
            type="button"
            data-ocid={`history.delete_button.${index}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive"
            aria-label="Delete video"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Generator ─────────────────────────────────────────── */
function VideoGenerator({
  apiKey,
  onClearKey,
}: {
  apiKey: string;
  onClearKey: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [genState, setGenState] = useState<GenerationState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<VideoHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY_HISTORY);
      return stored ? (JSON.parse(stored) as VideoHistoryItem[]) : [];
    } catch {
      return [];
    }
  });
  const [playingItem, setPlayingItem] = useState<VideoHistoryItem | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Configure fal client
  useEffect(() => {
    fal.config({ credentials: apiKey });
  }, [apiKey]);

  const saveHistory = useCallback((items: VideoHistoryItem[]) => {
    localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(items));
    setHistory(items);
  }, []);

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setErrorMsg("");
    setVideoUrl(null);
    setPlayingItem(null);

    // Safety check
    if (!isSafe(trimmedPrompt)) {
      setGenState("error");
      setErrorMsg(
        "Safety guardrail triggered. Your prompt contains restricted content. Please revise and try again.",
      );
      return;
    }

    setGenState("generating");

    try {
      const result = await fal.subscribe("fal-ai/ltx-video", {
        input: {
          prompt: trimmedPrompt,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          aspect_ratio: aspectRatio as any,
          duration: "10",
          resolution: "1080p",
        } as Parameters<typeof fal.subscribe>[1]["input"],
      });

      const data = result.data as {
        video: { url: string };
      };
      const url = data.video.url;
      setVideoUrl(url);
      setGenState("success");

      // Add to history
      const newItem: VideoHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: trimmedPrompt,
        aspectRatio,
        videoUrl: url,
        createdAt: new Date().toISOString(),
      };
      saveHistory([newItem, ...history].slice(0, MAX_HISTORY));
    } catch (err: unknown) {
      setGenState("error");
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(`Generation failed: ${message}`);
    }
  };

  const handleDeleteHistory = (id: string) => {
    saveHistory(history.filter((item) => item.id !== id));
  };

  const handlePlayFromHistory = (item: VideoHistoryItem) => {
    setPlayingItem(item);
    setVideoUrl(null);
    setGenState("idle");
  };

  const handleClearKey = () => {
    localStorage.removeItem(LS_KEY_API);
    onClearKey();
  };

  const isGenerating = genState === "generating";
  const currentVideoUrl = videoUrl || playingItem?.videoUrl || null;
  const currentAspect = playingItem?.aspectRatio || aspectRatio;

  return (
    <div className="min-h-screen bg-film-dark grain-overlay">
      <FilmstripEdge side="left" />
      <FilmstripEdge side="right" />

      <div className="lg:px-12 px-4 max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between py-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center flex-shrink-0">
              <Clapperboard className="w-4 h-4 text-[oklch(0.08_0.005_260)]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight leading-none">
                Cinematic Video Generator
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Powered by fal.ai LTX Video
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-ocid="app.settings_button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-film-elevated transition-all"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Settings dropdown */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="py-3 px-4 bg-film-surface border border-border rounded-xl mt-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">API Key</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clear your stored fal.ai API key
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearKey}
                  className="flex-shrink-0"
                >
                  <X className="w-3 h-3 mr-1.5" />
                  Clear Key
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Generator Panel */}
        <main className="py-8 space-y-6">
          <div className="bg-film-surface border border-border rounded-2xl p-6 space-y-5">
            {/* Prompt */}
            <div className="space-y-2">
              <label
                htmlFor="prompt"
                className="flex items-center gap-2 text-sm font-medium text-foreground/90"
              >
                <Film className="w-4 h-4 text-gold" />
                Scene Description
              </label>
              <Textarea
                id="prompt"
                data-ocid="app.prompt_textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A cinematic shot of a lighthouse during a storm, waves crashing against the rocks, dramatic low-angle perspective, golden hour light breaking through storm clouds..."
                rows={4}
                className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground/40 text-sm leading-relaxed focus:border-gold/60 focus:ring-gold/10 transition-colors"
                disabled={isGenerating}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Describe your cinematic vision</span>
                <span className={prompt.length > 450 ? "text-destructive" : ""}>
                  {prompt.length}/500
                </span>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground/90 block">
                Aspect Ratio
              </span>
              <fieldset
                className="flex gap-2 border-0 p-0 m-0"
                aria-label="Aspect ratio selection"
              >
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    data-ocid={`app.aspect_ratio_${opt.value.replace(":", "_")}_button`}
                    onClick={() => setAspectRatio(opt.value)}
                    disabled={isGenerating}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-all duration-200",
                      aspectRatio === opt.value
                        ? "border-gold/60 bg-gold/10 text-gold glow-gold-sm"
                        : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground",
                      isGenerating && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    <span className="text-base leading-none">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </fieldset>
            </div>

            {/* Generate Button */}
            <Button
              data-ocid="app.generate_button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full h-12 gradient-gold text-[oklch(0.08_0.005_260)] font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-40 glow-gold"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    role="img"
                    aria-label="Loading spinner"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Video
                </span>
              )}
            </Button>
          </div>

          {/* Loading State */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                data-ocid="app.loading_state"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-film-surface border border-gold/20 rounded-2xl p-8 text-center space-y-4"
              >
                <div className="relative mx-auto w-16 h-16">
                  {/* Outer orbit */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-gold/20"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold" />
                  </motion.div>
                  {/* Inner pulse */}
                  <motion.div
                    className="absolute inset-4 rounded-full bg-gold/20"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-5 h-5 text-gold" />
                  </div>
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">
                    Generating your cinematic video...
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    This typically takes 60–120 seconds
                  </p>
                </div>
                <div className="flex justify-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-gold/50"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          <AnimatePresence>
            {genState === "error" && errorMsg && (
              <motion.div
                data-ocid="app.error_state"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-destructive/10 border border-destructive/40 rounded-2xl p-5 flex gap-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive-foreground">
                    Generation Error
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {errorMsg}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGenState("idle")}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video Result */}
          <AnimatePresence>
            {currentVideoUrl && (
              <motion.div
                data-ocid="app.result_panel"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bg-film-surface border border-gold/30 rounded-2xl overflow-hidden glow-gold"
              >
                {/* Result header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                    <span className="text-sm font-medium text-foreground">
                      {playingItem ? "History Playback" : "Generated Video"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-gold/40 text-gold"
                    >
                      {currentAspect}
                    </Badge>
                    <a
                      href={currentVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-gold transition-colors underline underline-offset-2"
                    >
                      Open original
                    </a>
                  </div>
                </div>

                {/* Video player */}
                <div className="bg-black flex items-center justify-center p-0">
                  <div
                    className={cn(
                      "w-full",
                      getAspectClass(currentAspect),
                      currentAspect === "9:16"
                        ? "max-w-sm mx-auto"
                        : "max-w-full",
                    )}
                  >
                    <video
                      ref={videoRef}
                      key={currentVideoUrl}
                      src={currentVideoUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Prompt displayed */}
                {(playingItem || prompt) && (
                  <div className="px-5 py-3 border-t border-border/60">
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">
                      "{playingItem ? playingItem.prompt : prompt}"
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* History Section */}
        <section className="pb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-border" />
            <h2 className="font-display font-semibold text-sm text-muted-foreground tracking-widest uppercase">
              Generation History
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          {history.length === 0 ? (
            <motion.div
              data-ocid="history.empty_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 border border-dashed border-border rounded-2xl"
            >
              <div className="w-14 h-14 rounded-2xl border border-border bg-film-surface flex items-center justify-center mx-auto mb-4">
                <Clapperboard className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium text-sm">
                No videos generated yet
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1.5 max-w-48 mx-auto">
                Your generated videos will appear here
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {history.map((item, index) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  index={index + 1}
                  onPlay={handlePlayFromHistory}
                  onDelete={handleDeleteHistory}
                />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground/60">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}

/* ─── Root App ───────────────────────────────────────────────── */
export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return localStorage.getItem(LS_KEY_API);
  });

  const handleSaveKey = (key: string) => {
    localStorage.setItem(LS_KEY_API, key);
    setApiKey(key);
  };

  const handleClearKey = () => {
    setApiKey(null);
  };

  return (
    <AnimatePresence mode="wait">
      {!apiKey ? (
        <motion.div
          key="setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ApiKeySetup onSave={handleSaveKey} />
        </motion.div>
      ) : (
        <motion.div
          key="generator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <VideoGenerator apiKey={apiKey} onClearKey={handleClearKey} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
